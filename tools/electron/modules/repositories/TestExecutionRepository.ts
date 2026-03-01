/**
 * TestExecutionRepository — 测试执行记录仓储
 */

import { generateId } from '../localDbAdapter';
import { BaseRepository } from './BaseRepository';

export interface TestExecutionRow {
  [key: string]: unknown;
  id: string;
  test_id: string;
  user_id?: string;
  engine_type: string;
  engine_name: string;
  test_name: string;
  test_url?: string;
  test_config?: string;
  status: string;
  progress: number;
  results?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  execution_time?: number;
  score?: number;
}

export class TestExecutionRepository extends BaseRepository<TestExecutionRow> {
  protected readonly tableName = 'test_executions';

  async findByTestId(testId: string): Promise<TestExecutionRow | null> {
    const { rows } = await this.rawQuery(
      `SELECT * FROM test_executions WHERE test_id = ? LIMIT 1`,
      [testId]
    );
    return (rows[0] as TestExecutionRow) || null;
  }

  async findByUser(
    userId: string,
    options?: { engineType?: string; status?: string; limit?: number; offset?: number }
  ): Promise<TestExecutionRow[]> {
    const conditions = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (options?.engineType) {
      conditions.push('engine_type = ?');
      params.push(options.engineType);
    }
    if (options?.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }

    return this.findAll({
      where: conditions.join(' AND '),
      params,
      orderBy: 'created_at DESC',
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  async createExecution(data: {
    user_id?: string;
    engine_type: string;
    engine_name: string;
    test_name: string;
    test_url?: string;
    test_config?: Record<string, unknown>;
  }): Promise<TestExecutionRow> {
    const id = generateId();
    const testId = generateId();
    const now = new Date().toISOString();

    await this.rawQuery(
      `INSERT INTO test_executions (id, test_id, user_id, engine_type, engine_name, test_name, test_url, test_config, status, progress, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
      [
        id,
        testId,
        data.user_id || null,
        data.engine_type,
        data.engine_name,
        data.test_name,
        data.test_url || null,
        data.test_config ? JSON.stringify(data.test_config) : null,
        now,
        now,
      ]
    );

    const result = await this.findById(id);
    if (!result) throw new Error(`测试执行记录创建失败: ${id}`);
    return result;
  }

  async updateStatus(
    testId: string,
    status: string,
    extra?: { progress?: number; results?: string; error_message?: string; score?: number }
  ): Promise<void> {
    const sets = ['status = ?', 'updated_at = ?'];
    const params: unknown[] = [status, new Date().toISOString()];

    if (extra?.progress !== undefined) {
      sets.push('progress = ?');
      params.push(extra.progress);
    }
    if (extra?.results !== undefined) {
      sets.push('results = ?');
      params.push(extra.results);
    }
    if (extra?.error_message !== undefined) {
      sets.push('error_message = ?');
      params.push(extra.error_message);
    }
    if (extra?.score !== undefined) {
      sets.push('score = ?');
      params.push(extra.score);
    }
    if (status === 'running') {
      sets.push('started_at = ?');
      params.push(new Date().toISOString());
    }
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      sets.push('completed_at = ?');
      params.push(new Date().toISOString());
    }

    params.push(testId);
    await this.rawQuery(`UPDATE test_executions SET ${sets.join(', ')} WHERE test_id = ?`, params);
  }

  async getHistory(options?: {
    userId?: string;
    engineType?: string;
    url?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: TestExecutionRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options?.userId) {
      conditions.push('user_id = ?');
      params.push(options.userId);
    }
    if (options?.engineType) {
      conditions.push('engine_type = ?');
      params.push(options.engineType);
    }
    if (options?.url) {
      conditions.push('test_url = ?');
      params.push(options.url);
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : undefined;
    const countParams = [...params];

    const total = await this.count(where, countParams);
    const rows = await this.findAll({
      where,
      params,
      orderBy: 'created_at DESC',
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    });

    return { rows, total };
  }

  async deleteByTestId(testId: string): Promise<void> {
    await this.rawQuery('DELETE FROM test_logs WHERE test_id = ?', [testId]);
    await this.rawQuery('DELETE FROM test_operations WHERE test_id = ?', [testId]);
    await this.rawQuery('DELETE FROM test_executions WHERE test_id = ?', [testId]);
  }
}
