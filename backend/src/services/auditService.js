/**
 * Audit Service - Logs all important business actions for compliance
 * Features:
 * - Transaction state change tracking
 * - User action logging
 * - Change history (before/after)
 * - Request correlation
 * - Admin queries for audit trails
 */

const { prisma } = require('../lib/prisma');

const AUDIT_ACTIONS = {
  // Transaction actions
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_RETRIED: 'PAYMENT_RETRIED',
  PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',
  
  // User actions
  USER_LOGIN: 'USER_LOGIN',
  USER_REGISTER: 'USER_REGISTER',
  USER_UPDATED: 'USER_UPDATED',
  
  // Admin actions
  ADMIN_QUERY: 'ADMIN_QUERY',
  ADMIN_EXPORT: 'ADMIN_EXPORT',
  
  // System actions
  BLOCKCHAIN_RECORD: 'BLOCKCHAIN_RECORD',
  BLOCKCHAIN_QUERY: 'BLOCKCHAIN_QUERY'
};

const AUDIT_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE'
};

/**
 * Log an audit event
 * @param {Object} params - Audit parameters
 */
async function logAudit({
  resourceType,
  resourceId,
  action,
  status = AUDIT_STATUS.SUCCESS,
  description = null,
  organizationId,
  actorId = null,
  changes = null,
  previousValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null,
  requestId = null,
  errorMessage = null,
  transactionId = null
}) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        resourceType,
        resourceId,
        action,
        status,
        description,
        organizationId,
        actorId,
        changes: changes ? JSON.stringify(changes) : null,
        previousValue: previousValue ? JSON.stringify(previousValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent,
        requestId,
        errorMessage,
        transactionId
      }
    });

    console.log(`[AUDIT] ${action}: ${resourceType}/${resourceId} - Status: ${status}`);
    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit failures shouldn't break business logic
  }
}

/**
 * Log transaction state change
 * @param {string} transactionId - Transaction ID
 * @param {string} fromStatus - Previous status
 * @param {string} toStatus - New status
 * @param {string} organizationId - Organization ID
 * @param {string} requestId - Request ID for correlation
 */
async function logTransactionStateChange(transactionId, fromStatus, toStatus, organizationId, requestId = null) {
  const action = `PAYMENT_${toStatus.toUpperCase()}`;
  
  await logAudit({
    resourceType: 'TRANSACTION',
    resourceId: transactionId,
    action,
    status: AUDIT_STATUS.SUCCESS,
    description: `Payment status changed from ${fromStatus} to ${toStatus}`,
    previousValue: { status: fromStatus },
    newValue: { status: toStatus },
    requestId,
    transactionId
  });
}

/**
 * Log user action (login, register, etc)
 * @param {string} userId - User ID
 * @param {string} action - Action type (AUDIT_ACTIONS)
 * @param {Object} options - Additional options
 */
async function logUserAction(userId, action, options = {}) {
  await logAudit({
    resourceType: 'USER',
    resourceId: userId,
    action,
    status: options.status || AUDIT_STATUS.SUCCESS,
    description: options.description,
    actorId: userId,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    requestId: options.requestId,
    errorMessage: options.errorMessage
  });
}

/**
 * Log payment verification
 * @param {string} transactionId - Transaction ID
 * @param {string} verificationResult - Verification result
 */
async function logPaymentVerification(transactionId, verificationResult) {
  await logAudit({
    resourceType: 'TRANSACTION',
    resourceId: transactionId,
    action: AUDIT_ACTIONS.PAYMENT_VERIFIED,
    status: verificationResult.verified ? AUDIT_STATUS.SUCCESS : AUDIT_STATUS.FAILURE,
    description: `Payment verified: ${verificationResult.verified}`,
    newValue: verificationResult,
    transactionId
  });
}

/**
 * Log blockchain operation
 * @param {string} transactionId - Transaction ID
 * @param {string} operation - Operation (RECORD, QUERY, etc)
 * @param {Object} result - Operation result
 */
async function logBlockchainOperation(transactionId, operation, result) {
  const action = `BLOCKCHAIN_${operation.toUpperCase()}`;
  
  await logAudit({
    resourceType: 'BLOCKCHAIN',
    resourceId: transactionId,
    action,
    status: result.success ? AUDIT_STATUS.SUCCESS : AUDIT_STATUS.FAILURE,
    description: `Blockchain ${operation.toLowerCase()} for payment`,
    newValue: result,
    errorMessage: result.error,
    transactionId
  });
}

