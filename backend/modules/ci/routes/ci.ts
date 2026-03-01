/**
 * CI/CD 集成 API 路由
 * 提供 API Key 管理、Webhook 配置、触发测试、查询结果等端点
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import ciController from '../controllers/ciController';

const router = express.Router();
router.use(authMiddleware);

// API Key 管理
router.get('/api-keys', asyncHandler(ciController.listApiKeys));
router.post('/api-keys', asyncHandler(ciController.createApiKey));
router.post('/api-keys/:keyId/revoke', asyncHandler(ciController.revokeApiKey));

// Webhook 管理
router.get('/webhooks', asyncHandler(ciController.listWebhooks));
router.post('/webhooks', asyncHandler(ciController.createWebhook));
router.put('/webhooks/:webhookId', asyncHandler(ciController.updateWebhook));
router.delete('/webhooks/:webhookId', asyncHandler(ciController.deleteWebhook));

// CI 测试操作
router.post('/trigger', asyncHandler(ciController.triggerTest));
router.get('/status/:testId', asyncHandler(ciController.getTestStatus));
router.get('/result/:testId', asyncHandler(ciController.getTestResult));

export default router;
