/**
 * 增强版WebSocket管理器
 * 集成前端websocketManager功能到后端，提供统一的WebSocket管理和优化
 * 版本: v1.0.0
 */

const { Server } = require('socket.io');
const Redis = require('ioredis');
const EventEmitter = require('events');


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
class WebSocketManager extends EventEmitter {
  constructor(server, options = {}) {
    super();
    
    this.server = server;
    this.io = null;
    this.redisClient = null;
    this.connections = new Map();
    this.rooms = new Map();
    this.messageQueues = new Map();
    this.heartbeatInterval = null;
    this.reconnectionAttempts = new Map();
    
    // 配置选项
    this.config = {
      // Socket.IO配置
      socketIO: {
        cors: {
          origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:5174", "http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}"],
          methods: ["GET", "POST"],
          credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6,
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        ...options.socketIO
      },
      
      // 连接管理配置
      connection: {
        maxConnections: 10000,
        maxConnectionsPerUser: 10,
        maxRoomsPerUser: 50,
        connectionTimeout: 30000,
        idleTimeout: 300000, // 5分钟空闲超时
        ...options.connection
      },
      
      // 重连配置
      reconnection: {
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
        ...options.reconnection
      },
      
      // 心跳配置
      heartbeat: {
        interval: 30000, // 30秒心跳间隔
        timeout: 10000,  // 10秒心跳超时
        ...options.heartbeat
      },
      
      // 消息队列配置
      messageQueue: {
        maxSize: 1000,
        batchSize: 10,
        processInterval: 100,
        priority: {
          high: 1,
          normal: 5,
          low: 10
        },
        ...options.messageQueue
      },
      
      // 性能配置
      performance: {
        enableCompression: true,
        enableBatching: true,
        batchDelay: 50,
        maxBatchSize: 100,
        enableStatistics: true,
        ...options.performance
      },
      
      // Redis配置
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: 2, // 使用数据库2存储WebSocket数据
        keyPrefix: 'testweb:ws:',
        ...options.redis
      }
    };
    
    // 统计数据
    this.stats = {
      connections: {
        total: 0,
        active: 0,
        peak: 0
      },
      messages: {
        sent: 0,
        received: 0,
        queued: 0,
        failed: 0
      },
      performance: {
        avgResponseTime: 0,
        lastHeartbeat: null,
        reconnections: 0
      }
    };
    
    // 监听器映射
    this.listeners = new Map();
    
