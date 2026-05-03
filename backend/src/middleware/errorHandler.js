/**
 * Global Error Handler Middleware
 * Catches all errors and formats them consistently
 */

const { ApiError, errorResponse, HTTP_STATUS_MAP } = require('../lib/errorUtils');
const auditService = require('../services/auditService');

/**
 * Global error handler middleware
 * Should be registered AFTER all other routes and middleware
 */
function errorHandler(err, req, res, next) {
  // Default error details
  let statusCode = 500;
  let errorBody = null;
  let isClientError = false;

  // Handle ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorBody = err.toJSON();
    isClientError = statusCode >= 400 && statusCode < 500;
  }
  // Handle Prisma errors
  else if (err.name === 'PrismaClientKnownRequestError') {
    const code = err.code;
    
    if (code === 'P2002') {
      // Unique constraint violation
      statusCode = 409;
      errorBody = errorResponse(
        'RESOURCE_ALREADY_EXISTS',
        'Resource already exists (unique constraint violation)',
        { field: err.meta?.target }
      );
    } else if (code === 'P2025') {
      // Record not found
      statusCode = 404;
      errorBody = errorResponse(
        'NOT_FOUND',
        'Record not found'
      );
    } else {
      statusCode = 500;
      errorBody = errorResponse(
        'DATABASE_ERROR',
        'Database error occurred'
      );
    }
    isClientError = false;
  }
  // Handle Prisma connection errors
  else if (err.name === 'PrismaClientInitializationError' || err.name === 'PrismaClientRustPanicError') {
    statusCode = 503;
    errorBody = errorResponse(
      'SERVICE_UNAVAILABLE',
      'Database service unavailable'
    );
    isClientError = false;
  }
  // Handle JSON parse errors
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorBody = errorResponse(
      'INVALID_INPUT',
      'Invalid JSON in request body',
      { error: err.message }
    );
    isClientError = true;
  }
  // Handle other errors
  else {
    statusCode = 500;
    errorBody = errorResponse(
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      process.env.NODE_ENV === 'production' ? null : { error: err.message }
    );
    isClientError = false;
  }

  // Add request ID if available
  if (req.requestId) {
    errorBody.requestId = req.requestId;
  }

  // Log error
  const logLevel = isClientError ? 'warn' : 'error';
  console.log(`[${logLevel.toUpperCase()}] ${statusCode} - ${errorBody.code} - ${errorBody.message}`, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });

  // Log to audit if it's an important error
  if (req.auditContext && !isClientError) {
    auditService.logAudit({
      resourceType: 'SYSTEM',
      resourceId: req.path,
      action: 'API_ERROR',
      status: auditService.AUDIT_STATUS.FAILURE,
      description: `Error: ${errorBody.code}`,
      ipAddress: req.auditContext.ipAddress,
      userAgent: req.auditContext.userAgent,
      requestId: req.auditContext.requestId,
      errorMessage: err.message,
      actorId: req.user?.userId
    }).catch(e => console.error('Failed to log audit:', e));
  }

  // Send response
  res.status(statusCode).json(errorBody);
}

/**
 * Async error wrapper for route handlers
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  asyncHandler
};
