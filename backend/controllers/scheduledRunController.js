const cron = require('node-cron');
const { models } = require('../database/sequelize');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');

let scheduledRunService = null;

const setScheduledRunService = (service) => {
  scheduledRunService = service;
};

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const ensureWorkspaceMember = async (workspaceId, userId) => {
  const { WorkspaceMember } = models;
  return WorkspaceMember.findOne({
    where: { workspace_id: workspaceId, user_id: userId, status: 'active' }
  });
};

const ensureWorkspacePermission = async (workspaceId, userId, action) => {
  const member = await ensureWorkspaceMember(workspaceId, userId);
  if (!member) {
    return { error: '没有权限访问该工作空间' };
  }
  if (!hasWorkspacePermission(member.role, action)) {
    return { error: '当前角色无此操作权限' };
  }
  return { member };
};

const ensureCollectionInWorkspace = async (collectionId, workspaceId) => {
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

const ensureEnvironmentInWorkspace = async (environmentId, workspaceId) => {
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

const validateScheduleConfig = (config = {}, res) => {
  const errors = [];
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

const listScheduledRuns = async (req, res) => {
  const workspaceId = req.query.workspaceId;
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const status = req.query.status;
  if (status && !['active', 'inactive'].includes(status)) {
    return res.validationError([{ field: 'status', message: 'status 仅支持 active/inactive' }]);
  }

  const { ScheduledRun } = models;
  const { page, limit, offset } = parsePagination(req);
  const { count, rows } = await ScheduledRun.findAndCountAll({
    where: { workspace_id: workspaceId, ...(status ? { status } : {}) },
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
  return res.paginated(rows, page, limit, count, '获取定时运行列表成功');
};

const getScheduledRun = async (req, res) => {
  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findByPk(req.params.scheduleId);
  if (!scheduledRun) {
    return res.notFound('定时运行不存在');
  }
  const permission = await ensureWorkspacePermission(scheduledRun.workspace_id, req.user.id, 'read');
  if (permission.error) {
    return res.forbidden(permission.error);
  }
  return res.success(scheduledRun, '获取定时运行成功');
};

const createScheduledRun = async (req, res) => {
  const { workspaceId, collectionId, environmentId, name, cron: cronExpr, config } = req.body || {};
  if (!workspaceId || !collectionId || !name || !cronExpr) {
    return res.validationError([
      { field: 'workspaceId', message: 'workspaceId 不能为空' },
      { field: 'collectionId', message: 'collectionId 不能为空' },
      { field: 'name', message: 'name 不能为空' },
      { field: 'cron', message: 'cron 不能为空' }
    ]);
  }
  if (!cron.validate(cronExpr)) {
    return res.validationError([{ field: 'cron', message: 'cron 表达式无效' }]);
  }
  if (!validateScheduleConfig(config || {}, res)) {
    return;
  }

  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const collectionCheck = await ensureCollectionInWorkspace(collectionId, workspaceId);
  if (collectionCheck.error) {
    return res.validationError([{ field: 'collectionId', message: collectionCheck.error }]);
  }
  const environmentCheck = await ensureEnvironmentInWorkspace(environmentId, workspaceId);
  if (environmentCheck.error) {
    return res.validationError([{ field: 'environmentId', message: environmentCheck.error }]);
  }

  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.create({
    workspace_id: workspaceId,
    collection_id: collectionId,
    environment_id: environmentId || null,
    name,
    cron: cronExpr,
    status: 'active',
    config: config || {},
    created_by: req.user.id
  });

  if (scheduledRunService) {
    scheduledRunService.scheduleJob(scheduledRun);
  }

  return res.created(scheduledRun, '创建定时运行成功');
};

const updateScheduledRun = async (req, res) => {
  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findByPk(req.params.scheduleId);
  if (!scheduledRun) {
    return res.notFound('定时运行不存在');
  }

  const permission = await ensureWorkspacePermission(scheduledRun.workspace_id, req.user.id, 'manage');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  if (req.body?.cron && !cron.validate(req.body.cron)) {
    return res.validationError([{ field: 'cron', message: 'cron 表达式无效' }]);
  }
  if (req.body?.status && !['active', 'inactive'].includes(req.body.status)) {
    return res.validationError([{ field: 'status', message: 'status 仅支持 active/inactive' }]);
  }
  if (req.body?.config && !validateScheduleConfig(req.body.config, res)) {
    return;
  }

  if (req.body?.collectionId) {
    const collectionCheck = await ensureCollectionInWorkspace(req.body.collectionId, scheduledRun.workspace_id);
    if (collectionCheck.error) {
      return res.validationError([{ field: 'collectionId', message: collectionCheck.error }]);
    }
  }

  if (req.body?.environmentId) {
    const environmentCheck = await ensureEnvironmentInWorkspace(req.body.environmentId, scheduledRun.workspace_id);
    if (environmentCheck.error) {
      return res.validationError([{ field: 'environmentId', message: environmentCheck.error }]);
    }
  }

  await scheduledRun.update({
    name: req.body?.name ?? scheduledRun.name,
    cron: req.body?.cron ?? scheduledRun.cron,
    status: req.body?.status ?? scheduledRun.status,
    config: req.body?.config ?? scheduledRun.config,
    collection_id: req.body?.collectionId ?? scheduledRun.collection_id,
    environment_id: req.body?.environmentId ?? scheduledRun.environment_id
  });

  if (scheduledRunService) {
    scheduledRunService.scheduleJob(scheduledRun);
  }

  return res.success(scheduledRun, '更新定时运行成功');
};

const deleteScheduledRun = async (req, res) => {
  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findByPk(req.params.scheduleId);
  if (!scheduledRun) {
    return res.notFound('定时运行不存在');
  }

  const permission = await ensureWorkspacePermission(scheduledRun.workspace_id, req.user.id, 'manage');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  await ScheduledRun.destroy({ where: { id: scheduledRun.id } });
  if (scheduledRunService) {
    scheduledRunService.removeJob(scheduledRun.id);
  }

  return res.success(null, '删除定时运行成功');
};

const runScheduledNow = async (req, res) => {
  if (!scheduledRunService) {
    return res.serverError('定时运行服务未启动');
  }

  const { ScheduledRun } = models;
  const scheduledRun = await ScheduledRun.findByPk(req.params.scheduleId);
  if (!scheduledRun) {
    return res.notFound('定时运行不存在');
  }

  const permission = await ensureWorkspacePermission(scheduledRun.workspace_id, req.user.id, 'execute');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const runRecord = await scheduledRunService.executeScheduledRun(scheduledRun.id);
  if (!runRecord) {
    return res.serverError('执行定时运行失败');
  }
  return res.created({ runId: runRecord.id }, '已执行定时运行');
};

module.exports = {
  listScheduledRuns,
  getScheduledRun,
  createScheduledRun,
  updateScheduledRun,
  deleteScheduledRun,
  runScheduledNow,
  setScheduledRunService
};
