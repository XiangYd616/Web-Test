import type { Request, Response } from 'express';
import { StandardErrorCode } from '../../shared/types/standardApiResponse';
import scheduledRunRepository, {
  type CollectionRow,
  type EnvironmentRow,
  type ScheduledRunRow,
} from '../repositories/scheduledRunRepository';
import { toOptionalDate } from '../utils/dateUtils';

const cron = require('node-cron');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');

type ScheduledRunServiceLike = {
  createSchedule: (data: Record<string, unknown>) => Promise<string>;
  updateSchedule: (scheduleId: string, updates: Record<string, unknown>) => Promise<unknown>;
  deleteSchedule: (scheduleId: string) => Promise<boolean>;
  executeSchedule: (scheduleId: string, options?: Record<string, unknown>) => Promise<string>;
  getStatistics: (workspaceId?: string) => Promise<unknown>;
  getExecution: (executionId: string) => Promise<unknown>;
  getAllExecutions: () => Promise<unknown[]>;
  cancelExecution: (executionId: string) => Promise<boolean>;
};

let _scheduledRunService: ScheduledRunServiceLike | null = null;

const setScheduledRunService = (service: unknown) => {
  _scheduledRunService = service as ScheduledRunServiceLike;
};

const getScheduledRunService = () => {
  if (!_scheduledRunService) {
    throw new Error('ScheduledRunService 未初始化');
  }
  return _scheduledRunService;
};

type ApiResponse = Response & {
  validationError: (errors: ValidationError[]) => Response;
  success: (data?: unknown, message?: string) => Response;
  created: (data?: unknown, message?: string) => Response;
  notFound: (message?: string) => Response;
  forbidden: (message?: string) => Response;
  error: (code: string, message?: string, details?: unknown, statusCode?: number) => Response;
  paginated: (
    data: unknown[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ) => Response;
};

type AuthRequest = Request & { user: { id: string; role?: string } };

type ValidationError = { field: string; message: string };

type ScheduleConfig = {
  iterations?: number;
  delay?: number;
  timeout?: number;
};

type TaskExecutionResponse = {
  id: string;
  taskId: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  results?: Record<string, unknown>;
  error?: string;
  triggeredBy: 'schedule' | 'manual';
  retryCount: number;
  maxRetries: number;
  totalRequests?: number;
  passedRequests?: number;
  failedRequests?: number;
  errorCount?: number;
  logs?: string[];
  metadata?: Record<string, unknown>;
};

const handleControllerError = (res: ApiResponse, error: unknown, message = '请求处理失败') => {
  return res.error(
    StandardErrorCode.INTERNAL_SERVER_ERROR,
    message,
    error instanceof Error ? error.message : String(error),
    500
  );
};

const parsePagination = (req: Request) => {
  const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const ensureWorkspaceMember = async (workspaceId: string, userId: string) => {
  return scheduledRunRepository.getWorkspaceMember(workspaceId, userId);
};

const ensureWorkspacePermission = async (workspaceId: string, userId: string, action: string) => {
  const member = await ensureWorkspaceMember(workspaceId, userId);
  if (!member) {
    return { error: '没有权限访问该工作空间' };
  }
  if (!hasWorkspacePermission(member.role, action)) {
    return { error: '当前角色无此操作权限' };
  }
  return { member };
};

const ensureCollectionInWorkspace = async (
  collectionId: string,
  workspaceId: string
): Promise<{ collection: CollectionRow } | { error: string }> => {
  const collection = await scheduledRunRepository.getCollectionById(collectionId);
  if (!collection) {
    return { error: '集合不存在' };
  }
  if (collection.workspace_id !== workspaceId) {
    return { error: '集合不属于当前工作空间' };
  }
  return { collection };
};

const ensureEnvironmentInWorkspace = async (
  environmentId: string,
  workspaceId: string
): Promise<{ environment: EnvironmentRow | null } | { error: string }> => {
  if (!environmentId) {
    return { environment: null };
  }
  const environment = await scheduledRunRepository.getEnvironmentById(environmentId);
  if (!environment) {
    return { error: '环境不存在' };
  }
  if (environment.workspace_id !== workspaceId) {
    return { error: '环境不属于当前工作空间' };
  }
  return { environment };
};

const fetchScheduledRunById = async (scheduleId: string): Promise<ScheduledRunRow | null> => {
  return scheduledRunRepository.getScheduledRunById(scheduleId);
};

const fetchScheduledRunByWorkspace = async (
  scheduleId: string,
  workspaceId: string
): Promise<ScheduledRunRow | null> => {
  return scheduledRunRepository.getScheduledRunByWorkspace(scheduleId, workspaceId);
};

const fetchScheduledRunsByWorkspace = async (
  workspaceId: string,
  status: string | undefined,
  limit: number,
  offset: number
) => {
  return scheduledRunRepository.getScheduledRunsByWorkspace(workspaceId, status, limit, offset);
};

const fetchScheduleIdsByWorkspace = async (workspaceId: string, scheduleId?: string) => {
  return scheduledRunRepository.getScheduleIdsByWorkspace(workspaceId, scheduleId);
};

const validateScheduleConfig = (config: ScheduleConfig = {}, res: ApiResponse) => {
  const errors: ValidationError[] = [];
  if (config.iterations !== undefined) {
    const iterations = Number(config.iterations);
    if (!Number.isFinite(iterations) || iterations < 1 || iterations > 100) {
      errors.push({ field: 'config.iterations', message: 'iterations 需在 1~100 之间' });
    }
  }
  if (config.delay !== undefined) {
    const delay = Number(config.delay);
    if (!Number.isFinite(delay) || delay < 0 || delay > 10000) {
      errors.push({ field: 'config.delay', message: 'delay 需在 0~10000 之间' });
    }
  }
  if (config.timeout !== undefined) {
    const timeout = Number(config.timeout);
    if (!Number.isFinite(timeout) || timeout < 100 || timeout > 120000) {
      errors.push({ field: 'config.timeout', message: 'timeout 需在 100~120000 之间' });
    }
  }

  if (errors.length > 0) {
    res.validationError(errors);
    return false;
  }
  return true;
};

const listScheduledRuns = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }
    const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const status = req.query.status as string;
    if (status && !['active', 'inactive'].includes(status)) {
      return res.validationError([{ field: 'status', message: 'status 仅支持 active/inactive' }]);
    }

    const { page, limit, offset } = parsePagination(req);
    const result = await fetchScheduledRunsByWorkspace(workspaceId, status, limit, offset);

    return res.paginated(result.rows, page, limit, result.total, '获取定时运行列表成功');
  } catch (error) {
    return handleControllerError(res, error, '获取定时运行列表失败');
  }
};

