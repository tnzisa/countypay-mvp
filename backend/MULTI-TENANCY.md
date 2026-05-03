# Multi-Tenancy Implementation Guide

## Overview

CountyPay now supports multi-tenancy, enabling multiple independent organizations (counties, government entities, or payment processors) to operate on a single platform with complete data isolation.

## Architecture

### Tenant Resolution

The middleware automatically resolves tenants from (in priority order):

1. **JWT Token** - `organizationId` claim in JWT payload
2. **X-Organization-Id Header** - Manual header specification
3. **URL Parameter** - `/api/:organizationSlug/...` pattern
4. **Subdomain** - `nairobi.countypay.com`

### Data Isolation Patterns

All queries automatically include `organizationId` in WHERE clauses:

```javascript
// User's transactions (isolated by organization)
const transactions = await prisma.transaction.findMany({
  where: {
    userId: req.user.id,
    organizationId: req.organizationId  // Enforced by middleware
  }
});

// County admin can only see their organization's counties
const counties = await prisma.county.findMany({
  where: { organizationId: req.organizationId }
});
```

## API Endpoints

### Organization Management

```bash
# Create organization (superadmin only)
POST /api/organizations
{
  "name": "Nairobi County",
  "slug": "nairobi",
  "description": "Nairobi County Payment System",
  "tier": "PROFESSIONAL"  // STARTER, PROFESSIONAL, ENTERPRISE
}

# Get organization details
GET /api/organizations/nairobi

# Get organization usage limits
GET /api/organizations/nairobi/limits

# Update organization
PATCH /api/organizations/nairobi
{
  "name": "Nairobi County Updated",
  "status": "ACTIVE"  // superadmin only
}

# List all organizations (superadmin only)
GET /api/organizations?status=ACTIVE&limit=50

# Delete organization (no transactions allowed)
DELETE /api/organizations/nairobi
```

### Tenant-Scoped Endpoints

All existing endpoints now support multi-tenancy:

```bash
# Payment endpoints (tenant-isolated)
POST /api/payments
  Header: X-Organization-Id: nairobi
  Body: { feeId, phoneNumber, paymentMethod, idempotencyKey }

# Audit endpoints (tenant-isolated)
GET /api/audit/transactions/:transactionId
  Header: X-Organization-Id: nairobi

# Analytics endpoints (tenant-isolated)
GET /api/analytics/dashboard?days=30
  Header: X-Organization-Id: nairobi
```

## Role-Based Access Control

### Superadmin
- Can create/delete organizations
- Can view all tenants' organizations
- Cannot access tenant data (payment_admin only access)

### County Admin (payment_admin)
- Full access to their organization's data
- Can manage users within organization
- Can view analytics and audit logs
- Cannot access other organizations

### Citizen
- Can view/pay fees in their assigned county
- Cannot view other counties
- Cannot access organization settings

## Migration Checklist

### Phase 1: Prepare
- [ ] Backup existing database
- [ ] Test schema migration in development
- [ ] Review existing data for organization assignment

### Phase 2: Execute
- [ ] Run Prisma migration: `npx prisma migrate dev --name add_multi_tenancy`
- [ ] Create seed organization for existing data
- [ ] Update existing users with organizationId
- [ ] Update existing counties with organizationId

### Phase 3: Deploy
- [ ] Deploy updated backend code
- [ ] Test tenant isolation in staging
- [ ] Monitor audit logs for organization context
- [ ] Rollback plan ready if needed

### Phase 4: Verify
- [ ] Two organizations can coexist
- [ ] Users cannot access other org data
- [ ] Analytics per-organization only
- [ ] Audit logs show organization context

## Integration Examples

### Register User in Organization
```javascript
POST /api/auth/register
{
  "phone": "254712345678",
  "name": "John Doe",
  "password": "secure_password",
  "organizationId": "nairobi-org-id"  // NEW: required
}
```

### Login and Get JWT
```javascript
POST /api/auth/login
{
  "phone": "254712345678",
  "password": "secure_password"
}

// Response includes organizationId in JWT
{
  "token": "eyJhbGc...",  // Contains organizationId claim
  "user": {
    "id": "...",
    "organizationId": "nairobi-org-id",
    "role": "county_admin"
  }
}
```

### Make Tenant-Scoped API Call
```javascript
// Option 1: JWT includes organizationId (preferred)
fetch('/api/payments/my-transactions', {
  headers: {
    'Authorization': `Bearer ${token}`  // JWT has organizationId
  }
});

// Option 2: Explicit header
fetch('/api/payments/my-transactions', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Organization-Id': 'nairobi'
  }
});

// Option 3: Subdomain
fetch('https://nairobi.countypay.com/api/payments/my-transactions', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Database Schema Highlights

### Organization Model
```prisma
model Organization {
  id            String   @id @default(uuid())
  name          String   @unique
  slug          String   @unique  // For URL routing
  tier          String   @default("STARTER")
  status        String   @default("ACTIVE")
  maxUsers      Int      @default(10)
  maxCounties   Int      @default(5)
  
  // Relations
  users         User[]
  counties      County[]
  fees          Fee[]
  transactions  Transaction[]
  auditLogs     AuditLog[]
}
```

### Unique Constraints
```prisma
// Before: Global uniqueness
User: phone UNIQUE
County: code UNIQUE
Fee: (countyId, name) UNIQUE

