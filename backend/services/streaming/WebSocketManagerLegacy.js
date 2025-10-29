/**
 * WebSocket管理器
 * 增强版WebSocket连接管理，支持认证、房间、订阅等功能
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.connections = new Map(); // 存储所有连接
    this.userConnections = new Map(); // 用户ID到连接的映射
    this.rooms = new Map(); // 房间管理
    this.subscriptions = new Map(); // 订阅管理
    
    this.config = {
      port: options.port || 8080,
      path: options.path || '/ws',
      maxConnections: options.maxConnections || 1000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      connectionTimeout: options.connectionTimeout || 60000,
      maxMessageSize: options.maxMessageSize || 1024 * 1024, // 1MB
      enableCompression: options.enableCompression !== false,
      ...options
    };
    
    this.messageHandlers = new Map();
    this.middlewares = [];
    
    // 注册默认消息处理器
    this.registerDefaultHandlers();
    
    // 启动心跳检测
    this.startHeartbeat();
  }

  /**
   * 初始化WebSocket服务器
   */
  async initialize(server) {
    try {
      this.wss = new WebSocket.Server({
        server,
        path: this.config.path,
        perMessageDeflate: this.config.enableCompression,
        maxPayload: this.config.maxMessageSize,
        clientTracking: false // 我们自己管理连接
      });

      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });

      this.wss.on('error', (error) => {
        console.error('WebSocket服务器错误:', error);
        this.emit('server_error', error);
      });

      console.log(`✅ WebSocket服务器已启动: ${this.config.path}`);
      this.emit('server_started', { path: this.config.path });
      
      return true;
    } catch (error) {
      console.error('初始化WebSocket服务器失败:', error);
      throw error;
    }
  }

  /**
   * 处理新连接
   */
  async handleConnection(ws, req) {
    // 检查连接数限制
    if (this.connections.size >= this.config.maxConnections) {
      ws.close(1013, 'Server overloaded');
      return;
    }

    const connectionId = this.generateConnectionId();
    const clientIP = this.getClientIP(req);
    
    const connection = {
      id: connectionId,
      ws,
      ip: clientIP,
      userAgent: req.headers['user-agent'],
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      lastActivity: new Date(),
      user: null,
      authenticated: false,
      rooms: new Set(),
      subscriptions: new Set(),
      messageCount: 0,
      bytesReceived: 0,
      bytesSent: 0
    };

    // 存储连接
    this.connections.set(connectionId, connection);


    // 设置消息处理
    ws.on('message', async (data) => {
      await this.handleMessage(connectionId, data);
    });

    // 设置关闭处理
    ws.on('close', (code, reason) => {
      this.handleDisconnection(connectionId, code, reason);
    });

    // 设置错误处理
    ws.on('error', (error) => {
      console.error(`连接 ${connectionId} 错误:`, error);
      this.handleConnectionError(connectionId, error);
    });

    // 发送欢迎消息
    this.sendToConnection(connectionId, {
      type: 'welcome',
      data: {
        connectionId,
        serverTime: new Date().toISOString(),
        heartbeatInterval: this.config.heartbeatInterval,
        features: {
          rooms: true,
          subscriptions: true,
          authentication: true,
          compression: this.config.enableCompression
        }
      }
    });

    this.emit('connection_opened', { connectionId, connection });
  }

  /**
   * 处理消息
   */
  async handleMessage(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // 更新连接统计
      connection.lastActivity = new Date();
      connection.messageCount++;
      connection.bytesReceived += data.length;

      // 检查消息大小
      if (data.length > this.config.maxMessageSize) {
        this.sendError(connectionId, 'Message too large', null);
        return;
      }

      const message = JSON.parse(data.toString());
      const { type, data: messageData, id: messageId } = message;


      // 应用中间件
      for (const middleware of this.middlewares) {
        const result = await middleware(connection, message);
        if (result === false) {
          return; // 中间件阻止了消息处理
        }
      }

      // 处理消息
      const handler = this.messageHandlers.get(type);
      if (handler) {
        await handler.call(this, connectionId, messageData, messageId);
      } else {
        this.sendError(connectionId, `Unknown message type: ${type}`, messageId);
      }

      this.emit('message_received', { connectionId, type, data: messageData });
    } catch (error) {
      console.error(`处理消息失败 ${connectionId}:`, error);
      this.sendError(connectionId, 'Invalid message format', message?.id);
    }
  }

  /**
   * 注册默认消息处理器
   */
  registerDefaultHandlers() {
    // 认证处理器
    this.messageHandlers.set('auth', async (connectionId, data, messageId) => {
      await this.handleAuthentication(connectionId, data, messageId);
    });

    // 心跳处理器
    this.messageHandlers.set('ping', async (connectionId, data, messageId) => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.lastHeartbeat = new Date();
        this.sendToConnection(connectionId, {
          type: 'pong',
          data: { serverTime: new Date().toISOString() },
          id: messageId
        });
      }
    });

    // 订阅处理器
    this.messageHandlers.set('subscribe', async (connectionId, data, messageId) => {
      await this.handleSubscribe(connectionId, data, messageId);
    });

    // 取消订阅处理器
    this.messageHandlers.set('unsubscribe', async (connectionId, data, messageId) => {
      await this.handleUnsubscribe(connectionId, data, messageId);
    });

    // 加入房间处理器
    this.messageHandlers.set('join_room', async (connectionId, data, messageId) => {
      await this.handleJoinRoom(connectionId, data, messageId);
    });

    // 离开房间处理器
    this.messageHandlers.set('leave_room', async (connectionId, data, messageId) => {
      await this.handleLeaveRoom(connectionId, data, messageId);
    });

    // 房间消息处理器
    this.messageHandlers.set('room_message', async (connectionId, data, messageId) => {
      await this.handleRoomMessage(connectionId, data, messageId);
    });

    // 获取在线用户处理器
    this.messageHandlers.set('get_online_users', async (connectionId, data, messageId) => {
      await this.handleGetOnlineUsers(connectionId, data, messageId);
    });
  }

  /**
   * 处理认证
   */
  async handleAuthentication(connectionId, data, messageId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const { token } = data;
      
      if (!token) {
        return this.sendError(connectionId, 'Missing authentication token', messageId);
      }

      // 验证JWT令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
      
      // 更新连接信息
      connection.user = decoded;
      connection.authenticated = true;

      // 建立用户连接映射
      if (!this.userConnections.has(decoded.id)) {
        this.userConnections.set(decoded.id, new Set());
      }
      this.userConnections.get(decoded.id).add(connectionId);

      this.sendToConnection(connectionId, {
        type: 'auth_success',
        data: {
          user: {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
          },
          permissions: decoded.permissions || [],
          authenticatedAt: new Date().toISOString()
        },
        id: messageId
      });

      this.emit('user_authenticated', { connectionId, user: decoded });
    } catch (error) {
      console.error(`认证失败 ${connectionId}:`, error);
      this.sendError(connectionId, 'Authentication failed', messageId);
    }
  }

  /**
   * 处理订阅
   */
  async handleSubscribe(connectionId, data, messageId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { channel, filters = {} } = data;
    
    if (!channel) {
      return this.sendError(connectionId, 'Missing channel name', messageId);
    }

    // 添加订阅
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Map());
    }
    
    this.subscriptions.get(channel).set(connectionId, {
      connectionId,
      userId: connection.user?.id,
      filters,
      subscribedAt: new Date()
    });

    connection.subscriptions.add(channel);

    this.sendToConnection(connectionId, {
      type: 'subscribed',
      data: { channel, filters },
      id: messageId
    });

    this.emit('channel_subscribed', { connectionId, channel, filters });
  }

  /**
   * 处理取消订阅
   */
  async handleUnsubscribe(connectionId, data, messageId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { channel } = data;
    
    if (!channel) {
      return this.sendError(connectionId, 'Missing channel name', messageId);
    }

    // 移除订阅
    if (this.subscriptions.has(channel)) {
      this.subscriptions.get(channel).delete(connectionId);
      
      // 如果频道没有订阅者，删除频道
      if (this.subscriptions.get(channel).size === 0) {
        this.subscriptions.delete(channel);
      }
    }

    connection.subscriptions.delete(channel);

    this.sendToConnection(connectionId, {
      type: 'unsubscribed',
      data: { channel },
      id: messageId
    });

    this.emit('channel_unsubscribed', { connectionId, channel });
  }

  /**
   * 处理加入房间
   */
  async handleJoinRoom(connectionId, data, messageId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { room, password } = data;
    
    if (!room) {
      return this.sendError(connectionId, 'Missing room name', messageId);
    }

    // 创建房间（如果不存在）
    if (!this.rooms.has(room)) {
      this.rooms.set(room, {
        name: room,
        password,
        members: new Set(),
        createdAt: new Date(),
        lastActivity: new Date(),
        messageHistory: []
      });
    }

    const roomData = this.rooms.get(room);
    
    // 检查密码（如果房间有密码）
    if (roomData.password && roomData.password !== password) {
      return this.sendError(connectionId, 'Invalid room password', messageId);
    }

    // 添加成员
    roomData.members.add(connectionId);
    roomData.lastActivity = new Date();
    connection.rooms.add(room);

    // 获取房间成员信息
    const members = Array.from(roomData.members).map(connId => {
      const conn = this.connections.get(connId);
      return {
        connectionId: connId,
        user: conn?.user ? {
          id: conn.user.id,
          username: conn.user.username
        } : null,
        joinedAt: conn?.connectedAt
      };
    }).filter(member => member.user); // 只返回已认证的用户

    this.sendToConnection(connectionId, {
      type: 'room_joined',
      data: {
        room,
        members,
        memberCount: roomData.members.size,
        recentMessages: roomData.messageHistory.slice(-10) // 返回最近10条消息
      },
      id: messageId
    });

    // 通知房间其他成员
    this.broadcastToRoom(room, {
      type: 'user_joined_room',
      data: {
        room,
        user: connection.user ? {
          id: connection.user.id,
          username: connection.user.username
        } : null,
        memberCount: roomData.members.size,
        timestamp: new Date().toISOString()
      }
    }, [connectionId]);

    this.emit('room_joined', { connectionId, room, memberCount: roomData.members.size });
  }

  /**
   * 处理离开房间
   */
  async handleLeaveRoom(connectionId, data, messageId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { room } = data;
    
    if (!room) {
      return this.sendError(connectionId, 'Missing room name', messageId);
    }

    if (!this.rooms.has(room)) {
      return this.sendError(connectionId, 'Room not found', messageId);
    }

    const roomData = this.rooms.get(room);
    
    // 移除成员
    roomData.members.delete(connectionId);
    roomData.lastActivity = new Date();
    connection.rooms.delete(room);

    this.sendToConnection(connectionId, {
      type: 'room_left',
      data: { room },
      id: messageId
    });

    // 通知房间其他成员
    if (roomData.members.size > 0) {
      this.broadcastToRoom(room, {
        type: 'user_left_room',
        data: {
          room,
          user: connection.user ? {
            id: connection.user.id,
            username: connection.user.username
          } : null,
          memberCount: roomData.members.size,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // 如果房间为空，删除房间
      this.rooms.delete(room);
    }

    this.emit('room_left', { connectionId, room, memberCount: roomData.members.size });
  }

  /**
   * 处理房间消息
   */
  async handleRoomMessage(connectionId, data, messageId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { room, message, type = 'text' } = data;

    if (!room || !message) {
      return this.sendError(connectionId, 'Missing room or message', messageId);
    }

    if (!connection.rooms.has(room)) {
      return this.sendError(connectionId, 'Not a member of this room', messageId);
    }

    if (!this.rooms.has(room)) {
      return this.sendError(connectionId, 'Room not found', messageId);
    }

    const roomData = this.rooms.get(room);
    
    const messageData = {
      id: this.generateMessageId(),
      type,
      content: message,
      sender: connection.user ? {
        id: connection.user.id,
        username: connection.user.username
      } : null,
      timestamp: new Date().toISOString()
    };

    // 保存消息历史
    roomData.messageHistory.push(messageData);
    if (roomData.messageHistory.length > 100) {
      roomData.messageHistory = roomData.messageHistory.slice(-100); // 只保留最近100条消息
    }
    
    roomData.lastActivity = new Date();

    // 广播消息到房间
    this.broadcastToRoom(room, {
      type: 'room_message',
      data: {
        room,
        message: messageData
      }
    });

    this.sendToConnection(connectionId, {
      type: 'message_sent',
      data: { room, messageId: messageData.id },
      id: messageId
    });

    this.emit('room_message_sent', { connectionId, room, message: messageData });
  }

  /**
   * 处理获取在线用户
   */
  async handleGetOnlineUsers(connectionId, data, messageId) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.authenticated) {
      return this.sendError(connectionId, 'Authentication required', messageId);
    }

    const onlineUsers = [];
    

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
    for (const [userId, connections] of this.userConnections.entries()) {
      if (connections.size > 0) {
        // 获取用户的第一个连接来获取用户信息
        const firstConnectionId = connections.values().next().value;
        const userConnection = this.connections.get(firstConnectionId);
        
        if (userConnection && userConnection.user) {
          onlineUsers.push({
            id: userConnection.user.id,
            username: userConnection.user.username,
            role: userConnection.user.role,
            connectedAt: userConnection.connectedAt,
            lastActivity: userConnection.lastActivity,
            connectionCount: connections.size
          });
        }
      }
    }

    this.sendToConnection(connectionId, {
      type: 'online_users',
      data: {
        users: onlineUsers,
        totalCount: onlineUsers.length,
        timestamp: new Date().toISOString()
      },
      id: messageId
    });
  }

  /**
   * 处理连接断开
   */
  handleDisconnection(connectionId, code, reason) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;


    // 从用户连接映射中移除
    if (connection.user) {
      const userConnections = this.userConnections.get(connection.user.id);
      if (userConnections) {
        userConnections.delete(connectionId);
        if (userConnections.size === 0) {
          this.userConnections.delete(connection.user.id);
        }
      }
    }

    // 从所有房间移除
    for (const room of connection.rooms) {
      const roomData = this.rooms.get(room);
      if (roomData) {
        roomData.members.delete(connectionId);
        
        // 通知房间其他成员
        if (roomData.members.size > 0) {
          this.broadcastToRoom(room, {
            type: 'user_disconnected',
            data: {
              room,
              user: connection.user ? {
                id: connection.user.id,
                username: connection.user.username
              } : null,
              memberCount: roomData.members.size,
              timestamp: new Date().toISOString()
            }
          });
        } else {
          // 删除空房间
          this.rooms.delete(room);
        }
      }
    }

    // 从所有订阅中移除
    for (const channel of connection.subscriptions) {
      const channelSubs = this.subscriptions.get(channel);
      if (channelSubs) {
        channelSubs.delete(connectionId);
        if (channelSubs.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    }

    // 移除连接
    this.connections.delete(connectionId);

    this.emit('connection_closed', { connectionId, code, reason });
  }

  /**
   * 处理连接错误
   */
  handleConnectionError(connectionId, error) {
    console.error(`连接错误 ${connectionId}:`, error);
    this.emit('connection_error', { connectionId, error });
  }

  /**
   * 发送消息给特定连接
   */
  sendToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const data = JSON.stringify(message);
      connection.ws.send(data);
      connection.bytesSent += data.length;
      return true;
    } catch (error) {
      console.error(`发送消息失败 ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * 发送错误消息
   */
  sendError(connectionId, message, messageId = null) {
    this.sendToConnection(connectionId, {
      type: 'error',
      data: { message },
      id: messageId
    });
  }

  /**
   * 发送消息给用户的所有连接
   */
  sendToUser(userId, message) {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections) return 0;

    let sentCount = 0;
    for (const connectionId of userConnections) {
      if (this.sendToConnection(connectionId, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  /**
   * 广播消息到房间
   */
  broadcastToRoom(room, message, excludeConnections = []) {
    const roomData = this.rooms.get(room);
    if (!roomData) return 0;

    let sentCount = 0;
    for (const connectionId of roomData.members) {
      if (!excludeConnections.includes(connectionId)) {
        if (this.sendToConnection(connectionId, message)) {
          sentCount++;
        }
      }
    }
    return sentCount;
  }

  /**
   * 广播消息到频道订阅者
   */
  broadcastToChannel(channel, message, filters = {}) {
    const channelSubs = this.subscriptions.get(channel);
    if (!channelSubs) return 0;

    let sentCount = 0;
    for (const [connectionId, subscription] of channelSubs) {
      // 应用过滤器
      if (this.matchesFilters(message, subscription.filters)) {
        if (this.sendToConnection(connectionId, message)) {
          sentCount++;
        }
      }
    }
    return sentCount;
  }

  /**
   * 广播消息给所有连接
   */
  broadcastToAll(message, excludeConnections = []) {
    let sentCount = 0;
    for (const connectionId of this.connections.keys()) {
      if (!excludeConnections.includes(connectionId)) {
        if (this.sendToConnection(connectionId, message)) {
          sentCount++;
        }
      }
    }
    return sentCount;
  }

  /**
   * 检查消息是否匹配过滤器
   */
  matchesFilters(message, filters) {
    if (!filters || Object.keys(filters).length === 0) return true;

    for (const [key, value] of Object.entries(filters)) {
      const messageValue = this.getNestedValue(message, key);
      if (messageValue !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取嵌套值
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat() {
    setInterval(() => {
      this.performHeartbeatCheck();
    }, this.config.heartbeatInterval);
  }

  /**
   * 执行心跳检查
   */
  performHeartbeatCheck() {
    const now = new Date();
    const timeout = this.config.connectionTimeout;
    const staleConnections = [];

    for (const [connectionId, connection] of this.connections) {
      // 检查最后活动时间
      if (now - connection.lastActivity > timeout) {
        staleConnections.push(connectionId);
      } else if (now - connection.lastHeartbeat > this.config.heartbeatInterval) {
        // 发送心跳
        this.sendToConnection(connectionId, {
          type: 'ping',
          data: { serverTime: now.toISOString() }
        });
      }
    }

    // 断开无响应的连接
    for (const connectionId of staleConnections) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.ws) {
        connection.ws.close(1001, 'Connection timeout');
      }
    }

    if (staleConnections.length > 0) {
    }
  }

  /**
   * 添加中间件
   */
  use(middleware) {
    if (typeof middleware === 'function') {
      this.middlewares.push(middleware);
    }
  }

  /**
   * 注册消息处理器
   */
  registerHandler(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const now = new Date();
    const activeConnections = Array.from(this.connections.values()).filter(
      conn => now - conn.lastActivity < this.config.connectionTimeout
    );

    return {
      totalConnections: this.connections.size,
      activeConnections: activeConnections.length,
      authenticatedConnections: activeConnections.filter(conn => conn.authenticated).length,
      totalRooms: this.rooms.size,
      totalSubscriptions: this.subscriptions.size,
      totalUsers: this.userConnections.size,
      messageCount: Array.from(this.connections.values()).reduce((sum, conn) => sum + conn.messageCount, 0),
      bytesReceived: Array.from(this.connections.values()).reduce((sum, conn) => sum + conn.bytesReceived, 0),
      bytesSent: Array.from(this.connections.values()).reduce((sum, conn) => sum + conn.bytesSent, 0),
      uptime: process.uptime(),
      timestamp: now.toISOString()
    };
  }

  /**
   * 获取客户端IP
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.socket.remoteAddress || 
           'unknown';
  }

  /**
   * 生成连接ID
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成消息ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 优雅关闭
   */
  async shutdown() {
    
    // 通知所有客户端
    this.broadcastToAll({
      type: 'server_shutdown',
      data: {
        message: '服务器正在关闭，连接将被断开',
        timestamp: new Date().toISOString()
      }
    });

    // 等待消息发送完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 关闭所有连接
    for (const [connectionId, connection] of this.connections) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close(1001, 'Server shutting down');
      }
    }

    // 关闭WebSocket服务器
    if (this.wss) {
      this.wss.close();
    }

    // 清理数据
    this.connections.clear();
    this.userConnections.clear();
    this.rooms.clear();
    this.subscriptions.clear();

    console.log('✅ WebSocket服务已关闭');
  }
}

module.exports = WebSocketManager;
