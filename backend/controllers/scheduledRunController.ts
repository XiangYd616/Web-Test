import type { Request, Response } from 'express';

const cron = require('node-cron');
const { Op } = require('sequelize');
const { models } = require('../database/sequelize');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');

type ScheduledRunServiceLike = {
  createSchedule: (data: Record<string, unknown>) => Promise<string>;
  updateSchedule: (scheduleId: string, updates: Record<string, unknown>) => Promise<unknown>;
  deleteSchedule: (scheduleId: string) => Promise<boolean>;
  executeSchedule: (scheduleId: string, options?: Record<string, unknown>) => Promise<string>;
  getStatistics: () => Promise<unknown>;
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

const parsePagination = (req: Request) => {
  const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const ensureWorkspaceMember = async (workspaceId: string, userId: string) => {
  const { WorkspaceMember } = models;
  return WorkspaceMember.findOne({
    where: { workspace_id: workspaceId, user_id: userId, status: 'active' },
  });
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

const ensureCollectionInWorkspace = async (collectionId: string, workspaceId: string) => {
  const { Collection } = models;
  const collection = await Collection.findByPk(collectionId);
  if (!collection) {
    return { error: '集合不存在' };
  }
  if (collection.workspace_id !== workspaceId) {
    return { error: '集合不属于当前工作空间' };
  }
  return { collection };
};

const ensureEnvironmentInWorkspace = async (environmentId: string, workspaceId: string) => {
  if (!environmentId) {
    return { environment: null };
  }
  const { Environment } = models;
  const environment = await Environment.findByPk(environmentId);
  if (!environment) {
    return { error: '环境不存在' };
  }
  if (environment.workspace_id !== workspaceId) {
    return { error: '环境不属于当前工作空间' };
  }
  return { environment };
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

  const { ScheduledRun } = models;
  const { page, limit, offset } = parsePagination(req);
  const { count, rows } = await ScheduledRun.findAndCountAll({
    where: { workspace_id: workspaceId, ...(status ? { status } : {}) },
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
  return res.paginated(rows, page, limit, count, '获取定时运行列表成功');
};

const listSchedulingTasks = async (req: AuthRequest, res: ApiResponse) => {
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

  const where: Record<string, unknown> = { workspace_id: workspaceId };
  if (status && ['active', 'inactive'].includes(status)) {
    where.status = status;
  }
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { ScheduledRun } = models;
  const { count, rows } = await ScheduledRun.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return res.success({
    tasks: rows,
    total: count,
    pagination: { page, limit, total: count },
  });
};

const getScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findByPk(req.params.scheduleId);
  if (!scheduledRun) {
    return res.notFound('定时运行不存在');
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
};

const createScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
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

  const collection = await ensureCollectionInWorkspace(collectionId, workspaceId);
  if (collection.error) {
    return res.notFound(collection.error);
  }

  const permission = await ensureWorkspacePermission(
    collection.collection.workspace_id,
    req.user.id,
    'write'
  );
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const envCheck = await ensureEnvironmentInWorkspace(
    environmentId || '',
    collection.collection.workspace_id
  );
  if (envCheck.error) {
    return res.notFound(envCheck.error);
  }

  const service = getScheduledRunService();
  const scheduleId = await service.createSchedule({
    workspaceId: collection.collection.workspace_id,
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

  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findByPk(scheduleId);
  return res.created(scheduledRun, '定时运行创建成功');
};

const updateScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findByPk(req.params.scheduleId);
  if (!scheduledRun) {
    return res.notFound('定时运行不存在');
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

  const refreshed = await ScheduledRun.findByPk(scheduledRun.id);
  return res.success(refreshed, '定时运行更新成功');
};

const deleteScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findByPk(req.params.scheduleId);
  if (!scheduledRun) {
    return res.notFound('定时运行不存在');
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
};

const executeScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  const scheduleId = req.params.scheduleId;
  const workspaceId = req.query.workspaceId as string | undefined;
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findOne({
    where: { id: scheduleId, workspace_id: workspaceId },
  });
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
};

const cancelExecution = async (req: AuthRequest, res: ApiResponse) => {
  const executionId = req.params.executionId;
  const service = getScheduledRunService();
  const cancelled = await service.cancelExecution(executionId);
  if (!cancelled) {
    return res.notFound('执行任务不存在或已结束');
  }
  return res.success(null, '执行已取消');
};

const getExecutionHistory = async (req: AuthRequest, res: ApiResponse) => {
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
  const { ScheduledRunResult } = models;
  const { ScheduledRun } = models;

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

  const where: Record<string, unknown> = {};
  const scheduleWhere: Record<string, unknown> = { workspace_id: workspaceId };
  if (scheduleId) {
    scheduleWhere.id = scheduleId;
  }
  const schedules = await ScheduledRun.findAll({ where: scheduleWhere });
  const scheduleIds = schedules.map((schedule: { id: string }) => schedule.id);
  if (scheduleIds.length === 0) {
    return res.success({ executions: [], total: 0, pagination: { page, limit, total: 0 } });
  }
  where.scheduled_run_id = scheduleIds;
  if (status) {
    where.status = status;
  }

  if (triggeredBy) {
    where.triggered_by = triggeredBy;
  }

  const { count, rows } = await ScheduledRunResult.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const executions: TaskExecutionResponse[] = rows.map((row: Record<string, unknown>) => {
    const metadata = (row.metadata as Record<string, unknown> | undefined) || {};
    return {
      id: String(row.id),
      taskId: String(row.scheduled_run_id),
      status: String(row.status),
      startTime: row.started_at as Date | undefined,
      endTime: row.completed_at as Date | undefined,
      duration: row.duration as number | undefined,
      results: metadata,
      error: metadata.error as string | undefined,
      totalRequests: row.total_requests as number | undefined,
      passedRequests: row.passed_requests as number | undefined,
      failedRequests: row.failed_requests as number | undefined,
      errorCount: row.error_count as number | undefined,
      logs: row.logs as string[] | undefined,
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
};

const getSchedulingStatistics = async (_req: AuthRequest, res: ApiResponse) => {
  const service = getScheduledRunService();
  const statistics = await service.getStatistics();
  return res.success(statistics);
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
  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findByPk(req.params.scheduleId);
  if (!scheduledRun) {
    return res.notFound('定时运行不存在');
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
  const refreshed = await ScheduledRun.findByPk(scheduledRun.id);
  return res.success(refreshed, '定时运行已启动');
};

const pauseScheduledRun = async (req: AuthRequest, res: ApiResponse) => {
  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findByPk(req.params.scheduleId);
  if (!scheduledRun) {
    return res.notFound('定时运行不存在');
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
  const refreshed = await ScheduledRun.findByPk(scheduledRun.id);
  return res.success(refreshed, '定时运行已暂停');
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
