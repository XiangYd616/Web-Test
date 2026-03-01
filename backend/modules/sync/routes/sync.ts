/**
 * 云端同步路由 v2
 * 统一同步 API + 旧版单表兼容
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../types';
import * as syncController from '../controllers/syncController';

const router = express.Router();

// 限流
const syncPushLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  keyGenerator: (req: AuthenticatedRequest) => `sync_push_${req.user?.id || req.ip}`,
  message: { success: false, message: '同步推送过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const syncPullLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  keyGenerator: (req: AuthenticatedRequest) => `sync_pull_${req.user?.id || req.ip}`,
  message: { success: false, message: '同步拉取过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== 新版统一同步 API =====

// 统一拉取：GET /api/sync/pull?since=<ISO>&tables=workspaces,collections,...
router.get('/pull', authMiddleware, syncPullLimiter, asyncHandler(syncController.unifiedPull));

// 统一推送：POST /api/sync/push { changes, deviceId }
router.post('/push', authMiddleware, syncPushLimiter, asyncHandler(syncController.unifiedPush));

// 同步状态：GET /api/sync/status
router.get('/status', authMiddleware, asyncHandler(syncController.syncStatus));

// 设备注册：POST /api/sync/register-device
router.post('/register-device', authMiddleware, asyncHandler(syncController.registerDevice));

// 冲突解决：POST /api/sync/resolve-conflict
router.post('/resolve-conflict', authMiddleware, asyncHandler(syncController.resolveConflict));

// ===== 旧版单表兼容 =====

// 单表推送：POST /api/sync/:table/push
router.post(
  '/:table/push',
  authMiddleware,
  syncPushLimiter,
  asyncHandler(syncController.pushRecords)
);

// 单表拉取：GET /api/sync/:table/pull
router.get(
  '/:table/pull',
  authMiddleware,
  syncPullLimiter,
  asyncHandler(syncController.pullRecords)
);

export default router;