/**
 * Get audit trail for a transaction
 * @param {string} transactionId - Transaction ID
 * @param {string} organizationId - Organization ID for isolation
 * @returns {Promise<Array>} Audit logs for this transaction
 */
async function getTransactionAuditTrail(transactionId, organizationId) {
  return prisma.auditLog.findMany({
    where: {
      transactionId,
      organizationId,
      resourceType: { in: ['TRANSACTION', 'BLOCKCHAIN', 'PAYMENT'] }
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Get audit logs for a user (admin query)
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID for isolation
 * @param {Object} options - Filter options (limit, offset, action, dateFrom, dateTo)
 * @returns {Promise<Array>} Audit logs for this user
 */
async function getUserAuditTrail(userId, organizationId, options = {}) {
  const { limit = 100, offset = 0, action = null, dateFrom = null, dateTo = null } = options;

  const where = {
    organizationId,
    OR: [
      { actorId: userId },
      { resourceId: userId, resourceType: 'USER' }
    ]
  };

  if (action) {
    where.action = action;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo);
    }
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  });
}

/**
 * Get all audit logs (admin only)
 * @param {string} organizationId - Organization ID for isolation
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} All audit logs
 */
async function getAllAuditLogs(organizationId, options = {}) {
  const { limit = 100, offset = 0, resourceType = null, action = null, status = null, dateFrom = null, dateTo = null } = options;

  const where = { organizationId };

  if (resourceType) {
    where.resourceType = resourceType;
  }

  if (action) {
    where.action = action;
  }

  if (status) {
    where.status = status;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo);
    }
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      },
      transaction: {
        select: {
          id: true,
          transactionRef: true,
          amount: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  });
}

/**
 * Export audit logs as CSV (for compliance reports)
 * @param {string} organizationId - Organization ID for isolation
 * @param {Object} options - Filter options
 * @returns {Promise<string>} CSV formatted audit logs
 */
async function exportAuditLogsAsCSV(organizationId, options = {}) {
  const logs = await getAllAuditLogs(organizationId, { ...options, limit: 10000 });

  // CSV headers
  const headers = [
    'Timestamp',
    'Action',
    'Resource Type',
    'Resource ID',
    'Status',
    'Actor',
    'Actor ID',
    'Description',
    'IP Address',
    'Error Message',
    'Request ID'
  ];

  const rows = logs.map(log => [
    log.createdAt.toISOString(),
    log.action,
    log.resourceType,
    log.resourceId,
    log.status,
    log.actor?.name || 'System',
    log.actorId || '-',
    log.description || '',
    log.ipAddress || '-',
    log.errorMessage || '-',
    log.requestId || '-'
  ]);

  // Convert to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row
        .map(cell =>
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        )
        .join(',')
    )
  ].join('\n');

  return csvContent;
}

/**
 * Get compliance statistics
 * @param {string} organizationId - Organization ID for isolation
 * @param {Object} options - Filter options (dateFrom, dateTo)
 * @returns {Promise<Object>} Compliance stats
 */
async function getComplianceStatistics(organizationId, options = {}) {
  const { dateFrom = null, dateTo = null } = options;

  const where = {
    organizationId,
    ...(dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) })
      }
    }
  };

  const [totalActions, failedActions, byResourceType, byAction] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { ...where, status: AUDIT_STATUS.FAILURE } }),
    prisma.auditLog.groupBy({
      by: ['resourceType'],
      where,
      _count: true
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true
    })
  ]);

  return {
    totalActions,
    failedActions,
    successRate: totalActions > 0 ? ((totalActions - failedActions) / totalActions * 100).toFixed(2) + '%' : 'N/A',
    byResourceType: byResourceType.reduce((acc, item) => {
      acc[item.resourceType] = item._count;
      return acc;
    }, {}),
    byAction: byAction.reduce((acc, item) => {
      acc[item.action] = item._count;
      return acc;
    }, {})
  };
}

module.exports = {
  AUDIT_ACTIONS,
  AUDIT_STATUS,
  logAudit,
  logTransactionStateChange,
  logUserAction,
  logPaymentVerification,
  logBlockchainOperation,
  getTransactionAuditTrail,
  getUserAuditTrail,
  getAllAuditLogs,
  exportAuditLogsAsCSV,
  getComplianceStatistics
};
