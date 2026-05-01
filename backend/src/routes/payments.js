const express = require('express');
const { prisma } = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const { recordOnBlockchain } = require('../services/blockchain');

const router = express.Router();

/**
 * Create a new payment transaction
 * POST /api/payments
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { feeId, phoneNumber, paymentMethod } = req.body;
    const userId = req.user.userId;
    
    // Validate input
    if (!feeId || !phoneNumber || !paymentMethod) {
      return res.status(400).json({ 
        error: 'Fee ID, phone number, and payment method are required' 
      });
    }
    
    // Get fee details
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { county: true }
    });
    
    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }
    
    // Generate unique transaction reference
    const transactionRef = `CP${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        amount: fee.amount,
        status: 'pending',
        paymentMethod,
        phoneNumber,
        transactionRef,
        userId,
        feeId
      },
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
    
    // Simulate payment processing (in production, integrate with M-Pesa/payment gateway)
    // For MVP, auto-complete after 2 seconds
    setTimeout(async () => {
      await processPayment(transaction.id);
    }, 2000);
    
    res.status(201).json({ 
      transaction,
      message: 'Payment initiated successfully. Processing...'
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment', details: error.message });
  }
});

/**
 * Process payment and record on blockchain (internal function)
 */
async function processPayment(transactionId) {
  try {
    console.log(`Processing payment for transaction: ${transactionId}`);
    
    // Record on blockchain
    const blockchainResult = await recordOnBlockchain(transactionId);
    
    // Update transaction status
    const updateData = {
      status: blockchainResult.success ? 'completed' : 'completed', // Complete even if blockchain fails
      updatedAt: new Date()
    };
    
    if (blockchainResult.success) {
      updateData.blockchainTxId = blockchainResult.txId;
      updateData.blockchainHash = blockchainResult.hash;
    }
    
    await prisma.transaction.update({
      where: { id: transactionId },
      data: updateData
    });
    
    console.log(`Payment processed successfully: ${transactionId}`);
  } catch (error) {
    console.error('Payment processing failed:', error);
    
    // Mark transaction as failed
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { 
        status: 'failed',
        updatedAt: new Date()
      }
    });
  }
}

/**
 * Get all transactions for the authenticated user
 * GET /api/payments/my-transactions
 */
router.get('/my-transactions', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    const where = { userId: req.user.userId };
    if (status) {
      where.status = status;
    }
    
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        fee: { include: { county: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });
    
    res.json({ 
      transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
  }
});

/**
 * Get a specific transaction by ID
 * GET /api/payments/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
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
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Ensure user can only view their own transactions (unless admin)
    if (transaction.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction', details: error.message });
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
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Ensure user can only view their own transactions (unless admin)
    if (transaction.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction by ref error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction', details: error.message });
  }
});

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
