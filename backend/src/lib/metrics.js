/**
 * Prometheus Metrics Setup
 * Exports metrics for:
 * - HTTP request duration and count
 * - Payment processing metrics
 * - Database query metrics
 * - Redis operations
 * - Error rates
 */

const prometheus = require('prom-client');

// Create a registry for metrics
const register = new prometheus.Registry();

// Default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// HTTP REQUEST METRICS
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const httpRequestCount = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// PAYMENT METRICS
const paymentProcessingDuration = new prometheus.Histogram({
  name: 'payment_processing_duration_seconds',
  help: 'Duration of payment processing in seconds',
  labelNames: ['provider', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const paymentCount = new prometheus.Counter({
  name: 'payments_total',
  help: 'Total number of payments processed',
  labelNames: ['provider', 'status'],
  registers: [register]
});

const paymentAmount = new prometheus.Counter({
  name: 'payment_amount_total',
  help: 'Total payment amount processed',
  labelNames: ['provider', 'status'],
  registers: [register]
});

// DATABASE METRICS
const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register]
});

const dbQueryCount = new prometheus.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model', 'status'],
  registers: [register]
});

// FRAUD DETECTION METRICS
const fraudCheckCount = new prometheus.Counter({
  name: 'fraud_checks_total',
  help: 'Total fraud detection checks performed',
  labelNames: ['result'],
  registers: [register]
});

const fraudBlockedAmount = new prometheus.Counter({
  name: 'fraud_blocked_amount_total',
  help: 'Total amount blocked by fraud detection',
  registers: [register]
});

// ERROR METRICS
const errorCount = new prometheus.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'route'],
  registers: [register]
});

// CACHE METRICS
const cacheHitCount = new prometheus.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['key_type'],
  registers: [register]
});

const cacheMissCount = new prometheus.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['key_type'],
  registers: [register]
});

// CONCURRENT REQUESTS GAUGE
const activeRequests = new prometheus.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  labelNames: ['method', 'route'],
  registers: [register]
});

module.exports = {
  register,
  httpRequestDuration,
  httpRequestCount,
  paymentProcessingDuration,
  paymentCount,
  paymentAmount,
  dbQueryDuration,
  dbQueryCount,
  fraudCheckCount,
  fraudBlockedAmount,
  errorCount,
  cacheHitCount,
  cacheMissCount,
  activeRequests
};
