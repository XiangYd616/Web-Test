/**
 * 错误报告路由
 * 处理前端错误报告和错误统计
 */

import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { dataManagementService } from '../../services/data/DataManagementService';
import { errorMonitoringSystem } from '../../utils/ErrorMonitoringSystem';
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
errorMonitoringSystem.initialize().catch(console.error);

const ERROR_REPORTS_TYPE = 'system_error_reports';

dataManagementService.initialize().catch(error => {
  console.error('错误数据服务初始化失败:', error);
});

const mapErrorRecord = (record: { id: string; data: Record<string, unknown> }): ErrorReport =>
  ({
    ...(record.data as unknown as ErrorReport),
    id: record.id,
  }) as ErrorReport;

const applyTimeRangeFilter = (errors: ErrorReport[], timeRange?: ErrorQuery['timeRange']) => {
  if (!timeRange) return errors;
  const now = new Date();
  let cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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
      break;
  }

  return errors.filter(error => new Date(error.timestamp) >= cutoffTime);
};

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
      if (!errorReport.type || !errorReport.message || !errorReport.timestamp) {
        return res.status(400).json({
          success: false,
          message: '错误报告缺少必需字段',
        });
      }

      const { id } = await dataManagementService.createData(
        ERROR_REPORTS_TYPE,
        { ...errorReport, id: undefined },
        { source: 'error-report' }
      );

      // 记录到日志
      Logger.error('前端错误报告', {
        errorId: id,
        type: errorReport.type,
        severity: errorReport.severity,
        message: errorReport.message,
        userId: errorReport.context?.userId,
        url: errorReport.context?.url,
      });

      // 通知错误监控管理器
      await errorMonitoringSystem.recordError({
        severity: errorReport.severity,
        type: errorReport.type,
        message: errorReport.message,
        timestamp: new Date(errorReport.timestamp).toISOString(),
        errorId: id,
        context: errorReport.context as Record<string, unknown> | undefined,
        details: errorReport.details,
      });

      return res.status(201).json({
        success: true,
        message: '错误报告已记录',
        data: { id },
      });
    } catch (error) {
      Logger.error('处理错误报告失败', { error, body: req.body });

      return res.status(500).json({
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
      const { results } = await dataManagementService.queryData(
        ERROR_REPORTS_TYPE,
        {
          filters: {
            ...(query.severity ? { severity: query.severity } : {}),
            ...(query.type ? { type: query.type } : {}),
          },
          search: query.search,
          sort: { field: 'timestamp', direction: 'desc' },
        },
        {}
      );

      const rawErrors = results.map(record => mapErrorRecord(record));
      const filteredErrors = applyTimeRangeFilter(rawErrors, query.timeRange);
      filteredErrors.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedErrors = filteredErrors.slice(startIndex, endIndex);

      return res.json({
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
      return res.status(500).json({
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
      const errorRecord = await dataManagementService.readData(ERROR_REPORTS_TYPE, id);
      const errorReport = mapErrorRecord(
        errorRecord as { id: string; data: Record<string, unknown> }
      );

      return res.json({
        success: true,
        data: errorReport,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '错误报告不存在',
        });
      }
      return res.status(500).json({
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
      const { results } = await dataManagementService.queryData(ERROR_REPORTS_TYPE, {}, {});
      const now = new Date();
      const recentErrors = applyTimeRangeFilter(
        results.map(record => mapErrorRecord(record)),
        timeRange as ErrorQuery['timeRange']
      );

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

      return res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      return res.status(500).json({
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
      const errorRecord = await dataManagementService.readData(ERROR_REPORTS_TYPE, id);
      const errorReport = mapErrorRecord(
        errorRecord as { id: string; data: Record<string, unknown> }
      );

      await dataManagementService.updateData(
        ERROR_REPORTS_TYPE,
        id,
        {
          details: {
            ...(errorReport.details || {}),
            resolved: true,
            resolvedAt: new Date(),
            resolvedBy: resolvedBy || 'system',
            resolutionComment: comment,
          },
        },
        { userId: resolvedBy }
      );

      Logger.info('错误已标记为解决', { errorId: id, resolvedBy, comment });

      return res.json({
        success: true,
        message: '错误已标记为解决',
      });
    } catch (error) {
      return res.status(500).json({
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
        try {
          const errorRecord = await dataManagementService.readData(ERROR_REPORTS_TYPE, errorId);
          const errorReport = mapErrorRecord(
            errorRecord as { id: string; data: Record<string, unknown> }
          );

          await dataManagementService.updateData(
            ERROR_REPORTS_TYPE,
            errorId,
            {
              details: {
                ...(errorReport.details || {}),
                resolved: true,
                resolvedAt: new Date(),
                resolvedBy: resolvedBy || 'system',
                resolutionComment: comment,
              },
            },
            { userId: resolvedBy }
          );

          results.push({ errorId, success: true });
        } catch (error) {
          results.push({
            errorId,
            success: false,
            error:
              error instanceof Error && error.message.includes('数据记录不存在')
                ? '错误不存在'
                : error instanceof Error
                  ? error.message
                  : String(error),
          });
        }
      }

      Logger.info('批量标记错误为解决', {
        total: errorIds.length,
        successful: results.filter(r => r.success).length,
        resolvedBy,
      });

      return res.json({
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
      return res.status(500).json({
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
      await dataManagementService.deleteData(ERROR_REPORTS_TYPE, id);

      Logger.info('删除错误报告', { errorId: id });

      return res.json({
        success: true,
        message: '错误报告已删除',
      });
    } catch (error) {
      return res.status(500).json({
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
      const { results } = await dataManagementService.queryData(ERROR_REPORTS_TYPE, {}, {});
      const types = Array.from(new Set(results.map(record => mapErrorRecord(record).type)));

      return res.json({
        success: true,
        data: types,
      });
    } catch (error) {
      return res.status(500).json({
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
      const health = errorMonitoringSystem.getStatus();
      const { total } = await dataManagementService.queryData(ERROR_REPORTS_TYPE, {}, {});
      const { results } = await dataManagementService.queryData(ERROR_REPORTS_TYPE, {}, {});
      const lastRecord = results
        .map(record => mapErrorRecord(record))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .pop();

      return res.json({
        success: true,
        data: {
          status: 'healthy',
          errorReports: total,
          lastReport: lastRecord?.timestamp ?? null,
          ...health,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '错误监控健康检查失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
