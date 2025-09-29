/**
 * 数据库操作服务
 * 提供完整的数据库CRUD操作 - PostgreSQL版本
 */

const { Pool } = require('pg');
const config = require('../../config/database');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.init();
  }

  /**
   * 初始化数据库连接池
   */
  async init() {
    try {
      this.pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user || config.username,
        password: config.password,
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });

      // 测试连接
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log('✅ 数据库服务连接成功');
      await this.createTables();
    } catch (error) {
      console.error('❌ 数据库服务连接失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据表 - PostgreSQL版本
   */
  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS test_results (
        id SERIAL PRIMARY KEY,
        test_id VARCHAR(36) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        url TEXT NOT NULL,
        status VARCHAR(20) NOT NULL,
        score INTEGER,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS test_history (
        id SERIAL PRIMARY KEY,
        test_id VARCHAR(36) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        preferences JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.query(table);
    }

    // 创建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_type ON test_results(type)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status)',
      'CREATE INDEX IF NOT EXISTS idx_test_history_test_id ON test_history(test_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)'
    ];

    for (const index of indexes) {
      await this.query(index);
    }
  }

  /**
   * 保存测试结果
   */
  async saveTestResult(testResult) {
    const sql = `INSERT INTO test_results
                (test_id, type, url, status, score, data, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                ON CONFLICT (test_id)
                DO UPDATE SET
                  type = EXCLUDED.type,
                  url = EXCLUDED.url,
                  status = EXCLUDED.status,
                  score = EXCLUDED.score,
                  data = EXCLUDED.data,
                  updated_at = CURRENT_TIMESTAMP`;

    const params = [
      testResult.testId,
      testResult.type,
      testResult.url,
      testResult.status,
      testResult.score,
      testResult
    ];

    return this.query(sql, params);
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId) {
    const sql = 'SELECT * FROM test_results WHERE test_id = $1';
    const result = await this.query(sql, [testId]);

    return result.rows[0] || null;
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(limit = 50, offset = 0) {
    const sql = `SELECT * FROM test_results
                 ORDER BY created_at DESC
                 LIMIT $1 OFFSET $2`;

    const result = await this.query(sql, [limit, offset]);
    return result.rows;
  }

  /**
   * 删除测试结果
   */
  async deleteTestResult(testId) {
    const sql = 'DELETE FROM test_results WHERE test_id = $1';
    return this.query(sql, [testId]);
  }

  /**
   * 记录测试历史
   */
  async recordTestHistory(testId, action, details = null) {
    const sql = `INSERT INTO test_history (test_id, action, details)
                 VALUES ($1, $2, $3)`;

    return this.query(sql, [testId, action, details]);
  }

  /**
   * 保存用户偏好
   */
  async saveUserPreferences(userId, preferences) {
    const sql = `INSERT INTO user_preferences (user_id, preferences, updated_at)
                 VALUES ($1, $2, CURRENT_TIMESTAMP)
                 ON CONFLICT (user_id)
                 DO UPDATE SET
                   preferences = EXCLUDED.preferences,
                   updated_at = CURRENT_TIMESTAMP`;

    return this.query(sql, [userId, preferences]);
  }

  /**
   * 获取用户偏好
   */
  async getUserPreferences(userId) {
    const sql = 'SELECT * FROM user_preferences WHERE user_id = $1';
    const result = await this.query(sql, [userId]);
    return result.rows[0] || null;
  }

  /**
   * 数据库操作封装 - PostgreSQL版本
   */
  async query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result;
    } catch (error) {
      console.error('数据库查询错误:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取连接池状态
   */
  getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        pool: this.getPoolStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 关闭数据库连接池
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ 数据库连接池已关闭');
    }
  }
}

module.exports = DatabaseService;