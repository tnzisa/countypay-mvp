# Testing & CI/CD Guide

## Overview

CountyPay includes comprehensive testing infrastructure and automated CI/CD pipeline for production-ready deployments.

## Testing Strategy

### Test Pyramid

```
        E2E Tests
       (Cypress)
    10% of coverage
        
    Integration Tests
    (Supertest)
    30% of coverage
    
    Unit Tests
    (Jest)
    60% of coverage
```

## Unit Tests

### Coverage: 60% of test suite

Unit tests focus on individual functions and services in isolation using Jest mocks.

### Running Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage report
npm run test:unit -- --coverage

# Run specific test file
npm run test:unit -- paymentService.test.js

# Run in watch mode
npm run test:watch
```

### Test Files

#### Payment Service (`tests/unit/paymentService.test.js`)
- ✅ createPayment with idempotency key
- ✅ createPayment organization isolation
- ✅ Fraud risk assessment blocking
- ✅ getPaymentStatus
- ✅ retryPayment with exponential backoff
- ✅ getUserTransactions with pagination

#### Audit Service (`tests/unit/auditService.test.js`)
- ✅ logAudit with organization context
- ✅ getTransactionAuditTrail filtering
- ✅ getUserAuditTrail with date filtering
- ✅ getAllAuditLogs with resource/action filters
- ✅ getComplianceStatistics calculation
- ✅ exportAuditLogsAsCSV formatting

#### Analytics Service (TBD)
- getDashboardSummary aggregation
- getCountyPerformance breakdown
- getFeePerformance metrics
- getPaymentMethodBreakdown
- getTimeSeries data
- detectAnomalies statistical analysis
- getFailureAnalysis grouping
- getCashFlowForecast regression

#### Fraud Detection Service (TBD)
- checkVelocity detection
- checkPaymentAmount z-score analysis
- checkReplayAttack duplicate detection
- verifyGeolocation validation
- checkKYCStatus verification
- calculateFraudRisk scoring
- logFraudEvent logging

### Mock Strategy

```javascript
// Mock Prisma queries
jest.mock('../../src/lib/prisma');
prisma.transaction.findMany.mockResolvedValue([...]);
prisma.transaction.count.mockResolvedValue(10);

// Mock services
jest.mock('../../src/services/fraudDetectionService');

// Mock auth middleware
authMiddleware.mockImplementation((req, res, next) => {
  req.user = testUtils.createMockUser();
  next();
});
```

## Integration Tests

### Coverage: 30% of test suite

Integration tests verify API endpoints and multi-service interactions using Supertest.

### Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific endpoint tests
npm run test:integration -- payments.test.js

# Run with coverage
npm run test:integration -- --coverage
```

### Test Files

#### Payments Endpoint (`tests/integration/payments.test.js`)
- ✅ POST /api/payments - create payment
- ✅ POST /api/payments - validation errors
- ✅ GET /api/payments/:id - retrieve payment
- ✅ GET /api/payments/:id - 404 handling
- ✅ GET /api/payments/my-transactions - user isolation
- ✅ GET /api/payments/my-transactions?status=COMPLETED - filtering
- ✅ POST /api/payments/:id/retry - retry failed payment
- ✅ POST /api/payments/:id/retry - max retries exceeded
- ✅ Tenant isolation tests

#### Audit Endpoints (TBD)
- GET /api/audit/transactions/:id
- GET /api/audit/users/:id
- GET /api/audit/logs
- GET /api/audit/compliance/stats
- GET /api/audit/export/csv

#### Analytics Endpoints (TBD)
- GET /api/analytics/dashboard
- GET /api/analytics/counties
- GET /api/analytics/payment-methods
- GET /api/analytics/timeseries

#### Organizations Endpoints (TBD)
- POST /api/organizations
- GET /api/organizations/:slug
- PATCH /api/organizations/:slug
- DELETE /api/organizations/:slug

### Request/Response Testing

