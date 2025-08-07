/**
 * 数据库连接管理器
 * 本地化程度：100%
 * 提供连接池优化、自动重连、健康检查等功能
 */

const { Pool } = require('pg');
const Logger = require('./logger');

class DatabaseConnectionManager {
  constructor(config = {}) {
    this.config = {
      // 连接池配置
      max: config.max || 20,                    // 最大连接数
      min: config.min || 2,                     // 最小连接数
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,  // 空闲超时
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,  // 连接超时
      
      // 重连配置
      retryAttempts: config.retryAttempts || 5,
      retryDelay: config.retryDelay || 1000,
      maxRetryDelay: config.maxRetryDelay || 30000,
      
      // 健康检查配置
      healthCheckInterval: config.healthCheckInterval || 30000,
      healthCheckQuery: config.healthCheckQuery || 'SELECT 1',
      
      // 数据库配置
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'testweb',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      
      // SSL配置
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };

    this.pool = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.healthCheckTimer = null;
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      errorCount: 0,
      lastError: null,
      uptime: Date.now()
    };
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
