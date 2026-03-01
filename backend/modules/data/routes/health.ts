/**
 * 数据库健康检查和监控API路由
 * 业务逻辑委托给 healthController
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import healthController from '../controllers/healthController';

const router = express.Router();

router.get('/health', asyncHandler(healthController.getHealth));
router.get('/status', asyncHandler(healthController.getStatus));
router.get('/stats', asyncHandler(healthController.getSystemStats));
router.post('/test-connection', asyncHandler(healthController.testDbConnection));
router.get('/cache', asyncHandler(healthController.getCacheStatus));
router.get('/performance', asyncHandler(healthController.getPerformance));
router.get('/ready', asyncHandler(healthController.getReady));
router.get('/live', asyncHandler(healthController.getLive));

export default router;
