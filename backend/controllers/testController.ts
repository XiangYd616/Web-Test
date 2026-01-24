/**
 * 测试控制器
 * 职责: 处理测试相关的HTTP请求
 */

import type { NextFunction, Request, Response } from 'express';
import { StandardErrorCode } from '../../shared/types/standardApiResponse';
import { query } from '../config/database';

const testService = require('../services/testing/testService');
const testTemplateService = require('../services/testing/testTemplateService');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');
const { configManager } = require('../src/ConfigManager');
const {
  getQueueStats,
  getDeadLetterJobs,
  getJobDetail,
  getJobsByTraceId,
  replayDeadLetterJob,
} = require('../services/testing/TestQueueService');
const { getLogsByTraceId } = require('../services/testing/testLogService');

type AuthRequest = Request & { user: { id: string; role?: string } };

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

const buildZipReadme = (traceId: string, format: string) => {
  return [
    `Trace Log Export (traceId: ${traceId})`,
    '',
    `Format: ${format}`,
    'Files:',
    '- metadata.json: export metadata, chunk ranges, filters',
    '- trace-<traceId>-logs-<n>.csv/json: log chunks',
    '',
    'Notes:',
    '- chunk ranges are zero-based indexes in the full trace log sequence',
    '- apply your own pagination filters as needed',
  ].join('\n');
};

const buildCsvLines = (logs: Array<Record<string, unknown>>) => {
  const header = ['id', 'level', 'message', 'created_at', 'test_id', 'user_id', 'engine_type'];
  const csvLines = [header.join(',')];
  for (const log of logs) {
    csvLines.push(
      [
        escapeCsvValue(log.id),
        escapeCsvValue(log.level),
        escapeCsvValue(log.message),
        escapeCsvValue(log.created_at),
        escapeCsvValue(log.test_id),
        escapeCsvValue(log.user_id),
        escapeCsvValue(log.engine_type),
      ].join(',')
    );
  }
  return csvLines;
};

