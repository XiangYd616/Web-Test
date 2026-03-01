import { generateId, query } from '../localDbAdapter';

type TestExecutionRecord = {
  id: string;
  test_id: string;
  user_id?: string | null;
  engine_type: string;
  engine_name: string;
  test_name: string;
  test_url?: string | null;
  test_config?: string | null;
  status: string;
  progress?: number | null;
  results?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  execution_time?: number | null;
  score?: number | null;
};

type TestCreateData = {
  testId: string;
  userId?: string;
  engineType: string;
  engineName: string;
  testName: string;
  testUrl?: string | null;
  testConfig?: Record<string, unknown>;
  status: string;
  createdAt: Date;
};

const localTestRepository = {
  async create(data: TestCreateData): Promise<{ id: string; testId: string }> {
    const id = generateId();
    await query(
      `INSERT INTO test_executions (
         id, test_id, user_id, engine_type, engine_name, test_name, test_url, test_config,
         status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        id,
        data.testId,
        data.userId ?? null,
        data.engineType,
        data.engineName,
        data.testName,
        data.testUrl ?? null,
        JSON.stringify(data.testConfig || {}),
        data.status,
        data.createdAt.toISOString(),
      ]
    );
    return { id, testId: data.testId };
  },

  async findById(testId: string, userId?: string): Promise<TestExecutionRecord | null> {
    const params: Array<string | null> = [testId];
    let where = 'test_id = ?';
    if (userId) {
      params.push(userId);
      where += ' AND user_id = ?';
    }
    const result = await query(`SELECT * FROM test_executions WHERE ${where} LIMIT 1`, params);
    return (result.rows?.[0] as TestExecutionRecord) || null;
  },

  async findByUserId(
    userId: string,
    limit: number,
    offset: number,
    filters?: { testType?: string; keyword?: string }
  ): Promise<TestExecutionRecord[]> {
    const params: Array<string | number> = [userId];
    let where = 'user_id = ?';
    if (filters?.testType) {
      params.push(filters.testType);
      where += ' AND engine_type = ?';
    }
    if (filters?.keyword) {
      const keyword = `%${filters.keyword}%`;
      params.push(keyword, keyword);
      where += ' AND (test_name LIKE ? OR test_url LIKE ?)';
    }
    const result = await query(
      `SELECT * FROM test_executions
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return result.rows as TestExecutionRecord[];
  },

  async countByUserId(
    userId: string,
    filters?: { testType?: string; keyword?: string }
  ): Promise<number> {
    const params: Array<string | number> = [userId];
    let where = 'user_id = ?';
    if (filters?.testType) {
      params.push(filters.testType);
      where += ' AND engine_type = ?';
    }
    if (filters?.keyword) {
      const keyword = `%${filters.keyword}%`;
      params.push(keyword, keyword);
      where += ' AND (test_name LIKE ? OR test_url LIKE ?)';
    }
    const result = await query(
      `SELECT COUNT(*) AS total FROM test_executions WHERE ${where}`,
      params
    );
    return Number(result.rows?.[0]?.total || 0);
  },

  async delete(testId: string): Promise<void> {
    await query('DELETE FROM test_executions WHERE test_id = ?', [testId]);
  },
};

export default localTestRepository;
export type { TestCreateData, TestExecutionRecord };
