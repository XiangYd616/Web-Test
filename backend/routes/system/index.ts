/**
 * 系统路由
 * 处理系统配置、监控等管理功能
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../../middleware/errorHandler';
import configRoutes from './config';
import monitoringRoutes from './monitoring';
import reportRoutes from './reports';
const { getPool, getStats, healthCheck } = require('../../config/database');
const { requireRole } = require('../../middleware/auth');
const { getAlertManager } = require('../../alert/AlertManager');
const { MonitoringService } = require('../../services/monitoring/MonitoringService');

const router = express.Router();

const getUserId = (req: express.Request): string => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

const parseListParam = (value: unknown): string[] | undefined => {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};

const escapeCsvValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

// 初始化监控服务并注入路由
const monitoringService = new MonitoringService(getPool());
const alertService = getAlertManager();

(monitoringRoutes as { setMonitoringService?: (service: unknown) => void }).setMonitoringService?.(
  monitoringService
);

monitoringService.on('alert:triggered', (alertData: unknown) => {
  try {
    alertService.emit('alert', alertData);
  } catch (error) {
    console.error('处理监控告警失败:', error);
  }
});

alertService.on('alert', async (alertData: unknown) => {
  const payload = alertData as {
    alertId?: string;
    type?: string;
    severity?: string;
    timestamp?: Date;
    data?: { message?: string } & Record<string, unknown>;
  };
  if (!payload?.alertId || !payload.type || !payload.severity) {
    return;
  }
  try {
    await monitoringService.insertTestAlert({
      alertId: payload.alertId,
      alertType: payload.type,
      severity: payload.severity,
      message: payload.data?.message,
      details: payload.data,
      createdAt: payload.timestamp?.toISOString(),
    });
  } catch (error) {
    console.error('推送测试告警到监控服务失败:', error);
  }
});

monitoringService.start().catch((error: unknown) => {
  console.error('启动监控服务失败:', error);
});

/**
 * GET /api/system/test-alerts/export
 * 导出测试告警（仅管理员）
 */
