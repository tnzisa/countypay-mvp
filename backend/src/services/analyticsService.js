/**
 * Analytics Service - Provides real-time metrics and insights
 * Features:
 * - Payment volume and revenue tracking
 * - Transaction failure analysis
 * - County/fee performance breakdown
 * - Cash flow forecasting
 * - Anomaly detection
 */

const { prisma } = require('../lib/prisma');

/**
 * Get dashboard summary metrics
 * @param {string} organizationId - Organization ID for isolation
 */
async function getDashboardSummary(organizationId, options = {}) {
  const { days = 30, county = null } = options;
  
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const where = {
    organizationId,
    createdAt: { gte: dateFrom },
    ...(county && { fee: { county: { id: county } } })
  };

  // Get all transactions for the period
  const transactions = await prisma.transaction.findMany({
    where,
    include: { fee: { include: { county: true } } }
  });

  // Calculate metrics
  const completed = transactions.filter(t => t.status === 'COMPLETED');
  const failed = transactions.filter(t => t.status === 'FAILED');
  const pending = transactions.filter(t => t.status === 'PENDING');

  const totalRevenue = completed.reduce((sum, t) => sum + t.amount, 0);
  const failedAmount = failed.reduce((sum, t) => sum + t.amount, 0);

  return {
    period: {
      from: dateFrom.toISOString(),
      to: new Date().toISOString(),
      days
    },
    transactions: {
      total: transactions.length,
      completed: completed.length,
      failed: failed.length,
      pending: pending.length,
      completionRate: transactions.length > 0 
        ? ((completed.length / transactions.length) * 100).toFixed(2) + '%'
        : '0%'
    },
    revenue: {
      total: totalRevenue,
      failed: failedAmount,
      average: transactions.length > 0 ? (totalRevenue / transactions.length).toFixed(2) : 0
    },
    performance: {
      successfulTransactions: completed.length,
      failedTransactions: failed.length,
      failureRate: transactions.length > 0
        ? ((failed.length / transactions.length) * 100).toFixed(2) + '%'
        : '0%'
    }
  };
}

/**
 * Get county performance breakdown
 * @param {string} organizationId - Organization ID for isolation
 */
