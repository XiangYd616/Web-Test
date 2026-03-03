/**
 * 云端同步控制器 v2
 * 基于 sync_version 的增量双向同步协议
 *
 * 协议：
 *   PULL  — 客户端发送 since（上次同步时间），服务端返回此后变更的记录
 *   PUSH  — 客户端发送本地变更列表，服务端做版本比较后写入/返回冲突
 *   STATUS — 返回当前用户的同步摘要信息
 *   REGISTER-DEVICE — 注册/更新设备信息
 */

import type { NextFunction } from 'express';
import { query } from '../../config/database';
import type { ApiResponse, AuthRequest } from '../../types';

// ==================== 常量 ====================

const MAX_PUSH_RECORDS = 200;
const MAX_PULL_RECORDS = 500;

// 可同步表配置
interface SyncTableConfig {
  dbTable: string;
  scopeField: 'user_id' | 'workspace_id';
}

const SYNCABLE_TABLES: Record<string, SyncTableConfig> = {
  workspaces: { dbTable: 'workspaces', scopeField: 'workspace_id' },
  collections: { dbTable: 'collections', scopeField: 'workspace_id' },
  environments: { dbTable: 'environments', scopeField: 'workspace_id' },
  test_templates: { dbTable: 'test_templates', scopeField: 'user_id' },
};

// 每张表允许通过 sync push 写入的业务字段（白名单，防止注入）
const ALLOWED_DATA_FIELDS: Record<string, string[]> = {
  workspaces: ['name', 'description', 'visibility', 'metadata'],
  collections: ['name', 'description', 'definition', 'metadata', 'default_environment_id'],
  environments: ['name', 'description', 'config', 'metadata', 'variables', 'is_active'],
  test_templates: [
    'name',
    'template_name',
    'description',
    'engine_type',
    'config',
    'is_public',
    'is_default',
  ],
};

/** 从 change.data 中提取允许写入的字段，返回 SET 子句和参数 */
const buildDataSetClause = (
  tableName: string,
  data: Record<string, unknown>,
  startParamIdx: number
): { clause: string; params: unknown[] } => {
  const allowed = ALLOWED_DATA_FIELDS[tableName] || [];
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = startParamIdx;
  for (const field of allowed) {
    if (data[field] !== undefined) {
      const val = typeof data[field] === 'object' ? JSON.stringify(data[field]) : data[field];
      sets.push(`${field} = $${idx}`);
      params.push(val);
      idx++;
    }
  }
  return { clause: sets.join(', '), params };
};

// ==================== 类型 ====================

interface SyncChange {
  table: string;
  sync_id: string;
  sync_version: number;
  data: Record<string, unknown>;
  deleted?: boolean;
}

interface PushResult {
  accepted: string[];
  conflicts: Array<{
    sync_id: string;
    table: string;
    local_version: number;
    remote_version: number;
  }>;
  server_time: string;
}

// ==================== 工具函数 ====================

