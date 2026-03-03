/**
 * 桌面端同步引擎（门面）
 * 组合 SyncFetcher / SyncStrategy / SyncApplier / SyncConfigStore，
 * 仅负责：生命周期管理、IPC 注册、轮询调度、状态广播、日志记录
 */

import { BrowserWindow, ipcMain } from 'electron';
import { query as localQuery } from '../localDbAdapter';
import { SyncApplier } from './SyncApplier';
import { SyncConfigStore, type SyncConfig } from './SyncConfigStore';
import { SyncFetcher } from './SyncFetcher';
import { SyncStrategy } from './SyncStrategy';

// ==================== 类型 ====================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict';

// ==================== SyncEngine ====================

class SyncEngine {
  private status: SyncStatus = 'idle';
  private timer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private consecutiveFailures = 0;

  // 子模块
  private readonly configStore = new SyncConfigStore();
  private readonly fetcher: SyncFetcher;
  private readonly applier = new SyncApplier();
  private readonly strategy: SyncStrategy;

  constructor() {
    this.fetcher = new SyncFetcher({
      getToken: () => this.configStore.getToken(),
      getRefreshToken: () => this.configStore.getRefreshToken(),
      setToken: (token: string) => this.configStore.setToken(token),
      setRefreshToken: (token: string | null) => this.configStore.setRefreshToken(token),
      clearToken: () => {
        this.configStore.setToken(null);
        this.setStatus('error');
      },
      getServerUrl: () => this.configStore.getServerUrl(),
      getDeviceId: () => this.configStore.getDeviceId(),
    });

    this.strategy = new SyncStrategy({
      fetcher: this.fetcher,
      applier: this.applier,
      getServerUrl: () => this.configStore.getServerUrl(),
      getDeviceId: () => this.configStore.getDeviceId(),
    });
  }

  /** 初始化引擎：注册 IPC、加载配置、自动加载 token、启动定时器 */
  async init(): Promise<void> {
    // IPC 必须最先注册，即使后续步骤失败前端也能得到空响应而非 "No handler" 错误
    this.registerIpcHandlers();

    try {
      await this.ensureLogTable();
      await this.configStore.load();
      await this.configStore.loadTokenFromAppState();

      const hasToken = Boolean(this.configStore.getToken());
      const hasServer = Boolean(this.configStore.getServerUrl());

      // 已登录但同步未启用时，自动启用
      if (hasToken && hasServer && !this.configStore.isEnabled()) {
        await this.configStore.updateConfig({ enabled: true });
      }

      if (this.configStore.isEnabled() && hasServer && hasToken) {
        this.startPolling();
      }

      console.log('[SyncEngine] 初始化完成', {
        enabled: this.configStore.isEnabled(),
        interval: this.configStore.getIntervalMs(),
        deviceId: this.configStore.getDeviceId(),
        hasToken,
        serverUrl: this.configStore.getServerUrl(),
      });
    } catch (e) {
      console.error('[SyncEngine] 初始化配置/轮询失败（IPC 已注册，面板可正常显示）:', e);
    }
  }

  /** 设置认证 token（登录云端后调用） */
  setToken(token: string): void {
    this.configStore.setToken(token);
    if (this.configStore.isEnabled() && this.configStore.getServerUrl()) {
      this.startPolling();
    }
  }

  /** 登录成功后激活同步（设置 token + serverUrl + 自动启用） */
  async activateWithAuth(token: string, serverUrl: string, refreshToken?: string): Promise<void> {
    this.configStore.setToken(token);
    if (refreshToken) this.configStore.setRefreshToken(refreshToken);
    await this.configStore.updateConfig({
      serverUrl,
      enabled: true,
    });
    this.startPolling();
    console.log('[SyncEngine] 已激活同步', { serverUrl, hasToken: true });
  }

  /** 清除认证（登出时调用） */
  clearToken(): void {
    this.configStore.setToken(null);
    this.stopPolling();
    this.setStatus('idle');
  }

  /** 停止引擎 */
  stop(): void {
    this.stopPolling();
  }

  // ==================== 核心同步流程 ====================

