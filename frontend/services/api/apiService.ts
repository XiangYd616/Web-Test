/**
 * 统一API服务 - 整合所有API服务功能
 * 版本: v3.0.0 - 适配器模式
 *
 * @deprecated 此文件已改为适配器模式，内部调用新的Repository
 * 请逐步迁移到使用 authRepository 和 testRepository
 *
 * 迁移指南:
 * - import { apiService } from './api/apiService'
 *   改为 import { authRepository, testRepository } from './api'
 */

import type { ApiResponse } from '@/types/api';

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

// RequestConfig 已在 baseApiService 中定义，这里不需要重复定义

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
  results?: any;
}

export class ApiService {
  private static instance: ApiService;

  constructor(config?: Partial<ApiConfig>) {
    // 配置已在Repository层处理
    if (config) {
      console.warn('ApiService配置已废弃，请使用Repository层');
    }
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // ==================== 扩展的API方法 ====================

  // 用户认证相关
  public async login(credentials: {
    username: string;
    password: string;
    remember?: boolean;
  }): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.apiPost('/auth/login', credentials);
  }

  public async register(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: any }>> {
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

  public async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<void>> {
    return this.apiPost('/user/change-password', data);
  }

  // Public wrapper methods - 适配器模式
  // 这些方法已废弃，建议直接使用apiClient
  public async apiGet<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    console.warn('apiGet已废弃，请使用 apiClient.get 或对应的Repository');
    try {
      const { apiClient } = await import('./client');
      const data = await apiClient.get<T>(url, config);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async apiPost<T = any>(
    url: string,
    data?: unknown,
    config?: any
  ): Promise<ApiResponse<T>> {
    console.warn('apiPost已废弃，请使用 apiClient.post 或对应的Repository');
    try {
      const { apiClient } = await import('./client');
      const result = await apiClient.post<T>(url, data, config);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async apiPut<T = any>(url: string, data?: unknown, config?: any): Promise<ApiResponse<T>> {
    console.warn('apiPut已废弃，请使用 apiClient.put 或对应的Repository');
    try {
      const { apiClient } = await import('./client');
      const result = await apiClient.put<T>(url, data, config);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async apiDelete<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    console.warn('apiDelete已废弃，请使用 apiClient.delete 或对应的Repository');
    try {
      const { apiClient } = await import('./client');
      const result = await apiClient.delete<T>(url, config);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async apiPatch<T = any>(
    url: string,
    data?: unknown,
    config?: any
  ): Promise<ApiResponse<T>> {
    console.warn('apiPatch已废弃，请使用 apiClient.patch 或对应的Repository');
    try {
      const { apiClient } = await import('./client');
      const result = await apiClient.patch<T>(url, data, config);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Test-specific methods - 调用testRepository
  public async startTest(config: TestConfig): Promise<ApiResponse<TestSession>> {
    try {
      const { testRepository } = await import('./testRepository');
      const result = await testRepository.executeTest({
        testType: config.testType,
        target: config.config?.url || '',
        options: config.config,
      });
      return { success: true, data: result as any };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async getTestProgress(testId: string): Promise<ApiResponse<TestProgress>> {
    try {
      const { testRepository } = await import('./testRepository');
      const result = await testRepository.getTestStatus(testId);
      return { success: true, data: result as any };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async getTestResult(testId: string): Promise<ApiResponse<any>> {
    try {
      const { testRepository } = await import('./testRepository');
      const result = await testRepository.getTestResult(testId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async cancelTest(testId: string): Promise<ApiResponse<void>> {
    try {
      const { testRepository } = await import('./testRepository');
      await testRepository.cancelTest(testId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async stopTest(testId: string): Promise<ApiResponse<void>> {
    try {
      const { testRepository } = await import('./testRepository');
      await testRepository.stopTest(testId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async getTestHistory(testId: string): Promise<ApiResponse<any[]>> {
    try {
      const { testRepository } = await import('./testRepository');
      const result = await testRepository.getTestHistory();
      return { success: true, data: result.tests };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async getQueueStatus(): Promise<ApiResponse<any>> {
    console.warn('getQueueStatus未实现，请使用testRepository');
    return { success: false, error: '方法未实现' };
  }

  public async getTestStatistics(timeRange?: string): Promise<ApiResponse<any>> {
    try {
      const { testRepository } = await import('./testRepository');
      const result = await testRepository.getTestStatistics(timeRange);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // 测试结果相关
  public async exportTestResult(
    testId: string,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<ApiResponse<any>> {
    return this.apiGet(`/api/tests/${testId}/export?format=${format}`);
  }

  public async getTestReport(testId: string): Promise<ApiResponse<any>> {
    return this.apiGet(`/api/tests/${testId}/report`);
  }

  public async shareTestResult(
    testId: string,
    options?: { email?: string; public?: boolean }
  ): Promise<ApiResponse<{ shareUrl: string }>> {
    return this.apiPost(`/api/tests/${testId}/share`, options);
  }

  // OAuth相关
  public async getOAuthUrl(provider: string): Promise<ApiResponse<{ url: string }>> {
    return this.apiGet(`/api/oauth/${provider}/url`);
  }

  public async oauthCallback(
    provider: string,
    code: string,
    state?: string
  ): Promise<ApiResponse<{ token: string; user: any }>> {
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
