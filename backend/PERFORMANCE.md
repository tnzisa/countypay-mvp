# Caching & Performance Optimization Guide

## Overview

Production performance optimization using Redis caching, rate limiting, connection pooling, and query optimization.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Incoming Request                         │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
         ┌──────────────┐        ┌──────────────┐
         │ Rate Limiter │        │ Redis Cache  │
         │  (Prevent)   │        │  (Lookup)    │
         └──────┬───────┘        └──────┬───────┘
                │                       │
                │          ┌────────────┤
                │          │            │
         ┌──────▼──────┐   │    ┌─────────────┐
         │  Allowed    │◄──┘    │ Cache Hit   │
         │ Continue    │         │ Return Data │
         └──────┬──────┘         └─────────────┘
                │
         ┌──────▼─────────────┐
         │  Process Request   │
         │  (Query DB)        │
         └──────┬─────────────┘
                │
         ┌──────▼─────────────┐
         │ Cache Response     │
         │ Send to Client     │
         └────────────────────┘
```

## Caching Strategy

### Cache Layers

1. **Redis Cache** - In-memory distributed cache
2. **Database** - Primary data store (PostgreSQL)
3. **Browser Cache** - Client-side caching via Service Worker

### Cache Invalidation

**TTL-Based (Automatic)**
- Session: 1 hour
- Organization: 30 minutes
- Analytics: 1 hour
- Payment Status: 10 minutes
- Fraud Score: 5 minutes

**Event-Based (Manual)**
- Clear session on logout
- Clear organization on update
- Clear analytics on new transaction
- Clear fraud scores on payment completion

### What to Cache

✅ **Good Candidates**
- Organization metadata
- County list
- Fee structure
- User sessions
- Analytics dashboards
- Payment status lookups

❌ **Bad Candidates**
- User profile changes
- Transaction details (immutable)
- Audit logs
- Real-time metrics
- Personal information

## Redis Setup

### Installation

```bash
# Using Docker
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine

# Using Homebrew (macOS)
brew install redis
brew services start redis

# Using apt (Linux)
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### Configuration

Create `.env` for Redis connection:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_password  # Optional
```

### Connection Pooling

```javascript
// In server.js - Prisma connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?schema=public&pool_size=20'
    }
  }
});
```

**Connection Pool Sizes**
- Development: 5 connections
- Staging: 10 connections
- Production: 20 connections

### Redis Monitoring

```bash
# Monitor Redis CLI
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# List all keys (development only)
redis-cli KEYS "*"

# Clear all cache (development only)
redis-cli FLUSHALL
```

## Rate Limiting

### Limiters Applied

| Endpoint | Limit | Window | Target |
|----------|-------|--------|--------|
| Global | 100 req | 15 min | IP |
| User API | 50 req | 1 min | User |
| Payment POST | 10 req | 5 min | User |
| Login | 5 attempt | 15 min | Phone |
| API General | 1000 req | 1 hour | IP |
| Export CSV | 10 download | 24 hour | User |

### Implementation

```javascript
// In server.js
const { paymentLimiter, loginLimiter } = require('./middleware/rateLimiter');

app.post('/api/auth/login', loginLimiter, authController.login);
app.post('/api/payments', paymentLimiter, paymentsController.create);
```

### Headers Returned

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1705339200
```

### Error Response

```json
{
  "code": "PAYMENT_RATE_LIMIT",
  "message": "Too many payment attempts. Please wait before trying again.",
  "retryAfter": 300
}
```

## Cache Service Usage

### Basic Operations

```javascript
const cacheService = require('./services/cacheService');

// Initialize
await cacheService.init();

// Get value
const org = await cacheService.getOrganization('org-123');

// Set value
await cacheService.cacheOrganization('org-123', orgData);

// Invalidate
await cacheService.invalidateOrganization('org-123');

// Disconnect
await cacheService.disconnect();
```

### Session Caching

```javascript
// On login
const sessionData = { userId, organizationId, role, token };
await cacheService.cacheSession(userId, sessionData);

// On logout
await cacheService.clearSession(userId);

// On route access
const session = await cacheService.getSession(userId);
```

### Analytics Caching

```javascript
// Get dashboard (check cache first)
let dashboard = await cacheService.getAnalytics('org-123', 'dashboard', 30);

if (!dashboard) {
  // Cache miss - query DB
  dashboard = await analyticsService.getDashboardSummary('org-123', { days: 30 });
  // Store in cache
  await cacheService.cacheAnalytics('org-123', 'dashboard', 30, dashboard);
}

return dashboard;

// Invalidate on new transaction
await cacheService.invalidateOrgAnalytics('org-123');
```

## Query Optimization

### Database Indexes

Already created:
```sql
CREATE INDEX idx_transaction_org_status ON transaction(organizationId, status);
CREATE INDEX idx_transaction_user_created ON transaction(userId, createdAt);
CREATE INDEX idx_auditlog_org_date ON auditLog(organizationId, createdAt);
CREATE INDEX idx_county_org ON county(organizationId);
CREATE INDEX idx_fee_org_county ON fee(organizationId, countyId);
```