// After: Organization-scoped
User: (organizationId, phone) UNIQUE
County: (organizationId, code) UNIQUE
Fee: (organizationId, countyId, name) UNIQUE
```

## Performance Considerations

### Indexes
All foreign keys have indexes:
- `organizationId` index on every model
- Composite indexes: `(organizationId, userId)`, `(organizationId, status)`, etc.

### Query Optimization
```javascript
// Good: Uses index
await prisma.transaction.findMany({
  where: {
    organizationId: 'org-id',
    userId: 'user-id'
  }
});

// Suboptimal: Missing organizationId (won't enforce isolation)
await prisma.transaction.findMany({
  where: { userId: 'user-id' }
});
```

### Connection Pooling
- Configure Prisma connectionLimit per organization tier
- Starter: 5 connections
- Professional: 15 connections
- Enterprise: 50 connections

## Audit Trail Examples

### Transactions created with organization context:
```json
{
  "id": "audit-123",
  "resourceType": "TRANSACTION",
  "resourceId": "tx-456",
  "action": "PAYMENT_CREATED",
  "organizationId": "nairobi-id",  // Enforced
  "actorId": "user-789",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Access audited per organization:
```bash
GET /api/audit/logs?organizationId=nairobi
Returns only logs from Nairobi organization
```

## Common Issues & Solutions

### Issue: User Can Access Other Org Data
**Solution**: Verify tenant middleware is applied to all routes:
```javascript
router.use(authMiddleware, tenantMiddleware());
```

### Issue: Audit Logs Missing organizationId
**Solution**: Ensure all auditService.logAudit() calls include organizationId:
```javascript
await auditService.logAudit({
  resourceType: 'TRANSACTION',
  organizationId: req.organizationId,  // Must include
  ...
});
```

### Issue: Cross-Organization Payment Possible
**Solution**: Payment service validates organization membership:
```javascript
if (fee.organizationId !== organizationId) {
  throw new Error('Fee does not belong to this organization');
}
```

## Testing Multi-Tenancy

### Unit Test Example
```javascript
describe('Multi-Tenancy Isolation', () => {
  it('Should prevent cross-organization access', async () => {
    const org1Id = 'org-1';
    const org2Id = 'org-2';
    
    // Create transaction in org1
    const tx = await createPayment(org1Id, { ... });
    
    // Try to access from org2 context
    const result = await getPaymentStatus(tx.id, org2Id);
    
    // Should fail
    expect(result).toBeNull();
  });
});
```

### Integration Test Example
```javascript
describe('Organization Endpoints', () => {
  it('Should create and retrieve organization', async () => {
    const org = await createOrganization({
      name: 'Test County',
      slug: 'test'
    });
    
    const retrieved = await getOrganization('test');
    expect(retrieved.id).toBe(org.id);
  });
});
```

## Scaling Strategy

### Single Organization (Current)
- 1 organization per database
- All users in one org context

### Multiple Organizations (Recommended)
- Multiple organizations in shared database
- Complete data isolation via organizationId
- Separate audit trails per organization

### Multi-Tenant SaaS (Future)
- Separate database per enterprise customer
- Shared application code
- Cross-tenant reporting (superadmin only)

## Compliance & Security

### Data Isolation
- ✅ organizationId enforced in middleware
- ✅ All queries filtered by organization
- ✅ Unique constraints scoped to organization
- ✅ Audit logs include organization context

### Audit Trail
- ✅ Every action logged with organizationId
- ✅ User access tracked per organization
- ✅ Compliance reports per organization
- ✅ CSV export includes organization filtering

### Rate Limiting
- Per-organization limits (future)
- Per-user limits within organization
- API quota enforcement

## Migration Timeline

**Week 1**: 
- Deploy schema changes to dev
- Run Prisma migrations
- Test isolation with seed data

**Week 2**:
- Deploy to staging
- Run integration tests
- Load test with multiple orgs

**Week 3**:
- Deploy to production
- Monitor audit logs
- Gradual user onboarding

## Rollback Procedure

If multi-tenancy needs to be disabled:

1. Create database backup
2. Create migration removing organizationId fields
3. Migrate existing data to single organization
4. Deploy previous code version
5. Verify data integrity

```bash
# Backup database
pg_dump -h localhost -U user -d countypay > backup.sql

# Create rollback migration
npx prisma migrate dev --name remove_multi_tenancy

# Restore if needed
psql -h localhost -U user -d countypay < backup.sql
```

## Monitoring & Alerts

### Key Metrics
- Transactions per organization
- Average response time per organization
- Failed transactions by organization
- Audit log volume per organization

### Alerts to Set
- Organization approaching user limit
- Organization approaching county limit
- Failed transactions spike per organization
- Audit log anomalies per organization

## Support & Documentation

For questions or issues with multi-tenancy:
1. Check MIGRATION-MULTITENANCY.md
2. Review audit logs for organization context
3. Verify tenant resolution middleware is applied
4. Check database connection limits
