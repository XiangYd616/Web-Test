/**
 * 批量操作API路由
 * 业务逻辑委托给 batchController
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import batchController from '../controllers/batchController';

const router = express.Router();

// 批量操作
router.post('/test', authMiddleware, asyncHandler(batchController.batchTest));
router.post('/export', authMiddleware, asyncHandler(batchController.batchExport));
router.post('/delete', authMiddleware, asyncHandler(batchController.batchDelete));

// 操作管理
router.get('/statistics', authMiddleware, asyncHandler(batchController.getStatistics));
router.delete('/cleanup', authMiddleware, asyncHandler(batchController.cleanup));
router.get('/:operationId/status', authMiddleware, asyncHandler(batchController.getStatus));
router.delete('/:operationId', authMiddleware, asyncHandler(batchController.cancel));
router.get('/', authMiddleware, asyncHandler(batchController.getList));

export default router;
