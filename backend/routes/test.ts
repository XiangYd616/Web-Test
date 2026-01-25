/**
 * 测试路由 - MVC架构
 * 职责: 只负责路由定义,所有业务逻辑由Controller处理
 */

import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
const testController = require('../controllers/testController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { rateLimiter: testRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ==================== 核心测试路由 ====================

/**
 * 创建并启动测试(统一入口)
 * POST /api/test/create-and-start
 */
router.post(
  '/create-and-start',
  authMiddleware,
  testRateLimiter,
  asyncHandler(testController.createAndStart)
);

/**
 * 获取测试状态
 * GET /api/test/:testId/status
 */
router.get('/:testId/status', authMiddleware, asyncHandler(testController.getStatus));

/**
 * 获取测试结果
 * GET /api/test/:testId/result
 */
router.get('/:testId/result', authMiddleware, asyncHandler(testController.getResult));

/**
 * 获取测试日志
 * GET /api/test/:testId/logs
 */
router.get('/:testId/logs', authMiddleware, asyncHandler(testController.getTestLogs));

/**
 * 获取测试进度
 * GET /api/test/:testId/progress
 */
router.get('/:testId/progress', authMiddleware, asyncHandler(testController.getProgress));

/**
 * 获取测试队列状态
 * GET /api/test/queue/stats
 */
router.get('/queue/stats', authMiddleware, asyncHandler(testController.getQueueStats));

/**
 * 获取死信队列详情
 * GET /api/test/queue/dead
 */
router.get('/queue/dead', authMiddleware, asyncHandler(testController.getDeadLetterQueue));

/**
 * 按 traceId 查询队列任务
 * GET /api/test/queue/trace/:traceId
 */
router.get(
  '/queue/trace/:traceId',
  authMiddleware,
  asyncHandler(testController.getQueueJobsByTraceId)
);

/**
 * 按 traceId 导出任务日志
 * GET /api/test/queue/trace/:traceId/logs
 */
router.get(
  '/queue/trace/:traceId/logs',
  authMiddleware,
  asyncHandler(testController.getQueueTraceLogs)
);

/**
 * 获取单个队列任务详情
 * GET /api/test/queue/:queueName/jobs/:jobId
 */
router.get(
  '/queue/:queueName/jobs/:jobId',
  authMiddleware,
  asyncHandler(testController.getQueueJob)
);

/**
 * 重放死信队列任务
 * POST /api/test/queue/dead/:jobId/replay
 */
router.post(
  '/queue/dead/:jobId/replay',
  authMiddleware,
  requireAdmin,
  asyncHandler(testController.replayDeadLetterJob)
);

/**
 * 停止测试
 * POST /api/test/:testId/stop
 */
router.post('/:testId/stop', authMiddleware, asyncHandler(testController.stopTest));

/**
 * 删除测试
 * DELETE /api/test/:testId
 */
router.delete('/:testId', authMiddleware, asyncHandler(testController.deleteTest));

/**
 * 取消测试
 * POST /api/test/:testId/cancel
 */
router.post('/:testId/cancel', authMiddleware, asyncHandler(testController.cancelTest));

/**
 * 更新测试
 * PUT /api/test/:testId
 */
router.put('/:testId', authMiddleware, asyncHandler(testController.updateTest));

/**
 * 获取测试列表
 * GET /api/test
 */
router.get('/', authMiddleware, asyncHandler(testController.getTestList));

/**
 * 重新运行测试
 * POST /api/test/:testId/rerun
 */
router.post(
  '/:testId/rerun',
  authMiddleware,
  testRateLimiter,
  asyncHandler(testController.rerunTest)
);

/**
 * 批量创建测试
 * POST /api/test/batch
 */
router.post(
  '/batch',
  authMiddleware,
  testRateLimiter,
  asyncHandler(testController.createBatchTests)
);

/**
 * 获取批量测试状态
 * GET /api/test/batch/:batchId
 */
router.get('/batch/:batchId', authMiddleware, asyncHandler(testController.getBatchTestStatus));

/**
 * 删除批量测试
 * DELETE /api/test/batch/:batchId
 */
router.delete('/batch/:batchId', authMiddleware, asyncHandler(testController.deleteBatchTests));

/**
 * 导出测试结果
 * GET /api/test/:testId/export
 */
router.get('/:testId/export', authMiddleware, asyncHandler(testController.exportTestResult));

/**
 * 获取测试历史
 * GET /api/test/history
 */
router.get('/history', authMiddleware, asyncHandler(testController.getTestHistory));

/**
 * 获取测试模板列表
 * GET /api/test/templates
 */
router.get('/templates', authMiddleware, asyncHandler(testController.getTemplates));

/**
 * 创建测试模板
 * POST /api/test/templates
 */
router.post('/templates', authMiddleware, asyncHandler(testController.createTemplate));

/**
 * 更新测试模板
 * PUT /api/test/templates/:templateId
 */
router.put('/templates/:templateId', authMiddleware, asyncHandler(testController.updateTemplate));

/**
 * 预览测试模板
 * POST /api/test/templates/:templateId/preview
 */
router.post(
  '/templates/:templateId/preview',
  authMiddleware,
  asyncHandler(testController.previewTemplate)
);

/**
 * 删除测试模板
 * DELETE /api/test/templates/:templateId
 */
router.delete(
  '/templates/:templateId',
  authMiddleware,
  asyncHandler(testController.deleteTemplate)
);

/**
 * 获取历史记录详情
 * GET /api/test/history/:testId
 */
router.get('/history/:testId', authMiddleware, asyncHandler(testController.getHistoryDetail));

export default router;
