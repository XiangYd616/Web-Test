/**
 * 认证服务
 * 处理用户登录、注册、登出等认证相关功能
 */

import { createSuccessResponse, createErrorResponse } from '../../shared/utils/apiResponseBuilder';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

class AuthService {
  private baseUrl = '/api/auth';
  private token: string | null = null;

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || '登录失败');
      }

      // 保存token
      this.token = result.data.token;
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));

      return result.data;
    } catch (error) {
      console.error('登录错误:', error);
      throw error;
    }
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterData): Promise<{ user: User; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || '注册失败');
      }

      return result.data;
    } catch (error) {
      console.error('注册错误:', error);
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
    } catch (error) {
      console.error('登出错误:', error);
    } finally {
      // 清除本地存储
      this.token = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('获取用户信息失败');
      }

      const result = await response.json();
      return result.data.user;
    } catch (error) {
      console.error('获取用户信息错误:', error);
      return null;
    }
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * 获取token
   */
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  /**
   * 获取当前用户（从本地存储）
   */
  getUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;