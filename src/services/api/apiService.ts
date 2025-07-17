/**
 * 统一的 API 服务适配器
 * 根据环境自动选择使用远程 API 或本地存储
 */

import type { AuthResponse, LoginCredentials, RegisterData, User } from '../../types/user';
import { isDesktopEnvironment } from '../../utils/environment';

// 延迟导入以避免循环依赖
let authService: any = null;
let remoteApiService: any = null;

// 动态导入函数
const getAuthService = async () => {
  if (!authService) {
    const { authService: auth } = await import('../auth/authService');
    authService = auth;
  }
  return authService;
};

const getRemoteApiService = async () => {
  if (!remoteApiService) {
    // 这里应该导入实际的远程API服务
    // 暂时返回一个模拟的服务
    remoteApiService = {
      register: async (data: RegisterData) => ({ success: false, message: '远程API暂不可用' }),
      login: async (credentials: LoginCredentials) => ({ success: false, message: '远程API暂不可用' }),
      logout: async () => { },
      getCurrentUser: async () => ({ success: false, data: null as any }),
      updateUserProfile: async (updates: Partial<User>) => ({ success: false, message: '远程API暂不可用' }),
      changePassword: async (data: any) => ({ success: false, message: '远程API暂不可用' }),
      getUserSettings: async () => ({ success: false, data: null as any }),
      updateUserSettings: async (settings: any) => ({ success: false, message: '远程API暂不可用' }),
      getUserTests: async () => ({ success: false, data: [] as any[] }),
      getUserStats: async () => ({ success: false, data: null as any }),
      getAdminDashboard: async () => ({ success: false, data: null as any }),
      getAdminUsers: async (page: number, limit: number) => ({ success: false, data: [] as any[] }),
      createUser: async (userData: any) => ({ success: false, message: '远程API暂不可用' }),
      updateUser: async (userId: string, userData: any) => ({ success: false, message: '远程API暂不可用' }),
      deleteUser: async (userId: string) => ({ success: false, message: '远程API暂不可用' }),
      getSystemInfo: async () => ({ success: false, data: null as any }),
      getHealth: async () => ({ success: false, data: null as any })
    };
  }
  return remoteApiService;
};

class UnifiedApiService {
  private useRemoteApi: boolean;
  private baseURL: string;

  constructor() {
    // 在浏览器环境中使用远程 API，在桌面环境中使用本地存储
    this.useRemoteApi = !isDesktopEnvironment();
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  }

  // 强制使用远程 API（用于测试）
  forceRemoteApi(force: boolean = true): void {
    this.useRemoteApi = force;
  }

