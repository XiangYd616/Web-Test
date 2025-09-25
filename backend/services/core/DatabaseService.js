/**
 * 核心数据库服务
 * 提供统一的数据库操作接口
 */

const dbConfig = require('../../config/database');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  /**
   * 初始化数据库服务
   */
  async initialize() {
    if (this.isInitialized) {
      return this.pool;
    }

    try {
      this.pool = await dbConfig.connectDB();
      this.isInitialized = true;
      console.log('✅ 核心数据库服务初始化完成');
      return this.pool;
    } catch (error) {
      console.error('❌ 核心数据库服务初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取连接池
   */
  getPool() {
    if (!this.isInitialized) {
      throw new Error('数据库服务未初始化');
    }
    return this.pool;
  }

  /**
   * 执行查询
   */
  async query(text, params = []) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return dbConfig.query(text, params);
  }

  /**
   * 执行事务
   */
  async transaction(callback) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return dbConfig.transaction(callback);
  }

  /**
   * 批量插入
   */
  async batchInsert(tableName, columns, values) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return dbConfig.batchInsert(tableName, columns, values);
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      return dbConfig.healthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return dbConfig.getStats();
  }

  /**
   * 测试连接
   */
  async testConnection() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return dbConfig.testConnection();
  }

  /**
   * 关闭连接
   */
  async close() {
    if (this.isInitialized) {
      await dbConfig.closeConnection();
      this.isInitialized = false;
      this.pool = null;
      console.log('✅ 核心数据库服务已关闭');
    }
  }
}

// 导出单例实例
const databaseService = new DatabaseService();

module.exports = DatabaseService;
module.exports.default = databaseService;
module.exports.databaseService = databaseService;
