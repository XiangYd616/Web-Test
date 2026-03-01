import { ipcMain } from 'electron';
import type { TestEngineType } from '../../../shared/types/testEngine.types';
import localTestExecutionService from '../modules/testing/localTestExecutionService';
import localTestService from '../modules/testing/localTestService';

/**
 * 本地测试执行 IPC handlers
 */
export function registerTestIpc(): void {
  ipcMain.handle(
    'local-test-start',
    async (
      _event,
      payload: { testType: TestEngineType; url?: string; config?: Record<string, unknown> }
    ) => {
      return await localTestExecutionService.startTest(payload);
    }
  );

  ipcMain.handle(
    'local-test-history',
    async (
      _event,
      payload: {
        userId?: string;
        page?: number;
        limit?: number;
        testType?: string;
        keyword?: string;
      } = {}
    ) => {
      const userId = payload.userId || 'local-user';
      return await localTestService.getTestHistory(userId, payload.page, payload.limit, {
        testType: payload.testType,
        keyword: payload.keyword,
      });
    }
  );

  ipcMain.handle(
    'local-test-logs',
    async (
      _event,
      payload: { userId?: string; testId: string; limit?: number; offset?: number; level?: string }
    ) => {
      const userId = payload.userId || 'local-user';
      return await localTestService.getTestLogs(
        userId,
        payload.testId,
        payload.limit,
        payload.offset,
        payload.level
      );
    }
  );

  ipcMain.handle(
    'local-test-detail',
    async (_event, payload: { userId?: string; testId: string }) => {
      const userId = payload.userId || 'local-user';
      return await localTestService.getTestDetail(userId, payload.testId);
    }
  );

  ipcMain.handle(
    'local-test-status',
    async (_event, payload: { userId?: string; testId: string }) => {
      const userId = payload.userId || 'local-user';
      return await localTestService.getTestStatus(userId, payload.testId);
    }
  );

  ipcMain.handle(
    'local-test-progress',
    async (_event, payload: { userId?: string; testId: string }) => {
      const userId = payload.userId || 'local-user';
      return await localTestService.getTestProgress(userId, payload.testId);
    }
  );

  ipcMain.handle(
    'local-test-result',
    async (_event, payload: { userId?: string; testId: string }) => {
      const userId = payload.userId || 'local-user';
      return await localTestService.getTestResult(userId, payload.testId);
    }
  );

  ipcMain.handle(
    'local-test-update',
    async (_event, payload: { userId?: string; testId: string; tags?: string[] }) => {
      const userId = payload.userId || 'local-user';
      if (payload.tags) {
        await localTestService.updateTestTags(userId, payload.testId, payload.tags);
      }
      return { success: true };
    }
  );

  ipcMain.handle(
    'local-test-delete',
    async (_event, payload: { userId?: string; testId: string }) => {
      const userId = payload.userId || 'local-user';
      await localTestService.deleteTest(userId, payload.testId);
      return { success: true };
    }
  );

  ipcMain.handle(
    'local-test-cancel',
    async (_event, payload: { userId?: string; testId: string }) => {
      const userId = payload.userId || 'local-user';
      await localTestService.cancelTest(userId, payload.testId);
      return { success: true };
    }
  );

  ipcMain.handle(
    'local-test-rerun',
    async (_event, payload: { userId?: string; testId: string }) => {
      const userId = payload.userId || 'local-user';
      return await localTestService.rerunTest(userId, payload.testId);
    }
  );
}
