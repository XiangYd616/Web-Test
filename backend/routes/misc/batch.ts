/**
 * 批量操作API路由
 * 提供批量测试、批量导出、批量删除等功能
 */

import express from 'express';
import path from 'path';
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import asyncHandler from '../../middleware/asyncHandler';
import { dataManagementService } from '../../services/data/DataManagementService';
import DataExportService, {
  ExportJobRequest,
} from '../../services/dataManagement/dataExportService';
import testService from '../../services/testing/testService';
const { authMiddleware } = require('../../middleware/auth');

interface BatchOperation {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  startTime: Date;
  endTime?: Date;
  userId: string;
  config: BatchConfig;
  results: unknown[];
  errors: string[];
  progress: number;
}

interface BatchConfig {
  items?: unknown[];
  operation?: string;
  options?: Record<string, unknown>;
  testConfigs?: unknown[];
  exportConfigs?: unknown[];
  deleteConfigs?: unknown[];
  format?: string;
  role?: string;
}

const router = express.Router();

const getUserId = (req: express.Request): string => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

const getUserRole = (req: express.Request): string =>
  (req as { user?: { role?: string } }).user?.role || 'free';

const BATCH_OPERATIONS_TYPE = 'misc_batch_operations';

dataManagementService.initialize().catch(error => {
  console.error('批量操作数据服务初始化失败:', error);
});

let exportService: DataExportService;
const initializeExportService = (): DataExportService => {
  if (!exportService) {
    exportService = new DataExportService({
      exportDir: path.join(process.cwd(), 'exports'),
      maxFileSize: 100 * 1024 * 1024,
      supportedFormats: ['json', 'csv', 'excel', 'pdf', 'zip'],
    });
  }
  return exportService;
};

const mapBatchRecord = (record: { id: string; data: Record<string, unknown> }) => {
  const data = record.data as unknown as BatchOperation;
  return {
    ...data,
    id: record.id,
    startTime: new Date(data.startTime),
    endTime: data.endTime ? new Date(data.endTime) : undefined,
  } as BatchOperation;
};

const fetchOperationById = async (id: string) => {
  const record = await dataManagementService.readData(BATCH_OPERATIONS_TYPE, id);
  return mapBatchRecord(record as { id: string; data: Record<string, unknown> });
};

/**
 * 生成操作ID
 */
/**
 * 创建批量操作记录
 */
async function createBatchOperation(
  type: string,
  config: BatchConfig,
  totalItems: number,
  userId: string
): Promise<BatchOperation> {
  const operation: BatchOperation = {
    id: '',
    type,
    status: 'pending',
    totalItems,
    processedItems: 0,
    failedItems: 0,
    startTime: new Date(),
    userId,
    config,
    results: [],
    errors: [],
    progress: 0,
  };

  const { id } = await dataManagementService.createData(
    BATCH_OPERATIONS_TYPE,
    operation as unknown as Record<string, unknown>,
    { userId, source: 'batch' }
  );
  return { ...operation, id };
}

/**
 * 更新操作进度
 */
async function updateOperationProgress(
  operationId: string,
  processedItems: number,
  failedItems: number = 0,
  errors: string[] = []
): Promise<void> {
  const operation = await fetchOperationById(operationId);
  const updatedErrors = errors.length ? [...operation.errors, ...errors] : operation.errors;
  const progress = (processedItems / operation.totalItems) * 100;

  await dataManagementService.updateData(
    BATCH_OPERATIONS_TYPE,
    operationId,
    {
      processedItems,
      failedItems,
      errors: updatedErrors,
      progress,
    },
    { userId: operation.userId }
  );
}

/**
 * 完成操作
 */
async function completeOperation(
  operationId: string,
  status: BatchOperation['status']
): Promise<void> {
  const operation = await fetchOperationById(operationId);
  await dataManagementService.updateData(
    BATCH_OPERATIONS_TYPE,
    operationId,
    {
      status,
      endTime: new Date(),
      progress: 100,
    },
    { userId: operation.userId }
  );
}

/**
 * 批量测试
 * POST /api/misc/batch/test
 */
