/**
 * 监控路由
 */

import express from 'express';
import Joi from 'joi';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateRequest } from '../../middleware/validation';

interface MonitoringSite {
  id: string;
  name: string;
  url: string;
  monitoringType: 'uptime' | 'performance' | 'security' | 'seo';
  checkInterval: number;
  timeout: number;
  config: Record<string, unknown>;
  notificationSettings: {
    email: boolean;
    sms: boolean;
    webhook: boolean;
    threshold: {
      responseTime: number;
      uptime: number;
      errorRate: number;
    };
  };
  status: 'active' | 'inactive' | 'paused';
  lastCheck?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  statistics: {
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    averageResponseTime: number;
    uptime: number;
    lastError?: string;
  };
}

interface AddSiteRequest {
  name: string;
  url: string;
  monitoringType?: 'uptime' | 'performance' | 'security' | 'seo';
  checkInterval?: number;
  timeout?: number;
  config?: Record<string, unknown>;
  notificationSettings?: {
    email?: boolean;
    sms?: boolean;
    webhook?: boolean;
    threshold?: {
      responseTime?: number;
      uptime?: number;
      errorRate?: number;
    };
  };
}

interface MonitoringAlert {
  id: string;
  siteId: string;
  type: 'down' | 'slow' | 'error' | 'recovery';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, unknown>;
}

interface MonitoringQuery {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'paused';
  monitoringType?: 'uptime' | 'performance' | 'security' | 'seo';
  search?: string;
}

const router = express.Router();

// 监控服务实例 (将在app.js中初始化)
let monitoringService: any = null;

// 设置监控服务实例
router.setMonitoringService = (service: any): void => {
  monitoringService = service;
};

// 验证规则
const addSiteSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri().required(),
  monitoringType: Joi.string().valid('uptime', 'performance', 'security', 'seo').default('uptime'),
  checkInterval: Joi.number().integer().min(60).max(3600).default(300),
  timeout: Joi.number().integer().min(5).max(120).default(30),
  config: Joi.object().default({}),
  notificationSettings: Joi.object({
    email: Joi.boolean().default(true),
    sms: Joi.boolean().default(false),
    webhook: Joi.boolean().default(false),
    threshold: Joi.object({
      responseTime: Joi.number().default(5000),
      uptime: Joi.number().default(99.9),
      errorRate: Joi.number().default(5),
    }).default(),
  }).default(),
});

// 模拟监控站点数据
const monitoringSites: MonitoringSite[] = [
  {
    id: '1',
    name: 'TestWeb 主站',
    url: 'https://testweb.com',
    monitoringType: 'uptime',
    checkInterval: 300,
    timeout: 30,
    config: {},
    notificationSettings: {
      email: true,
      sms: false,
      webhook: false,
      threshold: {
        responseTime: 5000,
        uptime: 99.9,
        errorRate: 5,
      },
    },
    status: 'active',
    lastCheck: new Date(Date.now() - 1000 * 60 * 5),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin',
    statistics: {
      totalChecks: 1440,
      successfulChecks: 1435,
      failedChecks: 5,
      averageResponseTime: 1200,
      uptime: 99.65,
      lastError: 'Connection timeout',
    },
  },
  {
    id: '2',
    name: 'TestWeb API',
    url: 'https://api.testweb.com',
    monitoringType: 'performance',
    checkInterval: 60,
    timeout: 10,
    config: {},
    notificationSettings: {
      email: true,
      sms: true,
      webhook: true,
      threshold: {
        responseTime: 2000,
        uptime: 99.5,
        errorRate: 3,
      },
    },
    status: 'active',
    lastCheck: new Date(Date.now() - 1000 * 60 * 2),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin',
    statistics: {
      totalChecks: 7200,
      successfulChecks: 7180,
      failedChecks: 20,
      averageResponseTime: 800,
      uptime: 99.72,
      lastError: 'Database connection failed',
    },
  },
];

// 模拟监控告警数据
const monitoringAlerts: MonitoringAlert[] = [
  {
    id: '1',
    siteId: '1',
    type: 'down',
    message: '网站无法访问',
    severity: 'critical',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    resolved: false,
    metadata: {
      error: 'Connection refused',
      responseTime: null,
    },
  },
  {
    id: '2',
    siteId: '2',
    type: 'slow',
    message: '响应时间过慢',
    severity: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    resolved: true,
    resolvedAt: new Date(Date.now() - 1000 * 60 * 10),
    metadata: {
      responseTime: 3500,
      threshold: 2000,
    },
  },
];

/**
 * GET /api/system/monitoring/sites
 * 获取监控站点列表
 */
