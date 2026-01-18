const { models } = require('../database/sequelize');
const EnvironmentManager = require('../services/environments/EnvironmentManager');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');

const environmentManager = new EnvironmentManager({ models });

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
    return { error: '没有权限访问该工作空间环境' };
  }
  if (!hasWorkspacePermission(member.role, action)) {
    return { error: '当前角色无此操作权限' };
  }
  return { member };
};

const ensureEnvironmentAccess = async (environmentId, userId) => {
  const { Environment } = models;
  const environment = await Environment.findByPk(environmentId);
  if (!environment) {
    return { error: '环境不存在' };
  }
  const member = await ensureWorkspaceMember(environment.workspace_id, userId);
  if (!member) {
    return { error: '没有权限访问该环境' };
  }
  return { environment, member };
};

const validateEnvironmentInput = (data, res) => {
  const errors = [];
  const name = data?.name || '';
  if (!name || name.length > 255) {
    errors.push({ field: 'name', message: '环境名称不能为空且长度不超过255' });
  }
  if (data?.description && data.description.length > 2000) {
    errors.push({ field: 'description', message: '描述长度不能超过2000' });
  }
  if (data?.timeout !== undefined) {
    const timeout = Number(data.timeout);
    if (!Number.isFinite(timeout) || timeout < 100 || timeout > 120000) {
      errors.push({ field: 'timeout', message: 'timeout 需在 100~120000 之间' });
    }
  }
  if (data?.retries !== undefined) {
    const retries = Number(data.retries);
    if (!Number.isFinite(retries) || retries < 0 || retries > 10) {
      errors.push({ field: 'retries', message: 'retries 需在 0~10 之间' });
    }
  }

  if (errors.length > 0) {
    res.validationError(errors);
    return false;
  }
  return true;
};

const listEnvironments = async (req, res) => {
  const workspaceId = req.query.workspaceId;
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const { Environment, EnvironmentVariable } = models;
  const { page, limit, offset } = parsePagination(req);
  const { count, rows } = await Environment.findAndCountAll({
    where: { workspace_id: workspaceId },
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });

  const results = [];
  for (const environment of rows) {
    const variableCount = await EnvironmentVariable.count({ where: { environment_id: environment.id } });
    results.push({
      id: environment.id,
      name: environment.name,
      description: environment.description,
      variableCount,
      isActive: environment.metadata?.isActive || false,
      color: environment.metadata?.color || null,
      createdAt: environment.createdAt?.toISOString?.() || environment.created_at,
      updatedAt: environment.updatedAt?.toISOString?.() || environment.updated_at
    });
  }

  return res.paginated(results, page, limit, count, '获取环境列表成功');
};

const createEnvironment = async (req, res) => {
  const { workspaceId } = req.body || {};
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  if (!validateEnvironmentInput(req.body, res)) {
    return;
  }
  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'write');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const environment = await environmentManager.createEnvironment({
    ...req.body,
    workspaceId,
    createdBy: req.user.id
  });

  return res.created(environment, '创建环境成功');
};

const getEnvironment = async (req, res) => {
  const access = await ensureEnvironmentAccess(req.params.environmentId, req.user.id);
  if (access.error) {
    return access.error === '环境不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'read')) {
    return res.forbidden('当前角色无读取权限');
  }
  const environment = await environmentManager.getEnvironment(req.params.environmentId);
  return res.success(environment, '获取环境成功');
};

const deleteEnvironment = async (req, res) => {
  const access = await ensureEnvironmentAccess(req.params.environmentId, req.user.id);
  if (access.error) {
    return access.error === '环境不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'delete')) {
    return res.forbidden('当前角色无删除权限');
  }
  await environmentManager.deleteEnvironment(req.params.environmentId);
  return res.success(null, '删除环境成功');
};

const setActiveEnvironment = async (req, res) => {
  const access = await ensureEnvironmentAccess(req.params.environmentId, req.user.id);
  if (access.error) {
    return access.error === '环境不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'write')) {
    return res.forbidden('当前角色无写入权限');
  }
  const environment = await environmentManager.setActiveEnvironment(req.params.environmentId);
  return res.success(environment, '设置活跃环境成功');
};

const setVariable = async (req, res) => {
  const { key, value, scope = 'environment' } = req.body || {};
  if (!key) {
    return res.validationError([{ field: 'key', message: '变量 key 不能为空' }]);
  }
  if (String(key).length > 255) {
    return res.validationError([{ field: 'key', message: '变量 key 长度不能超过255' }]);
  }
  if (!['environment', 'global'].includes(scope)) {
    return res.validationError([{ field: 'scope', message: 'scope 仅支持 environment/global' }]);
  }
  if (req.body?.type && !['string', 'text', 'number', 'boolean', 'json'].includes(req.body.type)) {
    return res.validationError([{ field: 'type', message: 'type 仅支持 string/text/number/boolean/json' }]);
  }

  if (scope === 'environment') {
    const access = await ensureEnvironmentAccess(req.params.environmentId, req.user.id);
    if (access.error) {
      return access.error === '环境不存在' ? res.notFound(access.error) : res.forbidden(access.error);
    }
    if (!hasWorkspacePermission(access.member.role, 'write')) {
      return res.forbidden('当前角色无写入权限');
    }
  } else if (!req.body?.workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'global 变量需要 workspaceId' }]);
  } else {
    const permission = await ensureWorkspacePermission(req.body.workspaceId, req.user.id, 'write');
    if (permission.error) {
      return res.forbidden(permission.error || '当前角色无写入权限');
    }
  }

  await environmentManager.setVariable(key, value, {
    scope,
    environmentId: req.body?.environmentId || req.params.environmentId,
    secret: req.body?.secret || false,
    type: req.body?.type,
    description: req.body?.description,
    userId: req.user.id,
    workspaceId: req.body?.workspaceId
  });

  return res.success(null, '变量设置成功');
};

const getGlobalVariables = async (req, res) => {
  if (!req.query.workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  const permission = await ensureWorkspacePermission(req.query.workspaceId, req.user.id, 'read');
  if (permission.error) {
    return res.forbidden(permission.error);
  }
  const globals = await environmentManager.getGlobalVariables({
    userId: req.user.id,
    workspaceId: req.query.workspaceId || null
  });
  return res.success(globals, '获取全局变量成功');
};

module.exports = {
  listEnvironments,
  createEnvironment,
  getEnvironment,
  deleteEnvironment,
  setActiveEnvironment,
  setVariable,
  getGlobalVariables
};