```javascript
describe('POST /api/payments', () => {
  it('should create payment transaction', async () => {
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', 'org-123')
      .send({
        feeId: 'fee-123',
        phoneNumber: '254712345678',
        paymentMethod: 'stripe'
      });

    expect(response.status).toBe(201);
    expect(response.body.transaction).toHaveProperty('id');
    expect(response.body.transaction.status).toBe('PENDING');
  });
});
```

## E2E Tests (Future)

### Coverage: 10% of test suite

E2E tests verify complete user flows using Cypress.

```javascript
describe('Payment Flow E2E', () => {
  it('should complete full payment journey', () => {
    cy.visit('/login');
    cy.get('[data-testid=phone-input]').type('254712345678');
    cy.get('[data-testid=password-input]').type('password123');
    cy.get('[data-testid=login-button]').click();
    
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid=payment-link]').click();
    
    cy.get('[data-testid=fee-select]').select('Birth Certificate');
    cy.get('[data-testid=phone-input]').type('254712345679');
    cy.get('[data-testid=submit-button]').click();
    
    cy.get('[data-testid=success-message]').should('be.visible');
  });
});
```

## Coverage Requirements

### Coverage Thresholds

```
global:
  branches: 70%
  functions: 75%
  lines: 75%
  statements: 75%
```

### Check Coverage

```bash
# View coverage report
npm run test:coverage

# Check if thresholds are met
npm run test:check-coverage

# Coverage HTML report
open coverage/lcov-report/index.html
```

### Coverage Report Example

```
File                     | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines
---------------------|---------|----------|---------|---------|-------------------
All files           |   75.2  |   70.3   |   75.1  |   74.8  |
 src/services       |   82.1  |   75.2   |   80.5  |   81.9  |
 paymentService.js  |   85.3  |   78.2   |   83.1  |   84.7  | 42,55,118-120
 auditService.js    |   81.2  |   74.3   |   82.1  |   80.5  | 67,92-94
```

## CI/CD Pipeline

### GitHub Actions Workflow

Automated pipeline runs on every push and pull request.

```yaml
Trigger: push to main/develop or PR
  ↓
[TEST STAGE]
  ├─ Install dependencies
  ├─ Lint code (ESLint)
  ├─ Run unit tests
  ├─ Run integration tests
  └─ Generate coverage report
  ↓
[BUILD STAGE]
  ├─ Install dependencies
  ├─ Build application
  ├─ Check TypeScript errors
  └─ Create artifacts
  ↓
[SECURITY STAGE]
  ├─ Run npm audit
  └─ Run SAST scan (Semgrep)
  ↓
[QUALITY STAGE]
  ├─ Run ESLint
  ├─ Run Prettier
  └─ Report to PR
  ↓
[DOCKER STAGE] (main branch only)
  └─ Build & push Docker image
  ↓
[DEPLOY STAGE] (develop branch only)
  ├─ Deploy to staging
  └─ Run smoke tests
  ↓
[NOTIFY STAGE]
  └─ Slack notification
```

### Workflow Stages

#### 1. Test Stage
```bash
npm ci                          # Clean install
npm run lint                    # ESLint
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:coverage          # Coverage report
```

#### 2. Build Stage
```bash
npm run build                   # Build application
npm run type-check             # TypeScript check (optional)
```

#### 3. Security Stage
```bash
npm audit --audit-level=moderate   # Dependency audit
semgrep --config owasp-top-ten     # SAST scan
```

#### 4. Code Quality Stage
```bash
npm run lint:fix               # Auto-fix ESLint
npm run format                 # Auto-format with Prettier
npm run format:check           # Check formatting
```

#### 5. Docker Stage (main only)
```bash
docker build -t countypay-backend:latest .
docker push docker.io/username/countypay-backend:latest
```

#### 6. Deploy Stage (develop only)
```bash
git pull origin develop
npm ci --production
npm run migrate                # Run Prisma migrations
npm run seed                   # Seed database
npm run restart                # Restart PM2 process
```