const chunkArray = <T>(items: T[], chunkSize: number) => {
  if (chunkSize <= 0) {
    return [items];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

type ApiResponse = Response & {
  success: (data?: unknown, message?: string, statusCode?: number, meta?: unknown) => Response;
  error: (
    code: string,
    message?: string,
    details?: unknown,
    statusCode?: number,
    meta?: unknown
  ) => Response;
  created: (data?: unknown, message?: string, meta?: unknown) => Response;
};

const mapStatusToErrorCode = (statusCode?: number) => {
  if (statusCode === 400) {
    return StandardErrorCode.INVALID_INPUT;
  }
  if (statusCode === 401) {
    return StandardErrorCode.UNAUTHORIZED;
  }
  if (statusCode === 403) {
    return StandardErrorCode.FORBIDDEN;
  }
  if (statusCode === 404) {
    return StandardErrorCode.NOT_FOUND;
  }
  if (statusCode === 429) {
    return StandardErrorCode.RATE_LIMIT_EXCEEDED;
  }
  return StandardErrorCode.INTERNAL_SERVER_ERROR;
};

const handleControllerError = (res: ApiResponse, error: unknown, message = '请求处理失败') => {
  return res.error(
    StandardErrorCode.INTERNAL_SERVER_ERROR,
    message,
    error instanceof Error ? error.message : String(error),
    500
  );
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

class TestController {
  private readonly queueNames = new Set([
    'test-execution',
    'test-execution-heavy',
    'test-execution-security',
    'test-execution-dead',
  ]);

  private isAdminRole(role?: string) {
    return ['admin', 'superadmin'].includes(role || '');
  }

  private resolveReplayLimit(userId: string, role?: string) {
    let config = configManager?.get?.('testQueue.replayLimits');
    if (!config && process.env.TEST_QUEUE_REPLAY_LIMITS) {
      try {
        config = JSON.parse(process.env.TEST_QUEUE_REPLAY_LIMITS);
      } catch {
        config = undefined;
      }
    }
    if (!config || typeof config !== 'object') {
      return undefined;
    }
    const record = config as {
      default?: number;
      roles?: Record<string, number>;
      users?: Record<string, number>;
    };
    return record.users?.[userId] ?? (role ? record.roles?.[role] : undefined) ?? record.default;
  }
  /**
   * 创建并启动测试
   * POST /api/test/create-and-start
   */
  async createAndStart(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const workspaceId = (config.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createAndStart(config, user);
      return res.created(result, '测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 按 traceId 查询队列任务
   * GET /api/test/queue/trace/:traceId
   */
  async getQueueJobsByTraceId(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { traceId } = req.params as { traceId: string };
      const { start, end, userId } = req.query as {
        start?: string;
        end?: string;
        userId?: string;
      };
      const isAdmin = this.isAdminRole(req.user.role);
      const jobs = await getJobsByTraceId(traceId, {
        start: start ? Number(start) : undefined,
        end: end ? Number(end) : undefined,
        userId: isAdmin && userId ? userId : req.user.id,
        isAdmin,
      });
      return res.success({ jobs });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 按 traceId 导出任务日志
   * GET /api/test/queue/trace/:traceId/logs
   */
  async getQueueTraceLogs(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { traceId } = req.params as { traceId: string };
      const { format, userId, startTime, endTime, limit, offset, batchSize, all, workspaceId } =
        req.query as {
          format?: string;
          userId?: string;
          startTime?: string;
          endTime?: string;
          limit?: string;
          offset?: string;
          batchSize?: string;
          all?: string;
          workspaceId?: string;
        };
      const isAdmin = this.isAdminRole(req.user.role);
      const isSuperAdmin = req.user.role === 'superadmin';
      const exportAll = all === 'true' || all === '1';
      const exportLimits = configManager?.get?.('testQueue.exportLimits') as
        | {
            roles?: {
              [key: string]: { maxLimit?: number; maxBatchSize?: number } | undefined;
            };
            users?: Record<string, { maxLimit?: number; maxBatchSize?: number }>;
          }
        | undefined;
      const roleLimits = req.user.role ? exportLimits?.roles?.[req.user.role] : undefined;
      const targetUserId = exportAll && isAdmin ? undefined : userId || req.user.id;
      const limitUserId = targetUserId || req.user.id;
      const userLimits = limitUserId ? exportLimits?.users?.[limitUserId] : undefined;
      const effectiveLimits = userLimits ?? roleLimits;
      const maxLimit =
        typeof effectiveLimits?.maxLimit === 'number' ? effectiveLimits.maxLimit : undefined;
      const maxBatchSize =
        typeof effectiveLimits?.maxBatchSize === 'number'
          ? effectiveLimits.maxBatchSize
          : undefined;
      if (exportAll && !isAdmin) {
        return res.error(mapStatusToErrorCode(403), '无权限导出全部日志', undefined, 403);
      }
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
      }
      if (userId && !isAdmin && userId !== req.user.id) {
        return res.error(mapStatusToErrorCode(403), '无权限访问该用户日志', undefined, 403);
      }
      if (exportAll && isAdmin && !isSuperAdmin) {
        const limitValue = limit ? Number(limit) : undefined;
        if (limitValue === undefined || Number.isNaN(limitValue)) {
          return res.error(mapStatusToErrorCode(400), '管理员导出请设置 limit', undefined, 400);
        }
        if (typeof maxLimit === 'number' && limitValue > maxLimit) {
          return res.error(
            mapStatusToErrorCode(400),
            `管理员导出 limit 不应超过 ${maxLimit}`,
            undefined,
            400
          );
        }
        const batchValue = batchSize ? Number(batchSize) : undefined;
        if (
          batchValue !== undefined &&
          !Number.isNaN(batchValue) &&
          typeof maxBatchSize === 'number' &&
          batchValue > maxBatchSize
        ) {
          return res.error(
            mapStatusToErrorCode(400),
            `管理员导出 batchSize 不应超过 ${maxBatchSize}`,
            undefined,
            400
          );
        }
      }
      let resolvedLimit = limit ? Number(limit) : undefined;
      if (resolvedLimit !== undefined && Number.isNaN(resolvedLimit)) {
        resolvedLimit = undefined;
      }
      let resolvedBatchSize = batchSize ? Number(batchSize) : undefined;
      if (resolvedBatchSize !== undefined && Number.isNaN(resolvedBatchSize)) {
        resolvedBatchSize = undefined;
      }
      if (!isAdmin && typeof maxLimit === 'number') {
        if (resolvedLimit === undefined) {
          resolvedLimit = maxLimit;
        } else if (resolvedLimit > maxLimit) {
          return res.error(
            mapStatusToErrorCode(400),
            `导出 limit 不应超过 ${maxLimit}`,
            undefined,
            400
          );
        }
      }
      if (
        !isAdmin &&
        typeof maxBatchSize === 'number' &&
        resolvedBatchSize !== undefined &&
        resolvedBatchSize > maxBatchSize
      ) {
        return res.error(
          mapStatusToErrorCode(400),
          `导出 batchSize 不应超过 ${maxBatchSize}`,
          undefined,
          400
        );
      }
      if (exportAll && isSuperAdmin && typeof maxLimit === 'number') {
        if (resolvedLimit === undefined) {
          resolvedLimit = maxLimit;
        } else if (resolvedLimit > maxLimit) {
          return res.error(
            mapStatusToErrorCode(400),
            `超出导出 limit 上限 ${maxLimit}`,
            undefined,
            400
          );
        }
      }
      if (
        exportAll &&
        isSuperAdmin &&
        typeof maxBatchSize === 'number' &&
        resolvedBatchSize !== undefined &&
        resolvedBatchSize > maxBatchSize
      ) {
        return res.error(
          mapStatusToErrorCode(400),
          `超出导出 batchSize 上限 ${maxBatchSize}`,
          undefined,
          400
        );
      }
      const logsResult = await getLogsByTraceId(traceId, {
        userId: isAdmin ? targetUserId : req.user.id,
        workspaceId,
        isAdmin,
        enforceUserId: !(exportAll && isAdmin),
        startTime,
        endTime,
        limit: resolvedLimit,
        offset: offset ? Number(offset) : undefined,
      });
      const logs = logsResult.rows as Array<Record<string, unknown>>;
      const total = logsResult.total;
      const chunkSize = resolvedBatchSize ?? 0;
      const effectiveOffset = offset ? Number(offset) : 0;
      const chunkRanges =
        chunkSize > 0
          ? chunkArray(logs, chunkSize).map((chunk, index) => {
              const start = effectiveOffset + index * chunkSize;
              const end = start + Math.max(chunk.length - 1, 0);
              return {
                index: index + 1,
                start,
                end,
                count: chunk.length,
              };
            })
          : undefined;
      const metadata = {
        traceId,
        userId: targetUserId,
        total,
        limit: resolvedLimit,
        offset: offset ? Number(offset) : undefined,
        startTime,
        endTime,
        batchSize: chunkSize || undefined,
        chunks: chunkRanges,
        generatedAt: new Date().toISOString(),
      };

      if (format === 'csv' && chunkSize <= 0) {
        const csvLines = buildCsvLines(logs);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="trace-${traceId}-logs.csv"`);
        return res.status(200).send(csvLines.join('\n'));
      }
      if (format === 'json' && chunkSize <= 0) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="trace-${traceId}-logs.json"`);
        return res.status(200).send(JSON.stringify(logs, null, 2));
      }
      if (format === 'zip') {
        const archive = require('archiver');
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="trace-${traceId}-logs.zip"`);
        const zip = archive('zip', { zlib: { level: 9 } });
        zip.on('error', (error: Error) => {
          throw error;
        });
        zip.pipe(res);
        zip.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
        zip.append(buildZipReadme(traceId, format), { name: 'README.txt' });
        const logChunks = chunkArray(logs, chunkSize);
        logChunks.forEach((chunk, index) => {
          const suffix = chunkSize > 0 ? `-${index + 1}` : '';
          const jsonContent = JSON.stringify(chunk, null, 2);
          zip.append(jsonContent, { name: `trace-${traceId}-logs${suffix}.json` });
          const csvLines = buildCsvLines(chunk);
          zip.append(csvLines.join('\n'), { name: `trace-${traceId}-logs${suffix}.csv` });
        });
        zip.finalize();
        return;
      }
      if (format === 'csv' && chunkSize > 0) {
        const archive = require('archiver');
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="trace-${traceId}-logs-csv.zip"`
        );
        const zip = archive('zip', { zlib: { level: 9 } });
        zip.on('error', (error: Error) => {
          throw error;
        });
        zip.pipe(res);
        zip.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
        zip.append(buildZipReadme(traceId, format), { name: 'README.txt' });
        const logChunks = chunkArray(logs, chunkSize);
        logChunks.forEach((chunk, index) => {
          const suffix = `-${index + 1}`;
          const csvLines = buildCsvLines(chunk);
          zip.append(csvLines.join('\n'), { name: `trace-${traceId}-logs${suffix}.csv` });
        });
        zip.finalize();
        return;
      }
      if (format === 'json' && chunkSize > 0) {
        const archive = require('archiver');
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="trace-${traceId}-logs-json.zip"`
        );
        const zip = archive('zip', { zlib: { level: 9 } });
        zip.on('error', (error: Error) => {
          throw error;
        });
        zip.pipe(res);
        zip.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
        zip.append(buildZipReadme(traceId, format), { name: 'README.txt' });
        const logChunks = chunkArray(logs, chunkSize);
        logChunks.forEach((chunk, index) => {
          const suffix = `-${index + 1}`;
          const jsonContent = JSON.stringify(chunk, null, 2);
          zip.append(jsonContent, { name: `trace-${traceId}-logs${suffix}.json` });
        });
        zip.finalize();
        return;
      }
      return res.success({
        logs,
        pagination: {
          total,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        },
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 重放死信队列任务
   * POST /api/test/queue/dead/:jobId/replay
   */
  async replayDeadLetterJob(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { jobId } = req.params as { jobId: string };
      const { priority, delay, queueName, maxReplays } = req.body as {
        priority?: number;
        delay?: number;
        queueName?: string;
        maxReplays?: number;
      };
      const limitFromConfig = this.resolveReplayLimit(req.user.id, req.user.role);
      const requestedLimit = typeof maxReplays === 'number' ? maxReplays : undefined;
      const effectiveLimit =
        typeof limitFromConfig === 'number'
          ? requestedLimit !== undefined
            ? Math.min(requestedLimit, limitFromConfig)
            : limitFromConfig
          : requestedLimit;
      const job = await replayDeadLetterJob(jobId, {
        priority: typeof priority === 'number' ? priority : undefined,
        delay: typeof delay === 'number' ? delay : undefined,
        queueName,
        maxReplays: effectiveLimit,
        auditContext: {
          operatorId: req.user.id,
          operatorRole: req.user.role,
          configuredMaxReplays: limitFromConfig,
        },
      });
      return res.success({ job });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取死信队列详情
   * GET /api/test/queue/dead
   */
  async getDeadLetterQueue(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { start, end } = req.query as { start?: string; end?: string };
      const isAdmin = this.isAdminRole(req.user.role);
      const jobs = await getDeadLetterJobs({
        start: start ? Number(start) : undefined,
        end: end ? Number(end) : undefined,
        userId: req.user.id,
        isAdmin,
      });
      return res.success({ jobs });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取单个队列任务详情
   * GET /api/test/queue/:queueName/jobs/:jobId
   */
  async getQueueJob(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { queueName, jobId } = req.params as { queueName: string; jobId: string };
      if (!this.queueNames.has(queueName)) {
        return res.error(mapStatusToErrorCode(400), '无效的队列名称', undefined, 400);
      }
      const isAdmin = this.isAdminRole(req.user.role);
      const job = await getJobDetail(queueName, jobId, {
        userId: req.user.id,
        isAdmin,
      });
      if (!job) {
        return res.error(mapStatusToErrorCode(404), '未找到任务', undefined, 404);
      }
      return res.success({ job });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取测试队列状态
   * GET /api/test/queue/stats
   */
  async getQueueStats(_req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const isAdmin = this.isAdminRole(_req.user.role);
      const { startTime, endTime, limit, offset, workspaceId } = _req.query as {
        startTime?: string;
        endTime?: string;
        limit?: string;
        offset?: string;
        workspaceId?: string;
      };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, _req.user.id, 'read');
      }
      const stats = await getQueueStats({
        userId: _req.user.id,
        isAdmin,
        workspaceId,
        startTime,
        endTime,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      return res.success(stats);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取测试状态
   * GET /api/test/:testId/status
   */
  async getStatus(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const userId = req.user.id;
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, userId, 'read');
      }

      const status = await testService.getStatus(userId, testId, workspaceId);
      return res.success(status);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取测试结果
   * GET /api/test/:testId/result
   */
  async getResult(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const userId = req.user.id;
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, userId, 'read');
      }

      const result = await testService.getTestResults(testId, userId, workspaceId);
      return res.success(result);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 停止测试
   * POST /api/test/:testId/stop
   */
  async stopTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const userId = req.user.id;
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, userId, 'execute');
      }

      await testService.stopTest(userId, testId, workspaceId);
      return res.success({ testId }, '测试已停止');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 删除测试
   * DELETE /api/test/:testId
   */
  async deleteTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const userId = req.user.id;
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, userId, 'delete');
      }

      await testService.deleteTest(userId, testId, workspaceId);
      return res.success({ testId }, '测试已删除');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * API根路径
   * GET /api/test
   */
  async getApiInfo(_req: Request, res: ApiResponse) {
    return res.success({
      message: 'Test API',
      version: '2.0.0',
      endpoints: {
        core: [
          'POST /api/test/create-and-start',
          'POST /api/test/website',
          'POST /api/test/performance',
          'POST /api/test/security',
          'POST /api/test/seo',
          'POST /api/test/stress',
          'POST /api/test/api',
          'POST /api/test/accessibility',
          'POST /api/test/compatibility',
          'POST /api/test/ux',
        ],
        management: [
          'GET /api/test/:testId/status',
          'GET /api/test/:testId/result',
          'POST /api/test/:testId/stop',
          'DELETE /api/test/:testId',
          'PUT /api/test/:testId',
          'POST /api/test/:testId/rerun',
        ],
        batch: [
          'POST /api/test/batch',
          'GET /api/test/batch/:batchId',
          'DELETE /api/test/batch/:batchId',
        ],
        templates: [
          'GET /api/test/templates',
          'POST /api/test/templates',
          'PUT /api/test/templates/:templateId',
          'DELETE /api/test/templates/:templateId',
        ],
      },
    });
  }

  /**
   * 创建网站测试
   * POST /api/test/website
   */
  async createWebsiteTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const workspaceId = (config.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createWebsiteTest(config, user);
      return res.created(result, '网站测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 创建性能测试
   * POST /api/test/performance
   */
  async createPerformanceTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const workspaceId = (config.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createPerformanceTest(config, user);
      return res.created(result, '性能测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 创建安全测试
   * POST /api/test/security
   */
  async createSecurityTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const workspaceId = (config.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createSecurityTest(config, user);
      return res.created(result, '安全测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 创建SEO测试
   * POST /api/test/seo
   */
  async createSEOTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const workspaceId = (config.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createSEOTest(config, user);
      return res.created(result, 'SEO测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 创建压力测试
   * POST /api/test/stress
   */
  async createStressTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const workspaceId = (config.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createStressTest(config, user);
      return res.created(result, '压力测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 创建API测试
   * POST /api/test/api
   */
  async createAPITest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const workspaceId = (config.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createAPITest(config, user);
      return res.created(result, 'API测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 创建可访问性测试
   * POST /api/test/accessibility
   */
  async createAccessibilityTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const workspaceId = (config.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createAccessibilityTest(config, user);
      return res.created(result, '可访问性测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 创建兼容性测试
   * POST /api/test/compatibility
   */
  async createCompatibilityTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const workspaceId = (config.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createCompatibilityTest(config, user);
      return res.created(result, '兼容性测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 创建UX测试
   * POST /api/test/ux
   */
  async createUXTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const workspaceId = (config.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createUXTest(config, user);
      return res.created(result, 'UX测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 重新运行测试
   * POST /api/test/:testId/rerun
   */
  async rerunTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const userId = req.user.id;
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, userId, 'execute');
      }

      const result = await testService.rerunTest(
        testId,
        userId,
        req.user.role || 'free',
        workspaceId
      );
      return res.success(result, '测试重新运行成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 更新测试
   * PUT /api/test/:testId
   */
  async updateTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const userId = req.user.id;
      const updates = req.body as Record<string, unknown>;
      const workspaceId = (updates.workspaceId as string | undefined) || undefined;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, userId, 'write');
      }

      const result = await testService.updateTest(testId, userId, updates, workspaceId);
      return res.success(result, '测试更新成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 批量创建测试
   * POST /api/test/batch
   */
  async createBatchTests(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { tests } = req.body as { tests?: Record<string, unknown>[] };
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      if (!Array.isArray(tests) || tests.length === 0) {
        return res.error(StandardErrorCode.INVALID_INPUT, '请提供有效的测试列表', undefined, 400);
      }

      const workspaceIds = new Set<string>();
      tests.forEach(test => {
        const workspaceId = test.workspaceId as string | undefined;
        if (workspaceId) {
          workspaceIds.add(workspaceId);
        }
      });
      for (const workspaceId of workspaceIds) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }

      const result = await testService.createBatchTests(tests, user);
      return res.created(result, '批量测试创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取批量测试状态
   * GET /api/test/batch/:batchId
   */
  async getBatchTestStatus(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { batchId } = req.params as { batchId: string };
      const userId = req.user.id;
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, userId, 'read');
      }

      const result = await testService.getBatchTestStatus(batchId, userId, workspaceId);
      return res.success(result);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 删除批量测试
   * DELETE /api/test/batch/:batchId
   */
  async deleteBatchTests(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { batchId } = req.params as { batchId: string };
      const userId = req.user.id;
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, userId, 'delete');
      }

      await testService.deleteBatchTests(batchId, userId, workspaceId);
      return res.success({ batchId }, '批量测试删除成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取测试列表
   * GET /api/test
   */
  async getTestList(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { page = '1', limit = '10', workspaceId } = req.query as Record<string, string>;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
      }
      const result = await testService.getTestList(
        req.user.id,
        parseInt(page, 10) || 1,
        parseInt(limit, 10) || 10,
        workspaceId
      );
      return res.success(result);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取测试历史
   * GET /api/test/history
   */
  async getTestHistory(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const {
        testType,
        page = '1',
        limit = '20',
        workspaceId,
      } = req.query as Record<string, string>;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
      }
      const result = await testService.getTestHistory(
        req.user.id,
        testType,
        parseInt(page, 10) || 1,
        parseInt(limit, 10) || 20,
        workspaceId
      );
      return res.success(result);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取测试进度
   * GET /api/test/:testId/progress
   */
  async getProgress(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
      }
      const status = await testService.getStatus(req.user.id, testId, workspaceId);
      return res.success({ testId, progress: status.progress, status: status.status });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 导出测试结果
   * GET /api/test/:testId/export
   */
  async exportTestResult(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const { format = 'json', workspaceId } = req.query as {
        format?: string;
        workspaceId?: string;
      };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
      }
      const result = await testService.getTestResults(testId, req.user.id, workspaceId);

      if (format === 'csv') {
        const csvRows: string[][] = [['section', 'field', 'value']];
        const appendEntries = (section: string, record: Record<string, unknown>) => {
          Object.entries(record).forEach(([key, value]) => {
            csvRows.push([section, key, JSON.stringify(value)]);
          });
        };

        appendEntries('summary', result.summary || {});

        (result.metrics || []).forEach((metric: Record<string, unknown>) => {
          const metricName =
            (metric as { metric_name?: string; metricName?: string }).metric_name ||
            (metric as { metric_name?: string; metricName?: string }).metricName ||
            'metric';
          csvRows.push(['metric', metricName, JSON.stringify(metric)]);
        });

        (result.warnings || []).forEach((warning: unknown, index: number) => {
          csvRows.push(['warning', `warning_${index + 1}`, JSON.stringify(warning)]);
        });

        (result.errors || []).forEach((error: unknown, index: number) => {
          csvRows.push(['error', `error_${index + 1}`, JSON.stringify(error)]);
        });

        const csvContent = csvRows.map(row => row.map(item => `"${item}"`).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="test-${testId}.csv"`);
        return res.send('\ufeff' + csvContent);
      }

      return res.success(result);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 取消测试
   * POST /api/test/:testId/cancel
   */
  async cancelTest(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
      }
      await testService.cancelTest(req.user.id, testId, workspaceId);
      return res.success({ testId }, '测试已取消');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取历史记录详情
   * GET /api/test/history/:testId
   */
  async getHistoryDetail(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
      }
      const result = await testService.getTestDetail(req.user.id, testId, workspaceId);
      return res.success(result);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取测试日志
   * GET /api/test/:testId/logs
   */
  async getTestLogs(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const {
        limit = '100',
        offset = '0',
        level,
        workspaceId,
      } = req.query as Record<string, string>;
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
      }
      const result = await testService.getTestLogs(
        req.user.id,
        testId,
        parseInt(limit, 10) || 100,
        parseInt(offset, 10) || 0,
        level,
        workspaceId
      );
      return res.success(result);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取测试模板列表
   * GET /api/test/templates
   */
  async getTemplates(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { engineType, workspaceId } = req.query as {
        engineType?: string;
        workspaceId?: string;
      };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
      }
      const templates = await testTemplateService.listTemplates(
        req.user.id,
        engineType,
        workspaceId
      );
      return res.success(templates);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 创建测试模板
   * POST /api/test/templates
   */
  async createTemplate(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const payload = req.body as {
        name?: string;
        description?: string;
        engineType?: string;
        config?: Record<string, unknown>;
        isPublic?: boolean;
        isDefault?: boolean;
        workspaceId?: string;
      };

      if (payload.workspaceId) {
        await ensureWorkspacePermission(payload.workspaceId, req.user.id, 'write');
      }

      if (!payload.name || !payload.engineType) {
        return res.error(StandardErrorCode.INVALID_INPUT, '模板名称和测试类型必填', undefined, 400);
      }

      const templateId = await testTemplateService.createTemplate(req.user.id, {
        name: payload.name,
        description: payload.description,
        engineType: payload.engineType,
        config: payload.config || {},
        isPublic: payload.isPublic,
        isDefault: payload.isDefault,
        workspaceId: payload.workspaceId,
      });

      return res.created({ id: templateId }, '模板创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 更新测试模板
   * PUT /api/test/templates/:templateId
   */
  async updateTemplate(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { templateId } = req.params as { templateId: string };
      const updates = req.body as {
        name?: string;
        description?: string;
        engineType?: string;
        config?: Record<string, unknown>;
        isPublic?: boolean;
        isDefault?: boolean;
        workspaceId?: string;
      };
      if (updates.workspaceId) {
        await ensureWorkspacePermission(updates.workspaceId, req.user.id, 'write');
      }

      await testTemplateService.updateTemplate(
        req.user.id,
        templateId,
        updates,
        updates.workspaceId
      );
      return res.success({ templateId }, '模板更新成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 删除测试模板
   * DELETE /api/test/templates/:templateId
   */
  async deleteTemplate(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { templateId } = req.params as { templateId: string };
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'delete');
      }
      await testTemplateService.deleteTemplate(req.user.id, templateId, workspaceId);
      return res.success({ templateId }, '模板删除成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }
}

module.exports = new TestController();
