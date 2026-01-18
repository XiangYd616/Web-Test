const { models } = require('../database/sequelize');
const WorkspaceManager = require('../services/collaboration/WorkspaceManager');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');

const workspaceManager = new WorkspaceManager({ models });

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

const validateWorkspaceInput = (data, res, allowPartial = false) => {
  const errors = [];
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

const listWorkspaces = async (req, res) => {
  const { Workspace, WorkspaceMember } = models;
  const { page, limit, offset } = parsePagination(req);

  const { count, rows } = await WorkspaceMember.findAndCountAll({
    where: { user_id: req.user.id },
    include: [{ model: Workspace, as: 'workspace' }],
    limit,
    offset,
    order: [['created_at', 'DESC']]
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
      metadata: member.workspace.metadata || {}
    }));

  return res.paginated(data, page, limit, count, '获取工作空间列表成功');
};

const createWorkspace = async (req, res) => {
  if (!validateWorkspaceInput(req.body, res)) {
    return;
  }
  const workspace = await workspaceManager.createWorkspace(req.user.id, req.body || {});
  return res.created(workspace, '创建工作空间成功');
};

const getWorkspace = async (req, res) => {
  const { Workspace, WorkspaceMember } = models;
  const permission = await ensureWorkspacePermission(req.params.workspaceId, req.user.id, 'read');
  if (permission.error) {
    return res.forbidden(permission.error);
  }
  const workspace = await Workspace.findByPk(req.params.workspaceId, {
    include: [{ model: WorkspaceMember, as: 'members' }]
  });
  if (!workspace) {
    return res.notFound('工作空间不存在');
  }
  return res.success(workspace, '获取工作空间成功');
};

const updateWorkspace = async (req, res) => {
  const { Workspace } = models;
  const workspace = await Workspace.findByPk(req.params.workspaceId);
  if (!workspace) {
    return res.notFound('工作空间不存在');
  }

  if (!validateWorkspaceInput(req.body, res, true)) {
    return;
  }

  const permission = await ensureWorkspacePermission(workspace.id, req.user.id, 'manage');
  if (permission.error) {
    return res.forbidden(permission.error || '没有权限更新工作空间');
  }

  const updates = {
    name: req.body?.name ?? workspace.name,
    description: req.body?.description ?? workspace.description,
    visibility: req.body?.visibility ?? workspace.visibility,
    metadata: {
      ...(workspace.metadata || {}),
      ...(req.body?.metadata || {})
    },
    updated_by: req.user.id
  };

  await workspace.update(updates);
  return res.success(workspace, '更新工作空间成功');
};

const deleteWorkspace = async (req, res) => {
  const { Workspace } = models;
  const workspace = await Workspace.findByPk(req.params.workspaceId);
  if (!workspace) {
    return res.notFound('工作空间不存在');
  }

  const permission = await ensureWorkspacePermission(workspace.id, req.user.id, 'delete');
  if (permission.error) {
    return res.forbidden(permission.error || '只有所有者可以删除工作空间');
  }

  await Workspace.destroy({ where: { id: workspace.id } });
  return res.success(null, '删除工作空间成功');
};

const listMembers = async (req, res) => {
  const { WorkspaceMember, User } = models;
  const permission = await ensureWorkspacePermission(req.params.workspaceId, req.user.id, 'read');
  if (permission.error) {
    return res.forbidden(permission.error || '没有权限查看成员列表');
  }
  const { page, limit, offset } = parsePagination(req);

  const { count, rows } = await WorkspaceMember.findAndCountAll({
    where: { workspace_id: req.params.workspaceId },
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email', 'role'] }],
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });

  return res.paginated(rows, page, limit, count, '获取成员列表成功');
};

const inviteMember = async (req, res) => {
  const { email, role } = req.body || {};
  if (!email) {
    return res.validationError([{ field: 'email', message: '邀请邮箱不能为空' }]);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.validationError([{ field: 'email', message: '邮箱格式无效' }]);
  }
  if (role && !['admin', 'member', 'viewer'].includes(role)) {
    return res.validationError([{ field: 'role', message: 'role 仅支持 admin/member/viewer' }]);
  }
  const permission = await ensureWorkspacePermission(req.params.workspaceId, req.user.id, 'invite');
  if (permission.error) {
    return res.forbidden(permission.error || '没有权限邀请成员');
  }
  const invitation = await workspaceManager.inviteMember(
    req.params.workspaceId,
    req.user.id,
    email,
    role || 'viewer'
  );
  return res.success(invitation, '邀请已创建');
};

const acceptInvitation = async (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.validationError([{ field: 'token', message: '邀请token不能为空' }]);
  }
  const result = await workspaceManager.acceptInvitation(token, req.user.id);
  return res.success(result, '加入工作空间成功');
};

const updateMemberRole = async (req, res) => {
  const { role } = req.body || {};
  if (!role) {
    return res.validationError([{ field: 'role', message: '角色不能为空' }]);
  }
  if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
    return res.validationError([{ field: 'role', message: '角色仅支持 owner/admin/member/viewer' }]);
  }
  const permission = await ensureWorkspacePermission(req.params.workspaceId, req.user.id, 'manage');
  if (permission.error) {
    return res.forbidden(permission.error || '没有权限更新成员角色');
  }
  const member = await workspaceManager.updateMemberRole(
    req.params.workspaceId,
    req.user.id,
    req.params.userId,
    role
  );
  return res.success(member, '更新成员角色成功');
};

module.exports = {
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  listMembers,
  inviteMember,
  acceptInvitation,
  updateMemberRole
};
