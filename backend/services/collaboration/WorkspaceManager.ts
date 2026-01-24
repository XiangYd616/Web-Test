/**
 * 团队工作空间管理系统
 * 支持多用户协作、权限管理、资源共享
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import { toDate, toOptionalDate } from '../../utils/dateUtils';

// 工作空间配置接口
export interface WorkspaceManagerConfig {
  maxMembersPerWorkspace?: number;
  maxWorkspacesPerUser?: number;
  enableRealTimeSync?: boolean;
  models?: unknown;
}

// 工作空间接口
export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  type: 'personal' | 'team' | 'enterprise';
  settings: WorkspaceSettings;
  members: WorkspaceMember[];
  resources: WorkspaceResource[];
  invitations: WorkspaceInvitation[];
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  metadata: Record<string, unknown>;
}

// 工作空间设置接口
export interface WorkspaceSettings {
  isPublic: boolean;
  allowInvitations: boolean;
  requireApproval: boolean;
  maxMembers: number;
  defaultPermissions: Permission[];
  enableRealTimeSync: boolean;
  enableVersionControl: boolean;
  enableBackup: boolean;
  retentionDays: number;
}

// 工作空间成员接口
export interface WorkspaceMember {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: Permission[];
  status: 'active' | 'inactive' | 'suspended';
  joinedAt: Date;
  lastSeen: Date;
  metadata: Record<string, unknown>;
}

// 权限接口
export interface Permission {
  action: 'read' | 'write' | 'delete' | 'admin' | 'invite' | 'manage';
  resource: string;
  granted: boolean;
}

// 工作空间资源接口
export interface WorkspaceResource {
  id: string;
  type: 'document' | 'file' | 'folder' | 'collection' | 'project';
  name: string;
  path: string;
  size: number;
  mimeType?: string;
  ownerId: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

// 工作空间邀请接口
export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  inviterId: string;
  inviteeEmail: string;
  role: WorkspaceMember['role'];
  permissions: Permission[];
  token: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  respondedAt?: Date;
  message?: string;
}

// 工作空间活动接口
export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  userId: string;
  type: 'created' | 'updated' | 'deleted' | 'joined' | 'left' | 'shared' | 'invited';
  resource: {
    type: string;
    id: string;
    name: string;
  };
  details: Record<string, unknown>;
  timestamp: Date;
}

// 工作空间统计接口
export interface WorkspaceStatistics {
  totalWorkspaces: number;
  totalMembers: number;
  totalResources: number;
  totalInvitations: number;
  activeWorkspaces: number;
  averageMembersPerWorkspace: number;
  averageResourcesPerWorkspace: number;
  byType: Record<string, number>;
  bySize: Record<string, number>;
}

type WorkspaceRow = {
  id: string;
  name?: string | null;
  description?: string | null;
  visibility?: string | null;
  owner_id?: string | null;
  metadata?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  last_activity?: unknown;
};

type WorkspaceInvitationRow = {
  id: string;
  workspace_id: string;
  inviter_id: string;
  invitee_email: string;
  role: WorkspaceMember['role'];
  permissions?: unknown;
  token: string;
  status: WorkspaceInvitation['status'];
  expires_at?: unknown;
  created_at?: unknown;
  responded_at?: unknown;
  message?: string | null;
};

type WorkspaceResourceRow = {
  id: string;
  workspace_id: string;
  type: WorkspaceResource['type'];
  name: string;
  path: string;
  size: number;
  mime_type?: string | null;
  owner_id?: string | null;
  permissions?: unknown;
  metadata?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

type WorkspaceActivityRow = {
  id: string;
  workspace_id: string;
  user_id?: string | null;
  type: WorkspaceActivity['type'];
  resource?: unknown;
  details?: unknown;
  created_at?: unknown;
};

const parseJsonValue = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

const defaultWorkspaceSettings = (): WorkspaceSettings => ({
  isPublic: false,
  allowInvitations: true,
  requireApproval: false,
  maxMembers: 100,
  defaultPermissions: [],
  enableRealTimeSync: true,
  enableVersionControl: false,
  enableBackup: false,
  retentionDays: 30,
});

const mapWorkspaceRow = (row: WorkspaceRow): Workspace => {
  const metadata = parseJsonValue<Record<string, unknown>>(row.metadata, {});
  const settings =
    (metadata.settings as WorkspaceSettings | undefined) ?? defaultWorkspaceSettings();
  const createdAt = toDate(row.created_at || new Date());
  const updatedAt = toDate(row.updated_at || createdAt);
  const lastActivity = toDate(row.last_activity || updatedAt || createdAt);
  const visibility = row.visibility || 'private';

  return {
    id: String(row.id),
    name: String(row.name || ''),
    description: String(row.description || ''),
    ownerId: String(row.owner_id || ''),
    type: visibility === 'team' ? 'team' : visibility === 'public' ? 'enterprise' : 'personal',
    settings,
    members: [],
    resources: [],
    invitations: [],
    createdAt,
    updatedAt,
    lastActivity,
    metadata,
  };
};

const mapWorkspaceInvitationRow = (row: WorkspaceInvitationRow): WorkspaceInvitation => ({
  id: String(row.id),
  workspaceId: String(row.workspace_id),
  inviterId: String(row.inviter_id),
  inviteeEmail: String(row.invitee_email),
  role: row.role,
  permissions: parseJsonValue<Permission[]>(row.permissions, []),
  token: String(row.token),
  status: row.status,
  expiresAt: toDate(row.expires_at || new Date()),
  createdAt: toDate(row.created_at || new Date()),
  respondedAt: toOptionalDate(row.responded_at),
  message: row.message || undefined,
});

const mapWorkspaceResourceRow = (row: WorkspaceResourceRow): WorkspaceResource => ({
  id: String(row.id),
  type: row.type,
  name: String(row.name),
  path: String(row.path),
  size: Number(row.size || 0),
  mimeType: row.mime_type || undefined,
  ownerId: row.owner_id ? String(row.owner_id) : '',
  permissions: parseJsonValue<Permission[]>(row.permissions, []),
  createdAt: toDate(row.created_at || new Date()),
  updatedAt: toDate(row.updated_at || new Date()),
  metadata: parseJsonValue<Record<string, unknown>>(row.metadata, {}),
});

const mapWorkspaceActivityRow = (row: WorkspaceActivityRow): WorkspaceActivity => ({
  id: String(row.id),
  workspaceId: String(row.workspace_id),
  userId: row.user_id ? String(row.user_id) : '',
  type: row.type,
  resource: parseJsonValue(row.resource, { type: '', id: '', name: '' }),
  details: parseJsonValue<Record<string, unknown>>(row.details, {}),
  timestamp: toDate(row.created_at || new Date()),
});

// 工作空间搜索接口
export interface WorkspaceSearchQuery {
  query?: string;
  type?: Workspace['type'];
  ownerId?: string;
  memberUserId?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastActivity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// 工作空间搜索结果接口
export interface WorkspaceSearchResult {
  workspaces: Workspace[];
  total: number;
  hasMore: boolean;
}

class WorkspaceManager extends EventEmitter {
  private options: WorkspaceManagerConfig;
  private workspaces: Map<string, Workspace> = new Map();
  private users: Map<string, unknown> = new Map();
  private invitations: Map<string, WorkspaceInvitation> = new Map();
  private activities: WorkspaceActivity[] = [];
  private activeConnections: Map<string, string> = new Map(); // userId -> workspaceId

  constructor(options: WorkspaceManagerConfig = {}) {
    super();

    this.options = {
      maxMembersPerWorkspace: 100,
      maxWorkspacesPerUser: 10,
      enableRealTimeSync: true,
      ...options,
    };

    // 启动清理任务
    this.startCleanupTask();
  }

  /**
   * 创建工作空间
   */
  async createWorkspace(
    workspaceData: Omit<
      Workspace,
      'id' | 'createdAt' | 'updatedAt' | 'lastActivity' | 'members' | 'resources' | 'invitations'
    >
  ): Promise<unknown> {
    const workspaceId = uuidv4();

    const currentCount = await this.countWorkspaceMembersByUser(workspaceData.ownerId);
    const maxWorkspaces = this.options.maxWorkspacesPerUser ?? 0;
    if (maxWorkspaces > 0 && currentCount >= maxWorkspaces) {
      throw new Error(`Maximum workspaces per user exceeded: ${maxWorkspaces}`);
    }

    const workspaceRecord = await this.createWorkspaceRecord(workspaceId, workspaceData);
    await this.createWorkspaceMemberRecord({
      workspaceId,
      userId: workspaceData.ownerId,
      role: 'owner',
      status: 'active',
      invitedBy: null,
    });

    await this.recordActivity({
      id: uuidv4(),
      workspaceId,
      userId: workspaceData.ownerId,
      type: 'created',
      resource: {
        type: 'workspace',
        id: workspaceId,
        name: workspaceData.name,
      },
      details: { type: workspaceData.type },
      timestamp: new Date(),
    });

    this.emit('workspace_created', workspaceRecord);
    return workspaceRecord;
  }

  /**
   * 获取工作空间
   */
  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    return this.workspaces.get(workspaceId) || null;
  }

  /**
   * 更新工作空间
   */
  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<unknown> {
    const existing = await this.getWorkspaceRecordById(workspaceId);
    if (!existing) {
      throw new Error('Workspace not found');
    }
    const updatePayload = {
      name: updates.name,
      description: updates.description ?? null,
      visibility:
        updates.type === 'team' ? 'team' : updates.type === 'enterprise' ? 'public' : undefined,
      metadata: updates.metadata,
      updated_at: new Date(),
    } as Record<string, unknown>;

    const cleanedPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([, value]) => value !== undefined)
    );

    const updated = await this.updateWorkspaceRecord(workspaceId, cleanedPayload);

    await this.recordActivity({
      id: uuidv4(),
      workspaceId,
      userId: updates.ownerId || '',
      type: 'updated',
      resource: {
        type: 'workspace',
        id: workspaceId,
        name: updates.name || 'workspace',
      },
      details: updates,
      timestamp: new Date(),
    });

    this.emit('workspace_updated', updated);
    return updated;
  }

  /**
   * 删除工作空间
   */
  async deleteWorkspace(workspaceId: string, userId?: string): Promise<boolean> {
    const workspace = await this.getWorkspaceRecordById(workspaceId);
    if (!workspace) {
      return false;
    }

    await query('DELETE FROM workspace_members WHERE workspace_id = $1', [workspaceId]);
    await query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);

    await this.recordActivity({
      id: uuidv4(),
      workspaceId,
      userId: userId || '',
      type: 'deleted',
      resource: {
        type: 'workspace',
        id: workspaceId,
        name: 'workspace',
      },
      details: {},
      timestamp: new Date(),
    });

    this.emit('workspace_deleted', { workspaceId, userId });
    return true;
  }

  /**
   * 邀请成员
   */
  async inviteMember(
    workspaceId: string,
    inviterId: string,
    invitationData: Omit<
      WorkspaceInvitation,
      'id' | 'workspaceId' | 'inviterId' | 'token' | 'status' | 'createdAt'
    >
  ): Promise<string> {
    const workspace = await this.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const memberCount = await this.countActiveMembersInWorkspace(workspaceId);
    const maxMembers = this.options.maxMembersPerWorkspace ?? 0;
    if (maxMembers > 0 && memberCount >= maxMembers) {
      throw new Error('Maximum members per workspace exceeded');
    }

    const existingMemberCount = await this.countActiveMembersInWorkspace(workspaceId);
    if (existingMemberCount > 0) {
      const alreadyInvited = await this.findInvitationByEmail(
        workspaceId,
        invitationData.inviteeEmail
      );
      if (alreadyInvited) {
        throw new Error('User is already a member');
      }
    }

    const invitationId = uuidv4();
    const invitation: WorkspaceInvitation = {
      ...invitationData,
      id: invitationId,
      workspaceId,
      inviterId,
      token: this.generateInvitationToken(),
      status: 'pending',
      createdAt: new Date(),
    };

    await this.createInvitationRecord(invitation);

    // 记录活动
    await this.recordActivity({
      id: uuidv4(),
      workspaceId,
      userId: inviterId,
      type: 'invited',
      resource: {
        type: 'invitation',
        id: invitationId,
        name: invitationData.inviteeEmail,
      },
      details: { role: invitationData.role },
      timestamp: new Date(),
    });

    this.emit('member_invited', invitation);
    return invitationId;
  }

  /**
   * 接受邀请
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<boolean> {
    const invitation = await this.getInvitationRecord(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is not pending');
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    const workspace = await this.getWorkspaceById(invitation.workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    const workspaceName = (workspace as { name?: string }).name || 'workspace';

    const memberCount = await this.countActiveMembersInWorkspace(invitation.workspaceId);
    const maxMembers = this.options.maxMembersPerWorkspace ?? 0;
    if (maxMembers > 0 && memberCount >= maxMembers) {
      throw new Error('Maximum members per workspace exceeded');
    }

    await this.createWorkspaceMemberRecord({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
      status: 'active',
      invitedBy: invitation.inviterId,
    });

    await this.updateInvitationStatus(invitation.id, 'accepted');

    // 记录活动
    await this.recordActivity({
      id: uuidv4(),
      workspaceId: invitation.workspaceId,
      userId,
      type: 'joined',
      resource: {
        type: 'workspace',
        id: invitation.workspaceId,
        name: workspaceName,
      },
      details: { role: invitation.role },
      timestamp: new Date(),
    });

    this.emit('member_joined', { workspaceId: invitation.workspaceId, memberId: userId });
    return true;
  }

  /**
   * 拒绝邀请
   */
  async rejectInvitation(invitationId: string, _userId: string): Promise<boolean> {
    const invitation = await this.getInvitationRecord(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is not pending');
    }

    await this.updateInvitationStatus(invitation.id, 'rejected');

    this.emit('invitation_rejected', invitation);
    return true;
  }

  /**
   * 移除成员
   */
  async removeMember(workspaceId: string, memberId: string, operatorId: string): Promise<boolean> {
    const member = await this.getWorkspaceMemberById(memberId, workspaceId);
    if (!member) {
      return false;
    }

    await this.updateWorkspaceMember(memberId, { status: 'inactive', updated_at: new Date() });

    // 记录活动
    await this.recordActivity({
      id: uuidv4(),
      workspaceId,
      userId: operatorId,
      type: 'left',
      resource: {
        type: 'member',
        id: memberId,
        name: member.user_id,
      },
      details: { role: member.role },
      timestamp: new Date(),
    });

    this.emit('member_removed', { workspaceId, memberId });
    return true;
  }

  /**
   * 更新成员权限
   */
  async updateMemberPermissions(
    workspaceId: string,
    memberId: string,
    permissions: Permission[],
    _operatorId: string
  ): Promise<boolean> {
    const member = await this.getWorkspaceMemberById(memberId, workspaceId);
    if (!member) {
      return false;
    }

    await this.updateWorkspaceMember(memberId, {
      permissions,
      updated_at: new Date(),
    });

    this.emit('member_permissions_updated', { workspaceId, memberId, permissions });
    return true;
  }

  /**
   * 添加资源
   */
  async addResource(
    workspaceId: string,
    resourceData: Omit<WorkspaceResource, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    await this.getWorkspaceById(workspaceId);
    const resourceId = uuidv4();
    const resource: WorkspaceResource = {
      ...resourceData,
      id: resourceId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.createWorkspaceResource(resource, workspaceId);

    // 记录活动
    await this.recordActivity({
      id: uuidv4(),
      workspaceId,
      userId: resourceData.ownerId,
      type: 'created',
      resource: {
        type: resource.type,
        id: resourceId,
        name: resource.name,
      },
      details: { path: resource.path },
      timestamp: new Date(),
    });

    this.emit('resource_added', { workspaceId, resource });
    return resourceId;
  }

  /**
   * 删除资源
   */
  async removeResource(workspaceId: string, resourceId: string, userId: string): Promise<boolean> {
    const resource = await this.getWorkspaceResource(resourceId, workspaceId);
    if (!resource) {
      return false;
    }

    await this.deleteWorkspaceResource(resourceId, workspaceId);

    // 记录活动
    await this.recordActivity({
      id: uuidv4(),
      workspaceId,
      userId,
      type: 'deleted',
      resource: {
        type: resource.type,
        id: resourceId,
        name: resource.name,
      },
      details: { path: resource.path },
      timestamp: new Date(),
    });

    this.emit('resource_removed', { workspaceId, resourceId });
    return true;
  }

  /**
   * 获取用户工作空间
   */
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const result = await query(
      `SELECT w.*
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       WHERE wm.user_id = $1 AND wm.status = 'active'`,
      [userId]
    );
    return (result.rows as WorkspaceRow[]).map(mapWorkspaceRow);
  }

  /**
   * 搜索工作空间
   */
  async searchWorkspaces(searchQuery: WorkspaceSearchQuery): Promise<WorkspaceSearchResult> {
    const limit = searchQuery.limit || 20;
    const offset = searchQuery.offset || 0;
    const values: unknown[] = [];
    const clauses: string[] = [];
    if (searchQuery.ownerId) {
      values.push(searchQuery.ownerId);
      clauses.push(`owner_id = $${values.length}`);
    }
    if (searchQuery.query) {
      values.push(`%${searchQuery.query}%`);
      clauses.push(`name ILIKE $${values.length}`);
    }
    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sortBy = searchQuery.sortBy || 'created_at';
    const sortOrder = searchQuery.sortOrder || 'desc';

    const rowsResult = await query(
      `SELECT * FROM workspaces ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );
    const countResult = await query(
      `SELECT COUNT(*) as count FROM workspaces ${whereClause}`,
      values
    );
    const result = {
      rows: (rowsResult.rows as WorkspaceRow[]).map(mapWorkspaceRow),
      count: Number(countResult.rows?.[0]?.count || 0),
    };

    return {
      workspaces: result.rows,
      total: result.count,
      hasMore: offset + limit < result.count,
    };
  }

  /**
   * 获取工作空间统计
   */
  async getStatistics(): Promise<WorkspaceStatistics> {
    const workspacesResult = await query('SELECT id, visibility FROM workspaces');
    const workspaces = workspacesResult.rows as Array<{ id: string; visibility: string }>;

    const totalWorkspaces = workspaces.length;
    const totalMembers = await this.countActiveMembers();

    const totalResources = await this.countWorkspaceResources();
    const totalInvitations = await this.countWorkspaceInvitations();

    const byType: Record<string, number> = {};
    workspaces.forEach(workspace => {
      const type = workspace.visibility || 'private';
      byType[type] = (byType[type] || 0) + 1;
    });

    return {
      totalWorkspaces,
      totalMembers,
      totalResources,
      totalInvitations,
      activeWorkspaces: totalWorkspaces,
      averageMembersPerWorkspace: totalWorkspaces > 0 ? totalMembers / totalWorkspaces : 0,
      averageResourcesPerWorkspace: totalWorkspaces > 0 ? totalResources / totalWorkspaces : 0,
      byType,
      bySize: {},
    };
  }

  /**
   * 获取工作空间活动
   */
  async getWorkspaceActivities(
    workspaceId: string,
    limit: number = 50
  ): Promise<WorkspaceActivity[]> {
    const result = await query(
      `SELECT * FROM workspace_activities WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [workspaceId, limit]
    );
    return (result.rows as WorkspaceActivityRow[]).map(mapWorkspaceActivityRow);
  }

  /**
   * 检查权限
   */
  private hasPermission(
    workspace: Workspace,
    userId: string,
    action: string,
    resource: string
  ): boolean {
    const member = workspace.members.find(m => m.userId === userId);
    if (!member) return false;

    // 所有者拥有所有权限
    if (member.role === 'owner') return true;

    // 管理员拥有大部分权限
    if (member.role === 'admin' && action !== 'admin') return true;

    // 检查具体权限
    return member.permissions.some(
      p => p.action === action && (p.resource === resource || p.resource === '*') && p.granted
    );
  }

  /**
   * 记录活动
   */
  private async recordActivity(activity: WorkspaceActivity): Promise<void> {
    await this.createWorkspaceActivity(activity);
    this.emit('activity_recorded', activity);
  }

  /**
   * 生成邀请令牌
   */
  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 启动清理任务
   */
  private startCleanupTask(): void {
    setInterval(
      () => {
        this.cleanupExpiredInvitations();
      },
      60 * 60 * 1000
    ); // 每小时清理一次
  }

  /**
   * 清理过期邀请
   */
  private async cleanupExpiredInvitations(): Promise<void> {
    const now = new Date();
    await this.expireInvitations(now);
  }

  private async getWorkspaceById(workspaceId: string) {
    return this.getWorkspaceRecordById(workspaceId);
  }

  private async createInvitationRecord(invitation: WorkspaceInvitation) {
    await query(
      `INSERT INTO workspace_invitations
       (id, workspace_id, inviter_id, invitee_email, role, permissions, token, status, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        invitation.id,
        invitation.workspaceId,
        invitation.inviterId,
        invitation.inviteeEmail,
        invitation.role,
        JSON.stringify(invitation.permissions || []),
        invitation.token,
        invitation.status,
        invitation.expiresAt,
      ]
    );
  }

  private async getInvitationRecord(invitationId: string): Promise<WorkspaceInvitation | null> {
    const result = await query('SELECT * FROM workspace_invitations WHERE id = $1', [invitationId]);
    const row = result.rows?.[0] as WorkspaceInvitationRow | undefined;
    return row ? mapWorkspaceInvitationRow(row) : null;
  }

  private async updateInvitationStatus(invitationId: string, status: string) {
    await query(
      `UPDATE workspace_invitations
       SET status = $2, responded_at = NOW()
       WHERE id = $1`,
      [invitationId, status]
    );
  }

  private async findInvitationByEmail(workspaceId: string, email: string) {
    const result = await query(
      `SELECT * FROM workspace_invitations
       WHERE workspace_id = $1 AND invitee_email = $2 AND status = 'pending'`,
      [workspaceId, email]
    );
    const row = result.rows?.[0] as WorkspaceInvitationRow | undefined;
    return row ? mapWorkspaceInvitationRow(row) : null;
  }

  private async updateWorkspaceMember(memberId: string, updates: Record<string, unknown>) {
    const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
    if (!entries.length) {
      return;
    }
    const setClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
    const values = entries.map(([, value]) => value);
    values.push(memberId);
    const result = await query(
      `UPDATE workspace_members SET ${setClause} WHERE id = $${values.length}`,
      values
    );
    if (!result.rowCount) {
      throw new Error('Workspace member not found');
    }
  }

  private async getWorkspaceMemberById(memberId: string, workspaceId: string) {
    const result = await query(
      'SELECT * FROM workspace_members WHERE id = $1 AND workspace_id = $2',
      [memberId, workspaceId]
    );
    const member = result.rows?.[0] as
      | { workspace_id: string; user_id: string; role: string }
      | undefined;
    if (!member || member.workspace_id !== workspaceId) {
      return null;
    }
    return member;
  }

  private async createWorkspaceResource(resource: WorkspaceResource, workspaceId: string) {
    await query(
      `INSERT INTO workspace_resources
       (id, workspace_id, type, name, path, size, mime_type, owner_id, permissions, metadata, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [
        resource.id,
        workspaceId,
        resource.type,
        resource.name,
        resource.path,
        resource.size,
        resource.mimeType || null,
        resource.ownerId || null,
        JSON.stringify(resource.permissions || []),
        JSON.stringify(resource.metadata || {}),
      ]
    );
  }

  private async getWorkspaceResource(resourceId: string, workspaceId: string) {
    const result = await query(
      `SELECT * FROM workspace_resources WHERE id = $1 AND workspace_id = $2`,
      [resourceId, workspaceId]
    );
    const row = result.rows?.[0] as WorkspaceResourceRow | undefined;
    return row ? mapWorkspaceResourceRow(row) : null;
  }

  private async deleteWorkspaceResource(resourceId: string, workspaceId: string) {
    await query(`DELETE FROM workspace_resources WHERE id = $1 AND workspace_id = $2`, [
      resourceId,
      workspaceId,
    ]);
  }

  private async createWorkspaceActivity(activity: WorkspaceActivity) {
    await query(
      `INSERT INTO workspace_activities
       (id, workspace_id, user_id, type, resource, details, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [
        activity.id,
        activity.workspaceId,
        activity.userId || null,
        activity.type,
        JSON.stringify(activity.resource || {}),
        JSON.stringify(activity.details || {}),
      ]
    );
  }

  private async expireInvitations(now: Date) {
    await query(
      `UPDATE workspace_invitations
       SET status = 'expired'
       WHERE status = 'pending' AND expires_at < $1`,
      [now]
    );
  }

  private async countWorkspaceInvitations() {
    const result = await query('SELECT COUNT(*) as total FROM workspace_invitations');
    return parseInt(result.rows?.[0]?.total || '0', 10);
  }

  private async countWorkspaceResources() {
    const result = await query('SELECT COUNT(*) as total FROM workspace_resources');
    return parseInt(result.rows?.[0]?.total || '0', 10);
  }

  private async countWorkspaceMembersByUser(userId: string) {
    const result = await query(
      'SELECT COUNT(*) as total FROM workspace_members WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );
    return parseInt(result.rows?.[0]?.total || '0', 10);
  }

  private async countActiveMembersInWorkspace(workspaceId: string) {
    const result = await query(
      'SELECT COUNT(*) as total FROM workspace_members WHERE workspace_id = $1 AND status = $2',
      [workspaceId, 'active']
    );
    return parseInt(result.rows?.[0]?.total || '0', 10);
  }

  private async countActiveMembers() {
    const result = await query(
      'SELECT COUNT(*) as total FROM workspace_members WHERE status = $1',
      ['active']
    );
    return parseInt(result.rows?.[0]?.total || '0', 10);
  }

  private async createWorkspaceRecord(
    workspaceId: string,
    workspaceData: Omit<
      Workspace,
      'id' | 'createdAt' | 'updatedAt' | 'lastActivity' | 'members' | 'resources' | 'invitations'
    >
  ) {
    const result = await query(
      `INSERT INTO workspaces (id, name, description, visibility, owner_id, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        workspaceId,
        workspaceData.name,
        workspaceData.description ?? null,
        workspaceData.type === 'team' ? 'team' : 'private',
        workspaceData.ownerId,
        JSON.stringify(workspaceData.metadata || {}),
      ]
    );
    return mapWorkspaceRow(result.rows[0] as WorkspaceRow);
  }

  private async createWorkspaceMemberRecord(payload: {
    workspaceId: string;
    userId: string;
    role: WorkspaceMember['role'];
    status: WorkspaceMember['status'];
    invitedBy: string | null;
  }) {
    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, status, invited_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [payload.workspaceId, payload.userId, payload.role, payload.status, payload.invitedBy]
    );
  }

  private async getWorkspaceRecordById(workspaceId: string) {
    const result = await query('SELECT * FROM workspaces WHERE id = $1', [workspaceId]);
    const row = result.rows?.[0] as WorkspaceRow | undefined;
    return row ? mapWorkspaceRow(row) : null;
  }

  private async updateWorkspaceRecord(workspaceId: string, updates: Record<string, unknown>) {
    const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
    if (!entries.length) {
      return this.getWorkspaceRecordById(workspaceId);
    }
    const setClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
    const values = entries.map(([, value]) => value);
    values.push(workspaceId);
    const result = await query(
      `UPDATE workspaces SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    const row = result.rows?.[0] as WorkspaceRow | undefined;
    return row ? mapWorkspaceRow(row) : null;
  }
}

export default WorkspaceManager;
