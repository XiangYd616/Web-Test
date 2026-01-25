/**
 * 错误报告路由
 * 处理前端错误报告和错误统计
 */

import express from 'express';
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import asyncHandler from '../../middleware/asyncHandler';
import { dataManagementService } from '../../services/data/DataManagementService';
import { errorMonitoringSystem } from '../../utils/ErrorMonitoringSystem';
import Logger from '../../utils/logger';
const { hasWorkspacePermission } = require('../../utils/workspacePermissions');

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

const formatBucketKey = (date: Date, interval: 'hour' | 'day') => {
  const iso = date.toISOString();
  if (interval === 'hour') {
    return `${iso.slice(0, 13)}:00:00Z`;
  }
  return iso.slice(0, 10);
};

const resolveGroupKey = (error: ErrorReport, groupBy: string) => {
  switch (groupBy) {
    case 'severity':
      return error.severity || 'unknown';
    case 'source':
      return error.source || error.context?.url || 'unknown';
    case 'module':
      return (
        (error.details?.module as string | undefined) ||
        (error.context?.url as string | undefined) ||
        'unknown'
      );
    case 'type':
    default:
      return error.type || 'unknown';
  }
};

const router = express.Router();

type ErrorRecord = {
  id: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

const isAdminRole = (role?: string) =>
  ['admin', 'moderator', 'enterprise'].includes(String(role || '').toLowerCase());

const ensureAuthenticatedUser = (
  req: express.Request,
  res: express.Response
): { id: string; role?: string } | null => {
  const user = (req as { user?: { id?: string; role?: string } }).user;
  if (!user?.id) {
    res.error(StandardErrorCode.UNAUTHORIZED, '用户未认证', undefined, 401);
    return null;
  }
  return { id: user.id, role: user.role };
};

const filterRecordsByRole = (
  records: ErrorRecord[],
  userId: string,
  role?: string
): ErrorRecord[] => {
  if (isAdminRole(role)) {
    return records;
  }
  return records.filter(record => {
    const metadataUser = record.metadata?.userId ? String(record.metadata.userId) : undefined;
    if (metadataUser && metadataUser === userId) {
      return true;
    }
    const errorReport = record.data as Partial<ErrorReport>;
    return errorReport.context?.userId === userId;
  });
};

interface ErrorQuery {
  page?: number;
  limit?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  search?: string;
  resolved?: boolean;
  workspaceId?: string;
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

// 初始化错误监控管理器
errorMonitoringSystem.initialize().catch(console.error);

const ERROR_REPORTS_TYPE = 'system_error_reports';

dataManagementService.initialize().catch((error: unknown) => {
  console.error('错误数据服务初始化失败:', error);
});

const resolveWorkspaceRole = async (workspaceId: string, userId: string) => {
  const result = await query(
    `SELECT role
     FROM workspace_members
     WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
     LIMIT 1`,
    [workspaceId, userId]
  );
  return result.rows[0]?.role as 'owner' | 'admin' | 'member' | 'viewer' | undefined;
};

const ensureWorkspacePermission = async (
  workspaceId: string,
  userId: string,
  action: 'read' | 'write' | 'delete' | 'invite' | 'manage' | 'execute'
) => {
  const role = await resolveWorkspaceRole(workspaceId, userId);
  if (!role) {
    throw new Error('没有权限访问该工作空间');
  }
  if (!hasWorkspacePermission(role, action)) {
    throw new Error('当前工作空间角色无此操作权限');
  }
  return role;
};

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
 * GET /api/system/errors/trends
 * 获取错误趋势
 */
router.get(
  '/trends',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const {
      timeRange = '7d',
      groupBy,
      workspaceId: workspaceIdInput,
    } = req.query as {
      timeRange?: ErrorQuery['timeRange'];
      groupBy?: string;
      workspaceId?: string;
    };
    const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

    try {
      const requester = ensureAuthenticatedUser(req, res);
      if (!requester) {
        return res;
      }
      if (workspaceIdInput) {
        await ensureWorkspacePermission(workspaceId, requester.id, 'read');
      }

      const { results } = await dataManagementService.queryData(
        ERROR_REPORTS_TYPE,
        { workspaceId, userId: isAdminRole(requester.role) ? undefined : requester.id },
        {}
      );
      const scopedRecords = filterRecordsByRole(
        results as ErrorRecord[],
        requester.id,
        requester.role
      );
      const filteredErrors = applyTimeRangeFilter(
        scopedRecords.map(record => mapErrorRecord(record)),
        timeRange
      );

      const interval: 'hour' | 'day' = timeRange === '1h' || timeRange === '24h' ? 'hour' : 'day';
      const bucketMap = new Map<string, number>();
      const groupedMap = new Map<string, Map<string, number>>();

      filteredErrors.forEach(error => {
        const bucketKey = formatBucketKey(new Date(error.timestamp), interval);
        bucketMap.set(bucketKey, (bucketMap.get(bucketKey) || 0) + 1);

        if (groupBy) {
          const groupKey = resolveGroupKey(error, groupBy);
          if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, new Map());
          }
          const groupBucket = groupedMap.get(groupKey) as Map<string, number>;
          groupBucket.set(bucketKey, (groupBucket.get(bucketKey) || 0) + 1);
        }
      });

      const series = Array.from(bucketMap.entries())
        .map(([timestamp, count]) => ({ timestamp, count }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      const grouped = Array.from(groupedMap.entries()).reduce<Record<string, unknown[]>>(
        (acc, [key, buckets]) => {
          acc[key] = Array.from(buckets.entries())
            .map(([timestamp, count]) => ({ timestamp, count }))
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          return acc;
        },
        {}
      );

      return res.success({ timeRange, interval, series, grouped });
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取错误趋势失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * GET /api/system/errors/groups
 * 获取错误分组统计
 */
router.get(
  '/groups',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const {
      timeRange = '7d',
      groupBy = 'type',
      workspaceId: workspaceIdInput,
    } = req.query as {
      timeRange?: ErrorQuery['timeRange'];
      groupBy?: string;
      workspaceId?: string;
    };
    const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

    try {
      const requester = ensureAuthenticatedUser(req, res);
      if (!requester) {
        return res;
      }
      if (workspaceIdInput) {
        await ensureWorkspacePermission(workspaceId, requester.id, 'read');
      }

      const { results } = await dataManagementService.queryData(
        ERROR_REPORTS_TYPE,
        { workspaceId, userId: isAdminRole(requester.role) ? undefined : requester.id },
        {}
      );
      const scopedRecords = filterRecordsByRole(
        results as ErrorRecord[],
        requester.id,
        requester.role
      );
      const filteredErrors = applyTimeRangeFilter(
        scopedRecords.map(record => mapErrorRecord(record)),
        timeRange
      );

      const groupCounts = filteredErrors.reduce<Record<string, number>>((acc, error) => {
        const key = resolveGroupKey(error, groupBy);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const items = Object.entries(groupCounts)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count);

      return res.success({ groupBy, timeRange, items });
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取错误分组统计失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * POST /api/system/errors/report
 * 前端错误报告
 */
router.post(
  '/report',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const errorReport: ErrorReport = req.body;
      const workspaceIdInput = (req.body as { workspaceId?: string }).workspaceId;
      const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';
      const reporter = (req as { user?: { id?: string } }).user?.id;
      if (workspaceIdInput) {
        const userId = (req as { user?: { id?: string } }).user?.id;
        if (!userId) {
          return res.error(StandardErrorCode.UNAUTHORIZED, '用户未认证', undefined, 401);
        }
        await ensureWorkspacePermission(workspaceId, userId, 'write');
      }

      // 验证必需字段
      if (!errorReport.type || !errorReport.message || !errorReport.timestamp) {
        return res.error(StandardErrorCode.INVALID_INPUT, '错误报告缺少必需字段', undefined, 400);
      }

      const { id } = await dataManagementService.createData(
        ERROR_REPORTS_TYPE,
        { ...errorReport, id: undefined },
        {
          source: 'error-report',
          userId: reporter,
          workspaceId,
        }
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

      return res.success({ id }, '错误报告已记录', 201);
    } catch (error) {
      Logger.error('处理错误报告失败', { error, body: req.body });

      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '处理错误报告失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
    const workspaceIdInput = query.workspaceId;
    const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

    try {
      const requester = ensureAuthenticatedUser(req, res);
      if (!requester) {
        return res;
      }
      if (workspaceIdInput) {
        await ensureWorkspacePermission(workspaceId, requester.id, 'read');
      }
      const { results } = await dataManagementService.queryData(
        ERROR_REPORTS_TYPE,
        {
          filters: {
            ...(query.severity ? { severity: query.severity } : {}),
            ...(query.type ? { type: query.type } : {}),
          },
          search: query.search,
          sort: { field: 'timestamp', direction: 'desc' },
          workspaceId,
          userId: isAdminRole(requester.role) ? undefined : requester.id,
        },
        {}
      );
      const scopedRecords = filterRecordsByRole(
        results as ErrorRecord[],
        requester.id,
        requester.role
      );
      const rawErrors = scopedRecords.map(record => mapErrorRecord(record));
      const filteredErrors = applyTimeRangeFilter(rawErrors, query.timeRange);
      filteredErrors.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedErrors = filteredErrors.slice(startIndex, endIndex);

      return res.success({
        errors: paginatedErrors,
        pagination: {
          page,
          limit,
          total: filteredErrors.length,
          totalPages: Math.ceil(filteredErrors.length / limit),
        },
      });
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取错误列表失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
    const { workspaceId: workspaceIdInput } = req.query as { workspaceId?: string };
    const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

    try {
      const requester = ensureAuthenticatedUser(req, res);
      if (!requester) {
        return res;
      }
      if (workspaceIdInput) {
        await ensureWorkspacePermission(workspaceId, requester.id, 'read');
      }
      const errorRecord = (await dataManagementService.readData(ERROR_REPORTS_TYPE, id, {
        workspaceId,
      })) as ErrorRecord;
      const recordList = filterRecordsByRole([errorRecord], requester.id, requester.role);
      if (recordList.length === 0) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权限查看该错误报告', undefined, 403);
      }
      const errorReport = mapErrorRecord(errorRecord);

      return res.success(errorReport);
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.error(StandardErrorCode.NOT_FOUND, '错误报告不存在', undefined, 404);
      }
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取错误详情失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
    const { timeRange = '24h', workspaceId: workspaceIdInput } = req.query;
    const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

    try {
      const requester = ensureAuthenticatedUser(req, res);
      if (!requester) {
        return res;
      }
      if (workspaceIdInput) {
        await ensureWorkspacePermission(workspaceId, requester.id, 'read');
      }
      const { results } = await dataManagementService.queryData(
        ERROR_REPORTS_TYPE,
        { workspaceId, userId: isAdminRole(requester.role) ? undefined : requester.id },
        {}
      );
      const scopedRecords = filterRecordsByRole(
        results as ErrorRecord[],
        requester.id,
        requester.role
      );
      const now = new Date();
      const recentErrors = applyTimeRangeFilter(
        scopedRecords.map(record => mapErrorRecord(record)),
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

      return res.success(statistics);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取错误统计失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
    const workspaceIdInput = req.body?.workspaceId || (req.query.workspaceId as string | undefined);
    const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

    try {
      if (workspaceIdInput) {
        const userId = (req as { user?: { id?: string } }).user?.id;
        if (!userId) {
          return res.error(StandardErrorCode.UNAUTHORIZED, '用户未认证', undefined, 401);
        }
        await ensureWorkspacePermission(workspaceId, userId, 'write');
      }
      const errorRecord = await dataManagementService.readData(ERROR_REPORTS_TYPE, id, {
        workspaceId,
      });
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
        {
          userId: resolvedBy,
          workspaceId,
        }
      );

      Logger.info('错误已标记为解决', { errorId: id, resolvedBy, comment });

      return res.success(null, '错误已标记为解决');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '标记错误解决失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
    const workspaceIdInput = req.body?.workspaceId || (req.query.workspaceId as string | undefined);
    const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

    if (!Array.isArray(errorIds) || errorIds.length === 0) {
      return res.error(StandardErrorCode.INVALID_INPUT, '错误ID列表不能为空', undefined, 400);
    }

    try {
      if (workspaceIdInput) {
        const userId = (req as { user?: { id?: string } }).user?.id;
        if (!userId) {
          return res.error(StandardErrorCode.UNAUTHORIZED, '用户未认证', undefined, 401);
        }
        await ensureWorkspacePermission(workspaceId, userId, 'write');
      }
      const results = [];

      for (const errorId of errorIds) {
        try {
          const errorRecord = await dataManagementService.readData(ERROR_REPORTS_TYPE, errorId, {
            workspaceId,
          });
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
            {
              userId: resolvedBy,
              workspaceId,
            }
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

      return res.success(
        {
          results,
          summary: {
            total: errorIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
          },
        },
        '批量标记完成'
      );
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '批量标记错误解决失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
    const workspaceIdInput = req.body?.workspaceId || (req.query.workspaceId as string | undefined);
    const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

    try {
      if (workspaceIdInput) {
        const userId = (req as { user?: { id?: string } }).user?.id;
        if (!userId) {
          return res.error(StandardErrorCode.UNAUTHORIZED, '用户未认证', undefined, 401);
        }
        await ensureWorkspacePermission(workspaceId, userId, 'delete');
      }
      await dataManagementService.deleteData(ERROR_REPORTS_TYPE, id, {
        workspaceId,
      });

      Logger.info('删除错误报告', { errorId: id });

      return res.success(null, '错误报告已删除');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '删除错误报告失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
    const { workspaceId: workspaceIdInput } = req.query as { workspaceId?: string };
    const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';
    try {
      const requester = ensureAuthenticatedUser(req, res);
      if (!requester) {
        return res;
      }
      if (workspaceIdInput) {
        await ensureWorkspacePermission(workspaceId, requester.id, 'read');
      }
      const { results } = await dataManagementService.queryData(
        ERROR_REPORTS_TYPE,
        { workspaceId, userId: isAdminRole(requester.role) ? undefined : requester.id },
        {}
      );
      const scopedRecords = filterRecordsByRole(
        results as ErrorRecord[],
        requester.id,
        requester.role
      );
      const types = Array.from(new Set(scopedRecords.map(record => mapErrorRecord(record).type)));

      return res.success(types);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取错误类型失败',
        error instanceof Error ? error.message : String(error),
        500
      );
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
    const { workspaceId: workspaceIdInput } = req.query as { workspaceId?: string };
    const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';
    try {
      const requester = ensureAuthenticatedUser(req, res);
      if (!requester) {
        return res;
      }
      if (workspaceIdInput) {
        await ensureWorkspacePermission(workspaceId, requester.id, 'read');
      }
      const health = errorMonitoringSystem.getStatus();
      const { total } = await dataManagementService.queryData(
        ERROR_REPORTS_TYPE,
        { workspaceId, userId: isAdminRole(requester.role) ? undefined : requester.id },
        {}
      );
      const { results } = await dataManagementService.queryData(
        ERROR_REPORTS_TYPE,
        { workspaceId, userId: isAdminRole(requester.role) ? undefined : requester.id },
        {}
      );
      const scopedRecords = filterRecordsByRole(
        results as ErrorRecord[],
        requester.id,
        requester.role
      );
      const lastRecord = results
        .map(record => mapErrorRecord(record))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .pop();

      return res.success({
        status: 'healthy',
        errorReports: scopedRecords.length || total,
        lastReport: lastRecord?.timestamp ?? null,
        ...health,
      });
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '错误监控健康检查失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

export default router;