  /** 执行一次完整同步 */
  async triggerSync(): Promise<{
    success: boolean;
    pulled?: number;
    pushed?: number;
    conflicts?: number;
    error?: string;
  }> {
    if (this.isSyncing) {
      return { success: false, error: '同步正在进行中' };
    }

    const currentToken = this.configStore.getToken();
    const currentServer = this.configStore.getServerUrl();
    console.log(
      `[SyncEngine] triggerSync: token=${currentToken ? currentToken.slice(0, 20) + '...' : '(none)'}, serverUrl=${currentServer}`
    );
    if (!currentToken || !currentServer) {
      return { success: false, error: '未配置云端服务器或未登录' };
    }

    this.isSyncing = true;
    this.setStatus('syncing');

    try {
      // 0. 在线检测
      const online = await this.fetcher.checkOnline();
      if (!online) {
        this.setStatus('offline', '网络不可达: ' + currentServer);
        this.consecutiveFailures++;
        return { success: false, error: '网络不可达' };
      }

      // 1. 自动刷新 token（可能在之前请求中被清除）
      if (!this.configStore.getToken()) {
        await this.configStore.loadTokenFromAppState();
        if (!this.configStore.getToken()) {
          this.setStatus('error', '未登录云端: token 为空');
          return { success: false, error: '未登录云端' };
        }
      }

      // 2. PULL
      const pullResult = await this.strategy.pull(this.configStore.getLastSyncAt());
      const pulled = pullResult.applied;

      // 3. PUSH
      const pushResult = await this.strategy.push();
      const pushed = pushResult.accepted;
      const conflicts = pushResult.conflicts;

      // 4. 更新 lastSyncAt
      const now = new Date().toISOString();
      await this.configStore.saveLastSyncAt(now);

      this.consecutiveFailures = 0;
      this.setStatus(conflicts > 0 ? 'conflict' : 'synced');

      // 记录同步日志
      await this.writeLog('success', pulled, pushed, conflicts);

      // 首次成功同步时注册设备
      if (this.consecutiveFailures === 0) {
        void this.registerDevice();
      }

      return { success: true, pulled, pushed, conflicts };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.consecutiveFailures++;
      console.error(`[SyncEngine] 同步失败 (连续第 ${this.consecutiveFailures} 次):`, error);

      // 记录失败日志
      await this.writeLog('error', 0, 0, 0, error).catch(() => {});

      // 连续失败超过阈值时切换为离线状态，避免频繁请求
      if (this.consecutiveFailures >= 5) {
        this.setStatus('offline', error);
      } else {
        this.setStatus('error', error);
      }
      return { success: false, error };
    } finally {
      this.isSyncing = false;
    }
  }

  // ==================== 定时轮询 ====================

  private startPolling(): void {
    this.stopPolling();
    const intervalMs = this.configStore.getIntervalMs();
    if (intervalMs <= 0) return;

    this.timer = setInterval(() => {
      void this.triggerSync();
    }, intervalMs);

    // 启动后立即同步一次
    void this.triggerSync();
  }

  private stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ==================== 状态广播 ====================

