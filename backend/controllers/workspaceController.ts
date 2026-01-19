import type { Request, Response } from 'express';

const { models } = require('../database/sequelize');
const WorkspaceManager = require('../services/collaboration/WorkspaceManager');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');

const workspaceManager = new WorkspaceManager({ models });

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

type WorkspaceData = {
  name: string;
  description?: string;
  visibility?: 'private' | 'team' | 'public';
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

const validateWorkspaceInput = (data: WorkspaceData, res: ApiResponse, allowPartial = false) => {
  const errors: ValidationError[] = [];
  if (!allowPartial || data?.name !== undefined) {
    const name = data?.name || '';
    if (!name || name.length > 255) {
      errors.push({ field: 'name', message: '工作空间名称不能为空且长度不超过255' });
    }
  }

  if (data?.visibility !== undefined) {
    const allowed = ['private', 'team', 'public'];
    if (!allowed.includes(data.visibility)) {
      errors.push({ field: 'visibility', message: 'visibility 必须是 private/team/public' });
    }
  }

  if (errors.length > 0) {
    res.validationError(errors);
    return false;
  }
  return true;
};

const listWorkspaces = async (req: AuthRequest, res: ApiResponse) => {
  const { Workspace, WorkspaceMember } = models;
  const { page, limit, offset } = parsePagination(req);

  const { count, rows } = await WorkspaceMember.findAndCountAll({
    where: { user_id: req.user.id },
    include: [{ model: Workspace, as: 'workspace' }],
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });

  const data = rows
    .filter(member => member.workspace)
    .map(member => ({
      id: member.workspace.id,
      name: member.workspace.name,
      description: member.workspace.description,
      visibility: member.workspace.visibility,
      createdAt: member.workspace.createdAt?.toISOString?.() || member.workspace.created_at,
      updatedAt: member.workspace.updatedAt?.toISOString?.() || member.workspace.updated_at,
      role: member.role,
      metadata: member.workspace.metadata || {},
    }));

  return res.paginated(data, page, limit, count, '获取工作空间列表成功');
};

const createWorkspace = async (req: AuthRequest, res: ApiResponse) => {
  if (!validateWorkspaceInput(req.body as WorkspaceData, res)) {
    return;
  }
  const workspace = await workspaceManager.createWorkspace(req.user.id, req.body || {});
  return res.created(workspace, '创建工作空间成功');
};

const getWorkspace = async (req: AuthRequest, res: ApiResponse) => {
  const { Workspace, WorkspaceMember } = models;
  const permission = await ensureWorkspacePermission(req.params.workspaceId, req.user.id, 'read');
  if (permission.error) {
    return res.forbidden(permission.error);
  }
  const workspace = await Workspace.findByPk(req.params.workspaceId, {
    include: [{ model: WorkspaceMember, as: 'members' }],
  });
  if (!workspace) {
    return res.notFound('工作空间不存在');
  }
  return res.success(workspace, '获取工作空间成功');
};

const updateWorkspace = async (req: AuthRequest, res: ApiResponse) => {
  const { Workspace } = models;
  const workspace = await Workspace.findByPk(req.params.workspaceId);
  if (!workspace) {
    return res.notFound('工作空间不存在');
  }

  if (!validateWorkspaceInput(req.body as WorkspaceData, res, true)) {
    return;
  }

  const permission = await ensureWorkspacePermission(workspace.id, req.user.id, 'manage');
  if (permission.error) {
    return res.forbidden(permission.error || '没有权限更新工作空间');
  }

  const updatedWorkspace = await workspaceManager.updateWorkspace(
    workspace.id,
    req.body as WorkspaceData
  );

  return res.success(updatedWorkspace, '工作空间更新成功');
};

const deleteWorkspace = async (req: AuthRequest, res: ApiResponse) => {
  const { Workspace } = models;
  const workspace = await Workspace.findByPk(req.params.workspaceId);
  if (!workspace) {
    return res.notFound('工作空间不存在');
  }

  const permission = await ensureWorkspacePermission(workspace.id, req.user.id, 'delete');
  if (permission.error) {
    return res.forbidden(permission.error || '没有权限删除工作空间');
  }

  await workspaceManager.deleteWorkspace(workspace.id);

  return res.success(null, '工作空间删除成功');
};

const inviteMember = async (req: AuthRequest, res: ApiResponse) => {
  const { WorkspaceMember, User } = models;
  const { workspaceId } = req.params;
  const { email, role = 'member' } = req.body as { email?: string; role?: string };

  if (!email) {
    return res.validationError([{ field: 'email', message: '邮箱不能为空' }]);
  }

  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'invite');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const [user] = await User.findAll({ where: { email } });
  if (!user) {
    return res.notFound('用户不存在');
  }

  const existingMember = await WorkspaceMember.findOne({
    where: { workspace_id: workspaceId, user_id: user.id },
  });

  if (existingMember) {
    return res.validationError([{ field: 'email', message: '用户已是工作空间成员' }]);
  }

  const member = await WorkspaceMember.create({
    workspace_id: workspaceId,
    user_id: user.id,
    role,
    status: 'active',
    invited_by: req.user.id,
  });

  return res.created(member, '成员邀请成功');
};

const removeMember = async (req: AuthRequest, res: ApiResponse) => {
  const { WorkspaceMember } = models;
  const { workspaceId, memberId } = req.params;

  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'manage');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const member = await WorkspaceMember.findByPk(memberId);
  if (!member || member.workspace_id !== workspaceId) {
    return res.notFound('成员不存在');
  }

  if (member.user_id === req.user.id) {
    return res.validationError([{ field: 'memberId', message: '不能移除自己' }]);
  }

  await member.update({ status: 'inactive', updated_at: new Date() });

  return res.success(null, '成员移除成功');
};

const updateMemberRole = async (req: AuthRequest, res: ApiResponse) => {
  const { WorkspaceMember } = models;
  const { workspaceId, memberId } = req.params;
  const { role } = req.body as { role?: string };

  if (!role || !['owner', 'admin', 'member', 'viewer'].includes(role)) {
    return res.validationError([{ field: 'role', message: '角色无效' }]);
  }

  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'manage');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const member = await WorkspaceMember.findByPk(memberId);
  if (!member || member.workspace_id !== workspaceId) {
    return res.notFound('成员不存在');
  }

  await member.update({ role, updated_at: new Date() });

  return res.success(member, '成员角色更新成功');
};

export {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  inviteMember,
  listWorkspaces,
  removeMember,
  updateMemberRole,
  updateWorkspace,
};

module.exports = {
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
  updateMemberRole,
};
