/**
 * Fraud Detection Service
 * Features:
 * - Device fingerprinting
 * - Velocity checks (repeated payments)
 * - Geolocation verification
 * - KYC integration
 * - Risk scoring
 */

const { prisma } = require('../lib/prisma');
const crypto = require('crypto');

// Risk scoring thresholds
const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 80
};

/**
 * Generate device fingerprint from request context
 */
function generateDeviceFingerprint(userAgent, ipAddress) {
  const data = `${userAgent}:${ipAddress}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Check for high velocity (too many transactions in short time)
 */
async function checkVelocity(userId, phoneNumber, options = {}) {
  const { timeWindow = 3600, threshold = 5 } = options; // 1 hour, 5 transactions
  
  const dateFrom = new Date(Date.now() - timeWindow * 1000);
  
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: { gte: dateFrom }
    }
  });

  const riskLevel = recentTransactions.length >= threshold ? 'HIGH' : 'LOW';
  
  return {
    riskLevel,
    transactionCount: recentTransactions.length,
    threshold,
    timeWindow,
    risk: recentTransactions.length >= threshold
  };
}

/**
 * Check for unusual payment amount
 */
async function checkPaymentAmount(userId, amount, options = {}) {
  const { days = 30, deviationThreshold = 3 } = options; // 3 standard deviations
  
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const userTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      createdAt: { gte: dateFrom }
    }
  });

  if (userTransactions.length < 3) {
    // Not enough data for statistical analysis
    return { riskLevel: 'LOW', risk: false, reason: 'Insufficient history' };
  }

  const amounts = userTransactions.map(t => t.amount);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  const zScore = Math.abs((amount - mean) / stdDev);
  const isUnusual = zScore > deviationThreshold;

  return {
    riskLevel: isUnusual ? 'MEDIUM' : 'LOW',
    mean: mean.toFixed(2),
    stdDev: stdDev.toFixed(2),
    zScore: zScore.toFixed(2),
    risk: isUnusual
  };
}

/**
 * Check for replay attacks (duplicate transactions)
 */
async function checkReplayAttack(phoneNumber, amount, county, options = {}) {
  const { timeWindow = 300 } = options; // 5 minutes
  
  const dateFrom = new Date(Date.now() - timeWindow * 1000);

  const similarTransactions = await prisma.transaction.findMany({
    where: {
      phoneNumber,
      amount,
      createdAt: { gte: dateFrom },
      fee: {
        county: { code: county }
      }
    }
  });

  const isDuplicate = similarTransactions.length > 0;

  return {
    riskLevel: isDuplicate ? 'HIGH' : 'LOW',
    isDuplicate,
    recentSimilarTransactions: similarTransactions.length,
    timeWindow
  };
}

/**
 * Geolocation verification (mock)
 */
async function verifyGeolocation(phoneNumber, ipAddress, options = {}) {
  // Mock implementation - in production, use MaxMind, IP2Location, etc.
  // For now, assume Kenya-based transactions are normal
  
  const isKenyaIP = ipAddress.startsWith('102.') || 
                   ipAddress.startsWith('105.') ||
                   ipAddress.startsWith('154.');

  return {
    riskLevel: isKenyaIP ? 'LOW' : 'MEDIUM',
    ipLocation: ipAddress,
    isExpectedLocation: isKenyaIP,
    warning: isKenyaIP ? null : 'Transaction from unexpected location'
  };
}

/**
 * KYC verification status check
 */
async function checkKYCStatus(userId, options = {}) {
  // Mock implementation - integrate with real KYC provider
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  // For MVP, assume all users are unverified
  const isVerified = false;
  const highValueThreshold = 50000; // KES

  return {
    riskLevel: isVerified ? 'LOW' : 'MEDIUM',
    isVerified,
    verificationStatus: 'UNVERIFIED',
    warning: isVerified ? null : 'User KYC status not verified'
  };
}

/**
 * Calculate overall fraud risk score (0-100)
 */
async function calculateFraudRisk(userId, transactionData, requestContext, options = {}) {
  const {
    amount,
    phoneNumber,
    countyCode,
    paymentMethod
  } = transactionData;

  const {
    userAgent,
    ipAddress
  } = requestContext;

  try {
    // Run all checks in parallel
    const [
      velocityCheck,
      amountCheck,
      replayCheck,
      geoCheck,
      kycCheck
    ] = await Promise.all([
      checkVelocity(userId, phoneNumber),
      checkPaymentAmount(userId, amount),
      checkReplayAttack(phoneNumber, amount, countyCode),
      verifyGeolocation(phoneNumber, ipAddress),
      checkKYCStatus(userId)
    ]);

    // Calculate risk score
    let riskScore = 0;
    const riskFactors = [];

    // Velocity risk (max 30 points)
    if (velocityCheck.risk) {
      riskScore += 30;
      riskFactors.push({ factor: 'HIGH_VELOCITY', contribution: 30 });
    }

    // Amount risk (max 20 points)
    if (amountCheck.risk) {
      riskScore += 20;
      riskFactors.push({ factor: 'UNUSUAL_AMOUNT', contribution: 20 });
    }

    // Replay attack risk (max 25 points)
    if (replayCheck.isDuplicate) {
      riskScore += 25;
      riskFactors.push({ factor: 'REPLAY_ATTACK', contribution: 25 });
    }

    // Geolocation risk (max 15 points)
    if (geoCheck.riskLevel === 'MEDIUM') {
      riskScore += 15;
      riskFactors.push({ factor: 'UNEXPECTED_LOCATION', contribution: 15 });
    }

    // KYC risk (max 10 points)
    if (kycCheck.riskLevel === 'MEDIUM') {
      riskScore += 10;
      riskFactors.push({ factor: 'UNVERIFIED_USER', contribution: 10 });
    }

    // Determine overall risk level
    let overallRiskLevel = 'LOW';
    if (riskScore >= RISK_THRESHOLDS.HIGH) {
      overallRiskLevel = 'HIGH';
    } else if (riskScore >= RISK_THRESHOLDS.MEDIUM) {
      overallRiskLevel = 'MEDIUM';
    }

    // Log device fingerprint
    const deviceFingerprint = generateDeviceFingerprint(userAgent, ipAddress);

    return {
      riskScore,
      overallRiskLevel,
      shouldBlock: riskScore > 85,
      deviceFingerprint,
      riskFactors,
      checks: {
        velocity: velocityCheck,
        amount: amountCheck,
        replay: replayCheck,
        geolocation: geoCheck,
        kyc: kycCheck
      }
    };
  } catch (error) {
    console.error('Fraud risk calculation failed:', error);
    // Fail open - allow payment but flag as uncertain
    return {
      riskScore: 50,
      overallRiskLevel: 'MEDIUM',
      shouldBlock: false,
      error: error.message
    };
  }
}

/**
 * Log fraud event for investigation
 */
async function logFraudEvent(transactionId, riskAssessment, action) {
  try {
    // In production, log to security/fraud database
    console.log('[FRAUD_ALERT]', {
      transactionId,
      riskScore: riskAssessment.riskScore,
      riskLevel: riskAssessment.overallRiskLevel,
      riskFactors: riskAssessment.riskFactors,
      action,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log fraud event:', error);
  }
}

module.exports = {
  RISK_THRESHOLDS,
  generateDeviceFingerprint,
  checkVelocity,
  checkPaymentAmount,
  checkReplayAttack,
  verifyGeolocation,
  checkKYCStatus,
  calculateFraudRisk,
  logFraudEvent
};
