/**
 * 测试数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

import { query } from '../config/database';

interface TestExecutionRecord {
  id: number;
  test_id: string;
  user_id: string;
  workspace_id?: string | null;
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

interface QueueStatusCount {
  queue_name: string;
  status: string;
  count: number;
}

type QueueStatusCountOptions = {
  userId?: string;
  workspaceId?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
};

interface TestCreateData {
  testId: string;
  userId: string;
  workspaceId?: string;
  engineType: string;
  engineName: string;
  testName: string;
  testUrl?: string;
  testConfig?: Record<string, unknown>;
  status: string;
  createdAt: Date;
}

class TestRepository {
  /**
   * 根据ID查找测试
   */
  async findById(
    testId: string,
    userId: string,
    workspaceId?: string
  ): Promise<TestExecutionRecord | null> {
    const { clause, params } = this.buildScopeClause(userId, workspaceId);
    const result = await query(`SELECT * FROM test_executions WHERE test_id = $1 AND ${clause}`, [
      testId,
      ...params,
    ]);
    return result.rows[0] || null;
  }

  /**
   * 获取队列状态统计（可选按 userId/时间窗/分页）
   */
  async getQueueStatusCounts(
    options: QueueStatusCountOptions
  ): Promise<{ rows: QueueStatusCount[]; total: number }> {
    const { userId, startTime, endTime, limit, offset, workspaceId } =
      options as QueueStatusCountOptions & {
        workspaceId?: string;
      };
    const params: Array<string | number> = [];
    const filters: string[] = [];

    if (workspaceId) {
      params.push(workspaceId);
      filters.push(`workspace_id = $${params.length}`);
    } else if (userId) {
      params.push(userId);
      filters.push(`user_id = $${params.length}`);
    }
    if (startTime) {
      params.push(startTime);
      filters.push(`created_at >= $${params.length}`);
    }
    if (endTime) {
      params.push(endTime);
      filters.push(`created_at <= $${params.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    let pageClause = '';
    if (typeof limit === 'number') {
      params.push(limit);
      pageClause += ` LIMIT $${params.length}`;
    }
    if (typeof offset === 'number') {
      params.push(offset);
      pageClause += ` OFFSET $${params.length}`;
    }

    const result = await query(
      `WITH filtered AS (
         SELECT engine_type, status, created_at
         FROM test_executions
         ${whereClause}
         ORDER BY created_at DESC${pageClause}
       )
       SELECT
         CASE
           WHEN engine_type IN ('stress', 'performance') THEN 'test-execution-heavy'
           WHEN engine_type = 'security' THEN 'test-execution-security'
           ELSE 'test-execution'
         END AS queue_name,
         status,
         COUNT(1)::int AS count
       FROM filtered
       GROUP BY queue_name, status`,
      params
    );
    const countResult = await query(
      `SELECT COUNT(1)::int AS total
       FROM test_executions
       ${whereClause}`,
      params.slice(0, filters.length)
    );
    const total = Number(countResult.rows[0]?.total || 0);

    return {
      rows: result.rows as QueueStatusCount[],
      total,
    };
  }

  /**
   * 检查所有权
   */
  async checkOwnership(testId: string, userId: string, workspaceId?: string): Promise<boolean> {
    const { clause, params } = this.buildScopeClause(userId, workspaceId);
    const result = await query(`SELECT 1 FROM test_executions WHERE test_id = $1 AND ${clause}`, [
      testId,
      ...params,
    ]);
    return result.rows.length > 0;
  }

  /**
   * 创建测试记录
   */
  async create(data: TestCreateData): Promise<{ id: number; testId: string }> {
    const result = await query(
      `INSERT INTO test_executions (
         test_id, user_id, workspace_id, engine_type, engine_name, test_name, test_url, test_config,
         status, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, test_id`,
      [
        data.testId,
        data.userId,
        data.workspaceId ?? null,
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
    offset: number,
    workspaceId?: string
  ): Promise<TestExecutionRecord[]> {
    const { clause, params } = this.buildScopeClause(userId, workspaceId);
    const result = await query(
      `SELECT * FROM test_executions
       WHERE ${clause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return result.rows;
  }

  /**
   * 统计用户测试数量
   */
  async countByUserId(userId: string, workspaceId?: string): Promise<number> {
    const { clause, params } = this.buildScopeClause(userId, workspaceId);
    const result = await query(
      `SELECT COUNT(*) as count FROM test_executions WHERE ${clause}`,
      params
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * 获取用户测试统计
   */
  async getUserStats(
    userId: string,
    workspaceId?: string
  ): Promise<{
    totalTests: number;
    completedTests: number;
    failedTests: number;
    averageScore: number;
  }> {
    const { clause, params } = this.buildScopeClause(userId, workspaceId);
    const result = await query(
      `SELECT 
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests
       FROM test_executions 
       WHERE ${clause}`,
      params
    );

    const scoreResult = await query(
      `SELECT COALESCE(AVG(tr.score), 0) as average_score
       FROM test_results tr
       INNER JOIN test_executions te ON te.id = tr.execution_id
       WHERE ${clause}`,
      params
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
  async getRecentTests(
    userId: string,
    limit = 5,
    workspaceId?: string
  ): Promise<TestExecutionRecord[]> {
    const { clause, params } = this.buildScopeClause(userId, workspaceId);
    const result = await query(
      `SELECT * FROM test_executions 
       WHERE ${clause} 
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );
    return result.rows;
  }

  private buildScopeClause(
    userId: string,
    workspaceId?: string
  ): { clause: string; params: (string | number)[] } {
    if (workspaceId) {
      return { clause: 'workspace_id = $1', params: [workspaceId] };
    }
    return { clause: 'user_id = $1', params: [userId] };
  }

  private buildScopedClause(params: Array<string | number>, userId: string, workspaceId?: string) {
    if (workspaceId) {
      params.push(workspaceId);
      return `workspace_id = $${params.length}`;
    }
    params.push(userId);
    return `user_id = $${params.length}`;
  }
}

export default new TestRepository();
