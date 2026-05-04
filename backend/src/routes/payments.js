const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');
const paymentService = require('../services/paymentService');
const { prisma } = require('../lib/prisma');

const router = express.Router();

// Apply tenant middleware to all routes
router.use(authMiddleware, tenantMiddleware(authMiddleware));

/**
 * Create a new payment transaction with idempotency support
 * POST /api/payments
 * 
 * Body: {
 *   feeId: string,
 *   phoneNumber: string,
 *   paymentMethod: 'stripe' | 'bank_transfer',
 *   idempotencyKey?: string
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { feeId, phoneNumber, paymentMethod, idempotencyKey } = req.body;
    const userId = req.user.userId;
    const organizationId = req.organizationId;
    
    // Validate input
    if (!feeId || !phoneNumber || !paymentMethod) {
      return res.status(400).json({ 
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Fee ID, phone number, and payment method are required',
        fields: ['feeId', 'phoneNumber', 'paymentMethod']
      });
    }
    
    // Validate payment method
    const validMethods = ['stripe', 'bank_transfer'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        code: 'INVALID_PAYMENT_METHOD',
        message: `Invalid payment method. Valid options: ${validMethods.join(', ')}`
      });
    }
    
    // Create payment with idempotency support and fraud detection
    const transaction = await paymentService.createPayment({
      feeId,
      phoneNumber,
      paymentMethod,
      idempotencyKey,
      userId,
      organizationId,
      requestContext: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });
    
    // Start async payment processing (don't wait for completion)
    setImmediate(() => {
      paymentService.processPayment(transaction.id)
        .catch(error => console.error('Async payment processing failed:', error));
    });
    
    res.status(201).json({ 
      transaction,
      message: 'Payment initiated successfully. Processing...'
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ 
      code: 'PAYMENT_CREATION_FAILED',
      message: 'Failed to create payment',
      error: error.message 
    });
  }
});

/**
 * Retry a failed payment with exponential backoff
 * POST /api/payments/:id/retry
 */
router.post('/:id/retry', authMiddleware, async (req, res) => {
  try {
    const transactionId = req.params.id;
    
    // Verify user owns this transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!transaction) {
      return res.status(404).json({
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found'
      });
    }
    
    if (transaction.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied'
      });
    }
    
    // Retry the payment
    const result = await paymentService.retryPayment(transactionId);
    
    res.json({
      message: 'Payment retry initiated',
      result
    });
  } catch (error) {
    console.error('Payment retry error:', error);
    res.status(400).json({
      code: 'RETRY_FAILED',
      message: error.message
    });
  }
});

/**
 * Get all transactions for the authenticated user
 * GET /api/payments/my-transactions
 */
router.get('/my-transactions', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    const transactions = await paymentService.getUserTransactions(req.user.userId, {
      limit: parseInt(limit),
      status
    });
    
    res.json({ 
      transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ 
      code: 'FETCH_FAILED',
      message: 'Failed to fetch transactions',
      error: error.message 
    });
  }
});

/**
 * Get a specific transaction by ID
 * GET /api/payments/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await paymentService.getPaymentStatus(req.params.id);
    
    // Ensure user can only view their own transactions (unless admin)
    if (transaction.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied'
      });
    }
    
    res.json({ transaction });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found'
      });
    }
    
    console.error('Get transaction error:', error);
    res.status(500).json({ 
      code: 'FETCH_FAILED',
      message: 'Failed to fetch transaction',
      error: error.message 
    });
  }
});

/**
 * Get transaction by reference number
 * GET /api/payments/ref/:ref
 */
router.get('/ref/:ref', authMiddleware, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionRef: req.params.ref },
      include: {
        fee: { include: { county: true } },
        user: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });
    
    if (!transaction) {
      return res.status(404).json({
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found'
      });
    }
    
    // Ensure user can only view their own transactions (unless admin)
    if (transaction.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied'
      });
    }
    
    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction by ref error:', error);
    res.status(500).json({ 
      code: 'FETCH_FAILED',
      message: 'Failed to fetch transaction',
      error: error.message 
    });
  }
});

module.exports = router;

/**
 * Get all transactions (Admin only)
 * GET /api/payments/admin/all
 */
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status, limit = 100, offset = 0 } = req.query;
    
    const where = {};
    if (status) {
      where.status = status;
    }
    
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          fee: { include: { county: true } },
          user: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.transaction.count({ where })
    ]);
    
    res.json({ 
      transactions,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
  }
});

module.exports = router;

// Made with Bob
