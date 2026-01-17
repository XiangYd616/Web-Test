/**
 * 分析路由
 * 职责: 定义分析相关的路由
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

// 获取分析摘要
router.get('/summary', authMiddleware, analyticsController.getSummary);

// 获取性能趋势
router.get('/performance-trends', authMiddleware, analyticsController.getPerformanceTrends);

// 获取建议
router.get('/recommendations', authMiddleware, analyticsController.getRecommendations);
router.get('/recommendations/:testId', authMiddleware, analyticsController.getRecommendations);

// 导出报告
router.post('/export', authMiddleware, analyticsController.exportReport);

// 获取实时统计
router.get('/realtime', authMiddleware, analyticsController.getRealTimeStats);

module.exports = router;
