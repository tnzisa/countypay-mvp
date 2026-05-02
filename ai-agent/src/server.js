const express = require('express');
const cors = require('cors');
require('dotenv').config();

const reconciliationRouter = require('./routes/reconciliation');
const { getAllPayments } = require('./services/paymentService');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors()); // Enable CORS for frontend access
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`AI AGENT: ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/reconciliation', reconciliationRouter);

// Root health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'countypay-ai-agent',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('AI AGENT: Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, async () => {
  console.log('='.repeat(60));
  console.log('AI AGENT: Service started on port', PORT);
  console.log('AI AGENT: Backend URL:', process.env.BACKEND_URL);
  console.log('='.repeat(60));
  
  // Verify backend connectivity on startup
  try {
    console.log('AI AGENT: Verifying backend connectivity...');
    const payments = await getAllPayments();
    console.log(`AI AGENT: ✓ Successfully connected to backend`);
    console.log(`AI AGENT: ✓ Fetched ${payments.length} payments`);
    console.log('='.repeat(60));
    console.log('AI AGENT: Ready to serve requests');
    console.log('AI AGENT: Summary endpoint: http://localhost:' + PORT + '/reconciliation/summary');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('AI AGENT: ✗ Failed to connect to backend');
    console.error('AI AGENT: Error:', error.message);
    console.error('AI AGENT: Make sure backend is running on', process.env.BACKEND_URL);
    console.log('='.repeat(60));
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nAI AGENT: Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nAI AGENT: Shutting down gracefully...');
  process.exit(0);
});

// Made with Bob
