export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export type WorkspacePermission = 'read' | 'write' | 'delete' | 'invite' | 'manage' | 'execute';

type PermissionMatrix = Record<WorkspaceRole, Record<WorkspacePermission, boolean>>;

const ROLE_PERMISSIONS: PermissionMatrix = {
  owner: {
    read: true,
    write: true,
    delete: true,
    invite: true,
    manage: true,
    execute: true,
  },
  admin: {
    read: true,
    write: true,
    delete: false,
    invite: true,
    manage: true,
    execute: true,
  },
  member: {
    read: true,
    write: true,
    delete: false,
    invite: true,
    manage: false,
    execute: true,
  },
  viewer: {
    read: true,
    write: false,
    delete: false,
    invite: false,
    manage: false,
    execute: false,
  },
};

const hasWorkspacePermission = (role: WorkspaceRole, action: WorkspacePermission) => {
  return Boolean(ROLE_PERMISSIONS[role]?.[action]);
};

/**
 * 查询用户在工作空间中的角色
 * 从7个文件中提取的公共函数，消除重复代码
 */
const resolveWorkspaceRole = async (
  workspaceId: string,
  userId: string,
  queryFn: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
): Promise<WorkspaceRole | undefined> => {
  const result = await queryFn(
    `SELECT role
     FROM workspace_members
     WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
     LIMIT 1`,
    [workspaceId, userId]
  );
  return result.rows[0]?.role as WorkspaceRole | undefined;
};

export { ROLE_PERMISSIONS, hasWorkspacePermission, resolveWorkspaceRole };
