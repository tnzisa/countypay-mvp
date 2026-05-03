/**
 * Unit Tests for Audit Service
 */

const auditService = require('../../src/services/auditService');
const { prisma } = require('../../src/lib/prisma');

jest.mock('../../src/lib/prisma');

describe('Audit Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logAudit', () => {
    it('should create audit log entry', async () => {
      const mockLog = {
        id: 'log-123',
        resourceType: 'TRANSACTION',
        resourceId: 'tx-123',
        action: 'PAYMENT_CREATED',
        status: 'SUCCESS',
        organizationId: 'org-123'
      };

      prisma.auditLog.create.mockResolvedValue(mockLog);

      const result = await auditService.logAudit({
        resourceType: 'TRANSACTION',
        resourceId: 'tx-123',
        action: auditService.AUDIT_ACTIONS.PAYMENT_CREATED,
        organizationId: 'org-123'
      });

      expect(result.id).toBe('log-123');
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resourceType: 'TRANSACTION',
          organizationId: 'org-123'
        })
      });
    });

    it('should handle audit log failures gracefully', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('Database error'));

      // Should not throw - audit failures shouldn't break business logic
      const result = await auditService.logAudit({
        resourceType: 'TRANSACTION',
        resourceId: 'tx-123',
        action: auditService.AUDIT_ACTIONS.PAYMENT_CREATED,
        organizationId: 'org-123'
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getTransactionAuditTrail', () => {
    it('should retrieve audit trail for transaction', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'PAYMENT_CREATED',
          status: 'SUCCESS'
        },
        {
          id: 'log-2',
          action: 'PAYMENT_PROCESSING',
          status: 'SUCCESS'
        }
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await auditService.getTransactionAuditTrail('tx-123', 'org-123');

      expect(result).toHaveLength(2);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-123',
            transactionId: 'tx-123'
          })
        })
      );
    });

    it('should return empty array if no logs found', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      const result = await auditService.getTransactionAuditTrail('tx-123', 'org-123');

      expect(result).toEqual([]);
    });
  });

  describe('getUserAuditTrail', () => {
    it('should retrieve audit trail for user', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'USER_LOGIN' },
        { id: 'log-2', action: 'USER_REGISTER' }
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await auditService.getUserAuditTrail('user-123', 'org-123', {
        limit: 100,
        offset: 0
      });

      expect(result).toHaveLength(2);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-123'
          })
        })
      );
    });

    it('should filter by action', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await auditService.getUserAuditTrail('user-123', 'org-123', {
        action: 'USER_LOGIN'
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'USER_LOGIN'
          })
        })
      );
    });

    it('should filter by date range', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      const dateFrom = '2024-01-01';
      const dateTo = '2024-01-31';

      await auditService.getUserAuditTrail('user-123', 'org-123', {
        dateFrom,
        dateTo
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object)
          })
        })
      );
    });
  });

  describe('getAllAuditLogs', () => {
    it('should retrieve all audit logs with filters', async () => {
      const mockLogs = [
        { id: 'log-1', resourceType: 'TRANSACTION' },
        { id: 'log-2', resourceType: 'USER' }
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await auditService.getAllAuditLogs('org-123', {
        limit: 100,
        offset: 0
      });

      expect(result).toHaveLength(2);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-123'
          })
        })
      );
    });
  });

  describe('getComplianceStatistics', () => {
    it('should calculate compliance statistics', async () => {
      prisma.auditLog.count.mockResolvedValueOnce(100);  // total actions
      prisma.auditLog.count.mockResolvedValueOnce(5);    // failed actions
      prisma.auditLog.groupBy.mockResolvedValueOnce([]);  // by resource type
      prisma.auditLog.groupBy.mockResolvedValueOnce([]);  // by action

      const result = await auditService.getComplianceStatistics('org-123');

      expect(result).toHaveProperty('totalActions');
      expect(result).toHaveProperty('failedActions');
      expect(result).toHaveProperty('successRate');
    });
  });

  describe('exportAuditLogsAsCSV', () => {
    it('should export audit logs as CSV', async () => {
      const mockLogs = [
        {
          createdAt: new Date('2024-01-01'),
          action: 'PAYMENT_CREATED',
          resourceType: 'TRANSACTION',
          resourceId: 'tx-123',
          status: 'SUCCESS'
        }
      ];

      // Mock getAllAuditLogs
      jest.spyOn(auditService, 'getAllAuditLogs').mockResolvedValue(mockLogs);

      const csv = await auditService.exportAuditLogsAsCSV('org-123');

      expect(csv).toContain('Timestamp');
      expect(csv).toContain('Action');
      expect(csv).toContain('PAYMENT_CREATED');
    });
  });
});
