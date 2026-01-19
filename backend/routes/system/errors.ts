/**
 * 错误报告路由
 * 处理前端错误报告和错误统计
 */

import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { errorMonitoringManager } from '../../src/ErrorMonitoringManager';
import Logger from '../../utils/logger';

interface ErrorReport {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, unknown>;
  code?: string;
  timestamp: Date;
  context?: {
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    url?: string;
    referer?: string;
    ip?: string;
    browser?: string;
    os?: string;
    screen?: {
      width: number;
      height: number;
    };
  };
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
}

interface ErrorQuery {
  page?: number;
  limit?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  search?: string;
  resolved?: boolean;
}

interface ErrorStatistics {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  byHour: Array<{
    hour: string;
    count: number;
  }>;
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    change: number;
    changePercent: number;
  };
  topErrors: Array<{
    message: string;
    count: number;
    severity: string;
  }>;
}

const router = express.Router();

// 初始化错误监控管理器
errorMonitoringManager.initialize().catch(console.error);

// 模拟错误数据
const errorReports: ErrorReport[] = [
  {
    id: '1',
    type: 'javascript',
    severity: 'high',
    message: 'Cannot read property of undefined',
    details: {
      component: 'UserProfile',
      action: 'loadUserData',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    context: {
      userId: 'user123',
      sessionId: 'session456',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      url: 'https://testweb.com/profile',
      browser: 'Chrome',
      os: 'Windows',
      screen: { width: 1920, height: 1080 },
    },
    stack:
      'TypeError: Cannot read property of undefined\\n  at UserProfile.loadUserData (profile.js:45:12)',
    source: 'profile.js',
    line: 45,
    column: 12,
  },
  {
    id: '2',
    type: 'network',
    severity: 'medium',
    message: 'Network request failed',
    details: {
      url: '/api/users/123',
      method: 'GET',
      status: 500,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    context: {
      userId: 'user123',
      sessionId: 'session456',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      url: 'https://testweb.com/profile',
      browser: 'Chrome',
      os: 'Windows',
    },
  },
  {
    id: '3',
    type: 'api',
    severity: 'critical',
    message: 'API authentication failed',
    details: {
      endpoint: '/api/auth/login',
      error: 'Invalid credentials',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    context: {
      userId: 'user456',
      sessionId: 'session789',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      url: 'https://testweb.com/login',
      browser: 'Safari',
      os: 'macOS',
    },
  },
];

/**
 * POST /api/system/errors/report
 * 前端错误报告
 */
router.post(
  '/report',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const errorReport: ErrorReport = req.body;

      // 验证必需字段
      if (!errorReport.id || !errorReport.type || !errorReport.message || !errorReport.timestamp) {
        return res.status(400).json({
          success: false,
          message: '错误报告缺少必需字段',
        });
      }

      // 添加到错误报告列表
      errorReports.push(errorReport);

      // 记录到日志
      Logger.error('前端错误报告', {
        errorId: errorReport.id,
        type: errorReport.type,
        severity: errorReport.severity,
        message: errorReport.message,
        userId: errorReport.context?.userId,
        url: errorReport.context?.url,
      });

      // 通知错误监控管理器
      await errorMonitoringManager.reportError(errorReport);

      res.status(201).json({
        success: true,
        message: '错误报告已记录',
      });
    } catch (error) {
      Logger.error('处理错误报告失败', { error, body: req.body });

      res.status(500).json({
        success: false,
        message: '处理错误报告失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/errors
 * 获取错误列表
 */
router.get(
  '/',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const query: ErrorQuery = req.query;

    try {
      let filteredErrors = [...errorReports];

      // 按严重程度过滤
      if (query.severity) {
        filteredErrors = filteredErrors.filter(error => error.severity === query.severity);
      }

      // 按类型过滤
      if (query.type) {
        filteredErrors = filteredErrors.filter(error => error.type === query.type);
      }

      // 搜索过滤
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        filteredErrors = filteredErrors.filter(
          error =>
            error.message.toLowerCase().includes(searchLower) ||
            error.type.toLowerCase().includes(searchLower)
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

        filteredErrors = filteredErrors.filter(error => error.timestamp >= cutoffTime);
      }

      // 排序
      filteredErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // 分页
      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedErrors = filteredErrors.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          errors: paginatedErrors,
          pagination: {
            page,
            limit,
            total: filteredErrors.length,
            totalPages: Math.ceil(filteredErrors.length / limit),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取错误列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/errors/:id
 * 获取单个错误详情
 */
router.get(
  '/:id',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const error = errorReports.find(e => e.id === id);

      if (!error) {
        return res.status(404).json({
          success: false,
          message: '错误报告不存在',
        });
      }

      res.json({
        success: true,
        data: error,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取错误详情失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/errors/statistics
 * 获取错误统计
 */
router.get(
  '/statistics',
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

      const recentErrors = errorReports.filter(error => error.timestamp >= cutoffTime);

      const statistics: ErrorStatistics = {
        total: recentErrors.length,
        bySeverity: recentErrors.reduce(
          (acc, error) => {
            acc[error.severity] = (acc[error.severity] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        byType: recentErrors.reduce(
          (acc, error) => {
            acc[error.type] = (acc[error.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        byHour: Array.from({ length: 24 }, (_, i) => {
          const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
          const hourStr = hour.getHours().toString().padStart(2, '0') + ':00';
          const count = recentErrors.filter(
            error => error.timestamp.getHours() === hour.getHours()
          ).length;
          return { hour: hourStr, count };
        }),
        trends: {
          direction: 'stable',
          change: 0,
          changePercent: 0,
        },
        topErrors: Object.entries(
          recentErrors.reduce(
            (acc, error) => {
              acc[error.message] = (acc[error.message] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          )
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([message, count]) => ({
            message,
            count,
            severity: recentErrors.find(e => e.message === message)?.severity || 'unknown',
          })),
      };

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取错误统计失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/errors/:id/resolve
 * 标记错误为已解决
 */
router.post(
  '/:id/resolve',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { comment, resolvedBy } = req.body;

    try {
      const errorIndex = errorReports.findIndex(e => e.id === id);

      if (errorIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '错误报告不存在',
        });
      }

      // 在实际应用中，这里应该更新数据库中的状态
      // 这里只是模拟标记为已解决
      errorReports[errorIndex].details = {
        ...errorReports[errorIndex].details,
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || 'system',
        resolutionComment: comment,
      };

      Logger.info('错误已标记为解决', { errorId: id, resolvedBy, comment });

      res.json({
        success: true,
        message: '错误已标记为解决',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '标记错误解决失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/errors/batch/resolve
 * 批量标记错误为已解决
 */
router.post(
  '/batch/resolve',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { errorIds, comment, resolvedBy } = req.body;

    if (!Array.isArray(errorIds) || errorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '错误ID列表不能为空',
      });
    }

    try {
      const results = [];

      for (const errorId of errorIds) {
        const errorIndex = errorReports.findIndex(e => e.id === errorId);

        if (errorIndex !== -1) {
          errorReports[errorIndex].details = {
            ...errorReports[errorIndex].details,
            resolved: true,
            resolvedAt: new Date(),
            resolvedBy: resolvedBy || 'system',
            resolutionComment: comment,
          };
          results.push({ errorId, success: true });
        } else {
          results.push({ errorId, success: false, error: '错误不存在' });
        }
      }

      Logger.info('批量标记错误为解决', {
        total: errorIds.length,
        successful: results.filter(r => r.success).length,
        resolvedBy,
      });

      res.json({
        success: true,
        message: '批量标记完成',
        data: {
          results,
          summary: {
            total: errorIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '批量标记错误解决失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * DELETE /api/system/errors/:id
 * 删除错误报告
 */
router.delete(
  '/:id',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const errorIndex = errorReports.findIndex(e => e.id === id);

      if (errorIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '错误报告不存在',
        });
      }

      const deletedError = errorReports.splice(errorIndex, 1)[0];

      Logger.info('删除错误报告', { errorId: id, message: deletedError.message });

      res.json({
        success: true,
        message: '错误报告已删除',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '删除错误报告失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/errors/types
 * 获取错误类型列表
 */
router.get(
  '/types',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const types = Array.from(new Set(errorReports.map(error => error.type)));

      res.json({
        success: true,
        data: types,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取错误类型失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/errors/health
 * 错误监控健康检查
 */
router.get(
  '/health',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const health = await errorMonitoringManager.healthCheck();

      res.json({
        success: true,
        data: {
          status: 'healthy',
          errorReports: errorReports.length,
          lastReport:
            errorReports.length > 0 ? errorReports[errorReports.length - 1].timestamp : null,
          ...health,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '错误监控健康检查失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
