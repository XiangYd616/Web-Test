import { beforeEach, describe, expect, it, jest } from '@jest/globals';

let MonitoringService: any;

describe('MonitoringService', () => {
  beforeEach(async () => {
    const module = await import(
      '../../../../backend/modules/monitoring/services/MonitoringService'
    );
    MonitoringService = (module as any).default || module;
  });

  it('应写入测试告警', async () => {
    const queryMock = (jest.fn() as any).mockResolvedValue({ rows: [] });
    const dbPool = {
      query: queryMock,
    } as unknown as { query: () => Promise<{ rows: unknown[] }> };

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
    const queryMock = (jest.fn() as any)
      .mockResolvedValueOnce({ rows: [{ status: 'active', count: '2' }] })
      .mockResolvedValueOnce({ rows: [{ monitoring_type: 'uptime', count: '2' }] });
    const dbPool = {
      query: queryMock,
    } as unknown as { query: () => Promise<{ rows: Array<Record<string, string>> }> };

    const service = new MonitoringService(dbPool);
    const summary = await service.getMonitoringSummary('user-1');

    expect(summary.total).toBe(2);
    expect(summary.active).toBe(2);
    expect(summary.byType.uptime).toBe(2);
  });
});
