/**
 * 系统路由
 * 处理系统配置、监控等管理功能
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import alertRoutes from '../../alert/routes/alerts';
import * as database from '../../config/database';
import asyncHandler from '../../middleware/asyncHandler';
import { requireRole } from '../../middleware/auth';
import monitoringRoutes from '../../monitoring/routes/monitoring';
import { MonitoringService } from '../../monitoring/services/MonitoringService';
import reportRoutes from '../../reporting/routes/reports';
import configRoutes from './config';
import errorRoutes from './errors';

const { getPool, getStats, healthCheck } = database as unknown as {
  getPool: () => unknown;
  getStats: () => Promise<Record<string, unknown>>;
  healthCheck: () => Promise<Record<string, unknown>>;
};

type MonitoringServiceExtras = {
  logConfigChange?: (key: string, value: string, userId: string) => Promise<unknown>;
  getMetrics?: () => Promise<Record<string, unknown>>;
  logMaintenanceModeChange?: (
    enabled: boolean,
    message: string | undefined,
    userId: string
  ) => Promise<unknown>;
  createBackup?: (payload: Record<string, unknown>) => Promise<unknown>;
  getBackupList?: () => Promise<unknown>;
  deleteBackup?: (id: string) => Promise<unknown>;
};

type DbPool = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: T[] }>;
};

const router = express.Router();

const getUserId = (req: express.Request): string => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

// 初始化监控服务并注入路由
// getPool() 在 SQLite 模式下返回 wrapper（内部调用 sqliteQuery → adaptSQL 自动转换 PG SQL）
// 因此 SQLite 模式也可以正常使用 MonitoringService
let monitoringService: (MonitoringService & MonitoringServiceExtras) | null = null;
try {
  const pool = getPool();
  if (pool) {
    monitoringService = new MonitoringService(pool as unknown as DbPool);
    (
      monitoringRoutes as { setMonitoringService?: (service: unknown) => void }
    ).setMonitoringService?.(monitoringService);

    monitoringService.on('alert:triggered', (alertData: unknown) => {
      try {
        // 监控告警事件保留广播能力
        void alertData;
      } catch (error) {
        console.error('处理监控告警失败:', error);
      }
    });

    monitoringService.start().catch((error: unknown) => {
      console.error('启动监控服务失败:', error);
    });
  }
} catch (error) {
  console.warn('⚠️ 监控服务初始化跳过:', error instanceof Error ? error.message : error);
}

/**
 * GET /api/system/health
 * 系统健康检查
 */
router.get(
  '/health',
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    try {
      const dbHealth = await healthCheck();
      const monitoringHealth = (await monitoringService?.getHealthStatus?.()) ?? {
        status: 'unavailable',
      };

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        monitoring: monitoringHealth,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      };

      return res.success(health);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '系统健康检查失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * GET /api/system/stats
 * 系统统计信息
 */
router.get(
  '/stats',
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    try {
      const dbStats = getStats();
      const monitoringStats = (await monitoringService?.getStatistics?.()) ?? {};

      const stats = {
        database: dbStats,
        monitoring: monitoringStats,
        alerts: { total: 0, active: 0 },
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

      return res.success(stats);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取系统统计失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * GET /api/system/info
 * 系统信息
 */
router.get(
  '/info',
  asyncHandler(async (_req: express.Request, res: express.Response) => {
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

      return res.success(info);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取系统信息失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * GET /api/system/version
 * 获取最新版本信息（桌面端检查更新用，无需认证）
 */
router.get(
  '/version',
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    try {
      const currentVersion = process.env.npm_package_version || '1.0.0';
      return res.success({
        latestVersion: currentVersion,
        currentVersion,
        releaseDate: new Date().toISOString().split('T')[0],
        releaseNotes: '',
        downloadUrl: '',
      });
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取版本信息失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
      if (graceful && monitoringService) {
        await monitoringService.stop();
      }

      // 发送重启信号
      setTimeout(() => {
        process.exit(0);
      }, 1000);

      return res.success(null, '系统重启中...');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '系统重启失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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

      const logs = await monitoringService?.getLogs?.({
        level: level as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      return res.success(logs);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取系统日志失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * GET /api/system/metrics
 * 获取系统指标
 */
router.get(
  '/metrics',
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    try {
      const metrics = await monitoringService?.getMetrics?.();

      return res.success(metrics);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取系统指标失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
      return res.error(StandardErrorCode.INVALID_INPUT, '参数验证失败', errors.array(), 400);
    }

    try {
      const { enabled, message } = req.body;

      // 设置维护模式
      process.env.MAINTENANCE_MODE = enabled ? 'true' : 'false';

      // 记录维护模式变更
      await monitoringService?.logMaintenanceModeChange?.(enabled, message, getUserId(req));

      return res.success(
        {
          enabled,
          message: message || (enabled ? '系统正在维护中' : ''),
          timestamp: new Date().toISOString(),
        },
        enabled ? '维护模式已启用' : '维护模式已禁用'
      );
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '设置维护模式失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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

      const backup = await monitoringService?.createBackup?.({
        type,
        includeLogs,
        createdBy: getUserId(req),
      });
      if (!backup) {
        return res.error(StandardErrorCode.SERVICE_UNAVAILABLE, '备份服务不可用');
      }

      return res.success(backup, '备份创建成功');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '创建备份失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    try {
      const backups = await monitoringService?.getBackupList?.();
      if (!backups) {
        return res.error(StandardErrorCode.SERVICE_UNAVAILABLE, '备份服务不可用');
      }

      return res.success(backups);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取备份列表失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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

      await monitoringService?.deleteBackup?.(id);

      return res.success(null, '备份删除成功');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '删除备份失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

// 挂载子路由
router.use('/monitoring', monitoringRoutes);
router.use('/reports', reportRoutes);
router.use('/config', configRoutes);
router.use('/alerts', alertRoutes);
router.use('/errors', errorRoutes);

export default router;
