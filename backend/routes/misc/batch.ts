/**
 * 批量操作API路由
 * 提供批量测试、批量导出、批量删除等功能
 */

import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

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
  config: Record<string, unknown>;
  results: unknown[];
  errors: string[];
  progress: number;
}

interface BatchConfig {
  items: unknown[];
  operation: string;
  options?: Record<string, unknown>;
}

const router = express.Router();

// 存储批量操作状态
const batchOperations = new Map<string, BatchOperation>();

/**
 * 生成操作ID
 */
function generateOperationId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建批量操作记录
 */
function createBatchOperation(
  type: string,
  config: BatchConfig,
  totalItems: number,
  userId: string
): BatchOperation {
  const operationId = generateOperationId();
  const operation: BatchOperation = {
    id: operationId,
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

  batchOperations.set(operationId, operation);
  return operation;
}

/**
 * 更新操作进度
 */
function updateOperationProgress(
  operationId: string,
  processedItems: number,
  failedItems: number = 0,
  errors: string[] = []
): void {
  const operation = batchOperations.get(operationId);
  if (operation) {
    operation.processedItems = processedItems;
    operation.failedItems = failedItems;
    operation.errors = [...operation.errors, ...errors];
    operation.progress = (processedItems / operation.totalItems) * 100;
  }
}

/**
 * 完成操作
 */
function completeOperation(
  operationId: string,
  status: 'completed' | 'failed' | 'cancelled'
): void {
  const operation = batchOperations.get(operationId);
  if (operation) {
    operation.status = status;
    operation.endTime = new Date();
    operation.progress = 100;
  }
}

/**
 * 批量测试
 * POST /api/misc/batch/test
 */
router.post(
  '/test',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { testConfigs, options } = req.body;

    if (!Array.isArray(testConfigs) || testConfigs.length === 0) {
      return res.status(400).json({
        success: false,
        message: '测试配置数组不能为空',
      });
    }

    try {
      const operation = createBatchOperation(
        'batch_test',
        { testConfigs, options },
        testConfigs.length,
        userId
      );

      // 异步执行批量测试
      executeBatchTest(operation.id, testConfigs, options || {});

      res.status(201).json({
        success: true,
        message: '批量测试任务已创建',
        data: {
          operationId: operation.id,
          totalItems: operation.totalItems,
          estimatedTime: testConfigs.length * 30, // 估算每个测试30秒
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '创建批量测试任务失败',
        error: error instanceof Error ? error.message : String(error),
      });
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
    const userId = (req as any).user.id;
    const { exportConfigs, format = 'json', options } = req.body;

    if (!Array.isArray(exportConfigs) || exportConfigs.length === 0) {
      return res.status(400).json({
        success: false,
        message: '导出配置数组不能为空',
      });
    }

    try {
      const operation = createBatchOperation(
        'batch_export',
        { exportConfigs, format, options },
        exportConfigs.length,
        userId
      );

      // 异步执行批量导出
      executeBatchExport(operation.id, exportConfigs, format, options || {});

      res.status(201).json({
        success: true,
        message: '批量导出任务已创建',
        data: {
          operationId: operation.id,
          totalItems: operation.totalItems,
          format,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '创建批量导出任务失败',
        error: error instanceof Error ? error.message : String(error),
      });
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
    const userId = (req as any).user.id;
    const { deleteConfigs, options } = req.body;

    if (!Array.isArray(deleteConfigs) || deleteConfigs.length === 0) {
      return res.status(400).json({
        success: false,
        message: '删除配置数组不能为空',
      });
    }

    try {
      const operation = createBatchOperation(
        'batch_delete',
        { deleteConfigs, options },
        deleteConfigs.length,
        userId
      );

      // 异步执行批量删除
      executeBatchDelete(operation.id, deleteConfigs, options || {});

      res.status(201).json({
        success: true,
        message: '批量删除任务已创建',
        data: {
          operationId: operation.id,
          totalItems: operation.totalItems,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '创建批量删除任务失败',
        error: error instanceof Error ? error.message : String(error),
      });
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
    const userId = (req as any).user.id;

    try {
      const operation = batchOperations.get(operationId);

      if (!operation) {
        return res.status(404).json({
          success: false,
          message: '批量操作不存在',
        });
      }

      if (operation.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权访问此批量操作',
        });
      }

      res.json({
        success: true,
        data: operation,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取批量操作状态失败',
        error: error instanceof Error ? error.message : String(error),
      });
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
    const userId = (req as any).user.id;

    try {
      const operation = batchOperations.get(operationId);

      if (!operation) {
        return res.status(404).json({
          success: false,
          message: '批量操作不存在',
        });
      }

      if (operation.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权取消此批量操作',
        });
      }

      if (operation.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: '无法取消已完成的批量操作',
        });
      }

      completeOperation(operationId, 'cancelled');

      res.json({
        success: true,
        message: '批量操作已取消',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '取消批量操作失败',
        error: error instanceof Error ? error.message : String(error),
      });
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
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, status, type } = req.query;

    try {
      const userOperations = Array.from(batchOperations.values())
        .filter(op => op.userId === userId)
        .filter(op => !status || op.status === status)
        .filter(op => !type || op.type === type)
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedOperations = userOperations.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          operations: paginatedOperations,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: userOperations.length,
            totalPages: Math.ceil(userOperations.length / parseInt(limit as string)),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取批量操作列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
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
    const userId = (req as any).user.id;
    const { olderThan = 7 } = req.query; // 默认清理7天前的操作

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan as string));

      let cleanedCount = 0;
      for (const [operationId, operation] of batchOperations.entries()) {
        if (
          operation.userId === userId &&
          operation.status === 'completed' &&
          operation.endTime &&
          operation.endTime < cutoffDate
        ) {
          batchOperations.delete(operationId);
          cleanedCount++;
        }
      }

      res.json({
        success: true,
        message: '批量操作清理完成',
        data: {
          cleanedCount,
          cutoffDate: cutoffDate.toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '清理批量操作失败',
        error: error instanceof Error ? error.message : String(error),
      });
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
    const userId = (req as any).user.id;

    try {
      const userOperations = Array.from(batchOperations.values()).filter(
        op => op.userId === userId
      );

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
        averageProcessingTime:
          userOperations
            .filter(op => op.endTime && op.startTime)
            .reduce((sum, op) => sum + (op.endTime!.getTime() - op.startTime.getTime()), 0) /
          userOperations.filter(op => op.endTime).length,
      };

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取批量操作统计失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

// 异步执行函数
async function executeBatchTest(
  operationId: string,
  testConfigs: unknown[],
  options: Record<string, unknown>
): Promise<void> {
  const operation = batchOperations.get(operationId);
  if (!operation) return;

  completeOperation(operationId, 'running');

  for (let i = 0; i < testConfigs.length; i++) {
    const config = testConfigs[i];
    try {
      // 模拟测试执行
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

      operation.results.push({
        index: i,
        config,
        result: { success: true, score: Math.random() * 100 },
      });

      updateOperationProgress(operationId, i + 1);
    } catch (error) {
      operation.errors.push(`测试 ${i} 失败: ${error}`);
      updateOperationProgress(operationId, i + 1, 1, [`测试 ${i} 失败: ${error}`]);
    }
  }

  completeOperation(operationId, operation.failedItems > 0 ? 'failed' : 'completed');
}

async function executeBatchExport(
  operationId: string,
  exportConfigs: unknown[],
  format: string,
  options: Record<string, unknown>
): Promise<void> {
  const operation = batchOperations.get(operationId);
  if (!operation) return;

  completeOperation(operationId, 'running');

  for (let i = 0; i < exportConfigs.length; i++) {
    const config = exportConfigs[i];
    try {
      // 模拟导出执行
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));

      operation.results.push({
        index: i,
        config,
        result: { success: true, filePath: `/exports/export_${operationId}_${i}.${format}` },
      });

      updateOperationProgress(operationId, i + 1);
    } catch (error) {
      operation.errors.push(`导出 ${i} 失败: ${error}`);
      updateOperationProgress(operationId, i + 1, 1, [`导出 ${i} 失败: ${error}`]);
    }
  }

  completeOperation(operationId, operation.failedItems > 0 ? 'failed' : 'completed');
}

async function executeBatchDelete(
  operationId: string,
  deleteConfigs: unknown[],
  options: Record<string, unknown>
): Promise<void> {
  const operation = batchOperations.get(operationId);
  if (!operation) return;

  completeOperation(operationId, 'running');

  for (let i = 0; i < deleteConfigs.length; i++) {
    const config = deleteConfigs[i];
    try {
      // 模拟删除执行
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

      operation.results.push({
        index: i,
        config,
        result: { success: true, deleted: true },
      });

      updateOperationProgress(operationId, i + 1);
    } catch (error) {
      operation.errors.push(`删除 ${i} 失败: ${error}`);
      updateOperationProgress(operationId, i + 1, 1, [`删除 ${i} 失败: ${error}`]);
    }
  }

  completeOperation(operationId, operation.failedItems > 0 ? 'failed' : 'completed');
}

export default router;
