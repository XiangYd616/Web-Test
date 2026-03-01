/**
 * EnvironmentRepository — 环境变量仓储
 */

import { generateId } from '../localDbAdapter';
import { BaseRepository } from './BaseRepository';

export interface EnvironmentRow {
  [key: string]: unknown;
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  variables: string;
  is_active: number;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  sync_id?: string;
  sync_version?: number;
  sync_status?: string;
}

export class EnvironmentRepository extends BaseRepository<EnvironmentRow> {
  protected readonly tableName = 'environments';

  async findByWorkspace(workspaceId: string): Promise<EnvironmentRow[]> {
    return this.findAll({
      where: 'workspace_id = ?',
      params: [workspaceId],
      orderBy: 'created_at DESC',
    });
  }

  async findActive(workspaceId: string): Promise<EnvironmentRow | null> {
    const { rows } = await this.rawQuery(
      `SELECT * FROM environments WHERE workspace_id = ? AND is_active = 1 LIMIT 1`,
      [workspaceId]
    );
    return (rows[0] as EnvironmentRow) || null;
  }

  async createEnvironment(data: {
    workspace_id: string;
    name: string;
    description?: string;
    variables?: unknown[];
    is_active?: boolean;
    created_by?: string;
  }): Promise<EnvironmentRow> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.rawQuery(
      `INSERT INTO environments (id, workspace_id, name, description, variables, is_active, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.workspace_id,
        data.name,
        data.description || '',
        JSON.stringify(data.variables || []),
        data.is_active ? 1 : 0,
        data.created_by || null,
        now,
        now,
      ]
    );

    const result = await this.findById(id);
    if (!result) throw new Error(`环境创建失败: ${id}`);
    return result;
  }

  async setActive(workspaceId: string, environmentId: string): Promise<void> {
    // 先取消同工作空间下其他环境的激活状态
    await this.rawQuery(
      `UPDATE environments SET is_active = 0, updated_at = ? WHERE workspace_id = ?`,
      [new Date().toISOString(), workspaceId]
    );
    // 激活指定环境
    await this.rawQuery(`UPDATE environments SET is_active = 1, updated_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      environmentId,
    ]);
  }
}
