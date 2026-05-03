/**
 * Error Utilities - Helper functions for consistent error handling
 */

const { ERROR_CODES, HTTP_STATUS_MAP } = require('./errorCodes');

/**
 * Standard API Error class
 */
class ApiError extends Error {
  constructor(code, message, details = null, statusCode = null) {
    super(message);
    this.code = code;
    this.message = message;
    this.details = details;
    this.statusCode = statusCode || HTTP_STATUS_MAP[code] || 500;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Create a standardized error response
 */
function errorResponse(code, message, details = null) {
  return {
    code,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Create a standardized success response
 */
function successResponse(data, message = null) {
  return {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Validation error helper
 */
function validationError(fields) {
  return new ApiError(
    ERROR_CODES.MISSING_REQUIRED_FIELDS,
    'Validation error',
    {
      fields: Array.isArray(fields) ? fields : [fields]
    }
  );
}

/**
 * Not found error helper
 */
function notFoundError(resourceType) {
  const code = ERROR_CODES[`${resourceType}_NOT_FOUND`] || ERROR_CODES.NOT_FOUND;
  return new ApiError(
    code,
    `${resourceType} not found`
  );
}

/**
 * Unauthorized error helper
 */
function unauthorizedError(reason = 'Unauthorized') {
  return new ApiError(
    ERROR_CODES.UNAUTHORIZED,
    reason
  );
}

/**
 * Forbidden error helper
 */
function forbiddenError(reason = 'Access denied') {
  return new ApiError(
    ERROR_CODES.FORBIDDEN,
    reason
  );
}

/**
 * Payment error helper
 */
function paymentError(message, details = null) {
  return new ApiError(
    ERROR_CODES.PAYMENT_FAILED,
    message,
    details
  );
}

/**
 * Blockchain error helper
 */
function blockchainError(message, details = null) {
  return new ApiError(
    ERROR_CODES.BLOCKCHAIN_ERROR,
    message,
    details
  );
}

/**
 * Database error helper
 */
function databaseError(message = 'Database error') {
  return new ApiError(
    ERROR_CODES.DATABASE_ERROR,
    message
  );
}

/**
 * Conflict error helper
 */
function conflictError(message, details = null) {
  return new ApiError(
    ERROR_CODES.CONFLICT,
    message,
    details
  );
}

module.exports = {
  ApiError,
  ERROR_CODES,
  HTTP_STATUS_MAP,
  errorResponse,
  successResponse,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  paymentError,
  blockchainError,
  databaseError,
  conflictError
};
