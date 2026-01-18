/**
 * 测试路由 - MVC架构
 * 职责: 只负责路由定义,所有业务逻辑由Controller处理
 */

const express = require('express');
const router = express.Router();

// 导入中间件
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { testRateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

// 导入Controller
const testController = require('../controllers/testController');

// ==================== 核心测试路由 ====================

/**
 * 创建并启动测试(统一入口)
 * POST /api/test/create-and-start
 */
router.post('/create-and-start', authMiddleware, testRateLimiter, testController.createAndStart);

/**
 * 运行网站测试
 * POST /api/test/website
 */
router.post('/website', optionalAuth, testRateLimiter, testController.runWebsiteTest);

/**
 * 运行性能测试
 * POST /api/test/performance
 */
router.post('/performance', optionalAuth, testRateLimiter, testController.runPerformanceTest);

/**
 * 运行安全测试
 * POST /api/test/security
 */
router.post('/security', optionalAuth, testRateLimiter, testController.runSecurityTest);

/**
 * 运行SEO测试
 * POST /api/test/seo
 */
router.post('/seo', optionalAuth, testRateLimiter, testController.runSeoTest);

/**
 * 运行压力测试
 * POST /api/test/stress
 */
router.post('/stress', authMiddleware, testRateLimiter, testController.runStressTest);

/**
 * 运行API测试
 * POST /api/test/api
 */
router.post('/api', optionalAuth, testRateLimiter, testController.runApiTest);

/**
 * 运行可访问性测试
 * POST /api/test/accessibility
 */
router.post('/accessibility', optionalAuth, testRateLimiter, testController.runAccessibilityTest);

// ==================== 测试管理路由 ====================

/**
 * 获取测试状态
 * GET /api/test/:testId/status
 */
router.get('/:testId/status', authMiddleware, testController.getStatus);

/**
 * 获取测试结果
 * GET /api/test/:testId/result
 */
router.get('/:testId/result', authMiddleware, testController.getResult);

/**
 * 停止测试
 * POST /api/test/:testId/stop
 */
router.post('/:testId/stop', authMiddleware, testController.stopTest);

/**
 * 删除测试
 * DELETE /api/test/:testId
 */
router.delete('/:testId', authMiddleware, testController.deleteTest);

/**
 * 更新测试
 * PUT /api/test/:testId
 */
router.put('/:testId', authMiddleware, testController.updateTest);

/**
 * 重新运行测试
 * POST /api/test/:testId/rerun
 */
router.post('/:testId/rerun', authMiddleware, testController.rerunTest);

/**
 * 获取单个测试详情
 * GET /api/test/:testId
 */
router.get('/:testId', authMiddleware, testController.getResult);

// ==================== 批量操作路由 ====================

/**
 * 批量删除测试
 * POST /api/test/batch-delete
 */
router.post('/batch-delete', authMiddleware, testController.batchDelete);

/**
 * 获取运行中的测试
 * GET /api/test/running
 */
router.get('/running', authMiddleware, testController.getRunningTests);

// ==================== API信息路由 ====================

/**
 * API根路径
 * GET /api/test
 */
router.get('/', asyncHandler((req, res, next) => testController.getApiInfo(req, res, next)));

/**
 * 健康检查
 * GET /api/test/ping
 */
router.get('/ping', (req, res, next) => testController.ping(req, res, next));

module.exports = router;
