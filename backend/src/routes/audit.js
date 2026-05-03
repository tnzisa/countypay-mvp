/**
 * Audit Routes - Admin endpoints for viewing audit logs and compliance reports
 * All endpoints require admin role
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');
const auditService = require('../services/auditService');

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
 * Get audit trail for a specific transaction
 * GET /api/audit/transactions/:transactionId
 */
router.get('/transactions/:transactionId', adminOnly, async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const auditTrail = await auditService.getTransactionAuditTrail(req.params.transactionId, organizationId);
    
    if (auditTrail.length === 0) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'No audit logs found for this transaction'
      });
    }
    
    res.json({
      transactionId: req.params.transactionId,
      logs: auditTrail,
      count: auditTrail.length
    });
  } catch (error) {
    console.error('Get transaction audit trail error:', error);
    res.status(500).json({
      code: 'FETCH_FAILED',
      message: 'Failed to fetch audit trail',
      error: error.message
    });
  }
});

/**
 * Get audit trail for a specific user
 * GET /api/audit/users/:userId
 */
router.get('/users/:userId', adminOnly, async (req, res) => {
  try {
    const { limit = 100, offset = 0, action = null, dateFrom = null, dateTo = null } = req.query;
    const organizationId = req.organizationId;
    
    const auditTrail = await auditService.getUserAuditTrail(req.params.userId, organizationId, {
      limit: Math.min(parseInt(limit), 1000),
      offset: parseInt(offset),
      action,
      dateFrom,
      dateTo
    });
    
    res.json({
      userId: req.params.userId,
      logs: auditTrail,
      count: auditTrail.length
    });
  } catch (error) {
    console.error('Get user audit trail error:', error);
    res.status(500).json({
      code: 'FETCH_FAILED',
      message: 'Failed to fetch audit trail',
      error: error.message
    });
  }
});

/**
 * Get all audit logs with filters
 * GET /api/audit/logs
 */
router.get('/logs', adminOnly, async (req, res) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      resourceType = null, 
      action = null, 
      status = null,
      dateFrom = null, 
      dateTo = null 
    } = req.query;
    const organizationId = req.organizationId;
    
    const logs = await auditService.getAllAuditLogs(organizationId, {
      limit: Math.min(parseInt(limit), 1000),
      offset: parseInt(offset),
      resourceType,
      action,
      status,
      dateFrom,
      dateTo
    });
    
    res.json({
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      code: 'FETCH_FAILED',
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

/**
 * Export audit logs as CSV
 * GET /api/audit/export/csv
 */
router.get('/export/csv', adminOnly, async (req, res) => {
  try {
    const { 
      resourceType = null, 
      action = null, 
      status = null,
      dateFrom = null, 
      dateTo = null 
    } = req.query;
    const organizationId = req.organizationId;
    
    const csvContent = await auditService.exportAuditLogsAsCSV(organizationId, {
      resourceType,
      action,
      status,
      dateFrom,
      dateTo
    });
    
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      code: 'EXPORT_FAILED',
      message: 'Failed to export audit logs',
      error: error.message
    });
  }
});

/**
 * Get compliance statistics
 * GET /api/audit/compliance/stats
 */
router.get('/compliance/stats', adminOnly, async (req, res) => {
  try {
    const { dateFrom = null, dateTo = null } = req.query;
    const organizationId = req.organizationId;
    
    const stats = await auditService.getComplianceStatistics(organizationId, {
      dateFrom,
      dateTo
    });
    
    res.json({
      period: {
        from: dateFrom || 'beginning',
        to: dateTo || 'now'
      },
      statistics: stats
    });
  } catch (error) {
    console.error('Get compliance stats error:', error);
    res.status(500).json({
      code: 'FETCH_FAILED',
      message: 'Failed to fetch compliance statistics',
      error: error.message
    });
  }
});

/**
 * Search audit logs (advanced filtering)
 * POST /api/audit/search
 */
router.post('/search', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { 
      resourceType, 
      action, 
      status,
      actorId,
      dateFrom, 
      dateTo,
      limit = 100,
      offset = 0
    } = req.body;
    
    // Build where clause based on filters
    const where = {};
    if (resourceType) where.resourceType = resourceType;
    if (action) where.action = action;
    if (status) where.status = status;
    if (actorId) where.actorId = actorId;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    
    const logs = await auditService.getAllAuditLogs({
      limit: Math.min(parseInt(limit), 1000),
      offset: parseInt(offset),
      ...where
    });
    
    res.json({
      query: req.body,
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Search audit logs error:', error);
    res.status(500).json({
      code: 'SEARCH_FAILED',
      message: 'Failed to search audit logs',
      error: error.message
    });
  }
});

module.exports = router;
