/**
 * 定时运行数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

import { query } from '../config/database';
import { toOptionalDate } from '../utils/dateUtils';

export type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  status: string;
};

export type CollectionRow = {
  id: string;
  workspace_id: string;
};

export type EnvironmentRow = {
  id: string;
  workspace_id: string | null;
};

export type ScheduledRunRow = {
  id: string;
  workspace_id: string | null;
  collection_id: string;
  environment_id?: string | null;
  cron_expression: string;
  timezone?: string | null;
  status: string;
  name?: string | null;
  description?: string | null;
  config?: Record<string, unknown>;
  created_by?: string | null;
  last_run_at?: Date | null;
  next_run_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
};

export type ScheduledRunResultRow = {
  id: string;
  scheduled_run_id: string;
  status: string;
  started_at?: Date;
  completed_at?: Date;
  duration?: number;
  total_requests?: number;
  passed_requests?: number;
  failed_requests?: number;
  error_count?: number;
  logs?: string[];
  triggered_by?: string;
  metadata?: Record<string, unknown>;
};

type ScheduledRunRowRaw = Omit<
  ScheduledRunRow,
  'last_run_at' | 'next_run_at' | 'created_at' | 'updated_at'
> &
  Partial<Pick<ScheduledRunRow, 'last_run_at' | 'next_run_at' | 'created_at' | 'updated_at'>> &
  Record<string, unknown>;

type ScheduledRunResultRowRaw = Omit<ScheduledRunResultRow, 'started_at' | 'completed_at'> &
  Partial<Pick<ScheduledRunResultRow, 'started_at' | 'completed_at'>> &
  Record<string, unknown>;

const mapScheduledRunRow = (row: ScheduledRunRowRaw): ScheduledRunRow => ({
  ...row,
  last_run_at: toOptionalDate(row.last_run_at),
  next_run_at: toOptionalDate(row.next_run_at),
  created_at: toOptionalDate(row.created_at),
  updated_at: toOptionalDate(row.updated_at),
});

const mapScheduledRunResultRow = (row: ScheduledRunResultRowRaw): ScheduledRunResultRow => ({
  ...row,
  started_at: toOptionalDate(row.started_at),
  completed_at: toOptionalDate(row.completed_at),
});

const scheduledRunRepository = {
  async getWorkspaceMember(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMemberRow | null> {
    const result = await query(
      'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = $3',
      [workspaceId, userId, 'active']
    );
    return (result.rows?.[0] || null) as WorkspaceMemberRow | null;
  },

  async getCollectionById(collectionId: string): Promise<CollectionRow | null> {
    const result = await query('SELECT * FROM collections WHERE id = $1', [collectionId]);
    return (result.rows?.[0] || null) as CollectionRow | null;
  },

  async getEnvironmentById(environmentId: string): Promise<EnvironmentRow | null> {
    const result = await query('SELECT * FROM environments WHERE id = $1', [environmentId]);
    return (result.rows?.[0] || null) as EnvironmentRow | null;
  },

  async getScheduledRunById(scheduleId: string): Promise<ScheduledRunRow | null> {
    const result = await query('SELECT * FROM scheduled_runs WHERE id = $1', [scheduleId]);
    const row = result.rows?.[0] as ScheduledRunRowRaw | undefined;
    return row ? mapScheduledRunRow(row) : null;
  },

  async getScheduledRunByWorkspace(
    scheduleId: string,
    workspaceId: string
  ): Promise<ScheduledRunRow | null> {
    const result = await query('SELECT * FROM scheduled_runs WHERE id = $1 AND workspace_id = $2', [
      scheduleId,
      workspaceId,
    ]);
    const row = result.rows?.[0] as ScheduledRunRowRaw | undefined;
    return row ? mapScheduledRunRow(row) : null;
  },

  async getScheduledRunsByWorkspace(
    workspaceId: string,
    status: string | undefined,
    limit: number,
    offset: number
  ): Promise<{ total: number; rows: ScheduledRunRow[] }> {
    const params: Array<string | number> = [workspaceId];
    let whereClause = 'WHERE workspace_id = $1';
    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) as count FROM scheduled_runs ${whereClause}`,
      params
    );
    const rowsResult = await query(
      `SELECT * FROM scheduled_runs ${whereClause} ORDER BY created_at DESC LIMIT $$${
        params.length + 1
      } OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      total: Number(countResult.rows?.[0]?.count || 0),
      rows: (rowsResult.rows as ScheduledRunRowRaw[]).map(mapScheduledRunRow),
    };
  },

  async listSchedulingTasks(
    workspaceId: string,
    status: string | undefined,
    search: string | undefined,
    limit: number,
    offset: number
  ): Promise<{ total: number; rows: ScheduledRunRow[] }> {
    const clauses: string[] = ['workspace_id = $1'];
    const params: unknown[] = [workspaceId];

    if (status && ['active', 'inactive'].includes(status)) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) as count FROM scheduled_runs ${whereClause}`,
      params
    );
    const rowsResult = await query(
      `SELECT * FROM scheduled_runs ${whereClause} ORDER BY created_at DESC LIMIT $${
        params.length + 1
      } OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      total: Number(countResult.rows?.[0]?.count || 0),
      rows: (rowsResult.rows as ScheduledRunRowRaw[]).map(mapScheduledRunRow),
    };
  },

  async getScheduleIdsByWorkspace(workspaceId: string, scheduleId?: string): Promise<string[]> {
    const params: string[] = [workspaceId];
    let whereClause = 'WHERE workspace_id = $1';
    if (scheduleId) {
      params.push(scheduleId);
      whereClause += ` AND id = $${params.length}`;
    }
    const result = await query(`SELECT id FROM scheduled_runs ${whereClause}`, params);
    return (result.rows || []).map((row: { id: string }) => row.id);
  },

  async getScheduledRunResultsByScheduleIds(
    scheduleIds: string[],
    status: string | undefined,
    triggeredBy: string | undefined,
    limit: number,
    offset: number
  ): Promise<{ total: number; rows: ScheduledRunResultRow[] }> {
    const clauses: string[] = ['scheduled_run_id = ANY($1)'];
    const params: unknown[] = [scheduleIds];

    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    if (triggeredBy) {
      params.push(triggeredBy);
      clauses.push(`triggered_by = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) as count FROM scheduled_run_results ${whereClause}`,
      params
    );
    const rowsResult = await query(
      `SELECT * FROM scheduled_run_results ${whereClause} ORDER BY created_at DESC LIMIT $${
        params.length + 1
      } OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      total: Number(countResult.rows?.[0]?.count || 0),
      rows: (rowsResult.rows as ScheduledRunResultRowRaw[]).map(mapScheduledRunResultRow),
    };
  },
};

export default scheduledRunRepository;
