/**
 * 测试数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

const { query } = require('../config/database');

class TestRepository {
  /**
   * 根据ID查找测试
   */
  async findById(testId, userId) {
    const result = await query(
      'SELECT * FROM test_history WHERE test_id = $1 AND user_id = $2',
      [testId, userId]
    );
    return result.rows[0];
  }

  /**
   * 获取测试结果
   */
  async findResults(testId, userId) {
    const result = await query(
      'SELECT results, status, overall_score, duration FROM test_history WHERE test_id = $1 AND user_id = $2',
      [testId, userId]
    );
    return result.rows[0];
  }

  /**
   * 获取用户统计
   */
  async getUserStats(userId) {
    const result = await query(
      `SELECT 
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_tests,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_tests,
        AVG(overall_score) as avg_score,
        AVG(duration) as avg_duration
      FROM test_history 
      WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  /**
   * 获取测试历史统计
   */
  async getHistoryStats(userId, timeRange = 30) {
    const result = await query(
      `SELECT 
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
        AVG(overall_score) as average_score
      FROM test_history 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${timeRange} days'`,
      [userId]
    );
    return result.rows[0];
  }

  /**
   * 按日期分组统计
   */
  async getDailyStats(userId, days = 7) {
    const result = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        AVG(overall_score) as avg_score
      FROM test_history 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * 按测试类型分组统计
   */
  async getTypeStats(userId) {
    const result = await query(
      `SELECT 
        test_type,
        COUNT(*) as count,
        AVG(overall_score) as avg_score
      FROM test_history 
      WHERE user_id = $1
      GROUP BY test_type
      ORDER BY count DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * 更新测试状态
   */
  async updateStatus(testId, userId, status) {
    const result = await query(
      'UPDATE test_history SET status = $1, updated_at = NOW() WHERE test_id = $2 AND user_id = $3 RETURNING *',
      [status, testId, userId]
    );
    return result.rows[0];
  }

  /**
   * 更新测试记录
   */
  async update(testId, userId, updates) {
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      updateFields.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    });

    updateFields.push('updated_at = NOW()');
    params.push(testId, userId);

    const result = await query(
      `UPDATE test_history SET ${updateFields.join(', ')} 
       WHERE test_id = $${paramIndex} AND user_id = $${paramIndex + 1} 
       RETURNING *`,
      params
    );
    return result.rows[0];
  }

  /**
   * 软删除测试
   */
  async softDelete(testId, userId) {
    const result = await query(
      "UPDATE test_history SET status = 'deleted', updated_at = NOW() WHERE test_id = $1 AND user_id = $2 RETURNING test_id",
      [testId, userId]
    );
    return result.rowCount > 0;
  }

  /**
   * 批量删除测试
   */
  async batchDelete(testIds, userId) {
    const result = await query(
      'DELETE FROM test_history WHERE test_id = ANY($1) AND user_id = $2 RETURNING test_id',
      [testIds, userId]
    );
    return result.rows;
  }

  /**
   * 检查测试所有权
   */
  async checkOwnership(testId, userId) {
    const result = await query(
      'SELECT id FROM test_history WHERE test_id = $1 AND user_id = $2',
      [testId, userId]
    );
    return result.rows.length > 0;
  }

  /**
   * 获取运行中的测试
   */
  async getRunningTests(userId) {
    const result = await query(
      `SELECT id, test_id, test_type, status, created_at 
       FROM test_history 
       WHERE user_id = $1 AND status IN ('pending', 'running')
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * 获取测试历史列表
   */
  async getHistory(userId, options = {}) {
    const { page = 1, limit = 20, testType, status } = options;
    const offset = (page - 1) * limit;
    
    const conditions = ['user_id = $1'];
    const params = [userId];
    let paramIndex = 2;

    if (testType) {
      conditions.push(`test_type = $${paramIndex}`);
      params.push(testType);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
      `SELECT * FROM test_history 
       WHERE ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM test_history WHERE ${whereClause}`,
      params
    );

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
    };
  }
}

module.exports = new TestRepository();
