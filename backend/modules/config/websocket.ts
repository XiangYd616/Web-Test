/**
 * 实时通信配置和初始化
 * 管理WebSocket连接、实时服务等 - 使用增强版WebSocket管理器
 */

import StreamingService from '../streaming/services/StreamingService';
import WebSocketManager from '../streaming/services/WebSocketManager';

type SocketManagerStats = {
  totalConnections?: number;
  activeConnections?: number;
  rooms?: number;
};

type RealtimeStats = {
  subscribers?: number;
  activeTests?: number;
  queueSize?: number;
};

type WebSocketManagerLike = {
  initialize: () => Promise<void>;
  cleanupInactiveConnections: () => void;
  getStats: () => SocketManagerStats;
  close: () => void;
  io?: unknown;
};

type StreamingServiceLike = {
  updateTestProgress: (testId: string, progress: Record<string, unknown>) => Promise<boolean>;
  notifyTestComplete: (testId: string, result: Record<string, unknown>) => Promise<boolean>;
  notifyTestFailed: (testId: string, error: Record<string, unknown>) => Promise<boolean>;
  sendNotification: (payload: Record<string, unknown>) => unknown;
  sendSystemNotification: (message: string, options?: Record<string, unknown>) => Promise<unknown>;
  getStats: () => RealtimeStats;
  cleanup: () => Promise<void>;
  shutdown: () => Promise<void>;
};

type WebSocketManagerConstructor = new (
  server: unknown,
  config: Record<string, unknown>,
  redisClient?: unknown
) => WebSocketManagerLike;

type StreamingServiceConstructor = new (
  socketManager: WebSocketManagerLike,
  cacheManager: unknown
) => StreamingServiceLike;

const TypedWebSocketManager = WebSocketManager as unknown as WebSocketManagerConstructor;
const TypedStreamingService = StreamingService as unknown as StreamingServiceConstructor;

class WebSocketConfig {
  private websocketManager: WebSocketManagerLike | null = null;
  private socketManager: WebSocketManagerLike | null = null;
  private realtimeService: StreamingServiceLike | null = null;
  private isInitialized = false;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private config: Record<string, unknown>;

  constructor() {
    // 增强版配置选项
    this.config = {
      // WebSocket管理器配置
      websocket: {
        socketIO: {
          cors: {
            origin:
              process.env.CORS_ORIGINS?.split(',') ||
              (process.env.NODE_ENV === 'production'
                ? [
                    'https://app.xiangweb.space',
                    'https://xiangweb.space',
                    'https://www.xiangweb.space',
                    'https://web-test-pied.vercel.app',
                  ]
                : [
                    'http://localhost:5174',
                    `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}`,
                    'http://127.0.0.1:5174',
                    'http://127.0.0.1:3001',
                  ]),
            methods: ['GET', 'POST'],
            credentials: true,
          },
          pingTimeout: 60000,
          pingInterval: 25000,
          maxHttpBufferSize: 1e6,
          transports: ['websocket', 'polling'],
          allowEIO3: true,
        },
        connection: {
          maxConnections: 10000,
          maxConnectionsPerUser: 10,
          maxRoomsPerUser: 50,
          connectionTimeout: 30000,
          idleTimeout: 300000, // 5分钟空闲超时
        },
        heartbeat: {
          interval: 30000, // 30秒心跳间隔
          timeout: 10000, // 10秒心跳超时
        },
        messageQueue: {
          maxSize: 1000,
          batchSize: 10,
          processInterval: 100,
          priority: {
            high: 1,
            normal: 5,
            low: 10,
          },
        },
        performance: {
          enableCompression: true,
          enableBatching: true,
          batchDelay: 50,
          maxBatchSize: 100,
          enableStatistics: true,
        },
      },

      // 实时服务配置
      realtime: {
        maxQueueSize: 2000,
        batchSize: 20,
        processInterval: 50,
        retryAttempts: 5,
        retryDelay: 1000,
        cleanupInterval: 30 * 60 * 1000, // 30分钟清理一次
      },

      // 连接限制（已移至websocket配置中）
      limits: {
        maxConnectionsPerUser: 10,
        maxRoomsPerUser: 50,
        messageRateLimit: 200, // 每分钟最大消息数
        inactiveTimeout: 5 * 60 * 1000, // 5分钟非活跃超时
      },
    };
  }

