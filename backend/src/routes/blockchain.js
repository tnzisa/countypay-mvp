const express = require('express');
const { verifyOnBlockchain, getExplorerUrl } = require('../services/blockchain');
const { authMiddleware } = require('../middleware/auth');
const { prisma } = require('../lib/prisma');

const router = express.Router();

/**
 * Verify a transaction on the blockchain
 * GET /api/blockchain/verify/:txId
 */
router.get('/verify/:txId', authMiddleware, async (req, res) => {
  try {
    const { txId } = req.params;
    
    if (!txId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    
    // Verify on blockchain
    const result = await verifyOnBlockchain(txId);
    
    // Add explorer URL
    if (result.verified) {
      result.explorerUrl = getExplorerUrl(txId);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Blockchain verification error:', error);
    res.status(500).json({ 
      error: 'Failed to verify transaction', 
      details: error.message 
    });
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
      error: 'Failed to generate explorer URL', 
      details: error.message 
    });
  }
});

module.exports = router;

// Made with Bob
