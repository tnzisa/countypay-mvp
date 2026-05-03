/**
 * Analytics Routes - Admin endpoints for real-time dashboards
 * All endpoints require admin role
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');
const analyticsService = require('../services/analyticsService');

const router = express.Router();

// Apply tenant middleware to all routes
router.use(authMiddleware, tenantMiddleware(authMiddleware));

/**
 * Middleware to verify admin role
 */
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'county_admin') {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Admin access required'
    });
  }
  next();
}

/**
 * Get dashboard summary
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', adminOnly, async (req, res, next) => {
  try {
    const { days = 30, county = null } = req.query;
    const organizationId = req.organizationId;
    
    const summary = await analyticsService.getDashboardSummary(organizationId, {
      days: parseInt(days),
      county
    });
    
    res.json({
      section: 'dashboard',
      summary
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get county performance breakdown
 * GET /api/analytics/counties
 */
router.get('/counties', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { days = 30, limit = 20 } = req.query;
    
    const performance = await analyticsService.getCountyPerformance({
      days: parseInt(days),
      limit: parseInt(limit)
    });
    
    res.json({
      section: 'county_performance',
      data: performance
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get fee performance breakdown
 * GET /api/analytics/fees
 */
router.get('/fees', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { days = 30, county = null, limit = 20 } = req.query;
    
    const performance = await analyticsService.getFeePerformance({
      days: parseInt(days),
      county,
      limit: parseInt(limit)
    });
    
    res.json({
      section: 'fee_performance',
      data: performance
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get payment method breakdown
 * GET /api/analytics/payment-methods
 */
router.get('/payment-methods', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    
    const breakdown = await analyticsService.getPaymentMethodBreakdown({
      days: parseInt(days)
    });
    
    res.json({
      section: 'payment_method_breakdown',
      data: breakdown
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get time series data
 * GET /api/analytics/timeseries
 */
router.get('/timeseries', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { granularity = 'daily', days = 30 } = req.query;
    
    const timeSeries = await analyticsService.getTimeSeries({
      granularity,
      days: parseInt(days)
    });
    
    res.json({
      section: 'time_series',
      granularity,
      data: timeSeries
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Detect anomalies
 * GET /api/analytics/anomalies
 */
router.get('/anomalies', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { days = 30, threshold = 2 } = req.query;
    
    const anomalies = await analyticsService.detectAnomalies({
      days: parseInt(days),
      threshold: parseFloat(threshold)
    });
    
    res.json({
      section: 'anomalies',
      data: anomalies
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get failure analysis
 * GET /api/analytics/failures
 */
router.get('/failures', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { days = 30, limit = 10 } = req.query;
    
    const analysis = await analyticsService.getFailureAnalysis({
      days: parseInt(days),
      limit: parseInt(limit)
    });
    
    res.json({
      section: 'failure_analysis',
      data: analysis
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get cash flow forecast
 * GET /api/analytics/forecast
 */
router.get('/forecast', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { days = 30, forecastDays = 7 } = req.query;
    
    const forecast = await analyticsService.getCashFlowForecast({
      days: parseInt(days),
      forecastDays: parseInt(forecastDays)
    });
    
    res.json({
      section: 'cash_flow_forecast',
      data: forecast
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
