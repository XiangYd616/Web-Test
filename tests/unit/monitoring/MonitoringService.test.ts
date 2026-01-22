import { beforeEach, describe, expect, it, jest } from '@jest/globals';

let MonitoringService: any;

describe('MonitoringService', () => {
  beforeEach(async () => {
    const module = await import('../../../backend/services/monitoring/MonitoringService');
    MonitoringService = (module as any).default || module;
  });

  it('应写入测试告警', async () => {
    const dbPool = {
      query: jest.fn().mockResolvedValue({ rows: [] } as any),
    } as any;

    const service = new MonitoringService(dbPool);

    await service.insertTestAlert({
      alertId: 'alert-1',
      alertType: 'test_failed',
      severity: 'high',
      message: 'failed',
    });

    expect(dbPool.query).toHaveBeenCalled();
  });

  it('应汇总监控状态', async () => {
    const dbPool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ status: 'active', count: '2' }] } as any)
        .mockResolvedValueOnce({ rows: [{ monitoring_type: 'uptime', count: '2' }] } as any),
    } as any;

    const service = new MonitoringService(dbPool);
    const summary = await service.getMonitoringSummary('user-1');

    expect(summary.total).toBe(2);
    expect(summary.active).toBe(2);
    expect(summary.byType.uptime).toBe(2);
  });
});
