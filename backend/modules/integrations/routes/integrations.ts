/**
 * 集成路由
 * 业务逻辑委托给 integrationController
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import integrationController from '../controllers/integrationController';

const router = express.Router();

// GET /api/integrations/types - 获取支持的集成类型（无需认证）
router.get('/types', asyncHandler(integrationController.getTypes));

// GET /api/integrations - 获取所有集成配置
router.get('/', authMiddleware, asyncHandler(integrationController.getAll));

// POST /api/integrations - 创建集成配置
router.post('/', authMiddleware, asyncHandler(integrationController.create));

// GET /api/integrations/:id - 获取单个集成详情
router.get('/:id', authMiddleware, asyncHandler(integrationController.getById));

// PUT /api/integrations/:id - 更新集成配置
router.put('/:id', authMiddleware, asyncHandler(integrationController.update));

// DELETE /api/integrations/:id - 删除集成配置
router.delete('/:id', authMiddleware, asyncHandler(integrationController.remove));

// POST /api/integrations/:id/test - 测试集成连接
router.post('/:id/test', authMiddleware, asyncHandler(integrationController.test));

// POST /api/integrations/:id/trigger - 手动触发集成
router.post('/:id/trigger', authMiddleware, asyncHandler(integrationController.trigger));

// GET /api/integrations/:id/logs - 获取集成日志
router.get('/:id/logs', authMiddleware, asyncHandler(integrationController.getLogs));

// POST /api/integrations/:id/enable - 启用集成
router.post('/:id/enable', authMiddleware, asyncHandler(integrationController.enable));

// POST /api/integrations/:id/disable - 禁用集成
router.post('/:id/disable', authMiddleware, asyncHandler(integrationController.disable));

export default router;
