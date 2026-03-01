/**
 * 告警管理路由
 * 业务逻辑委托给 alertController
 */

import express from 'express';
import Joi from 'joi';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import { validateQuery, validateRequest } from '../../middleware/validation';
import alertController from '../controllers/alertController';

const router = express.Router();

// 验证规则
const alertQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
  status: Joi.string().valid('active', 'acknowledged', 'resolved').default('active'),
  timeRange: Joi.string().valid('1h', '24h', '7d', '30d').default('24h'),
  source: Joi.string(),
  search: Joi.string(),
  workspaceId: Joi.string(),
});

const batchActionSchema = Joi.object({
  action: Joi.string().valid('acknowledge', 'resolve', 'delete').required(),
  alertIds: Joi.array().items(Joi.string()).min(1).required(),
  comment: Joi.string(),
});

const alertRuleSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string(),
  enabled: Joi.boolean().default(true),
  conditions: Joi.object().required(),
  actions: Joi.object().required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
});

// GET /api/system/alerts/rules - 获取告警规则列表
router.get('/rules', authMiddleware, asyncHandler(alertController.getRules));

// POST /api/system/alerts/rules - 创建告警规则
router.post('/rules', authMiddleware, validateRequest(alertRuleSchema), asyncHandler(alertController.createRule));

// PUT /api/system/alerts/rules/:id - 更新告警规则
router.put('/rules/:id', authMiddleware, asyncHandler(alertController.updateRule));

// DELETE /api/system/alerts/rules/:id - 删除告警规则
router.delete('/rules/:id', authMiddleware, asyncHandler(alertController.deleteRule));

// GET /api/system/alerts/statistics - 获取告警统计信息
router.get('/statistics', authMiddleware, asyncHandler(alertController.getStatistics));

// POST /api/system/alerts/batch - 批量操作告警
router.post('/batch', authMiddleware, validateRequest(batchActionSchema), asyncHandler(alertController.batchAction));

// GET /api/system/alerts/:id - 获取单个告警详情
router.get('/:id', authMiddleware, asyncHandler(alertController.getAlertById));

// POST /api/system/alerts/:id/acknowledge - 确认告警
router.post('/:id/acknowledge', authMiddleware, asyncHandler(alertController.acknowledgeAlert));

// POST /api/system/alerts/:id/resolve - 解决告警
router.post('/:id/resolve', authMiddleware, asyncHandler(alertController.resolveAlert));

// GET /api/system/alerts - 获取告警列表
router.get('/', authMiddleware, validateQuery(alertQuerySchema), asyncHandler(alertController.getAlerts));

export default router;
