/**
 * 实时协作服务器
 * 处理 WebSocket 连接，实现实时同步和协作功能
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
class CollaborationServer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      port: options.port || 8080,
      heartbeatInterval: options.heartbeatInterval || 30000,
      maxMessageSize: options.maxMessageSize || 10 * 1024 * 1024, // 10MB
      enableCompression: options.enableCompression !== false,
      ...options
    };

    this.wss = null;
    this.clients = new Map();
    this.rooms = new Map();
    this.locks = new Map();
    this.cursors = new Map();
    this.selections = new Map();
    
    // 协作会话
    this.sessions = new Map();
    
    // 消息类型
    this.messageTypes = {
      // 连接管理
      CONNECT: 'connect',
      DISCONNECT: 'disconnect',
      HEARTBEAT: 'heartbeat',
      
      // 房间管理
      JOIN_ROOM: 'join_room',
      LEAVE_ROOM: 'leave_room',
      ROOM_INFO: 'room_info',
      
      // 实时编辑
      CURSOR_MOVE: 'cursor_move',
      SELECTION_CHANGE: 'selection_change',
      CONTENT_CHANGE: 'content_change',
      OPERATION: 'operation',
      
      // 锁管理
      ACQUIRE_LOCK: 'acquire_lock',
      RELEASE_LOCK: 'release_lock',
      LOCK_STATUS: 'lock_status',
      
      // 协作功能
      USER_STATUS: 'user_status',
      USER_ACTIVITY: 'user_activity',
      COMMENT: 'comment',
      NOTIFICATION: 'notification',
      
      // 同步
      SYNC_REQUEST: 'sync_request',
      SYNC_RESPONSE: 'sync_response',
      SYNC_UPDATE: 'sync_update',
      
      // 错误
      ERROR: 'error'
    };
    
    // 操作类型（用于 OT - Operational Transformation）
    this.operationTypes = {
      INSERT: 'insert',
      DELETE: 'delete',
      FORMAT: 'format',
      MOVE: 'move',
      REPLACE: 'replace'
    };
  }

  /**
   * 启动服务器
   */
  start() {
    this.wss = new WebSocket.Server({
      port: this.options.port,
      perMessageDeflate: this.options.enableCompression,
      maxPayload: this.options.maxMessageSize
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket 服务器错误:', error);
      this.emit('error', error);
    });

    // 启动心跳检测
    this.startHeartbeat();
    
    console.log(`🚀 实时协作服务器启动在端口 ${this.options.port}`);
    this.emit('started', { port: this.options.port });
  }

  /**
   * 处理新连接
   */
  handleConnection(ws, req) {
    const clientId = uuidv4();
    const clientIp = req.socket.remoteAddress;
    
    
    // 初始化客户端
    const client = {
      id: clientId,
      ws,
      ip: clientIp,
      userId: null,
      userName: null,
      rooms: new Set(),
      status: 'connected',
      lastActivity: new Date(),
      isAlive: true,
      metadata: {}
    };
    
    this.clients.set(clientId, client);
    
    // 设置心跳
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
      client.lastActivity = new Date();
    });
    
    // 处理消息
    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });
    
    // 处理断开连接
    ws.on('close', (code, reason) => {
      this.handleDisconnect(clientId);
    });
    
    ws.on('error', (error) => {
      console.error(`客户端错误 ${clientId}:`, error);
      this.handleDisconnect(clientId);
    });
    
    // 发送连接确认
    this.sendToClient(clientId, {
      type: this.messageTypes.CONNECT,
      clientId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 处理消息
   */
  handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      const message = JSON.parse(data);
      client.lastActivity = new Date();
      
      
      switch (message.type) {
        case this.messageTypes.JOIN_ROOM:
          this.handleJoinRoom(clientId, message);
          break;
          
        case this.messageTypes.LEAVE_ROOM:
          this.handleLeaveRoom(clientId, message);
          break;
          
        case this.messageTypes.CURSOR_MOVE:
          this.handleCursorMove(clientId, message);
          break;
          
        case this.messageTypes.SELECTION_CHANGE:
          this.handleSelectionChange(clientId, message);
          break;
          
        case this.messageTypes.CONTENT_CHANGE:
          this.handleContentChange(clientId, message);
          break;
          
        case this.messageTypes.OPERATION:
          this.handleOperation(clientId, message);
          break;
          
        case this.messageTypes.ACQUIRE_LOCK:
          this.handleAcquireLock(clientId, message);
          break;
          
        case this.messageTypes.RELEASE_LOCK:
          this.handleReleaseLock(clientId, message);
          break;
          
        case this.messageTypes.USER_STATUS:
          this.handleUserStatus(clientId, message);
          break;
          
        case this.messageTypes.COMMENT:
          this.handleComment(clientId, message);
          break;
          
        case this.messageTypes.SYNC_REQUEST:
          this.handleSyncRequest(clientId, message);
          break;
          
        case this.messageTypes.HEARTBEAT:
          // 心跳消息，已更新 lastActivity
          break;
          
        default:
          console.warn(`未知消息类型: ${message.type}`);
      }
      
      this.emit('message', { clientId, message });
      
    } catch (error) {
      console.error(`处理消息失败 [${clientId}]:`, error);
      this.sendError(clientId, '消息处理失败', error.message);
    }
  }

  /**
   * 加入房间
   */
  handleJoinRoom(clientId, message) {
    const { roomId, userId, userName, role } = message;
    const client = this.clients.get(clientId);
    
    if (!client) return;
    
    // 更新客户端信息
    client.userId = userId;
    client.userName = userName;
    client.rooms.add(roomId);
    
    // 创建或获取房间
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        clients: new Set(),
        locks: new Map(),
        state: {},
        createdAt: new Date()
      });
    }
    
    const room = this.rooms.get(roomId);
    room.clients.add(clientId);
    
    // 初始化用户游标和选区
    if (!this.cursors.has(roomId)) {
      this.cursors.set(roomId, new Map());
    }
    if (!this.selections.has(roomId)) {
      this.selections.set(roomId, new Map());
    }
    
    this.cursors.get(roomId).set(userId, {
      position: { line: 0, column: 0 },
      color: this.getUserColor(userId)
    });
    
    // 通知房间内其他用户
    this.broadcastToRoom(roomId, {
      type: this.messageTypes.USER_STATUS,
      userId,
      userName,
      status: 'joined',
      timestamp: new Date().toISOString()
    }, clientId);
    
    // 发送房间信息给新加入的客户端
    this.sendToClient(clientId, {
      type: this.messageTypes.ROOM_INFO,
      roomId,
      members: this.getRoomMembers(roomId),
      locks: Array.from(room.locks.entries()),
      state: room.state
    });
    
  }

  /**
   * 离开房间
   */
  handleLeaveRoom(clientId, message) {
    const { roomId } = message;
    const client = this.clients.get(clientId);
    
    if (!client) return;
    
    client.rooms.delete(roomId);
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.clients.delete(clientId);
      
      // 释放该用户的所有锁
      for (const [resourceId, lockInfo] of room.locks) {
        if (lockInfo.clientId === clientId) {
          room.locks.delete(resourceId);
          this.broadcastToRoom(roomId, {
            type: this.messageTypes.LOCK_STATUS,
            resourceId,
            locked: false
          });
        }
      }
      
      // 清理游标和选区
      if (this.cursors.has(roomId)) {
        this.cursors.get(roomId).delete(client.userId);
      }
      if (this.selections.has(roomId)) {
        this.selections.get(roomId).delete(client.userId);
      }
      
      // 如果房间为空，清理房间
      if (room.clients.size === 0) {
        this.rooms.delete(roomId);
        this.cursors.delete(roomId);
        this.selections.delete(roomId);
      } else {
        // 通知其他用户
        this.broadcastToRoom(roomId, {
          type: this.messageTypes.USER_STATUS,
          userId: client.userId,
          userName: client.userName,
          status: 'left',
          timestamp: new Date().toISOString()
        });
      }
    }
    
  }

  /**
   * 处理游标移动
   */
  handleCursorMove(clientId, message) {
    const { roomId, position } = message;
    const client = this.clients.get(clientId);
    
    if (!client || !client.rooms.has(roomId)) return;
    
    // 更新游标位置
    const roomCursors = this.cursors.get(roomId);
    if (roomCursors) {
      const cursor = roomCursors.get(client.userId);
      if (cursor) {
        cursor.position = position;
        cursor.timestamp = new Date().toISOString();
      }
      
      // 广播给房间内其他用户
      this.broadcastToRoom(roomId, {
        type: this.messageTypes.CURSOR_MOVE,
        userId: client.userId,
        userName: client.userName,
        position,
        color: cursor.color
      }, clientId);
    }
  }

  /**
   * 处理选区变化
   */
  handleSelectionChange(clientId, message) {
    const { roomId, selection } = message;
    const client = this.clients.get(clientId);
    
    if (!client || !client.rooms.has(roomId)) return;
    
    // 更新选区
    const roomSelections = this.selections.get(roomId);
    if (roomSelections) {
      roomSelections.set(client.userId, {
        ...selection,
        color: this.getUserColor(client.userId),
        timestamp: new Date().toISOString()
      });
      
      // 广播给房间内其他用户
      this.broadcastToRoom(roomId, {
        type: this.messageTypes.SELECTION_CHANGE,
        userId: client.userId,
        userName: client.userName,
        selection,
        color: this.getUserColor(client.userId)
      }, clientId);
    }
  }

  /**
   * 处理内容变更
   */
  handleContentChange(clientId, message) {
    const { roomId, resourceId, changes, version } = message;
    const client = this.clients.get(clientId);
    
    if (!client || !client.rooms.has(roomId)) return;
    
    // 检查锁状态
    const room = this.rooms.get(roomId);
    if (room) {
      const lock = room.locks.get(resourceId);
      if (lock && lock.clientId !== clientId) {
        this.sendError(clientId, '资源已锁定', `资源被 ${lock.userName} 锁定`);
        return;
      }
      
      // 更新房间状态
      if (!room.state[resourceId]) {
        room.state[resourceId] = { version: 0, content: '' };
      }
      
      // 应用变更（简化的 OT）
      room.state[resourceId].version = version;
      
      // 广播变更
      this.broadcastToRoom(roomId, {
        type: this.messageTypes.CONTENT_CHANGE,
        userId: client.userId,
        userName: client.userName,
        resourceId,
        changes,
        version,
        timestamp: new Date().toISOString()
      }, clientId);
    }
  }

  /**
   * 处理操作（OT）
   */
  handleOperation(clientId, message) {
    const { roomId, resourceId, operation } = message;
    const client = this.clients.get(clientId);
    
    if (!client || !client.rooms.has(roomId)) return;
    
    // 创建操作会话
    const sessionKey = `${roomId}:${resourceId}`;
    if (!this.sessions.has(sessionKey)) {
      this.sessions.set(sessionKey, {
        operations: [],
        version: 0
      });
    }
    
    const session = this.sessions.get(sessionKey);
    
    // 转换操作（简化的 OT）
    const transformedOp = this.transformOperation(operation, session.operations);
    
    // 记录操作
    session.operations.push({
      ...transformedOp,
      userId: client.userId,
      timestamp: new Date().toISOString()
    });
    session.version++;
    
    // 广播转换后的操作
    this.broadcastToRoom(roomId, {
      type: this.messageTypes.OPERATION,
      userId: client.userId,
      userName: client.userName,
      resourceId,
      operation: transformedOp,
      version: session.version
    }, clientId);
  }

  /**
   * 处理锁请求
   */
  handleAcquireLock(clientId, message) {
    const { roomId, resourceId, lockType = 'edit' } = message;
    const client = this.clients.get(clientId);
    
    if (!client || !client.rooms.has(roomId)) return;
    
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    // 检查资源是否已锁定
    if (room.locks.has(resourceId)) {
      const existingLock = room.locks.get(resourceId);
      if (existingLock.clientId !== clientId) {
        this.sendToClient(clientId, {
          type: this.messageTypes.LOCK_STATUS,
          resourceId,
          locked: true,
          lockedBy: existingLock.userName,
          success: false
        });
        return;
      }
    }
    
    // 获取锁
    room.locks.set(resourceId, {
      clientId,
      userId: client.userId,
      userName: client.userName,
      lockType,
      acquiredAt: new Date().toISOString()
    });
    
    // 通知所有用户
    this.broadcastToRoom(roomId, {
      type: this.messageTypes.LOCK_STATUS,
      resourceId,
      locked: true,
      lockedBy: client.userName,
      lockType
    });
    
  }

  /**
   * 处理释放锁
   */
  handleReleaseLock(clientId, message) {
    const { roomId, resourceId } = message;
    const client = this.clients.get(clientId);
    
    if (!client || !client.rooms.has(roomId)) return;
    
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const lock = room.locks.get(resourceId);
    if (lock && lock.clientId === clientId) {
      room.locks.delete(resourceId);
      
      // 通知所有用户
      this.broadcastToRoom(roomId, {
        type: this.messageTypes.LOCK_STATUS,
        resourceId,
        locked: false
      });
      
    }
  }

  /**
   * 处理用户状态
   */
  handleUserStatus(clientId, message) {
    const { status, activity } = message;
    const client = this.clients.get(clientId);
    
    if (!client) return;
    
    client.status = status;
    if (activity) {
      client.metadata.currentActivity = activity;
    }
    
    // 广播状态更新到所有房间
    for (const roomId of client.rooms) {
      this.broadcastToRoom(roomId, {
        type: this.messageTypes.USER_STATUS,
        userId: client.userId,
        userName: client.userName,
        status,
        activity,
        timestamp: new Date().toISOString()
      }, clientId);
    }
  }

  /**
   * 处理评论
   */
  handleComment(clientId, message) {
    const { roomId, resourceId, comment } = message;
    const client = this.clients.get(clientId);
    
    if (!client || !client.rooms.has(roomId)) return;
    
    // 广播评论
    this.broadcastToRoom(roomId, {
      type: this.messageTypes.COMMENT,
      userId: client.userId,
      userName: client.userName,
      resourceId,
      comment: {
        ...comment,
        id: uuidv4(),
        userId: client.userId,
        userName: client.userName,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * 处理同步请求
   */
  handleSyncRequest(clientId, message) {
    const { roomId, resourceId } = message;
    const client = this.clients.get(clientId);
    
    if (!client || !client.rooms.has(roomId)) return;
    
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    // 发送当前状态
    this.sendToClient(clientId, {
      type: this.messageTypes.SYNC_RESPONSE,
      roomId,
      resourceId,
      state: room.state[resourceId] || {},
      cursors: Array.from(this.cursors.get(roomId)?.values() || []),
      selections: Array.from(this.selections.get(roomId)?.values() || []),
      locks: Array.from(room.locks.entries())
    });
  }

  /**
   * 处理断开连接
   */
  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // 从所有房间移除
    for (const roomId of client.rooms) {
      this.handleLeaveRoom(clientId, { roomId });
    }
    
    // 清理客户端
    this.clients.delete(clientId);
    
    this.emit('disconnected', { clientId, userId: client.userId });
  }

  /**
   * 广播到房间
   */
  broadcastToRoom(roomId, message, excludeClientId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    for (const clientId of room.clients) {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    }
  }

  /**
   * 发送消息到客户端
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;
    
    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`发送消息失败到 ${clientId}:`, error);
    }
  }

  /**
   * 发送错误消息
   */
  sendError(clientId, error, details = '') {
    this.sendToClient(clientId, {
      type: this.messageTypes.ERROR,
      error,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 心跳检测
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, this.options.heartbeatInterval);
  }

  /**
   * 操作转换（简化版）
   */
  transformOperation(operation, history) {
    // 这里实现简化的操作转换逻辑
    // 实际应用中应该使用完整的 OT 算法
    return operation;
  }

  /**
   * 获取房间成员
   */
  getRoomMembers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    
    const members = [];
    for (const clientId of room.clients) {
      const client = this.clients.get(clientId);
      if (client) {
        members.push({
          clientId,
          userId: client.userId,
          userName: client.userName,
          status: client.status,
          color: this.getUserColor(client.userId)
        });
      }
    }
    
    return members;
  }

  /**
   * 获取用户颜色
   */
  getUserColor(userId) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    // 基于用户ID生成稳定的颜色
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * 获取服务器统计
   */
  getStatistics() {
    return {
      clients: this.clients.size,
      rooms: this.rooms.size,
      activeSessions: this.sessions.size,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  /**
   * 停止服务器
   */
  stop() {
    
    // 清理心跳
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // 关闭所有连接
    this.wss.clients.forEach((ws) => {
      ws.close(1000, 'Server shutting down');
    });
    
    // 关闭服务器
    this.wss.close(() => {
      console.log('✅ 服务器已关闭');
      this.emit('stopped');
    });
    
    // 清理数据
    this.clients.clear();
    this.rooms.clear();
    this.locks.clear();
    this.cursors.clear();
    this.selections.clear();
    this.sessions.clear();
  }
}

module.exports = CollaborationServer;