const listSchedulingTasks = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }

    const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const { page, limit, offset } = parsePagination(req);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await scheduledRunRepository.listSchedulingTasks(
      workspaceId,
      status,
      search,
      limit,
      offset
    );

    return res.success({
      tasks: result.rows,
      total: result.total,
      pagination: { page, limit, total: result.total },
    });
  } catch (error) {
    return handleControllerError(res, error, '获取调度任务失败');
  }
};

const getScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const scheduledRun = await fetchScheduledRunById(req.params.scheduleId);
    if (!scheduledRun) {
      return res.notFound('定时运行不存在');
    }
    if (!scheduledRun.workspace_id) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }

    const permission = await ensureWorkspacePermission(
      scheduledRun.workspace_id,
      req.user.id,
      'read'
    );
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    return res.success(scheduledRun);
  } catch (error) {
    return handleControllerError(res, error, '获取定时运行失败');
  }
};

const createScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const {
      workspaceId,
      collectionId,
      environmentId,
      cronExpression,
      config = {},
      name,
      description,
      timezone = 'UTC',
    } = req.body as {
      workspaceId?: string;
      collectionId?: string;
      environmentId?: string;
      cronExpression?: string;
      config?: ScheduleConfig;
      name?: string;
      description?: string;
      timezone?: string;
    };

    if (!workspaceId || !collectionId || !cronExpression) {
      return res.validationError([
        { field: 'workspaceId', message: 'workspaceId 不能为空' },
        { field: 'collectionId', message: 'collectionId 不能为空' },
        { field: 'cronExpression', message: 'cronExpression 不能为空' },
      ]);
    }

    if (!cron.validate(cronExpression)) {
      return res.validationError([{ field: 'cronExpression', message: 'cron 表达式无效' }]);
    }

    if (!validateScheduleConfig(config, res)) {
      return;
    }

    const collectionResult = await ensureCollectionInWorkspace(collectionId, workspaceId);
    if ('error' in collectionResult) {
      return res.notFound(collectionResult.error);
    }

    const { collection } = collectionResult;

    const permission = await ensureWorkspacePermission(
      collection.workspace_id,
      req.user.id,
      'write'
    );
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const envCheck = await ensureEnvironmentInWorkspace(
      environmentId || '',
      collection.workspace_id
    );
    if ('error' in envCheck) {
      return res.notFound(envCheck.error);
    }

    const service = getScheduledRunService();
    const scheduleId = await service.createSchedule({
      workspaceId: collection.workspace_id,
      name: name || `scheduled-${collectionId}`,
      description: description || '',
      cronExpression,
      timezone,
      collectionId,
      environmentId: envCheck.environment?.id || '',
      status: 'active',
      lastRunAt: undefined,
      nextRunAt: undefined,
      config,
      createdBy: req.user.id,
    });

    const scheduledRun = await fetchScheduledRunById(scheduleId);
    return res.created(scheduledRun, '定时运行创建成功');
  } catch (error) {
    return handleControllerError(res, error, '创建定时运行失败');
  }
};

const updateScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const scheduledRun = await fetchScheduledRunById(req.params.scheduleId);
    if (!scheduledRun) {
      return res.notFound('定时运行不存在');
    }
    if (!scheduledRun.workspace_id) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }

    const permission = await ensureWorkspacePermission(
      scheduledRun.workspace_id,
      req.user.id,
      'write'
    );
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const {
      cronExpression,
      config = {},
      status,
      name,
      description,
      timezone,
    } = req.body as {
      cronExpression?: string;
      config?: ScheduleConfig;
      status?: string;
      name?: string;
      description?: string;
      timezone?: string;
    };

    if (cronExpression && !cron.validate(cronExpression)) {
      return res.validationError([{ field: 'cronExpression', message: 'cron 表达式无效' }]);
    }

    if (config && !validateScheduleConfig(config, res)) {
      return;
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return res.validationError([{ field: 'status', message: 'status 仅支持 active/inactive' }]);
    }

    const updates: Record<string, unknown> = {};
    if (cronExpression) updates.cronExpression = cronExpression;
    if (config) updates.config = config;
    if (status) updates.status = status;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (timezone !== undefined) updates.timezone = timezone;

    const service = getScheduledRunService();
    await service.updateSchedule(scheduledRun.id, updates);

    const refreshed = await fetchScheduledRunById(scheduledRun.id);
    return res.success(refreshed, '定时运行更新成功');
  } catch (error) {
    return handleControllerError(res, error, '更新定时运行失败');
  }
};

const deleteScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const scheduledRun = await fetchScheduledRunById(req.params.scheduleId);
    if (!scheduledRun) {
      return res.notFound('定时运行不存在');
    }
    if (!scheduledRun.workspace_id) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }

    const permission = await ensureWorkspacePermission(
      scheduledRun.workspace_id,
      req.user.id,
      'delete'
    );
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const service = getScheduledRunService();
    await service.deleteSchedule(scheduledRun.id);

    return res.success(null, '定时运行删除成功');
  } catch (error) {
    return handleControllerError(res, error, '删除定时运行失败');
  }
};

const executeScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const scheduleId = req.params.scheduleId;
    const workspaceId = req.query.workspaceId as string | undefined;
    if (!workspaceId) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }
    const scheduledRun = await fetchScheduledRunByWorkspace(scheduleId, workspaceId);
    if (!scheduledRun) {
      return res.notFound('定时运行不存在');
    }

    const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'write');
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const service = getScheduledRunService();
    const executionId = await service.executeSchedule(scheduleId, {
      metadata: { triggeredBy: 'manual', userId: req.user.id },
    });

    return res.success({ executionId }, '定时运行已触发');
  } catch (error) {
    return handleControllerError(res, error, '执行定时运行失败');
  }
};

const cancelExecution = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const executionId = req.params.executionId;
    const service = getScheduledRunService();
    const cancelled = await service.cancelExecution(executionId);
    if (!cancelled) {
      return res.notFound('执行任务不存在或已结束');
    }
    return res.success(null, '执行已取消');
  } catch (error) {
    return handleControllerError(res, error, '取消执行失败');
  }
};

