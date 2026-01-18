const cron = require('node-cron');
const { models } = require('../database/sequelize');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');

let scheduledRunService = null;

const setScheduledRunService = (service) => {
  scheduledRunService = service;
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

const listScheduledRuns = async (req, res) => {
  const workspaceId = req.query.workspaceId;
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const { ScheduledRun } = models;
  const runs = await ScheduledRun.findAll({
    where: { workspace_id: workspaceId },
    order: [['created_at', 'DESC']]
  });
  return res.success(runs, '获取定时运行列表成功');
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

  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'execute');
  if (permission.error) {
    return res.forbidden(permission.error);
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

  await scheduledRun.update({
    name: req.body?.name ?? scheduledRun.name,
    cron: req.body?.cron ?? scheduledRun.cron,
    status: req.body?.status ?? scheduledRun.status,
    config: req.body?.config ?? scheduledRun.config,
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
  createScheduledRun,
  updateScheduledRun,
  deleteScheduledRun,
  runScheduledNow,
  setScheduledRunService
};
