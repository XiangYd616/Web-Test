/**
 * 告警管理路由
 */

import express from 'express';
import Joi from 'joi';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateQuery, validateRequest } from '../../middleware/validation';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  source: string;
  timestamp: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
  metadata: Record<string, unknown>;
  tags: string[];
}

interface AlertQuery {
  page?: number;
  limit?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'active' | 'acknowledged' | 'resolved';
  timeRange?: '1h' | '24h' | '7d' | '30d';
  source?: string;
  search?: string;
}

interface BatchAction {
  action: 'acknowledge' | 'resolve' | 'delete';
  alertIds: string[];
  comment?: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

const router = express.Router();

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
  };
}

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

// 告警服务实例 (将在app.js中初始化)
let alertService: unknown = null;

// 设置告警服务实例
router.setAlertService = (service: unknown): void => {
  alertService = service;
};

// 验证规则
const alertQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
  status: Joi.string().valid('active', 'acknowledged', 'resolved').default('active'),
  timeRange: Joi.string().valid('1h', '24h', '7d', '30d').default('24h'),
  source: Joi.string(),
  search: Joi.string(),
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

// 模拟告警数据
const alerts: Alert[] = [
  {
    id: '1',
    title: 'CPU使用率过高',
    description: '服务器CPU使用率超过80%',
    severity: 'high',
    status: 'active',
    source: 'system',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    metadata: {
      cpuUsage: 85,
      serverId: 'server-001',
    },
    tags: ['performance', 'cpu', 'server'],
  },
  {
    id: '2',
    title: '内存不足',
    description: '可用内存低于20%',
    severity: 'medium',
    status: 'acknowledged',
    source: 'system',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    acknowledgedAt: new Date(Date.now() - 1000 * 60 * 10),
    acknowledgedBy: 'admin',
    metadata: {
      memoryUsage: 85,
      availableMemory: '2GB',
      totalMemory: '16GB',
    },
    tags: ['performance', 'memory', 'server'],
  },
  {
    id: '3',
    title: '数据库连接失败',
    description: '无法连接到主数据库',
    severity: 'critical',
    status: 'resolved',
    source: 'database',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 5),
    resolvedBy: 'admin',
    metadata: {
      database: 'primary',
      error: 'Connection timeout',
    },
    tags: ['database', 'connection', 'critical'],
  },
];

// 模拟告警规则数据
const alertRules: AlertRule[] = [
  {
    id: '1',
    name: 'CPU使用率告警',
    description: '当CPU使用率超过80%时触发告警',
    enabled: true,
    conditions: {
      metric: 'cpu_usage',
      operator: '>',
      threshold: 80,
      duration: '5m',
    },
    actions: {
      type: 'notification',
      channels: ['email', 'slack'],
    },
    severity: 'high',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin',
  },
  {
    id: '2',
    name: '内存使用率告警',
    description: '当内存使用率超过90%时触发告警',
    enabled: true,
    conditions: {
      metric: 'memory_usage',
      operator: '>',
      threshold: 90,
      duration: '2m',
    },
    actions: {
      type: 'notification',
      channels: ['email'],
    },
    severity: 'medium',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin',
  },
];

/**
 * GET /api/system/alerts
 * 获取告警列表
 */