  private setStatus(status: SyncStatus, errorDetail?: string): void {
    this.status = status;
    // 广播给所有渲染进程窗口
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('sync-status-changed', {
          status,
          detail: this.configStore.getLastSyncAt(),
          error: errorDetail,
        });
      }
    }
  }

  // ==================== IPC 注册 ====================

  private registerIpcHandlers(): void {
    ipcMain.handle('sync-trigger', async () => {
      try {
        return await this.triggerSync();
      } catch (e) {
        console.error('[SyncEngine] sync-trigger 失败:', e);
        return { error: String(e) };
      }
    });

    ipcMain.handle('sync-status', async () => {
      try {
        const pendingQueue = await localQuery(
          `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`,
          []
        ).catch(() => ({ rows: [{ count: 0 }] }));
        const pendingConflicts = await localQuery(
          `SELECT COUNT(*) as count FROM sync_conflicts WHERE resolution = 'pending'`,
          []
        ).catch(() => ({ rows: [{ count: 0 }] }));

        const queueRows = (pendingQueue as { rows: Array<{ count: number }> }).rows || [];
        const conflictRows = (pendingConflicts as { rows: Array<{ count: number }> }).rows || [];

        return {
          status: this.status,
          lastSyncAt: this.configStore.getLastSyncAt(),
          pendingChanges: Number(queueRows[0]?.count) || 0,
          pendingConflicts: Number(conflictRows[0]?.count) || 0,
        };
      } catch {
        return { status: this.status, pendingChanges: 0, pendingConflicts: 0 };
      }
    });

    ipcMain.handle('sync-set-config', async (_event, config: Partial<SyncConfig>) => {
      try {
        await this.configStore.updateConfig(config);
        if (config.enabled !== undefined) {
          if (config.enabled && this.configStore.getToken() && this.configStore.getServerUrl()) {
            this.startPolling();
          } else if (config.enabled === false) {
            this.stopPolling();
          }
        }
      } catch (e) {
        console.error('[SyncEngine] sync-set-config 失败:', e);
      }
    });

    ipcMain.handle('sync-get-config', async () => {
      try {
        return { ...this.configStore.getConfig() };
      } catch {
        return { serverUrl: '', intervalMs: 30000, enabled: false, deviceId: '' };
      }
    });

    ipcMain.handle(
      'sync-resolve-conflict',
      async (_event, conflictId: string, resolution: 'local' | 'remote') => {
        try {
          // 获取冲突记录详情
          const conflictResult = await localQuery(
            `SELECT table_name, record_sync_id, local_version FROM sync_conflicts WHERE id = ?`,
            [conflictId]
          );
          const conflictRows =
            (conflictResult as { rows: Array<Record<string, unknown>> }).rows || [];

          await localQuery(
            `UPDATE sync_conflicts SET resolution = ?, resolved_at = datetime('now') WHERE id = ?`,
            [resolution, conflictId]
          );

          // 选择本地版本时，自动入队 sync_queue 重新推送
          if (resolution === 'local' && conflictRows.length > 0) {
            const c = conflictRows[0];
            await localQuery(
              `INSERT INTO sync_queue (table_name, record_sync_id, operation, data)
               VALUES (?, ?, 'update',
                 (SELECT json_object('id', id, 'sync_id', sync_id, 'sync_version', sync_version) FROM ${String(c.table_name)} WHERE sync_id = ?))`,
              [c.table_name, c.record_sync_id, c.record_sync_id]
            ).catch(() => {});
          }

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }
    );

    ipcMain.handle('sync-get-conflicts', async () => {
      try {
        const result = await localQuery(
          `SELECT * FROM sync_conflicts WHERE resolution = 'pending' ORDER BY created_at DESC LIMIT 50`,
          []
        );
        return (result as { rows: Array<Record<string, unknown>> }).rows || [];
      } catch {
        return [];
      }
    });

    ipcMain.handle('sync-get-logs', async (_event, limit?: number) => {
      try {
        const result = await localQuery(
          `SELECT * FROM sync_local_log ORDER BY created_at DESC LIMIT ?`,
          [limit || 20]
        );
        return (result as { rows: Array<Record<string, unknown>> }).rows || [];
      } catch {
        return [];
      }
    });
  }

  // ==================== 日志记录 ====================

  private async ensureLogTable(): Promise<void> {
    await localQuery(
      `CREATE TABLE IF NOT EXISTS sync_local_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        pulled INTEGER DEFAULT 0,
        pushed INTEGER DEFAULT 0,
        conflicts INTEGER DEFAULT 0,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      []
    ).catch(() => {});
  }

  private async writeLog(
    status: string,
    pulled: number,
    pushed: number,
    conflicts: number,
    error?: string
  ): Promise<void> {
    await localQuery(
      `INSERT INTO sync_local_log (status, pulled, pushed, conflicts, error) VALUES (?, ?, ?, ?, ?)`,
      [status, pulled, pushed, conflicts, error || null]
    );
    // 保留最近 100 条日志
    await localQuery(
      `DELETE FROM sync_local_log WHERE id NOT IN (SELECT id FROM sync_local_log ORDER BY created_at DESC LIMIT 100)`,
      []
    ).catch(() => {});
  }

  // ==================== 设备注册 ====================

  private async registerDevice(): Promise<void> {
    if (!this.configStore.getToken() || !this.configStore.getServerUrl()) return;
    try {
      const os = require('os');
      const serverUrl = this.configStore.getServerUrl();
      await this.fetcher.fetchApi(`${serverUrl}/sync/register-device`, 'POST', {
        deviceId: this.configStore.getDeviceId(),
        deviceName: os.hostname(),
        deviceType: 'desktop',
        platform: `${os.platform()} ${os.arch()}`,
      });
    } catch {
      // 设备注册失败不影响主流程
    }
  }
}

// 单例
export const syncEngine = new SyncEngine();
