/**
 * SyncConfigStore — 配置与元数据持久化
 * 职责：从 sync_meta 表读写同步配置、生成 deviceId
 */

import { query as localQuery } from '../localDbAdapter';

export interface SyncConfig {
  serverUrl: string;
  intervalMs: number;
  enabled: boolean;
  deviceId: string;
}

// 内置生产 API 地址，与 CloudAccountPanel 的 DEFAULT_CLOUD_API_URL 保持一致
const DEFAULT_SERVER_URL = 'https://api.xiangweb.space/api';

const DEFAULT_CONFIG: SyncConfig = {
  serverUrl: DEFAULT_SERVER_URL,
  intervalMs: 30_000,
  enabled: false,
  deviceId: '',
};

export class SyncConfigStore {
  private config: SyncConfig = { ...DEFAULT_CONFIG };
  private lastSyncAt: string | null = null;
  private token: string | null = null;

  // ─── Getters ───

  getConfig(): Readonly<SyncConfig> {
    return this.config;
  }

  getServerUrl(): string {
    return this.config.serverUrl;
  }

  getDeviceId(): string {
    return this.config.deviceId;
  }

  getIntervalMs(): number {
    return this.config.intervalMs;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getLastSyncAt(): string | null {
    return this.lastSyncAt;
  }

  setLastSyncAt(value: string): void {
    this.lastSyncAt = value;
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  // ─── 加载与持久化 ───

  async load(): Promise<void> {
    try {
      const rows = await localQuery(`SELECT key, value FROM sync_meta`, []);
      const meta = (rows as { rows: Array<{ key: string; value: string }> }).rows || [];
      const map = new Map(meta.map(r => [r.key, r.value]));

      this.config.serverUrl = map.get('server_url') || '';
      this.config.intervalMs = Number(map.get('interval_ms')) || 30_000;
      this.config.enabled = map.get('enabled') === 'true';
      this.config.deviceId = map.get('device_id') || this.generateDeviceId();
      this.lastSyncAt = map.get('last_sync_at') || null;

      // 确保 device_id 已持久化
      await this.saveMeta('device_id', this.config.deviceId);
    } catch {
      // sync_meta 表可能还不存在（首次运行）
      this.config.deviceId = this.generateDeviceId();
    }
  }

  async loadTokenFromAppState(): Promise<void> {
    try {
      const result = await localQuery(
        `SELECT value FROM app_state WHERE key = 'cloud_token' LIMIT 1`,
        []
      );
      const rows = (result as { rows: Array<{ value: string }> }).rows || [];
      if (rows.length > 0 && rows[0].value) {
        this.token = rows[0].value;
      }
    } catch {
      // app_state 表可能不存在
    }
  }

  async updateConfig(partial: Partial<SyncConfig>): Promise<void> {
    if (partial.serverUrl !== undefined) {
      this.config.serverUrl = partial.serverUrl;
      await this.saveMeta('server_url', partial.serverUrl);
    }
    if (partial.intervalMs !== undefined) {
      this.config.intervalMs = partial.intervalMs;
      await this.saveMeta('interval_ms', String(partial.intervalMs));
    }
    if (partial.enabled !== undefined) {
      this.config.enabled = partial.enabled;
      await this.saveMeta('enabled', String(partial.enabled));
    }
  }

  async saveLastSyncAt(value: string): Promise<void> {
    this.lastSyncAt = value;
    await this.saveMeta('last_sync_at', value);
  }

  // ─── 内部 ───

  private async saveMeta(key: string, value: string): Promise<void> {
    await localQuery(
      `INSERT OR REPLACE INTO sync_meta (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      [key, value]
    );
  }

  private generateDeviceId(): string {
    const os = require('os');
    const crypto = require('crypto');
    const raw = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.userInfo().username}`;
    return 'desktop-' + (crypto.createHash('md5').update(raw).digest('hex') as string).slice(0, 12);
  }
}
