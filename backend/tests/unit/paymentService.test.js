/**
 * Unit Tests for Payment Service
 */

const paymentService = require('../../src/services/paymentService');
const { prisma } = require('../../src/lib/prisma');

jest.mock('../../src/lib/prisma');
jest.mock('../../src/services/fraudDetectionService');
jest.mock('../../src/services/auditService');
jest.mock('../../src/services/fabric');

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a new payment transaction', async () => {
      const mockFee = testUtils.createMockFee();
      const mockUser = testUtils.createMockUser();
      
      prisma.fee.findUnique.mockResolvedValue({
        ...mockFee,
        county: { id: 'county-123', code: 'NRB' }
      });
      
      prisma.user.findUnique.mockResolvedValue(mockUser);
      
      prisma.transaction.create.mockResolvedValue(
        testUtils.createMockTransaction()
      );

      const result = await paymentService.createPayment({
        feeId: 'fee-123',
        phoneNumber: '254712345678',
        paymentMethod: 'stripe',
        userId: 'user-123',
        organizationId: 'org-123'
      });

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('PENDING');
      expect(prisma.transaction.create).toHaveBeenCalled();
    });

    it('should return existing payment with idempotency key', async () => {
      const existing = testUtils.createMockTransaction();
      
      prisma.transaction.findUnique.mockResolvedValue(existing);

      const result = await paymentService.createPayment({
        feeId: 'fee-123',
        phoneNumber: '254712345678',
        paymentMethod: 'stripe',
        idempotencyKey: 'idem-123',
        userId: 'user-123',
        organizationId: 'org-123'
      });

      expect(result.id).toBe(existing.id);
      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { idempotencyKey: 'idem-123' }
      });
    });

    it('should throw error if fee not found', async () => {
      prisma.fee.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(testUtils.createMockUser());

      await expect(
        paymentService.createPayment({
          feeId: 'invalid-fee',
          phoneNumber: '254712345678',
          paymentMethod: 'stripe',
          userId: 'user-123',
          organizationId: 'org-123'
        })
      ).rejects.toThrow();
    });

    it('should throw error if user not in organization', async () => {
      const mockFee = testUtils.createMockFee();
      
      prisma.fee.findUnique.mockResolvedValue({
        ...mockFee,
        county: { id: 'county-123', code: 'NRB' }
      });
      
      prisma.user.findUnique.mockResolvedValue({
        ...testUtils.createMockUser(),
        organizationId: 'different-org'
      });

      await expect(
        paymentService.createPayment({
          feeId: 'fee-123',
          phoneNumber: '254712345678',
          paymentMethod: 'stripe',
          userId: 'user-123',
          organizationId: 'org-123'
        })
      ).rejects.toThrow();
    });
  });

  describe('getPaymentStatus', () => {
    it('should retrieve payment status', async () => {
      const mockTransaction = testUtils.createMockTransaction();
      
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await paymentService.getPaymentStatus('tx-123');

      expect(result.id).toBe(mockTransaction.id);
      expect(result.status).toBe('PENDING');
    });

    it('should return null if transaction not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      const result = await paymentService.getPaymentStatus('invalid-tx');

      expect(result).toBeNull();
    });
  });

  describe('retryPayment', () => {
    it('should retry failed payment with exponential backoff', async () => {
      const mockTransaction = testUtils.createMockTransaction({
        status: 'FAILED',
        retryCount: 0,
        lastError: 'Network timeout'
      });

      prisma.transaction.findUnique.mockResolvedValue(mockTransaction);
      prisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: 'PROCESSING',
        retryCount: 1
      });

      const result = await paymentService.retryPayment('tx-123');

      expect(result.retryCount).toBe(1);
      expect(prisma.transaction.update).toHaveBeenCalled();
    });

    it('should not retry if max retries exceeded', async () => {
      const mockTransaction = testUtils.createMockTransaction({
        status: 'FAILED',
        retryCount: 3,
        maxRetries: 3
      });

      prisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      await expect(
        paymentService.retryPayment('tx-123')
      ).rejects.toThrow();
    });
  });

  describe('getUserTransactions', () => {
    it('should retrieve user transactions with pagination', async () => {
      const transactions = [
        testUtils.createMockTransaction(),
        testUtils.createMockTransaction({ status: 'COMPLETED' })
      ];

      prisma.transaction.findMany.mockResolvedValue(transactions);
      prisma.transaction.count.mockResolvedValue(2);

      const result = await paymentService.getUserTransactions('user-123', 'org-123');

      expect(result.transactions).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should filter by status', async () => {
      const completed = testUtils.createMockTransaction({ status: 'COMPLETED' });

      prisma.transaction.findMany.mockResolvedValue([completed]);
      prisma.transaction.count.mockResolvedValue(1);

      const result = await paymentService.getUserTransactions('user-123', 'org-123', {
        status: 'COMPLETED'
      });

      expect(result.transactions[0].status).toBe('COMPLETED');
    });
  });
});