router.get(
  '/test-alerts/export',
  requireRole('admin'),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const {
        format = 'json',
        severity,
        type,
        search,
        startTime,
        endTime,
        limit,
        offset,
      } = req.query;
      const severityList = parseListParam(severity);
      const typeList = parseListParam(type);
      const pageLimit = limit ? Number(limit) : 1000;
      const pageOffset = offset ? Number(offset) : 0;
      const alerts = await alertService.getTestAlerts({
        page: Math.floor(pageOffset / pageLimit) + 1,
        limit: pageLimit,
        severity: severityList,
        type: typeList,
        search: search as string | undefined,
        startTime: startTime as string | undefined,
        endTime: endTime as string | undefined,
      });

      if (format === 'csv') {
        const header = ['id', 'alert_type', 'severity', 'message', 'created_at', 'data'];
        const lines = [header.join(',')];
        alerts.data.forEach((alert: Record<string, unknown>) => {
          lines.push(
            [
              escapeCsvValue(alert.id),
              escapeCsvValue(alert.alert_type),
              escapeCsvValue(alert.severity),
              escapeCsvValue(alert.message),
              escapeCsvValue(alert.created_at),
              escapeCsvValue(JSON.stringify(alert.data ?? {})),
            ].join(',')
          );
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="test-alerts.csv"');
        return res.status(200).send(lines.join('\n'));
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="test-alerts.json"');
      return res.status(200).send(JSON.stringify(alerts.data, null, 2));
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '导出测试告警失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/test-alerts
 * 获取测试告警（仅管理员）
 */
router.get(
  '/test-alerts',
  requireRole('admin'),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { page = 1, limit = 20, severity, type, search, startTime, endTime } = req.query;
      const severityList = parseListParam(severity);
      const typeList = parseListParam(type);
      const alerts = await alertService.getTestAlerts({
        page: Number(page),
        limit: Number(limit),
        severity: severityList,
        type: typeList,
        search: search as string | undefined,
        startTime: startTime as string | undefined,
        endTime: endTime as string | undefined,
      });
      return res.json({
        success: true,
        data: {
          alerts: alerts.data,
          pagination: alerts.pagination,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取测试告警失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/health
 * 系统健康检查
 */
router.get(
  '/health',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const dbHealth = await healthCheck();
      const monitoringHealth = await monitoringService.getHealthStatus();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        monitoring: monitoringHealth,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      };

      return res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '系统健康检查失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/stats
 * 系统统计信息
 */
router.get(
  '/stats',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const dbStats = getStats();
      const monitoringStats = await monitoringService.getStatistics();
      const alertStats = alertService.getStatistics();

      const stats = {
        database: dbStats,
        monitoring: monitoringStats,
        alerts: alertStats,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        timestamp: new Date().toISOString(),
      };

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取系统统计失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/info
 * 系统信息
 */
router.get(
  '/info',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const info = {
        name: 'TestWeb Backend',
        version: process.env.npm_package_version || '1.0.0',
        description: 'TestWeb 后端服务',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        startTime: new Date(Date.now() - process.uptime() * 1000),
        timestamp: new Date().toISOString(),
      };

      return res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取系统信息失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/restart
 * 重启系统 (仅管理员)
 */
router.post(
  '/restart',
  requireRole('admin'),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { graceful = true } = req.body;

      // 停止接受新请求
      if (graceful) {
        await monitoringService.stop();
        alertService.removeAllListeners();
      }

      // 发送重启信号
      setTimeout(() => {
        process.exit(0);
      }, 1000);

      return res.json({
        success: true,
        message: '系统重启中...',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '系统重启失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/logs
 * 获取系统日志 (仅管理员)
 */
router.get(
  '/logs',
  requireRole('admin'),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { level = 'info', limit = 100, offset = 0 } = req.query;

      const logs = await monitoringService.getLogs({
        level: level as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      return res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取系统日志失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/config
 * 更新系统配置 (仅管理员)
 */
router.post(
  '/config',
  requireRole('admin'),
  [
    body('key').notEmpty().withMessage('配置键不能为空'),
    body('value').notEmpty().withMessage('配置值不能为空'),
  ],
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '配置验证失败',
        errors: errors.array(),
      });
    }

    try {
      const { key, value } = req.body;

      // 更新环境变量
      process.env[key] = value;

      // 记录配置变更
      await monitoringService.logConfigChange(key, value, getUserId(req));

      return res.json({
        success: true,
        message: '配置更新成功',
        data: { key, value },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '更新配置失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/config
 * 获取系统配置 (仅管理员)
 */
router.get(
  '/config',
  requireRole('admin'),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { category } = req.query;

      let config: Record<string, unknown> = {};

      switch (category) {
        case 'database':
          config = {
            DB_HOST: process.env.DB_HOST,
            DB_PORT: process.env.DB_PORT,
            DB_NAME: process.env.DB_NAME,
            DB_USER: process.env.DB_USER,
            DB_MAX_CONNECTIONS: process.env.DB_MAX_CONNECTIONS,
            DB_MIN_CONNECTIONS: process.env.DB_MIN_CONNECTIONS,
          };
          break;
        case 'server':
          config = {
            PORT: process.env.PORT,
            NODE_ENV: process.env.NODE_ENV,
            LOG_LEVEL: process.env.LOG_LEVEL,
            CORS_ORIGIN: process.env.CORS_ORIGIN,
          };
          break;
        case 'security':
          config = {
            JWT_SECRET: process.env.JWT_SECRET ? '***' : undefined,
            JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
            BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
            SESSION_SECRET: process.env.SESSION_SECRET ? '***' : undefined,
          };
          break;
        default:
          // 返回所有非敏感配置
          config = {
            PORT: process.env.PORT,
            NODE_ENV: process.env.NODE_ENV,
            LOG_LEVEL: process.env.LOG_LEVEL,
            CORS_ORIGIN: process.env.CORS_ORIGIN,
            JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
            BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
            DB_HOST: process.env.DB_HOST,
            DB_PORT: process.env.DB_PORT,
            DB_NAME: process.env.DB_NAME,
            DB_MAX_CONNECTIONS: process.env.DB_MAX_CONNECTIONS,
            DB_MIN_CONNECTIONS: process.env.DB_MIN_CONNECTIONS,
          };
      }

      return res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取配置失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/metrics
 * 获取系统指标
 */
router.get(
  '/metrics',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const metrics = await monitoringService.getMetrics();

      return res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取系统指标失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/maintenance
 * 启用/禁用维护模式 (仅管理员)
 */
router.post(
  '/maintenance',
  requireRole('admin'),
  [
    body('enabled').isBoolean().withMessage('enabled必须是布尔值'),
    body('message').optional().isString().withMessage('message必须是字符串'),
  ],
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array(),
      });
    }

    try {
      const { enabled, message } = req.body;

      // 设置维护模式
      process.env.MAINTENANCE_MODE = enabled ? 'true' : 'false';

      // 记录维护模式变更
      await monitoringService.logMaintenanceModeChange(enabled, message, getUserId(req));

      return res.json({
        success: true,
        message: enabled ? '维护模式已启用' : '维护模式已禁用',
        data: {
          enabled,
          message: message || (enabled ? '系统正在维护中' : ''),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '设置维护模式失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/backup
 * 创建系统备份 (仅管理员)
 */
router.post(
  '/backup',
  requireRole('admin'),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { type = 'full', includeLogs = false } = req.body;

      const backup = await monitoringService.createBackup({
        type,
        includeLogs,
        createdBy: getUserId(req),
      });

      return res.json({
        success: true,
        message: '备份创建成功',
        data: backup,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '创建备份失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/backup/list
 * 获取备份列表 (仅管理员)
 */
router.get(
  '/backup/list',
  requireRole('admin'),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const backups = await monitoringService.getBackupList();

      return res.json({
        success: true,
        data: backups,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取备份列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * DELETE /api/system/backup/:id
 * 删除备份 (仅管理员)
 */
router.delete(
  '/backup/:id',
  requireRole('admin'),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;

      await monitoringService.deleteBackup(id);

      return res.json({
        success: true,
        message: '备份删除成功',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '删除备份失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

// 挂载子路由
router.use('/monitoring', monitoringRoutes);
router.use('/reports', reportRoutes);
router.use('/config', configRoutes);

export default router;
