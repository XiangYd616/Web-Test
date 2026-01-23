/**
 * 分析路由
 * 职责: 定义分析相关的路由
 */

import express from 'express';
const analyticsController = require('../controllers/analyticsController');
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

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

export default router;
