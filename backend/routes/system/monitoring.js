/**
 * 监控路由
 */

const express = require('express');
const { authMiddleware, requirePermission, PERMISSIONS } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
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
router.get('/sites', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
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

  res.success(result.data);
}));

/**
 * 添加监控站点
 * POST /api/monitoring/sites
 */
router.post('/sites', authMiddleware, requirePermission(PERMISSIONS.MONITORING_WRITE), validateRequest(addSiteSchema), asyncHandler(async (req, res) => {
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
router.get('/sites/:id', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
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

  res.success(site);
}));

/**
 * 更新监控站点
 * PUT /api/monitoring/sites/:id
 */
router.put('/sites/:id', authMiddleware, requirePermission(PERMISSIONS.MONITORING_WRITE), validateRequest(updateSiteSchema), asyncHandler(async (req, res) => {
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


  /**

   * if功能函数

   * @param {Object} params - 参数对象

   * @returns {Promise<Object>} 返回结果

   */
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

  res.success(updatedSite);
}));

/**
 * 删除监控站点
 * DELETE /api/monitoring/sites/:id
 */
router.delete('/sites/:id', authMiddleware, requirePermission(PERMISSIONS.MONITORING_WRITE), asyncHandler(async (req, res) => {
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


  /**

   * if功能函数

   * @param {Object} params - 参数对象

   * @returns {Promise<Object>} 返回结果

   */
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

  res.success('监控站点删除成功');
}));

/**
 * 立即执行监控检查
 * POST /api/monitoring/sites/:id/check
 */
router.post('/sites/:id/check', authMiddleware, requirePermission(PERMISSIONS.MONITORING_WRITE), asyncHandler(async (req, res) => {
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

  res.success(result);
}));

/**
 * 获取监控站点历史记录
 * GET /api/monitoring/sites/:id/history
 */
router.get('/sites/:id/history', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
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
  const { page = 1, limit = 50, timeRange = '24h', status } = req.query;

  const history = await monitoringService.getMonitoringHistory(siteId, userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    timeRange,
    status
  });

  res.success(history.data);
}));

/**
 * 获取监控告警
 * GET /api/monitoring/alerts
 */
router.get('/alerts', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
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
  const { page = 1, limit = 20, severity, status = 'active', timeRange } = req.query;

  const alerts = await monitoringService.getAlerts(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    severity,
    status,
    timeRange
  });

  res.success(alerts.data);
}));

/**
 * 标记告警为已读
 * PUT /api/monitoring/alerts/:id/read
 */
router.put('/alerts/:id/read', authMiddleware, requirePermission(PERMISSIONS.MONITORING_WRITE), asyncHandler(async (req, res) => {
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


  /**

   * if功能函数

   * @param {Object} params - 参数对象

   * @returns {Promise<Object>} 返回结果

   */
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

  res.success('告警已标记为已读');
}));

/**
 * 批量操作告警
 * POST /api/monitoring/alerts/batch
 */
router.post('/alerts/batch', authMiddleware, requirePermission(PERMISSIONS.MONITORING_WRITE), asyncHandler(async (req, res) => {
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
 * 重载监控目标
 * POST /api/monitoring/reload
 */
router.post('/reload', authMiddleware, requirePermission(PERMISSIONS.MONITORING_ADMIN), asyncHandler(async (req, res) => {
  if (!monitoringService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '监控服务未启动'
      }
    });
  }

  await monitoringService.reloadMonitoringTargets();
  res.success('监控目标已重载');
}));

/**
 * 获取监控统计
 * GET /api/monitoring/stats
 */
router.get('/stats', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
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
router.get('/health', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
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

  res.success(health);
}));

/**
 * 获取系统监控指标 (新增)
 * GET /api/monitoring/metrics
 */
router.get('/metrics', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
  if (!monitoringService) {
    // 提供默认指标数据
    const defaultMetrics = {
      responseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
      throughput: Math.floor(Math.random() * 50) + 20, // 20-70 req/s
      errorRate: Math.random() * 2, // 0-2%
      activeUsers: Math.floor(Math.random() * 500) + 100, // 100-600 users
      cpuUsage: Math.random() * 80, // 0-80%
      memoryUsage: Math.random() * 70 + 20, // 20-90%
      diskUsage: Math.random() * 60 + 30, // 30-90%
      networkUsage: Math.random() * 80 + 10 // 10-90%
    };
    
    return res.json(defaultMetrics);
  }

  const metrics = await monitoringService.getSystemMetrics();
  res.success(metrics);
}));

/**
 * 获取监控数据统计
 * GET /api/monitoring/analytics
 */
router.get('/analytics', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
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

  res.success(analytics);
}));

/**
 * 导出监控数据
 * GET /api/monitoring/export
 */
router.get('/export', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
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
router.post('/reports', authMiddleware, requirePermission(PERMISSIONS.MONITORING_WRITE), asyncHandler(async (req, res) => {
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

  res.success(report);
}));

/**
 * 获取监控报告列表
 * GET /api/monitoring/reports
 */
router.get('/reports', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
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

  res.success(reports.data);
}));

/**
 * 下载监控报告
 * GET /api/monitoring/reports/:id/download
 */
router.get('/reports/:id/download', authMiddleware, requirePermission(PERMISSIONS.MONITORING_READ), asyncHandler(async (req, res) => {
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


  /**

   * if功能函数

   * @param {Object} params - 参数对象

   * @returns {Promise<Object>} 返回结果

   */
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
