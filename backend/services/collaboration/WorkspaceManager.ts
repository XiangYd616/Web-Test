/**
 * 团队工作空间管理系统
 * 支持多用户协作、权限管理、资源共享
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

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
  private models: {
    Workspace: { create: (data: Record<string, unknown>) => Promise<unknown> };
    WorkspaceMember: {
      count: (options: Record<string, unknown>) => Promise<number>;
      create: (data: Record<string, unknown>) => Promise<unknown>;
      destroy: (options: Record<string, unknown>) => Promise<number>;
      findAll: (options: Record<string, unknown>) => Promise<Array<{ workspace?: unknown }>>;
    };
  };
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

    if (!options.models) {
      throw new Error('WorkspaceManager requires sequelize models');
    }
    this.models = options.models as WorkspaceManager['models'];

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

    const currentCount = await this.models.WorkspaceMember.count({
      where: { user_id: workspaceData.ownerId, status: 'active' },
    });
    const maxWorkspaces = this.options.maxWorkspacesPerUser ?? 0;
    if (maxWorkspaces > 0 && currentCount >= maxWorkspaces) {
      throw new Error(`Maximum workspaces per user exceeded: ${maxWorkspaces}`);
    }

    const workspaceRecord = await this.models.Workspace.create({
      id: workspaceId,
      name: workspaceData.name,
      description: workspaceData.description ?? null,
      visibility: workspaceData.type === 'team' ? 'team' : 'private',
      owner_id: workspaceData.ownerId,
      metadata: workspaceData.metadata || {},
    });

    await this.models.WorkspaceMember.create({
      workspace_id: workspaceId,
      user_id: workspaceData.ownerId,
      role: 'owner',
      status: 'active',
      invited_by: null,
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
    const record = (await this.models.Workspace.create({}).constructor) as unknown as {
      findByPk: (id: string) => Promise<{ update: (data: unknown) => Promise<unknown> } | null>;
    };
    const workspace = await record.findByPk(workspaceId);
    if (!workspace) {
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

    const updated = await workspace.update(cleanedPayload);

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
    const record = (await this.models.Workspace.create({}).constructor) as unknown as {
      findByPk: (id: string) => Promise<{ destroy: () => Promise<void> } | null>;
    };
    const workspace = await record.findByPk(workspaceId);
    if (!workspace) {
      return false;
    }

    await this.models.WorkspaceMember.destroy({ where: { workspace_id: workspaceId } });
    await workspace.destroy();

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

    const memberCount = await this.models.WorkspaceMember.count({
      where: { workspace_id: workspaceId, status: 'active' },
    });
    const maxMembers = this.options.maxMembersPerWorkspace ?? 0;
    if (maxMembers > 0 && memberCount >= maxMembers) {
      throw new Error('Maximum members per workspace exceeded');
    }

    const existingMember = await this.models.WorkspaceMember.findAll({
      where: { workspace_id: workspaceId, status: 'active' },
      include: [{ association: 'workspace' }],
    });
    if (existingMember.some(member => member.workspace)) {
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

    const memberCount = await this.models.WorkspaceMember.count({
      where: { workspace_id: invitation.workspaceId, status: 'active' },
    });
    const maxMembers = this.options.maxMembersPerWorkspace ?? 0;
    if (maxMembers > 0 && memberCount >= maxMembers) {
      throw new Error('Maximum members per workspace exceeded');
    }

    await this.models.WorkspaceMember.create({
      workspace_id: invitation.workspaceId,
      user_id: userId,
      role: invitation.role,
      status: 'active',
      invited_by: invitation.inviterId,
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
    const members = await this.models.WorkspaceMember.findAll({
      where: { user_id: userId, status: 'active' },
      include: [{ association: 'workspace' }],
    });

    return members.map(member => member.workspace).filter(Boolean) as unknown as Workspace[];
  }

  /**
   * 搜索工作空间
   */
  async searchWorkspaces(query: WorkspaceSearchQuery): Promise<WorkspaceSearchResult> {
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const where: Record<string, unknown> = {};

    if (query.ownerId) {
      where.owner_id = query.ownerId;
    }

    if (query.query) {
      where.name = { $ilike: `%${query.query}%` };
    }

    const record = (await this.models.Workspace.create({}).constructor) as unknown as {
      findAndCountAll: (
        options: Record<string, unknown>
      ) => Promise<{ rows: Workspace[]; count: number }>;
    };
    const result = await record.findAndCountAll({
      where,
      limit,
      offset,
      order: [[query.sortBy || 'created_at', query.sortOrder || 'desc']],
    });

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
    const record = (await this.models.Workspace.create({}).constructor) as unknown as {
      findAll: (
        options?: Record<string, unknown>
      ) => Promise<Array<{ id: string; visibility: string }>>;
    };
    const workspaces = await record.findAll();

    const totalWorkspaces = workspaces.length;
    const totalMembers = await this.models.WorkspaceMember.count({ where: { status: 'active' } });

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
    const record = (await this.models.Workspace.create({}).constructor) as unknown as {
      findAll: (options: Record<string, unknown>) => Promise<WorkspaceActivity[]>;
    };
    return record.findAll({
      where: { workspace_id: workspaceId },
      limit,
      order: [['created_at', 'DESC']],
    });
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
    const record = (await this.models.Workspace.create({}).constructor) as unknown as {
      findByPk: (id: string) => Promise<unknown | null>;
    };
    return record.findByPk(workspaceId);
  }

  private async createInvitationRecord(invitation: WorkspaceInvitation) {
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: { query: (sql: string, params: unknown[]) => Promise<void> };
    };
    await db.sequelize.query(
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
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: {
        query: (sql: string, params: unknown[]) => Promise<{ rows: WorkspaceInvitation[] }>;
      };
    };
    const result = await db.sequelize.query('SELECT * FROM workspace_invitations WHERE id = $1', [
      invitationId,
    ]);
    return result.rows?.[0] || null;
  }

  private async updateInvitationStatus(invitationId: string, status: string) {
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: { query: (sql: string, params: unknown[]) => Promise<void> };
    };
    await db.sequelize.query(
      `UPDATE workspace_invitations
       SET status = $2, responded_at = NOW()
       WHERE id = $1`,
      [invitationId, status]
    );
  }

  private async findInvitationByEmail(workspaceId: string, email: string) {
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: {
        query: (sql: string, params: unknown[]) => Promise<{ rows: WorkspaceInvitation[] }>;
      };
    };
    const result = await db.sequelize.query(
      `SELECT * FROM workspace_invitations
       WHERE workspace_id = $1 AND invitee_email = $2 AND status = 'pending'`,
      [workspaceId, email]
    );
    return result.rows?.[0] || null;
  }

  private async updateWorkspaceMember(memberId: string, updates: Record<string, unknown>) {
    const record = (await this.models.WorkspaceMember.create({}).constructor) as unknown as {
      findByPk: (
        id: string
      ) => Promise<{ update: (data: Record<string, unknown>) => Promise<void> } | null>;
    };
    const member = await record.findByPk(memberId);
    if (!member) {
      throw new Error('Workspace member not found');
    }
    await member.update(updates);
  }

  private async getWorkspaceMemberById(memberId: string, workspaceId: string) {
    const record = (await this.models.WorkspaceMember.create({}).constructor) as unknown as {
      findByPk: (
        id: string
      ) => Promise<{ workspace_id: string; user_id: string; role: string } | null>;
    };
    const member = await record.findByPk(memberId);
    if (!member || member.workspace_id !== workspaceId) {
      return null;
    }
    return member;
  }

  private async createWorkspaceResource(resource: WorkspaceResource, workspaceId: string) {
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: { query: (sql: string, params: unknown[]) => Promise<void> };
    };
    await db.sequelize.query(
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
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: {
        query: (sql: string, params: unknown[]) => Promise<{ rows: WorkspaceResource[] }>;
      };
    };
    const result = await db.sequelize.query(
      `SELECT * FROM workspace_resources WHERE id = $1 AND workspace_id = $2`,
      [resourceId, workspaceId]
    );
    return result.rows?.[0] || null;
  }

  private async deleteWorkspaceResource(resourceId: string, workspaceId: string) {
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: { query: (sql: string, params: unknown[]) => Promise<void> };
    };
    await db.sequelize.query(
      `DELETE FROM workspace_resources WHERE id = $1 AND workspace_id = $2`,
      [resourceId, workspaceId]
    );
  }

  private async createWorkspaceActivity(activity: WorkspaceActivity) {
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: { query: (sql: string, params: unknown[]) => Promise<void> };
    };
    await db.sequelize.query(
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
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: { query: (sql: string, params: unknown[]) => Promise<void> };
    };
    await db.sequelize.query(
      `UPDATE workspace_invitations
       SET status = 'expired'
       WHERE status = 'pending' AND expires_at < $1`,
      [now]
    );
  }

  private async countWorkspaceInvitations() {
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: {
        query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ total: string }> }>;
      };
    };
    const result = await db.sequelize.query('SELECT COUNT(*) as total FROM workspace_invitations');
    return parseInt(result.rows?.[0]?.total || '0', 10);
  }

  private async countWorkspaceResources() {
    const db = (await this.models.Workspace.create({}).constructor) as unknown as {
      sequelize: {
        query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ total: string }> }>;
      };
    };
    const result = await db.sequelize.query('SELECT COUNT(*) as total FROM workspace_resources');
    return parseInt(result.rows?.[0]?.total || '0', 10);
  }
}

export default WorkspaceManager;
