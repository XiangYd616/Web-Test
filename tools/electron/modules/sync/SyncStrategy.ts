/**
 * SyncStrategy — Pull/Push 编排层
 * 职责：Pull 远端变更并交给 Applier、收集本地待推送队列并 Push
 */

import { query as localQuery } from '../localDbAdapter';
import type { SyncChange } from './SyncApplier';
import { SyncApplier } from './SyncApplier';
import type { SyncFetcher } from './SyncFetcher';

const SYNCABLE_TABLES = ['workspaces', 'collections', 'environments', 'test_templates'];

export interface PullResult {
  applied: number;
}

export interface PushResult {
  accepted: number;
  conflicts: number;
}

export class SyncStrategy {
  private readonly fetcher: SyncFetcher;
  private readonly applier: SyncApplier;
  private readonly getServerUrl: () => string;
  private readonly getDeviceId: () => string;

  constructor(deps: {
    fetcher: SyncFetcher;
    applier: SyncApplier;
    getServerUrl: () => string;
    getDeviceId: () => string;
  }) {
    this.fetcher = deps.fetcher;
    this.applier = deps.applier;
    this.getServerUrl = deps.getServerUrl;
    this.getDeviceId = deps.getDeviceId;
  }

  // ==================== PULL ====================

  async pull(lastSyncAt: string | null): Promise<PullResult> {
    const since = lastSyncAt || '';
    const url = `${this.getServerUrl()}/sync/pull?since=${encodeURIComponent(since)}&tables=${SYNCABLE_TABLES.join(',')}`;

    const resp = await this.fetcher.fetchApi(url, 'GET');
    if (!resp.success || !resp.data) {
      throw new Error('Pull 失败: ' + JSON.stringify(resp));
    }

    const { changes } = resp.data as {
      changes: SyncChange[];
      server_time: string;
    };

    const applied = await this.applier.applyAll(changes);
    return { applied };
  }

  // ==================== PUSH ====================

  async push(): Promise<PushResult> {
    // 去重：同一 sync_id 多次 pending 时只保留最新一条
    await localQuery(
      `DELETE FROM sync_queue WHERE status = 'pending' AND id NOT IN (
        SELECT MAX(id) FROM sync_queue WHERE status = 'pending' GROUP BY table_name, record_sync_id
      )`,
      []
    ).catch(() => {});

    // 读取本地待推送队列
    const queue = await localQuery(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 200`,
      []
    );
    const queueRows = (queue as { rows: Array<Record<string, unknown>> }).rows || [];

    if (queueRows.length === 0) {
      return { accepted: 0, conflicts: 0 };
    }

    // 构造 changes — 从源表读取完整业务数据
    const changes: SyncChange[] = [];
    for (const row of queueRows) {
      const tableName = String(row.table_name);
      const syncId = String(row.record_sync_id);
      const operation = String(row.operation);

      if (operation === 'delete') {
        const queueData = JSON.parse(String(row.data || '{}')) as Record<string, unknown>;
        changes.push({
          table: tableName,
          sync_id: syncId,
          sync_version: Number(queueData.sync_version) || 1,
          data: queueData,
          deleted: true,
        });
        continue;
      }

      // 从源表读取当前完整记录
      try {
        const sourceResult = await localQuery(
          `SELECT * FROM ${tableName} WHERE sync_id = ? LIMIT 1`,
          [syncId]
        );
        const sourceRows = (sourceResult as { rows: Array<Record<string, unknown>> }).rows || [];
        if (sourceRows.length > 0) {
          const fullData = sourceRows[0];
          changes.push({
            table: tableName,
            sync_id: syncId,
            sync_version: Number(fullData.sync_version) || 1,
            data: fullData,
          });
        }
      } catch {
        // 源记录可能已被删除，用 queue 中的数据降级
        const queueData = JSON.parse(String(row.data || '{}')) as Record<string, unknown>;
        changes.push({
          table: tableName,
          sync_id: syncId,
          sync_version: Number(queueData.sync_version) || 1,
          data: queueData,
        });
      }
    }

    const url = `${this.getServerUrl()}/sync/push`;
    const resp = await this.fetcher.fetchApi(url, 'POST', {
      changes,
      deviceId: this.getDeviceId(),
    });

    if (!resp.success || !resp.data) {
      throw new Error('Push 失败: ' + JSON.stringify(resp));
    }

    const { accepted, conflicts } = resp.data as {
      accepted: string[];
      conflicts: Array<{ sync_id: string; table: string }>;
    };

    // 标记已推送
    const acceptedSet = new Set(accepted);
    for (const row of queueRows) {
      const syncId = String(row.record_sync_id);
      if (acceptedSet.has(syncId)) {
        await localQuery(`UPDATE sync_queue SET status = 'pushed' WHERE id = ?`, [row.id]);
        await localQuery(
          `UPDATE ${String(row.table_name)} SET sync_status = 'synced' WHERE sync_id = ?`,
          [syncId]
        );
      }
    }

    // 标记冲突
    for (const c of conflicts) {
      await localQuery(
        `UPDATE sync_queue SET status = 'failed' WHERE record_sync_id = ? AND table_name = ?`,
        [c.sync_id, c.table]
      );
    }

    return { accepted: accepted.length, conflicts: conflicts.length };
  }
}
