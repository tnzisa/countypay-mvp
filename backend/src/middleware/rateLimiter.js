/**
 * Rate Limiting Middleware - Prevent abuse and DDoS
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

/**
 * Global rate limiter - per IP
 * 100 requests per 15 minutes
 */
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:global:'
  }),
  windowMs: 15 * 60 * 1000,     // 15 minutes
  max: 100,                       // 100 requests
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * User rate limiter - per authenticated user
 * 50 requests per 1 minute
 */
const userLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:user:',
    key: (req) => req.user?.id || req.ip
  }),
  windowMs: 1 * 60 * 1000,        // 1 minute
  max: 50,                         // 50 requests
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please slow down.'
  },
  skip: (req) => !req.user,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Payment endpoint limiter - per user
 * 10 payment requests per 5 minutes
 */
const paymentLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:payment:',
    key: (req) => req.user?.id
  }),
  windowMs: 5 * 60 * 1000,        // 5 minutes
  max: 10,                         // 10 payments
  message: {
    code: 'PAYMENT_RATE_LIMIT',
    message: 'Too many payment attempts. Please wait before trying again.'
  },
  skip: (req) => !req.user || req.user.role === 'admin',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Login endpoint limiter - per IP
 * 5 login attempts per 15 minutes
 */
const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:login:',
    key: (req) => req.body?.phone || req.ip
  }),
  windowMs: 15 * 60 * 1000,       // 15 minutes
  max: 5,                          // 5 attempts
  message: {
    code: 'LOGIN_RATE_LIMIT',
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  skipSuccessfulRequests: true,   // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * API endpoint limiter - per IP/endpoint
 * 1000 requests per hour
 */
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:',
    key: (req) => `${req.ip}:${req.path}`
  }),
  windowMs: 60 * 60 * 1000,       // 1 hour
  max: 1000,                       // 1000 requests
  message: {
    code: 'API_RATE_LIMIT',
    message: 'API rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Export/Download limiter - per user
 * 10 exports per day
 */
const exportLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:export:',
    key: (req) => req.user?.id
  }),
  windowMs: 24 * 60 * 60 * 1000,  // 24 hours
  max: 10,                         // 10 exports
  message: {
    code: 'EXPORT_RATE_LIMIT',
    message: 'Download limit exceeded. Please try again tomorrow.'
  },
  skip: (req) => !req.user || req.user.role !== 'admin',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  globalLimiter,
  userLimiter,
  paymentLimiter,
  loginLimiter,
  apiLimiter,
  exportLimiter
};
