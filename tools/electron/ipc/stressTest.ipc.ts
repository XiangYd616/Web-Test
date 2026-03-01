import { ipcMain } from 'electron';
import { windowManager } from '../managers/WindowManager';

interface StressTestConfig {
  [key: string]: unknown;
}

interface StressTestResult {
  success: boolean;
  testId?: string;
  error?: string;
}

interface StressTestEngineInterface {
  startTest(config: StressTestConfig): Promise<StressTestResult>;
  stopTest(): Promise<StressTestResult>;
  getResults(): unknown;
  getSystemUsage(): unknown;
  on(event: string, callback: (data: unknown) => void): void;
  testId?: string;
}

// 引擎实例由外部注入
let stressTestEngine: StressTestEngineInterface | null = null;

export function setStressTestEngine(engine: StressTestEngineInterface): void {
  stressTestEngine = engine;
  setupStressTestEvents();
}

function setupStressTestEvents(): void {
  if (!stressTestEngine) return;

  stressTestEngine.on('testStarted', (data: unknown) => {
    windowManager.send('stress-test-started', data);
  });

  stressTestEngine.on('testUpdate', (data: unknown) => {
    windowManager.send('stress-test-update', data);
  });

  stressTestEngine.on('testCompleted', (data: unknown) => {
    windowManager.send('stress-test-completed', data);
  });

  stressTestEngine.on('testError', (data: unknown) => {
    windowManager.send('stress-test-error', data);
  });
}

/**
 * 压力测试相关 IPC handlers
 */
export function registerStressTestIpc(): void {
  ipcMain.handle(
    'stress-test-start',
    async (_event, config: StressTestConfig): Promise<StressTestResult> => {
      if (!stressTestEngine) throw new Error('Stress test engine not initialized');
      try {
        await stressTestEngine.startTest(config);
        return { success: true, testId: stressTestEngine.testId };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  );

  ipcMain.handle('stress-test-stop', async (): Promise<StressTestResult> => {
    if (!stressTestEngine) throw new Error('Stress test engine not initialized');
    try {
      await stressTestEngine.stopTest();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('stress-test-status', async () => {
    if (!stressTestEngine) throw new Error('Stress test engine not initialized');
    return stressTestEngine.getResults();
  });

  ipcMain.handle('stress-test-system-usage', async () => {
    if (!stressTestEngine) throw new Error('Stress test engine not initialized');
    return stressTestEngine.getSystemUsage();
  });
}
