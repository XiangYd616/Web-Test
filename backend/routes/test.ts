/**
 * 测试路由 - MVC架构
 * 职责: 只负责路由定义,所有业务逻辑由Controller处理
 */

import express from 'express';
const testController = require('../controllers/testController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
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
 * 运行网站测试
 * POST /api/test/website
 */
router.post('/website', optionalAuth, testRateLimiter, asyncHandler(testController.runWebsiteTest));

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
 * 获取测试调度列表
 * GET /api/test/schedules
 */
router.get('/schedules', authMiddleware, asyncHandler(testController.getSchedules));

/**
 * 获取测试调度详情
 * GET /api/test/schedules/:scheduleId
 */
router.get(
  '/schedules/:scheduleId',
  authMiddleware,
  asyncHandler(testController.getScheduleDetail)
);

/**
 * 创建测试调度
 * POST /api/test/schedules
 */
router.post('/schedules', authMiddleware, asyncHandler(testController.createSchedule));

/**
 * 更新测试调度
 * PUT /api/test/schedules/:scheduleId
 */
router.put('/schedules/:scheduleId', authMiddleware, asyncHandler(testController.updateSchedule));

/**
 * 删除测试调度
 * DELETE /api/test/schedules/:scheduleId
 */
router.delete(
  '/schedules/:scheduleId',
  authMiddleware,
  asyncHandler(testController.deleteSchedule)
);

/**
 * 启用/暂停调度
 * POST /api/test/schedules/:scheduleId/toggle
 */
router.post(
  '/schedules/:scheduleId/toggle',
  authMiddleware,
  asyncHandler(testController.toggleSchedule)
);

/**
 * 立即执行调度任务
 * POST /api/test/schedules/:scheduleId/execute
 */
router.post(
  '/schedules/:scheduleId/execute',
  authMiddleware,
  asyncHandler(testController.executeSchedule)
);

/**
 * 获取调度执行记录
 * GET /api/test/schedules/:scheduleId/runs
 */
router.get(
  '/schedules/:scheduleId/runs',
  authMiddleware,
  asyncHandler(testController.getScheduleRuns)
);

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