async function getCountyPerformance(organizationId, options = {}) {
  const { days = 30, limit = 20 } = options;
  
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: dateFrom } },
    include: { fee: { include: { county: true } } }
  });

  // Group by county
  const countyStats = {};
  transactions.forEach(t => {
    const county = t.fee.county;
    if (!countyStats[county.id]) {
      countyStats[county.id] = {
        countyId: county.id,
        countyName: county.name,
        countyCode: county.code,
        transactions: 0,
        revenue: 0,
        completed: 0,
        failed: 0,
        pending: 0
      };
    }
    countyStats[county.id].transactions++;
    countyStats[county.id].revenue += t.amount;
    countyStats[county.id][t.status.toLowerCase()]++;
  });

  // Convert to array and sort by revenue
  return Object.values(countyStats)
    .map(stat => ({
      ...stat,
      completionRate: stat.transactions > 0
        ? ((stat.completed / stat.transactions) * 100).toFixed(2)
        : 0,
      failureRate: stat.transactions > 0
        ? ((stat.failed / stat.transactions) * 100).toFixed(2)
        : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Get fee performance breakdown
 */
async function getFeePerformance(options = {}) {
  const { days = 30, county = null, limit = 20 } = options;
  
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const where = {
    createdAt: { gte: dateFrom },
    ...(county && { fee: { county: { id: county } } })
  };

  const transactions = await prisma.transaction.findMany({
    where,
    include: { fee: { include: { county: true } } }
  });

  // Group by fee
  const feeStats = {};
  transactions.forEach(t => {
    const fee = t.fee;
    const key = fee.id;
    if (!feeStats[key]) {
      feeStats[key] = {
        feeId: fee.id,
        feeName: fee.name,
        county: fee.county.name,
        transactions: 0,
        revenue: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        averageAmount: 0
      };
    }
    feeStats[key].transactions++;
    feeStats[key].revenue += t.amount;
    feeStats[key][t.status.toLowerCase()]++;
  });

  // Calculate averages and sort
  return Object.values(feeStats)
    .map(stat => ({
      ...stat,
      averageAmount: (stat.revenue / stat.transactions).toFixed(2),
      completionRate: stat.transactions > 0
        ? ((stat.completed / stat.transactions) * 100).toFixed(2)
        : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Get payment method breakdown
 */
async function getPaymentMethodBreakdown(options = {}) {
  const { days = 30 } = options;
  
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: dateFrom } }
  });

  const methodStats = {};
  transactions.forEach(t => {
    const method = t.paymentMethod;
    if (!methodStats[method]) {
      methodStats[method] = {
        method,
        count: 0,
        revenue: 0,
        completed: 0,
        failed: 0
      };
    }
    methodStats[method].count++;
    methodStats[method].revenue += t.amount;
    if (t.status === 'COMPLETED') methodStats[method].completed++;
    if (t.status === 'FAILED') methodStats[method].failed++;
  });

  return Object.values(methodStats)
    .map(stat => ({
      ...stat,
      successRate: stat.count > 0 ? ((stat.completed / stat.count) * 100).toFixed(2) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Get time series data (hourly/daily)
 */
async function getTimeSeries(options = {}) {
  const { granularity = 'daily', days = 30 } = options;
  
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: dateFrom } }
  });

  // Group by time period
  const timeSeries = {};
  
  transactions.forEach(t => {
    const date = new Date(t.createdAt);
    let key;
    
    if (granularity === 'hourly') {
      date.setMinutes(0, 0, 0);
      key = date.toISOString();
    } else {
      date.setHours(0, 0, 0, 0);
      key = date.toISOString().split('T')[0];
    }
    
    if (!timeSeries[key]) {
      timeSeries[key] = {
        period: key,
        transactions: 0,
        revenue: 0,
        completed: 0,
        failed: 0
      };
    }
    
    timeSeries[key].transactions++;
    timeSeries[key].revenue += t.amount;
    if (t.status === 'COMPLETED') timeSeries[key].completed++;
    if (t.status === 'FAILED') timeSeries[key].failed++;
  });

  return Object.values(timeSeries)
    .sort((a, b) => new Date(a.period) - new Date(b.period));
}

/**
 * Detect anomalies (unusual payment patterns)
 */
async function detectAnomalies(options = {}) {
  const { days = 30, threshold = 2 } = options; // threshold in standard deviations
  
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const timeSeries = await getTimeSeries({ granularity: 'daily', days });
  
  // Calculate statistics
  const amounts = timeSeries.map(t => t.revenue);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  
  // Detect anomalies
  const anomalies = timeSeries.filter(t => {
    const zScore = Math.abs((t.revenue - mean) / stdDev);
    return zScore > threshold;
  });

  return {
    statistics: {
      mean: mean.toFixed(2),
      stdDev: stdDev.toFixed(2),
      min: Math.min(...amounts),
      max: Math.max(...amounts)
    },
    anomalies: anomalies.map(a => ({
      ...a,
      deviationFromMean: ((a.revenue - mean) / mean * 100).toFixed(2) + '%'
    }))
  };
}

/**
 * Get failure analysis
 */
async function getFailureAnalysis(options = {}) {
  const { days = 30, limit = 10 } = options;
  
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const failedTransactions = await prisma.transaction.findMany({
    where: {
      status: 'FAILED',
      createdAt: { gte: dateFrom }
    },
    include: { fee: { include: { county: true } } }
  });

  // Group by error and payment method
  const errorStats = {};
  const providerStats = {};

  failedTransactions.forEach(t => {
    // By error
    const error = t.lastError || 'Unknown error';
    if (!errorStats[error]) {
      errorStats[error] = { error, count: 0, revenue: 0 };
    }
    errorStats[error].count++;
    errorStats[error].revenue += t.amount;

    // By provider
    const provider = t.paymentProvider;
    if (!providerStats[provider]) {
      providerStats[provider] = { provider, count: 0, revenue: 0, failureRate: 0 };
    }
    providerStats[provider].count++;
    providerStats[provider].revenue += t.amount;
  });

  // Calculate provider failure rates
  const allTransactionsByProvider = await prisma.transaction.findMany({
    where: { createdAt: { gte: dateFrom } }
  });

  Object.keys(providerStats).forEach(provider => {
    const total = allTransactionsByProvider.filter(t => t.paymentProvider === provider).length;
    if (total > 0) {
      providerStats[provider].failureRate = ((providerStats[provider].count / total) * 100).toFixed(2);
    }
  });

  return {
    failedCount: failedTransactions.length,
    failedRevenue: failedTransactions.reduce((sum, t) => sum + t.amount, 0),
    byError: Object.values(errorStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit),
    byProvider: Object.values(providerStats)
      .sort((a, b) => b.count - a.count)
  };
}

/**
 * Get cash flow forecast (simple linear extrapolation)
 */
async function getCashFlowForecast(options = {}) {
  const { days = 30, forecastDays = 7 } = options;
  
  const historical = await getTimeSeries({ granularity: 'daily', days });
  
  if (historical.length < 2) {
    return { error: 'Insufficient data for forecast' };
  }

  // Simple linear regression
  const n = historical.length;
  const revenues = historical.map(h => h.revenue);
  const indices = Array.from({ length: n }, (_, i) => i);
  
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = revenues.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * revenues[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate forecast
  const forecast = [];
  for (let i = n; i < n + forecastDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() - n + i + 1);
    const predictedRevenue = Math.max(0, slope * i + intercept);
    
    forecast.push({
      period: date.toISOString().split('T')[0],
      predictedRevenue: predictedRevenue.toFixed(2),
      confidence: 'medium'
    });
  }

  return {
    trend: slope > 0 ? 'increasing' : 'decreasing',
    slope: slope.toFixed(2),
    forecast
  };
}

module.exports = {
  getDashboardSummary,
  getCountyPerformance,
  getFeePerformance,
  getPaymentMethodBreakdown,
  getTimeSeries,
  detectAnomalies,
  getFailureAnalysis,
  getCashFlowForecast
};
