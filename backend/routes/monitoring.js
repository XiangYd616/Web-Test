/**
 * 监控路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const MonitoringService = require('../services/monitoring/MonitoringService.js');
const { validateRequest } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// 监控服务实例 (将在app.js中初始化)
let monitoringService = null;

// 设置监控服务实例
router.setMonitoringService = (service) => {
  monitoringService = service;
};

// 验证规则
const addSiteSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri().required(),
  monitoring_type: Joi.string().valid('uptime', 'performance', 'security', 'seo').default('uptime'),
  check_interval: Joi.number().integer().min(60).max(3600).default(300),
  timeout: Joi.number().integer().min(5).max(120).default(30),
  config: Joi.object().default({}),
  notification_settings: Joi.object({
    email: Joi.boolean().default(true),
    webhook: Joi.boolean().default(false),
    slack: Joi.boolean().default(false),
    webhook_url: Joi.string().uri().allow(''),
    slack_webhook: Joi.string().uri().allow('')
  }).default({})
});

const updateSiteSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  monitoring_type: Joi.string().valid('uptime', 'performance', 'security', 'seo'),
  check_interval: Joi.number().integer().min(60).max(3600),
  timeout: Joi.number().integer().min(5).max(120),
  config: Joi.object(),
  notification_settings: Joi.object()
});

/**
 * 获取监控站点列表
 * GET /api/monitoring/sites
 */
router.get('/sites', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const { page = 1, limit = 20, status } = req.query;
  const userId = req.user.id;

  const result = await monitoringService.getMonitoringTargets(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    status
  });

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination
  });
}));

/**
 * 添加监控站点
 * POST /api/monitoring/sites
 */
router.post('/sites', authMiddleware, validateRequest(addSiteSchema), asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const targetData = {
    ...req.validatedData,
    user_id: req.user.id
  };

  const newTarget = await monitoringService.addMonitoringTarget(targetData);

  res.status(201).json({
    success: true,
    data: newTarget,
    message: '监控站点添加成功'
  });
}));

/**
 * 获取单个监控站点详情
 * GET /api/monitoring/sites/:id
 */
router.get('/sites/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const siteId = req.params.id;
  const userId = req.user.id;

  // 这里需要添加获取单个站点的方法
  const site = await monitoringService.getMonitoringTarget(siteId, userId);

  if (!site) {
    
        return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '监控站点不存在'
      }
    });
  }

  res.json({
    success: true,
    data: site
  });
}));

/**
 * 更新监控站点
 * PUT /api/monitoring/sites/:id
 */
router.put('/sites/:id', authMiddleware, validateRequest(updateSiteSchema), asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const siteId = req.params.id;
  const userId = req.user.id;
  const updateData = req.validatedData;

  const updatedSite = await monitoringService.updateMonitoringTarget(siteId, userId, updateData);

  if (!updatedSite) {
    
        return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '监控站点不存在'
      }
    });
  }

  res.json({
    success: true,
    data: updatedSite,
    message: '监控站点更新成功'
  });
}));

/**
 * 删除监控站点
 * DELETE /api/monitoring/sites/:id
 */
router.delete('/sites/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const siteId = req.params.id;
  const userId = req.user.id;

  const deleted = await monitoringService.removeMonitoringTarget(siteId, userId);

  if (!deleted) {
    
        return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '监控站点不存在'
      }
    });
  }

  res.json({
    success: true,
    message: '监控站点删除成功'
  });
}));

/**
 * 立即执行监控检查
 * POST /api/monitoring/sites/:id/check
 */
router.post('/sites/:id/check', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const siteId = req.params.id;
  const userId = req.user.id;

  const result = await monitoringService.executeImmediateCheck(siteId, userId);

  res.json({
    success: true,
    data: result,
    message: '监控检查已执行'
  });
}));

/**
 * 获取监控站点历史记录
 * GET /api/monitoring/sites/:id/history
 */
router.get('/sites/:id/history', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const siteId = req.params.id;
  const userId = req.user.id;
  const { page = 1, limit = 50, timeRange = '24h' } = req.query;

  const history = await monitoringService.getMonitoringHistory(siteId, userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    timeRange
  });

  res.json({
    success: true,
    data: history.data,
    pagination: history.pagination
  });
}));

