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

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);

        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);

        if (response.status === 401) {
          // Token 过期
          this.deps.clearToken();
          return { success: false, data: { error: 'token_expired' } };
        }

        const json = (await response.json()) as Record<string, unknown>;
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

  /** 检测网络连通性 */
  async checkOnline(): Promise<boolean> {
    const serverUrl = this.deps.getServerUrl();
    if (!serverUrl) return false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const resp = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return resp.ok;
    } catch {
      return false;
    }
  }
}
