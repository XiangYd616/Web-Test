/**
 * 完整的API服务层
 * 提供统一的API调用、错误处理、数据管理和缓存功能
 * 支持请求拦截、响应处理和自动重试机制
 */

import { apiClient } from '../EnhancedApiClient';
import type { TestConfig, TestResult, TestType } from '../testing/CompleteTestEngine';

// API响应基础接口
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API错误接口
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  stack?: string;
}

// 分页参数接口
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// 用户接口
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    emailUpdates: boolean;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// 测试历史接口
export interface TestHistory {
  id: string;
  url: string;
  type: TestType;
  status: string;
  score: number;
  duration: number;
  createdAt: string;
  userId: string;
  metadata?: Record<string, any>;
}

// 报告接口
export interface Report {
  id: string;
  title: string;
  description?: string;
  type: 'single' | 'comparison' | 'trend';
  testIds: string[];
  config: {
    includeCharts: boolean;
    includeRecommendations: boolean;
    format: 'pdf' | 'html' | 'json';
  };
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  createdAt: string;
  userId: string;
}

// 系统统计接口
export interface SystemStats {
  tests: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byType: Record<TestType, number>;
    byStatus: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    new: number;
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    uptime: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
  };
}

// 完整API服务类
export class CompleteApiService {
  private baseURL: string;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  // 认证相关API
  async login(credentials: { email: string; password: string; rememberMe?: boolean }): Promise<ApiResponse<{ user: User; token: string; expiresIn: number }>> {
    const response = await apiClient.post('/auth/login', credentials);
    return this.handleResponse(response);
  }

