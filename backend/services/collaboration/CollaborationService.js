/**
 * 实时协作服务
 * 提供多用户协作功能，包括实时编辑、评论、分享等
 */

const { EventEmitter } = require('events');
const WebSocket = require('ws');

class CollaborationService extends EventEmitter {
  constructor() {
    super();
    this.rooms = new Map(); // 协作房间
    this.users = new Map(); // 在线用户
    this.documents = new Map(); // 协作文档
    this.comments = new Map(); // 评论系统
    this.shareLinks = new Map(); // 分享链接
    
    this.isInitialized = false;
  }

  /**
   * 初始化协作服务
   */
  async initialize(server) {
    if (this.isInitialized) {
      return;
    }

    try {
      // 创建WebSocket服务器
      this.wss = new WebSocket.Server({ 
        server,
        path: '/ws/collaboration'
      });

      // 设置WebSocket连接处理
      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });

      // 设置定期清理
      this.setupCleanup();

      this.isInitialized = true;
      console.log('✅ 实时协作服务初始化完成');
      
      this.emit('initialized');
    } catch (error) {
      console.error('❌ 实时协作服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 处理WebSocket连接
   */
  handleConnection(ws, req) {
    const userId = this.extractUserId(req);
    const sessionId = this.generateSessionId();
    
    console.log(`👤 用户连接协作服务: ${userId}`);
    
    // 存储用户连接信息
    const userInfo = {
      id: userId,
      sessionId,
      ws,
      connectedAt: new Date(),
      lastActivity: new Date(),
      currentRoom: null,
      cursor: null
    };
    
    this.users.set(sessionId, userInfo);
    
    // 发送连接确认
    this.sendToUser(sessionId, {
      type: 'connection_established',
      sessionId,
      userId,
      timestamp: new Date().toISOString()
    });

    // 设置消息处理
    ws.on('message', (data) => {
      this.handleMessage(sessionId, data);
    });

    // 设置断开连接处理
    ws.on('close', () => {
      this.handleDisconnection(sessionId);
    });

    // 设置错误处理
    ws.on('error', (error) => {
      console.error(`WebSocket错误 (${sessionId}):`, error);
    });
  }

  /**
   * 处理消息
   */
  handleMessage(sessionId, data) {
    try {
      const message = JSON.parse(data);
      const user = this.users.get(sessionId);
      
      if (!user) {
        console.warn(`未找到用户会话: ${sessionId}`);
        return;
      }

      // 更新用户活动时间
      user.lastActivity = new Date();

      switch (message.type) {
        case 'join_room':
          this.handleJoinRoom(sessionId, message);
          break;
        case 'leave_room':
          this.handleLeaveRoom(sessionId, message);
          break;
        case 'document_edit':
          this.handleDocumentEdit(sessionId, message);
          break;
        case 'cursor_update':
          this.handleCursorUpdate(sessionId, message);
          break;
        case 'add_comment':
          this.handleAddComment(sessionId, message);
          break;
        case 'update_comment':
          this.handleUpdateComment(sessionId, message);
          break;
        case 'delete_comment':
          this.handleDeleteComment(sessionId, message);
          break;
        case 'create_share_link':
          this.handleCreateShareLink(sessionId, message);
          break;
        case 'ping':
          this.handlePing(sessionId);
          break;
        default:
          console.warn(`未知消息类型: ${message.type}`);
      }
    } catch (error) {
      console.error(`处理消息失败 (${sessionId}):`, error);
      this.sendToUser(sessionId, {
        type: 'error',
        message: '消息处理失败',
        error: error.message
      });
    }
  }

  /**
   * 处理加入房间
   */
  handleJoinRoom(sessionId, message) {
    const { roomId, documentId } = message;
    const user = this.users.get(sessionId);
    
    if (!user) return;

    // 离开当前房间
    if (user.currentRoom) {
      this.handleLeaveRoom(sessionId, { roomId: user.currentRoom });
    }

    // 创建或获取房间
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        documentId,
        users: new Set(),
        createdAt: new Date(),
        lastActivity: new Date()
      });
    }

    const room = this.rooms.get(roomId);
    room.users.add(sessionId);
    room.lastActivity = new Date();
    user.currentRoom = roomId;

    // 获取或创建文档
    if (!this.documents.has(documentId)) {
      this.documents.set(documentId, {
        id: documentId,
        content: '',
        version: 0,
        lastModified: new Date(),
        collaborators: new Set()
      });
    }

    const document = this.documents.get(documentId);
    document.collaborators.add(user.id);

    // 通知房间内其他用户
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      userId: user.id,
      sessionId,
      timestamp: new Date().toISOString()
    }, sessionId);

    // 发送房间状态给新用户
    this.sendToUser(sessionId, {
      type: 'room_joined',
      roomId,
      documentId,
      document: {
        content: document.content,
        version: document.version
      },
      users: Array.from(room.users).map(sid => {
        const u = this.users.get(sid);
        return u ? { id: u.id, sessionId: sid } : null;
      }).filter(Boolean),
      timestamp: new Date().toISOString()
    });

    console.log(`👥 用户 ${user.id} 加入房间 ${roomId}`);
  }

  /**
   * 处理离开房间
   */
  handleLeaveRoom(sessionId, message) {
    const { roomId } = message;
    const user = this.users.get(sessionId);
    
    if (!user || !roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(sessionId);
      
      // 通知房间内其他用户
      this.broadcastToRoom(roomId, {
        type: 'user_left',
        userId: user.id,
        sessionId,
        timestamp: new Date().toISOString()
      }, sessionId);

      // 如果房间为空，删除房间
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
        console.log(`🗑️ 删除空房间: ${roomId}`);
      }
    }

    user.currentRoom = null;
    console.log(`👋 用户 ${user.id} 离开房间 ${roomId}`);
  }

  /**
   * 处理文档编辑
   */
  handleDocumentEdit(sessionId, message) {
    const { documentId, operation, content, version } = message;
    const user = this.users.get(sessionId);
    
    if (!user) return;

    const document = this.documents.get(documentId);
    if (!document) {
      this.sendToUser(sessionId, {
        type: 'error',
        message: '文档不存在'
      });
      return;
    }

    // 版本冲突检查
    if (version !== document.version) {
      this.sendToUser(sessionId, {
        type: 'version_conflict',
        documentId,
        currentVersion: document.version,
        yourVersion: version
      });
      return;
    }

    // 应用操作
    switch (operation.type) {
      case 'insert':
        document.content = this.applyInsertOperation(document.content, operation);
        break;
      case 'delete':
        document.content = this.applyDeleteOperation(document.content, operation);
        break;
      case 'replace':
        document.content = content;
        break;
    }

    document.version++;
    document.lastModified = new Date();

    // 广播变更到房间内其他用户
    if (user.currentRoom) {
      this.broadcastToRoom(user.currentRoom, {
        type: 'document_updated',
        documentId,
        operation,
        content: document.content,
        version: document.version,
        userId: user.id,
        timestamp: new Date().toISOString()
      }, sessionId);
    }

    // 确认操作成功
    this.sendToUser(sessionId, {
      type: 'operation_applied',
      documentId,
      version: document.version
    });
  }

  /**
   * 处理光标更新
   */
  handleCursorUpdate(sessionId, message) {
    const { position, selection } = message;
    const user = this.users.get(sessionId);
    
    if (!user || !user.currentRoom) return;

    user.cursor = { position, selection, timestamp: new Date() };

    // 广播光标位置到房间内其他用户
    this.broadcastToRoom(user.currentRoom, {
      type: 'cursor_updated',
      userId: user.id,
      sessionId,
      cursor: user.cursor
    }, sessionId);
  }

  /**
   * 处理添加评论
   */
  handleAddComment(sessionId, message) {
    const { documentId, position, content, parentId } = message;
    const user = this.users.get(sessionId);
    
    if (!user) return;

    const commentId = this.generateCommentId();
    const comment = {
      id: commentId,
      documentId,
      position,
      content,
      parentId: parentId || null,
      authorId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolved: false,
      replies: []
    };

    // 存储评论
    if (!this.comments.has(documentId)) {
      this.comments.set(documentId, new Map());
    }
    this.comments.get(documentId).set(commentId, comment);

    // 如果是回复，添加到父评论
    if (parentId) {
      const parentComment = this.comments.get(documentId).get(parentId);
      if (parentComment) {
        parentComment.replies.push(commentId);
      }
    }

    // 广播新评论到房间
    if (user.currentRoom) {
      this.broadcastToRoom(user.currentRoom, {
        type: 'comment_added',
        comment,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`💬 用户 ${user.id} 添加评论: ${commentId}`);
  }

  /**
   * 处理创建分享链接
   */
  handleCreateShareLink(sessionId, message) {
    const { documentId, permissions, expiresAt } = message;
    const user = this.users.get(sessionId);
    
    if (!user) return;

    const shareId = this.generateShareId();
    const shareLink = {
      id: shareId,
      documentId,
      createdBy: user.id,
      permissions: permissions || 'read',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdAt: new Date(),
      accessCount: 0
    };

    this.shareLinks.set(shareId, shareLink);

    this.sendToUser(sessionId, {
      type: 'share_link_created',
      shareLink: {
        ...shareLink,
        url: `/share/${shareId}`
      }
    });

    console.log(`🔗 用户 ${user.id} 创建分享链接: ${shareId}`);
  }

  /**
   * 处理Ping
   */
  handlePing(sessionId) {
    this.sendToUser(sessionId, {
      type: 'pong',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 处理断开连接
   */
  handleDisconnection(sessionId) {
    const user = this.users.get(sessionId);
    
    if (user) {
      console.log(`👋 用户断开连接: ${user.id}`);
      
      // 离开当前房间
      if (user.currentRoom) {
        this.handleLeaveRoom(sessionId, { roomId: user.currentRoom });
      }
      
      // 移除用户
      this.users.delete(sessionId);
    }
  }

  /**
   * 发送消息给特定用户
   */
  sendToUser(sessionId, message) {
    const user = this.users.get(sessionId);
    if (user && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 广播消息到房间
   */
  broadcastToRoom(roomId, message, excludeSessionId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const sessionId of room.users) {
      if (sessionId !== excludeSessionId) {
        this.sendToUser(sessionId, message);
      }
    }
  }

  /**
   * 应用插入操作
   */
  applyInsertOperation(content, operation) {
    const { position, text } = operation;
    return content.slice(0, position) + text + content.slice(position);
  }

  /**
   * 应用删除操作
   */
  applyDeleteOperation(content, operation) {
    const { position, length } = operation;
    return content.slice(0, position) + content.slice(position + length);
  }

  /**
   * 提取用户ID
   */
  extractUserId(req) {
    // 这里应该从JWT token或session中提取用户ID
    // 目前返回模拟ID
    return req.headers['x-user-id'] || `user_${Date.now()}`;
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 生成评论ID
   */
  generateCommentId() {
    return `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 生成分享ID
   */
  generateShareId() {
    return `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 设置定期清理
   */
  setupCleanup() {
    // 每5分钟清理一次
    setInterval(() => {
      this.cleanupInactiveUsers();
      this.cleanupEmptyRooms();
      this.cleanupExpiredShares();
    }, 5 * 60 * 1000);
  }

  /**
   * 清理不活跃用户
   */
  cleanupInactiveUsers() {
    const timeout = 30 * 60 * 1000; // 30分钟超时
    const now = new Date();
    
    for (const [sessionId, user] of this.users) {
      if (now - user.lastActivity > timeout) {
        console.log(`🧹 清理不活跃用户: ${user.id}`);
        this.handleDisconnection(sessionId);
      }
    }
  }

  /**
   * 清理空房间
   */
  cleanupEmptyRooms() {
    for (const [roomId, room] of this.rooms) {
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
        console.log(`🧹 清理空房间: ${roomId}`);
      }
    }
  }

  /**
   * 清理过期分享链接
   */
  cleanupExpiredShares() {
    const now = new Date();
    
    for (const [shareId, shareLink] of this.shareLinks) {
      if (shareLink.expiresAt && now > shareLink.expiresAt) {
        this.shareLinks.delete(shareId);
        console.log(`🧹 清理过期分享链接: ${shareId}`);
      }
    }
  }

  /**
   * 获取协作统计
   */
  getCollaborationStats() {
    return {
      onlineUsers: this.users.size,
      activeRooms: this.rooms.size,
      totalDocuments: this.documents.size,
      totalComments: Array.from(this.comments.values()).reduce((sum, docComments) => sum + docComments.size, 0),
      activeShares: this.shareLinks.size
    };
  }
}

// 创建单例实例
const collaborationService = new CollaborationService();

module.exports = {
  CollaborationService,
  collaborationService
};
