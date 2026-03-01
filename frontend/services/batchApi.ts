import { DEFAULT_USER_ID, generateLocalId, localQuery } from '../utils/localDb';
import { apiClient } from './apiClient';
import { routeByMode } from './serviceAdapter';

const unwrap = (data: unknown) => {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: unknown }).data;
  }
  return data;
};

/* ---------- 批量测试 ---------- */

export const batchTest = routeByMode(
  async (testConfigs: Record<string, unknown>[]) => {
    const operationId = generateLocalId();
    for (const cfg of testConfigs) {
      const testId = generateLocalId();
      const now = new Date().toISOString();
      await localQuery(
        'INSERT INTO test_executions (test_id, user_id, engine_type, test_url, status, progress, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          testId,
          DEFAULT_USER_ID,
          cfg.testType || 'performance',
          cfg.url || '',
          'pending',
          0,
          now,
          now,
        ]
      );
    }
    return { operationId, totalItems: testConfigs.length };
  },
  async (testConfigs: Record<string, unknown>[]) => {
    const { data } = await apiClient.post('/batch/test', { testConfigs });
    return unwrap(data) as { operationId: string; totalItems: number };
  }
);

/* ---------- 批量导出 ---------- */

export const batchExport = routeByMode(
  async (_exportConfigs: Record<string, unknown>[], _format?: string) => {
    return { operationId: generateLocalId() };
  },
  async (exportConfigs: Record<string, unknown>[], format?: string) => {
    const { data } = await apiClient.post('/batch/export', { exportConfigs, format });
    return unwrap(data) as { operationId: string };
  }
);

/* ---------- 批量删除 ---------- */

export const batchDelete = routeByMode(
  async (testIds: string[]) => {
    for (const id of testIds) {
      await localQuery('DELETE FROM test_execution_logs WHERE test_id = ?', [id]);
      await localQuery('DELETE FROM test_executions WHERE test_id = ?', [id]);
    }
    return { operationId: generateLocalId(), totalItems: testIds.length };
  },
  async (testIds: string[]) => {
    const { data } = await apiClient.post('/batch/delete', {
      deleteConfigs: testIds.map(id => ({ testId: id })),
    });
    return unwrap(data) as { operationId: string; totalItems: number };
  }
);

/* ---------- 操作管理 ---------- */

type BatchStatusResult = {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  progress: number;
  errors: string[];
};

export const getBatchStatus = routeByMode(
  async (operationId: string): Promise<BatchStatusResult> => ({
    id: operationId,
    type: 'batch',
    status: 'completed',
    totalItems: 0,
    processedItems: 0,
    failedItems: 0,
    progress: 100,
    errors: [],
  }),
  async (operationId: string): Promise<BatchStatusResult> => {
    const { data } = await apiClient.get(`/batch/${operationId}/status`);
    return unwrap(data) as BatchStatusResult;
  }
);

export const cancelBatch = routeByMode(
  async (_operationId: string) => null,
  async (operationId: string) => {
    const { data } = await apiClient.delete(`/batch/${operationId}`);
    return unwrap(data);
  }
);

export const getBatchList = routeByMode(
  async (_params?: { limit?: number; offset?: number }) => ({
    operations: [] as Record<string, unknown>[],
    total: 0,
  }),
  async (params?: { limit?: number; offset?: number }) => {
    const { data } = await apiClient.get('/batch', { params });
    return unwrap(data) as { operations: Record<string, unknown>[]; total: number };
  }
);

export const getBatchStatistics = routeByMode(
  async () => ({}) as Record<string, unknown>,
  async () => {
    const { data } = await apiClient.get('/batch/statistics');
    return unwrap(data) as Record<string, unknown>;
  }
);

export const cleanupBatch = routeByMode(
  async () => null,
  async () => {
    const { data } = await apiClient.delete('/batch/cleanup');
    return unwrap(data);
  }
);
