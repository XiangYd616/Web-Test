import type { Request } from 'express';
import { query } from '../../config/database';
import { models } from '../../database/pgModels';
import type { ApiResponse, AuthRequest } from '../../types';
import { toDate } from '../../utils/dateUtils';
import {
  hasWorkspacePermission,
  type WorkspacePermission,
  type WorkspaceRole,
} from '../../utils/workspacePermissions';
import { EnvironmentManager } from '../services/EnvironmentManager';

type ValidationError = { field: string; message: string };

type ModelApi<T> = {
  findAndCountAll: (options: Record<string, unknown>) => Promise<{ count: number; rows: T[] }>;
  count: (options: Record<string, unknown>) => Promise<number>;
};

type EnvironmentRecord = {
  id: string;
  name: string;
  description?: string | null;
  workspace_id: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  created_at?: Date;
  updated_at?: Date;
};

type EnvironmentVariableRecord = {
  id: string;
  environment_id: string;
};

const { Environment, EnvironmentVariable } = models as unknown as {
  Environment: ModelApi<EnvironmentRecord>;
  EnvironmentVariable: ModelApi<EnvironmentVariableRecord>;
};

const environmentManager = new EnvironmentManager();

const parsePagination = (req: Request) => {
  const page = Math.max(Number.parseInt(String(req.query.page || 1), 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(String(req.query.limit || 20), 10) || 20, 1),
    100
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const ensureWorkspaceMember = async (workspaceId: string, userId: string) => {
  const result = await query(
    'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = $3',
    [workspaceId, userId, 'active']
  );
  return result.rows?.[0] || null;
};

const ensureWorkspacePermission = async (
  workspaceId: string,
  userId: string,
  action: WorkspacePermission
) => {
  const member = await ensureWorkspaceMember(workspaceId, userId);
  if (!member) {
    return { error: '没有权限访问该工作空间环境' };
  }
  if (!hasWorkspacePermission(member.role as WorkspaceRole, action)) {
    return { error: '当前角色无此操作权限' };
  }
  return { member };
};

const ensureEnvironmentAccess = async (environmentId: string, userId: string) => {
  const result = await query('SELECT * FROM environments WHERE id = $1', [environmentId]);
  const environment = result.rows?.[0];
  if (!environment) {
    return { error: '环境不存在' };
  }
  const member = await ensureWorkspaceMember(environment.workspace_id, userId);
  if (!member) {
    return { error: '没有权限访问该环境' };
  }
  return { environment, member };
};

const validateEnvironmentInput = (data: Record<string, unknown>, res: ApiResponse) => {
  const errors: ValidationError[] = [];
  const name = (data?.name as string) || '';
  if (!name || name.length > 255) {
    errors.push({ field: 'name', message: '环境名称不能为空且长度不超过255' });
  }
  const description = data?.description as string | undefined;
  if (description && description.length > 2000) {
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

const listEnvironments = async (req: AuthRequest, res: ApiResponse) => {
  const workspaceId = String(req.query.workspaceId || '');
  if (!workspaceId) {
    return res.paginated([], 1, 20, 0, '获取环境列表成功');
  }
  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const { page, limit, offset } = parsePagination(req);
  const { count, rows } = await Environment.findAndCountAll({
    where: { workspace_id: workspaceId },
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });

  const results: Array<Record<string, unknown>> = [];
  for (const environment of rows) {
    const variableCount = await EnvironmentVariable.count({
      where: { environment_id: environment.id },
    });
    results.push({
      id: environment.id,
      name: environment.name,
      description: environment.description,
      variableCount,
      isActive: environment.metadata?.isActive || false,
      color: environment.metadata?.color || null,
      createdAt: toDate(environment.createdAt || environment.created_at),
      updatedAt: toDate(environment.updatedAt || environment.updated_at),
    });
  }

  return res.paginated(results, page, limit, count, '获取环境列表成功');
};

const createEnvironment = async (req: AuthRequest, res: ApiResponse) => {
  const { workspaceId } = (req.body || {}) as { workspaceId?: string };
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  if (!validateEnvironmentInput(req.body || {}, res)) {
    return;
  }
  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'write');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const environment = await environmentManager.createEnvironment({
    ...(req.body || {}),
    workspaceId,
    createdBy: req.user.id,
  });

  return res.created(environment, '创建环境成功');
};

const getEnvironment = async (req: AuthRequest, res: ApiResponse) => {
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

const deleteEnvironment = async (req: AuthRequest, res: ApiResponse) => {
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

const setActiveEnvironment = async (req: AuthRequest, res: ApiResponse) => {
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

const setVariable = async (req: AuthRequest, res: ApiResponse) => {
  const {
    key,
    value,
    scope = 'environment',
  } = (req.body || {}) as {
    key?: string;
    value?: string;
    scope?: string;
  };
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
    return res.validationError([
      { field: 'type', message: 'type 仅支持 string/text/number/boolean/json' },
    ]);
  }

  if (scope === 'environment') {
    const access = await ensureEnvironmentAccess(req.params.environmentId, req.user.id);
    if (access.error) {
      return access.error === '环境不存在'
        ? res.notFound(access.error)
        : res.forbidden(access.error);
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

  await environmentManager.setVariable(key, value as string, {
    scope: scope as 'environment' | 'global',
    environmentId: req.body?.environmentId || req.params.environmentId,
    secret: req.body?.secret || false,
    type: req.body?.type,
    description: req.body?.description,
    userId: req.user.id,
    workspaceId: req.body?.workspaceId,
  });

  return res.success(null, '变量设置成功');
};

const getGlobalVariables = async (req: AuthRequest, res: ApiResponse) => {
  if (!req.query.workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  const permission = await ensureWorkspacePermission(
    String(req.query.workspaceId),
    req.user.id,
    'read'
  );
  if (permission.error) {
    return res.forbidden(permission.error);
  }
  const globals = await environmentManager.getGlobalVariables({
    userId: req.user.id,
    workspaceId: (req.query.workspaceId as string) || null,
  });
  return res.success(globals, '获取全局变量成功');
};

const exportEnvironment = async (req: AuthRequest, res: ApiResponse) => {
  const access = await ensureEnvironmentAccess(req.params.environmentId, req.user.id);
  if (access.error) {
    return access.error === '环境不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'read')) {
    return res.forbidden('当前角色无读取权限');
  }

  const format = String(req.query.format || 'testweb');
  const includeSecrets = String(req.query.includeSecrets || 'false') === 'true';

  const payload = await environmentManager.exportEnvironment(req.params.environmentId, format);
  let responsePayload = payload;
  if (!includeSecrets && payload && 'variables' in payload && Array.isArray(payload.variables)) {
    responsePayload = {
      ...payload,
      variables: payload.variables.map(variable =>
        variable.secret ? { ...variable, value: '[ENCRYPTED]' } : variable
      ),
    };
  }

  return res.success(responsePayload, '导出环境成功');
};

const importEnvironment = async (req: AuthRequest, res: ApiResponse) => {
  const { workspaceId } = req.body as { workspaceId?: string };
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }

  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'write');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const environment = await environmentManager.importEnvironment({
    ...(req.body || {}),
    workspaceId,
    createdBy: req.user.id,
  });

  return res.created(environment, '导入环境成功');
};

const updateEnvironment = async (req: AuthRequest, res: ApiResponse) => {
  const access = await ensureEnvironmentAccess(req.params.environmentId, req.user.id);
  if (access.error) {
    return access.error === '环境不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'write')) {
    return res.forbidden('当前角色无写入权限');
  }

  const { name, description } = (req.body || {}) as { name?: string; description?: string };
  if (name !== undefined && (!name || name.length > 255)) {
    return res.validationError([{ field: 'name', message: '环境名称不能为空且长度不超过255' }]);
  }
  if (description !== undefined && description.length > 2000) {
    return res.validationError([{ field: 'description', message: '描述长度不能超过2000' }]);
  }

  const environment = await environmentManager.updateEnvironment(req.params.environmentId, {
    name,
    description,
  });
  return res.success(environment, '更新环境成功');
};

const deleteVariable = async (req: AuthRequest, res: ApiResponse) => {
  const access = await ensureEnvironmentAccess(req.params.environmentId, req.user.id);
  if (access.error) {
    return access.error === '环境不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'write')) {
    return res.forbidden('当前角色无写入权限');
  }

  const key = decodeURIComponent(req.params.key);
  if (!key) {
    return res.validationError([{ field: 'key', message: '变量 key 不能为空' }]);
  }

  await environmentManager.deleteVariable(req.params.environmentId, key);
  return res.success(null, '变量删除成功');
};

export {
  createEnvironment,
  deleteEnvironment,
  deleteVariable,
  exportEnvironment,
  getEnvironment,
  getGlobalVariables,
  importEnvironment,
  listEnvironments,
  setActiveEnvironment,
  setVariable,
  updateEnvironment,
};
