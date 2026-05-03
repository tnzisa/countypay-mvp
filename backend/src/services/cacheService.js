/**
 * Redis Cache Service - Session and query result caching
 */

const redis = require('redis');

const CACHE_KEYS = {
  SESSION: 'session:',           // session:{userId}
  ORGANIZATION: 'org:',          // org:{orgId}
  COUNTY_PERFORMANCE: 'county-perf:',  // county-perf:{orgId}:{days}
  PAYMENT_STATUS: 'payment:',    // payment:{txId}
  ANALYTICS: 'analytics:',       // analytics:{orgId}:{metric}:{days}
  FRAUD_SCORE: 'fraud:',         // fraud:{userId}:{timestamp}
  AUDIT_STATS: 'audit-stats:'    // audit-stats:{orgId}
};

const CACHE_TTL = {
  SESSION: 3600,                 // 1 hour
  ORGANIZATION: 1800,            // 30 minutes
  COUNTY_PERFORMANCE: 3600,      // 1 hour
  PAYMENT_STATUS: 600,           // 10 minutes
  ANALYTICS: 3600,               // 1 hour
  FRAUD_SCORE: 300,              // 5 minutes
  AUDIT_STATS: 900               // 15 minutes
};

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis connection
   */
  async init() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        db: process.env.REDIS_DB || 0,
        password: process.env.REDIS_PASSWORD || undefined,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      });

      this.client.on('error', (err) => console.error('Redis error:', err));
      this.client.on('connect', () => console.log('✅ Redis connected'));

      await this.client.connect();
      this.isConnected = true;
      console.log('Redis cache service initialized');
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = 3600) {
    if (!this.isConnected) return false;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cache key
   */
  async del(key) {
    if (!this.isConnected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern) {
    if (!this.isConnected) return 0;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache clear pattern error:', error);
      return 0;
    }
  }

  /**
   * Cache session data (user login)
   */
  async cacheSession(userId, sessionData) {
    const key = `${CACHE_KEYS.SESSION}${userId}`;
    return this.set(key, sessionData, CACHE_TTL.SESSION);
  }

  /**
   * Get cached session
   */
  async getSession(userId) {
    const key = `${CACHE_KEYS.SESSION}${userId}`;
    return this.get(key);
  }

  /**
   * Clear user session
   */
  async clearSession(userId) {
    const key = `${CACHE_KEYS.SESSION}${userId}`;
    return this.del(key);
  }

  /**
   * Cache organization data
   */
  async cacheOrganization(orgId, orgData) {
    const key = `${CACHE_KEYS.ORGANIZATION}${orgId}`;
    return this.set(key, orgData, CACHE_TTL.ORGANIZATION);
  }

  /**
   * Get cached organization
   */
  async getOrganization(orgId) {
    const key = `${CACHE_KEYS.ORGANIZATION}${orgId}`;
    return this.get(key);
  }

  /**
   * Invalidate organization cache
   */
  async invalidateOrganization(orgId) {
    const pattern = `${CACHE_KEYS.ORGANIZATION}${orgId}*`;
    return this.clearPattern(pattern);
  }

  /**
   * Cache analytics dashboard
   */
  async cacheAnalytics(orgId, metric, days, data) {
    const key = `${CACHE_KEYS.ANALYTICS}${orgId}:${metric}:${days}`;
    return this.set(key, data, CACHE_TTL.ANALYTICS);
  }

  /**
   * Get cached analytics
   */
  async getAnalytics(orgId, metric, days) {
    const key = `${CACHE_KEYS.ANALYTICS}${orgId}:${metric}:${days}`;
    return this.get(key);
  }

  /**
   * Invalidate all analytics for organization
   */
  async invalidateOrgAnalytics(orgId) {
    const pattern = `${CACHE_KEYS.ANALYTICS}${orgId}:*`;
    return this.clearPattern(pattern);
  }

  /**
   * Invalidate specific metric analytics
   */
  async invalidateAnalytics(orgId, metric) {
    const pattern = `${CACHE_KEYS.ANALYTICS}${orgId}:${metric}:*`;
    return this.clearPattern(pattern);
  }

  /**
   * Cache fraud score
   */
  async cacheFraudScore(userId, timestamp, score) {
    const key = `${CACHE_KEYS.FRAUD_SCORE}${userId}:${timestamp}`;
    return this.set(key, score, CACHE_TTL.FRAUD_SCORE);
  }

  /**
   * Get fraud scores for user
   */
  async getFraudScores(userId, timeWindow = 3600) {
    const pattern = `${CACHE_KEYS.FRAUD_SCORE}${userId}:*`;
    const keys = await this.client.keys(pattern);
    const scores = [];

    for (const key of keys) {
      const score = await this.get(key);
      if (score) {
        scores.push(score);
      }
    }

    return scores;
  }

  /**
   * Cleanup (for graceful shutdown)
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('Redis disconnected');
    }
  }

  /**
   * Health check
   */
  async health() {
    if (!this.isConnected) return false;

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

module.exports = new CacheService();
