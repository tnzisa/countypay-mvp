/**
 * Anomaly Detection Service
 * Implements 4 detection rules for payment anomalies
 */

/**
 * Rule 1: Detect stale pending payments
 * Payments that have been pending for more than 15 minutes
 */
function detectStalePending(payments) {
  const fifteenMinutesAgo = Date.now() - (15 * 60 * 1000);
  
  const stalePayments = payments.filter(payment => {
    if (payment.status !== 'pending') return false;
    
    const createdAt = new Date(payment.createdAt).getTime();
    return createdAt < fifteenMinutesAgo;
  });

  return stalePayments.map(payment => ({
    paymentId: payment.id,
    rule: 'Stale Pending',
    reason: 'Payment pending for more than 15 minutes',
    amount: payment.amount,
    feeType: payment.fee?.name || 'Unknown',
    countyCode: payment.fee?.county?.code || 'Unknown',
    phoneNumber: payment.phoneNumber,
    createdAt: payment.createdAt
  }));
}

/**
 * Rule 2: Detect duplicate payments
 * Same userId + feeId combination within 24 hours
 */
function detectDuplicates(payments) {
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  // Filter payments from last 24 hours
  const recentPayments = payments.filter(payment => {
    const createdAt = new Date(payment.createdAt).getTime();
    return createdAt > twentyFourHoursAgo;
  });

  // Group by userId + feeId
  const paymentGroups = {};
  recentPayments.forEach(payment => {
    const key = `${payment.userId}_${payment.feeId}`;
    if (!paymentGroups[key]) {
      paymentGroups[key] = [];
    }
    paymentGroups[key].push(payment);
  });

  // Find duplicates (groups with more than 1 payment)
  const duplicates = [];
  Object.values(paymentGroups).forEach(group => {
    if (group.length > 1) {
      // Add all payments in the duplicate group
      group.forEach(payment => {
        duplicates.push({
          paymentId: payment.id,
          rule: 'Duplicate Payment',
          reason: `Same user paid for ${payment.fee?.name} ${group.length} times within 24 hours`,
          amount: payment.amount,
          feeType: payment.fee?.name || 'Unknown',
          countyCode: payment.fee?.county?.code || 'Unknown',
          phoneNumber: payment.phoneNumber,
          createdAt: payment.createdAt
        });
      });
    }
  });

  return duplicates;
}

/**
 * Rule 3: Detect high value outliers
 * Payments where amount is more than double the standard fee amount
 */
function detectHighValueOutliers(payments) {
  const outliers = payments.filter(payment => {
    if (!payment.fee || !payment.fee.amount) return false;
    
    // Check if payment amount is more than 2x the fee amount
    return payment.amount > (payment.fee.amount * 2);
  });

  return outliers.map(payment => ({
    paymentId: payment.id,
    rule: 'High Value Outlier',
    reason: `Payment amount (${payment.amount}) is more than double the standard fee (${payment.fee.amount})`,
    amount: payment.amount,
    feeType: payment.fee?.name || 'Unknown',
    countyCode: payment.fee?.county?.code || 'Unknown',
    phoneNumber: payment.phoneNumber,
    createdAt: payment.createdAt
  }));
}

/**
 * Rule 4: Detect unconfirmed blockchain transactions
 * Completed payments without blockchain transaction ID
 */
function detectUnconfirmedBlockchain(payments) {
  const unconfirmed = payments.filter(payment => {
    return payment.status === 'completed' && 
           (!payment.blockchainTxId || payment.blockchainTxId === '');
  });

  return unconfirmed.map(payment => ({
    paymentId: payment.id,
    rule: 'Unconfirmed Blockchain',
    reason: 'Payment completed but not recorded on Hyperledger Fabric ledger',
    amount: payment.amount,
    feeType: payment.fee?.name || 'Unknown',
    countyCode: payment.fee?.county?.code || 'Unknown',
    phoneNumber: payment.phoneNumber,
    createdAt: payment.createdAt
  }));
}

/**
 * Run all anomaly detection rules and return combined results
 */
function runAllRules(payments) {
  console.log(`AI AGENT: Running anomaly detection on ${payments.length} payments...`);
  
  const stalePending = detectStalePending(payments);
  const duplicates = detectDuplicates(payments);
  const highValueOutliers = detectHighValueOutliers(payments);
  const unconfirmedBlockchain = detectUnconfirmedBlockchain(payments);

  // Combine all anomalies
  const allAnomalies = [
    ...stalePending,
    ...duplicates,
    ...highValueOutliers,
    ...unconfirmedBlockchain
  ];

  // Deduplicate by paymentId (keep first occurrence)
  const seen = new Set();
  const deduplicated = allAnomalies.filter(anomaly => {
    if (seen.has(anomaly.paymentId)) {
      return false;
    }
    seen.add(anomaly.paymentId);
    return true;
  });

  console.log(`AI AGENT: Detected ${deduplicated.length} anomalies:`);
  console.log(`  - Stale Pending: ${stalePending.length}`);
  console.log(`  - Duplicates: ${duplicates.length}`);
  console.log(`  - High Value Outliers: ${highValueOutliers.length}`);
  console.log(`  - Unconfirmed Blockchain: ${unconfirmedBlockchain.length}`);

  return deduplicated;
}

module.exports = {
  detectStalePending,
  detectDuplicates,
  detectHighValueOutliers,
  detectUnconfirmedBlockchain,
  runAllRules
};

// Made with Bob
