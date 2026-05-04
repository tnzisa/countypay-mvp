/**
 * Event Bus Service
 * Centralized pub/sub system for cache invalidation and event handling
 * Prevents orphaned caches and ensures data consistency
 */

class EventBus {
  constructor() {
    this.subscribers = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, handler) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }

    const handlers = this.subscribers.get(event);
    handlers.push(handler);

    console.log(`📡 Event listener registered: ${event} (${handlers.length} total)`);

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        console.log(`🗑️  Event listener removed: ${event} (${handlers.length} remaining)`);
      }
    };
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {Promise} Resolves when all handlers complete
   */
  async emit(event, data) {
    if (!this.subscribers.has(event)) {
      return Promise.resolve();
    }

    const handlers = this.subscribers.get(event);
    
    console.log(`📢 Event emitted: ${event} (${handlers.length} handlers)`);

    try {
      await Promise.all(handlers.map(handler => handler(data)));
      console.log(`✅ Event processed: ${event}`);
    } catch (error) {
      console.error(`❌ Event processing error (${event}):`, error.message);
      throw error;
    }
  }

  /**
   * Emit event and queue cache invalidation
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @param {Array<string>} cachePatterns - Cache patterns to invalidate
   */
  async emitWithCacheInvalidation(event, data, cachePatterns = []) {
    const { queueCacheInvalidation } = require('./jobQueueService');

    // Emit the event
    await this.emit(event, data);

    // Queue cache invalidations
    for (const pattern of cachePatterns) {
      await queueCacheInvalidation(pattern);
    }
  }

  /**
   * Get subscriber count for event
   * @param {string} event - Event name
   * @returns {number} Subscriber count
   */
  getSubscriberCount(event) {
    return this.subscribers.has(event) ? this.subscribers.get(event).length : 0;
  }

  /**
   * Clear all subscribers for event
   * @param {string} event - Event name
   */
  clearEvent(event) {
    this.subscribers.delete(event);
    console.log(`🧹 Event subscribers cleared: ${event}`);
  }

  /**
   * Clear all subscribers
   */
  clearAll() {
    this.subscribers.clear();
    console.log('🧹 All event subscribers cleared');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const eventBus = new EventBus();

// ============================================================================
// EVENT TYPES (Constants)
// ============================================================================

const EVENTS = {
  // Payment events
  PAYMENT_CREATED: 'payment:created',
  PAYMENT_INITIATED: 'payment:initiated',
  PAYMENT_PROCESSING: 'payment:processing',
  PAYMENT_COMPLETED: 'payment:completed',
  PAYMENT_FAILED: 'payment:failed',
  PAYMENT_REFUNDED: 'payment:refunded',

  // Organization events
  ORG_CREATED: 'org:created',
  ORG_UPDATED: 'org:updated',
  ORG_DELETED: 'org:deleted',
  ORG_SETTINGS_CHANGED: 'org:settings_changed',

  // User events
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_ROLE_CHANGED: 'user:role_changed',

  // County events
  COUNTY_CREATED: 'county:created',
  COUNTY_UPDATED: 'county:updated',
  COUNTY_DELETED: 'county:deleted',

  // Audit events
  AUDIT_LOG_CREATED: 'audit:log_created',

  // Fraud detection
  FRAUD_DETECTED: 'fraud:detected',
  FRAUD_RESOLVED: 'fraud:resolved',

  // Cache events
  CACHE_INVALIDATION: 'cache:invalidation'
};

// ============================================================================
// CACHE PATTERNS (for invalidation)
// ============================================================================

const CACHE_PATTERNS = {
  // Organization cache
  ORG_LIST: 'orgs:*',
  ORG_DETAIL: 'org:%s', // org:123
  ORG_CONFIG: 'org:config:%s',
  ORG_USERS: 'org:users:%s',
  ORG_FEES: 'org:fees:%s',

  // Payment cache
  PAYMENT_LIST: 'payments:*',
  PAYMENT_DETAIL: 'payment:%s', // payment:123
  PAYMENT_STATUS: 'payment:status:%s',
  PAYMENT_STATS: 'payment:stats:%s',

  // User cache
  USER_DETAIL: 'user:%s', // user:123
  USER_PERMISSIONS: 'user:perms:%s',

  // County cache
  COUNTY_LIST: 'counties:*',
  COUNTY_DETAIL: 'county:%s', // county:123

  // Analytics cache
  ANALYTICS_DASHBOARD: 'analytics:dashboard:%s',
  ANALYTICS_REPORT: 'analytics:report:%s'
};

// ============================================================================
// DEFAULT EVENT HANDLERS
// ============================================================================

/**
 * Register default cache invalidation handlers
 */
function registerDefaultHandlers() {
  // When organization is updated, invalidate org caches
  eventBus.subscribe(EVENTS.ORG_UPDATED, async (data) => {
    const { orgId } = data;
    console.log(`🔄 Invalidating org ${orgId} cache...`);
    // Cache invalidation will be queued by the emitter
  });

  // When payment is completed, invalidate payment and analytics caches
  eventBus.subscribe(EVENTS.PAYMENT_COMPLETED, async (data) => {
    const { orgId } = data;
    console.log(`🔄 Invalidating analytics cache for org ${orgId}...`);
    // Cache invalidation will be queued by the emitter
  });

  // When user role changes, invalidate user permission caches
  eventBus.subscribe(EVENTS.USER_ROLE_CHANGED, async (data) => {
    const { userId } = data;
    console.log(`🔄 Invalidating permissions for user ${userId}...`);
    // Cache invalidation will be queued by the emitter
  });

  console.log('✅ Default event handlers registered');
}

// ============================================================================
// HELPER FUNCTIONS FOR COMMON PATTERNS
// ============================================================================

/**
 * Emit payment created event
 */
async function emitPaymentCreated(transaction) {
  await eventBus.emitWithCacheInvalidation(
    EVENTS.PAYMENT_CREATED,
    { transactionId: transaction.id, orgId: transaction.organizationId },
    [
      CACHE_PATTERNS.PAYMENT_LIST,
      CACHE_PATTERNS.PAYMENT_STATS.replace('%s', transaction.organizationId),
      CACHE_PATTERNS.ANALYTICS_DASHBOARD.replace('%s', transaction.organizationId)
    ]
  );
}

/**
 * Emit payment completed event
 */
async function emitPaymentCompleted(transaction) {
  await eventBus.emitWithCacheInvalidation(
    EVENTS.PAYMENT_COMPLETED,
    { transactionId: transaction.id, orgId: transaction.organizationId, amount: transaction.amount },
    [
      CACHE_PATTERNS.PAYMENT_LIST,
      CACHE_PATTERNS.PAYMENT_DETAIL.replace('%s', transaction.id),
      CACHE_PATTERNS.PAYMENT_STATS.replace('%s', transaction.organizationId),
      CACHE_PATTERNS.ANALYTICS_DASHBOARD.replace('%s', transaction.organizationId)
    ]
  );
}

/**
 * Emit payment failed event
 */
async function emitPaymentFailed(transaction, error) {
  await eventBus.emitWithCacheInvalidation(
    EVENTS.PAYMENT_FAILED,
    { transactionId: transaction.id, orgId: transaction.organizationId, error: error.message },
    [
      CACHE_PATTERNS.PAYMENT_DETAIL.replace('%s', transaction.id),
      CACHE_PATTERNS.PAYMENT_STATS.replace('%s', transaction.organizationId)
    ]
  );
}

/**
 * Emit organization updated event
 */
async function emitOrgUpdated(organization) {
  await eventBus.emitWithCacheInvalidation(
    EVENTS.ORG_UPDATED,
    { orgId: organization.id },
    [
      CACHE_PATTERNS.ORG_LIST,
      CACHE_PATTERNS.ORG_DETAIL.replace('%s', organization.id),
      CACHE_PATTERNS.ORG_CONFIG.replace('%s', organization.id),
      CACHE_PATTERNS.ORG_USERS.replace('%s', organization.id)
    ]
  );
}

/**
 * Emit user role changed event
 */
async function emitUserRoleChanged(user) {
  await eventBus.emitWithCacheInvalidation(
    EVENTS.USER_ROLE_CHANGED,
    { userId: user.id, orgId: user.organizationId, role: user.role },
    [
      CACHE_PATTERNS.USER_DETAIL.replace('%s', user.id),
      CACHE_PATTERNS.USER_PERMISSIONS.replace('%s', user.id),
      CACHE_PATTERNS.ORG_USERS.replace('%s', user.organizationId)
    ]
  );
}

/**
 * Emit fraud detected event
 */
async function emitFraudDetected(transaction, fraudData) {
  await eventBus.emitWithCacheInvalidation(
    EVENTS.FRAUD_DETECTED,
    {
      transactionId: transaction.id,
      orgId: transaction.organizationId,
      fraudScore: fraudData.score,
      reason: fraudData.reason
    },
    [
      CACHE_PATTERNS.PAYMENT_DETAIL.replace('%s', transaction.id),
      CACHE_PATTERNS.ANALYTICS_DASHBOARD.replace('%s', transaction.organizationId)
    ]
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main instance
  eventBus,

  // Event types
  EVENTS,
  CACHE_PATTERNS,

  // Setup
  registerDefaultHandlers,

  // Core API
  subscribe: eventBus.subscribe.bind(eventBus),
  emit: eventBus.emit.bind(eventBus),
  emitWithCacheInvalidation: eventBus.emitWithCacheInvalidation.bind(eventBus),

  // Helper functions
  emitPaymentCreated,
  emitPaymentCompleted,
  emitPaymentFailed,
  emitOrgUpdated,
  emitUserRoleChanged,
  emitFraudDetected
};