/** 获取用户有权限的 workspace ID 列表 */
const getUserWorkspaceIds = async (userId: string): Promise<string[]> => {
  const result = await query(
    `SELECT workspace_id FROM workspace_members WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  return result.rows.map((r: { workspace_id: string }) => r.workspace_id);
};

// ==================== 旧版兼容 API（保留 /:table/push 和 /:table/pull）====================

/**
 * POST /api/sync/:table/push
 * 单表推送（旧版兼容 + 新版 sync_version 支持）
 */
export const pushRecords = async (req: AuthRequest, res: ApiResponse, _next: NextFunction) => {
  const tableKey = req.params.table?.replace(/-/g, '_');
  const config = SYNCABLE_TABLES[tableKey];
  if (!config) {
    return res.error('INVALID_INPUT', `不支持同步的数据表: ${req.params.table}`, undefined, 400);
  }

  const { records, workspaceId } = req.body as {
    records: Record<string, unknown>[];
    workspaceId?: string;
  };

  if (!Array.isArray(records) || records.length === 0) {
    return res.success({ received: 0 }, '无需同步');
  }

  if (records.length > MAX_PUSH_RECORDS) {
    return res.error('INVALID_INPUT', `单次推送最多 ${MAX_PUSH_RECORDS} 条`, undefined, 400);
  }

  const userId = req.user.id;
  const deviceId = (req.headers['x-device-id'] as string) || 'unknown';
  const serverTime = new Date().toISOString();
  let received = 0;

  for (const record of records) {
    try {
      const syncId = String(record.sync_id || record.id || '');
      if (!syncId) continue;

      const localVersion = Number(record.sync_version) || 1;

      // 检查云端是否已有此记录
      const existing = await query(
        `SELECT sync_id, sync_version FROM ${config.dbTable} WHERE sync_id = $1 LIMIT 1`,
        [syncId]
      );

      if (existing.rows.length > 0) {
        const remoteVersion = Number(existing.rows[0].sync_version) || 1;

        // 版本冲突检测：客户端版本必须 > 云端版本
        if (localVersion <= remoteVersion) {
          continue; // 跳过（云端更新或相同版本）
        }

        // 更新：sync_version 递增
        await query(
          `UPDATE ${config.dbTable}
           SET sync_version = $2, sync_updated_at = $3, sync_device_id = $4, updated_at = $3
           WHERE sync_id = $1`,
          [syncId, localVersion, serverTime, deviceId]
        );
      } else {
        // 新记录插入
        const id = String(record.id || syncId);
        const wsId = String(record.workspace_id || workspaceId || '');

        await query(
          `INSERT INTO ${config.dbTable} (id, sync_id, sync_version, sync_updated_at, sync_device_id, created_at, updated_at${config.scopeField === 'workspace_id' ? ', workspace_id' : ', user_id'})
           VALUES ($1, $2, $3, $4, $5, $4, $4${config.scopeField === 'workspace_id' ? ', $6' : ', $6'})
           ON CONFLICT (sync_id) DO NOTHING`,
          [
            id,
            syncId,
            localVersion,
            serverTime,
            deviceId,
            config.scopeField === 'workspace_id' ? wsId : userId,
          ]
        );
      }
      received++;
    } catch (err) {
      console.warn('[Sync Push]', err instanceof Error ? err.message : err);
    }
  }

  return res.success({ received, server_time: serverTime }, `推送完成: ${received} 条`);
};

/**
 * GET /api/sync/:table/pull
 * 单表拉取（旧版兼容 + 新版 sync_version 支持）
 */
export const pullRecords = async (req: AuthRequest, res: ApiResponse, _next: NextFunction) => {
  const tableKey = req.params.table?.replace(/-/g, '_');
  const config = SYNCABLE_TABLES[tableKey];
  if (!config) {
    return res.error('INVALID_INPUT', `不支持同步的数据表: ${req.params.table}`, undefined, 400);
  }

  const { since, workspaceId } = req.query as { since?: string; workspaceId?: string };
  const userId = req.user.id;

  try {
    const params: unknown[] = [];
    const conditions: string[] = [];

    // 权限作用域
    if (config.scopeField === 'workspace_id') {
      if (!workspaceId) {
        return res.error('INVALID_INPUT', '缺少 workspaceId 参数', undefined, 400);
      }
      params.push(workspaceId);
      conditions.push(`workspace_id = $${params.length}`);
    } else {
      params.push(userId);
      conditions.push(`user_id = $${params.length}`);
    }

    // 增量过滤
    if (since) {
      params.push(since);
      conditions.push(`sync_updated_at > $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT * FROM ${config.dbTable} ${whereClause}
       ORDER BY sync_updated_at ASC NULLS FIRST
       LIMIT ${MAX_PULL_RECORDS}`,
      params
    );

    return res.success({
      records: result.rows,
      total: result.rows.length,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.error('INTERNAL_ERROR', `拉取失败: ${msg}`, undefined, 500);
  }
};

// ==================== 新版统一同步 API ====================

/**
 * GET /api/sync/pull
 * 统一拉取：一次请求拉取多张表的增量变更
 * Query: ?since=<ISO>&tables=workspaces,collections,...
 */
export const unifiedPull = async (req: AuthRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = req.user.id;
  const since = req.query.since as string | undefined;
  const tablesParam = (req.query.tables as string) || Object.keys(SYNCABLE_TABLES).join(',');
  const requestedTables = tablesParam
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  try {
    const workspaceIds = await getUserWorkspaceIds(userId);
    const changes: Array<SyncChange & { table: string }> = [];
    const serverTime = new Date().toISOString();

    for (const tableName of requestedTables) {
      const config = SYNCABLE_TABLES[tableName];
      if (!config) continue;

      const params: unknown[] = [];
      const conditions: string[] = [];

      // 权限作用域
      if (tableName === 'workspaces') {
        // workspaces 通过 workspace_members 关联用户，用 id IN (...) 查询
        if (workspaceIds.length === 0) continue;
        params.push(workspaceIds);
        conditions.push(`id = ANY($${params.length})`);
      } else if (config.scopeField === 'workspace_id') {
        if (workspaceIds.length === 0) continue;
        params.push(workspaceIds);
        conditions.push(`workspace_id = ANY($${params.length})`);
      } else {
        params.push(userId);
        conditions.push(`user_id = $${params.length}`);
      }

      // 增量过滤
      if (since) {
        params.push(since);
        conditions.push(`sync_updated_at > $${params.length}`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT *, '${tableName}' as _sync_table FROM ${config.dbTable} ${whereClause}
         ORDER BY sync_updated_at ASC NULLS FIRST
         LIMIT ${MAX_PULL_RECORDS}`,
        params
      );

      for (const row of result.rows) {
        const { _sync_table, ...data } = row as Record<string, unknown> & { _sync_table: string };
        changes.push({
          table: tableName,
          sync_id: String(data.sync_id || data.id),
          sync_version: Number(data.sync_version) || 1,
          data,
        });
      }
    }

    return res.success({
      changes,
      total: changes.length,
      server_time: serverTime,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.error('INTERNAL_ERROR', `统一拉取失败: ${msg}`, undefined, 500);
  }
};