const getExecutionHistory = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const scheduleId = req.query.taskId as string | undefined;
    const workspaceId = req.query.workspaceId as string | undefined;
    const status = req.query.status as string | undefined;
    const triggeredBy = req.query.triggeredBy as string | undefined;
    if (!workspaceId) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }
    const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
    if (permission.error) {
      return res.forbidden(permission.error);
    }
    const { page, limit, offset } = parsePagination(req);

    if (status && !['success', 'failed', 'running', 'cancelled'].includes(status)) {
      return res.validationError([
        { field: 'status', message: 'status 仅支持 success/failed/running/cancelled' },
      ]);
    }

    if (triggeredBy && !['schedule', 'manual'].includes(triggeredBy)) {
      return res.validationError([
        { field: 'triggeredBy', message: 'triggeredBy 仅支持 schedule/manual' },
      ]);
    }

    const scheduleIds = await fetchScheduleIdsByWorkspace(workspaceId, scheduleId);
    if (scheduleIds.length === 0) {
      return res.success({ executions: [], total: 0, pagination: { page, limit, total: 0 } });
    }

    const result = await scheduledRunRepository.getScheduledRunResultsByScheduleIds(
      scheduleIds,
      status,
      triggeredBy,
      limit,
      offset
    );
    const count = result.total;
    const executions: TaskExecutionResponse[] = result.rows.map(row => {
      const metadata = (row.metadata as Record<string, unknown> | undefined) || {};
      return {
        id: String(row.id),
        taskId: String(row.scheduled_run_id),
        status: String(row.status),
        startTime: toOptionalDate(row.started_at),
        endTime: toOptionalDate(row.completed_at),
        duration: row.duration,
        results: metadata,
        error: metadata.error as string | undefined,
        totalRequests: row.total_requests,
        passedRequests: row.passed_requests,
        failedRequests: row.failed_requests,
        errorCount: row.error_count,
        logs: row.logs,
        metadata,
        triggeredBy:
          (row.triggered_by as 'schedule' | 'manual' | undefined) ||
          (metadata.triggeredBy as 'schedule' | 'manual' | undefined) ||
          'schedule',
        retryCount: 0,
        maxRetries: 0,
      };
    });

    return res.success({
      executions,
      total: count,
      pagination: { page, limit, total: count },
    });
  } catch (error) {
    return handleControllerError(res, error, '获取执行历史失败');
  }
};

const getSchedulingStatistics = async (_req: AuthRequest, res: ApiResponse) => {
  try {
    const workspaceId = _req.query.workspaceId as string | undefined;
    if (!workspaceId) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }
    const permission = await ensureWorkspacePermission(workspaceId, _req.user.id, 'read');
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const service = getScheduledRunService();
    const statistics = await service.getStatistics(workspaceId);
    return res.success(statistics);
  } catch (error) {
    return handleControllerError(res, error, '获取调度统计失败');
  }
};

const validateCronExpression = async (req: AuthRequest, res: ApiResponse) => {
  const expression = String(req.body?.expression || '');
  if (!expression) {
    return res.validationError([{ field: 'expression', message: 'expression 不能为空' }]);
  }
  const valid = cron.validate(expression);
  return res.success({ valid, nextRuns: valid ? [] : undefined });
};

const startScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const scheduledRun = await fetchScheduledRunById(req.params.scheduleId);
    if (!scheduledRun) {
      return res.notFound('定时运行不存在');
    }
    if (!scheduledRun.workspace_id) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }

    const permission = await ensureWorkspacePermission(
      scheduledRun.workspace_id,
      req.user.id,
      'write'
    );
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const service = getScheduledRunService();
    await service.updateSchedule(scheduledRun.id, { status: 'active' });
    const refreshed = await fetchScheduledRunById(scheduledRun.id);
    return res.success(refreshed, '定时运行已启动');
  } catch (error) {
    return handleControllerError(res, error, '启动定时运行失败');
  }
};

const pauseScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const scheduledRun = await fetchScheduledRunById(req.params.scheduleId);
    if (!scheduledRun) {
      return res.notFound('定时运行不存在');
    }
    if (!scheduledRun.workspace_id) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }

    const permission = await ensureWorkspacePermission(
      scheduledRun.workspace_id,
      req.user.id,
      'write'
    );
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const service = getScheduledRunService();
    await service.updateSchedule(scheduledRun.id, { status: 'inactive' });
    const refreshed = await fetchScheduledRunById(scheduledRun.id);
    return res.success(refreshed, '定时运行已暂停');
  } catch (error) {
    return handleControllerError(res, error, '暂停定时运行失败');
  }
};

export {
  cancelExecution,
  createScheduledRun,
  deleteScheduledRun,
  executeScheduledRun,
  getExecutionHistory,
  getScheduledRun,
  getSchedulingStatistics,
  listScheduledRuns,
  listSchedulingTasks,
  setScheduledRunService,
  updateScheduledRun,
  validateCronExpression,
};

module.exports = {
  listScheduledRuns,
  getScheduledRun,
  createScheduledRun,
  updateScheduledRun,
  deleteScheduledRun,
  listSchedulingTasks,
  executeScheduledRun,
  cancelExecution,
  getExecutionHistory,
  getSchedulingStatistics,
  validateCronExpression,
  startScheduledRun,
  pauseScheduledRun,
  setScheduledRunService,
};
