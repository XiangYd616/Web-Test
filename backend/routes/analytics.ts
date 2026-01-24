/**
 * 分析路由
 * 职责: 定义分析相关的路由
 */

import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

// 获取分析摘要
router.get('/summary', authMiddleware, asyncHandler(analyticsController.getSummary));

// 获取性能趋势
router.get(
  '/performance-trends',
  authMiddleware,
  asyncHandler(analyticsController.getPerformanceTrends)
);

// 获取建议
router.get(
  '/recommendations',
  authMiddleware,
  asyncHandler(analyticsController.getRecommendations)
);
router.get(
  '/recommendations/:testId',
  authMiddleware,
  asyncHandler(analyticsController.getRecommendations)
);

// 导出报告
router.post('/export', authMiddleware, asyncHandler(analyticsController.exportReport));

// 获取实时统计
router.get('/realtime', authMiddleware, asyncHandler(analyticsController.getRealTimeStats));

export default router;