router.get(
  '/',
  authMiddleware,
  validateQuery(alertQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const query = req.query as AlertQuery;
    const userId = getUserId(req);

    try {
      let filteredAlerts = [...alerts];

      // 按严重程度过滤
      if (query.severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === query.severity);
      }

      // 按状态过滤
      if (query.status) {
        filteredAlerts = filteredAlerts.filter(alert => alert.status === query.status);
      }

      // 按来源过滤
      if (query.source) {
        filteredAlerts = filteredAlerts.filter(alert => alert.source === query.source);
      }

      // 搜索过滤
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        filteredAlerts = filteredAlerts.filter(
          alert =>
            alert.title.toLowerCase().includes(searchLower) ||
            alert.description.toLowerCase().includes(searchLower)
        );
      }

      // 时间范围过滤
      if (query.timeRange) {
        const now = new Date();
        let cutoffTime: Date;

        switch (query.timeRange) {
          case '1h':
            cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case '24h':
            cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        filteredAlerts = filteredAlerts.filter(alert => alert.timestamp >= cutoffTime);
      }

      // 排序
      filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // 分页
      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          alerts: paginatedAlerts,
          pagination: {
            page,
            limit,
            total: filteredAlerts.length,
            totalPages: Math.ceil(filteredAlerts.length / limit),
          },
          summary: {
            total: alerts.length,
            active: alerts.filter(a => a.status === 'active').length,
            acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
            resolved: alerts.filter(a => a.status === 'resolved').length,
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取告警列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/alerts/:id
 * 获取单个告警详情
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const alert = alerts.find(a => a.id === id);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: '告警不存在',
        });
      }

      res.json({
        success: true,
        data: alert,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取告警详情失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/alerts/:id/acknowledge
 * 确认告警
 */
router.post(
  '/:id/acknowledge',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = getUserId(req);

    try {
      const alertIndex = alerts.findIndex(a => a.id === id);

      if (alertIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '告警不存在',
        });
      }

      if (alerts[alertIndex].status !== 'active') {
        return res.status(400).json({
          success: false,
          message: '只能确认活跃的告警',
        });
      }

      alerts[alertIndex].status = 'acknowledged';
      alerts[alertIndex].acknowledgedAt = new Date();
      alerts[alertIndex].acknowledgedBy = userId;

      res.json({
        success: true,
        message: '告警已确认',
        data: alerts[alertIndex],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '确认告警失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/alerts/:id/resolve
 * 解决告警
 */
router.post(
  '/:id/resolve',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = getUserId(req);

    try {
      const alertIndex = alerts.findIndex(a => a.id === id);

      if (alertIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '告警不存在',
        });
      }

      alerts[alertIndex].status = 'resolved';
      alerts[alertIndex].resolvedAt = new Date();
      alerts[alertIndex].resolvedBy = userId;

      res.json({
        success: true,
        message: '告警已解决',
        data: alerts[alertIndex],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '解决告警失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/alerts/batch
 * 批量操作告警
 */
router.post(
  '/batch',
  authMiddleware,
  validateRequest(batchActionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { action, alertIds, comment } = req.body;
    const userId = getUserId(req);

    try {
      const results = [];

      for (const alertId of alertIds) {
        const alertIndex = alerts.findIndex(a => a.id === alertId);

        if (alertIndex === -1) {
          results.push({ alertId, success: false, error: '告警不存在' });
          continue;
        }

        try {
          switch (action) {
            case 'acknowledge':
              if (alerts[alertIndex].status === 'active') {
                alerts[alertIndex].status = 'acknowledged';
                alerts[alertIndex].acknowledgedAt = new Date();
                alerts[alertIndex].acknowledgedBy = userId;
                results.push({ alertId, success: true });
              } else {
                results.push({ alertId, success: false, error: '告警状态不正确' });
              }
              break;

            case 'resolve':
              alerts[alertIndex].status = 'resolved';
              alerts[alertIndex].resolvedAt = new Date();
              alerts[alertIndex].resolvedBy = userId;
              results.push({ alertId, success: true });
              break;

            case 'delete':
              alerts.splice(alertIndex, 1);
              results.push({ alertId, success: true });
              break;

            default:
              results.push({ alertId, success: false, error: '不支持的操作' });
          }
        } catch (error) {
          results.push({
            alertId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      res.json({
        success: true,
        message: `批量${action}操作完成`,
        data: {
          action,
          results,
          summary: {
            total: alertIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '批量操作失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/alerts/rules
 * 获取告警规则列表
 */
router.get(
  '/rules',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      res.json({
        success: true,
        data: alertRules,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取告警规则失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/alerts/rules
 * 创建告警规则
 */
router.post(
  '/rules',
  authMiddleware,
  validateRequest(alertRuleSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const ruleData = req.body;

    try {
      const newRule: AlertRule = {
        id: Date.now().toString(),
        ...ruleData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      };

      alertRules.push(newRule);

      res.status(201).json({
        success: true,
        message: '告警规则创建成功',
        data: newRule,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '创建告警规则失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * PUT /api/system/alerts/rules/:id
 * 更新告警规则
 */
router.put(
  '/rules/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
      const ruleIndex = alertRules.findIndex(r => r.id === id);

      if (ruleIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '告警规则不存在',
        });
      }

      alertRules[ruleIndex] = {
        ...alertRules[ruleIndex],
        ...updateData,
        updatedAt: new Date(),
      };

      res.json({
        success: true,
        message: '告警规则更新成功',
        data: alertRules[ruleIndex],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '更新告警规则失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * DELETE /api/system/alerts/rules/:id
 * 删除告警规则
 */
router.delete(
  '/rules/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const ruleIndex = alertRules.findIndex(r => r.id === id);

      if (ruleIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '告警规则不存在',
        });
      }

      alertRules.splice(ruleIndex, 1);

      res.json({
        success: true,
        message: '告警规则删除成功',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '删除告警规则失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/alerts/statistics
 * 获取告警统计信息
 */
router.get(
  '/statistics',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { timeRange = '24h' } = req.query;

    try {
      const now = new Date();
      let cutoffTime: Date;

      switch (timeRange) {
        case '1h':
          cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const recentAlerts = alerts.filter(alert => alert.timestamp >= cutoffTime);

      const statistics = {
        total: recentAlerts.length,
        byStatus: {
          active: recentAlerts.filter(a => a.status === 'active').length,
          acknowledged: recentAlerts.filter(a => a.status === 'acknowledged').length,
          resolved: recentAlerts.filter(a => a.status === 'resolved').length,
        },
        bySeverity: {
          critical: recentAlerts.filter(a => a.severity === 'critical').length,
          high: recentAlerts.filter(a => a.severity === 'high').length,
          medium: recentAlerts.filter(a => a.severity === 'medium').length,
          low: recentAlerts.filter(a => a.severity === 'low').length,
        },
        bySource: recentAlerts.reduce(
          (acc, alert) => {
            acc[alert.source] = (acc[alert.source] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        averageResolutionTime:
          recentAlerts
            .filter(a => a.status === 'resolved' && a.resolvedAt)
            .reduce(
              (sum, alert) => sum + (alert.resolvedAt!.getTime() - alert.timestamp.getTime()),
              0
            ) / recentAlerts.filter(a => a.status === 'resolved').length,
        rules: {
          total: alertRules.length,
          enabled: alertRules.filter(r => r.enabled).length,
          disabled: alertRules.filter(r => !r.enabled).length,
        },
      };

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取告警统计失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
