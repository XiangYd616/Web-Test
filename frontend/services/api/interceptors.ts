/**
 * API拦截器配置
 * 处理请求和响应的拦截逻辑
 */

import { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * 获取认证Token
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 优先从localStorage获取,其次从sessionStorage
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

/**
 * 移除认证Token
 */
function removeAuthToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
}

/**
 * 请求拦截器
 */
function requestInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  // 添加认证Token
  const token = getAuthToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 添加请求ID(用于追踪)
  if (config.headers) {
    config.headers['X-Request-ID'] = generateRequestId();
  }

  // 开发环境日志
  if (import.meta.env.DEV) {
    console.log('[API Request]', config.method?.toUpperCase(), config.url, {
      params: config.params,
      data: config.data,
    });
  }

  return config;
}

/**
 * 请求错误拦截器
 */
function requestErrorInterceptor(error: AxiosError): Promise<never> {
  console.error('[API Request Error]', error);
  return Promise.reject(error);
}

/**
 * 响应拦截器
 */
function responseInterceptor(response: AxiosResponse): AxiosResponse {
  // 开发环境日志
  if (import.meta.env.DEV) {
    console.log('[API Response]', response.config.url, {
      status: response.status,
      data: response.data,
    });
  }

  return response;
}

/**
 * 响应错误拦截器
 */
function responseErrorInterceptor(error: AxiosError): Promise<never> {
  if (error.response) {
    const { status, data } = error.response;

    // 401 未授权 - 清除token并重定向到登录页
    if (status === 401) {
      removeAuthToken();

      // 触发全局事件
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:unauthorized', {
            detail: { message: '登录已过期,请重新登录' },
          })
        );
      }
    }

    // 403 禁止访问
    if (status === 403) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:forbidden', {
            detail: { message: '您没有权限访问此资源' },
          })
        );
      }
    }

    // 404 未找到
    if (status === 404) {
      console.warn('[API 404]', error.config?.url);
    }

    // 500 服务器错误
    if (status >= 500) {
      console.error('[Server Error]', status, data);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('api:server-error', {
            detail: { status, message: '服务器错误,请稍后重试' },
          })
        );
      }
    }
  } else if (error.request) {
    // 请求已发送但未收到响应
    console.error('[Network Error]', error.message);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('api:network-error', {
          detail: { message: '网络连接失败,请检查网络' },
        })
      );
    }
  }

  // 开发环境详细日志
  if (import.meta.env.DEV) {
    console.error('[API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
  }

  return Promise.reject(error);
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 设置拦截器
 */
export function setupInterceptors(instance: AxiosInstance): void {
  // 请求拦截器
  instance.interceptors.request.use(requestInterceptor, requestErrorInterceptor);

  // 响应拦截器
  instance.interceptors.response.use(responseInterceptor, responseErrorInterceptor);
}

/**
 * 导出工具函数
 */
export { generateRequestId, getAuthToken, removeAuthToken };
