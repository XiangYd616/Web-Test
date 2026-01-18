/**
 * 团队工作空间管理系统
 * 支持多用户协作、权限管理、资源共享
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const crypto = require('crypto');
const { models } = require('../../database/sequelize');

class WorkspaceManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxMembersPerWorkspace: options.maxMembersPerWorkspace || 100,
      maxWorkspacesPerUser: options.maxWorkspacesPerUser || 10,
      enableRealTimeSync: options.enableRealTimeSync !== false,
      ...options
    };

    this.models = options.models || models;

    // 数据存储
    this.workspaces = new Map();
    this.users = new Map();
    this.invitations = new Map();
    this.activities = [];
    this.activeConnections = new Map();
    
    // 权限级别
    this.roles = {
      OWNER: 'owner',
      ADMIN: 'admin',
      MEMBER: 'member',
      VIEWER: 'viewer'
    };
    
    // 权限矩阵
    this.permissions = {
      owner: {
        read: true,
        write: true,
        delete: true,
        invite: true,
        removeMembers: true,
        changeRoles: true,
        manageWorkspace: true,
        export: true
      },
      admin: {
        read: true,
        write: true,
        delete: true,
        invite: true,
        removeMembers: true,
        changeRoles: false,
        manageWorkspace: false,
        export: true
      },
      member: {
        read: true,
        write: true,
        delete: false,
        invite: true,
        removeMembers: false,
        changeRoles: false,
        manageWorkspace: false,
        export: true
      },
      viewer: {
        read: true,
        write: false,
        delete: false,
        invite: false,
        removeMembers: false,
        changeRoles: false,
        manageWorkspace: false,
        export: false
      }
    };
  }

  /**
   * 创建工作空间
   */
  async createWorkspace(creatorId, workspaceData) {
    const { User, Workspace, WorkspaceMember } = this.models;

    const user = await User.findByPk(creatorId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const workspaceCount = await WorkspaceMember.count({
      where: { user_id: creatorId }
    });
    if (workspaceCount >= this.options.maxWorkspacesPerUser) {
      throw new Error(`每个用户最多只能创建 ${this.options.maxWorkspacesPerUser} 个工作空间`);
    }

    const metadata = {
      tags: workspaceData.tags || [],
      color: workspaceData.color || this.getRandomColor(),
      icon: workspaceData.icon || '🚀',
      ...workspaceData.metadata
    };

    const workspaceRecord = await Workspace.create({
      name: workspaceData.name || 'New Workspace',
      description: workspaceData.description || '',
      visibility: workspaceData.visibility || 'private',
      created_by: creatorId,
      metadata
    });

    const ownerMember = await WorkspaceMember.create({
      workspace_id: workspaceRecord.id,
      user_id: creatorId,
      role: this.roles.OWNER,
      status: 'active',
      permissions: this.permissions.owner,
      joined_at: new Date()
    });

    const workspace = this.buildWorkspaceCache(workspaceRecord, [ownerMember]);
    this.workspaces.set(workspace.id, workspace);
    
    // 触发事件
    this.emit('workspace:created', workspace);
    
    console.log(`✅ 创建工作空间: ${workspace.name} (${workspace.id})`);
    
    return workspace;
  }

  /**
   * 邀请成员
   */
  async inviteMember(workspaceId, inviterId, inviteeEmail, role = this.roles.VIEWER) {
    const { Workspace, WorkspaceMember } = this.models;
    const workspaceRecord = await Workspace.findByPk(workspaceId);
    if (!workspaceRecord) {
      throw new Error('工作空间不存在');
    }

    const inviter = await WorkspaceMember.findOne({
      where: { workspace_id: workspaceId, user_id: inviterId, status: 'active' }
    });
    if (!inviter || !this.getRolePermissions(inviter.role).invite) {
      throw new Error('没有邀请权限');
    }

    const memberCount = await WorkspaceMember.count({
      where: { workspace_id: workspaceId }
    });
    if (memberCount >= this.options.maxMembersPerWorkspace) {
      throw new Error(`工作空间成员已达到上限 (${this.options.maxMembersPerWorkspace})`);
    }
    
    // 创建邀请
    const invitation = {
      id: uuidv4(),
      workspaceId,
      workspaceName: workspaceRecord.name,
      inviterId,
      inviteeEmail,
      role,
      status: 'pending',
      token: this.generateInvitationToken(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天后过期
    };
    
    this.invitations.set(invitation.token, invitation);
    
    // 发送邀请（这里应该集成邮件服务）
    
    // 记录活动
    this.logActivity('member_invited', workspaceId, {
      inviterId,
      inviteeEmail,
      role
    });
    
    return invitation;
  }

  /**
   * 接受邀请
   */
  async acceptInvitation(token, userId) {
    const invitation = this.invitations.get(token);
    if (!invitation) {
      throw new Error('邀请无效或已过期');
    }
    
    // 检查是否过期
    if (new Date(invitation.expiresAt) < new Date()) {
      this.invitations.delete(token);
      throw new Error('邀请已过期');
    }
    
    const { Workspace, WorkspaceMember } = this.models;
    const workspaceRecord = await Workspace.findByPk(invitation.workspaceId);
    if (!workspaceRecord) {
      throw new Error('工作空间不存在');
    }

    const existingMember = await WorkspaceMember.findOne({
      where: { workspace_id: invitation.workspaceId, user_id: userId }
    });
    if (existingMember) {
      throw new Error('您已经是该工作空间的成员');
    }

    const memberRecord = await WorkspaceMember.create({
      workspace_id: invitation.workspaceId,
      user_id: userId,
      role: invitation.role,
      status: 'active',
      permissions: this.getRolePermissions(invitation.role),
      invited_by: invitation.inviterId,
      joined_at: new Date()
    });

    const workspaceCache = this.workspaces.get(workspaceRecord.id);
    if (workspaceCache) {
      workspaceCache.members.set(userId, {
        userId,
        role: memberRecord.role,
        joinedAt: memberRecord.joined_at?.toISOString?.() || new Date().toISOString(),
        lastActive: new Date().toISOString(),
        permissions: this.getRolePermissions(memberRecord.role),
        status: memberRecord.status,
        invitedBy: invitation.inviterId
      });
    }
    
    // 更新邀请状态
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();
    invitation.acceptedBy = userId;
    
    // 触发事件
    this.emit('member:added', workspaceRecord.id, memberRecord);
    
    console.log(`✅ ${userId} 加入工作空间: ${workspaceRecord.name}`);
    
    return { workspace: workspaceRecord, member: memberRecord };
  }

  /**
   * 更新成员角色
   */
  async updateMemberRole(workspaceId, requesterId, targetUserId, newRole) {
    const { Workspace, WorkspaceMember } = this.models;
    const workspaceRecord = await Workspace.findByPk(workspaceId);
    if (!workspaceRecord) {
      throw new Error('工作空间不存在');
    }

    const requester = await WorkspaceMember.findOne({
      where: { workspace_id: workspaceId, user_id: requesterId, status: 'active' }
    });
    if (!requester || !this.getRolePermissions(requester.role).changeRoles) {
      throw new Error('没有更改角色的权限');
    }

    const targetMember = await WorkspaceMember.findOne({
      where: { workspace_id: workspaceId, user_id: targetUserId }
    });
    if (!targetMember) {
      throw new Error('目标成员不存在');
    }

    if (targetMember.role === this.roles.OWNER) {
      throw new Error('不能更改所有者的角色');
    }

    targetMember.role = newRole;
    targetMember.permissions = this.getRolePermissions(newRole);
    await targetMember.save();

    const workspaceCache = this.workspaces.get(workspaceId);
    if (workspaceCache) {
      const cachedMember = workspaceCache.members.get(targetUserId);
      if (cachedMember) {
        cachedMember.role = newRole;
        cachedMember.permissions = this.getRolePermissions(newRole);
        cachedMember.updatedAt = new Date().toISOString();
      }
    }
    
    // 记录活动
    this.logActivity('role_changed', workspaceId, {
      requesterId,
      targetUserId,
      oldRole: targetMember.role,
      newRole
    });
    
    
    return targetMember;
  }

  /**
   * 工具方法
   */
  getUserWorkspaces(userId) {
    return this.getUserWorkspacesFromDb(userId);
  }

  async getUserWorkspacesFromDb(userId) {
    const { Workspace, WorkspaceMember } = this.models;
    const memberships = await WorkspaceMember.findAll({
      where: { user_id: userId }
    });
    const workspaceIds = memberships.map(member => member.workspace_id);
    if (workspaceIds.length === 0) {
      return [];
    }

    const workspaces = await Workspace.findAll({
      where: { id: workspaceIds },
      include: [{ model: WorkspaceMember, as: 'members' }]
    });

    return workspaces.map(workspaceRecord => {
      const workspaceCache = this.buildWorkspaceCache(workspaceRecord, workspaceRecord.members || []);
      this.workspaces.set(workspaceCache.id, workspaceCache);
      return {
        ...workspaceCache,
        members: Array.from(workspaceCache.members.values())
      };
    });
  }

  buildWorkspaceCache(workspaceRecord, memberRecords) {
    const metadata = workspaceRecord.metadata || {};
    const members = new Map();

    memberRecords.forEach(memberRecord => {
      members.set(memberRecord.user_id, {
        userId: memberRecord.user_id,
        role: memberRecord.role,
        joinedAt: memberRecord.joined_at?.toISOString?.() || memberRecord.createdAt?.toISOString?.(),
        lastActive: memberRecord.updatedAt?.toISOString?.() || new Date().toISOString(),
        permissions: this.getRolePermissions(memberRecord.role),
        status: memberRecord.status,
        invitedBy: memberRecord.invited_by
      });
    });

    return {
      id: workspaceRecord.id,
      name: workspaceRecord.name,
      description: workspaceRecord.description || '',
      type: workspaceRecord.type || 'team',
      visibility: workspaceRecord.visibility || 'private',
      createdAt: workspaceRecord.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: workspaceRecord.updatedAt?.toISOString?.() || new Date().toISOString(),
      createdBy: workspaceRecord.created_by,
      members,
      resources: {
        collections: new Map(),
        environments: new Map(),
        requests: new Map(),
        tests: new Map(),
        mocks: new Map(),
        monitors: new Map(),
        documentation: new Map()
      },
      settings: {
        allowPublicAccess: false,
        requireApproval: false,
        defaultRole: this.roles.VIEWER,
        features: {
          realTimeCollaboration: true,
          versionControl: true,
          commenting: true,
          activityFeed: true
        }
      },
      statistics: {
        totalCollections: 0,
        totalRequests: 0,
        totalTests: 0,
        totalRuns: 0,
        lastActivity: new Date().toISOString()
      },
      metadata: {
        tags: metadata.tags || [],
        color: metadata.color || this.getRandomColor(),
        icon: metadata.icon || '🚀'
      }
    };
  }

  getRolePermissions(role) {
    return this.permissions[role] || this.permissions.viewer;
  }

  generateInvitationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // ...其他方法
  extractMentions(content) {
    const mentionPattern = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  diffObjects(oldObj, newObj) {
    const changes = {};
    
    for (const key in newObj) {
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        changes[key] = {
          old: oldObj[key],
          new: newObj[key]
        };
      }
    }
    
    return changes;
  }

  getRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 查询和统计
   */
  getWorkspaceStatistics(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;
    
    return {
      id: workspace.id,
      name: workspace.name,
      memberCount: workspace.members.size,
      onlineMembers: Array.from(workspace.members.values()).filter(m => m.status === 'online').length,
      resources: {
        collections: workspace.resources.collections.size,
        environments: workspace.resources.environments.size,
        requests: workspace.resources.requests.size,
        tests: workspace.resources.tests.size
      },
      activity: {
        lastActivity: workspace.statistics.lastActivity,
        totalActivities: this.activities.filter(a => a.workspaceId === workspaceId).length
      }
    };
  }

  getWorkspaceActivities(workspaceId, limit = 50) {
    return this.activities
      .filter(a => a.workspaceId === workspaceId)
      .slice(-limit)
      .reverse();
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 关闭所有连接
    for (const [_workspaceId, connections] of this.activeConnections) {
      for (const [_userId, connection] of connections) {
        try {
          connection.close();
        } catch (error) {
          console.error('关闭连接失败:', error);
        }
      }
    }
    
    this.activeConnections.clear();
    this.removeAllListeners();
  }
}

module.exports = WorkspaceManager;
