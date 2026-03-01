/**
 * 🔌 测试引擎WebSocket处理器
 * 为测试引擎提供实时状态更新和通信
 */

import type { IncomingMessage } from 'http';
import winston from 'winston';

type WebSocketLike = {
  readyState: number;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  on: {
    (event: 'message', handler: (data: Buffer | string) => void): void;
    (event: 'close', handler: (code: number, reason: string) => void): void;
    (event: 'error', handler: (error: Error) => void): void;
  };
};

type ClientInfo = {
  ws: WebSocketLike;
  userId: string | number;
  userRole: string;
  connectedAt: number;
  lastActivity: number;
  subscribedTests: Set<string>;
};

type EngineStatus = {
  isOnline: boolean;
  version: string;
  activeTests: number;
  totalResults: number;
  uptime: number;
  lastUpdate?: number;
};

// 创建专用的logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'engine-ws' },
  transports: [
    new winston.transports.File({
      filename: 'backend/logs/engine-ws.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.Console({
      level: 'info',
      format: winston.format.simple(),
    }),
  ],
});

/**
 * 测试引擎WebSocket处理器类
 */
class EngineWebSocketHandler {
  private clients = new Map<string, ClientInfo>();
  private testSubscriptions = new Map<string, Set<string>>();
  private engineStatus: EngineStatus = {
    isOnline: true,
    version: '1.0.0',
    activeTests: 0,
    totalResults: 0,
    uptime: Date.now(),
  };

  constructor() {
    this.setupCleanupTimer();
  }

  /**
   * 处理新的WebSocket连接
   */
  handleConnection(
    ws: ClientInfo['ws'],
    req: IncomingMessage & { user?: { id?: string; role?: string } }
  ) {
    const clientId = this.generateClientId();
    const userId = req.user?.id || 'anonymous';
    const userRole = req.user?.role || 'guest';

    // 存储客户端信息
    this.clients.set(clientId, {
      ws,
      userId,
      userRole,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      subscribedTests: new Set(),
    });

    logger.info(`🔌 新的引擎WebSocket连接: ${clientId} (用户: ${userId})`);

    // 发送欢迎消息和引擎状态
    this.sendToClient(clientId, {
      type: 'engineStatus',
      data: this.engineStatus,
    });

    // 设置消息处理器
    ws.on('message', (data: Buffer | string) => {
      this.handleMessage(clientId, data);
    });

    // 设置连接关闭处理器
    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    // 设置错误处理器
    ws.on('error', (error: Error) => {
      logger.error(`WebSocket错误 (客户端: ${clientId}):`, error);
      this.handleDisconnection(clientId);
    });

    // 发送心跳
    this.startHeartbeat(clientId);
  }

