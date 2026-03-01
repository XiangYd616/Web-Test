import { ipcMain } from 'electron';
import { query as localQuery } from '../modules/localDbAdapter';

/**
 * 应用状态 IPC handlers（本地/云端模式切换）
 */
export function registerAppStateIpc(): void {
  ipcMain.handle('get-app-state', async () => {
    const result = await localQuery('SELECT * FROM app_state WHERE id = 1');
    const rows = result as unknown as Record<string, unknown>[];
    const state =
      Array.isArray(rows) && rows.length > 0
        ? rows[0]
        : ((result as { rows?: Record<string, unknown>[] }).rows?.[0] ?? null);
    return state;
  });

  // 云端登录：切换到 cloud 模式
  ipcMain.handle(
    'set-cloud-auth',
    async (
      _event,
      payload: {
        serverUrl: string;
        token: string;
        userId: string;
        username: string;
        email: string;
      }
    ) => {
      const now = new Date().toISOString();
      await localQuery(
        `UPDATE app_state SET auth_mode = 'cloud', cloud_server_url = ?, cloud_token = ?,
       cloud_user_id = ?, cloud_username = ?, cloud_email = ?, updated_at = ? WHERE id = 1`,
        [payload.serverUrl, payload.token, payload.userId, payload.username, payload.email, now]
      );

      // 通知同步引擎：已登录云端
      try {
        const { syncEngine } = await import('../modules/sync/SyncEngine');
        syncEngine.setToken(payload.token);
      } catch {
        /* sync module may not be loaded yet */
      }

      return { success: true };
    }
  );

  // 退出云端：切回本地模式
  ipcMain.handle('clear-cloud-auth', async () => {
    const now = new Date().toISOString();
    await localQuery(
      `UPDATE app_state SET auth_mode = 'local', cloud_server_url = '', cloud_token = '',
       cloud_user_id = '', cloud_username = '', cloud_email = '', updated_at = ? WHERE id = 1`,
      [now]
    );

    // 通知同步引擎：已登出
    try {
      const { syncEngine } = await import('../modules/sync/SyncEngine');
      syncEngine.clearToken();
    } catch {
      /* sync module may not be loaded yet */
    }

    return { success: true };
  });
}
