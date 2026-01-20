/**
 * 测试数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

import { query } from '../config/database';

interface TestExecutionRecord {
  id: number;
  test_id: string;
  user_id: string;
  engine_type: string;
  engine_name: string;
  test_name: string;
  test_url?: string;
  test_config?: Record<string, unknown>;
  status: string;
  progress?: number;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
  execution_time?: number;
  error_message?: string;
}

interface TestResultRecord {
  id: number;
  execution_id: number;
  summary: Record<string, unknown>;
  score?: number;
  grade?: string;
  passed?: boolean;
  warnings?: unknown[];
  errors?: unknown[];
  created_at: Date;
}

interface TestCreateData {
  testId: string;
  userId: string;
  engineType: string;
  engineName: string;
  testName: string;
  testUrl?: string;
  testConfig?: Record<string, unknown>;
  status: string;
  createdAt: Date;
}

interface TestMetricCreateData {
  resultId: number;
  metricName: string;
  metricValue: Record<string, unknown> | number | string;
  metricUnit?: string;
  metricType?: string;
  thresholdMin?: number;
  thresholdMax?: number;
  passed?: boolean;
  severity?: string;
  recommendation?: string;
}

class TestRepository {
  /**
   * 根据ID查找测试
   */
  async findById(testId: string, userId: string): Promise<TestExecutionRecord | null> {
    const result = await query(
      'SELECT * FROM test_executions WHERE test_id = $1 AND user_id = $2',
      [testId, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * 获取测试结果
   */
  async findResults(testId: string, userId: string): Promise<TestResultRecord | null> {
    const result = await query(
      `SELECT tr.*
       FROM test_results tr
       INNER JOIN test_executions te ON te.id = tr.execution_id
       WHERE te.test_id = $1 AND te.user_id = $2
       ORDER BY tr.created_at DESC
       LIMIT 1`,
      [testId, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * 检查所有权
   */
  async checkOwnership(testId: string, userId: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM test_executions WHERE test_id = $1 AND user_id = $2',
      [testId, userId]
    );
    return result.rows.length > 0;
  }

  /**
   * 创建测试记录
   */
  async create(data: TestCreateData): Promise<{ id: number; testId: string }> {
    const result = await query(
      `INSERT INTO test_executions (
         test_id, user_id, engine_type, engine_name, test_name, test_url, test_config,
         status, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, test_id`,
      [
        data.testId,
        data.userId,
        data.engineType,
        data.engineName,
        data.testName,
        data.testUrl || null,
        JSON.stringify(data.testConfig || {}),
        data.status,
        data.createdAt,
      ]
    );
    return { id: result.rows[0].id, testId: result.rows[0].test_id };
  }

  /**
   * 更新测试状态
   */
  async updateStatus(testId: string, status: string): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = $1, updated_at = NOW()
       WHERE test_id = $2 AND status IN ('pending', 'running')`,
      [status, testId]
    );
  }

  async updateProgress(testId: string, progress: number): Promise<void> {
    await query(
      `UPDATE test_executions
       SET progress = $1, updated_at = NOW()
       WHERE test_id = $2 AND status = 'running'`,
      [progress, testId]
    );
  }

  async markStarted(testId: string): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = $1, started_at = NOW(), updated_at = NOW()
       WHERE test_id = $2 AND status IN ('pending')`,
      ['running', testId]
    );
  }

  async markCompleted(
    testId: string,
    executionTimeSeconds: number,
    errorMessage?: string
  ): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = $1,
           completed_at = NOW(),
           execution_time = $2,
           error_message = $3,
           updated_at = NOW()
       WHERE test_id = $4 AND status IN ('running', 'pending')`,
      ['completed', executionTimeSeconds, errorMessage || null, testId]
    );
  }

  async markFailed(testId: string, errorMessage: string): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = $1,
           error_message = $2,
           updated_at = NOW()
       WHERE test_id = $3 AND status IN ('running', 'pending')`,
      ['failed', errorMessage, testId]
    );
  }

  /**
   * 更新测试结果
   */
  async saveResult(
    executionId: number,
    summary: Record<string, unknown>,
    score?: number,
    grade?: string,
    passed?: boolean,
    warnings?: unknown[],
    errors?: unknown[]
  ): Promise<number> {
    const result = await query(
      `INSERT INTO test_results (
         execution_id, summary, score, grade, passed, warnings, errors
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        executionId,
        JSON.stringify(summary),
        score ?? null,
        grade ?? null,
        passed ?? null,
        JSON.stringify(warnings || []),
        JSON.stringify(errors || []),
      ]
    );
    return result.rows[0].id;
  }

  async saveMetrics(metrics: TestMetricCreateData[]): Promise<void> {
    if (metrics.length === 0) {
      return;
    }

    const values: unknown[] = [];
    const placeholders = metrics
      .map((metric, index) => {
        const baseIndex = index * 9;
        values.push(
          metric.resultId,
          metric.metricName,
          JSON.stringify(metric.metricValue),
          metric.metricUnit || null,
          metric.metricType || null,
          metric.thresholdMin ?? null,
          metric.thresholdMax ?? null,
          metric.passed ?? null,
          metric.severity || null
        );
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9})`;
      })
      .join(', ');

    await query(
      `INSERT INTO test_metrics (
         result_id, metric_name, metric_value, metric_unit, metric_type,
         threshold_min, threshold_max, passed, severity
       ) VALUES ${placeholders}`,
      values
    );
  }

  /**
   * 删除测试
   */
  async delete(testId: string): Promise<void> {
    await query('DELETE FROM test_executions WHERE test_id = $1', [testId]);
  }

  /**
   * 根据用户ID获取测试列表
   */
  async findByUserId(
    userId: string,
    limit: number,
    offset: number
  ): Promise<TestExecutionRecord[]> {
    const result = await query(
      `SELECT * FROM test_executions
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
    const result = await query('SELECT COUNT(*) as count FROM test_executions WHERE user_id = $1', [
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
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests
       FROM test_executions 
       WHERE user_id = $1`,
      [userId]
    );

    const scoreResult = await query(
      `SELECT COALESCE(AVG(tr.score), 0) as average_score
       FROM test_results tr
       INNER JOIN test_executions te ON te.id = tr.execution_id
       WHERE te.user_id = $1`,
      [userId]
    );

    const stats = result.rows[0];
    return {
      totalTests: parseInt(stats.total_tests),
      completedTests: parseInt(stats.completed_tests),
      failedTests: parseInt(stats.failed_tests),
      averageScore: parseFloat(scoreResult.rows[0].average_score),
    };
  }

  /**
   * 获取最近的测试
   */
  async getRecentTests(userId: string, limit = 5): Promise<TestExecutionRecord[]> {
    const result = await query(
      `SELECT * FROM test_executions 
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
    tests: TestExecutionRecord[];
    total: number;
  }> {
    let whereClause = 'WHERE user_id = $1';
    const params: (string | number)[] = [userId];

    if (testType) {
      whereClause += ' AND engine_type = $2';
      params.push(testType);
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM test_executions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const testsResult = await query(
      `SELECT * FROM test_executions 
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