    this.isInitialized = false;
  }

  /**
   * 初始化WebSocket管理器
   */
  async initialize() {
    try {
      console.log('🚀 初始化增强版WebSocket管理器...');
      
      if (this.isInitialized) {
        console.warn('WebSocket管理器已经初始化');
        return;
      }
      
      // 初始化Redis连接
      await this.initializeRedis();
      
      // 初始化Socket.IO
      await this.initializeSocketIO();
      
      // 设置事件监听器
      this.setupEventListeners();
      
      // 启动心跳检测
      this.startHeartbeat();
      
      // 启动消息队列处理器
      this.startMessageQueueProcessor();
      
      // 启动清理任务
      this.startCleanupTasks();
      
      this.isInitialized = true;
      console.log('✅ 增强版WebSocket管理器初始化完成');
      
    } catch (error) {
      console.error('❌ WebSocket管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化Redis连接
   */
  async initializeRedis() {
    try {
      this.redisClient = new Redis({
        ...this.config.redis,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });
      
      this.redisClient.on('connect', () => {
        console.log('✅ Redis连接建立 (WebSocket)');
      });
      
      this.redisClient.on('error', (error) => {
        console.error('❌ Redis连接错误 (WebSocket):', error);
      });
      
      await this.redisClient.connect();
      
    } catch (error) {
      console.warn('⚠️ Redis连接失败，使用内存模式:', error.message);
      this.redisClient = null;
    }
  }

  /**
   * 初始化Socket.IO
   */
  async initializeSocketIO() {
    this.io = new Server(this.server, this.config.socketIO);
    
    // 中间件：连接验证和限制
    this.io.use((socket, next) => {
      try {
        // 检查连接数限制
        if (this.stats.connections.active >= this.config.connection.maxConnections) {
          return next(new Error('服务器连接数已达上限'));
        }
        
        // 用户连接数限制
        const userId = socket.handshake.auth?.userId;
        if (userId) {
          const userConnections = Array.from(this.connections.values())
            .filter(conn => conn.userId === userId).length;
          
          if (userConnections >= this.config.connection.maxConnectionsPerUser) {
            return next(new Error('用户连接数已达上限'));
          }
        }
        
        next();
      } catch {
        next(new Error('连接验证失败'));
      }
    });
    
    // 连接事件处理
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
    
    console.log('✅ Socket.IO服务器已初始化');
  }

  /**
   * 处理新连接
   */
  handleConnection(socket) {
    const connectionInfo = {
      id: socket.id,
      userId: socket.handshake.auth?.userId,
      userAgent: socket.handshake.headers['user-agent'],
      ip: socket.handshake.address,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set(),
      messageQueue: [],
      heartbeatCount: 0
    };
    
    this.connections.set(socket.id, connectionInfo);
    this.updateConnectionStats('connect');
    
    
    // 设置连接事件监听器
    this.setupConnectionListeners(socket, connectionInfo);
    
    // 发送连接确认
    socket.emit('connection:confirmed', {
      socketId: socket.id,
      config: {
        heartbeatInterval: this.config.heartbeat.interval,
        reconnectionConfig: this.config.reconnection
      }
    });
    
    // 触发连接事件
    this.emit('connection', socket, connectionInfo);
  }

  /**
   * 设置连接事件监听器
   */
  setupConnectionListeners(socket, connectionInfo) {
    // 断开连接
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, connectionInfo, reason);
    });
    
    // 心跳响应
    socket.on('heartbeat:pong', (data) => {
      this.handleHeartbeatPong(socket, connectionInfo, data);
    });
    
    // 加入房间
    socket.on('room:join', (roomId, callback) => {
      this.handleRoomJoin(socket, connectionInfo, roomId, callback);
    });
    
    // 离开房间
    socket.on('room:leave', (roomId, callback) => {
      this.handleRoomLeave(socket, connectionInfo, roomId, callback);
    });
    
    // 消息发送
    socket.on('message:send', (data, callback) => {
      this.handleMessageSend(socket, connectionInfo, data, callback);
    });
    
    // 订阅事件
    socket.on('subscribe', (eventName, callback) => {
      this.handleSubscribe(socket, connectionInfo, eventName, callback);
    });
    
    // 取消订阅
    socket.on('unsubscribe', (eventName, callback) => {
      this.handleUnsubscribe(socket, connectionInfo, eventName, callback);
    });
    
    // 更新活动时间
    socket.onAny(() => {
      connectionInfo.lastActivity = new Date();
    });
  }

  /**
   * 处理断开连接
   */
  handleDisconnection(socket, connectionInfo, reason) {
    
    // 清理连接数据
    this.connections.delete(socket.id);
    this.updateConnectionStats('disconnect');
    
    // 清理房间数据
    connectionInfo.rooms.forEach(roomId => {
      this.leaveRoom(socket.id, roomId);
    });
    
    // 清理消息队列
    this.messageQueues.delete(socket.id);
    
    // 清理重连尝试记录
    this.reconnectionAttempts.delete(socket.id);
    
    // 触发断开连接事件
    this.emit('disconnection', socket, connectionInfo, reason);
  }

  /**
   * 处理心跳响应
   */
  handleHeartbeatPong(socket, connectionInfo, data) {
    connectionInfo.heartbeatCount++;
    connectionInfo.lastActivity = new Date();
    
    if (data && data.timestamp) {
      const responseTime = Date.now() - data.timestamp;
      this.updatePerformanceStats(responseTime);
    }
  }

  /**
   * 处理房间加入
   */
  async handleRoomJoin(socket, connectionInfo, roomId, callback) {
    try {
      // 检查房间数量限制
      if (connectionInfo.rooms.size >= this.config.connection.maxRoomsPerUser) {
        const error = new Error('用户房间数量已达上限');
        if (callback) callback({ success: false, error: error.message });
        return;
      }
      
      // 加入房间
      socket.join(roomId);
      connectionInfo.rooms.add(roomId);
      
      // 更新房间统计
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, { members: new Set(), createdAt: new Date() });
      }
      this.rooms.get(roomId).members.add(socket.id);
      
      // 保存到Redis
      if (this.redisClient) {
        await this.redisClient.sadd(`room:${roomId}:members`, socket.id);
        await this.redisClient.hset(`connection:${socket.id}:rooms`, roomId, Date.now());
      }
      
      
      if (callback) callback({ success: true, roomId });
      this.emit('room:joined', socket, roomId);
      
    } catch (error) {
      console.error(`房间加入失败: ${error.message}`);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  /**
   * 处理房间离开
   */
  async handleRoomLeave(socket, connectionInfo, roomId, callback) {
    try {
      // 离开房间
      socket.leave(roomId);
      connectionInfo.rooms.delete(roomId);
      
      // 更新房间统计
      if (this.rooms.has(roomId)) {
        this.rooms.get(roomId).members.delete(socket.id);
        
        // 如果房间空了，删除房间记录
        if (this.rooms.get(roomId).members.size === 0) {
          this.rooms.delete(roomId);
        }
      }
      
      // 从Redis删除
      if (this.redisClient) {
        await this.redisClient.srem(`room:${roomId}:members`, socket.id);
        await this.redisClient.hdel(`connection:${socket.id}:rooms`, roomId);
      }
      
      
      if (callback) callback({ success: true, roomId });
      this.emit('room:left', socket, roomId);
      
    } catch (error) {
      console.error(`房间离开失败: ${error.message}`);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  /**
   * 处理消息发送
   */
  handleMessageSend(socket, connectionInfo, data, callback) {
    try {
      const message = {
        id: this.generateMessageId(),
        from: socket.id,
        userId: connectionInfo.userId,
        timestamp: Date.now(),
        ...data
      };
      
      // 添加到消息队列
      this.queueMessage(message);
      
      this.stats.messages.received++;
      
      if (callback) callback({ success: true, messageId: message.id });
      this.emit('message:received', socket, message);
      
    } catch (error) {
      console.error(`消息发送失败: ${error.message}`);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  /**
   * 发送消息到指定连接
   */
  sendToSocket(socketId, event, data, options = {}) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) {
      return false;
    }
    
    const message = {
      id: this.generateMessageId(),
      event,
      data,
      timestamp: Date.now(),
      priority: options.priority || 'normal'
    };
    
    if (options.queue) {
      this.queueMessage(message, socketId);
    } else {
      socket.emit(event, data);
      this.stats.messages.sent++;
    }
    
    return true;
  }

  /**
   * 发送消息到房间
   */
  sendToRoom(roomId, event, data, options = {}) {
    const message = {
      id: this.generateMessageId(),
      event,
      data,
      timestamp: Date.now(),
      priority: options.priority || 'normal'
    };
    
    if (options.queue) {
      // 队列模式：添加到房间成员的队列中
      const room = this.rooms.get(roomId);
      if (room) {
        room.members.forEach(socketId => {
          this.queueMessage(message, socketId);
        });
      }
    } else {
      // 直接发送
      this.io.to(roomId).emit(event, data);
      const room = this.rooms.get(roomId);
      if (room) {
        this.stats.messages.sent += room.members.size;
      }
    }
    
    return true;
  }

  /**
   * 广播消息
   */
  broadcast(event, data, options = {}) {
    const message = {
      id: this.generateMessageId(),
      event,
      data,
      timestamp: Date.now(),
      priority: options.priority || 'normal'
    };
    
    if (options.queue) {
      // 队列模式：添加到所有连接的队列中
      this.connections.forEach((_, socketId) => {
        this.queueMessage(message, socketId);
      });
    } else {
      // 直接广播
      this.io.emit(event, data);
      this.stats.messages.sent += this.connections.size;
    }
    
    return true;
  }

  /**
   * 消息队列管理
   */
  queueMessage(message, socketId = null) {
    if (socketId) {
      // 发送到特定socket
      if (!this.messageQueues.has(socketId)) {
        this.messageQueues.set(socketId, []);
      }
      
      const queue = this.messageQueues.get(socketId);
      if (queue.length >= this.config.messageQueue.maxSize) {
        queue.shift(); // 移除最老的消息
      }
      
      queue.push(message);
      this.stats.messages.queued++;
    } else {
      // 广播到所有连接
      this.connections.forEach((_, id) => {
        this.queueMessage(message, id);
      });
    }
  }

  /**
   * 启动消息队列处理器
   */
  startMessageQueueProcessor() {
    setInterval(() => {
      this.processMessageQueues();
    }, this.config.messageQueue.processInterval);
  }

  /**
   * 处理消息队列
   */
  processMessageQueues() {
    this.messageQueues.forEach((queue, socketId) => {
      if (queue.length === 0) return;
      

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) {
        // 清理已断开连接的队列
        this.messageQueues.delete(socketId);
        return;
      }
      
      // 按优先级排序
      queue.sort((a, b) => {
        const aPriority = this.config.messageQueue.priority[a.priority] || 5;
        const bPriority = this.config.messageQueue.priority[b.priority] || 5;
        return aPriority - bPriority;
      });
      
      // 批量发送消息
      const batch = queue.splice(0, this.config.messageQueue.batchSize);
      
      if (this.config.performance.enableBatching && batch.length > 1) {
        // 批量发送
        socket.emit('message:batch', batch);
        this.stats.messages.sent += batch.length;
      } else {
        // 单独发送
        batch.forEach(message => {
          socket.emit(message.event, message.data);
          this.stats.messages.sent++;
        });
      }
    });
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeat.interval);
  }

  /**
   * 执行心跳检测
   */
  performHeartbeat() {
    const now = Date.now();
    
    this.connections.forEach((connectionInfo, socketId) => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) return;
      
      // 发送心跳ping
      socket.emit('heartbeat:ping', { timestamp: now });
      
      // 检查上次活动时间
      const lastActivity = connectionInfo.lastActivity.getTime();
      if (now - lastActivity > this.config.connection.idleTimeout) {
        socket.disconnect(true);
      }
    });
    
    this.stats.performance.lastHeartbeat = new Date();
  }

  /**
   * 启动清理任务
   */
  startCleanupTasks() {
    // 每10分钟执行一次清理
    setInterval(() => {
      this.performCleanup();
    }, 10 * 60 * 1000);
  }

  /**
   * 执行清理任务
   */
  async performCleanup() {
    try {
      
      // 清理断开的连接
      const connectedSockets = new Set(this.io.sockets.sockets.keys());
      this.connections.forEach((connectionInfo, socketId) => {
        if (!connectedSockets.has(socketId)) {
          this.connections.delete(socketId);
          this.messageQueues.delete(socketId);
        }
      });
      
      // 清理空房间
      this.rooms.forEach((roomInfo, roomId) => {
        if (roomInfo.members.size === 0) {
          this.rooms.delete(roomId);
        }
      });
      
      // 清理Redis中的过期数据
      if (this.redisClient) {
        await this.cleanupRedisData();
      }
      
      console.log('✅ WebSocket清理任务完成');
      
    } catch (error) {
      console.error('❌ WebSocket清理任务失败:', error);
    }
  }

  /**
   * 清理Redis数据
   */
  async cleanupRedisData() {
    try {
      const pattern = `${this.config.redis.keyPrefix}*`;
      const keys = await this.redisClient.keys(pattern);
      
      // 删除断开连接的相关数据
      const connectedSockets = new Set(this.io.sockets.sockets.keys());
      const keysToDelete = [];
      
      for (const key of keys) {
        if (key.includes('connection:')) {
          const socketId = key.split(':')[2];
          if (!connectedSockets.has(socketId)) {
            keysToDelete.push(key);
          }
        }
      }
      
      if (keysToDelete.length > 0) {
        await this.redisClient.del(...keysToDelete);
      }
      
    } catch (error) {
      console.error('Redis清理失败:', error);
    }
  }

  /**
   * 设置全局事件监听器
   */
  setupEventListeners() {
    // 监听进程退出
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
    
    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error('WebSocket管理器未捕获异常:', error);
    });
    
    process.on('unhandledRejection', (reason) => {
      console.error('WebSocket管理器未处理的Promise拒绝:', reason);
    });
  }

  /**
   * 更新连接统计
   */
  updateConnectionStats(action) {
    switch (action) {
      case 'connect':
        this.stats.connections.total++;
        this.stats.connections.active++;
        if (this.stats.connections.active > this.stats.connections.peak) {
          this.stats.connections.peak = this.stats.connections.active;
        }
        break;
      case 'disconnect':
        this.stats.connections.active--;
        break;
    }
  }

  /**
   * 更新性能统计
   */
  updatePerformanceStats(responseTime) {
    if (this.stats.performance.avgResponseTime === 0) {
      this.stats.performance.avgResponseTime = responseTime;
    } else {
      this.stats.performance.avgResponseTime = 
        (this.stats.performance.avgResponseTime * 0.9) + (responseTime * 0.1);
    }
  }

  /**
   * 生成消息ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      rooms: {
        total: this.rooms.size,
        details: Array.from(this.rooms.entries()).map(([roomId, info]) => ({
          roomId,
          members: info.members.size,
          createdAt: info.createdAt
        }))
      },
      queues: {
        total: this.messageQueues.size,
        totalMessages: Array.from(this.messageQueues.values())
          .reduce((sum, queue) => sum + queue.length, 0)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        services: {
          socketIO: this.io ? 'running' : 'stopped',
          redis: this.redisClient ? 'connected' : 'disconnected',
          heartbeat: this.heartbeatInterval ? 'running' : 'stopped'
        },
        connections: this.stats.connections.active,
        rooms: this.rooms.size,
        messageQueues: this.messageQueues.size,
        lastHeartbeat: this.stats.performance.lastHeartbeat,
        timestamp: new Date().toISOString()
      };
      
      // 检查服务状态
      if (!this.io || !this.heartbeatInterval) {
        health.status = 'degraded';
      }
      
      return health;
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 关闭WebSocket管理器
   */
  async shutdown() {
    try {
      
      // 停止心跳
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // 关闭所有连接
      if (this.io) {
        this.io.close();
      }
      
      // 关闭Redis连接
      if (this.redisClient) {
        await this.redisClient.disconnect();
      }
      
      // 清理数据
      this.connections.clear();
      this.rooms.clear();
      this.messageQueues.clear();
      this.reconnectionAttempts.clear();
      
      this.isInitialized = false;
      console.log('✅ WebSocket管理器已关闭');
      
    } catch (error) {
      console.error('❌ 关闭WebSocket管理器失败:', error);
    }
  }

  /**
   * 获取Socket.IO实例
   */
  getIO() {
    return this.io;
  }

  /**
   * 检查是否已初始化
   */
  isReady() {
    return this.isInitialized && this.io;
  }
}

module.exports = WebSocketManager;
