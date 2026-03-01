/**
 * SyncApplier — 本地变更应用层
 * 职责：将远端变更写入本地 DB、冲突检测与记录
 */

import { query as localQuery } from '../localDbAdapter';

interface SyncChange {
  table: string;
  sync_id: string;
  sync_version: number;
  data: Record<string, unknown>;
  deleted?: boolean;
}

// 每张表允许写入的业务字段白名单（防止写入 id/sync_* 等元字段）
const ALLOWED_DATA_FIELDS: Record<string, string[]> = {
  workspaces: ['name', 'description', 'visibility', 'metadata'],
  collections: [
    'name',
    'description',
    'definition',
    'metadata',
    'default_environment_id',
    'workspace_id',
  ],
  environments: [
    'name',
    'description',
    'config',
    'metadata',
    'variables',
    'is_active',
    'workspace_id',
  ],
  test_templates: [
    'name',
    'template_name',
    'description',
    'engine_type',
    'config',
    'is_public',
    'is_default',
    'workspace_id',
  ],
};

export { SyncChange, ALLOWED_DATA_FIELDS };

export class SyncApplier {
  /** 应用单条远端变更到本地 */
  async applyRemoteChange(change: SyncChange): Promise<void> {
    const { table, sync_id, sync_version, data } = change;

    // 提取允许写入的业务字段
    const allowed = ALLOWED_DATA_FIELDS[table] || [];
    const dataFields: string[] = [];
    const dataValues: unknown[] = [];
    for (const field of allowed) {
      if (data[field] !== undefined) {
        dataFields.push(field);
        const val = typeof data[field] === 'object' ? JSON.stringify(data[field]) : data[field];
        dataValues.push(val);
      }
    }

    // 查本地是否已有
    const local = await localQuery(
      `SELECT sync_id, sync_version, sync_status FROM ${table} WHERE sync_id = ? LIMIT 1`,
      [sync_id]
    );

    const localRows = (local as { rows: Array<Record<string, unknown>> }).rows || [];

    if (localRows.length === 0) {
      // 新记录 → INSERT（含业务字段）
      const id = String(data.id || sync_id);
      const cols = [
        'id',
        'sync_id',
        'sync_version',
        'sync_updated_at',
        'sync_status',
        ...dataFields,
      ];
      const vals: unknown[] = [
        id,
        sync_id,
        sync_version,
        new Date().toISOString(),
        'synced',
        ...dataValues,
      ];
      const placeholders = cols.map(() => '?').join(', ');
      await localQuery(
        `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
        vals
      );
    } else {
      const localVersion = Number(localRows[0].sync_version) || 0;
      const localStatus = String(localRows[0].sync_status || 'synced');

      if (localStatus === 'pending') {
        // 本地有未推送修改 → 冲突
        await this.recordConflict(table, sync_id, localVersion, sync_version, data);
      } else if (sync_version > localVersion) {
        // 云端更新 → 更新本地（含业务字段）
        await this.updateLocal(table, sync_id, sync_version, dataFields, dataValues);
      }
      // sync_version <= localVersion → 本地已是最新，跳过
    }
  }

  /** 批量应用远端变更，返回成功应用数 */
  async applyAll(changes: SyncChange[]): Promise<number> {
    let applied = 0;
    for (const change of changes) {
      try {
        await this.applyRemoteChange(change);
        applied++;
      } catch (err) {
        console.warn(`[SyncApplier] 应用远端变更失败 ${change.table}/${change.sync_id}:`, err);
      }
    }
    return applied;
  }

  private async recordConflict(
    table: string,
    syncId: string,
    localVersion: number,
    remoteVersion: number,
    remoteData: Record<string, unknown>
  ): Promise<void> {
    await localQuery(
      `INSERT OR REPLACE INTO sync_conflicts (id, table_name, record_sync_id, local_version, remote_version, local_data, remote_data, resolution)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 
         (SELECT json_object('sync_version', sync_version) FROM ${table} WHERE sync_id = ?),
         ?, 'pending')`,
      [table, syncId, localVersion, remoteVersion, syncId, JSON.stringify(remoteData)]
    );
  }

  private async updateLocal(
    table: string,
    syncId: string,
    syncVersion: number,
    dataFields: string[],
    dataValues: unknown[]
  ): Promise<void> {
    const setClauses = [
      'sync_version = ?',
      "sync_updated_at = datetime('now')",
      "sync_status = 'synced'",
    ];
    const setParams: unknown[] = [syncVersion];
    for (let i = 0; i < dataFields.length; i++) {
      setClauses.push(`${dataFields[i]} = ?`);
      setParams.push(dataValues[i]);
    }
    setParams.push(syncId);
    await localQuery(`UPDATE ${table} SET ${setClauses.join(', ')} WHERE sync_id = ?`, setParams);
  }
}