  async register(userData: { username: string; email: string; password: string; confirmPassword: string }): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await apiClient.post('/auth/register', userData);
    return this.handleResponse(response);
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await apiClient.post('/auth/logout');
    return this.handleResponse(response);
  }

  async refreshToken(): Promise<ApiResponse<{ token: string; expiresIn: number }>> {
    const response = await apiClient.post('/auth/refresh');
    return this.handleResponse(response);
  }

  async verifyToken(): Promise<ApiResponse<{ user: User; valid: boolean }>> {
    const response = await apiClient.get('/auth/verify');
    return this.handleResponse(response);
  }

  // 用户相关API
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const cacheKey = 'current-user';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get('/user/profile');
    const result = this.handleResponse(response);
    this.setCache(cacheKey, result, 300000); // 5分钟缓存
    return result;
  }

  async updateUserProfile(updates: Partial<User['profile']>): Promise<ApiResponse<User>> {
    const response = await apiClient.put('/user/profile', updates);
    this.clearCache('current-user');
    return this.handleResponse(response);
  }

  async updateUserPreferences(preferences: Partial<User['preferences']>): Promise<ApiResponse<User>> {
    const response = await apiClient.put('/user/preferences', preferences);
    this.clearCache('current-user');
    return this.handleResponse(response);
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<void>> {
    const response = await apiClient.post('/user/change-password', data);
    return this.handleResponse(response);
  }

  async deleteAccount(): Promise<ApiResponse<void>> {
    const response = await apiClient.delete('/user/account');
    return this.handleResponse(response);
  }

  // 测试相关API
  async startTest(config: TestConfig): Promise<ApiResponse<{ testId: string }>> {
    const response = await apiClient.post('/test/start', config);
    return this.handleResponse(response);
  }

  async getTestResult(testId: string): Promise<ApiResponse<TestResult>> {
    const response = await apiClient.get(`/test/result/${testId}`);
    return this.handleResponse(response);
  }

  async getTestStatus(testId: string): Promise<ApiResponse<{ status: string; progress: number }>> {
    const response = await apiClient.get(`/test/status/${testId}`);
    return this.handleResponse(response);
  }

  async cancelTest(testId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post(`/test/cancel/${testId}`);
    return this.handleResponse(response);
  }

  async getTestHistory(params: PaginationParams = {}): Promise<ApiResponse<TestHistory[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const response = await apiClient.get(`/test/history?${queryParams}`);
    return this.handleResponse(response);
  }

  async deleteTestResult(testId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/test/result/${testId}`);
    return this.handleResponse(response);
  }

  async compareTests(testIds: string[]): Promise<ApiResponse<{ comparison: any }>> {
    const response = await apiClient.post('/test/compare', { testIds });
    return this.handleResponse(response);
  }

  // 报告相关API
  async generateReport(config: {
    testIds: string[];
    title: string;
    description?: string;
    type: 'single' | 'comparison' | 'trend';
    format: 'pdf' | 'html' | 'json';
    includeCharts?: boolean;
    includeRecommendations?: boolean;
  }): Promise<ApiResponse<{ reportId: string }>> {
    const response = await apiClient.post('/reports/generate', config);
    return this.handleResponse(response);
  }

  async getReport(reportId: string): Promise<ApiResponse<Report>> {
    const response = await apiClient.get(`/reports/${reportId}`);
    return this.handleResponse(response);
  }

  async getReports(params: PaginationParams = {}): Promise<ApiResponse<Report[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const response = await apiClient.get(`/reports?${queryParams}`);
    return this.handleResponse(response);
  }

  async downloadReport(reportId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/reports/${reportId}/download`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download report');
    }

    return response.blob();
  }

  async deleteReport(reportId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/reports/${reportId}`);
    return this.handleResponse(response);
  }

  // 系统统计API
  async getSystemStats(): Promise<ApiResponse<SystemStats>> {
    const cacheKey = 'system-stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get('/system/stats');
    const result = this.handleResponse(response);
    this.setCache(cacheKey, result, 60000); // 1分钟缓存
    return result;
  }

  async getUserStats(userId?: string): Promise<ApiResponse<{
    testsRun: number;
    averageScore: number;
    favoriteTestType: TestType;
    totalTime: number;
    recentActivity: any[];
  }>> {
    const url = userId ? `/user/stats/${userId}` : '/user/stats';
    const response = await apiClient.get(url);
    return this.handleResponse(response);
  }

  // 管理员API
  async getUsers(params: PaginationParams = {}): Promise<ApiResponse<User[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const response = await apiClient.get(`/admin/users?${queryParams}`);
    return this.handleResponse(response);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    const response = await apiClient.put(`/admin/users/${userId}`, updates);
    return this.handleResponse(response);
  }

  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return this.handleResponse(response);
  }

  async getSystemLogs(params: PaginationParams & { level?: string; startDate?: string; endDate?: string } = {}): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const response = await apiClient.get(`/admin/logs?${queryParams}`);
    return this.handleResponse(response);
  }

  // 配置API
  async getSystemConfig(): Promise<ApiResponse<Record<string, any>>> {
    const response = await apiClient.get('/admin/config');
    return this.handleResponse(response);
  }

  async updateSystemConfig(config: Record<string, any>): Promise<ApiResponse<void>> {
    const response = await apiClient.put('/admin/config', config);
    return this.handleResponse(response);
  }

  // 健康检查API
  async healthCheck(): Promise<ApiResponse<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { status: string; responseTime: number }>;
    uptime: number;
    version: string;
  }>> {
    const response = await apiClient.get('/health');
    return this.handleResponse(response);
  }

  // 文件上传API
  async uploadFile(file: File, type: 'avatar' | 'report' | 'import'): Promise<ApiResponse<{ url: string; filename: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await apiClient.upload('/upload', file);
    return this.handleResponse(response);
  }

  // 数据导入导出API
  async exportData(type: 'tests' | 'users' | 'reports', format: 'json' | 'csv' | 'xlsx'): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/export/${type}?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to export data');
    }

    return response.blob();
  }

  async importData(file: File, type: 'tests' | 'users'): Promise<ApiResponse<{ imported: number; errors: any[] }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch(`${this.baseURL}/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`
      },
      body: formData
    });

    return this.handleResponse({ data: await response.json() });
  }

  // 通知API
  async getNotifications(params: PaginationParams = {}): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const response = await apiClient.get(`/notifications?${queryParams}`);
    return this.handleResponse(response);
  }

  async markNotificationRead(notificationId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.put(`/notifications/${notificationId}/read`);
    return this.handleResponse(response);
  }

  async markAllNotificationsRead(): Promise<ApiResponse<void>> {
    const response = await apiClient.put('/notifications/read-all');
    return this.handleResponse(response);
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return this.handleResponse(response);
  }

  // 私有方法

  // 处理API响应
  private handleResponse<T>(response: any): ApiResponse<T> {
    if (response.data) {
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
        timestamp: response.data.timestamp || new Date().toISOString(),
        requestId: response.data.requestId,
        pagination: response.data.pagination
      };
    }
    
    throw new Error('Invalid API response format');
  }

  // 缓存管理
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // 批量请求
  async batch<T>(requests: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    data?: any;
  }>): Promise<Array<ApiResponse<T> | Error>> {
    const promises = requests.map(async req => {
      try {
        let response;
        switch (req.method) {
          case 'GET':
            response = await apiClient.get(req.url);
            break;
          case 'POST':
            response = await apiClient.post(req.url, req.data);
            break;
          case 'PUT':
            response = await apiClient.put(req.url, req.data);
            break;
          case 'DELETE':
            response = await apiClient.delete(req.url);
            break;
          default:
            throw new Error(`Unsupported method: ${req.method}`);
        }
        return this.handleResponse<T>(response);
      } catch (error) {
        return error as Error;
      }
    });

    return Promise.all(promises);
  }

  // 获取缓存统计
  getCacheStats(): {
    size: number;
    keys: string[];
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: 0 // 可以实现命中率统计
    };
  }

  // 清理过期缓存
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= cached.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 创建默认API服务实例
export const completeApiService = new CompleteApiService();

export default CompleteApiService;
