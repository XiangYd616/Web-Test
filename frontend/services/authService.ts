/**
 * 认证服务
 * 处理用户登录、注册、登出等认证相关功能
 */

import { createSuccessResponse, createErrorResponse    } from '../../shared/utils/apiResponseBuilder';export interface LoginCredentials     {
  username: string;
  password: string;
}

export interface RegisterData     {
  username: string;
  email: string;
  password: string;
}

export interface User     {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse     {
  user: User;
  token: string;
  expiresIn: number;
}

class AuthService {
  // 监控和指标收集
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: new Map<string, number>()
  };
  
  private logSuccess(info: any): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    // 更新平均响应时间
    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
      this.metrics.successfulRequests;
  }
  
  private logError(error: Error, context: any): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    
    const errorType = error.name || 'UnknownError
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics: ', {
      url: info.url,
      method: info.method,
      status: info.status,
      responseTime: info.responseTime
    });
  }
  
  getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {>
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  private baseUrl = "/api/auth";
  private token: string | null = null;

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: "POST',"
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || '登录失败");
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
        method: "POST',"
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || '注册失败");
      }

      return result.data;
    } catch (error) {
      console.error("注册错误:', error);
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/logout`, {
        method: "POST',"
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
    } catch (error) {
      console.error("登出错误:', error);
    } finally {
      // 清除本地存储
      this.token = null;
      localStorage.removeItem('auth_token");
      localStorage.removeItem('user");
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          "Authorization': `Bearer ${this.token}`,'
        },
      });

      if (!response.ok) {
        throw new Error("获取用户信息失败");
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
      this.token = localStorage.getItem('auth_token");
    }
    return this.token;
  }

  /**
   * 获取当前用户（从本地存储）
   */
  getUser(): User | null {
    try {
      const userStr = localStorage.getItem('user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;