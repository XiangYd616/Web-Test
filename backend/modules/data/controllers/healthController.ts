/**
 * 数据库健康检查控制器
 * 职责: 处理数据库健康检查、连接状态、系统统计等业务逻辑
 * 从 data/routes/health.ts 中提取
 */

import type { NextFunction } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import {
  healthCheck as dbHealthCheck,
  getConnectionManager,
  getStats,
  testConnection,
} from '../../config/database';
import type { ApiResponse, AuthenticatedRequest } from '../../types';

// ==================== 类型定义 ====================

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  database: { connected: boolean; responseTime: number; error?: string };
  cache?: { connected: boolean; responseTime: number; error?: string };
  timestamp: string;
}

interface SystemStats {
  database: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
  };
  memory: { used: number; total: number; percentage: number };
  uptime: number;
  timestamp: string;
}

// ==================== 控制器方法 ====================

const getHealth = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const healthStatus = await dbHealthCheck();
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
};

const getStatus = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const connectionManager = await getConnectionManager();
    const stats = await getStats();
    const statusInfo = connectionManager.getStatus();
    const status: HealthStatus = {
      status: statusInfo.pool ? 'healthy' : 'unhealthy',
      database: {
        connected: Boolean(statusInfo.pool),
        responseTime:
          (Array.isArray(stats.connectionStats)
            ? (stats.connectionStats[0] as { response_time?: number })?.response_time
            : (stats.connectionStats as { response_time?: number })?.response_time) || 0,
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
};

const getSystemStats = async (
  _req: AuthenticatedRequest,
  res: ApiResponse,
  _next: NextFunction
) => {
  try {
    const connectionManager = await getConnectionManager();
    const poolStatus = (connectionManager.getStatus().pool || {}) as Record<string, number>;
    const memUsage = process.memoryUsage();
    const systemStats: SystemStats = {
      database: {
        totalConnections: poolStatus.totalCount || 0,
        activeConnections: poolStatus.totalCount || 0,
        idleConnections: poolStatus.idleCount || 0,
        waitingConnections: poolStatus.waitingCount || 0,
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
};

const testDbConnection = async (
  _req: AuthenticatedRequest,
  res: ApiResponse,
  _next: NextFunction
) => {
  try {
    const startTime = Date.now();
    await testConnection();
    const responseTime = Date.now() - startTime;
    return res.success({ connected: true, responseTime, timestamp: new Date().toISOString() });
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
};

const getCacheStatus = async (
  _req: AuthenticatedRequest,
  res: ApiResponse,
  _next: NextFunction
) => {
  try {
    return res.success({
      status: 'unknown',
      message: '缓存服务未配置',
      timestamp: new Date().toISOString(),
    });
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
};

const getPerformance = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const { period = '1h' } = req.query;
    const performanceMetrics = {
      period,
      requests: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
      database: { queryCount: 0, averageQueryTime: 0, slowQueries: 0 },
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
};

const getReady = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const connectionManager = await getConnectionManager();
    const isReady = Boolean(connectionManager.getStatus().pool);
    if (isReady) return res.success({ ready: true, timestamp: new Date().toISOString() });
    return res.error(
      StandardErrorCode.SERVICE_UNAVAILABLE,
      '系统未就绪',
      { ready: false, timestamp: new Date().toISOString() },
      503
    );
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
};

const getLive = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  return res.success({ alive: true, timestamp: new Date().toISOString() });
};

export default {
  getHealth,
  getStatus,
  getSystemStats,
  testDbConnection,
  getCacheStatus,
  getPerformance,
  getReady,
  getLive,
};