  /**
   * 处理WebSocket消息
   */
  handleMessage(clientId: string, data: Buffer | string) {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(clientId);

      if (!client) {
        logger.warn(`收到来自未知客户端的消息: ${clientId}`);
        return;
      }

      // 更新客户端活动时间
      client.lastActivity = Date.now();

      logger.debug(`收到消息 (客户端: ${clientId}):`, message);

      switch (message.type) {
        case 'subscribeTest':
          this.handleTestSubscription(clientId, message.testId);
          break;

        case 'unsubscribeTest':
          this.handleTestUnsubscription(clientId, message.testId);
          break;

        case 'getEngineStatus':
          this.sendEngineStatus(clientId);
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;

        default:
          logger.warn(`未知消息类型: ${message.type} (客户端: ${clientId})`);
      }
    } catch (error) {
      logger.error(`处理WebSocket消息失败 (客户端: ${clientId}):`, error);
    }
  }

  /**
   * 处理测试订阅
   */
  handleTestSubscription(clientId: string, testId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 添加到客户端订阅列表
    client.subscribedTests.add(testId);

    // 添加到全局订阅映射
    if (!this.testSubscriptions.has(testId)) {
      this.testSubscriptions.set(testId, new Set());
    }
    this.testSubscriptions.get(testId)?.add(clientId);

    logger.info(`客户端 ${clientId} 订阅测试: ${testId}`);

    // 发送确认消息
    this.sendToClient(clientId, {
      type: 'subscriptionConfirmed',
      testId,
      timestamp: Date.now(),
    });
  }

  /**
   * 处理测试取消订阅
   */
  handleTestUnsubscription(clientId: string, testId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 从客户端订阅列表移除
    client.subscribedTests.delete(testId);

    // 从全局订阅映射移除
    const subscribers = this.testSubscriptions.get(testId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.testSubscriptions.delete(testId);
      }
    }

    logger.info(`客户端 ${clientId} 取消订阅测试: ${testId}`);
  }

  /**
   * 处理连接断开
   */
  handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 清理所有订阅
    client.subscribedTests.forEach(testId => {
      this.handleTestUnsubscription(clientId, testId);
    });

    // 移除客户端
    this.clients.delete(clientId);

    logger.info(`🔌 WebSocket连接断开: ${clientId}`);
  }

  /**
   * 广播测试进度更新
   */
  broadcastTestProgress(testId: string, progress: { progress: number; currentStep?: string }) {
    const subscribers = this.testSubscriptions.get(testId);
    if (!subscribers || subscribers.size === 0) return;

    const message = {
      type: 'testProgress',
      testId,
      data: {
        progress: progress.progress,
        step: progress.currentStep,
        timestamp: Date.now(),
      },
    };

    subscribers.forEach(clientId => {
      this.sendToClient(clientId, message);
    });

    logger.debug(`广播测试进度: ${testId} (${progress.progress}%)`);
  }

  /**
   * 广播测试完成
   */
  broadcastTestCompleted(testId: string, result: unknown) {
    const subscribers = this.testSubscriptions.get(testId);
    if (!subscribers || subscribers.size === 0) return;

    const message = {
      type: 'testCompleted',
      testId,
      data: {
        result,
        timestamp: Date.now(),
      },
    };

    subscribers.forEach(clientId => {
      this.sendToClient(clientId, message);
    });

    // 清理订阅
    this.testSubscriptions.delete(testId);

    logger.info(`广播测试完成: ${testId}`);
  }

  /**
   * 广播测试失败
   */
  broadcastTestFailed(testId: string, error: Error) {
    const subscribers = this.testSubscriptions.get(testId);
    if (!subscribers || subscribers.size === 0) return;

    const message = {
      type: 'testFailed',
      testId,
      data: {
        error: error.message || '测试执行失败',
        timestamp: Date.now(),
      },
    };

    subscribers.forEach(clientId => {
      this.sendToClient(clientId, message);
    });

    // 清理订阅
    this.testSubscriptions.delete(testId);

    logger.warn(`广播测试失败: ${testId} - ${error.message}`);
  }

  /**
   * 发送消息给特定客户端
   */
  sendToClient(clientId: string, message: Record<string, unknown>) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== 1) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`发送消息失败 (客户端: ${clientId}):`, error);
      this.handleDisconnection(clientId);
      return false;
    }
  }

  /**
   * 广播引擎状态更新
   */
  broadcastEngineStatus() {
    const message = {
      type: 'engineStatus',
      data: this.engineStatus,
    };

    let successCount = 0;
    this.clients.forEach((_client, clientId) => {
      if (this.sendToClient(clientId, message)) {
        successCount++;
      }
    });

    logger.debug(`广播引擎状态更新: ${successCount}/${this.clients.size} 客户端`);
  }

  /**
   * 更新引擎状态
   */
  updateEngineStatus(updates: Partial<EngineStatus>) {
    this.engineStatus = {
      ...this.engineStatus,
      ...updates,
      lastUpdate: Date.now(),
    };

    this.broadcastEngineStatus();
  }

  /**
   * 发送引擎状态给特定客户端
   */
  sendEngineStatus(clientId: string) {
    this.sendToClient(clientId, {
      type: 'engineStatus',
      data: this.engineStatus,
    });
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const heartbeatInterval = setInterval(() => {
      if (!this.clients.has(clientId)) {
        clearInterval(heartbeatInterval);
        return;
      }

      const now = Date.now();
      const lastActivity = client.lastActivity;
      const timeout = 60000;

      if (now - lastActivity > timeout) {
        logger.warn(`客户端超时断开: ${clientId}`);
        this.handleDisconnection(clientId);
        clearInterval(heartbeatInterval);
        return;
      }

      if (!this.sendToClient(clientId, { type: 'ping', timestamp: now })) {
        clearInterval(heartbeatInterval);
      }
    }, 30000);
  }

  /**
   * 生成客户端ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 设置清理定时器
   */
  setupCleanupTimer() {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      return;
    }
    setInterval(() => {
      this.cleanupDisconnectedClients();
    }, 300000);
  }

  /**
   * 清理断开的连接
   */
  cleanupDisconnectedClients() {
    const disconnectedClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState !== 1) {
        disconnectedClients.push(clientId);
      }
    });

    disconnectedClients.forEach(clientId => {
      this.handleDisconnection(clientId);
    });

    if (disconnectedClients.length > 0) {
      logger.info(`清理断开的连接: ${disconnectedClients.length} 个`);
    }
  }

  /**
   * 获取连接统计
   */
  getConnectionStats() {
    return {
      totalClients: this.clients.size,
      activeSubscriptions: this.testSubscriptions.size,
      engineStatus: this.engineStatus,
      clientsByRole: this.getClientsByRole(),
    };
  }

  /**
   * 按角色统计客户端
   */
  getClientsByRole() {
    const roleStats: Record<string, number> = {};
    this.clients.forEach(client => {
      const role = client.userRole;
      roleStats[role] = (roleStats[role] || 0) + 1;
    });
    return roleStats;
  }

  /**
   * 关闭所有连接
   */
  closeAllConnections() {
    logger.info('关闭所有WebSocket连接...');

    this.clients.forEach((client, clientId) => {
      try {
        client.ws.close(1000, '服务器关闭');
      } catch (error) {
        logger.error(`关闭连接失败 (客户端: ${clientId}):`, error);
      }
    });

    this.clients.clear();
    this.testSubscriptions.clear();

    logger.info('所有WebSocket连接已关闭');
  }
}

