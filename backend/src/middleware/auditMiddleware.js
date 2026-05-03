/**
 * Audit Middleware - Tracks request context for audit logging
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to add request context for audit tracking
 */
function auditMiddleware(req, res, next) {
  // Generate request ID for correlation
  req.requestId = req.headers['x-request-id'] || uuidv4();
  
  // Capture request context
  req.auditContext = {
    requestId: req.requestId,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    method: req.method,
    path: req.path,
    userId: req.user?.userId
  };
  
  // Add to response headers for client reference
  res.setHeader('X-Request-Id', req.requestId);
  
  next();
}

module.exports = { auditMiddleware };