#### 7. Smoke Tests
```bash
curl https://staging-api.countypay.com/health
# Should return 200 OK
```

### Workflow File

Location: `.github/workflows/backend.yml`

### Viewing Workflow Runs

1. Navigate to repository Actions tab
2. Select workflow run
3. View detailed logs and artifacts
4. Download coverage reports

## Manual Testing

### Local Test Setup

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Start PostgreSQL (using Docker)
docker run -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=countypay_test \
  -p 5432:5432 postgres:13

# 3. Run migrations
DATABASE_URL=postgresql://postgres:test@localhost:5432/countypay_test \
  npm run prisma:migrate

# 4. Run tests
npm run test
```

### Running Tests Locally

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (auto-rerun on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test paymentService.test.js

# Specific test case
npm test -- --testNamePattern="should create payment"
```

## Test Utilities

### Global Test Helpers

Available in all test files via `testUtils`:

```javascript
testUtils.createMockUser()           // Mock user object
testUtils.createMockTransaction()    // Mock transaction
testUtils.createMockFee()            // Mock fee
testUtils.createMockOrganization()   // Mock organization
```

### Example Usage

```javascript
const mockUser = testUtils.createMockUser({
  id: 'custom-user-id',
  organizationId: 'custom-org-id'
});

const mockTransaction = testUtils.createMockTransaction({
  status: 'COMPLETED',
  amount: 5000
});
```

## Debugging Tests

### Enable Debug Output

```bash
# Verbose output
npm test -- --verbose

# Show console logs
npm test -- --silent=false

# Stop on first failure
npm test -- --bail

# Run single test only
npm test -- -t "should create payment"
```

### Debug with Node Inspector

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
# Then open chrome://inspect
```

### Common Issues

#### Database Connection Fails
- Ensure PostgreSQL is running
- Check DATABASE_URL env var
- Run migrations before tests

#### Mock Not Working
- Ensure jest.mock() before require
- Clear mocks with jest.clearAllMocks()
- Check mock implementation

#### Timeout Errors
- Increase testTimeout in jest.config.js
- Check for unresolved promises
- Add proper async/await

## Code Quality Standards

### ESLint Rules

```javascript
// ✅ Correct
const user = await prisma.user.findUnique({ where: { id } });
const transactions = transactions.filter((t) => t.status === 'COMPLETED');

// ❌ Incorrect
var user = await prisma.user.findUnique({where: {id}});
if (t.status == 'COMPLETED') {}
```

### Prettier Formatting

```bash
# Auto-format all files
npm run format

# Check formatting without changing
npm run format:check

# Format specific file
prettier --write src/services/paymentService.js
```

### Naming Conventions

- **Files**: `camelCase.js` or `kebab-case.test.js`
- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Classes**: `PascalCase`
- **Methods**: `camelCase`

## Performance Testing

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 50 https://api.countypay.com/api/payments/my-transactions

# Using wrk
wrk -t4 -c100 -d30s https://api.countypay.com/api/payments/my-transactions
```

### Memory Profiling

```bash
node --inspect-brk src/server.js
# Open chrome://inspect
```

## Continuous Monitoring

### Metrics to Track

- Test coverage trend (should stay >70%)
- Build time (target <5 min)
- Deployment success rate
- Error rate in production
- API response time

### Alerts

Set up alerts for:
- Build failures
- Coverage drops below threshold
- Security vulnerabilities
- Performance degradation

## Best Practices

1. **Write tests before code** (TDD)
2. **Keep tests focused** (one assertion per test)
3. **Use meaningful names** (describe what test does)
4. **Mock external dependencies** (APIs, databases)
5. **Test edge cases** (null, empty, max values)
6. **Maintain coverage** (minimum 70%)
7. **Run tests before committing** (pre-commit hook)
8. **Review test failures** (don't ignore flaky tests)

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Cypress Documentation](https://docs.cypress.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