router.get(
  '/sites',
  authMiddleware,
  validateRequest(addSiteSchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const query: MonitoringQuery = req.query;
    const userId = (req as any).user.id;

    try {
      let filteredSites = [...monitoringSites];

      // 按状态过滤
      if (query.status) {
        filteredSites = filteredSites.filter(site => site.status === query.status);
      }

      // 按监控类型过滤
      if (query.monitoringType) {
        filteredSites = filteredSites.filter(site => site.monitoringType === query.monitoringType);
      }

      // 搜索过滤
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        filteredSites = filteredSites.filter(
          site =>
            site.name.toLowerCase().includes(searchLower) ||
            site.url.toLowerCase().includes(searchLower)
        );
      }

      // 排序
      filteredSites.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // 分页
      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedSites = filteredSites.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          sites: paginatedSites,
          pagination: {
            page,
            limit,
            total: filteredSites.length,
            totalPages: Math.ceil(filteredSites.length / limit),
          },
          summary: {
            total: monitoringSites.length,
            active: monitoringSites.filter(s => s.status === 'active').length,
            inactive: monitoringSites.filter(s => s.status === 'inactive').length,
            paused: monitoringSites.filter(s => s.status === 'paused').length,
            byType: monitoringSites.reduce(
              (acc, site) => {
                acc[site.monitoringType] = (acc[site.monitoringType] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取监控站点列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/monitoring/sites
 * 添加监控站点
 */
router.post(
  '/sites',
  authMiddleware,
  validateRequest(addSiteSchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const siteData: AddSiteRequest = req.body;

    try {
      const newSite: MonitoringSite = {
        id: Date.now().toString(),
        name: siteData.name,
        url: siteData.url,
        monitoringType: siteData.monitoringType || 'uptime',
        checkInterval: siteData.checkInterval || 300,
        timeout: siteData.timeout || 30,
        config: siteData.config || {},
        notificationSettings: {
          email: true,
          sms: false,
          webhook: false,
          threshold: {
            responseTime: 5000,
            uptime: 99.9,
            errorRate: 5,
          },
          ...siteData.notificationSettings,
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        statistics: {
          totalChecks: 0,
          successfulChecks: 0,
          failedChecks: 0,
          averageResponseTime: 0,
          uptime: 100,
        },
      };

      monitoringSites.push(newSite);

      // 启动监控
      if (monitoringService) {
        await monitoringService.startMonitoring(newSite.id);
      }

      res.status(201).json({
        success: true,
        message: '监控站点添加成功',
        data: newSite,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '添加监控站点失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/monitoring/sites/:id
 * 获取单个监控站点详情
 */
router.get(
  '/sites/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const site = monitoringSites.find(s => s.id === id);

      if (!site) {
        return res.status(404).json({
          success: false,
          message: '监控站点不存在',
        });
      }

      res.json({
        success: true,
        data: site,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取监控站点详情失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * PUT /api/system/monitoring/sites/:id
 * 更新监控站点
 */
router.put(
  '/sites/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updateData = req.body;

    try {
      const siteIndex = monitoringSites.findIndex(s => s.id === id);

      if (siteIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '监控站点不存在',
        });
      }

      // 更新站点信息
      Object.assign(monitoringSites[siteIndex], updateData);
      monitoringSites[siteIndex].updatedAt = new Date();

      // 如果监控服务存在，更新监控配置
      if (monitoringService) {
        await monitoringService.updateMonitoring(id, updateData);
      }

      res.json({
        success: true,
        message: '监控站点更新成功',
        data: monitoringSites[siteIndex],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '更新监控站点失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * DELETE /api/system/monitoring/sites/:id
 * 删除监控站点
 */
router.delete(
  '/sites/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const siteIndex = monitoringSites.findIndex(s => s.id === id);

      if (siteIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '监控站点不存在',
        });
      }

      const deletedSite = monitoringSites.splice(siteIndex, 1)[0];

      // 停止监控
      if (monitoringService) {
        await monitoringService.stopMonitoring(id);
      }

      res.json({
        success: true,
        message: '监控站点删除成功',
        data: deletedSite,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '删除监控站点失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/monitoring/sites/:id/check
 * 手动触发站点检查
 */
router.post(
  '/sites/:id/check',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const site = monitoringSites.find(s => s.id === id);

      if (!site) {
        return res.status(404).json({
          success: false,
          message: '监控站点不存在',
        });
      }

      // 执行检查
      const checkResult = await monitoringService.checkSite(id);

      // 更新统计信息
      site.statistics.totalChecks++;
      if (checkResult.success) {
        site.statistics.successfulChecks++;
      } else {
        site.statistics.failedChecks++;
        site.statistics.lastError = checkResult.error;
      }
      site.statistics.averageResponseTime = checkResult.responseTime || 0;
      site.statistics.uptime =
        (site.statistics.successfulChecks / site.statistics.totalChecks) * 100;
      site.lastCheck = new Date();

      res.json({
        success: true,
        message: '站点检查完成',
        data: checkResult,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '站点检查失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/monitoring/sites/:id/pause
 * 暂停监控
 */
router.post(
  '/sites/:id/pause',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const siteIndex = monitoringSites.findIndex(s => s.id === id);

      if (siteIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '监控站点不存在',
        });
      }

      monitoringSites[siteIndex].status = 'paused';

      // 暂停监控
      if (monitoringService) {
        await monitoringService.pauseMonitoring(id);
      }

      res.json({
        success: true,
        message: '监控已暂停',
        data: monitoringSites[siteIndex],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '暂停监控失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/monitoring/sites/:id/resume
 * 恢复监控
 */
router.post(
  '/sites/:id/resume',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const siteIndex = monitoringSites.findIndex(s => s.id === id);

      if (siteIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '监控站点不存在',
        });
      }

      monitoringSites[siteIndex].status = 'active';

      // 恢复监控
      if (monitoringService) {
        await monitoringService.resumeMonitoring(id);
      }

      res.json({
        success: true,
        message: '监控已恢复',
        data: monitoringSites[siteIndex],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '恢复监控失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/monitoring/alerts
 * 获取监控告警列表
 */
router.get(
  '/alerts',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { page = 1, limit = 20, type, severity, resolved } = req.query;

    try {
      let filteredAlerts = [...monitoringAlerts];

      // 按类型过滤
      if (type) {
        filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
      }

      // 按严重程度过滤
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
      }

      // 按解决状态过滤
      if (resolved !== undefined) {
        const isResolved = resolved === 'true';
        filteredAlerts = filteredAlerts.filter(alert => alert.resolved === isResolved);
      }

      // 排序
      filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // 分页
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          alerts: paginatedAlerts,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: filteredAlerts.length,
            totalPages: Math.ceil(filteredAlerts.length / parseInt(limit as string)),
          },
          summary: {
            total: monitoringAlerts.length,
            resolved: monitoringAlerts.filter(a => a.resolved).length,
            unresolved: monitoringAlerts.filter(a => !a.resolved).length,
            byType: monitoringAlerts.reduce(
              (acc, alert) => {
                acc[alert.type] = (acc[alert.type] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
            bySeverity: monitoringAlerts.reduce(
              (acc, alert) => {
                acc[alert.severity] = (acc[alert.severity] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取监控告警失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/monitoring/statistics
 * 获取监控统计
 */
router.get(
  '/statistics',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { timeRange = '24h' } = req.query;

    try {
      const statistics = {
        sites: {
          total: monitoringSites.length,
          active: monitoringSites.filter(s => s.status === 'active').length,
          inactive: monitoringSites.filter(s => s.status === 'inactive').length,
          paused: monitoringSites.filter(s => s.status === 'paused').length,
        },
        checks: {
          total: monitoringSites.reduce((sum, site) => sum + site.statistics.totalChecks, 0),
          successful: monitoringSites.reduce(
            (sum, site) => sum + site.statistics.successfulChecks,
            0
          ),
          failed: monitoringSites.reduce((sum, site) => sum + site.statistics.failedChecks, 0),
          averageResponseTime:
            monitoringSites.reduce((sum, site) => sum + site.statistics.averageResponseTime, 0) /
            monitoringSites.length,
          averageUptime:
            monitoringSites.reduce((sum, site) => sum + site.statistics.uptime, 0) /
            monitoringSites.length,
        },
        alerts: {
          total: monitoringAlerts.length,
          resolved: monitoringAlerts.filter(a => a.resolved).length,
          unresolved: monitoringAlerts.filter(a => !a.resolved).length,
          byType: monitoringAlerts.reduce(
            (acc, alert) => {
              acc[alert.type] = (acc[alert.type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          bySeverity: monitoringAlerts.reduce(
            (acc, alert) => {
              acc[alert.severity] = (acc[alert.severity] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
        uptime: {
          overall:
            monitoringSites.reduce((sum, site) => sum + site.statistics.uptime, 0) /
            monitoringSites.length,
          bySite: monitoringSites.map(site => ({
            id: site.id,
            name: site.name,
            uptime: site.statistics.uptime,
          })),
        },
      };

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取监控统计失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/monitoring/health
 * 监控服务健康检查
 */
router.get(
  '/health',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const health = await monitoringService.healthCheck();

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      res.status(500).json({
        ...error,
        success: false,
        message: '监控服务健康检查失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
