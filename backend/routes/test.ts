/**
 * 测试路由 - MVC架构
 * 职责: 只负责路由定义,所有业务逻辑由Controller处理
 */

import express from 'express';
import testController from '../controllers/testController';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { testRateLimiter } from '../middleware/rateLimiter';

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
 * 导出测试结果
 * GET /api/test/:testId/export
 */
router.get('/:testId/export', authMiddleware, asyncHandler(testController.exportTestResult));

/**
 * 获取测试历史
 * GET /api/test/history
 */
router.get('/history', authMiddleware, asyncHandler(testController.getTestHistory));

export default router;