  /**
   * 初始化增强版实时通信系统
   */
  async initialize(server: unknown, redisClient: unknown, cacheManager: unknown) {
    try {
      console.log('🚀 初始化增强版实时通信系统...');

      if (this.isInitialized) {
        console.warn('实时通信系统已初始化');
        return this.getServices();
      }

      // 初始化WebSocket管理器
      this.websocketManager = new TypedWebSocketManager(
        server,
        this.config.websocket as Record<string, unknown>,
        redisClient as unknown
      );
      this.socketManager = this.websocketManager;
      await this.websocketManager.initialize();

      // 初始化实时服务（如果存在）
      try {
        this.realtimeService = new TypedStreamingService(this.websocketManager, cacheManager);
        console.log('✅ 实时服务已初始化');
      } catch (error) {
        console.warn('⚠️ 实时服务初始化失败，使用基本WebSocket功能:', (error as Error).message);
        this.realtimeService = null;
      }

      // 设置WebSocket事件监听
      this.setupWebSocketEventListeners();

      // 设置定期清理
      this.setupCleanupTasks();

      // 设置全局事件监听
      this.setupEventListeners();

      this.isInitialized = true;

      console.log('✅ 增强版实时通信系统初始化完成');

      return this.getServices();
    } catch (error) {
      console.error('❌ 增强版实时通信系统初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取服务实例
   */
  getServices() {
    return {
      socketManager: this.socketManager,
      realtimeService: this.realtimeService,
    };
  }

  /**
   * 设置定期清理任务
   */
  setupCleanupTasks() {
    const realtimeConfig = this.config.realtime as { cleanupInterval: number };

    // 定期清理非活跃连接和过期数据
    this.cleanupInterval = setInterval(async () => {
      try {
        // 清理非活跃连接
        if (this.socketManager) {
          this.socketManager.cleanupInactiveConnections();
        }

        // 清理实时服务数据
        if (this.realtimeService) {
          await this.realtimeService.cleanup();
        }
      } catch (error) {
        console.error('定期清理任务失败:', error);
      }
    }, realtimeConfig.cleanupInterval);
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 进程退出时清理
    process.on('SIGINT', () => {
      void this.shutdown();
    });

    process.on('SIGTERM', () => {
      void this.shutdown();
    });

    // 未捕获异常处理
    process.on('uncaughtException', error => {
      console.error('实时通信系统未捕获异常:', error);
    });

    process.on('unhandledRejection', reason => {
      console.error('实时通信系统未处理的Promise拒绝:', reason);
    });
  }

  /**
   * 测试进度更新处理器
   */
  async handleTestProgress(testId: string, progress: Record<string, unknown>) {
    try {
      if (!this.realtimeService) {
        console.warn('实时服务未初始化，无法发送测试进度');
        return false;
      }

      return await this.realtimeService.updateTestProgress(testId, progress);
    } catch (error) {
      console.error('处理测试进度更新失败:', error);
      return false;
    }
  }

  /**
   * 测试完成处理器
   */
  async handleTestComplete(testId: string, result: Record<string, unknown>) {
    try {
      if (!this.realtimeService) {
        console.warn('实时服务未初始化，无法发送测试完成通知');
        return false;
      }

      return await this.realtimeService.notifyTestComplete(testId, result);
    } catch (error) {
      console.error('处理测试完成通知失败:', error);
      return false;
    }
  }

  /**
   * 测试失败处理器
   */
  async handleTestFailed(testId: string, error: Record<string, unknown>) {
    try {
      if (!this.realtimeService) {
        console.warn('实时服务未初始化，无法发送测试失败通知');
        return false;
      }

      return await this.realtimeService.notifyTestFailed(testId, error);
    } catch (error) {
      console.error('处理测试失败通知失败:', error);
      return false;
    }
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(message: string, options: Record<string, unknown> = {}) {
    try {
      if (!this.realtimeService) {
        console.warn('实时服务未初始化，无法发送系统通知');
        return null;
      }

      return await this.realtimeService.sendSystemNotification(message, options);
    } catch (error) {
      console.error('发送系统通知失败:', error);
      return null;
    }
  }

  /**
   * 获取在线用户统计
   */
  getOnlineStats() {
    if (!this.socketManager) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        rooms: 0,
      };
    }

    return this.socketManager.getStats();
  }

  /**
   * 获取实时服务统计
   */
  getRealtimeStats() {
    if (!this.realtimeService) {
      return {
        subscribers: 0,
        activeTests: 0,
        queueSize: 0,
      };
    }

    return this.realtimeService.getStats();
  }

  /**
   * 获取完整统计信息
   */
  getFullStats() {
    return {
      online: this.getOnlineStats(),
      realtime: this.getRealtimeStats(),
      config: {
        maxConnectionsPerUser: (this.config.limits as { maxConnectionsPerUser: number })
          .maxConnectionsPerUser,
        maxRoomsPerUser: (this.config.limits as { maxRoomsPerUser: number }).maxRoomsPerUser,
        messageRateLimit: (this.config.limits as { messageRateLimit: number }).messageRateLimit,
      },
      timestamp: new Date().toISOString(),
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
          socketManager: this.socketManager ? 'running' : 'stopped',
          realtimeService: this.realtimeService ? 'running' : 'stopped',
        },
        stats: this.getFullStats(),
        timestamp: new Date().toISOString(),
      };

      // 检查服务状态
      if (!this.socketManager || !this.realtimeService) {
        health.status = 'degraded';
      }

      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 重启实时通信系统
   */
  async restart(server: unknown, redisClient: unknown, cacheManager: unknown) {
    try {
      void redisClient;

      // 关闭现有服务
      await this.shutdown();

      // 重新初始化
      await this.initialize(server, redisClient, cacheManager);

      console.log('✅ 实时通信系统重启完成');

      return true;
    } catch (error) {
      console.error('❌ 实时通信系统重启失败:', error);
      return false;
    }
  }

  /**
   * 关闭实时通信系统
   */
  async shutdown() {
    try {
      // 清理定时任务
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // 关闭实时服务
      if (this.realtimeService) {
        await this.realtimeService.shutdown();
        this.realtimeService = null;
      }

      // 关闭Socket管理器
      if (this.socketManager) {
        this.socketManager.close();
        this.socketManager = null;
      }

      this.isInitialized = false;

      console.log('✅ 实时通信系统已关闭');
    } catch (error) {
      console.error('❌ 关闭实时通信系统失败:', error);
    }
  }

  /**
   * 获取Socket.IO实例（用于其他模块集成）
   */
  getSocketIO() {
    return this.socketManager ? this.socketManager.io : null;
  }

  /**
   * 检查是否已初始化
   */
  isReady() {
    return this.isInitialized && this.socketManager && this.realtimeService;
  }

  /**
   * 兼容方法占位（保留原结构）
   */
  setupWebSocketEventListeners() {
    // no-op
  }
}

// 导出单例实例
const websocketConfig = new WebSocketConfig();

export default websocketConfig;
