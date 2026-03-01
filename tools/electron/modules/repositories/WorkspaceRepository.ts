/**
 * WorkspaceRepository — 工作空间仓储
 */

import { generateId } from '../localDbAdapter';
import { BaseRepository } from './BaseRepository';

export interface WorkspaceRow {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // sync 字段
  sync_id?: string;
  sync_version?: number;
  sync_status?: string;
  sync_updated_at?: string;
}

export class WorkspaceRepository extends BaseRepository<WorkspaceRow> {
  protected readonly tableName = 'workspaces';

  async findByUser(userId: string): Promise<WorkspaceRow[]> {
    const { rows } = await this.rawQuery(
      `SELECT w.* FROM workspaces w
       INNER JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = ? AND wm.status = 'active'
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return rows as WorkspaceRow[];
  }

  async createWithOwner(
    data: { name: string; description?: string },
    userId: string
  ): Promise<WorkspaceRow> {
    const id = generateId();
    const memberId = generateId();
    const now = new Date().toISOString();

    await this.rawQuery(
      `INSERT INTO workspaces (id, name, description, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.description || '', userId, now, now]
    );

    await this.rawQuery(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', 'active', ?, ?)`,
      [memberId, id, userId, now, now]
    );

    const result = await this.findById(id);
    if (!result) throw new Error(`工作空间创建失败: ${id}`);
    return result;
  }

  async deleteWithCascade(workspaceId: string): Promise<void> {
    await this.rawQuery('DELETE FROM workspace_members WHERE workspace_id = ?', [workspaceId]);
    await this.rawQuery('DELETE FROM collections WHERE workspace_id = ?', [workspaceId]);
    await this.rawQuery('DELETE FROM environments WHERE workspace_id = ?', [workspaceId]);
    await this.rawQuery('DELETE FROM workspaces WHERE id = ?', [workspaceId]);
  }
}
