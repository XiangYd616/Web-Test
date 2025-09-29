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

export class UnifiedApiService extends BaseApiService {
  private static instance: UnifiedApiService;
  
  constructor(config?: Partial<ApiConfig>) {
    super();
    if (config) {
      this.updateConfig(config);
    }
  }

  static getInstance(): UnifiedApiService {
    if (!UnifiedApiService.instance) {
      UnifiedApiService.instance = new UnifiedApiService();
    }
    return UnifiedApiService.instance;
  }

  private updateConfig(config: Partial<ApiConfig>) {
    // Update configuration logic
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
}

// Create and export default instance
export const unifiedApiService = UnifiedApiService.getInstance();
export default unifiedApiService;