### Query Patterns

✅ **Good Patterns**
```javascript
// Uses index on (organizationId, status)
await prisma.transaction.findMany({
  where: {
    organizationId: 'org-123',
    status: 'COMPLETED'
  }
});

// Uses pagination
const limit = 50;
const skip = (page - 1) * limit;
await prisma.transaction.findMany({ skip, take: limit });
```

❌ **Poor Patterns**
```javascript
// Missing organizationId filter
await prisma.transaction.findMany({
  where: { status: 'COMPLETED' }  // No index!
});

// Full table scan on like query
await prisma.transaction.findMany({
  where: {
    transactionRef: { contains: 'CP' }  // Slow!
  }
});
```

### Pagination Best Practices

```javascript
// Use cursor-based for large datasets
const transactions = await prisma.transaction.findMany({
  where: { organizationId },
  cursor: { id: lastTransactionId },
  skip: 1,      // Skip the cursor itself
  take: 50,
  orderBy: { createdAt: 'desc' }
});
```

## Performance Monitoring

### Metrics to Track

1. **Cache Hit Rate** - % of cache hits vs misses
2. **Query Time** - Average database query duration
3. **Response Time** - API endpoint response time
4. **Memory Usage** - Redis and database memory
5. **Connection Pool** - Active vs available connections

### Express APM

```javascript
const apm = require('elastic-apm-node');

apm.start({
  serviceName: 'countypay-backend',
  serverUrl: process.env.APM_SERVER_URL,
  environment: process.env.NODE_ENV
});

// Automatic instrumentation of:
// - HTTP requests
// - Database queries
// - Redis operations
// - Error tracking
```

### Query Performance Analysis

```bash
# Check PostgreSQL query performance
EXPLAIN ANALYZE
SELECT * FROM transaction
WHERE organizationId = 'org-123' AND status = 'COMPLETED'
ORDER BY createdAt DESC
LIMIT 50;
```

## Load Testing

### Using Apache Bench

```bash
# 1000 requests, 50 concurrent
ab -n 1000 -c 50 \
  -H "Authorization: Bearer $TOKEN" \
  https://api.countypay.com/api/analytics/dashboard

# Results include:
# - Requests per second
# - Mean response time
# - Failed requests
```

### Using wrk

```bash
# 4 threads, 100 connections, 30 seconds
wrk -t4 -c100 -d30s \
  -H "Authorization: Bearer $TOKEN" \
  https://api.countypay.com/api/analytics/dashboard
```

### Using k6

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '30s'
};

export default function () {
  const url = 'https://api.countypay.com/api/analytics/dashboard';
  const params = {
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  };

  const response = http.get(url, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200
  });
}
```

## Production Checklist

- [ ] Redis running in production with persistence enabled
- [ ] Database connection pooling configured (20+ connections)
- [ ] Rate limiting enabled on all public endpoints
- [ ] Cache invalidation strategy tested
- [ ] Indices created on all foreign key columns
- [ ] CDN configured for static assets
- [ ] Database query optimization complete
- [ ] APM monitoring deployed
- [ ] Log aggregation setup (ELK/Splunk)
- [ ] Alerts configured for:
  - [ ] High cache miss rate (>50%)
  - [ ] Slow queries (>1s)
  - [ ] High database connection usage
  - [ ] Redis memory usage >80%
  - [ ] Rate limit violations spike

## Performance Targets

| Metric | Target | Warning |
|--------|--------|---------|
| API Response Time | <200ms | >500ms |
| Database Query | <50ms | >200ms |
| Cache Hit Rate | >70% | <50% |
| Memory Usage | <60% | >80% |
| CPU Usage | <40% | >70% |

## Troubleshooting

### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli PING

# If not, start it
redis-server

# Check connection in app
curl http://localhost:6379/PING
```

### High Cache Miss Rate
- Check TTL settings
- Verify cache invalidation logic
- Monitor for memory pressure

### Slow Queries
- Check execution plan: `EXPLAIN ANALYZE`
- Add missing indexes
- Reduce result set size with pagination

### Connection Pool Exhausted
- Increase pool size in Prisma
- Check for connection leaks
- Monitor idle connections

## Optimization Roadmap

### Phase 1 (Current)
- ✅ Redis cache for sessions
- ✅ Rate limiting
- ✅ Connection pooling
- ✅ Database indexes

### Phase 2 (Next)
- [ ] CDN for static assets
- [ ] Query result caching
- [ ] Compression (gzip)
- [ ] GraphQL caching

### Phase 3 (Future)
- [ ] Distributed caching
- [ ] Read replicas
- [ ] Database sharding
- [ ] Message queue (RabbitMQ/Kafka)

## Resources

- [Redis Documentation](https://redis.io/documentation)
- [Prisma Connection Pooling](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)
- [Express Rate Limiting](https://github.com/nfriedly/express-rate-limit)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance.html)
- [Load Testing with k6](https://k6.io/docs)
