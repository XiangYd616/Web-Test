/**
 * 监控路由
 * 处理实时监控相关的API请求
 */

import { Router } from 'express';
import { MonitoringController } from '../controllers/monitoringController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * 获取监控站点列表
 * GET /api/monitoring/sites
 */
router.get('/sites', authMiddleware, asyncHandler(MonitoringController.getSites));

/**
 * 获取单个监控站点
 * GET /api/monitoring/sites/:siteId
 */
router.get('/sites/:siteId', authMiddleware, asyncHandler(MonitoringController.getSite));

/**
 * 添加监控站点
 * POST /api/monitoring/sites
 */
router.post('/sites', authMiddleware, asyncHandler(MonitoringController.addSite));

/**
 * 更新监控站点
 * PUT /api/monitoring/sites/:siteId
 */
router.put('/sites/:siteId', authMiddleware, asyncHandler(MonitoringController.updateSite));

/**
 * 删除监控站点
 * DELETE /api/monitoring/sites/:siteId
 */
router.delete('/sites/:siteId', authMiddleware, asyncHandler(MonitoringController.deleteSite));

/**
 * 获取监控结果
 * GET /api/monitoring/sites/:siteId/results
 */
router.get('/sites/:siteId/results', authMiddleware, asyncHandler(MonitoringController.getResults));

/**
 * 手动触发检查
 * POST /api/monitoring/sites/:siteId/check
 */
router.post('/sites/:siteId/check', authMiddleware, asyncHandler(MonitoringController.triggerCheck));

/**
 * 获取监控统计
 * GET /api/monitoring/stats
 */
router.get('/stats', authMiddleware, asyncHandler(MonitoringController.getStats));

/**
 * 获取站点统计
 * GET /api/monitoring/sites/:siteId/stats
 */
router.get('/sites/:siteId/stats', authMiddleware, asyncHandler(MonitoringController.getSiteStats));

/**
 * 获取监控概览
 * GET /api/monitoring/overview
 */
router.get('/overview', authMiddleware, asyncHandler(MonitoringController.getOverview));

/**
 * 获取监控警报
 * GET /api/monitoring/alerts
 */
router.get('/alerts', authMiddleware, asyncHandler(MonitoringController.getAlerts));

/**
 * 标记警报为已读
 * PUT /api/monitoring/alerts/:alertId/read
 */
router.put('/alerts/:alertId/read', authMiddleware, asyncHandler(MonitoringController.markAlertAsRead));

/**
 * 获取监控报告
 * GET /api/monitoring/reports
 */
router.get('/reports', authMiddleware, asyncHandler(MonitoringController.getReports));

/**
 * 生成监控报告
 * POST /api/monitoring/reports
 */
router.post('/reports', authMiddleware, asyncHandler(MonitoringController.generateReport));

export default router;
