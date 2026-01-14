/**
 * 认证Repository
 * 统一的认证相关API调用
 */

import { apiClient } from '../client';

export interface LoginCredentials {
  username: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions?: string[];
  isAdmin?: boolean;
}

export interface AuthTokens {
  token: string;
  refreshToken?: string;
}

export class AuthRepository {
  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await apiClient.post<{ token: string; user: User }>(
      '/auth/login',
      credentials
    );

    // 保存token
    if (response.token) {
      this.setToken(response.token, credentials.remember);
    }

    return response.user;
  }

  /**
   * 用户注册
   */
  async register(data: RegisterData): Promise<User> {
    const response = await apiClient.post<{ user: User }>('/auth/register', data);
    return response.user;
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
    this.removeToken();
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  }

  /**
   * 刷新Token
   */
  async refreshToken(): Promise<string> {
    const response = await apiClient.post<{ token: string }>('/auth/refresh');
    if (response.token) {
      this.setToken(response.token);
    }
    return response.token;
  }

  /**
   * 修改密码
   */
  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await apiClient.post('/auth/change-password', data);
  }

  /**
   * 重置密码请求
   */
  async resetPassword(email: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { email });
  }

  /**
   * 确认重置密码
   */
  async confirmResetPassword(data: { token: string; newPassword: string }): Promise<void> {
    await apiClient.post('/auth/confirm-reset-password', data);
  }

  /**
   * OAuth相关方法
   */
  async getOAuthUrl(provider: string): Promise<string> {
    const response = await apiClient.get<{ url: string }>(`/oauth/${provider}/url`);
    return response.url;
  }

  async oauthCallback(
    provider: string,
    code: string,
    state?: string
  ): Promise<{ token: string; user: User }> {
    const response = await apiClient.post<{ token: string; user: User }>(
      `/oauth/${provider}/callback`,
      { code, state }
    );

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  /**
   * Token管理
   */
  private setToken(token: string, remember = false): void {
    if (typeof window !== 'undefined') {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('auth_token', token);
      storage.setItem('token_timestamp', Date.now().toString());
    }
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('token_timestamp');
      sessionStorage.removeItem('token_timestamp');
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

// 导出单例
export const authRepository = new AuthRepository();
export default authRepository;
