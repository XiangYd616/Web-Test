/**
 * WebSocket连接管理器
 * 管理Socket.IO连接、房间、消息广播等功能
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createAdapter } = require('@socket.io/redis-adapter');

class SocketManager {
  constructor(server, redisClient) {
    this.io = null;
    this.server = server;
    this.redisClient = redisClient;
    this.connections = new Map(); // 存储连接信息
    this.rooms = new Map(); // 存储房间信息
    this.userSockets = new Map(); // 用户ID到Socket ID的映射
    
    // 配置选项
    this.options = {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      transports: ['websocket', 'polling']
    };
    
    // 事件统计
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0
    };
  }

  /**
   * 初始化Socket.IO服务器
   */
  initialize() {
    console.log('🔌 初始化WebSocket服务器...');
    
    // 创建Socket.IO服务器
    this.io = new Server(this.server, this.options);
    
    // 设置Redis适配器（用于多实例支持）
    if (this.redisClient) {
      const pubClient = this.redisClient;
      const subClient = this.redisClient.duplicate();
      this.io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Redis适配器已配置');
    }
    
    // 设置中间件
    this.setupMiddleware();
    
    // 设置事件监听
    this.setupEventHandlers();
    
    console.log('✅ WebSocket服务器初始化完成');
    
    return this.io;
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    // 身份验证中间件
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('认证令牌缺失'));
        }
        
        // 验证JWT令牌
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 获取用户信息（这里可以从数据库获取更详细的信息）
        socket.user = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
          plan: decoded.plan
        };
        
        next();
      } catch (error) {
        console.error('Socket认证失败:', error);
        next(new Error('认证失败'));
      }
    });
    
    // 连接限制中间件
    this.io.use((socket, next) => {
      // 检查用户是否已有过多连接
      const userConnections = Array.from(this.connections.values())
        .filter(conn => conn.userId === socket.user.id);
      
      if (userConnections.length >= 5) { // 限制每个用户最多5个连接
        return next(new Error('连接数量超限'));
      }
      
      next();
    });
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * 处理新连接
   */
  handleConnection(socket) {
    const user = socket.user;
    const connectionInfo = {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      plan: user.plan,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set()
    };
    
    // 存储连接信息
    this.connections.set(socket.id, connectionInfo);
    this.userSockets.set(user.id, socket.id);
    
    // 更新统计
    this.stats.totalConnections++;
    this.stats.activeConnections++;
    
    console.log(`👤 用户连接: ${user.username} (${socket.id})`);
    
    // 发送欢迎消息
    socket.emit('connected', {
      message: '连接成功',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      serverTime: new Date().toISOString()
    });
    
    // 设置事件监听器
    this.setupSocketEvents(socket);
    
    // 加入用户专属房间
    socket.join(`user:${user.id}`);
    
    // 根据角色加入相应房间
    if (user.role === 'admin') {
      socket.join('admins');
    }
    
    // 广播用户上线（仅对管理员）
    socket.to('admins').emit('user:online', {
      userId: user.id,
      username: user.username,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 设置Socket事件监听器
   */
  setupSocketEvents(socket) {
    const connectionInfo = this.connections.get(socket.id);
    
    // 加入房间
    socket.on('join:room', (data) => {
      this.handleJoinRoom(socket, data);
    });
    
    // 离开房间
    socket.on('leave:room', (data) => {
      this.handleLeaveRoom(socket, data);
    });
    
    // 订阅测试进度
    socket.on('subscribe:test', (data) => {
      this.handleSubscribeTest(socket, data);
    });
    
    // 取消订阅测试进度
    socket.on('unsubscribe:test', (data) => {
      this.handleUnsubscribeTest(socket, data);
    });
    
    // 心跳检测
    socket.on('ping', () => {
      connectionInfo.lastActivity = new Date();
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
    
    // 获取在线用户
    socket.on('get:online_users', () => {
      this.handleGetOnlineUsers(socket);
    });
    
    // 处理断开连接
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });
    
    // 错误处理
    socket.on('error', (error) => {
      console.error(`Socket错误 (${socket.id}):`, error);
      this.stats.errors++;
    });
    
    // 更新活动时间
    socket.onAny(() => {
      connectionInfo.lastActivity = new Date();
      this.stats.messagesReceived++;
    });
  }

  /**
   * 处理加入房间
   */
  handleJoinRoom(socket, data) {
    const { roomName, roomType = 'general' } = data;
    const connectionInfo = this.connections.get(socket.id);
    
    if (!roomName) {
      return socket.emit('error', { message: '房间名称不能为空' });
    }
    
    // 验证房间权限
    if (!this.validateRoomAccess(socket.user, roomName, roomType)) {
      return socket.emit('error', { message: '没有权限加入该房间' });
    }
    
    socket.join(roomName);
    connectionInfo.rooms.add(roomName);
    
    // 更新房间信息
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, {
        name: roomName,
        type: roomType,
        users: new Set(),
        createdAt: new Date()
      });
    }
    
    const room = this.rooms.get(roomName);
    room.users.add(socket.user.id);
    
    socket.emit('room:joined', {
      roomName,
      userCount: room.users.size,
      timestamp: new Date().toISOString()
    });
    
    // 通知房间内其他用户
    socket.to(roomName).emit('room:user_joined', {
      userId: socket.user.id,
      username: socket.user.username,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📍 用户 ${socket.user.username} 加入房间: ${roomName}`);
  }

  /**
   * 处理离开房间
   */
  handleLeaveRoom(socket, data) {
    const { roomName } = data;
    const connectionInfo = this.connections.get(socket.id);
    
    socket.leave(roomName);
    connectionInfo.rooms.delete(roomName);
    
    // 更新房间信息
    const room = this.rooms.get(roomName);
    if (room) {
      room.users.delete(socket.user.id);
      
      // 如果房间为空，删除房间
      if (room.users.size === 0) {
        this.rooms.delete(roomName);
      }
    }
    
    socket.emit('room:left', {
      roomName,
      timestamp: new Date().toISOString()
    });
    
    // 通知房间内其他用户
    socket.to(roomName).emit('room:user_left', {
      userId: socket.user.id,
      username: socket.user.username,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 处理订阅测试进度
   */
  handleSubscribeTest(socket, data) {
    const { testId } = data;
    
    if (!testId) {
      return socket.emit('error', { message: '测试ID不能为空' });
    }
    
    const roomName = `test:${testId}`;
    socket.join(roomName);
    
    socket.emit('test:subscribed', {
      testId,
      timestamp: new Date().toISOString()
    });
    
    console.log(`🔔 用户 ${socket.user.username} 订阅测试: ${testId}`);
  }

  /**
   * 处理取消订阅测试进度
   */
  handleUnsubscribeTest(socket, data) {
    const { testId } = data;
    const roomName = `test:${testId}`;
    
    socket.leave(roomName);
    
    socket.emit('test:unsubscribed', {
      testId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 处理获取在线用户
   */
  handleGetOnlineUsers(socket) {
    const onlineUsers = Array.from(this.connections.values())
      .map(conn => ({
        userId: conn.userId,
        username: conn.username,
        role: conn.role,
        connectedAt: conn.connectedAt,
        lastActivity: conn.lastActivity
      }));
    
    socket.emit('online_users', {
      users: onlineUsers,
      total: onlineUsers.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 处理断开连接
   */
  handleDisconnection(socket, reason) {
    const connectionInfo = this.connections.get(socket.id);
    
    if (connectionInfo) {
      console.log(`👋 用户断开连接: ${connectionInfo.username} (${reason})`);
      
      // 清理房间
      connectionInfo.rooms.forEach(roomName => {
        const room = this.rooms.get(roomName);
        if (room) {
          room.users.delete(connectionInfo.userId);
          if (room.users.size === 0) {
            this.rooms.delete(roomName);
          }
        }
      });
      
      // 清理连接信息
      this.connections.delete(socket.id);
      this.userSockets.delete(connectionInfo.userId);
      
      // 更新统计
      this.stats.activeConnections--;
      
      // 广播用户下线（仅对管理员）
      socket.to('admins').emit('user:offline', {
        userId: connectionInfo.userId,
        username: connectionInfo.username,
        reason,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 验证房间访问权限
   */
  validateRoomAccess(user, roomName, roomType) {
    // 管理员可以访问所有房间
    if (user.role === 'admin') {
      return true;
    }
    
    // 用户只能访问自己的房间和公共房间
    if (roomName.startsWith(`user:${user.id}`) || roomType === 'public') {
      return true;
    }
    
    // 测试房间需要验证权限
    if (roomName.startsWith('test:')) {
      // 这里可以添加更复杂的权限验证逻辑
      return true;
    }
    
    return false;
  }

  /**
   * 广播测试进度更新
   */
  broadcastTestProgress(testId, progress) {
    const roomName = `test:${testId}`;
    
    this.io.to(roomName).emit('test:progress', {
      testId,
      progress,
      timestamp: new Date().toISOString()
    });
    
    this.stats.messagesSent++;
  }

  /**
   * 广播测试完成
   */
  broadcastTestComplete(testId, result) {
    const roomName = `test:${testId}`;
    
    this.io.to(roomName).emit('test:complete', {
      testId,
      result,
      timestamp: new Date().toISOString()
    });
    
    this.stats.messagesSent++;
  }

  /**
   * 发送消息给特定用户
   */
  sendToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
      this.stats.messagesSent++;
      return true;
    }
    return false;
  }

  /**
   * 广播系统通知
   */
  broadcastSystemNotification(message, level = 'info', targetRole = null) {
    const notification = {
      message,
      level,
      timestamp: new Date().toISOString()
    };
    
    if (targetRole) {
      this.io.to(targetRole + 's').emit('system:notification', notification);
    } else {
      this.io.emit('system:notification', notification);
    }
    
    this.stats.messagesSent++;
  }

  /**
   * 获取连接统计信息
   */
  getStats() {
    return {
      ...this.stats,
      rooms: this.rooms.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        userId: conn.userId,
        username: conn.username,
        connectedAt: conn.connectedAt,
        lastActivity: conn.lastActivity,
        rooms: Array.from(conn.rooms)
      }))
    };
  }

  /**
   * 清理非活跃连接
   */
  cleanupInactiveConnections() {
    const now = new Date();
    const timeout = 30 * 60 * 1000; // 30分钟超时
    
    for (const [socketId, connectionInfo] of this.connections.entries()) {
      if (now - connectionInfo.lastActivity > timeout) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    }
  }

  /**
   * 关闭WebSocket服务器
   */
  close() {
    if (this.io) {
      console.log('🔌 关闭WebSocket服务器...');
      this.io.close();
      this.connections.clear();
      this.rooms.clear();
      this.userSockets.clear();
    }
  }
}

module.exports = SocketManager;
