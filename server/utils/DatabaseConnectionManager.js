/**
 * 数据库连接管理器 - 增强版本
 * 提供连接池优化、自动重连、健康检查、故障恢复等功能
 */

const { Pool } = require('pg');
const EventEmitter = require('events');

// 简单的日志记录器（如果没有外部日志器）
const Logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, error, data) => console.error(`[ERROR] ${msg}`, error?.message || error, data || ''),
  debug: (msg, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${msg}`, data || '');
    }
  }
};

class DatabaseConnectionManager extends EventEmitter {
  constructor(config = {}) {
    super();

    // 根据环境自动选择数据库
    const getDefaultDatabase = () => {
      const env = process.env.NODE_ENV || 'development';
      switch (env) {
        case 'production':
          return 'testweb_prod';
        case 'test':
          return 'testweb_test';
        default:
          return 'testweb_dev';
      }
    };

    this.config = {
      // 连接池配置
      max: config.max || parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
      min: config.min || parseInt(process.env.DB_MIN_CONNECTIONS) || 5,
      idleTimeoutMillis: config.idleTimeoutMillis || parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
      acquireTimeoutMillis: config.acquireTimeoutMillis || parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,

      // 重连配置
      retryAttempts: config.retryAttempts || parseInt(process.env.DB_RETRY_ATTEMPTS) || 5,
      retryDelay: config.retryDelay || parseInt(process.env.DB_RETRY_DELAY) || 1000,
      maxRetryDelay: config.maxRetryDelay || parseInt(process.env.DB_MAX_RETRY_DELAY) || 30000,

      // 健康检查配置
      healthCheckInterval: config.healthCheckInterval || parseInt(process.env.DB_HEALTH_CHECK_INTERVAL) || 30000,
      healthCheckQuery: config.healthCheckQuery || 'SELECT 1 as health_check',

      // 数据库配置
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || parseInt(process.env.DB_PORT) || 5432,
      database: config.database || process.env.DB_NAME || getDefaultDatabase(),
      user: config.user || process.env.DB_USER || 'postgres',
      password: config.password || process.env.DB_PASSWORD || 'postgres',

      // SSL配置
      ssl: config.ssl || (process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
      } : false),

      // 应用名称
      application_name: config.application_name || process.env.DB_APPLICATION_NAME || `testweb_${process.env.NODE_ENV || 'dev'}`,

      // 性能配置
      statement_timeout: config.statement_timeout || parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
      query_timeout: config.query_timeout || parseInt(process.env.DB_QUERY_TIMEOUT) || 30000
    };

    this.pool = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.healthCheckTimer = null;
    this.lastHealthCheck = null;
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      errorCount: 0,
      lastError: null,
      uptime: Date.now(),
      averageQueryTime: 0,
      slowQueries: 0
    };

    // 环境信息
    this.environment = process.env.NODE_ENV || 'development';
    this.isProduction = this.environment === 'production';
  }

  /**
   * 初始化连接池
   */
  async initialize() {
    try {
      Logger.info('初始化数据库连接池', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        maxConnections: this.config.max
      });

      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl,
        max: this.config.max,
        min: this.config.min,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,

        // 连接池事件处理
        application_name: 'testweb_platform'
      });

      // 设置连接池事件监听
      this.setupPoolEventListeners();

      // 测试连接
      await this.testConnection();

      this.isConnected = true;
      this.reconnectAttempts = 0;

      // 启动健康检查
      this.startHealthCheck();

      Logger.info('数据库连接池初始化成功');
      return true;

    } catch (error) {
      Logger.error('数据库连接池初始化失败', error);
      await this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * 设置连接池事件监听
   */
  setupPoolEventListeners() {
    this.pool.on('connect', (client) => {
      this.connectionStats.totalConnections++;
      Logger.debug('新的数据库连接建立', {
        totalConnections: this.connectionStats.totalConnections
      });
    });

    this.pool.on('acquire', (client) => {
      this.connectionStats.activeConnections++;
      Logger.debug('获取数据库连接', {
        activeConnections: this.connectionStats.activeConnections
      });
    });

    this.pool.on('release', (client) => {
      this.connectionStats.activeConnections--;
      this.connectionStats.idleConnections++;
      Logger.debug('释放数据库连接', {
        activeConnections: this.connectionStats.activeConnections,
        idleConnections: this.connectionStats.idleConnections
      });
    });

    this.pool.on('remove', (client) => {
      this.connectionStats.totalConnections--;
      Logger.debug('移除数据库连接', {
        totalConnections: this.connectionStats.totalConnections
      });
    });

    this.pool.on('error', (error, client) => {
      this.connectionStats.errorCount++;
      this.connectionStats.lastError = {
        message: error.message,
        timestamp: new Date().toISOString()
      };

      Logger.error('数据库连接池错误', error);
      this.handleConnectionError(error);
    });
  }

  /**
   * 测试数据库连接
   */
  async testConnection() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(this.config.healthCheckQuery);
      Logger.debug('数据库连接测试成功', { result: result.rows[0] });
      return true;
    } finally {
      client.release();
    }
  }

  /**
   * 执行查询（带重连机制）
   */
  async query(sql, params = [], options = {}) {
    const { retryOnFailure = true, timeout = 30000 } = options;

    this.connectionStats.totalQueries++;

    try {
      // 检查连接状态
      if (!this.isConnected) {
        await this.reconnect();
      }

      // 设置查询超时
      const queryPromise = this.pool.query(sql, params);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeout);
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);

      Logger.debug('数据库查询成功', {
        rowCount: result.rowCount,
        duration: Date.now() - Date.now() // 这里应该记录实际执行时间
      });

      return result;

    } catch (error) {
      this.connectionStats.errorCount++;
      this.connectionStats.lastError = {
        message: error.message,
        timestamp: new Date().toISOString()
      };

      Logger.error('数据库查询失败', error, {
        sql: sql.substring(0, 100) + '...',
        params
      });

      // 如果是连接错误且允许重试，尝试重连
      if (retryOnFailure && this.isConnectionError(error)) {
        Logger.warn('检测到连接错误，尝试重连');
        await this.reconnect();
        return this.query(sql, params, { ...options, retryOnFailure: false });
      }

      throw error;
    }
  }

  /**
   * 自动重连
   */
  async reconnect() {
    if (this.reconnectAttempts >= this.config.retryAttempts) {
      throw new Error(`数据库重连失败，已达到最大重试次数: ${this.config.retryAttempts}`);
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.retryDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxRetryDelay
    );

    Logger.warn(`数据库重连尝试 ${this.reconnectAttempts}/${this.config.retryAttempts}`, {
      delay,
      nextAttemptIn: delay
    });

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // 关闭现有连接池
      if (this.pool) {
        await this.pool.end();
      }

      // 重新初始化
      await this.initialize();

      Logger.info('数据库重连成功', {
        attempts: this.reconnectAttempts
      });

    } catch (error) {
      Logger.error(`数据库重连失败 (尝试 ${this.reconnectAttempts})`, error);

      if (this.reconnectAttempts < this.config.retryAttempts) {
        return this.reconnect();
      } else {
        throw error;
      }
    }
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.testConnection();
        Logger.debug('数据库健康检查通过');
      } catch (error) {
        Logger.error('数据库健康检查失败', error);
        this.isConnected = false;
        await this.handleConnectionError(error);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * 处理连接错误
   */
  async handleConnectionError(error) {
    this.isConnected = false;

    Logger.error('数据库连接错误', error, {
      reconnectAttempts: this.reconnectAttempts,
      maxRetryAttempts: this.config.retryAttempts
    });

    // 如果还有重试机会，启动重连
    if (this.reconnectAttempts < this.config.retryAttempts) {
      setTimeout(() => {
        this.reconnect().catch(err => {
          Logger.error('自动重连失败', err);
        });
      }, this.config.retryDelay);
    }
  }

  /**
   * 判断是否为连接错误
   */
  isConnectionError(error) {
    const connectionErrorCodes = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'EPIPE'
    ];

    return connectionErrorCodes.includes(error.code) ||
      error.message.includes('connection') ||
      error.message.includes('timeout');
  }

  /**
   * 获取连接池状态
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      pool: this.pool ? {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      } : null,
      stats: {
        ...this.connectionStats,
        uptime: Date.now() - this.connectionStats.uptime
      },
      config: {
        max: this.config.max,
        min: this.config.min,
        host: this.config.host,
        database: this.config.database
      }
    };
  }

  /**
   * 关闭连接池
   */
  async close() {
    Logger.info('关闭数据库连接池');

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    this.isConnected = false;
    Logger.info('数据库连接池已关闭');
  }
}

module.exports = DatabaseConnectionManager;
