const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const databaseService = require('./DatabaseService');

/**
 * WebSocket服务类
 * 提供实时通信功能，支持测试进度推送和状态更新
 */
class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // 存储连接的客户端
    this.testSubscriptions = new Map(); // 存储测试订阅关系
  }

  /**
   * 初始化WebSocket服务
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('✅ WebSocket服务初始化完成');
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 客户端连接: ${socket.id}`);

      // 处理认证
      socket.on('authenticate', async (token) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.userId = decoded.userId;
          socket.authenticated = true;
          
          this.connectedClients.set(socket.id, {
            socket,
            userId: decoded.userId,
            connectedAt: new Date()
          });

          socket.emit('authenticated', { success: true, userId: decoded.userId });
          console.log(`✅ 客户端认证成功: ${socket.id} (用户: ${decoded.userId})`);
        } catch (error) {
          socket.emit('authentication_error', { error: '认证失败' });
          console.log(`❌ 客户端认证失败: ${socket.id}`);
        }
      });

      // 处理测试订阅
      socket.on('subscribe_test', (testId) => {
        if (!socket.authenticated) {
          socket.emit('error', { message: '请先进行认证' });
          return;
        }

        socket.join(`test_${testId}`);
        
        // 记录订阅关系
        if (!this.testSubscriptions.has(testId)) {
          this.testSubscriptions.set(testId, new Set());
        }
        this.testSubscriptions.get(testId).add(socket.id);

        socket.emit('subscribed', { testId });
        console.log(`📡 客户端订阅测试: ${socket.id} -> ${testId}`);

        // 发送当前测试状态
        this.sendCurrentTestStatus(testId, socket);
      });

      // 处理取消订阅
      socket.on('unsubscribe_test', (testId) => {
        socket.leave(`test_${testId}`);
        
        if (this.testSubscriptions.has(testId)) {
          this.testSubscriptions.get(testId).delete(socket.id);
          if (this.testSubscriptions.get(testId).size === 0) {
            this.testSubscriptions.delete(testId);
          }
        }

        socket.emit('unsubscribed', { testId });
        console.log(`📡 客户端取消订阅测试: ${socket.id} -> ${testId}`);
      });

      // 处理获取测试状态
      socket.on('get_test_status', async (testId) => {
        if (!socket.authenticated) {
          socket.emit('error', { message: '请先进行认证' });
          return;
        }

        try {
          const status = await databaseService.getTestStatus(testId);
          socket.emit('test_status', { testId, status });
        } catch (error) {
          socket.emit('error', { message: '获取测试状态失败', testId });
        }
      });

      // 处理获取测试结果
      socket.on('get_test_result', async (testId) => {
        if (!socket.authenticated) {
          socket.emit('error', { message: '请先进行认证' });
          return;
        }

        try {
          const result = await databaseService.getTestResult(testId);
          socket.emit('test_result', { testId, result });
        } catch (error) {
          socket.emit('error', { message: '获取测试结果失败', testId });
        }
      });

      // 处理断开连接
      socket.on('disconnect', () => {
        console.log(`🔌 客户端断开连接: ${socket.id}`);
        
        // 清理连接记录
        this.connectedClients.delete(socket.id);
        
        // 清理订阅记录
        for (const [testId, subscribers] of this.testSubscriptions) {
          subscribers.delete(socket.id);
          if (subscribers.size === 0) {
            this.testSubscriptions.delete(testId);
          }
        }
      });

      // 处理错误
      socket.on('error', (error) => {
        console.error(`❌ WebSocket错误 (${socket.id}):`, error);
      });
    });
  }

  /**
   * 发送当前测试状态
   */
  async sendCurrentTestStatus(testId, socket) {
    try {
      const status = await databaseService.getTestStatus(testId);
      socket.emit('test_status_update', {
        testId,
        status: status.status,
        progress: status.progress,
        message: status.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`获取测试状态失败 (${testId}):`, error);
    }
  }

  /**
   * 广播测试状态更新
   */
  broadcastTestStatusUpdate(testId, status, progress, message) {
    const updateData = {
      testId,
      status,
      progress,
      message,
      timestamp: new Date().toISOString()
    };

    // 向订阅该测试的所有客户端广播
    this.io.to(`test_${testId}`).emit('test_status_update', updateData);
    
    console.log(`📡 广播测试状态更新: ${testId} -> ${status} (${progress}%)`);
  }

  /**
   * 广播测试进度更新
   */
  broadcastTestProgress(testId, progress, currentStep, totalSteps, message) {
    const progressData = {
      testId,
      progress,
      currentStep,
      totalSteps,
      message,
      timestamp: new Date().toISOString()
    };

    this.io.to(`test_${testId}`).emit('test_progress_update', progressData);
    
    console.log(`📊 广播测试进度: ${testId} -> ${progress}% (${currentStep}/${totalSteps})`);
  }

  /**
   * 广播测试完成
   */
  broadcastTestCompleted(testId, results, success) {
    const completionData = {
      testId,
      results,
      success,
      completedAt: new Date().toISOString()
    };

    this.io.to(`test_${testId}`).emit('test_completed', completionData);
    
    console.log(`🎉 广播测试完成: ${testId} -> ${success ? '成功' : '失败'}`);
  }

  /**
   * 广播测试错误
   */
  broadcastTestError(testId, error, errorCode) {
    const errorData = {
      testId,
      error: error.message || error,
      errorCode,
      timestamp: new Date().toISOString()
    };

    this.io.to(`test_${testId}`).emit('test_error', errorData);
    
    console.log(`❌ 广播测试错误: ${testId} -> ${error.message || error}`);
  }

  /**
   * 发送系统通知
   */
  broadcastSystemNotification(message, type = 'info', targetUsers = null) {
    const notification = {
      message,
      type, // info, warning, error, success
      timestamp: new Date().toISOString()
    };

    if (targetUsers && targetUsers.length > 0) {
      // 发送给特定用户
      for (const [socketId, client] of this.connectedClients) {
        if (targetUsers.includes(client.userId)) {
          client.socket.emit('system_notification', notification);
        }
      }
    } else {
      // 广播给所有连接的客户端
      this.io.emit('system_notification', notification);
    }

    console.log(`📢 系统通知: ${message} (类型: ${type})`);
  }

  /**
   * 获取连接统计
   */
  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      authenticatedConnections: Array.from(this.connectedClients.values())
        .filter(client => client.socket.authenticated).length,
      activeSubscriptions: this.testSubscriptions.size,
      totalSubscribers: Array.from(this.testSubscriptions.values())
        .reduce((total, subscribers) => total + subscribers.size, 0)
    };
  }

  /**
   * 获取测试订阅统计
   */
  getTestSubscriptionStats() {
    const stats = {};
    for (const [testId, subscribers] of this.testSubscriptions) {
      stats[testId] = subscribers.size;
    }
    return stats;
  }

  /**
   * 清理过期连接
   */
  cleanupExpiredConnections() {
    const now = new Date();
    const expiredThreshold = 30 * 60 * 1000; // 30分钟

    for (const [socketId, client] of this.connectedClients) {
      if (now - client.connectedAt > expiredThreshold && !client.socket.connected) {
        this.connectedClients.delete(socketId);
        console.log(`🧹 清理过期连接: ${socketId}`);
      }
    }
  }

  /**
   * 关闭WebSocket服务
   */
  close() {
    if (this.io) {
      this.io.close();
      console.log('✅ WebSocket服务已关闭');
    }
  }
}

// 创建单例实例
const webSocketService = new WebSocketService();

module.exports = webSocketService;