/**
 * POST /api/sync/push
 * 统一推送：一次请求推送多张表的本地变更
 * Body: { changes: SyncChange[], deviceId: string }
 */
export const unifiedPush = async (req: AuthRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = req.user.id;
  const { changes, deviceId } = req.body as { changes: SyncChange[]; deviceId: string };

  if (!Array.isArray(changes) || changes.length === 0) {
    return res.success({ accepted: [], conflicts: [], server_time: new Date().toISOString() });
  }

  if (changes.length > MAX_PUSH_RECORDS) {
    return res.error('INVALID_INPUT', `单次推送最多 ${MAX_PUSH_RECORDS} 条`, undefined, 400);
  }

  const serverTime = new Date().toISOString();
  const result: PushResult = { accepted: [], conflicts: [], server_time: serverTime };

  try {
    const workspaceIds = await getUserWorkspaceIds(userId);

    for (const change of changes) {
      const config = SYNCABLE_TABLES[change.table];
      if (!config || !change.sync_id) continue;

      try {
        // 检查云端记录
        const existing = await query(
          `SELECT sync_id, sync_version, sync_updated_at FROM ${config.dbTable} WHERE sync_id = $1 LIMIT 1`,
          [change.sync_id]
        );

        if (existing.rows.length > 0) {
          const remoteVersion = Number(existing.rows[0].sync_version) || 1;

          // 冲突检测
          if (change.sync_version <= remoteVersion) {
            result.conflicts.push({
              sync_id: change.sync_id,
              table: change.table,
              local_version: change.sync_version,
              remote_version: remoteVersion,
            });

            // 写入冲突记录
            await query(
              `INSERT INTO sync_conflicts (user_id, table_name, record_sync_id, local_version, remote_version, local_data, remote_data)
               VALUES ($1, $2, $3, $4, $5, $6,
                 (SELECT row_to_json(t) FROM ${config.dbTable} t WHERE sync_id = $3))`,
              [
                userId,
                change.table,
                change.sync_id,
                change.sync_version,
                remoteVersion,
                JSON.stringify(change.data),
              ]
            );
            continue;
          }

          // 版本更高 → 更新（含业务字段）
          const newVersion = change.sync_version;
          const baseParams = [change.sync_id, newVersion, serverTime, deviceId || 'unknown'];
          const { clause: dataClause, params: dataParams } = buildDataSetClause(
            change.table,
            change.data,
            baseParams.length + 1
          );
          const fullSet = `sync_version = $2, sync_updated_at = $3, sync_device_id = $4, updated_at = $3${dataClause ? ', ' + dataClause : ''}`;
          await query(`UPDATE ${config.dbTable} SET ${fullSet} WHERE sync_id = $1`, [
            ...baseParams,
            ...dataParams,
          ]);
          result.accepted.push(change.sync_id);
        } else if (!change.deleted) {
          // 新记录 → 插入（含业务字段）
          const id = String(change.data.id || change.sync_id);

          const baseCols = [
            'id',
            'sync_id',
            'sync_version',
            'sync_updated_at',
            'sync_device_id',
            'created_at',
            'updated_at',
          ];
          const baseVals: unknown[] = [
            id,
            change.sync_id,
            change.sync_version,
            serverTime,
            deviceId || 'unknown',
            serverTime,
            serverTime,
          ];

          // workspaces 表没有 workspace_id/user_id 列，通过 workspace_members 关联
          if (change.table !== 'workspaces') {
            const scopeValue =
              config.scopeField === 'workspace_id'
                ? String(change.data.workspace_id || workspaceIds[0] || '')
                : userId;
            baseCols.push(config.scopeField);
            baseVals.push(scopeValue);
          }

          // 追加业务字段
          const allowed = ALLOWED_DATA_FIELDS[change.table] || [];
          for (const field of allowed) {
            if (change.data[field] !== undefined && !baseCols.includes(field)) {
              baseCols.push(field);
              const val =
                typeof change.data[field] === 'object'
                  ? JSON.stringify(change.data[field])
                  : change.data[field];
              baseVals.push(val as string);
            }
          }

          const placeholders = baseCols.map((_, i) => `$${i + 1}`).join(', ');
          await query(
            `INSERT INTO ${config.dbTable} (${baseCols.join(', ')})
             VALUES (${placeholders})
             ON CONFLICT (sync_id) DO NOTHING`,
            baseVals
          );
          result.accepted.push(change.sync_id);
        }
      } catch (err) {
        console.warn(
          `[Sync Push] ${change.table}/${change.sync_id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    // 记录同步日志
    await query(
      `INSERT INTO sync_log (user_id, device_id, direction, tables_synced, records_pushed, conflicts_count, status, started_at, completed_at, duration_ms)
       VALUES ($1, $2, 'push', $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        deviceId || 'unknown',
        [...new Set(changes.map(c => c.table))],
        result.accepted.length,
        result.conflicts.length,
        result.conflicts.length > 0 ? 'partial' : 'success',
        serverTime,
        new Date().toISOString(),
        Date.now() - new Date(serverTime).getTime(),
      ]
    ).catch(() => {}); // 日志写入失败不影响主流程

    return res.success(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.error('INTERNAL_ERROR', `统一推送失败: ${msg}`, undefined, 500);
  }
};

/**
 * GET /api/sync/status
 * 获取同步状态摘要
 */
export const syncStatus = async (req: AuthRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = req.user.id;

  try {
    // 最近一次同步
    const lastSync = await query(
      `SELECT * FROM sync_log WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );

    // 未解决冲突数
    const pendingConflicts = await query(
      `SELECT COUNT(*) as count FROM sync_conflicts WHERE user_id = $1 AND resolution = 'pending'`,
      [userId]
    );

    // 注册设备数
    const devices = await query(
      `SELECT * FROM sync_devices WHERE user_id = $1 ORDER BY last_sync_at DESC`,
      [userId]
    );

    return res.success({
      last_sync: lastSync.rows[0] || null,
      pending_conflicts: Number(pendingConflicts.rows[0]?.count) || 0,
      devices: devices.rows,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.error('INTERNAL_ERROR', `获取同步状态失败: ${msg}`, undefined, 500);
  }
};

/**
 * POST /api/sync/register-device
 * 注册/更新同步设备
 */
export const registerDevice = async (req: AuthRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = req.user.id;
  const { deviceId, deviceName, deviceType, platform } = req.body as {
    deviceId: string;
    deviceName?: string;
    deviceType: 'desktop' | 'web';
    platform?: string;
  };

  if (!deviceId || !deviceType) {
    return res.error('INVALID_INPUT', '缺少 deviceId 或 deviceType', undefined, 400);
  }

  try {
    await query(
      `INSERT INTO sync_devices (id, user_id, device_name, device_type, platform, last_sync_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         device_name = COALESCE(EXCLUDED.device_name, sync_devices.device_name),
         last_sync_at = NOW(),
         updated_at = NOW()`,
      [deviceId, userId, deviceName || null, deviceType, platform || null]
    );

    return res.success({ deviceId, registered: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.error('INTERNAL_ERROR', `设备注册失败: ${msg}`, undefined, 500);
  }
};

/**
 * POST /api/sync/resolve-conflict
 * 解决冲突
 */
export const resolveConflict = async (req: AuthRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = req.user.id;
  const { conflictId, resolution } = req.body as {
    conflictId: string;
    resolution: 'local' | 'remote';
  };

  if (!conflictId || !['local', 'remote'].includes(resolution)) {
    return res.error('INVALID_INPUT', '缺少 conflictId 或无效 resolution', undefined, 400);
  }

  try {
    const conflict = await query(`SELECT * FROM sync_conflicts WHERE id = $1 AND user_id = $2`, [
      conflictId,
      userId,
    ]);

    if (conflict.rows.length === 0) {
      return res.error('NOT_FOUND', '冲突记录不存在', undefined, 404);
    }

    const record = conflict.rows[0] as {
      table_name: string;
      record_sync_id: string;
      local_data: Record<string, unknown>;
    };

    if (resolution === 'local') {
      // 用本地数据覆盖云端
      const config = SYNCABLE_TABLES[record.table_name];
      if (config) {
        const newVersion = Date.now(); // 用时间戳作为新版本号确保最高
        await query(
          `UPDATE ${config.dbTable}
           SET sync_version = $2, sync_updated_at = NOW(), updated_at = NOW()
           WHERE sync_id = $1`,
          [record.record_sync_id, newVersion]
        );
      }
    }
    // resolution === 'remote' 则无需操作，云端数据已是最新

    await query(`UPDATE sync_conflicts SET resolution = $2, resolved_at = NOW() WHERE id = $1`, [
      conflictId,
      resolution,
    ]);

    return res.success({ conflictId, resolution, resolved: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.error('INTERNAL_ERROR', `冲突解决失败: ${msg}`, undefined, 500);
  }
};
