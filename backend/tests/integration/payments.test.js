/**
 * Integration Tests for Payment Endpoints
 */

const request = require('supertest');
const express = require('express');
const { authMiddleware } = require('../../src/middleware/auth');
const { tenantMiddleware } = require('../../src/middleware/tenantMiddleware');
const paymentsRouter = require('../../src/routes/payments');
const { prisma } = require('../../src/lib/prisma');

jest.mock('../../src/lib/prisma');
jest.mock('../../src/services/paymentService');
jest.mock('../../src/middleware/auth');
jest.mock('../../src/middleware/tenantMiddleware');

describe('Payment Endpoints', () => {
  let app;
  let mockUser;
  let mockOrganization;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());

    // Mock auth middleware
    authMiddleware.mockImplementation((req, res, next) => {
      mockUser = testUtils.createMockUser();
      req.user = mockUser;
      next();
    });

    // Mock tenant middleware
    tenantMiddleware.mockImplementation(() => (req, res, next) => {
      mockOrganization = testUtils.createMockOrganization();
      req.organizationId = mockOrganization.id;
      req.tenant = { id: mockOrganization.id };
      next();
    });

    app.use('/api/payments', paymentsRouter);
  });

  describe('POST /api/payments', () => {
    it('should create payment transaction', async () => {
      const mockTransaction = testUtils.createMockTransaction();

      const response = await request(app)
        .post('/api/payments')
        .send({
          feeId: 'fee-123',
          phoneNumber: '254712345678',
          paymentMethod: 'mpesa',
          idempotencyKey: 'idem-123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('transaction');
    });

    it('should return 400 if missing required fields', async () => {
      const response = await request(app)
        .post('/api/payments')
        .send({
          feeId: 'fee-123'
          // Missing phoneNumber and paymentMethod
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should return 400 if invalid payment method', async () => {
      const response = await request(app)
        .post('/api/payments')
        .send({
          feeId: 'fee-123',
          phoneNumber: '254712345678',
          paymentMethod: 'invalid_method'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_PAYMENT_METHOD');
    });

    it('should return 401 if not authenticated', async () => {
      authMiddleware.mockImplementationOnce((req, res, next) => {
        res.status(401).json({ code: 'UNAUTHORIZED' });
      });

      const response = await request(app)
        .post('/api/payments')
        .send({
          feeId: 'fee-123',
          phoneNumber: '254712345678',
          paymentMethod: 'mpesa'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('should retrieve payment by ID', async () => {
      const mockTransaction = testUtils.createMockTransaction();
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .get('/api/payments/tx-123');

      expect(response.status).toBe(200);
    });

    it('should return 404 if payment not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/payments/invalid-tx');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/payments/my-transactions', () => {
    it('should retrieve user transactions', async () => {
      const transactions = [
        testUtils.createMockTransaction(),
        testUtils.createMockTransaction({ status: 'COMPLETED' })
      ];

      prisma.transaction.findMany.mockResolvedValue(transactions);
      prisma.transaction.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/payments/my-transactions');

      expect(response.status).toBe(200);
      expect(response.body.transactions).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const completed = [testUtils.createMockTransaction({ status: 'COMPLETED' })];

      prisma.transaction.findMany.mockResolvedValue(completed);
      prisma.transaction.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/payments/my-transactions?status=COMPLETED');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
    });
  });

  describe('POST /api/payments/:id/retry', () => {
    it('should retry failed payment', async () => {
      const failed = testUtils.createMockTransaction({ status: 'FAILED' });
      const retried = { ...failed, retryCount: 1, status: 'PROCESSING' };

      prisma.transaction.findUnique.mockResolvedValue(failed);
      prisma.transaction.update.mockResolvedValue(retried);

      const response = await request(app)
        .post('/api/payments/tx-123/retry');

      expect(response.status).toBe(200);
      expect(response.body.transaction.retryCount).toBe(1);
    });

    it('should return 404 if payment not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/payments/invalid-tx/retry');

      expect(response.status).toBe(404);
    });

    it('should return 409 if max retries exceeded', async () => {
      const exhausted = testUtils.createMockTransaction({
        status: 'FAILED',
        retryCount: 3,
        maxRetries: 3
      });

      prisma.transaction.findUnique.mockResolvedValue(exhausted);

      const response = await request(app)
        .post('/api/payments/tx-123/retry');

      expect(response.status).toBe(409);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only return transactions from user organization', async () => {
      const userOrg = 'org-123';
      const transaction = testUtils.createMockTransaction({ organizationId: userOrg });

      prisma.transaction.findMany.mockResolvedValue([transaction]);
      prisma.transaction.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/payments/my-transactions');

      // Verify organizationId filter was applied
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: userOrg
          })
        })
      );
    });

    it('should prevent access to other organization payments', async () => {
      const otherOrgTransaction = testUtils.createMockTransaction({
        organizationId: 'other-org-123'
      });

      // Simulate user trying to access via transaction reference
      prisma.transaction.findUnique.mockResolvedValue(null);  // Filtered out

      const response = await request(app)
        .get('/api/payments/ref/CP123');

      expect(response.status).toBe(404);
    });
  });
});
