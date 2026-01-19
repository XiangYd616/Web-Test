import type { Request, Response } from 'express';

const cron = require('node-cron');
const { models } = require('../database/sequelize');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');

let _scheduledRunService: unknown = null;

const setScheduledRunService = (service: unknown) => {
  _scheduledRunService = service;
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
    collectionId,
    environmentId,
    cronExpression,
    config = {},
  } = req.body as {
    collectionId?: string;
    environmentId?: string;
    cronExpression?: string;
    config?: ScheduleConfig;
  };

  if (!collectionId || !cronExpression) {
    return res.validationError([
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

  const collection = await ensureCollectionInWorkspace(collectionId, req.body.workspaceId);
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

  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.create({
    collection_id: collectionId,
    environment_id: envCheck.environment?.id,
    workspace_id: collection.collection.workspace_id,
    cron_expression: cronExpression,
    config,
    status: 'active',
    created_by: req.user.id,
  });

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
  } = req.body as {
    cronExpression?: string;
    config?: ScheduleConfig;
    status?: string;
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
  if (cronExpression) updates.cron_expression = cronExpression;
  if (config) updates.config = config;
  if (status) updates.status = status;

  await scheduledRun.update(updates);

  return res.success(scheduledRun, '定时运行更新成功');
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

  await scheduledRun.destroy();

  return res.success(null, '定时运行删除成功');
};

export {
  createScheduledRun,
  deleteScheduledRun,
  getScheduledRun,
  listScheduledRuns,
  setScheduledRunService,
  updateScheduledRun,
};

module.exports = {
  listScheduledRuns,
  getScheduledRun,
  createScheduledRun,
  updateScheduledRun,
  deleteScheduledRun,
  setScheduledRunService,
};
