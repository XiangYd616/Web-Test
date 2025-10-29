/**
 * WebSocket服务
 * 提供实时通信功能，支持测试进度推送、状态更新等
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // 存储客户端连接信息
    this.testSessions = new Map(); // 存储测试会话信息
    this.rooms = new Map(); // 存储房间信息
  }

  /**
   * 初始化WebSocket服务器
   */
  initialize(server) {
    this.wss = new WebSocket.Server({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  /**
   * 验证客户端连接
   */
  verifyClient(info) {
    try {
      const url = new URL(info.req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        logger.info('❌ WebSocket连接被拒绝: 缺少认证信息');
        return false;
      }

      // 验证JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      info.req.user = decoded;
      return true;
    } catch (error) {
      logger.info('❌ WebSocket连接被拒绝: 认证信息无效');
      return false;
    }
  }

  /**
   * 处理新的WebSocket连接
   */
  handleConnection(ws, req) {
    const clientId = uuidv4();
    const user = req.user;

    // 存储客户端信息
    const clientInfo = {
      id: clientId,
      ws,
      user,
      connectedAt: new Date(),
      lastPing: new Date(),
      subscriptions: new Set()
    };

    this.clients.set(clientId, clientInfo);

    logger.info(`✅ 用户 ${user.email} 已连接 WebSocket (${clientId})`);

    // 发送连接确认
    this.sendToClient(clientId, {
      type: 'connection_established',
      clientId,
      timestamp: new Date().toISOString()
    });

    // 设置消息处理
    ws.on('message', (data) => this.handleMessage(clientId, data));

    // 设置连接关闭处理
    ws.on('close', () => this.handleDisconnection(clientId));

    // 设置错误处理
    ws.on('error', (error) => this.handleError(clientId, error));

    // 设置心跳检测
    ws.on('pong', () => {
      if (this.clients.has(clientId)) {
        this.clients.get(clientId).lastPing = new Date();
      }
    });
  }

  /**
   * 处理客户端消息
   */
  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(clientId);

      if (!client) return;


      switch (message.type) {
        case 'subscribe_test':
          this.handleTestSubscription(clientId, message.testId);
          break;

        case 'unsubscribe_test':
          this.handleTestUnsubscription(clientId, message.testId);
          break;

        case 'join_room':
          this.handleJoinRoom(clientId, message.room);
          break;

        case 'leave_room':
          this.handleLeaveRoom(clientId, message.room);
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        default:
          logger.info(`⚠️ 未知消息类型: ${message.type}`);
      }
    } catch (error) {
      logger.error('❌ 处理WebSocket消息失败:', error);
      this.sendToClient(clientId, {
        type: 'error',
        message: '消息处理失败',
        error: error.message
      });
    }
  }

  /**
   * 处理测试订阅
   */
  handleTestSubscription(clientId, testId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(`test:${testId}`);

    this.sendToClient(clientId, {
      type: 'subscription_confirmed',
      subscription: `test:${testId}`,
      timestamp: new Date().toISOString()
    });

  }

  /**
   * 处理测试取消订阅
   */
  handleTestUnsubscription(clientId, testId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(`test:${testId}`);

    this.sendToClient(clientId, {
      type: 'unsubscription_confirmed',
      subscription: `test:${testId}`,
      timestamp: new Date().toISOString()
    });

  }

  /**
   * 处理加入房间
   */
  handleJoinRoom(clientId, roomName) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }

    this.rooms.get(roomName).add(clientId);

    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.add(`room:${roomName}`);
    }

    this.sendToClient(clientId, {
      type: 'room_joined',
      room: roomName,
      timestamp: new Date().toISOString()
    });

  }

  /**
   * 处理离开房间
   */
  handleLeaveRoom(clientId, roomName) {
    if (this.rooms.has(roomName)) {
      this.rooms.get(roomName).delete(clientId);

      // 如果房间为空，删除房间
      if (this.rooms.get(roomName).size === 0) {
        this.rooms.delete(roomName);
      }
    }

    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(`room:${roomName}`);
    }

    this.sendToClient(clientId, {
      type: 'room_left',
      room: roomName,
      timestamp: new Date().toISOString()
    });

  }

  /**
   * 处理连接断开
   */
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 从所有房间中移除
    for (const [roomName, members] of this.rooms.entries()) {
      if (members.has(clientId)) {
        members.delete(clientId);
        if (members.size === 0) {
          this.rooms.delete(roomName);
        }
      }
    }

    // 移除客户端
    this.clients.delete(clientId);

    logger.info(`❌ 客户端 ${clientId} 已断开连接`);
  }

  /**
   * 处理连接错误
   */
  handleError(clientId, error) {
    logger.error(`❌ WebSocket错误 (${clientId}):`, error);
  }

  /**
   * 发送消息给特定客户端
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {

      return false;
    }

    try {
      client.ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      }));
      return true;
    } catch (error) {
      logger.error(`❌ 发送消息失败 (${clientId}):`, error);
      return false;
    }
  }

  /**
   * 广播测试进度更新
   */
  broadcastTestProgress(testId, progress, currentStep, totalSteps, message, metrics = {}) {
    const progressMessage = {
      type: 'test_progress',
      testId,
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        currentStep,
        totalSteps,
        message,
        responseTime: metrics.responseTime || 0,
        throughput: metrics.throughput || 0,
        activeUsers: metrics.activeUsers || 0,
        errorRate: metrics.errorRate || 0,
        successRate: metrics.successRate || (100 - (metrics.errorRate || 0)),
        phase: metrics.phase,
        timestamp: new Date().toISOString()
      }
    };

    this.broadcastToSubscribers(`test:${testId}`, progressMessage);
    logger.info(`📊 广播测试进度: ${testId} - ${progress}%`);
  }

  /**
   * 广播测试状态更新
   */
  broadcastTestStatusUpdate(testId, status, progress, message) {
    const statusMessage = {
      type: 'test_status_update',
      testId,
      status, // 'running', 'completed', 'failed', 'cancelled'
      progress,
      message,
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers(`test:${testId}`, statusMessage);
  }

  /**
   * 广播测试完成
   */
  broadcastTestCompleted(testId, results, success = true) {
    const completionMessage = {
      type: 'test_completed',
      testId,
      success,
      results,
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers(`test:${testId}`, completionMessage);
    logger.info(`✅ 广播测试完成: ${testId}`);
  }

  /**
   * 广播测试错误
   */
  broadcastTestError(testId, error, errorType = 'UNKNOWN_ERROR') {
    const errorMessage = {
      type: 'test_error',
      testId,
      error: {
        message: error.message || error,
        type: errorType,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers(`test:${testId}`, errorMessage);
    logger.error(`❌ 广播测试错误: ${testId} - ${error.message || error}`);
  }

  /**
   * 向订阅者广播消息
   */
  broadcastToSubscribers(subscription, message) {
    let sentCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      if (client.subscriptions.has(subscription)) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        }
      }
    }

    return sentCount;
  }

  /**
   * 向房间广播消息
   */
  broadcastToRoom(roomName, message) {
    const room = this.rooms.get(roomName);
    if (!room) return 0;

    let sentCount = 0;
    for (const clientId of room) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * 获取连接统计
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      totalTestSessions: this.testSessions.size,
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        userId: client.user.id,
        email: client.user.email,
        connectedAt: client.connectedAt,
        subscriptions: Array.from(client.subscriptions)
      }))
    };
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat() {
    setInterval(() => {
      const now = new Date();
      const timeout = 30000; // 30秒超时

        /**
         * if功能函数
         * @param {Object} params - 参数对象
         * @returns {Promise<Object>} 返回结果
         */
      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastPing > timeout) {
          client.ws.terminate();
          this.handleDisconnection(clientId);
        } else if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, 15000); // 每15秒检查一次
  }

  /**
   * 关闭WebSocket服务
   */
  close() {
    if (this.wss) {
      this.wss.close();
    }
  }
}

// 创建单例实例
const webSocketService = new WebSocketService();

module.exports = webSocketService;
