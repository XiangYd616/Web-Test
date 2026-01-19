/**
 * 测试数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

import { query } from '../config/database';

interface TestRecord {
  test_id: string;
  user_id: string;
  url: string;
  test_type: string;
  status: string;
  results?: any;
  overall_score?: number;
  duration?: number;
  created_at: Date;
  updated_at: Date;
}

interface TestCreateData {
  userId: string;
  url: string;
  testType: string;
  options?: Record<string, unknown>;
  status: string;
  createdAt: Date;
}

class TestRepository {
  /**
   * 根据ID查找测试
   */
  async findById(testId: string, userId: string): Promise<TestRecord | null> {
    const result = await query('SELECT * FROM test_history WHERE test_id = $1 AND user_id = $2', [
      testId,
      userId,
    ]);
    return result.rows[0] || null;
  }

  /**
   * 获取测试结果
   */
  async findResults(testId: string, userId: string): Promise<TestRecord | null> {
    const result = await query(
      'SELECT results, status, overall_score, duration FROM test_history WHERE test_id = $1 AND user_id = $2',
      [testId, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * 检查所有权
   */
  async checkOwnership(testId: string, userId: string): Promise<boolean> {
    const result = await query('SELECT 1 FROM test_history WHERE test_id = $1 AND user_id = $2', [
      testId,
      userId,
    ]);
    return result.rows.length > 0;
  }

  /**
   * 创建测试记录
   */
  async create(data: TestCreateData): Promise<{ id: string }> {
    const result = await query(
      `INSERT INTO test_history (user_id, url, test_type, status, options, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING test_id`,
      [
        data.userId,
        data.url,
        data.testType,
        data.status,
        JSON.stringify(data.options || {}),
        data.createdAt,
      ]
    );
    return { id: result.rows[0].test_id };
  }

  /**
   * 更新测试状态
   */
  async updateStatus(testId: string, status: string): Promise<void> {
    await query('UPDATE test_history SET status = $1, updated_at = NOW() WHERE test_id = $2', [
      status,
      testId,
    ]);
  }

  /**
   * 更新测试结果
   */
  async updateResults(
    testId: string,
    results: any,
    overallScore: number,
    duration: number
  ): Promise<void> {
    await query(
      `UPDATE test_history 
       SET results = $1, overall_score = $2, duration = $3, status = 'completed', updated_at = NOW() 
       WHERE test_id = $4`,
      [JSON.stringify(results), overallScore, duration, testId]
    );
  }

  /**
   * 删除测试
   */
  async delete(testId: string): Promise<void> {
    await query('DELETE FROM test_history WHERE test_id = $1', [testId]);
  }

  /**
   * 根据用户ID获取测试列表
   */
  async findByUserId(userId: string, limit: number, offset: number): Promise<TestRecord[]> {
    const result = await query(
      `SELECT * FROM test_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  /**
   * 统计用户测试数量
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM test_history WHERE user_id = $1', [
      userId,
    ]);
    return parseInt(result.rows[0].count);
  }

  /**
   * 获取用户测试统计
   */
  async getUserStats(userId: string): Promise<{
    totalTests: number;
    completedTests: number;
    failedTests: number;
    averageScore: number;
  }> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
        COALESCE(AVG(overall_score), 0) as average_score
       FROM test_history 
       WHERE user_id = $1`,
      [userId]
    );

    const stats = result.rows[0];
    return {
      totalTests: parseInt(stats.total_tests),
      completedTests: parseInt(stats.completed_tests),
      failedTests: parseInt(stats.failed_tests),
      averageScore: parseFloat(stats.average_score),
    };
  }

  /**
   * 获取最近的测试
   */
  async getRecentTests(userId: string, limit = 5): Promise<TestRecord[]> {
    const result = await query(
      `SELECT * FROM test_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(
    userId: string,
    testType?: string,
    limit = 20,
    offset = 0
  ): Promise<{
    tests: TestRecord[];
    total: number;
  }> {
    let whereClause = 'WHERE user_id = $1';
    const params: (string | number)[] = [userId];

    if (testType) {
      whereClause += ' AND test_type = $2';
      params.push(testType);
    }

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM test_history ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 获取测试列表
    const testsResult = await query(
      `SELECT * FROM test_history 
       ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      tests: testsResult.rows,
      total,
    };
  }
}

export default new TestRepository();
