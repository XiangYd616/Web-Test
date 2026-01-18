const ROLE_PERMISSIONS = {
  owner: {
    read: true,
    write: true,
    delete: true,
    invite: true,
    manage: true,
    execute: true
  },
  admin: {
    read: true,
    write: true,
    delete: false,
    invite: true,
    manage: true,
    execute: true
  },
  member: {
    read: true,
    write: true,
    delete: false,
    invite: true,
    manage: false,
    execute: true
  },
  viewer: {
    read: true,
    write: false,
    delete: false,
    invite: false,
    manage: false,
    execute: false
  }
};

const hasWorkspacePermission = (role, action) => {
  return Boolean(ROLE_PERMISSIONS[role]?.[action]);
};

module.exports = {
  ROLE_PERMISSIONS,
  hasWorkspacePermission
};