// 创建全局实例
const engineWSHandler = new EngineWebSocketHandler();

/**
 * WebSocket中间件工厂
 */
const createEngineWebSocketMiddleware = () => {
  return (ws: ClientInfo['ws'], req: IncomingMessage & { user?: { id?: string } }) => {
    if (!req.user && process.env.NODE_ENV === 'production') {
      logger.warn('未授权的WebSocket连接尝试');
      return ws.close(1008, '需要身份验证');
    }

    engineWSHandler.handleConnection(ws, req);
  };
};

/**
 * 获取WebSocket处理器实例
 */
const getEngineWSHandler = () => {
  return engineWSHandler;
};

/**
 * 广播测试事件的便捷函数
 */
const broadcastTestEvent = {
  progress: (testId: string, progress: { progress: number; currentStep?: string }) => {
    engineWSHandler.broadcastTestProgress(testId, progress);
  },

  completed: (testId: string, result: unknown) => {
    engineWSHandler.broadcastTestCompleted(testId, result);
  },

  failed: (testId: string, error: Error) => {
    engineWSHandler.broadcastTestFailed(testId, error);
  },

  engineStatus: (updates: Partial<EngineStatus>) => {
    engineWSHandler.updateEngineStatus(updates);
  },
};

export {
  broadcastTestEvent,
  createEngineWebSocketMiddleware,
  EngineWebSocketHandler,
  engineWSHandler,
  getEngineWSHandler,
};
