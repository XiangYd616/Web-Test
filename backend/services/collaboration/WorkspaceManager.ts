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
  private models: unknown;
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

    this.models = options.models;

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
  ): Promise<string> {
    const workspaceId = uuidv4();

    // 检查用户工作空间数量限制
    const userWorkspaces = await this.getUserWorkspaces(workspaceData.ownerId);
    if (userWorkspaces.length >= this.options.maxWorkspacesPerUser) {
      throw new Error(`Maximum workspaces per user exceeded: ${this.options.maxWorkspacesPerUser}`);
    }

    const workspace: Workspace = {
      ...workspaceData,
      id: workspaceId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
      members: [],
      resources: [],
      invitations: [],
    };

    // 添加所有者为成员
    workspace.members.push({
      id: uuidv4(),
      userId: workspaceData.ownerId,
      username: workspaceData.ownerId, // 应该从用户数据获取
      email: '', // 应该从用户数据获取
      role: 'owner',
      permissions: workspaceData.settings.defaultPermissions || [],
      status: 'active',
      joinedAt: new Date(),
      lastSeen: new Date(),
      metadata: {},
    });

    this.workspaces.set(workspaceId, workspace);

    // 记录活动
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

    this.emit('workspace_created', workspace);
    return workspaceId;
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
  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<Workspace> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const updatedWorkspace = {
      ...workspace,
      ...updates,
      updatedAt: new Date(),
      lastActivity: new Date(),
    };

    this.workspaces.set(workspaceId, updatedWorkspace);

    // 记录活动
    await this.recordActivity({
      id: uuidv4(),
      workspaceId,
      userId: workspace.ownerId,
      type: 'updated',
      resource: {
        type: 'workspace',
        id: workspaceId,
        name: workspace.name,
      },
      details: updates,
      timestamp: new Date(),
    });

    this.emit('workspace_updated', updatedWorkspace);
    return updatedWorkspace;
  }

  /**
   * 删除工作空间
   */
  async deleteWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return false;
    }

    // 检查权限
    if (!this.hasPermission(workspace, userId, 'admin', 'workspace')) {
      throw new Error('Insufficient permissions');
    }

    // 清理相关数据
    this.invitations.delete(workspaceId);

    // 记录活动
    await this.recordActivity({
      id: uuidv4(),
      workspaceId,
      userId,
      type: 'deleted',
      resource: {
        type: 'workspace',
        id: workspaceId,
        name: workspace.name,
      },
      details: {},
      timestamp: new Date(),
    });

    this.workspaces.delete(workspaceId);
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
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // 检查权限
    if (!this.hasPermission(workspace, inviterId, 'invite', 'workspace')) {
      throw new Error('Insufficient permissions');
    }

    // 检查成员数量限制
    if (workspace.members.length >= workspace.settings.maxMembers) {
      throw new Error('Maximum members per workspace exceeded');
    }

    // 检查是否已存在成员
    const existingMember = workspace.members.find(m => m.email === invitationData.inviteeEmail);
    if (existingMember) {
      throw new Error('User is already a member');
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

    this.invitations.set(invitationId, invitation);

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
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is not pending');
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    const workspace = this.workspaces.get(invitation.workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // 检查成员数量限制
    if (workspace.members.length >= workspace.settings.maxMembers) {
      throw new Error('Maximum members per workspace exceeded');
    }

    // 添加成员
    const member: WorkspaceMember = {
      id: uuidv4(),
      userId,
      username: '', // 应该从用户数据获取
      email: invitation.inviteeEmail,
      role: invitation.role,
      permissions: invitation.permissions,
      status: 'active',
      joinedAt: new Date(),
      lastSeen: new Date(),
      metadata: {},
    };

    workspace.members.push(member);
    workspace.lastActivity = new Date();

    // 更新邀请状态
    invitation.status = 'accepted';
    invitation.respondedAt = new Date();

    // 记录活动
    await this.recordActivity({
      id: uuidv4(),
      workspaceId: invitation.workspaceId,
      userId,
      type: 'joined',
      resource: {
        type: 'workspace',
        id: invitation.workspaceId,
        name: workspace.name,
      },
      details: { role: invitation.role },
      timestamp: new Date(),
    });

    this.emit('member_joined', { workspaceId: invitation.workspaceId, member });
    return true;
  }

  /**
   * 拒绝邀请
   */
  async rejectInvitation(invitationId: string, userId: string): Promise<boolean> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is not pending');
    }

    invitation.status = 'rejected';
    invitation.respondedAt = new Date();

    this.emit('invitation_rejected', invitation);
    return true;
  }

  /**
   * 移除成员
   */
  async removeMember(workspaceId: string, memberId: string, operatorId: string): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // 检查权限
    if (!this.hasPermission(workspace, operatorId, 'admin', 'workspace')) {
      throw new Error('Insufficient permissions');
    }

    const memberIndex = workspace.members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) {
      return false;
    }

    const member = workspace.members[memberIndex];
    workspace.members.splice(memberIndex, 1);
    workspace.lastActivity = new Date();

    // 记录活动
    await this.recordActivity({
      id: uuidv4(),
      workspaceId,
      userId: operatorId,
      type: 'left',
      resource: {
        type: 'member',
        id: memberId,
        name: member.username,
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
    operatorId: string
  ): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // 检查权限
    if (!this.hasPermission(workspace, operatorId, 'admin', 'workspace')) {
      throw new Error('Insufficient permissions');
    }

    const member = workspace.members.find(m => m.id === memberId);
    if (!member) {
      return false;
    }

    member.permissions = permissions;
    workspace.lastActivity = new Date();

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
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // 检查权限
    if (!this.hasPermission(workspace, resourceData.ownerId, 'write', 'resource')) {
      throw new Error('Insufficient permissions');
    }

    const resourceId = uuidv4();
    const resource: WorkspaceResource = {
      ...resourceData,
      id: resourceId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    workspace.resources.push(resource);
    workspace.lastActivity = new Date();

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
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // 检查权限
    if (!this.hasPermission(workspace, userId, 'delete', 'resource')) {
      throw new Error('Insufficient permissions');
    }

    const resourceIndex = workspace.resources.findIndex(r => r.id === resourceId);
    if (resourceIndex === -1) {
      return false;
    }

    const resource = workspace.resources[resourceIndex];
    workspace.resources.splice(resourceIndex, 1);
    workspace.lastActivity = new Date();

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
    const workspaces: Workspace[] = [];

    for (const workspace of this.workspaces.values()) {
      const member = workspace.members.find(m => m.userId === userId);
      if (member && member.status === 'active') {
        workspaces.push(workspace);
      }
    }

    return workspaces;
  }

  /**
   * 搜索工作空间
   */
  async searchWorkspaces(query: WorkspaceSearchQuery): Promise<WorkspaceSearchResult> {
    let workspaces = Array.from(this.workspaces.values());

    // 应用过滤器
    if (query.type) {
      workspaces = workspaces.filter(w => w.type === query.type);
    }

    if (query.ownerId) {
      workspaces = workspaces.filter(w => w.ownerId === query.ownerId);
    }

    if (query.memberUserId) {
      workspaces = workspaces.filter(w => w.members.some(m => m.userId === query.memberUserId));
    }

    if (query.query) {
      const searchTerm = query.query.toLowerCase();
      workspaces = workspaces.filter(
        w =>
          w.name.toLowerCase().includes(searchTerm) ||
          w.description.toLowerCase().includes(searchTerm)
      );
    }

    if (query.dateRange) {
      workspaces = workspaces.filter(
        w => w.createdAt >= query.dateRange.start && w.createdAt <= query.dateRange.end
      );
    }

    // 排序
    const sortBy = query.sortBy || 'name';
    const sortOrder = query.sortOrder || 'asc';

    workspaces.sort((a, b) => {
      const aValue = a[sortBy as keyof Workspace];
      const bValue = b[sortBy as keyof Workspace];

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // 分页
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    const paginatedWorkspaces = workspaces.slice(offset, offset + limit);

    return {
      workspaces: paginatedWorkspaces,
      total: workspaces.length,
      hasMore: offset + limit < workspaces.length,
    };
  }

  /**
   * 获取工作空间统计
   */
  async getStatistics(): Promise<WorkspaceStatistics> {
    const workspaces = Array.from(this.workspaces.values());

    const totalWorkspaces = workspaces.length;
    const totalMembers = workspaces.reduce((sum, w) => sum + w.members.length, 0);
    const totalResources = workspaces.reduce((sum, w) => sum + w.resources.length, 0);
    const totalInvitations = this.invitations.size;

    const activeWorkspaces = workspaces.filter(
      w => Date.now() - w.lastActivity.getTime() < 7 * 24 * 60 * 60 * 1000 // 7天内活跃
    ).length;

    const byType: Record<string, number> = {};
    const bySize: Record<string, number> = {};

    workspaces.forEach(workspace => {
      byType[workspace.type] = (byType[workspace.type] || 0) + 1;

      const size = workspace.resources.length;
      if (size < 10) bySize['small'] = (bySize['small'] || 0) + 1;
      else if (size < 50) bySize['medium'] = (bySize['medium'] || 0) + 1;
      else bySize['large'] = (bySize['large'] || 0) + 1;
    });

    return {
      totalWorkspaces,
      totalMembers,
      totalResources,
      totalInvitations,
      activeWorkspaces,
      averageMembersPerWorkspace: totalWorkspaces > 0 ? totalMembers / totalWorkspaces : 0,
      averageResourcesPerWorkspace: totalWorkspaces > 0 ? totalResources / totalWorkspaces : 0,
      byType,
      bySize,
    };
  }

  /**
   * 获取工作空间活动
   */
  async getWorkspaceActivities(
    workspaceId: string,
    limit: number = 50
  ): Promise<WorkspaceActivity[]> {
    return this.activities
      .filter(a => a.workspaceId === workspaceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
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
    this.activities.push(activity);

    // 限制活动记录数量
    if (this.activities.length > 10000) {
      this.activities = this.activities.slice(-5000);
    }

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
  private cleanupExpiredInvitations(): void {
    const now = new Date();

    for (const [id, invitation] of this.invitations.entries()) {
      if (invitation.expiresAt < now) {
        invitation.status = 'expired';
        this.emit('invitation_expired', invitation);
      }
    }
  }
}

export default WorkspaceManager;
