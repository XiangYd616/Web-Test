/**
 * API 服务 - 处理与后端 API 的通信
 */

import type { User, LoginCredentials, RegisterData } from '../types/user';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as any).Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
          errors: data.errors,
        };
      }

      return {
        success: true,
        data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误',
      };
    }
  }

  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  // 认证相关
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<ApiResponse> {
    const result = await this.request('/auth/logout', {
      method: 'POST',
    });
    this.setToken(null);
    return result;
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/users/profile');
  }

  async updateUserProfile(updates: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }): Promise<ApiResponse> {
    return this.request('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 用户数据
  async getUserSettings(): Promise<ApiResponse> {
    return this.request('/users/settings');
  }

  async updateUserSettings(settings: any): Promise<ApiResponse> {
    return this.request('/users/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getUserTests(): Promise<ApiResponse<{ tests: any[] }>> {
    return this.request('/tests/history');
  }

  async getUserStats(): Promise<ApiResponse<{ stats: any }>> {
    return this.request('/users/stats');
  }

  // 管理员功能
  async getAdminDashboard(): Promise<ApiResponse> {
    return this.request('/admin/dashboard');
  }

  async getAdminUsers(page = 1, limit = 20): Promise<ApiResponse> {
    return this.request(`/admin/users?page=${page}&limit=${limit}`);
  }

  async createUser(userData: any): Promise<ApiResponse<{ user: User }>> {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: any): Promise<ApiResponse<{ user: User }>> {
    return this.request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<ApiResponse> {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // 系统信息
  async getSystemInfo(): Promise<ApiResponse> {
    return this.request('/info');
  }

  async getHealth(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // 测试相关
  async runTest(testType: string, config: any): Promise<ApiResponse> {
    return this.request(`/tests/${testType}/run`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getTestResult(testId: string): Promise<ApiResponse> {
    return this.request(`/tests/result/${testId}`);
  }

  async getTestEngineStatus(engine: string): Promise<ApiResponse> {
    return this.request(`/test-engines/${engine}/status`);
  }

  async getAnalytics(params: any = {}): Promise<ApiResponse> {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/tests/analytics?${queryString}`);
  }
}

export const apiService = new ApiService();
export default ApiService;
