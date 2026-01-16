/**
 * DatabaseService - 兼容 TestManagementService 的数据库封装
 * 基于 config/database 的连接池实现
 */

const {
  connectDB,
  query,
  closeConnection,
  healthCheck,
  getPool,
  getDatabaseConfig
} = require('../../config/database');

class DatabaseService {
  constructor(config = null) {
    this.config = config;
    this.pool = null;
  }

  async initialize() {
    this.pool = await connectDB();
    return this.pool;
  }

  async query(sql, params = []) {
    return query(sql, params);
  }

  async close() {
    await closeConnection();
  }

  async healthCheck() {
    return healthCheck();
  }

  getPoolStatus() {
    const pool = getPool();
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  }

  getConfig() {
    return this.config || getDatabaseConfig();
  }

  async getTestHistory(filters = {}) {
    const {
      page = 1,
      limit = 20,
      testType,
      status,
      userId,
      startDate,
      endDate
    } = filters;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (userId) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex += 1;
    }

    if (testType) {
      conditions.push(`engine_type = $${paramIndex}`);
      params.push(testType);
      paramIndex += 1;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex += 1;
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex += 1;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT
        th.*,
        COUNT(*) OVER() as total_count
      FROM test_history th
      ${whereClause}
      ORDER BY th.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit, 10), offset);

    const result = await this.query(queryText, params);
    const total = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count, 10) : 0;

    return {
      data: {
        tests: result.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10)) || 0
        }
      }
    };
  }

  async getTestStatus(testId, userId = null) {
    const params = [testId];
    let whereClause = 'test_id = $1';

    if (userId) {
      whereClause += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await this.query(
      `SELECT test_id, engine_type, status, progress, result, errors, created_at, started_at, completed_at
       FROM test_history
       WHERE ${whereClause}`,
      params
    );

    return result.rows[0] || null;
  }

  async getTestResult(testId, userId = null) {
    const params = [testId];
    let whereClause = 'test_id = $1';

    if (userId) {
      whereClause += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await this.query(
      `SELECT test_id, status, result, score, grade, passed, errors, created_at, completed_at
       FROM test_history
       WHERE ${whereClause}`,
      params
    );

    return result.rows[0] || null;
  }

  async updateTestStatus(testId, status, progress = null, errorMessage = null) {
    const updates = ['status = $2'];
    const params = [testId, status];
    let paramIndex = 3;

    if (progress !== null) {
      updates.push(`progress = $${paramIndex}`);
      params.push(progress);
      paramIndex += 1;
    }

    if (errorMessage) {
      updates.push(`errors = $${paramIndex}`);
      params.push(JSON.stringify([{ message: errorMessage, timestamp: new Date() }]));
      paramIndex += 1;
    }

    if (status === 'running') {
      updates.push('started_at = NOW()');
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'stopped') {
      updates.push('completed_at = NOW()');
    }

    const queryText = `UPDATE test_history SET ${updates.join(', ')} WHERE test_id = $1 RETURNING *`;
    const result = await this.query(queryText, params);
    return result.rows[0];
  }

  async getConfigTemplates(testType) {
    const params = [];
    let whereClause = '';

    if (testType) {
      params.push(testType);
      whereClause = 'WHERE engine_type = $1';
    }

    const result = await this.query(
      `SELECT * FROM test_templates ${whereClause} ORDER BY created_at DESC`,
      params
    );

    return result.rows;
  }

  async saveConfigTemplate({ name, testType, config, description, userId }) {
    const result = await this.query(
      `INSERT INTO test_templates (user_id, engine_type, template_name, description, config, is_public, is_default)
       VALUES ($1, $2, $3, $4, $5, false, false)
       RETURNING *`,
      [userId || null, testType, name, description || '', JSON.stringify(config)]
    );

    return result.rows[0];
  }
}

module.exports = DatabaseService;
