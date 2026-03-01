/**
 * 监控路由
 * 业务逻辑委托给 monitoringController
 */

import express from 'express';
import Joi from 'joi';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import monitoringController from '../controllers/monitoringController';

const router = express.Router();

// 设置监控服务实例（供外部注入）
(router as unknown as { setMonitoringService?: (service: unknown) => void }).setMonitoringService =
  monitoringController.setMonitoringService;

// 验证规则
const addSiteSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri().required(),
  monitoringType: Joi.string().valid('uptime', 'performance', 'security', 'seo').default('uptime'),
  workspaceId: Joi.string(),
  checkInterval: Joi.number().integer().min(60).max(3600).default(300),
  timeout: Joi.number().integer().min(5).max(120).default(30),
  config: Joi.object().default({}),
  notificationSettings: Joi.object({
    email: Joi.boolean().default(true),
    webhook: Joi.boolean().default(false),
    threshold: Joi.object({
      responseTime: Joi.number().default(5000),
      uptime: Joi.number().default(99.9),
      errorRate: Joi.number().default(5),
    }).default(),
  }).default(),
});

// GET /api/system/monitoring/login-geo - 登录地区分布统计
router.get('/login-geo', authMiddleware, asyncHandler(monitoringController.getLoginGeo));

// GET /api/system/monitoring/region-sla - 区域SLA统计
router.get('/region-sla', authMiddleware, asyncHandler(monitoringController.getRegionSla));

// GET /api/system/monitoring/alerts - 获取监控告警列表
router.get('/alerts', authMiddleware, asyncHandler(monitoringController.getAlerts));

// GET /api/system/monitoring/statistics - 获取监控统计
router.get('/statistics', authMiddleware, asyncHandler(monitoringController.getStatistics));

// GET /api/system/monitoring/health - 监控服务健康检查
router.get('/health', authMiddleware, asyncHandler(monitoringController.healthCheck));

// GET /api/system/monitoring/sites - 获取监控站点列表
router.get('/sites', authMiddleware, asyncHandler(monitoringController.getSites));

// POST /api/system/monitoring/sites - 添加监控站点
router.post('/sites', authMiddleware, validateRequest(addSiteSchema), asyncHandler(monitoringController.addSite));

// GET /api/system/monitoring/sites/:id - 获取单个监控站点详情
router.get('/sites/:id', authMiddleware, asyncHandler(monitoringController.getSiteById));

// PUT /api/system/monitoring/sites/:id - 更新监控站点
router.put('/sites/:id', authMiddleware, asyncHandler(monitoringController.updateSite));

// DELETE /api/system/monitoring/sites/:id - 删除监控站点
router.delete('/sites/:id', authMiddleware, asyncHandler(monitoringController.deleteSite));

// POST /api/system/monitoring/sites/:id/check - 手动触发站点检查
router.post('/sites/:id/check', authMiddleware, asyncHandler(monitoringController.checkSite));

// POST /api/system/monitoring/sites/:id/pause - 暂停监控
router.post('/sites/:id/pause', authMiddleware, asyncHandler(monitoringController.pauseSite));

// POST /api/system/monitoring/sites/:id/resume - 恢复监控
router.post('/sites/:id/resume', authMiddleware, asyncHandler(monitoringController.resumeSite));

export default router;
