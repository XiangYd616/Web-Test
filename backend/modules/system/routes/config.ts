/**
 * 配置管理API路由
 * 业务逻辑委托给 configController
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import configController from '../controllers/configController';

const router = express.Router();

// GET /api/config/meta/schema - 获取配置模式
router.get('/meta/schema', asyncHandler(configController.getSchema));

// GET /api/config/meta/history - 获取配置历史
router.get('/meta/history', asyncHandler(configController.getHistory));

// POST /api/config/meta/rollback - 回滚配置
router.post('/meta/rollback', asyncHandler(configController.rollback));

// POST /api/config/meta/reset - 重置配置
router.post('/meta/reset', asyncHandler(configController.reset));

// GET /api/config/meta/status - 获取配置状态
router.get('/meta/status', asyncHandler(configController.getStatus));

// POST /api/config/meta/validate - 验证配置
router.post('/meta/validate', asyncHandler(configController.validate));

// GET /api/config/meta/export - 导出配置
router.get('/meta/export', asyncHandler(configController.exportConfig));

// POST /api/config/meta/import - 导入配置
router.post('/meta/import', asyncHandler(configController.importConfig));

// PUT /api/config - 批量更新配置
router.put('/', asyncHandler(configController.batchUpdate));

// GET /api/config/:key - 获取单个配置
router.get('/:key', asyncHandler(configController.getByKey));

// PUT /api/config/:key - 更新配置
router.put('/:key', asyncHandler(configController.updateByKey));

// GET /api/config - 获取所有配置
router.get('/', asyncHandler(configController.getAll));

export default router;