router.post(
  '/test',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);
    const { testConfigs, options } = req.body;

    if (!Array.isArray(testConfigs) || testConfigs.length === 0) {
      return res.error(StandardErrorCode.INVALID_INPUT, '测试配置数组不能为空', undefined, 400);
    }

    try {
      const operation = await createBatchOperation(
        'batch_test',
        { testConfigs, options, role: getUserRole(req) },
        testConfigs.length,
        userId
      );

      // 异步执行批量测试
      executeBatchTest(operation.id, testConfigs, options || {});

      return res.success(
        {
          operationId: operation.id,
          totalItems: operation.totalItems,
          estimatedTime: testConfigs.length * 30, // 估算每个测试30秒
        },
        '批量测试任务已创建',
        201
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.error(StandardErrorCode.NOT_FOUND, '批量操作不存在', undefined, 404);
      }

      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '创建批量测试任务失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 批量导出
 * POST /api/misc/batch/export
 */
router.post(
  '/export',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);
    const { exportConfigs, format = 'json', options } = req.body;

    if (!Array.isArray(exportConfigs) || exportConfigs.length === 0) {
      return res.error(StandardErrorCode.INVALID_INPUT, '导出配置数组不能为空', undefined, 400);
    }

    try {
      const operation = await createBatchOperation(
        'batch_export',
        { exportConfigs, format, options },
        exportConfigs.length,
        userId
      );

      // 异步执行批量导出
      executeBatchExport(operation.id, exportConfigs, format, options || {});

      return res.success(
        {
          operationId: operation.id,
          totalItems: operation.totalItems,
          format,
        },
        '批量导出任务已创建',
        201
      );
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '创建批量导出任务失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 批量删除
 * POST /api/misc/batch/delete
 */
router.post(
  '/delete',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);
    const { deleteConfigs, options } = req.body;

    if (!Array.isArray(deleteConfigs) || deleteConfigs.length === 0) {
      return res.error(StandardErrorCode.INVALID_INPUT, '删除配置数组不能为空', undefined, 400);
    }

    try {
      const operation = await createBatchOperation(
        'batch_delete',
        { deleteConfigs, options },
        deleteConfigs.length,
        userId
      );

      // 异步执行批量删除
      executeBatchDelete(operation.id, deleteConfigs, options || {});

      return res.success(
        {
          operationId: operation.id,
          totalItems: operation.totalItems,
        },
        '批量删除任务已创建',
        201
      );
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '创建批量删除任务失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 获取批量操作状态
 * GET /api/misc/batch/:operationId/status
 */
router.get(
  '/:operationId/status',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { operationId } = req.params;
    const userId = getUserId(req);

    try {
      const operation = await fetchOperationById(operationId);

      if (operation.userId !== userId) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权访问此批量操作', undefined, 403);
      }

      return res.success(operation);
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.error(StandardErrorCode.NOT_FOUND, '批量操作不存在', undefined, 404);
      }

      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取批量操作状态失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 取消批量操作
 * DELETE /api/misc/batch/:operationId
 */
router.delete(
  '/:operationId',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { operationId } = req.params;
    const userId = getUserId(req);

    try {
      const operation = await fetchOperationById(operationId);

      if (operation.userId !== userId) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权取消此批量操作', undefined, 403);
      }

      if (operation.status === 'completed') {
        return res.error(
          StandardErrorCode.INVALID_INPUT,
          '无法取消已完成的批量操作',
          undefined,
          400
        );
      }

      await completeOperation(operationId, 'cancelled');

      return res.success(null, '批量操作已取消');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '取消批量操作失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 获取批量操作列表
 * GET /api/misc/batch
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);
    const { page = 1, limit = 10, status, type } = req.query;

    try {
      const filters: Record<string, unknown> = { userId };
      if (status) filters.status = status;
      if (type) filters.type = type;

      const queryResult = await dataManagementService.queryData(
        BATCH_OPERATIONS_TYPE,
        {
          filters,
          sort: { field: 'startTime', direction: 'desc' },
        },
        { page: parseInt(page as string), limit: parseInt(limit as string) }
      );

      const operations = queryResult.results.map(record => mapBatchRecord(record));

      return res.success({
        operations,
        pagination: {
          page: queryResult.page,
          limit: queryResult.limit,
          total: queryResult.total,
          totalPages: queryResult.totalPages,
        },
      });
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取批量操作列表失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 清理已完成的批量操作
 * DELETE /api/misc/batch/cleanup
 */
router.delete(
  '/cleanup',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);
    const { olderThan = 7 } = req.query; // 默认清理7天前的操作

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan as string));

      const { results } = await dataManagementService.queryData(
        BATCH_OPERATIONS_TYPE,
        { filters: { userId, status: 'completed' } },
        {}
      );

      let cleanedCount = 0;
      for (const record of results) {
        const operation = mapBatchRecord(record);
        if (operation.endTime && operation.endTime < cutoffDate) {
          await dataManagementService.deleteData(BATCH_OPERATIONS_TYPE, operation.id, { userId });
          cleanedCount++;
        }
      }

      return res.success(
        {
          cleanedCount,
        },
        '清理完成'
      );
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '清理失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 获取批量操作统计
 * GET /api/misc/batch/statistics
 */
router.get(
  '/statistics',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);

    try {
      const { results } = await dataManagementService.queryData(
        BATCH_OPERATIONS_TYPE,
        { filters: { userId } },
        {}
      );
      const userOperations = results.map(record => mapBatchRecord(record));

      const completedDurations = userOperations
        .filter(op => op.endTime && op.startTime)
        .map(op => (op.endTime ? op.endTime.getTime() - op.startTime.getTime() : 0))
        .filter(duration => duration > 0);
      const averageProcessingTime = completedDurations.length
        ? completedDurations.reduce((sum, duration) => sum + duration, 0) /
          completedDurations.length
        : 0;

      const statistics = {
        total: userOperations.length,
        pending: userOperations.filter(op => op.status === 'pending').length,
        running: userOperations.filter(op => op.status === 'running').length,
        completed: userOperations.filter(op => op.status === 'completed').length,
        failed: userOperations.filter(op => op.status === 'failed').length,
        cancelled: userOperations.filter(op => op.status === 'cancelled').length,
        byType: userOperations.reduce(
          (acc, op) => {
            acc[op.type] = (acc[op.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        averageProcessingTime,
      };

      return res.success(statistics);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取批量操作统计失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

// 异步执行函数
async function executeBatchTest(
  operationId: string,
  testConfigs: unknown[],
  _options: Record<string, unknown>
): Promise<void> {
  const operation = await fetchOperationById(operationId);
  const userRole = operation.config.role || 'free';
  await dataManagementService.updateData(
    BATCH_OPERATIONS_TYPE,
    operationId,
    { status: 'running' },
    { userId: operation.userId }
  );

  for (let i = 0; i < testConfigs.length; i++) {
    const config = testConfigs[i];
    try {
      const normalizedConfig = {
        url: String((config as { url?: string }).url || ''),
        testType: String(
          (config as { testType?: string; engineType?: string; type?: string }).testType ||
            (config as { testType?: string; engineType?: string; type?: string }).engineType ||
            (config as { testType?: string; engineType?: string; type?: string }).type ||
            ''
        ),
        options:
          (config as { options?: Record<string, unknown>; config?: Record<string, unknown> })
            .options ||
          (config as { options?: Record<string, unknown>; config?: Record<string, unknown> })
            .config ||
          {},
        concurrency:
          typeof (config as { concurrency?: number }).concurrency === 'number'
            ? (config as { concurrency?: number }).concurrency
            : undefined,
        duration:
          typeof (config as { duration?: number }).duration === 'number'
            ? (config as { duration?: number }).duration
            : undefined,
        templateId:
          typeof (config as { templateId?: string }).templateId === 'string'
            ? (config as { templateId?: string }).templateId
            : undefined,
      };

      const result = await testService.createAndStart(normalizedConfig, {
        userId: operation.userId,
        role: userRole,
      });

      const resultEntry = {
        index: i,
        config,
        result: {
          success: true,
          testId: result.testId,
          status: result.status,
        },
      };

      const latest = await fetchOperationById(operationId);
      await dataManagementService.updateData(
        BATCH_OPERATIONS_TYPE,
        operationId,
        {
          results: [...latest.results, resultEntry],
        },
        { userId: latest.userId }
      );

      await updateOperationProgress(operationId, i + 1, latest.failedItems);
    } catch (error) {
      const latest = await fetchOperationById(operationId);
      await updateOperationProgress(operationId, i + 1, latest.failedItems + 1, [
        `测试 ${i} 失败: ${error}`,
      ]);
    }
  }

  const finalOperation = await fetchOperationById(operationId);
  await completeOperation(operationId, finalOperation.failedItems > 0 ? 'failed' : 'completed');
}

async function executeBatchExport(
  operationId: string,
  exportConfigs: unknown[],
  format: string,
  _options: Record<string, unknown>
): Promise<void> {
  const operation = await fetchOperationById(operationId);
  const service = initializeExportService();
  await dataManagementService.updateData(
    BATCH_OPERATIONS_TYPE,
    operationId,
    { status: 'running' },
    { userId: operation.userId }
  );

  for (let i = 0; i < exportConfigs.length; i++) {
    const config = exportConfigs[i];
    try {
      const batchId =
        (config as { batchId?: string; batch_id?: string }).batchId ||
        (config as { batchId?: string; batch_id?: string }).batch_id;
      if (!batchId) {
        throw new Error('导出配置缺少 batchId');
      }

      const job = await service.createExportJob({
        userId: operation.userId,
        dataType: 'test_results',
        format: format as ExportJobRequest['format'],
        filters: {
          "te.test_config->>'batchId'": batchId,
        },
        options: { ...(_options || {}), batchId },
      });

      const resultEntry = {
        index: i,
        config,
        result: { success: true, jobId: job.id, status: job.status },
      };

      const latest = await fetchOperationById(operationId);
      await dataManagementService.updateData(
        BATCH_OPERATIONS_TYPE,
        operationId,
        {
          results: [...latest.results, resultEntry],
        },
        { userId: latest.userId }
      );

      await updateOperationProgress(operationId, i + 1, latest.failedItems);
    } catch (error) {
      const latest = await fetchOperationById(operationId);
      await updateOperationProgress(operationId, i + 1, latest.failedItems + 1, [
        `导出 ${i} 失败: ${error}`,
      ]);
    }
  }

  const finalOperation = await fetchOperationById(operationId);
  await completeOperation(operationId, finalOperation.failedItems > 0 ? 'failed' : 'completed');
}

async function executeBatchDelete(
  operationId: string,
  deleteConfigs: unknown[],
  _options: Record<string, unknown>
): Promise<void> {
  const operation = await fetchOperationById(operationId);
  await dataManagementService.updateData(
    BATCH_OPERATIONS_TYPE,
    operationId,
    { status: 'running' },
    { userId: operation.userId }
  );

  for (let i = 0; i < deleteConfigs.length; i++) {
    const config = deleteConfigs[i];
    try {
      const batchId =
        (config as { batchId?: string; batch_id?: string }).batchId ||
        (config as { batchId?: string; batch_id?: string }).batch_id;
      const testId =
        (config as { testId?: string; test_id?: string }).testId ||
        (config as { testId?: string; test_id?: string }).test_id;

      if (batchId) {
        await testService.deleteBatchTests(batchId, operation.userId);
      } else if (testId) {
        await testService.deleteTest(operation.userId, testId);
      } else {
        throw new Error('删除配置缺少 batchId 或 testId');
      }

      const resultEntry = {
        index: i,
        config,
        result: { success: true, deleted: true, batchId, testId },
      };

      const latest = await fetchOperationById(operationId);
      await dataManagementService.updateData(
        BATCH_OPERATIONS_TYPE,
        operationId,
        {
          results: [...latest.results, resultEntry],
        },
        { userId: latest.userId }
      );

      await updateOperationProgress(operationId, i + 1, latest.failedItems);
    } catch (error) {
      const latest = await fetchOperationById(operationId);
      await updateOperationProgress(operationId, i + 1, latest.failedItems + 1, [
        `删除 ${i} 失败: ${error}`,
      ]);
    }
  }

  const finalOperation = await fetchOperationById(operationId);
  await completeOperation(operationId, finalOperation.failedItems > 0 ? 'failed' : 'completed');
}

export default router;
