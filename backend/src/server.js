const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { auditMiddleware } = require('./middleware/auditMiddleware');
const { errorHandler } = require('./middleware/errorHandler');
const metricsMiddleware = require('./middleware/metricsMiddleware');
const { register: metricsRegister } = require('./lib/metrics');
const cacheService = require('./services/cacheService');
const {
  apiLimiter,
  loginLimiter,
  paymentLimiter,
  exportLimiter
} = require('./middleware/rateLimiter');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);
app.use(auditMiddleware);

// Liveness probe (is service running)
app.get('/health/live', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    service: 'countypay-backend',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe (is service ready to accept traffic)
app.get('/health/ready', async (req, res) => {
  try {
    const cacheHealth = await cacheService.health();
    
    if (!cacheHealth) {
      return res.status(503).json({
        status: 'not_ready',
        service: 'countypay-backend',
        reason: 'cache_unavailable',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'ready',
      service: 'countypay-backend',
      cache: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      service: 'countypay-backend',
      reason: 'health_check_failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check (backwards compatibility)
app.get('/health', async (req, res) => {
  const cacheHealth = await cacheService.health();
  res.json({
    status: 'ok',
    service: 'countypay-backend',
    cache: cacheHealth ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

// Apply rate limiters to API routes
app.use('/api/', apiLimiter);

// Routes
// Organization management (multi-tenancy)
app.use('/api/organizations', require('./routes/organizations'));

// Core payment and audit routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payments', paymentLimiter, require('./routes/payments'));
app.use('/api/counties', require('./routes/counties'));
app.use('/api/audit/export', exportLimiter);
app.use('/api/audit', require('./routes/audit'));
app.use('/api/analytics', require('./routes/analytics'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler (MUST be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Graceful shutdown
const server = app.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);

  // Initialize cache service
  try {
    await cacheService.init();
    console.log('Cache service initialized');
  } catch (error) {
    console.error('Failed to initialize cache:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await cacheService.disconnect();
    console.log('Server closed');
    process.exit(0);
  });
});

