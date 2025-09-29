/**
 * 增强的数据库管理器
 * 提供连接池优化、事务管理、查询优化等功能
 */

const { Sequelize } = require('sequelize');
const { EventEmitter } = require('events');

class DatabaseManager extends EventEmitter {
  constructor() {
    super();
    this.sequelize = null;
    this.models = {};
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.connectionTimeout = 30000;
    this.retryDelay = 5000;
    
    // 连接池配置
    this.poolConfig = {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
      evict: parseInt(process.env.DB_POOL_EVICT) || 1000,
      handleDisconnects: true,
      validate: true
    };
    
    // 查询监控
    this.queryStats = {
      total: 0,
      slow: 0,
      errors: 0,
      avgDuration: 0,
      slowQueries: []
    };
    
    this.slowQueryThreshold = 1000; // 1秒
  }

  /**
   * 初始化数据库连接
   */
  async initialize(config) {
    try {
      console.log('🔄 正在初始化数据库连接...');
      
      this.sequelize = new Sequelize(
        config.database,
        config.username || config.user,
        config.password,
        {
          host: config.host,
          dialect: config.dialect || 'postgres',
          port: config.port || 5432,
          logging: this.createQueryLogger(),
          pool: this.poolConfig,
          define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
          },
          dialectOptions: {
            ...config.dialectOptions,
            statement_timeout: 30000,
            idle_in_transaction_session_timeout: 30000
          },
          hooks: {
            beforeConnect: (config) => {
              console.log('🔗 正在建立数据库连接...');
            },
            afterConnect: (connection, config) => {
              console.log('✅ 数据库连接建立成功');
            },
            beforeDisconnect: (connection) => {
              console.log('⚠️ 数据库连接即将断开');
            },
            afterDisconnect: (connection) => {
              console.log('❌ 数据库连接已断开');
              this.isConnected = false;
              this.emit('disconnect');
            }
          }
        }
      );
      
      // 设置事件监听器
      this.setupEventListeners();
      
      // 尝试连接
      await this.connect();
      
      // 初始化模型
      this.initializeModels();
      
      // 启动健康检查
      this.startHealthCheck();
      
      console.log('✅ 数据库管理器初始化完成');
      return true;
      
    } catch (error) {
      console.error('❌ 数据库管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 建立数据库连接（带重试机制）
   */
  async connect() {
    while (this.connectionAttempts < this.maxConnectionAttempts) {
      try {
        this.connectionAttempts++;
        console.log(`🔄 尝试连接数据库 (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
        
        await this.sequelize.authenticate();
        this.isConnected = true;
        this.connectionAttempts = 0;
        
        console.log('✅ 数据库连接成功');
        this.emit('connected');
        return true;
        
      } catch (error) {
        console.error(`❌ 数据库连接失败 (尝试 ${this.connectionAttempts}):`, error.message);
        
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
          console.error('❌ 达到最大连接尝试次数，连接失败');
          this.emit('connectionFailed', error);
          throw error;
        }
        
        console.log(`⏳ ${this.retryDelay}ms 后重试...`);
        await this.sleep(this.retryDelay);
      }
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听连接池事件
    this.sequelize.connectionManager.pool.on('acquire', (connection) => {
      console.log('📊 连接池：获取连接', connection.threadId || connection.processID);
    });
    
    this.sequelize.connectionManager.pool.on('release', (connection) => {
      console.log('📊 连接池：释放连接', connection.threadId || connection.processID);
    });
    
    this.sequelize.connectionManager.pool.on('remove', (connection) => {
      console.log('📊 连接池：移除连接', connection.threadId || connection.processID);
    });
    
    // 监听错误
    this.sequelize.connectionManager.pool.on('error', (error) => {
      console.error('❌ 连接池错误:', error);
      this.emit('poolError', error);
    });
  }

  /**
   * 创建查询日志记录器
   */
  createQueryLogger() {
    return (sql, timing) => {
      this.queryStats.total++;
      
      if (timing) {
        this.queryStats.avgDuration = 
          (this.queryStats.avgDuration * (this.queryStats.total - 1) + timing) / this.queryStats.total;
        
        if (timing > this.slowQueryThreshold) {
          this.queryStats.slow++;
          this.queryStats.slowQueries.push({
            sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
            timing,
            timestamp: new Date()
          });
          
          // 只保留最近50个慢查询
          if (this.queryStats.slowQueries.length > 50) {
            this.queryStats.slowQueries = this.queryStats.slowQueries.slice(-50);
          }
          
          console.warn(`🐌 慢查询检测 (${timing}ms):`, sql.substring(0, 100));
        }
      }
      
      // 开发环境下记录所有查询
      if (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES === 'true') {
        console.log(`📝 SQL [${timing}ms]:`, sql);
      }
    };
  }

  /**
   * 初始化数据模型
   */
  initializeModels() {
    const { models } = require('./sequelize');
    this.models = models;
    console.log('✅ 数据模型初始化完成');
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        console.error('❌ 数据库健康检查失败:', error);
        this.emit('healthCheckFailed', error);
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 执行健康检查
   */
  async healthCheck() {
    try {
      const start = Date.now();
      await this.sequelize.query('SELECT 1');
      const duration = Date.now() - start;
      
      const poolInfo = {
        used: this.sequelize.connectionManager.pool.used,
        waiting: this.sequelize.connectionManager.pool.waiting,
        size: this.sequelize.connectionManager.pool.size
      };
      
      this.emit('healthCheck', {
        status: 'healthy',
        responseTime: duration,
        pool: poolInfo,
        queryStats: this.getQueryStats()
      });
      
      if (duration > 5000) {
        console.warn('⚠️ 数据库响应较慢:', duration + 'ms');
      }
      
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * 获取查询统计信息
   */
  getQueryStats() {
    return {
      ...this.queryStats,
      slowQueries: this.queryStats.slowQueries.slice(-10) // 只返回最近10个
    };
  }

  /**
   * 执行事务
   */
  async transaction(callback, options = {}) {
    const transaction = await this.sequelize.transaction({
      isolationLevel: options.isolationLevel || Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      type: options.type || Sequelize.Transaction.TYPES.DEFERRED,
      ...options
    });

    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      this.queryStats.errors++;
      console.error('❌ 事务回滚:', error);
      throw error;
    }
  }

  /**
   * 批量操作（优化性能）
   */
  async bulkOperation(model, operation, data, options = {}) {
    try {
      const chunkSize = options.chunkSize || 1000;
      const chunks = this.chunkArray(data, chunkSize);
      const results = [];

      for (const chunk of chunks) {
        let result;
        switch (operation) {
          case 'create':
            result = await model.bulkCreate(chunk, {
              validate: true,
              ignoreDuplicates: options.ignoreDuplicates || false,
              updateOnDuplicate: options.updateOnDuplicate,
              ...options
            });
            break;
          case 'update':
            result = await model.bulkUpdate(
              options.values,
              {
                where: options.where,
                ...options
              }
            );
            break;
          case 'delete':
            result = await model.bulkDelete({
              where: options.where,
              ...options
            });
            break;
          default:
            throw new Error(`不支持的批量操作: ${operation}`);
        }
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error(`❌ 批量${operation}操作失败:`, error);
      throw error;
    }
  }

  /**
   * 优化查询（添加缓存、索引建议等）
   */
  async optimizedQuery(sql, options = {}) {
    try {
      const start = Date.now();
      
      // 添加查询超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('查询超时'));
        }, options.timeout || 30000);
      });
      
      const queryPromise = this.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        ...options
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      const duration = Date.now() - start;
      
      // 分析查询性能
      if (duration > this.slowQueryThreshold) {
        await this.analyzeSlowQuery(sql, duration);
      }
      
      return result;
    } catch (error) {
      this.queryStats.errors++;
      console.error('❌ 优化查询失败:', error);
      throw error;
    }
  }

  /**
   * 分析慢查询
   */
  async analyzeSlowQuery(sql, duration) {
    try {
      // 获取查询计划
      const plan = await this.sequelize.query(`EXPLAIN ANALYZE ${sql}`, {
        type: Sequelize.QueryTypes.SELECT
      });
      
      console.log('🔍 慢查询分析:', {
        sql: sql.substring(0, 200),
        duration,
        plan: plan.slice(0, 5) // 只显示前5行
      });
      
      this.emit('slowQuery', { sql, duration, plan });
    } catch (error) {
      console.warn('⚠️ 无法分析查询计划:', error.message);
    }
  }

  /**
   * 获取连接池状态
   */
  getPoolStatus() {
    if (!this.sequelize || !this.sequelize.connectionManager) {
      return null;
    }
    
    const pool = this.sequelize.connectionManager.pool;
    return {
      used: pool.used,
      waiting: pool.waiting,
      size: pool.size,
      max: pool.options.max,
      min: pool.options.min,
      idle: pool.idle,
      pending: pool.pending
    };
  }

  /**
   * 清理过期连接
   */
  async cleanupConnections() {
    try {
      const pool = this.sequelize.connectionManager.pool;
      const idleConnections = pool.idle;
      
      console.log(`🧹 清理空闲连接: ${idleConnections} 个`);
      
      // 强制清理空闲连接
      await pool.destroyAllNow();
      
      this.emit('connectionsCleanedUp', { idleConnections });
    } catch (error) {
      console.error('❌ 连接清理失败:', error);
    }
  }

  /**
   * 优雅关闭数据库连接
   */
  async close() {
    try {
      console.log('🔄 正在关闭数据库连接...');
      
      if (this.sequelize) {
        await this.sequelize.close();
        this.isConnected = false;
        console.log('✅ 数据库连接已关闭');
        this.emit('closed');
      }
    } catch (error) {
      console.error('❌ 关闭数据库连接时出错:', error);
      throw error;
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats() {
    try {
      const [tables, size, connections] = await Promise.all([
        this.sequelize.query(
          "SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats LIMIT 10",
          { type: Sequelize.QueryTypes.SELECT }
        ),
        this.sequelize.query(
          "SELECT pg_size_pretty(pg_database_size(current_database())) as size",
          { type: Sequelize.QueryTypes.SELECT }
        ),
        this.sequelize.query(
          "SELECT count(*) as connection_count FROM pg_stat_activity WHERE datname = current_database()",
          { type: Sequelize.QueryTypes.SELECT }
        )
      ]);

      return {
        queryStats: this.getQueryStats(),
        poolStatus: this.getPoolStatus(),
        tables: tables.slice(0, 10),
        databaseSize: size[0]?.size,
        activeConnections: connections[0]?.connection_count,
        isConnected: this.isConnected
      };
    } catch (error) {
      console.error('❌ 获取数据库统计信息失败:', error);
      return {
        queryStats: this.getQueryStats(),
        poolStatus: this.getPoolStatus(),
        error: error.message,
        isConnected: this.isConnected
      };
    }
  }

  /**
   * 数组分块
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重置查询统计
   */
  resetQueryStats() {
    this.queryStats = {
      total: 0,
      slow: 0,
      errors: 0,
      avgDuration: 0,
      slowQueries: []
    };
  }

  /**
   * 设置慢查询阈值
   */
  setSlowQueryThreshold(threshold) {
    this.slowQueryThreshold = threshold;
    console.log(`📊 慢查询阈值设置为: ${threshold}ms`);
  }
}

module.exports = DatabaseManager;
