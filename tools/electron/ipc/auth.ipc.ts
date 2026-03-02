/**
 * 浏览器登录认证 IPC handlers
 *
 * 实现 Postman 风格的桌面端登录流程：
 * 1. 渲染进程调用 auth:open-browser-login → 主进程用系统浏览器打开 Web 端登录页
 * 2. Web 端登录成功后重定向 testweb://auth-callback?token=xxx&...
 * 3. 主进程解析 deep link → 存储 token → 通知渲染进程
 */
import { BrowserWindow, ipcMain, shell } from 'electron';
import { query as localQuery } from '../modules/localDbAdapter';

/**
 * 处理 testweb://auth-callback?... deep link
 * 从 URL 中解析 token 和用户信息，存储到本地数据库，通知渲染进程
 */
export function handleAuthDeepLink(url: string, win: BrowserWindow | null): void {
  console.log('[auth] 收到 deep link:', url);

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'auth-callback' && parsed.pathname !== '//auth-callback') {
      console.log('[auth] 非 auth-callback URL，忽略');
      return;
    }

    const accessToken = parsed.searchParams.get('access_token') || '';
    const refreshToken = parsed.searchParams.get('refresh_token') || '';
    const userId = parsed.searchParams.get('user_id') || '';
    const username = parsed.searchParams.get('username') || '';
    const email = parsed.searchParams.get('email') || '';
    const serverUrl = parsed.searchParams.get('server_url') || '';

    if (!accessToken) {
      console.warn('[auth] deep link 缺少 access_token');
      win?.webContents.send('auth:callback-result', {
        success: false,
        error: '登录回调缺少 token',
      });
      return;
    }

    // 存储到本地数据库
    const now = new Date().toISOString();
    const effectiveServerUrl = serverUrl || 'https://api.xiangweb.space/api';
    void localQuery(
      `UPDATE app_state SET auth_mode = 'cloud', cloud_server_url = ?, cloud_token = ?,
       cloud_user_id = ?, cloud_username = ?, cloud_email = ?, updated_at = ? WHERE id = 1`,
      [effectiveServerUrl, accessToken, userId, username, email, now]
    ).then(() => {
      // 激活同步引擎（设置 token + serverUrl + 自动启用）
      void import('../modules/sync/SyncEngine')
        .then(({ syncEngine }) => syncEngine.activateWithAuth(accessToken, effectiveServerUrl))
        .catch(() => {
          /* sync module may not be loaded yet */
        });
    });

    // 通知渲染进程：登录成功
    win?.webContents.send('auth:callback-result', {
      success: true,
      user: { id: userId, username, email },
      tokens: { accessToken, refreshToken },
      serverUrl,
    });

    console.log('[auth] 浏览器登录回调处理成功, user:', username);
  } catch (err) {
    console.error('[auth] 解析 deep link 失败:', err);
    win?.webContents.send('auth:callback-result', {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * 注册认证相关 IPC handlers
 */
export function registerAuthIpc(): void {
  // 打开系统浏览器进行登录
  ipcMain.handle(
    'auth:open-browser-login',
    async (_event, payload: { serverUrl: string; mode?: 'login' | 'register' }) => {
      const { serverUrl, mode = 'login' } = payload;
      if (!serverUrl) {
        return { success: false, error: '未配置服务器地址' };
      }

      // 从 API URL 推导出前端 Web URL
      // 例: https://api.xiangweb.space/api → https://app.xiangweb.space
      let webBaseUrl = serverUrl.replace(/\/api\/?$/, ''); // 去掉尾部 /api
      try {
        const parsed = new URL(webBaseUrl);
        if (parsed.hostname.startsWith('api.')) {
          parsed.hostname = parsed.hostname.replace(/^api\./, 'app.');
          webBaseUrl = parsed.origin;
        }
      } catch {
        /* 保持原样 */
      }

      // 构建 Web 端登录 URL，附带 desktop_auth=1 参数，
      // Web 端登录成功后会检测此参数并重定向到 testweb://auth-callback
      const authUrl =
        mode === 'register'
          ? `${webBaseUrl}/register?desktop_auth=1`
          : `${webBaseUrl}/login?desktop_auth=1`;

      try {
        await shell.openExternal(authUrl);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  );
}
