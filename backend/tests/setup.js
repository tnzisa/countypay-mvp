/**
 * Jest Setup File
 * Runs before each test suite
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/countypay_test';
process.env.JWT_SECRET = 'test-secret-key-123456789';
process.env.PORT = '5001';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'user-123',
    phone: '254712345678',
    name: 'Test User',
    email: 'test@example.com',
    organizationId: 'org-123',
    role: 'citizen',
    ...overrides
  }),

  createMockTransaction: (overrides = {}) => ({
    id: 'tx-123',
    amount: 1000,
    status: 'PENDING',
    paymentMethod: 'mpesa',
    paymentProvider: 'mpesa',
    phoneNumber: '254712345678',
    transactionRef: 'CP123456789',
    idempotencyKey: 'idem-123',
    userId: 'user-123',
    feeId: 'fee-123',
    organizationId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  createMockFee: (overrides = {}) => ({
    id: 'fee-123',
    name: 'Birth Certificate',
    amount: 500,
    countyId: 'county-123',
    organizationId: 'org-123',
    status: 'ACTIVE',
    createdAt: new Date(),
    ...overrides
  }),

  createMockOrganization: (overrides = {}) => ({
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    tier: 'STARTER',
    status: 'ACTIVE',
    maxUsers: 10,
    maxCounties: 5,
    createdAt: new Date(),
    ...overrides
  })
};

// Suppress specific warnings
process.env.SUPPRESS_NO_CONFIG_WARNING = true;
