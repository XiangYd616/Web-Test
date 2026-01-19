type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

type WorkspacePermission = 'read' | 'write' | 'delete' | 'invite' | 'manage' | 'execute';

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

export { ROLE_PERMISSIONS, hasWorkspacePermission };

module.exports = {
  ROLE_PERMISSIONS,
  hasWorkspacePermission,
};
