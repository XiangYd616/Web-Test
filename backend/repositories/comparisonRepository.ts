/**
 * 测试对比数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

import { query } from '../config/database';

export type ComparisonHistoryRow = {
  id: string;
  comparison_name: string;
  comparison_type: string;
  created_at: Date;
};

export type StoredComparisonRow = {
  id: string;
  comparison_data: Record<string, unknown>;
};

const comparisonRepository = {
  async getComparisonHistory(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ total: number; rows: ComparisonHistoryRow[] }> {
    const countResult = await query(
      'SELECT COUNT(*)::int AS total FROM test_comparisons WHERE user_id = $1',
      [userId]
    );
    const total = Number(countResult.rows?.[0]?.total || 0);

    const listResult = await query(
      `SELECT id, comparison_name, comparison_type, created_at
       FROM test_comparisons
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      total,
      rows: listResult.rows as ComparisonHistoryRow[],
    };
  },

  async insertComparison(payload: {
    userId: string;
    comparisonName: string;
    executionIds: number[];
    comparisonType: string;
    comparisonData: Record<string, unknown>;
  }): Promise<string | null> {
    const result = await query(
      `INSERT INTO test_comparisons
        (user_id, comparison_name, execution_ids, comparison_type, comparison_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        payload.userId,
        payload.comparisonName,
        payload.executionIds,
        payload.comparisonType,
        JSON.stringify(payload.comparisonData),
      ]
    );

    return result.rows?.[0]?.id ? String(result.rows[0].id) : null;
  },

  async getStoredComparison(comparisonId: string): Promise<StoredComparisonRow | null> {
    const result = await query(
      `SELECT id, comparison_data
       FROM test_comparisons
       WHERE id = $1`,
      [comparisonId]
    );
    const row = result.rows?.[0] as StoredComparisonRow | undefined;
    return row ? { id: String(row.id), comparison_data: row.comparison_data } : null;
  },
};

export default comparisonRepository;
