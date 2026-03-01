/**
 * 测试对比API路由
 * 业务逻辑委托给 comparisonController
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import comparisonController from '../controllers/comparisonController';

const router = express.Router();

// 对比操作
router.post('/compare', authMiddleware, asyncHandler(comparisonController.compare));
router.post('/trend', authMiddleware, asyncHandler(comparisonController.trend));
router.post('/benchmark', authMiddleware, asyncHandler(comparisonController.benchmark));
router.post('/summary', asyncHandler(comparisonController.summary));
router.post('/export', asyncHandler(comparisonController.exportReport));

// 查询
router.get(
  '/history/benchmark',
  authMiddleware,
  asyncHandler(comparisonController.historyBenchmark)
);
router.get('/history/:testId', authMiddleware, asyncHandler(comparisonController.historyByTestId));
router.get('/history', authMiddleware, asyncHandler(comparisonController.historyList));
router.get('/benchmarks', asyncHandler(comparisonController.getBenchmarks));
router.get('/metrics', asyncHandler(comparisonController.getMetrics));
router.get(
  '/performance-trend',
  authMiddleware,
  asyncHandler(comparisonController.performanceTrend)
);

export default router;
