/**
 * 缓存API路由
 * 业务逻辑委托给 cacheController
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import cacheController from '../controllers/cacheController';

const auth = authMiddleware as express.RequestHandler;
const router = express.Router();

router.get('/info', auth, asyncHandler(cacheController.getInfo));
router.post('/batch', auth, asyncHandler(cacheController.batch));
router.delete('/', auth, asyncHandler(cacheController.clearAll));
router.get('/:key', auth, asyncHandler(cacheController.getValue));
router.post('/:key', auth, asyncHandler(cacheController.setValue));
router.delete('/:key', auth, asyncHandler(cacheController.deleteValue));

export default router;
