/**
 * 认证服务 - 处理本地认证和用户管理
 */

import type { User, LoginCredentials, RegisterData, AuthResponse } from '../types/user';

class AuthService {
  private currentUser: User | null = null;
  private storageKey = 'test_web_app_user';
  private tokenKey = 'test_web_app_token';

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    try {
      const userData = localStorage.getItem(this.storageKey);
      if (userData) {
        this.currentUser = JSON.parse(userData);
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
      this.clearUserData();
    }
  }

  private saveUserToStorage(user: User): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(user));
      this.currentUser = user;
    } catch (error) {
      console.error('保存用户数据失败:', error);
    }
  }

  private clearUserData(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.tokenKey);
    this.currentUser = null;
  }

  private generateToken(): string {
    return `local_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateCredentials(username: string, password: string): boolean {
    // 简单的本地验证逻辑
    // 在实际应用中，这里应该有更复杂的验证
    return username.length >= 3 && password.length >= 6;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { username, password } = credentials;

      if (!this.validateCredentials(username, password)) {
        return {
          success: false,
          message: '用户名或密码格式不正确',
          errors: {
            username: '用户名至少需要3个字符',
            password: '密码至少需要6个字符'
          }
        };
      }

      // 模拟用户数据
      const user: User = {
        id: `user_${Date.now()}`,
        username,
        email: credentials.email || `${username}@example.com`,
        fullName: username,
        role: 'user',
        status: 'active',
        permissions: ['read', 'write'],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        emailVerified: true,
        preferences: {
          theme: 'dark',
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
          notifications: {
            email: true,
            sms: false,
            push: true,
            browser: true,
            testComplete: true,
            testFailed: true,
            weeklyReport: false,
            securityAlert: true,
          }
        }
      };

      const token = this.generateToken();
      
      this.saveUserToStorage(user);
      localStorage.setItem(this.tokenKey, token);

      return {
        success: true,
        message: '登录成功',
        user,
        token
      };
    } catch (error) {
      return {
        success: false,
        message: '登录失败，请稍后重试'
      };
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const { username, email, password, confirmPassword } = data;

      // 验证输入
      const errors: Record<string, string> = {};
      
      if (username.length < 3) {
        errors.username = '用户名至少需要3个字符';
      }
      
      if (!email.includes('@')) {
        errors.email = '请输入有效的邮箱地址';
      }
      
      if (password.length < 6) {
        errors.password = '密码至少需要6个字符';
      }
      
      if (password !== confirmPassword) {
        errors.confirmPassword = '两次输入的密码不一致';
      }

      if (Object.keys(errors).length > 0) {
        return {
          success: false,
          message: '注册信息有误',
          errors
        };
      }

      // 创建新用户
      const user: User = {
        id: `user_${Date.now()}`,
        username,
        email,
        fullName: data.fullName || username,
        role: 'user',
        status: 'active',
        permissions: ['read', 'write'],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: false,
        preferences: {
          theme: 'dark',
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
          notifications: {
            email: true,
            sms: false,
            push: true,
            browser: true,
            testComplete: true,
            testFailed: true,
            weeklyReport: false,
            securityAlert: true,
          }
        }
      };

      const token = this.generateToken();
      
      this.saveUserToStorage(user);
      localStorage.setItem(this.tokenKey, token);

      return {
        success: true,
        message: '注册成功',
        user,
        token
      };
    } catch (error) {
      return {
        success: false,
        message: '注册失败，请稍后重试'
      };
    }
  }

  logout(): void {
    this.clearUserData();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && localStorage.getItem(this.tokenKey) !== null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  async updateProfile(updates: Partial<User>): Promise<AuthResponse> {
    if (!this.currentUser) {
      return {
        success: false,
        message: '用户未登录'
      };
    }

    try {
      const updatedUser = {
        ...this.currentUser,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.saveUserToStorage(updatedUser);

      return {
        success: true,
        message: '更新成功',
        user: updatedUser
      };
    } catch (error) {
      return {
        success: false,
        message: '更新失败，请稍后重试'
      };
    }
  }

  hasPermission(permission: string): boolean {
    if (!this.currentUser || !this.currentUser.permissions) {
      return false;
    }
    return this.currentUser.permissions.includes(permission);
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }
}

export const authService = new AuthService();
export default AuthService;
