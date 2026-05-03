# Multi-Tenancy Migration Guide

## Overview
This migration adds multi-tenancy support to CountyPay, allowing multiple independent organizations to operate on a single platform while maintaining complete data isolation.

## Key Changes

### 1. New Organization Model
- Stores tenant-level configuration (name, slug, tier, limits)
- Tiers: STARTER (10 users, 5 counties), PROFESSIONAL (50 users, 20 counties), ENTERPRISE (500 users, 100 counties)
- Status: ACTIVE, SUSPENDED, ARCHIVED

### 2. Updated Models with organizationId Foreign Key

#### User Model
- Added `organizationId` foreign key (required)
- Changed unique constraint from global `phone` to composite `(organizationId, phone)`
- Changed unique constraint from global `email` to composite `(organizationId, email)`
- Added optional `countyId` for county admin assignment
- Added `status` field (ACTIVE, SUSPENDED)
- Added `role` options: citizen, county_admin, superadmin

#### County Model
- Added `organizationId` foreign key (required)
- Changed unique constraint from global `code` to composite `(organizationId, code)`
- Renamed `fees` relation to `adminUsers` (for county admins)
- Added optional bank/contact fields

#### Fee Model
- Added `organizationId` foreign key (required)
- Changed unique constraint to composite `(organizationId, countyId, name)`

#### Transaction Model
- Added `organizationId` foreign key (required)
- Added indexes for efficient tenant-scoped queries

#### AuditLog Model
- Added `organizationId` foreign key (required)
- Maintains immutability with new org-scoped queries

## Migration Steps

### Step 1: Update Prisma Schema
```bash
# Schema already updated with Organization model
# and organizationId fields on all tenant-scoped models
```

### Step 2: Create Migration
```bash
cd backend
npx prisma migrate dev --name add_multi_tenancy
```

### Step 3: Seed Initial Organization (if needed)
```bash
npx prisma db seed
```

## Data Isolation Guarantees

All queries now include tenant filtering via `organizationId`:

```javascript
// Before (global query)
const transactions = await prisma.transaction.findMany({
  where: { userId: 'user-123' }
});

// After (tenant-isolated)
const transactions = await prisma.transaction.findMany({
  where: { 
    userId: 'user-123',
    organizationId: 'org-456'  // Added by middleware
  }
});
```

## Tenant Resolution

Middleware resolves tenant from (in priority order):
1. JWT `organizationId` claim
2. `X-Organization-Id` header
3. URL parameter (e.g., `/api/org/nairobi/payments`)
4. Subdomain (e.g., `nairobi.countypay.com`)

## API Changes

### New Organization Endpoints
- `POST /api/organizations` - Create organization (superadmin)
- `GET /api/organizations` - List organizations (superadmin)
- `GET /api/organizations/:slug` - Get organization details
- `GET /api/organizations/:slug/limits` - Get usage limits
- `PATCH /api/organizations/:slug` - Update organization
- `DELETE /api/organizations/:slug` - Delete organization (no transactions)

### Updated Auth Flow
1. User registers with organizationId
2. User receives JWT with `organizationId` claim
3. All requests automatically filtered to user's organization

### Backward Compatibility
- Applications not using multi-tenancy can operate with single organization
- Existing endpoints work unchanged (tenant resolved from JWT)

## Role-Based Access

### Superadmin
- Manages organizations
- Can view all tenants' data
- Can adjust organization settings

### County Admin
- Manages users and counties within their organization
- Can view organization's analytics and audit logs
- Cannot access other organizations' data

### Citizen
- Can view/pay fees in assigned county
- Cannot view other counties' data
- Cannot access organization settings

## Query Patterns

### List User's Transactions (Auto-Filtered)
```javascript
const transactions = await prisma.transaction.findMany({
  where: {
    userId: req.user.id,
    organizationId: req.organizationId  // Added by middleware
  }
});
```

### List Organization's Counties
```javascript
const counties = await prisma.county.findMany({
  where: { organizationId: req.organizationId }
});
```

### Audit Trail with Tenant Filter
```javascript
const trail = await prisma.auditLog.findMany({
  where: {
    transactionId: txId,
    organizationId: req.organizationId
  }
});
```

## Performance Considerations

1. **Indexes**: All foreign key fields have indexes for efficient filtering
2. **Composite Unique Constraints**: Prevent duplicates within tenant
3. **Query Optimization**: Always include organizationId in WHERE clauses
4. **Connection Pool**: Recommend 20-50 connections per organization

## Testing Multi-Tenancy

### Create Two Organizations
```bash
POST /api/organizations
{ "name": "Nairobi County", "slug": "nairobi" }

POST /api/organizations
{ "name": "Mombasa County", "slug": "mombasa" }
```

### Create Users in Each Organization
```bash
POST /api/auth/register
{
  "phone": "254712345678",
  "name": "John Nairobi",
  "organizationId": "nairobi-org-id"
}

POST /api/auth/register
{
  "phone": "254712345679",
  "name": "Jane Mombasa",
  "organizationId": "mombasa-org-id"
}
```

### Verify Isolation
```bash
# Login as John (Nairobi)
GET /api/payments/my-transactions
# Returns only Nairobi transactions

# Login as Jane (Mombasa)
GET /api/payments/my-transactions
# Returns only Mombasa transactions

# Try to access Jane's transaction as John
GET /api/payments/:jane-transaction-id
# Returns 404 (not found in John's organization)
```

## Troubleshooting

### Migration Fails
- Ensure database has write permissions
- Check if organizationId fields are nullable during migration
- Run `npx prisma migrate resolve` if stuck

### Access Denied Errors
- Verify user's organizationId matches request organizationId
- Check JWT payload includes organizationId
- Ensure X-Organization-Id header is set if not using JWT

### Unique Constraint Violations
- Remember: `phone` and `code` are now scoped to organization
- Different organizations can have same phone/code
- Existing data needs organization assignment before migration

## Rollback Plan

If multi-tenancy needs to be disabled:

1. Backup database
2. Create new schema without organizationId fields
3. Create migration with DROP FOREIGN KEY cascade
4. Migrate data to new schema
5. Revert code to single-tenant version

## Future Enhancements

1. **Organization Hierarchy**: Support parent-child organizations
2. **Cross-Tenant Reporting**: Aggregated reports for superadmin
3. **Per-Tenant Feature Flags**: Enable/disable features per org
4. **Tenant Resource Quotas**: Enforced API rate limits per tenant
