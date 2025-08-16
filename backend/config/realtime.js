/**
 * 实时通信配置和初始化
 * 管理WebSocket连接、实时服务等
 */

const SocketManager = require('../utils/websocket/SocketManager');
const RealtimeService = require('../services/realtime/RealtimeService');

class RealtimeConfig {
  constructor() {
    this.socketManager = null;
    this.realtimeService = null;
    this.isInitialized = false;
    this.cleanupInterval = null;
    
    // 配置选项
    this.config = {
      // Socket.IO配置
      socket: {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6,
        transports: ['websocket', 'polling']
      },
      
      // 实时服务配置
      realtime: {
        maxQueueSize: 1000,
        batchSize: 10,
        processInterval: 100,
        retryAttempts: 3,
        retryDelay: 1000,
        cleanupInterval: 60 * 60 * 1000 // 1小时清理一次
      },
      
      // 连接限制
      limits: {
        maxConnectionsPerUser: 5,
        maxRoomsPerUser: 10,
        messageRateLimit: 100, // 每分钟最大消息数
        inactiveTimeout: 30 * 60 * 1000 // 30分钟非活跃超时
      }
    };
  }

  /**
   * 初始化实时通信系统
   */
  async initialize(server, redisClient, cacheManager) {
    try {
      console.log('🚀 初始化实时通信系统...');
      
      if (this.isInitialized) {
        
        console.warn('实时通信系统已初始化');
        return this.getServices();
      }
      
      // 初始化Socket管理器
      this.socketManager = new SocketManager(server, redisClient);
      this.socketManager.initialize();
      
      // 初始化实时服务
      this.realtimeService = new RealtimeService(this.socketManager, cacheManager);
      
      // 设置定期清理
      this.setupCleanupTasks();
      
      // 设置事件监听
      this.setupEventListeners();
      
      this.isInitialized = true;
      
      console.log('✅ 实时通信系统初始化完成');
      
      return this.getServices();
      
    } catch (error) {
      console.error('❌ 实时通信系统初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取服务实例
   */
  getServices() {
    return {
      socketManager: this.socketManager,
      realtimeService: this.realtimeService
    };
  }

  /**
   * 设置定期清理任务
   */
  setupCleanupTasks() {
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
    }, this.config.realtime.cleanupInterval);
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 进程退出时清理
    process.on('SIGINT', () => {
      this.shutdown();
    });
    
    process.on('SIGTERM', () => {
      this.shutdown();
    });
    
    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      console.error('实时通信系统未捕获异常:', error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('实时通信系统未处理的Promise拒绝:', reason);
    });
  }

  /**
   * 测试进度更新处理器
   */
  async handleTestProgress(testId, progress) {
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
  async handleTestComplete(testId, result) {
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
  async handleTestFailed(testId, error) {
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
  async sendSystemNotification(message, options = {}) {
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
        rooms: 0
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
        queueSize: 0
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
        maxConnectionsPerUser: this.config.limits.maxConnectionsPerUser,
        maxRoomsPerUser: this.config.limits.maxRoomsPerUser,
        messageRateLimit: this.config.limits.messageRateLimit
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
          socketManager: this.socketManager ? 'running' : 'stopped',
          realtimeService: this.realtimeService ? 'running' : 'stopped'
        },
        stats: this.getFullStats(),
        timestamp: new Date().toISOString()
      };
      
      // 检查服务状态
      if (!this.socketManager || !this.realtimeService) {
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
   * 重启实时通信系统
   */
  async restart(server, redisClient, cacheManager) {
    try {
      console.log('🔄 重启实时通信系统...');
      
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
      console.log('🔌 关闭实时通信系统...');
      
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
}

// 创建单例实例
const realtimeConfig = new RealtimeConfig();

module.exports = realtimeConfig;
