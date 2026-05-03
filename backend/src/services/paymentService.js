/**
 * Payment Service - Handles payment processing with resilience
 * Features:
 * - Multiple payment providers (M-Pesa, Stripe, Bank Transfer)
 * - Automatic retry with exponential backoff
 * - Idempotency key support to prevent duplicate charges
 * - Payment state machine (PENDING → PROCESSING → COMPLETED/FAILED)
 * - Audit logging for compliance
 * - Fraud detection and prevention
 * - Cache invalidation for analytics
 */

const { prisma } = require('../lib/prisma');
const cacheService = require('./cacheService');
const fabricService = require('./fabric');
const auditService = require('./auditService');
const fraudDetectionService = require('./fraudDetectionService');

// Payment status constants
const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

// Payment provider implementations
const PROVIDERS = {
  mpesa: require('../providers/mpesaProvider'),
  stripe: require('../providers/stripeProvider'),
  bank_transfer: require('../providers/bankTransferProvider')
};

// Default provider fallback chain
const PROVIDER_FALLBACK_CHAIN = ['mpesa', 'stripe', 'bank_transfer'];

/**
 * Create a new payment transaction with idempotency support
 * @param {Object} params - Payment parameters
 * @returns {Promise<Object>} Created transaction
 */
async function createPayment({ feeId, phoneNumber, paymentMethod, idempotencyKey, userId, organizationId, requestContext = {} }) {
  try {
    // Check for existing payment with same idempotency key
    if (idempotencyKey) {
      const existing = await prisma.transaction.findUnique({
        where: { idempotencyKey }
      });

      if (existing) {
        console.log(`Payment idempotency: Returning existing transaction ${existing.id}`);
        return existing;
      }
    }

    // Validate fee exists and belongs to organization
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { county: true }
    });

    if (!fee || fee.organizationId !== organizationId) {
      throw new Error(`Fee not found or access denied: ${feeId}`);
    }

    // Verify user belongs to organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (!user || user.organizationId !== organizationId) {
      throw new Error('User does not belong to this organization');
    }

    // Run fraud detection checks
    const fraudRiskAssessment = await fraudDetectionService.calculateFraudRisk(
      userId,
      {
        amount: fee.amount,
        phoneNumber,
        countyCode: fee.county.code,
        paymentMethod
      },
      requestContext
    );

    // Block high-risk transactions
    if (fraudRiskAssessment.shouldBlock) {
      await fraudDetectionService.logFraudEvent(
        `BLOCKED-${Date.now()}`,
        fraudRiskAssessment,
        'BLOCKED'
      );

      throw new Error(`Transaction blocked due to fraud risk (Score: ${fraudRiskAssessment.riskScore})`);
    }

    // Generate transaction reference
    const transactionRef = `CP${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Determine payment provider
    const provider = paymentMethod || 'mpesa';

    // Create transaction in PENDING state
    const transaction = await prisma.transaction.create({
      data: {
        amount: fee.amount,
        status: PAYMENT_STATUS.PENDING,
        paymentMethod: paymentMethod || 'mpesa',
        paymentProvider: provider,
        phoneNumber,
        transactionRef,
        idempotencyKey,
        userId,
        feeId,
        organizationId,
        retryCount: 0,
        maxRetries: 3
      },
      include: {
        fee: { include: { county: true } },
        user: { select: { id: true, name: true, phone: true } }
      }
    });

    // Log audit event
    await auditService.logAudit({
      resourceType: 'TRANSACTION',
      resourceId: transaction.id,
      action: auditService.AUDIT_ACTIONS.PAYMENT_CREATED,
      status: auditService.AUDIT_STATUS.SUCCESS,
      description: `Payment created: KES ${transaction.amount} for ${fee.name}. Fraud risk: ${fraudRiskAssessment.overallRiskLevel}`,
      actorId: userId,
      newValue: { 
        amount: transaction.amount,
        fee: fee.name,
        county: transaction.fee.county.name,
        fraudRiskScore: fraudRiskAssessment.riskScore
      },
      transactionId: transaction.id
    });

    // Log fraud assessment
    if (fraudRiskAssessment.riskScore > 30) {
      await fraudDetectionService.logFraudEvent(transaction.id, fraudRiskAssessment, 'MONITORED');
    }

    console.log(`Payment created: ${transaction.id} (Ref: ${transactionRef}, Fraud Risk: ${fraudRiskAssessment.overallRiskLevel})`);
    
    // Invalidate organization analytics cache (new transaction affects dashboards)
    await cacheService.invalidateOrgAnalytics(organizationId).catch(err => 
      console.error('Failed to invalidate cache:', err)
    );

    return {
      ...transaction,
      fraudRiskAssessment
    };
  } catch (error) {
    console.error('Failed to create payment:', error);
    throw error;
  }
}

/**
 * Process payment with automatic retry and fallback providers
 * @param {string} transactionId - Transaction ID to process
 * @returns {Promise<Object>} Processing result
 */
async function processPayment(transactionId) {
  let transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { fee: { include: { county: true } }, user: true }
  });

  if (!transaction) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  try {
    // Update status to PROCESSING
    await updateTransactionStatus(transactionId, PAYMENT_STATUS.PROCESSING);
    
    // Log processing state change
    await auditService.logTransactionStateChange(transactionId, PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING);

    // Try primary provider, then fallback chain
    const providerChain = [transaction.paymentProvider, ...PROVIDER_FALLBACK_CHAIN.filter(p => p !== transaction.paymentProvider)];
    
    let paymentResult = null;
    let lastError = null;

    for (const provider of providerChain) {
      try {
        console.log(`Attempting payment with provider: ${provider}`);
        paymentResult = await processWithProvider(provider, transaction);

        if (paymentResult.success) {
          console.log(`Payment succeeded with ${provider}: ${transactionId}`);
          break;
        }
        lastError = paymentResult.error;
      } catch (error) {
        lastError = error.message;
        console.warn(`Provider ${provider} failed: ${lastError}`);
        continue;
      }
    }

    // If all providers failed, update to FAILED state
    if (!paymentResult || !paymentResult.success) {
      await updateTransactionStatus(
        transactionId,
        PAYMENT_STATUS.FAILED,
        lastError || 'All payment providers failed'
      );
      
      // Log failure
      await auditService.logAudit({
        resourceType: 'TRANSACTION',
        resourceId: transactionId,
        action: auditService.AUDIT_ACTIONS.PAYMENT_FAILED,
        status: auditService.AUDIT_STATUS.FAILURE,
        description: `Payment failed: ${lastError || 'All providers failed'}`,
        errorMessage: lastError,
        transactionId
      });
      
      return {
        success: false,
        error: lastError || 'Payment processing failed',
        transactionId
      };
    }

    // Record on blockchain
    await recordOnBlockchain(transaction);

    // Update transaction to COMPLETED
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: PAYMENT_STATUS.COMPLETED,
        processedAt: new Date(),
        blockchainTxId: paymentResult.blockchainTxId,
        blockchainHash: paymentResult.blockchainHash
      }
    });
    
    // Log completion
    await auditService.logTransactionStateChange(transactionId, PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.COMPLETED);
    await auditService.logBlockchainOperation(transactionId, 'RECORD', {
      success: true,
      txId: paymentResult.blockchainTxId
    });

    console.log(`Payment completed: ${transactionId}`);
    return {
      success: true,
      transactionId,
      providerUsed: paymentResult.provider,
      blockchainTxId: paymentResult.blockchainTxId
    };
  } catch (error) {
    console.error(`Payment processing failed: ${transactionId}`, error);

    // Update to FAILED with error message
    await updateTransactionStatus(
      transactionId,
      PAYMENT_STATUS.FAILED,
      error.message
    );
    
    // Log failure
    await auditService.logAudit({
      resourceType: 'TRANSACTION',
      resourceId: transactionId,
      action: auditService.AUDIT_ACTIONS.PAYMENT_FAILED,
      status: auditService.AUDIT_STATUS.FAILURE,
      description: `Payment processing error: ${error.message}`,
      errorMessage: error.message,
      transactionId
    });

    return {
      success: false,
      error: error.message,
      transactionId
    };
  }
}

/**
 * Process payment with specific provider
 * @param {string} provider - Provider name
 * @param {Object} transaction - Transaction object
 * @returns {Promise<Object>} Provider result
 */
async function processWithProvider(provider, transaction) {
  const providerImpl = PROVIDERS[provider];

  if (!providerImpl) {
    throw new Error(`Unknown payment provider: ${provider}`);
  }

  const result = await providerImpl.process({
    amount: transaction.amount,
    phoneNumber: transaction.phoneNumber,
    transactionRef: transaction.transactionRef,
    userId: transaction.userId
  });

  return {
    ...result,
    provider
  };
}

/**
 * Record payment on blockchain
 * @param {Object} transaction - Transaction object
 */
async function recordOnBlockchain(transaction) {
  try {
    const fabricResult = await fabricService.recordPayment({
      paymentId: transaction.id,
      transactionRef: transaction.transactionRef,
      amount: transaction.amount,
      countyCode: transaction.fee.county.code,
      feeType: transaction.fee.name,
      phoneNumber: transaction.phoneNumber,
      status: 'COMPLETED'
    });

    console.log(`Recorded on blockchain: ${transaction.id}`);
    return fabricResult;
  } catch (error) {
    console.error('Blockchain recording failed (payment still completed):', error);
    // Don't throw - payment succeeded even if blockchain fails
  }
}

/**
 * Update transaction status with optional error message
 * @param {string} transactionId - Transaction ID
 * @param {string} status - New status
 * @param {string} error - Optional error message
 */
async function updateTransactionStatus(transactionId, status, error = null) {
  const data = {
    status,
    updatedAt: new Date()
  };

  if (error) {
    data.lastError = error;
  }

  return prisma.transaction.update({
    where: { id: transactionId },
    data
  });
}

/**
 * Retry failed payment with exponential backoff
 * @param {string} transactionId - Transaction ID to retry
 * @returns {Promise<Object>} Retry result
 */
async function retryPayment(transactionId) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { fee: { include: { county: true } }, user: true }
  });

  if (!transaction) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  // Check retry limit
  if (transaction.retryCount >= transaction.maxRetries) {
    throw new Error(`Maximum retries (${transaction.maxRetries}) exceeded for transaction ${transactionId}`);
  }

  // Calculate backoff delay (exponential: 1s, 2s, 4s)
  const delayMs = Math.pow(2, transaction.retryCount) * 1000;
  console.log(`Retrying payment ${transactionId} in ${delayMs}ms (Attempt ${transaction.retryCount + 1}/${transaction.maxRetries})`);
  
  // Log retry
  await auditService.logAudit({
    resourceType: 'TRANSACTION',
    resourceId: transactionId,
    action: auditService.AUDIT_ACTIONS.PAYMENT_RETRIED,
    status: auditService.AUDIT_STATUS.SUCCESS,
    description: `Payment retry initiated (Attempt ${transaction.retryCount + 1}/${transaction.maxRetries})`,
    transactionId
  });

  // Increment retry count
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { retryCount: transaction.retryCount + 1 }
  });

  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, delayMs));

  // Retry payment
  return processPayment(transactionId);
}

/**
 * Get payment status
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} Transaction details
 */
async function getPaymentStatus(transactionId) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      fee: { include: { county: true } },
      user: { select: { id: true, name: true, phone: true } }
    }
  });

  if (!transaction) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  return transaction;
}

/**
 * Get all transactions for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, offset, status)
 * @returns {Promise<Array>} User transactions
 */
async function getUserTransactions(userId, options = {}) {
  const { limit = 20, offset = 0, status = null } = options;

  const where = { userId };
  if (status) {
    where.status = status;
  }

  return prisma.transaction.findMany({
    where,
    include: { fee: { include: { county: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  });
}

module.exports = {
  PAYMENT_STATUS,
  createPayment,
  processPayment,
  retryPayment,
  getPaymentStatus,
  getUserTransactions,
  recordOnBlockchain
};
