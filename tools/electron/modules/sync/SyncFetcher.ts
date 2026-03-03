/**
 * SyncFetcher — HTTP 通信层
 * 职责：带重试/指数退避的 HTTP 请求、在线检测
 */

export interface FetchApiResult {
  success: boolean;
  data?: unknown;
}

export interface SyncFetcherDeps {
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  setToken: (token: string) => void;
  setRefreshToken: (token: string | null) => void;
  clearToken: () => void;
  getServerUrl: () => string;
  getDeviceId: () => string;
}

export class SyncFetcher {
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;
  private readonly deps: SyncFetcherDeps;

  constructor(deps: SyncFetcherDeps) {
    this.deps = deps;
  }

  /** 带重试和指数退避的 HTTP 请求 */
  async fetchApi(url: string, method: 'GET' | 'POST', body?: unknown): Promise<FetchApiResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-Id': this.deps.getDeviceId(),
    };
    const token = this.deps.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const tokenForLog = token ? `${token.slice(0, 20)}...` : '(none)';
    console.log(`[SyncFetcher] fetchApi: ${method} ${url}, token=${tokenForLog}`);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);

        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);

        const text = await response.text();
        console.log(
          `[SyncFetcher] fetchApi: status=${response.status}, body=${text.slice(0, 500)}`
        );

        if (response.status === 401) {
          // Token 过期，尝试用 refreshToken 刷新
          const refreshed = await this.tryRefreshToken();
          if (refreshed) {
            // 用新 token 重试一次
            console.log('[SyncFetcher] token 已刷新，重试请求');
            headers['Authorization'] = `Bearer ${this.deps.getToken()}`;
            const retryResp = await fetch(url, {
              ...options,
              headers,
              signal: new AbortController().signal,
            });
            const retryText = await retryResp.text();
            console.log(
              `[SyncFetcher] 重试结果: status=${retryResp.status}, body=${retryText.slice(0, 500)}`
            );
            if (retryResp.status === 401) {
              this.deps.clearToken();
              return { success: false, data: { error: 'token_expired' } };
            }
            const retryJson = JSON.parse(retryText) as Record<string, unknown>;
            return { success: Boolean(retryJson.success), data: retryJson.data as unknown };
          }
          this.deps.clearToken();
          return { success: false, data: { error: 'token_expired' } };
        }

        const json = JSON.parse(text) as Record<string, unknown>;
        return {
          success: Boolean(json.success),
          data: json.data as unknown,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const isAbort = lastError.name === 'AbortError';
        const isNetwork =
          lastError.message.includes('fetch') ||
          lastError.message.includes('ECONNREFUSED') ||
          lastError.message.includes('ENOTFOUND');

        if (attempt < this.MAX_RETRIES - 1 && (isAbort || isNetwork)) {
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(
            `[SyncFetcher] 请求失败，${delay.toFixed(0)}ms 后重试 (${attempt + 1}/${this.MAX_RETRIES}):`,
            lastError.message
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('请求失败');
  }

  /** 用 refreshToken 刷新 accessToken */
  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = this.deps.getRefreshToken();
    if (!refreshToken) {
      console.log('[SyncFetcher] 无 refreshToken，无法刷新');
      return false;
    }

    try {
      const serverUrl = this.deps.getServerUrl();
      const refreshUrl = `${serverUrl}/auth/refresh`;
      console.log(`[SyncFetcher] 尝试刷新 token: ${refreshUrl}`);

      const resp = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const text = await resp.text();
      console.log(`[SyncFetcher] 刷新结果: status=${resp.status}, body=${text.slice(0, 300)}`);

      if (!resp.ok) return false;

      const json = JSON.parse(text) as Record<string, unknown>;
      const data = json.data as Record<string, unknown> | undefined;
      const tokens = data?.tokens as { accessToken?: string; refreshToken?: string } | undefined;

      if (tokens?.accessToken) {
        this.deps.setToken(tokens.accessToken);
        if (tokens.refreshToken) {
          this.deps.setRefreshToken(tokens.refreshToken);
        }
        // 同步更新到 app_state 数据库
        try {
          const { query: localQuery } = await import('../localDbAdapter');
          await localQuery(
            `UPDATE app_state SET cloud_token = ?, cloud_refresh_token = ?, updated_at = ? WHERE id = 1`,
            [tokens.accessToken, tokens.refreshToken || refreshToken, new Date().toISOString()]
          );
        } catch {
          // 数据库更新失败不影响主流程
        }
        console.log('[SyncFetcher] token 刷新成功');
        return true;
      }
    } catch (err) {
      console.error('[SyncFetcher] 刷新 token 失败:', (err as Error).message);
    }
    return false;
  }

  /** 检测网络连通性 */
  async checkOnline(): Promise<boolean> {
    const serverUrl = this.deps.getServerUrl();
    if (!serverUrl) {
      console.warn('[SyncFetcher] checkOnline: serverUrl 为空');
      return false;
    }
    try {
      // serverUrl 形如 https://api.xiangweb.space/api，health 在根路径 /health
      const baseOrigin = new URL(serverUrl).origin;
      const healthUrl = `${baseOrigin}/health`;
      console.log(`[SyncFetcher] checkOnline: serverUrl=${serverUrl}, healthUrl=${healthUrl}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const resp = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      console.log(`[SyncFetcher] checkOnline: status=${resp.status}, ok=${resp.ok}`);
      return resp.ok;
    } catch (err) {
      console.error('[SyncFetcher] checkOnline 失败:', (err as Error).message || err);
      return false;
    }
  }
}