  // Token 管理
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  // 基础 HTTP 客户端方法
  private async request(url: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseURL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}),
        ...options.headers
      },
      ...options
    });
    return response.json();
  }

  // 检查是否使用远程 API
  isUsingRemoteApi(): boolean {
    return this.useRemoteApi;
  }

  // 通用 HTTP 方法
  async get(url: string, config?: any): Promise<any> {
    if (this.useRemoteApi) {
      // 使用 fetch 直接调用
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}),
          ...config?.headers
        },
        ...config
      });
      return response.json();
    }
    throw new Error('GET method not supported in desktop mode');
  }

  async post(url: string, data?: any, config?: any): Promise<any> {
    if (this.useRemoteApi) {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}),
          ...config?.headers
        },
        body: data ? JSON.stringify(data) : undefined,
        ...config
      });
      return response.json();
    }
    throw new Error('POST method not supported in desktop mode');
  }

  async put(url: string, data?: any, config?: any): Promise<any> {
    if (this.useRemoteApi) {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${url}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}),
          ...config?.headers
        },
        body: data ? JSON.stringify(data) : undefined,
        ...config
      });
      return response.json();
    }
    throw new Error('PUT method not supported in desktop mode');
  }

  async delete(url: string, config?: any): Promise<any> {
    if (this.useRemoteApi) {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${url}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}),
          ...config?.headers
        },
        ...config
      });
      return response.json();
    }
    throw new Error('DELETE method not supported in desktop mode');
  }

  // 认证相关方法
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (this.useRemoteApi) {
      try {
        const response = await this.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials)
        });
        if (response.success && response.data) {
          return {
            success: true,
            user: response.data.user,
            token: response.data.token,
            message: response.message || '登录成功'
          };
        } else {
          return {
            success: false,
            message: response.error || '登录失败',
            errors: response.errors
          };
        }
      } catch (error) {
        console.warn('远程 API 登录失败，回退到本地认证:', error);
        const auth = await getAuthService();
        return auth.login(credentials);
      }
    } else {
      const auth = await getAuthService();
      return auth.login(credentials);
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        const response = await remoteApi.register(data);
        if (response.success && response.data) {
          return {
            success: true,
            user: response.data.user,
            token: response.data.token,
            message: response.message || '注册成功'
          };
        } else {
          return {
            success: false,
            message: response.error || '注册失败',
            errors: response.errors
          };
        }
      } catch (error) {
        console.warn('远程 API 注册失败，回退到本地注册:', error);
        const auth = await getAuthService();
        return auth.register(data);
      }
    } else {
      const auth = await getAuthService();
      return auth.register(data);
    }
  }

  async logout(): Promise<void> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        await remoteApi.logout();
      } catch (error) {
        console.warn('远程 API 登出失败:', error);
      }
    }
    // 总是执行本地登出清理
    const auth = await getAuthService();
    auth.logout();
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        const response = await remoteApi.getCurrentUser();
        if (response.success && response.data) {
          return response.data.user;
        }
      } catch (error) {
        console.warn('远程 API 获取用户信息失败，使用本地信息:', error);
      }
    }
    const auth = await getAuthService();
    return auth.getCurrentUser();
  }

  async updateProfile(updates: Partial<User>): Promise<AuthResponse> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        const response = await remoteApi.updateUserProfile(updates);
        if (response.success && response.data) {
          return {
            success: true,
            user: response.data.user,
            message: response.message || '更新成功'
          };
        } else {
          return {
            success: false,
            message: response.error || '更新失败'
          };
        }
      } catch (error) {
        console.warn('远程 API 更新失败，使用本地更新:', error);
      }
    }
    const auth = await getAuthService();
    return auth.updateProfile(updates);
  }

  async changePassword(data: { currentPassword: string; newPassword: string; confirmNewPassword: string }): Promise<AuthResponse> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        const response = await remoteApi.changePassword(data);
        return {
          success: response.success,
          message: response.message || (response.success ? '密码修改成功' : '密码修改失败')
        };
      } catch (error) {
        console.warn('远程 API 修改密码失败:', error);
        return {
          success: false,
          message: '密码修改失败，请稍后重试'
        };
      }
    } else {
      // 桌面环境暂不支持密码修改
      return {
        success: false,
        message: '桌面版暂不支持密码修改功能'
      };
    }
  }

  // 用户数据相关方法
  async getUserSettings(): Promise<any> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        const response = await remoteApi.getUserSettings();
        if (response.success) {
          return response.data;
        }
      } catch (error) {
        console.warn('远程 API 获取设置失败:', error);
      }
    }

    // 返回默认设置
    return {
      theme: 'light',
      language: 'zh-CN',
      notifications: {
        email: true,
        browser: true,
        testCompletion: true
      }
    };
  }

  async updateUserSettings(settings: any): Promise<boolean> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        const response = await remoteApi.updateUserSettings(settings);
        return response.success;
      } catch (error) {
        console.warn('远程 API 更新设置失败:', error);
      }
    }

    // 本地存储设置
    try {
      localStorage.setItem('test_web_app_settings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('本地存储设置失败:', error);
      return false;
    }
  }

  async getUserTests(): Promise<any[]> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        const response = await remoteApi.getUserTests();
        if (response.success && response.data) {
          return response.data.tests || [];
        }
      } catch (error) {
        console.warn('远程 API 获取测试历史失败:', error);
      }
    }

    // 返回本地测试历史
    try {
      const localTests = localStorage.getItem('test_web_app_test_history');
      return localTests ? JSON.parse(localTests) : [];
    } catch (error) {
      console.error('获取本地测试历史失败:', error);
      return [];
    }
  }

  async getUserStats(): Promise<any> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        const response = await remoteApi.getUserStats();
        if (response.success && response.data) {
          return response.data.stats;
        }
      } catch (error) {
        console.warn('远程 API 获取统计失败:', error);
      }
    }

    // 返回默认统计
    return {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      averageResponseTime: 0,
      lastTestDate: null
    };
  }

  // 管理员功能（仅远程 API）
  async getAdminDashboard(): Promise<any> {
    if (!this.useRemoteApi) {
      throw new Error('管理员功能仅在浏览器版本中可用');
    }

    const remoteApi = await getRemoteApiService();
    const response = await remoteApi.getAdminDashboard();
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || '获取管理员面板数据失败');
  }

  async getAdminUsers(page = 1, limit = 20): Promise<any> {
    if (!this.useRemoteApi) {
      throw new Error('用户管理功能仅在浏览器版本中可用');
    }

    const remoteApi = await getRemoteApiService();
    const response = await remoteApi.getAdminUsers(page, limit);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || '获取用户列表失败');
  }

  async createUser(userData: any): Promise<User> {
    if (!this.useRemoteApi) {
      throw new Error('用户创建功能仅在浏览器版本中可用');
    }

    const remoteApi = await getRemoteApiService();
    const response = await remoteApi.createUser(userData);
    if (response.success && response.data) {
      return response.data.user;
    }
    throw new Error(response.error || '创建用户失败');
  }

  async updateUser(userId: string, userData: any): Promise<User> {
    if (!this.useRemoteApi) {
      throw new Error('用户更新功能仅在浏览器版本中可用');
    }

    const remoteApi = await getRemoteApiService();
    const response = await remoteApi.updateUser(userId, userData);
    if (response.success && response.data) {
      return response.data.user;
    }
    throw new Error(response.error || '更新用户失败');
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.useRemoteApi) {
      throw new Error('用户删除功能仅在浏览器版本中可用');
    }

    const remoteApi = await getRemoteApiService();
    const response = await remoteApi.deleteUser(userId);
    if (!response.success) {
      throw new Error(response.error || '删除用户失败');
    }
  }

  // 系统信息
  async getSystemInfo(): Promise<any> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        const response = await remoteApi.getSystemInfo();
        if (response.success) {
          return response.data;
        }
      } catch (error) {
        console.warn('获取系统信息失败:', error);
      }
    }

    return {
      name: 'Test Web App',
      version: '2.0.0',
      environment: isDesktopEnvironment() ? 'desktop' : 'browser',
      features: [
        'User Authentication',
        'Test Execution',
        'Data Analytics'
      ]
    };
  }

  // 健康检查
  async checkHealth(): Promise<boolean> {
    if (this.useRemoteApi) {
      try {
        const remoteApi = await getRemoteApiService();
        const response = await remoteApi.getHealth();
        return response.success;
      } catch (error) {
        console.warn('健康检查失败:', error);
        return false;
      }
    }
    return true; // 本地环境总是健康的
  }
}

export const unifiedApiService = new UnifiedApiService();
export default UnifiedApiService;
