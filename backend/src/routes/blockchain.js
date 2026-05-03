const express = require('express');
const { verifyOnBlockchain, getExplorerUrl } = require('../services/blockchain');
const { authMiddleware } = require('../middleware/auth');
const { prisma } = require('../lib/prisma');
const fabricService = require('../services/fabric');

const router = express.Router();

/**
 * Verify a transaction on the blockchain with cryptographic verification
 * GET /api/blockchain/verify/:txId
 */
router.get('/verify/:txId', authMiddleware, async (req, res, next) => {
  try {
    const { txId } = req.params;
    
    if (!txId) {
      return res.status(400).json({ 
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Transaction ID is required' 
      });
    }
    
    // Query payment from Fabric ledger with verification
    try {
      const payment = await fabricService.queryPayment(txId);
      
      res.json({
        verified: true,
        payment,
        verificationStatus: payment.verificationStatus,
        ledger: 'Hyperledger Fabric',
        network: 'countypay-channel',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.json({
        verified: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Get blockchain details for a payment transaction
 * GET /api/blockchain/transaction/:transactionId
 */
router.get('/transaction/:transactionId', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Get transaction from database
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
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
    
    // Check if transaction has blockchain record
    if (!transaction.blockchainTxId) {
      return res.json({
        transaction,
        blockchain: {
          recorded: false,
          message: 'Transaction not yet recorded on blockchain'
        }
      });
    }
    
    // Verify on blockchain
    const verification = await verifyOnBlockchain(transaction.blockchainTxId);
    
    res.json({
      transaction,
      blockchain: {
        recorded: true,
        txId: transaction.blockchainTxId,
        hash: transaction.blockchainHash,
        verification,
        explorerUrl: getExplorerUrl(transaction.blockchainTxId)
      }
    });
  } catch (error) {
    console.error('Get blockchain transaction error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch blockchain details', 
      details: error.message 
    });
  }
});

/**
 * Verify batch of transactions using Merkle tree
 * POST /api/blockchain/verify-batch
 */
router.post('/verify-batch', authMiddleware, async (req, res, next) => {
  try {
    const { paymentIds } = req.body;
    
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'paymentIds must be a non-empty array'
      });
    }
    
    const batchVerification = await fabricService.verifyPaymentBatch(paymentIds);
    
    res.json({
      batchVerification,
      ledger: 'Hyperledger Fabric',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get payment history with chain verification
 * GET /api/blockchain/history/:paymentId
 */
router.get('/history/:paymentId', authMiddleware, async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    
    const history = await fabricService.getPaymentHistory(paymentId);
    
    if (history.length === 0) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'No history found for this payment'
      });
    }
    
    res.json({
      paymentId,
      history,
      chainVerified: history.every(h => h.verified),
      ledger: 'Hyperledger Fabric'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get ledger statistics
 * GET /api/blockchain/stats
 */
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Admin access required'
      });
    }
    
    const stats = await fabricService.getLedgerStats();
    
    res.json({
      ledgerStats: stats,
      ledger: 'Hyperledger Fabric'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get blockchain explorer URL for a transaction
 * GET /api/blockchain/explorer/:txId
 */
router.get('/explorer/:txId', (req, res) => {
  try {
    const { txId } = req.params;
    const explorerUrl = getExplorerUrl(txId);
    
    res.json({ 
      txId,
      explorerUrl,
      network: 'testnet'
    });
  } catch (error) {
    console.error('Get explorer URL error:', error);
    res.status(500).json({ 
      code: 'EXPLORER_ERROR',
      message: 'Failed to generate explorer URL', 
      error: error.message 
    });
  }
});

module.exports = router;
