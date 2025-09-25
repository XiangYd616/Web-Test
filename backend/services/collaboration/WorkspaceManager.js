/**
 * 团队工作空间管理系统
 * 支持多用户协作、权限管理、资源共享
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const crypto = require('crypto');

class WorkspaceManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxMembersPerWorkspace: options.maxMembersPerWorkspace || 100,
      maxWorkspacesPerUser: options.maxWorkspacesPerUser || 10,
      enableRealTimeSync: options.enableRealTimeSync !== false,
      ...options
    };

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
      EDITOR: 'editor',
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
      editor: {
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
    
    // 资源类型
    this.resourceTypes = {
      COLLECTION: 'collection',
      ENVIRONMENT: 'environment',
      REQUEST: 'request',
      TEST: 'test',
      MOCK: 'mock',
      MONITOR: 'monitor',
      DOCUMENTATION: 'documentation'
    };
    
    this.initializeEventHandlers();
  }

  /**
   * 初始化事件处理器
   */
  initializeEventHandlers() {
    // 工作空间事件
    this.on('workspace:created', (workspace) => {
      this.logActivity('workspace_created', workspace.id, { name: workspace.name });
    });
    
    this.on('workspace:updated', (workspace) => {
      this.broadcastToWorkspace(workspace.id, 'workspace:update', workspace);
    });
    
    this.on('workspace:deleted', (workspaceId) => {
      this.broadcastToWorkspace(workspaceId, 'workspace:delete', { id: workspaceId });
    });
    
    // 成员事件
    this.on('member:added', (workspaceId, member) => {
      this.broadcastToWorkspace(workspaceId, 'member:join', member);
    });
    
    this.on('member:removed', (workspaceId, userId) => {
      this.broadcastToWorkspace(workspaceId, 'member:leave', { userId });
    });
    
    // 资源事件
    this.on('resource:created', (workspaceId, resource) => {
      this.broadcastToWorkspace(workspaceId, 'resource:new', resource);
    });
    
    this.on('resource:updated', (workspaceId, resource) => {
      this.broadcastToWorkspace(workspaceId, 'resource:update', resource);
    });
    
    this.on('resource:deleted', (workspaceId, resourceId) => {
      this.broadcastToWorkspace(workspaceId, 'resource:delete', { id: resourceId });
    });
  }

  /**
   * 创建工作空间
   */
  async createWorkspace(creatorId, workspaceData) {
    // 验证用户
    const user = this.users.get(creatorId);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 检查工作空间限制
    const userWorkspaces = this.getUserWorkspaces(creatorId);
    if (userWorkspaces.length >= this.options.maxWorkspacesPerUser) {
      throw new Error(`每个用户最多只能创建 ${this.options.maxWorkspacesPerUser} 个工作空间`);
    }
    
    const workspace = {
      id: uuidv4(),
      name: workspaceData.name || 'New Workspace',
      description: workspaceData.description || '',
      type: workspaceData.type || 'team',  // team, personal
      visibility: workspaceData.visibility || 'private',  // private, public
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: creatorId,
      
      // 成员管理
      members: new Map(),
      
      // 资源管理
      resources: {
        collections: new Map(),
        environments: new Map(),
        requests: new Map(),
        tests: new Map(),
        mocks: new Map(),
        monitors: new Map(),
        documentation: new Map()
      },
      
      // 设置
      settings: {
        allowPublicAccess: workspaceData.allowPublicAccess || false,
        requireApproval: workspaceData.requireApproval || false,
        defaultRole: workspaceData.defaultRole || this.roles.VIEWER,
        features: {
          realTimeCollaboration: true,
          versionControl: true,
          commenting: true,
          activityFeed: true,
          ...workspaceData.features
        }
      },
      
      // 统计
      statistics: {
        totalCollections: 0,
        totalRequests: 0,
        totalTests: 0,
        totalRuns: 0,
        lastActivity: new Date().toISOString()
      },
      
      // 元数据
      metadata: {
        tags: workspaceData.tags || [],
        color: workspaceData.color || this.getRandomColor(),
        icon: workspaceData.icon || '🚀'
      }
    };
    
    // 添加创建者为所有者
    workspace.members.set(creatorId, {
      userId: creatorId,
      role: this.roles.OWNER,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      permissions: this.permissions.owner,
      status: 'active'
    });
    
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
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('工作空间不存在');
    }
    
    // 检查邀请者权限
    const inviter = workspace.members.get(inviterId);
    if (!inviter || !inviter.permissions.invite) {
      throw new Error('没有邀请权限');
    }
    
    // 检查成员限制
    if (workspace.members.size >= this.options.maxMembersPerWorkspace) {
      throw new Error(`工作空间成员已达到上限 (${this.options.maxMembersPerWorkspace})`);
    }
    
    // 创建邀请
    const invitation = {
      id: uuidv4(),
      workspaceId,
      workspaceName: workspace.name,
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
    

    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const workspace = this.workspaces.get(invitation.workspaceId);
    if (!workspace) {
      throw new Error('工作空间不存在');
    }
    
    // 检查是否已是成员
    if (workspace.members.has(userId)) {
      throw new Error('您已经是该工作空间的成员');
    }
    
    // 添加成员
    const member = {
      userId,
      role: invitation.role,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      permissions: this.permissions[invitation.role],
      status: 'active',
      invitedBy: invitation.inviterId
    };
    
    workspace.members.set(userId, member);
    
    // 更新邀请状态
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();
    invitation.acceptedBy = userId;
    
    // 触发事件
    this.emit('member:added', workspace.id, member);
    
    console.log(`✅ ${userId} 加入工作空间: ${workspace.name}`);
    
    return { workspace, member };
  }

  /**
   * 更新成员角色
   */
  async updateMemberRole(workspaceId, requesterId, targetUserId, newRole) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('工作空间不存在');
    }
    

    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const requester = workspace.members.get(requesterId);
    if (!requester || !requester.permissions.changeRoles) {
      throw new Error('没有更改角色的权限');
    }
    

    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const targetMember = workspace.members.get(targetUserId);
    if (!targetMember) {
      throw new Error('目标成员不存在');
    }
    
    // 不能更改所有者的角色
    if (targetMember.role === this.roles.OWNER) {
      throw new Error('不能更改所有者的角色');
    }
    
    // 更新角色和权限
    targetMember.role = newRole;
    targetMember.permissions = this.permissions[newRole];
    targetMember.updatedAt = new Date().toISOString();
    
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
   * 创建资源
   */
  async createResource(workspaceId, userId, resourceType, resourceData) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('工作空间不存在');
    }
    

    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const member = workspace.members.get(userId);
    if (!member || !member.permissions.write) {
      throw new Error('没有创建资源的权限');
    }
    
    const resource = {
      id: uuidv4(),
      type: resourceType,
      name: resourceData.name || `New ${resourceType}`,
      description: resourceData.description || '',
      data: resourceData.data || {},
      
      // 元信息
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      
      // 共享设置
      sharing: {
        isShared: resourceData.isShared || true,
        sharedWith: resourceData.sharedWith || 'workspace',  // workspace, specific_users, public
        permissions: resourceData.permissions || 'view',  // view, edit
      },
      
      // 标签和分类
      tags: resourceData.tags || [],
      category: resourceData.category || 'default',
      
      // 状态
      status: 'active',
      locked: false,
      lockedBy: null
    };
    
    // 存储资源
    const resourceStore = workspace.resources[`${resourceType}s`];
    if (resourceStore) {
      resourceStore.set(resource.id, resource);
      
      // 更新统计
      workspace.statistics[`total${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}s`]++;
      workspace.statistics.lastActivity = new Date().toISOString();
    }
    
    // 触发事件
    this.emit('resource:created', workspaceId, resource);
    
    
    return resource;
  }

  /**
   * 更新资源（带锁机制）
   */
  async updateResource(workspaceId, userId, resourceType, resourceId, updates, options = {}) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('工作空间不存在');
    }
    

    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const member = workspace.members.get(userId);
    if (!member || !member.permissions.write) {
      throw new Error('没有编辑资源的权限');
    }
    
    const resourceStore = workspace.resources[`${resourceType}s`];

    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const resource = resourceStore?.get(resourceId);
    if (!resource) {
      throw new Error('资源不存在');
    }
    
    // 检查锁定状态
    if (resource.locked && resource.lockedBy !== userId) {
      const lockUser = this.users.get(resource.lockedBy);
      throw new Error(`资源正在被 ${lockUser?.name || resource.lockedBy} 编辑`);
    }
    
    // 获取锁
    if (options.acquireLock && !resource.locked) {
      resource.locked = true;
      resource.lockedBy = userId;
      resource.lockedAt = new Date().toISOString();
      
      // 自动释放锁（5分钟后）
      setTimeout(() => {
        if (resource.locked && resource.lockedBy === userId) {
          this.releaseResourceLock(workspaceId, resourceType, resourceId, userId);
        }
      }, 5 * 60 * 1000);
    }
    
    // 保存旧版本（简单的版本控制）
    const oldVersion = { ...resource };
    
    // 应用更新
    Object.assign(resource, updates);
    resource.updatedAt = new Date().toISOString();
    resource.updatedBy = userId;
    resource.version++;
    
    // 记录变更
    if (!resource.history) {
      resource.history = [];
    }
    resource.history.push({
      version: resource.version - 1,
      updatedBy: userId,
      updatedAt: oldVersion.updatedAt,
      changes: this.diffObjects(oldVersion, resource)
    });
    
    // 释放锁（如果请求）
    if (options.releaseLock && resource.lockedBy === userId) {
      resource.locked = false;
      resource.lockedBy = null;
      resource.lockedAt = null;
    }
    
    // 触发事件
    this.emit('resource:updated', workspaceId, resource);
    
    // 实时同步
    if (this.options.enableRealTimeSync) {
      this.syncResourceUpdate(workspaceId, resource, userId);
    }
    
    return resource;
  }

  /**
   * 释放资源锁
   */
  releaseResourceLock(workspaceId, resourceType, resourceId, userId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;
    
    const resourceStore = workspace.resources[`${resourceType}s`];
    const resource = resourceStore?.get(resourceId);
    if (!resource) return;
    
    if (resource.locked && resource.lockedBy === userId) {
      resource.locked = false;
      resource.lockedBy = null;
      resource.lockedAt = null;
      
      
      // 通知其他用户
      this.broadcastToWorkspace(workspaceId, 'resource:unlocked', {
        resourceId,
        resourceType,
        unlockedBy: userId
      });
    }
  }

  /**
   * 添加评论
   */
  async addComment(workspaceId, userId, targetType, targetId, content, parentId = null) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('工作空间不存在');
    }
    

    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const member = workspace.members.get(userId);
    if (!member) {
      throw new Error('不是工作空间成员');
    }
    
    const comment = {
      id: uuidv4(),
      targetType,  // workspace, resource, comment
      targetId,
      parentId,    // 用于回复
      userId,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // 反应
      reactions: new Map(),  // emoji -> Set of userIds
      
      // 提及
      mentions: this.extractMentions(content),
      
      // 状态
      edited: false,
      resolved: false,
      pinned: false
    };
    
    // 存储评论（这里简化处理，实际应该按资源组织）
    if (!workspace.comments) {
      workspace.comments = new Map();
    }
    workspace.comments.set(comment.id, comment);
    
    // 通知被提及的用户
    for (const mentionedUserId of comment.mentions) {
      this.notifyUser(mentionedUserId, 'mention', {
        workspaceId,
        commentId: comment.id,
        mentionedBy: userId
      });
    }
    
    // 实时广播
    this.broadcastToWorkspace(workspaceId, 'comment:added', comment);
    
    
    return comment;
  }

  /**
   * 活动日志
   */
  logActivity(type, workspaceId, data = {}) {
    const activity = {
      id: uuidv4(),
      type,
      workspaceId,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.activities.push(activity);
    
    // 保持活动日志在合理范围
    if (this.activities.length > 10000) {
      this.activities = this.activities.slice(-5000);
    }
    
    // 实时推送活动
    this.broadcastToWorkspace(workspaceId, 'activity', activity);
    
    return activity;
  }

  /**
   * 实时同步
   */
  syncResourceUpdate(workspaceId, resource, userId) {
    const connections = this.getWorkspaceConnections(workspaceId);
    
    for (const [connUserId, connection] of connections) {
      if (connUserId !== userId) {
        // 发送增量更新
        connection.send({
          type: 'resource:sync',
          data: {
            resource,
            updatedBy: userId,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * WebSocket 连接管理
   */
  addConnection(workspaceId, userId, connection) {
    if (!this.activeConnections.has(workspaceId)) {
      this.activeConnections.set(workspaceId, new Map());
    }
    
    const workspaceConnections = this.activeConnections.get(workspaceId);
    workspaceConnections.set(userId, connection);
    
    // 更新用户状态
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      const member = workspace.members.get(userId);
      if (member) {
        member.status = 'online';
        member.lastActive = new Date().toISOString();
      }
    }
    
    // 通知其他用户
    this.broadcastToWorkspace(workspaceId, 'member:online', { userId });
    
  }

  removeConnection(workspaceId, userId) {

    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const workspaceConnections = this.activeConnections.get(workspaceId);
    if (workspaceConnections) {
      workspaceConnections.delete(userId);
      
      if (workspaceConnections.size === 0) {
        this.activeConnections.delete(workspaceId);
      }
    }
    
    // 更新用户状态
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      const member = workspace.members.get(userId);
      if (member) {
        member.status = 'offline';
      }
    }
    
    // 通知其他用户
    this.broadcastToWorkspace(workspaceId, 'member:offline', { userId });
    
  }

  getWorkspaceConnections(workspaceId) {
    return this.activeConnections.get(workspaceId) || new Map();
  }

  /**
   * 广播消息
   */
  broadcastToWorkspace(workspaceId, event, data) {
    const connections = this.getWorkspaceConnections(workspaceId);
    
    for (const [userId, connection] of connections) {
      try {
        connection.send({
          type: event,
          data,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`发送消息失败到 ${userId}:`, error);
        this.removeConnection(workspaceId, userId);
      }
    }
  }

  /**
   * 通知用户
   */
  notifyUser(userId, type, data) {
    // 这里应该集成实际的通知服务（邮件、推送等）
    
    // 查找用户的所有连接并发送
    for (const [workspaceId, connections] of this.activeConnections) {
      const connection = connections.get(userId);
      if (connection) {
        connection.send({
          type: 'notification',
          data: { type, ...data },
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * 工具方法
   */
  getUserWorkspaces(userId) {
    const userWorkspaces = [];
    
    for (const [id, workspace] of this.workspaces) {
      if (workspace.members.has(userId)) {
        userWorkspaces.push({
          ...workspace,
          members: Array.from(workspace.members.values())
        });
      }
    }
    
    return userWorkspaces;
  }

  generateInvitationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

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
    for (const [workspaceId, connections] of this.activeConnections) {
      for (const [userId, connection] of connections) {
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
