/**
 * 核心测试引擎API路由
 * 业务逻辑委托给 coreTestController
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import coreTestController from '../controllers/coreTestController';

const router = express.Router();
router.use(authMiddleware);

// 引擎状态
router.get('/status', asyncHandler(coreTestController.getStatus));
router.get('/engines/health', asyncHandler(coreTestController.enginesHealth));
router.get('/health', asyncHandler(coreTestController.healthCheck));
router.get('/metrics', asyncHandler(coreTestController.getMetrics));
router.post('/reset', asyncHandler(coreTestController.resetEngine));

// 测试操作
router.post('/run', asyncHandler(coreTestController.runTest));
router.get('/tests', asyncHandler(coreTestController.getAllTests));
router.get('/test/:testId', asyncHandler(coreTestController.getTestStatus));
router.delete('/test/:testId', asyncHandler(coreTestController.cancelTest));

// 基准测试与验证
router.post('/benchmark', asyncHandler(coreTestController.runBenchmark));
router.get('/benchmarks', asyncHandler(coreTestController.getBenchmarks));
router.post('/validate', asyncHandler(coreTestController.validateConfig));

export default router;
