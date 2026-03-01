import { query } from '../../config/database';

type UatFeedbackCreateData = {
  sessionId: string;
  userId?: string | null;
  workspaceId?: string | null;
  testType: string;
  actions: Record<string, unknown>[];
  ratings: Record<string, number>;
  issues: string[];
  comments?: string | null;
  completed: boolean;
  startedAt?: Date | null;
  submittedAt?: Date | null;
  metadata?: Record<string, unknown>;
};

type UatFeedbackRecord = {
  id: string;
  session_id: string;
  user_id: string | null;
  workspace_id: string | null;
  test_type: string;
  actions: Record<string, unknown>[];
  ratings: Record<string, number>;
  issues: string[];
  comments: string | null;
  completed: boolean;
  started_at: Date | null;
  submitted_at: Date | null;
  metadata: Record<string, unknown>;
  created_at: Date;
};

const uatFeedbackRepository = {
  async create(data: UatFeedbackCreateData): Promise<UatFeedbackRecord> {
    const result = await query(
      `INSERT INTO uat_feedbacks (
         session_id,
         user_id,
         workspace_id,
         test_type,
         actions,
         ratings,
         issues,
         comments,
         completed,
         started_at,
         submitted_at,
         metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.sessionId,
        data.userId ?? null,
        data.workspaceId ?? null,
        data.testType,
        JSON.stringify(data.actions || []),
        JSON.stringify(data.ratings || {}),
        JSON.stringify(data.issues || []),
        data.comments ?? null,
        data.completed,
        data.startedAt ?? null,
        data.submittedAt ?? null,
        JSON.stringify(data.metadata || {}),
      ]
    );
    return result.rows[0] as UatFeedbackRecord;
  },

  async findBySessionId(sessionId: string): Promise<UatFeedbackRecord | null> {
    const result = await query(`SELECT * FROM uat_feedbacks WHERE session_id = $1`, [sessionId]);
    return (result.rows[0] as UatFeedbackRecord) || null;
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await query(`DELETE FROM uat_feedbacks WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async findById(id: string): Promise<UatFeedbackRecord | null> {
    const result = await query(`SELECT * FROM uat_feedbacks WHERE id = $1`, [id]);
    return (result.rows[0] as UatFeedbackRecord) || null;
  },

  async list(params: {
    userId: string;
    workspaceId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: UatFeedbackRecord[]; total: number }> {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const values: Array<string | number> = [params.userId, limit, offset];
    const workspaceClause = params.workspaceId ? 'AND workspace_id = $4' : '';
    if (params.workspaceId) {
      values.push(params.workspaceId);
    }

    const listResult = await query(
      `SELECT *
       FROM uat_feedbacks
       WHERE user_id = $1 ${workspaceClause}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      values
    );

    const countValues = params.workspaceId ? [params.userId, params.workspaceId] : [params.userId];
    const countResult = await query(
      `SELECT COUNT(*) AS total
       FROM uat_feedbacks
       WHERE user_id = $1 ${workspaceClause.replace('$4', '$2')}`,
      countValues
    );

    return {
      items: listResult.rows as UatFeedbackRecord[],
      total: Number(countResult.rows[0]?.total || 0),
    };
  },
};

export default uatFeedbackRepository;
export type { UatFeedbackCreateData, UatFeedbackRecord };