/**
 * 获取监控告警
 * GET /api/monitoring/alerts
 */
router.get('/alerts', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { page = 1, limit = 20, severity, status = 'active' } = req.query;

  const alerts = await monitoringService.getAlerts(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    severity,
    status
  });

  res.json({
    success: true,
    data: alerts.data,
    pagination: alerts.pagination
  });
}));

/**
 * 标记告警为已读
 * PUT /api/monitoring/alerts/:id/read
 */
router.put('/alerts/:id/read', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const alertId = req.params.id;
  const userId = req.user.id;

  const updated = await monitoringService.markAlertAsRead(alertId, userId);

  if (!updated) {
    
        return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '告警不存在'
      }
    });
  }

  res.json({
    success: true,
    message: '告警已标记为已读'
  });
}));

/**
 * 批量操作告警
 * POST /api/monitoring/alerts/batch
 */
router.post('/alerts/batch', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const { action, alertIds } = req.body;
  const userId = req.user.id;

  if (!action || !Array.isArray(alertIds) || alertIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '请提供有效的操作和告警ID列表'
      }
    });
  }

  const result = await monitoringService.batchUpdateAlerts(alertIds, userId, action);

  res.json({
    success: true,
    data: result,
    message: `批量${action}操作完成`
  });
}));

/**
 * 获取监控统计
 * GET /api/monitoring/stats
 */
router.get('/stats', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { timeRange = '24h' } = req.query;

  const stats = await monitoringService.getMonitoringStats(userId);
  const systemStats = await monitoringService.getSystemStats();
  const recentEvents = await monitoringService.getRecentEvents(userId, 10);

  res.json({
    success: true,
    data: {
      ...stats,
      system: systemStats,
      recentEvents,
      timeRange
    }
  });
}));

/**
 * 获取监控服务健康状态
 * GET /api/monitoring/health
 */
router.get('/health', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const health = await monitoringService.getHealthStatus();

  res.json({
    success: true,
    data: health
  });
}));

/**
 * 获取监控数据统计
 * GET /api/monitoring/analytics
 */
router.get('/analytics', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { timeRange = '24h', siteId } = req.query;

  const analytics = await monitoringService.getAnalytics(userId, {
    timeRange,
    siteId
  });

  res.json({
    success: true,
    data: analytics
  });
}));

/**
 * 导出监控数据
 * GET /api/monitoring/export
 */
router.get('/export', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { format = 'json', timeRange = '24h', siteId } = req.query;

  const exportData = await monitoringService.exportData(userId, {
    format,
    timeRange,
    siteId
  });

  // 设置响应头
  const filename = `monitoring-data-${new Date().toISOString().split('T')[0]}.${format}`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
  } else {
    res.setHeader('Content-Type', 'application/json');
  }

  res.send(exportData);
}));

/**
 * 生成监控报告
 * POST /api/monitoring/reports
 */
router.post('/reports', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const {
    reportType = 'summary',
    timeRange = '24h',
    siteIds = [],
    format = 'pdf',
    includeCharts = true,
    includeDetails = true
  } = req.body;

  const report = await monitoringService.generateReport(userId, {
    reportType,
    timeRange,
    siteIds,
    format,
    includeCharts,
    includeDetails
  });

  res.json({
    success: true,
    data: report,
    message: '监控报告生成成功'
  });
}));

/**
 * 获取监控报告列表
 * GET /api/monitoring/reports
 */
router.get('/reports', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  const reports = await monitoringService.getReports(userId, {
    page: parseInt(page),
    limit: parseInt(limit)
  });

  res.json({
    success: true,
    data: reports.data,
    pagination: reports.pagination
  });
}));

/**
 * 下载监控报告
 * GET /api/monitoring/reports/:id/download
 */
router.get('/reports/:id/download', authMiddleware, asyncHandler(async (req, res) => {
  if (!monitoringService) {
    
        return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  const reportId = req.params.id;
  const userId = req.user.id;

  const reportFile = await monitoringService.downloadReport(reportId, userId);

  if (!reportFile) {
    
        return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '报告不存在'
      }
    });
  }

  // 设置响应头
  res.setHeader('Content-Disposition', `attachment; filename="${reportFile.filename}"`);
  res.setHeader('Content-Type', reportFile.contentType);
  res.send(reportFile.data);
}));

module.exports = router;
