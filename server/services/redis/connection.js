/**
 * Redis连接管理模块
 * 提供Redis连接池、错误处理和自动重连机制
 */

const Redis = require('ioredis');
const winston = require('winston');

class RedisConnectionManager {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetryAttempts = parseInt(process.env.REDIS_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.REDIS_RETRY_DELAY) || 1000;
    this.maxRetryDelay = parseInt(process.env.REDIS_MAX_RETRY_DELAY) || 5000;
    
    // 配置日志
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/redis.log' }),
        new winston.transports.Console()
      ]
    });

    this.init();
  }

  /**
   * 初始化Redis连接
   */
  init() {
    try {
      // 检查Redis是否启用
      if (process.env.REDIS_ENABLED !== 'true') {
        this.logger.info('Redis缓存已禁用，跳过连接');
        return;
      }

      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        
        // 连接池配置
        maxRetriesPerRequest: this.maxRetryAttempts,
        retryDelayOnFailover: this.retryDelay,
        connectTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT) || 5000,
        commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT) || 3000,
        lazyConnect: true,
        
        // 连接池设置
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxLoadingTimeout: 5000,
        
        // 重连策略
        retryStrategy: (times) => {
          const delay = Math.min(times * this.retryDelay, this.maxRetryDelay);
          this.logger.warn(`Redis重连尝试 ${times}, 延迟 ${delay}ms`);
          return delay;
        },
        
        // 集群配置（如果启用）
        enableOfflineQueue: false
      };

      // 如果启用集群模式
      if (process.env.REDIS_CLUSTER_ENABLED === 'true') {
        const clusterNodes = process.env.REDIS_CLUSTER_NODES?.split(',') || [];
        if (clusterNodes.length > 0) {
          this.redis = new Redis.Cluster(clusterNodes.map(node => {
            const [host, port] = node.split(':');
            return { host, port: parseInt(port) };
          }), {
            redisOptions: redisConfig
          });
        } else {
          throw new Error('集群模式已启用但未配置集群节点');
        }
      } else {
        this.redis = new Redis(redisConfig);
      }

      this.setupEventHandlers();
      this.connect();

    } catch (error) {
      this.logger.error('Redis初始化失败:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    this.redis.on('connect', () => {
      this.logger.info('Redis连接已建立');
      this.connectionAttempts = 0;
    });

    this.redis.on('ready', () => {
      this.logger.info('Redis连接就绪');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis连接错误:', error);
      this.isConnected = false;
      this.handleConnectionError(error);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis连接已关闭');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', (ms) => {
      this.logger.info(`Redis正在重连，延迟: ${ms}ms`);
    });

    this.redis.on('end', () => {
      this.logger.warn('Redis连接已结束');
      this.isConnected = false;
    });
  }

  /**
   * 连接到Redis
   */
  async connect() {
    try {
      await this.redis.connect();
      this.logger.info('Redis连接成功');
    } catch (error) {
      this.logger.error('Redis连接失败:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * 处理连接错误
   */
  handleConnectionError(error) {
    this.connectionAttempts++;
    
    if (this.connectionAttempts >= this.maxRetryAttempts) {
      this.logger.error(`Redis连接失败，已达到最大重试次数 (${this.maxRetryAttempts})`);
      this.isConnected = false;
      return;
    }

    // 指数退避重连
    const delay = Math.min(
      this.retryDelay * Math.pow(2, this.connectionAttempts - 1),
      this.maxRetryDelay
    );

    this.logger.warn(`Redis将在 ${delay}ms 后重试连接 (尝试 ${this.connectionAttempts}/${this.maxRetryAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 获取Redis客户端实例
   */
  getClient() {
    return this.redis;
  }

  /**
   * 检查连接状态
   */
  isRedisConnected() {
    return this.isConnected && this.redis && this.redis.status === 'ready';
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      if (!this.isRedisConnected()) {
        return { status: 'disconnected', message: 'Redis未连接' };
      }

      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        status: 'connected',
        latency: `${latency}ms`,
        memory: await this.getMemoryInfo(),
        connections: await this.getConnectionInfo()
      };
    } catch (error) {
      this.logger.error('Redis健康检查失败:', error);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * 获取内存信息
   */
  async getMemoryInfo() {
    try {
      const info = await this.redis.memory('usage');
      return {
        used: info,
        formatted: this.formatBytes(info)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 获取连接信息
   */
  async getConnectionInfo() {
    try {
      const info = await this.redis.info('clients');
      const lines = info.split('\r\n');
      const connections = {};
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          connections[key] = value;
        }
      });
      
      return connections;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 格式化字节数
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 关闭连接
   */
  async disconnect() {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.logger.info('Redis连接已关闭');
      }
    } catch (error) {
      this.logger.error('关闭Redis连接时出错:', error);
    }
  }

  /**
   * 强制断开连接
   */
  forceDisconnect() {
    try {
      if (this.redis) {
        this.redis.disconnect();
        this.logger.info('Redis连接已强制断开');
      }
    } catch (error) {
      this.logger.error('强制断开Redis连接时出错:', error);
    }
  }
}

// 创建单例实例
const redisConnectionManager = new RedisConnectionManager();

module.exports = redisConnectionManager;
