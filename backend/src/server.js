const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { auditMiddleware } = require('./middleware/auditMiddleware');
const { errorHandler } = require('./middleware/errorHandler');
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
app.use(auditMiddleware);

// Health check
app.get('/health', async (req, res) => {
  const cacheHealth = await cacheService.health();
  res.json({
    status: 'ok',
    service: 'countypay-backend',
    cache: cacheHealth ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
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
app.use('/api/blockchain', require('./routes/blockchain'));
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

