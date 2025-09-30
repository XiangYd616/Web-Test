/**
 * API服务层
 * 统一管理前后端API调用
 * 
 * @deprecated 请使用 UnifiedApiService 替代该文件
 * @see apiService in services/api/apiService.ts
 * 
 * 迁移指南:
 * - 将 `import { apiClient } from './services/api'` 改为 `import { apiService } from './services/api/apiService'`
 * - 将 `apiClient.get()` 改为 `apiService.apiGet()`
 * - 将 `apiClient.post()` 改为 `apiService.apiPost()`
 */

// API配置
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api`,
  TIMEOUT: 30000, // 30秒超时
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1秒重试延迟
};

// 请求/响应接口定义
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TestConfig {
  url: string;
  options?: Record<string, any>;
}

export interface TestResult {
  testId: string;
  testType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: unknown;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  lastLoginAt?: string;
  settings?: Record<string, any>;
}

// HTTP客户端类
class ApiClient {
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS;
    this.retryDelay = API_CONFIG.RETRY_DELAY;
  }

  /**
   * 获取认证令牌
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }
    return null;
  }

  /**
   * 设置认证令牌
   */
  private setAuthToken(token: string, remember = false): void {
    if (typeof window !== 'undefined') {
      if (remember) {
        localStorage.setItem('authToken', token);
      } else {
        sessionStorage.setItem('authToken', token);
      }
    }
  }

  /**
   * 移除认证令牌
   */
  private removeAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
    }
  }

  /**
   * 创建请求头
   */
  private createHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 发送HTTP请求（带重试机制）
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt = 1
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        headers: this.createHeaders(options?.headers as Record<string, string>),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response?.ok) {
        // 处理HTTP错误
        let errorMessage = `HTTP ${response?.status}: ${response?.statusText}`;
        
        try {
          const errorData = await response?.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // 如果无法解析错误响应，使用默认错误消息
        }

        // 处理认证错误
        if (response.status === 401) {
          this.removeAuthToken();
          // 触发登录重定向或显示登录模态框
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        throw new Error(errorMessage);
      }

      const data = await response?.json();
      return data;

    } catch (error: unknown) {
      // 如果是网络错误且还有重试次数，则重试
      if (attempt < this.retryAttempts && !error?.name?.includes('AbortError')) {
        console.warn(`API请求失败，第${attempt}次重试: ${error?.message}`);
        await this.delay(this.retryDelay * attempt);
        return this.makeRequest<T>(endpoint, options, attempt + 1);
      }

      // 返回标准化的错误响应
      return {
        success: false,
        error: error?.message || 'Network request failed',
        message: '网络请求失败'
      };
    }
  }

  /**
   * GET请求
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();

        /**

         * if功能函数

         * @param {Object} params - 参数对象

         * @returns {Promise<Object>} 返回结果

         */
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    return this.makeRequest<T>(url, { method: 'GET' });
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PATCH请求
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * 上传文件
   */
  async uploadFile<T>(
    endpoint: string, 
    file: File, 
    additionalData?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {} // 不设置Content-Type，让浏览器自动设置
    });
  }
}

// 创建API客户端实例
const apiClient = new ApiClient();

// 认证API
export const _authApi = {
  /**
   * 用户登录
   */
  login: async (credentials: { username: string; password: string; remember?: boolean }) => {
    const response = await apiClient.post<{ token: string; user: User }>('/auth/login', credentials);
    
    if (response?.success && response?.data?.token) {
      apiClient['setAuthToken'](response?.data.token, credentials.remember);
    }
    
    return response;
  },

  /**
   * 用户注册
   */
  register: async (userData: { username: string; email: string; password: string }) => {
    return apiClient.post<{ user: User }>('/auth/register', userData);
  },

  /**
   * 用户登出
   */
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    apiClient['removeAuthToken']();
    return response;
  },

  /**
   * 获取当前用户信息
   */
  getCurrentUser: () => apiClient.get<User>('/auth/me'),

  /**
   * 刷新令牌
   */
  refreshToken: async () => {
    const response = await apiClient.post<{ token: string }>('/auth/refresh');
    
    if (response?.success && response?.data?.token) {
      apiClient['setAuthToken'](response?.data.token);
    }
    
    return response;
  },

  /**
   * 修改密码
   */
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/auth/change-password', data),

  /**
   * 重置密码
   */
  resetPassword: (email: string) => apiClient.post('/auth/reset-password', { email }),

  /**
   * 确认重置密码
   */
  confirmResetPassword: (data: { token: string; newPassword: string }) =>
    apiClient.post('/auth/confirm-reset-password', data)
};

// 测试API
export const _testApi = {
  /**
   * 启动网站测试
   */
  startWebsiteTest: (config: TestConfig) => apiClient.post<TestResult>('/tests/website', config),

  /**
   * 启动SEO测试
   */
  startSeoTest: (config: TestConfig) => apiClient.post<TestResult>('/seo/analyze', config),

  /**
   * 启动性能测试
   */
  startPerformanceTest: (config: TestConfig) => apiClient.post<TestResult>('/performance/analyze', config),

  /**
   * 启动安全测试
   */
  startSecurityTest: (config: TestConfig) => apiClient.post<TestResult>('/security/scan', config),

  /**
   * 启动API测试
   */
  startApiTest: (config: TestConfig) => apiClient.post<TestResult>('/tests/api', config),

  /**
   * 启动兼容性测试
   */
  startCompatibilityTest: (config: TestConfig) => apiClient.post<TestResult>('/tests/compatibility', config),

  /**
   * 启动压力测试
   */
  startStressTest: (config: TestConfig) => apiClient.post<TestResult>('/performance/stress', config),

  /**
   * 启动UX测试
   */
  startUxTest: (config: TestConfig) => apiClient.post<TestResult>('/tests/ux', config),

  /**
   * 获取测试状态
   */
  getTestStatus: (testId: string) => apiClient.get<TestResult>(`/tests/${testId}/status`),

  /**
   * 获取测试结果
   */
  getTestResult: (testId: string) => apiClient.get<TestResult>(`/tests/${testId}/result`),

  /**
   * 取消测试
   */
  cancelTest: (testId: string) => apiClient.delete(`/tests/${testId}`),

  /**
   * 获取测试历史
   */
  getTestHistory: (params?: {
    page?: number;
    limit?: number;
    testType?: string;
    status?: string;
  }) => apiClient.get<PaginatedResponse<TestResult>>('/tests/history', params),

  /**
   * 导出测试结果
   */
  exportTestResult: (testId: string, format: 'json' | 'csv' | 'pdf' = 'json') =>
    apiClient.get(`/tests/${testId}/export`, { format })
};

// OAuth API
export const _oauthApi = {
  /**
   * 获取OAuth授权URL
   */
  getAuthUrl: (provider: string) => apiClient.get<{ url: string }>(`/oauth/${provider}/url`),

  /**
   * OAuth回调处理
   */
  callback: (provider: string, code: string, state?: string) =>
    apiClient.post<{ token: string; user: User }>(`/oauth/${provider}/callback`, { code, state }),

  /**
   * 解除OAuth绑定
   */
  unbind: (provider: string) => apiClient.delete(`/oauth/${provider}/unbind`),

  /**
   * 获取绑定的OAuth账户
   */
  getBoundAccounts: () => apiClient.get<{ provider: string; email: string }[]>('/oauth/accounts')
};

// 工具函数
export const _apiUtils = {
  /**
   * 检查是否已认证
   */
  isAuthenticated: (): boolean => {
    return !!apiClient['getAuthToken']();
  },

  /**
   * 设置API基础URL
   */
  setBaseUrl: (url: string): void => {
    apiClient['baseURL'] = url;
  },

  /**
   * 获取当前API基础URL
   */
  getBaseUrl: (): string => {
    return apiClient['baseURL'];
  },

  /**
   * 手动设置认证令牌
   */
  setToken: (token: string, remember = false): void => {
    apiClient['setAuthToken'](token, remember);
  },

  /**
   * 手动移除认证令牌
   */
  removeToken: (): void => {
    apiClient['removeAuthToken']();
  }
};

// 错误处理工具
export const _handleApiError = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data?.message) {
    return error?.response.data?.message;
  }
  
  if (error?.message) {
    return error?.message;
  }
  
  return '发生未知错误';
};

// 导出API客户端
export const api = apiClient;

// 导出默认API客户端
export default apiClient;
