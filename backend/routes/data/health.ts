/**
 * 数据库健康检查和监控API
 */

import express from 'express';
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import asyncHandler from '../../middleware/asyncHandler';

const {
  getConnectionManager,
  getStats,
  healthCheck,
  testConnection,
} = require('../../config/database');

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  database: {
    connected: boolean;
    responseTime: number;
    error?: string;
  };
  cache?: {
    connected: boolean;
    responseTime: number;
    error?: string;
  };
  timestamp: string;
}

interface SystemStats {
  database: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  timestamp: string;
}

const router = express.Router();

/**
 * 获取数据库健康状态
 */
router.get(
  '/health',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const healthStatus = await healthCheck();

      return res.success(healthStatus);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取数据库健康状态失败',
        {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  })
);

/**
 * 获取数据库连接管理器状态
 */
router.get(
  '/status',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const connectionManager = await getConnectionManager();
      const stats = await getStats();

      const status: HealthStatus = {
        status: connectionManager.isConnectionActive() ? 'healthy' : 'unhealthy',
        database: {
          connected: connectionManager.isConnectionActive(),
          responseTime: stats.responseTime || 0,
        },
        timestamp: new Date().toISOString(),
      };

      return res.success(status);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取数据库连接状态失败',
        {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  })
);

/**
 * 获取系统统计信息
 */
router.get(
  '/stats',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const connectionManager = getConnectionManager();
      const poolStatus = connectionManager.getPoolStatus();

      const memUsage = process.memoryUsage();
      const systemStats: SystemStats = {
        database: {
          totalConnections: poolStatus?.total || 0,
          activeConnections: poolStatus?.used || 0,
          idleConnections: poolStatus?.free || 0,
          waitingConnections: poolStatus?.waiting || 0,
        },
        memory: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };

      return res.success(systemStats);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取系统统计信息失败',
        {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  })
);

/**
 * 执行数据库连接测试
 */
router.post(
  '/test-connection',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const startTime = Date.now();
      await testConnection();
      const responseTime = Date.now() - startTime;

      return res.success({
        connected: true,
        responseTime,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '数据库连接测试失败',
        {
          error: error instanceof Error ? error.message : String(error),
          connected: false,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  })
);

/**
 * 获取缓存状态（如果可用）
 */
router.get(
  '/cache',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      // 这里可以添加缓存状态检查逻辑
      // 目前返回默认状态
      const cacheStatus = {
        status: 'unknown',
        message: '缓存服务未配置',
        timestamp: new Date().toISOString(),
      };

      return res.success(cacheStatus);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取缓存状态失败',
        {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  })
);

/**
 * 获取API性能指标
 */
router.get(
  '/performance',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { period = '1h' } = req.query;

      // 这里可以添加性能指标收集逻辑
      const performanceMetrics = {
        period,
        requests: {
          total: 0,
          successful: 0,
          failed: 0,
          averageResponseTime: 0,
        },
        database: {
          queryCount: 0,
          averageQueryTime: 0,
          slowQueries: 0,
        },
        timestamp: new Date().toISOString(),
      };

      return res.success(performanceMetrics);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取性能指标失败',
        {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  })
);

/**
 * 系统就绪检查
 */
router.get(
  '/ready',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const connectionManager = getConnectionManager();
      const isReady = connectionManager.isConnectionActive();

      if (isReady) {
        return res.success({
          ready: true,
          timestamp: new Date().toISOString(),
        });
      } else {
        return res.error(
          StandardErrorCode.SERVICE_UNAVAILABLE,
          '系统未就绪',
          {
            ready: false,
            timestamp: new Date().toISOString(),
          },
          503
        );
      }
    } catch (error) {
      return res.error(
        StandardErrorCode.SERVICE_UNAVAILABLE,
        '系统未就绪',
        {
          ready: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        503
      );
    }
  })
);

/**
 * 存活检查
 */
router.get(
  '/live',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    // 简单的存活检查，只返回200状态
    return res.success({
      alive: true,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
