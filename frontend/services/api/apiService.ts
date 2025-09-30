/**
 * 统一API服务 - 整合所有API服务功能
 * 版本: v2.0.0
 */

import { BaseApiService } from './baseApiService';
import type {ApiResponse} from '@shared/types';

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
}

export interface AuthConfig {
  tokenKey: string;
  refreshTokenKey: string;
  tokenType: string;
}

export interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  cache?: boolean;
}

export interface TestConfig {
  testId: string;
  testType: string;
  config: Record<string, any>;
}

export interface TestProgress {
  testId: string;
  status: string;
  progress: number;
  message?: string;
}

export interface TestSession {
  id: string;
  status: string;
  startTime: Date;
  endTime?: Date;
  results?: unknown;
}

export class ApiService extends BaseApiService {
  private static instance: ApiService;
  
  constructor(config?: Partial<ApiConfig>) {
    super();
    if (config) {
      this.updateConfig(config);
    }
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private updateConfig(config: Partial<ApiConfig>) {
    // Update configuration logic
  }
  
  // ==================== 扩展的API方法 ====================
  
  // 用户认证相关
  public async login(credentials: { username: string; password: string; remember?: boolean }): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.apiPost('/auth/login', credentials);
  }
  
  public async register(userData: { username: string; email: string; password: string }): Promise<ApiResponse<{ user: any }>> {
    return this.apiPost('/auth/register', userData);
  }
  
  public async logout(): Promise<ApiResponse<void>> {
    return this.apiPost('/auth/logout');
  }
  
  public async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return this.apiPost('/auth/refresh');
  }
  
  // 用户信息相关
  public async getUserProfile(): Promise<ApiResponse<any>> {
    return this.apiGet('/user/profile');
  }
  
  public async updateUserProfile(data: any): Promise<ApiResponse<any>> {
    return this.apiPut('/user/profile', data);
  }
  
  public async changePassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<void>> {
    return this.apiPost('/user/change-password', data);
  }

  // Public wrapper methods that expose protected BaseApiService methods
  public async apiGet<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.get<T>(url, config);
  }

  public async apiPost<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.post<T>(url, data, config);
  }

  public async apiPut<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.put<T>(url, data, config);
  }

  public async apiDelete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.delete<T>(url, config);
  }

  public async apiPatch<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.patch<T>(url, data, config);
  }

  // Test-specific methods
  public async startTest(config: TestConfig): Promise<ApiResponse<TestSession>> {
    return this.apiPost<TestSession>('/api/tests/start', config);
  }

  public async getTestProgress(testId: string): Promise<ApiResponse<TestProgress>> {
    return this.apiGet<TestProgress>(`/api/tests/${testId}/progress`);
  }

  public async getTestResult(testId: string): Promise<ApiResponse<any>> {
    return this.apiGet(`/api/tests/${testId}/result`);
  }

  public async cancelTest(testId: string): Promise<ApiResponse<void>> {
    return this.apiPost(`/api/tests/${testId}/cancel`);
  }

  public async stopTest(testId: string): Promise<ApiResponse<void>> {
    return this.apiPost(`/api/tests/${testId}/stop`);
  }

  public async getTestHistory(testId: string): Promise<ApiResponse<any[]>> {
    return this.apiGet(`/api/tests/${testId}/history`);
  }

  public async getQueueStatus(): Promise<ApiResponse<any>> {
    return this.apiGet('/api/tests/queue/status');
  }

  public async getTestStatistics(timeRange?: string): Promise<ApiResponse<any>> {
    const url = timeRange ? `/api/tests/statistics?timeRange=${timeRange}` : '/api/tests/statistics';
    return this.apiGet(url);
  }
  
  // 测试结果相关
  public async exportTestResult(testId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<ApiResponse<any>> {
    return this.apiGet(`/api/tests/${testId}/export`, { format });
  }
  
  public async getTestReport(testId: string): Promise<ApiResponse<any>> {
    return this.apiGet(`/api/tests/${testId}/report`);
  }
  
  public async shareTestResult(testId: string, options?: { email?: string; public?: boolean }): Promise<ApiResponse<{ shareUrl: string }>> {
    return this.apiPost(`/api/tests/${testId}/share`, options);
  }
  
  // OAuth相关
  public async getOAuthUrl(provider: string): Promise<ApiResponse<{ url: string }>> {
    return this.apiGet(`/api/oauth/${provider}/url`);
  }
  
  public async oauthCallback(provider: string, code: string, state?: string): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.apiPost(`/api/oauth/${provider}/callback`, { code, state });
  }
  
  // 工具方法
  public isAuthenticated(): boolean {
    return !!(this as any).getAuthToken?.();
  }
  
  public setToken(token: string, remember = false): void {
    (this as any).setAuth?.({ token, remember });
  }
  
  public removeToken(): void {
    (this as any).clearAuth?.();
  }
}

// Create and export default instance
export const apiService = ApiService.getInstance();
export default apiService;
