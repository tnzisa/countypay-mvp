const express = require('express');
const { getAllPayments, getPaymentsToday } = require('../services/paymentService');
const { runAllRules } = require('../services/anomalyDetector');

const router = express.Router();

/**
 * GET /reconciliation/summary
 * Returns comprehensive payment summary with anomaly detection
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('AI AGENT: Summary endpoint called');
    
    // Fetch all payments from backend
    const allPayments = await getAllPayments();
    
    if (allPayments.length === 0) {
      return res.json({
        totalCollectedToday: 0,
        totalTransactions: 0,
        completedTransactions: 0,
        pendingTransactions: 0,
        byFeeType: {},
        byCounty: {},
        anomalies: [],
        anomalyCount: 0,
        lastUpdated: new Date().toISOString()
      });
    }

    // Filter payments created today
    const todayPayments = getPaymentsToday(allPayments);
    
    // Calculate total collected today (completed payments only)
    const totalCollectedToday = todayPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate transaction counts
    const totalTransactions = allPayments.length;
    const completedTransactions = allPayments.filter(p => p.status === 'completed').length;
    const pendingTransactions = allPayments.filter(p => p.status === 'pending').length;

    // Calculate breakdown by fee type
    const byFeeType = {};
    allPayments.forEach(payment => {
      const feeType = payment.fee?.name || 'Unknown';
      if (!byFeeType[feeType]) {
        byFeeType[feeType] = { count: 0, amount: 0 };
      }
      byFeeType[feeType].count++;
      if (payment.status === 'completed') {
        byFeeType[feeType].amount += payment.amount;
      }
    });

    // Calculate breakdown by county
    const byCounty = {};
    allPayments.forEach(payment => {
      const countyCode = payment.fee?.county?.code || 'Unknown';
      if (!byCounty[countyCode]) {
        byCounty[countyCode] = { count: 0, amount: 0 };
      }
      byCounty[countyCode].count++;
      if (payment.status === 'completed') {
        byCounty[countyCode].amount += payment.amount;
      }
    });

    // Run anomaly detection
    const anomalies = runAllRules(allPayments);

    // Build response
    const summary = {
      totalCollectedToday,
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      byFeeType,
      byCounty,
      anomalies,
      anomalyCount: anomalies.length,
      lastUpdated: new Date().toISOString()
    };

    console.log(`AI AGENT: Summary generated - ${totalTransactions} transactions, ${anomalies.length} anomalies`);
    
    res.json(summary);
  } catch (error) {
    console.error('AI AGENT: Summary endpoint error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message 
    });
  }
});

/**
 * GET /reconciliation/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-agent-reconciliation',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

// Made with Bob
