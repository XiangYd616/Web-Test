import { describe, expect, it, jest } from '@jest/globals';

let AlertManagerClass: any;

describe('AlertManager', () => {
  it('应在测试失败时触发告警', async () => {
    const module = await import('../../../backend/alert/AlertManager');
    AlertManagerClass = (module as any).AlertManager;

    const manager = new AlertManagerClass();
    (manager as any).persistAlert = jest.fn(async (_alert: unknown) => undefined);

    const alerts = manager.checkTestResult({
      success: false,
      testId: 'test-1',
      type: 'api',
      error: 'failed',
    });

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].type).toBe('test_failed');
  });

  it('应支持确认告警', async () => {
    const module = await import('../../../backend/alert/AlertManager');
    AlertManagerClass = (module as any).AlertManager;

    const manager = new AlertManagerClass();
    (manager as any).persistAlert = jest.fn(async (_alert: unknown) => undefined);

    const [alert] = manager.checkTestResult({
      success: false,
      testId: 'test-2',
      type: 'stress',
      error: 'failed',
    });

    const acknowledged = manager.acknowledgeAlert(alert.alertId);
    expect(acknowledged).toBe(true);
  });
});
