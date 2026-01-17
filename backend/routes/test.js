/**
 * 测试路由 (重构版)
 * 职责: 定义测试相关的路由
 */

const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { authMiddleware } = require('../middleware/auth');
const { testRateLimiter } = require('../middleware/rateLimiter');

// 创建并启动测试
router.post('/create-and-start', authMiddleware, testRateLimiter, testController.createAndStart);

// 获取测试状态
router.get('/:testId/status', authMiddleware, testController.getStatus);

// 获取测试结果
router.get('/:testId/result', authMiddleware, testController.getResult);

// 停止测试
router.post('/:testId/stop', authMiddleware, testController.stopTest);

// 删除测试
router.delete('/:testId', authMiddleware, testController.deleteTest);

// 重新运行测试
router.post('/:testId/rerun', authMiddleware, testController.rerunTest);

// 获取测试历史
router.get('/history', authMiddleware, testController.getHistory);

// 批量删除测试
router.post('/batch-delete', authMiddleware, testController.batchDelete);

// 获取运行中的测试
router.get('/running', authMiddleware, testController.getRunningTests);

module.exports = router;
