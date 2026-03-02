import axios, { AxiosHeaders } from 'axios';
import { toast } from 'sonner';
import i18n from '../i18n';
import { isDesktop } from '../utils/environment';

/**
 * 统一 API 错误类
 * 携带业务错误码和 HTTP 状态码，方便调用方按码决策（toast/重试/跳转）
 */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * 判断是否为 ApiError 实例
 */
export const isApiError = (err: unknown): err is ApiError => err instanceof ApiError;

/**
 * 从 localStorage 读取 token
 */
const getLocalStorageToken = (): string | null =>
  window.localStorage.getItem('accessToken') ||
  window.localStorage.getItem('token') ||
  window.localStorage.getItem('authToken');

const resolveToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  return getLocalStorageToken();
};

// API 基础 URL
// 优先级：VITE_API_URL 环境变量 > 桌面端 localStorage > 开发代理 /api
const resolveBaseURL = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (isDesktop()) {
    return window.localStorage.getItem('cloudApiUrl') || 'https://api.xiangweb.space/api';
  }
  return '/api';
};

export const apiClient = axios.create({
  baseURL: resolveBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<boolean> | null = null;
let lastOfflineToast = 0;

/**
 * 本地模式自动登录：仅 Web 本地开发时调用后端 /auth/local-token 获取 JWT
 * 桌面端不再自动创建用户——以 Scratch Pad 模式运行，无需 token
 */
let localTokenPromise: Promise<boolean> | null = null;
export const tryLocalAutoLogin = async (): Promise<boolean> => {
  // 桌面端：Scratch Pad 模式，不自动创建用户/token
  if (isDesktop()) return false;
  if (localTokenPromise) return localTokenPromise;
  localTokenPromise = (async () => {
    try {
      const resp = await axios.get(`${resolveBaseURL()}/auth/local-token`);
      const data = resp.data?.data || resp.data;
      const token = data?.tokens?.accessToken;
      if (token) {
        window.localStorage.setItem('accessToken', token);
        if (data?.tokens?.refreshToken) {
          window.localStorage.setItem('refreshToken', data.tokens.refreshToken);
        }
        if (data?.user) {
          window.localStorage.setItem('current_user', JSON.stringify(data.user));
        }
        return true;
      }
      console.warn('[apiClient] local-token 响应中未包含 accessToken');
      return false;
    } catch (err) {
      console.error('[apiClient] 本地自动登录失败:', err);
      return false;
    }
  })();
  const result = await localTokenPromise;
  localTokenPromise = null;
  return result;
};

/**
 * 尝试自动恢复认证
 * 桌面端：用 refreshToken 调用 /auth/refresh 获取新 accessToken
 * Web 端：直接返回 false 让 401 拦截器跳转登录页
 */
const tryAutoRecover = async (): Promise<boolean> => {
  const refreshToken = window.localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const resp = await axios.post(`${resolveBaseURL()}/auth/refresh`, {
      refreshToken,
    });
    const data = resp.data?.data || resp.data;
    const newAccessToken = data?.tokens?.accessToken;
    if (newAccessToken) {
      window.localStorage.setItem('accessToken', newAccessToken);
      if (data.tokens.refreshToken) {
        window.localStorage.setItem('refreshToken', data.tokens.refreshToken);
      }
      return true;
    }
  } catch {
    // refresh token 也失效，无法恢复
  }
  return false;
};

apiClient.interceptors.request.use(async config => {
  // 桌面端离线模式（无云端配置）：拦截所有非必要请求，返回空数据
  if (isDesktop() && !window.localStorage.getItem('cloudApiUrl')) {
    // 标记为桌面离线请求，在响应拦截器中处理
    (config as unknown as Record<string, unknown>)._desktopOffline = true;
  }
  const token = await resolveToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    // 桌面端离线模式：HTTP 请求失败时返回空数据，并给出用户提示
    const isOffline = (error?.config as unknown as Record<string, unknown>)?._desktopOffline;
    if (
      isOffline &&
      (!error?.response || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNREFUSED')
    ) {
      const url = String(error?.config?.url || '');
      console.debug('[apiClient] 桌面离线模式，跳过请求:', url);
      // 防抖提示：同一秒内只弹一次
      const now = Date.now();
      if (now - lastOfflineToast > 3000) {
        lastOfflineToast = now;
        toast.info('此功能需要云端服务，桌面离线版中不可用', { id: 'desktop-offline' });
      }
      return {
        data: { data: null, success: true, offline: true },
        status: 200,
        config: error.config,
      };
    }

    const status = error?.response?.status;
    const url = String(error?.config?.url || '');
    const isAuthUrl = url.includes('/auth/login') || url.includes('/auth/local-token');

    // 429 限流：统一提示用户，避免被调用方静默吞掉
    if (status === 429) {
      const msg =
        (error?.response?.data as { message?: string })?.message || '请求过于频繁，请稍后再试';
      toast.warning(msg);
    }

    if (status === 401 && !isAuthUrl) {
      // 防止重试标记：避免无限循环
      if (error.config?._retried) {
        return Promise.reject(error);
      }

      // 尝试用 refreshToken 自动恢复（桌面端和 Web 端共用）
      if (!refreshPromise) {
        refreshPromise = tryAutoRecover().finally(() => {
          refreshPromise = null;
        });
      }
      const recovered = await refreshPromise;

      if (recovered && error.config) {
        error.config._retried = true;
        const token = await resolveToken();
        if (token) {
          error.config.headers = error.config.headers || {};
          error.config.headers['Authorization'] = `Bearer ${token}`;
        }
        return apiClient.request(error.config);
      }

      // 恢复失败
      if (isDesktop()) {
        // 桌面端：不清除凭据（保留 current_user 等），仅防抖提示
        const now = Date.now();
        if (now - lastOfflineToast > 5000) {
          lastOfflineToast = now;
          toast.error(i18n.t('common.loginExpired', '登录已过期，请前往 设置 → 账户 重新登录'), {
            id: 'desktop-auth-expired',
          });
        }
        return Promise.reject(error);
      }

      // Web 端：清理本地状态并跳转登录页
      console.warn('[apiClient] 认证恢复失败，清理本地凭据');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('accessToken');
        window.localStorage.removeItem('refreshToken');
        window.localStorage.removeItem('current_user');
      }

      toast.error(i18n.t('common.loginExpired'));
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        const next = encodeURIComponent(
          `${window.location.pathname}${window.location.search}${window.location.hash}`
        );
        window.location.href = `/login?next=${next}`;
      }
    }

    const responseData = error?.response?.data as
      | { message?: string; code?: string; error?: { details?: unknown } }
      | undefined;
    const baseMessage = responseData?.message || error.message || i18n.t('common.requestFailed');
    const details = responseData?.error?.details;
    const detailMessage = Array.isArray(details)
      ? details.filter(Boolean).join('，')
      : typeof details === 'string'
        ? details
        : '';
    const errorMessage = detailMessage ? `${baseMessage}：${detailMessage}` : baseMessage;

    const apiError = new ApiError(
      errorMessage,
      responseData?.code || `HTTP_${status || 0}`,
      status || 0
    );
    return Promise.reject(apiError);
  }
);

/**
 * 从标准 API 响应中提取 data 字段，失败时抛出异常
 */
export const unwrapResponse = <T>(
  payload: { success: boolean; data: T; message?: string },
  fallbackMessage?: string
): T => {
  if (!payload.success) {
    throw new Error(payload.message || fallbackMessage || i18n.t('common.requestFailed'));
  }
  return payload.data;
};
