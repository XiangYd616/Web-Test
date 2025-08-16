/**
 * 增强认证管理器
 * 实现JWT token自动刷新、多因素认证、会话管理和密码安全机制
 * 版本: v2.0.0
 */

import { jwtDecode    } from 'jwt-decode';import type { AuthResponse, User  } from '../../types/unified/models';import { defaultErrorHandler    } from '../unified/apiErrorHandler';// ==================== 类型定义 ==================== ''
export interface AuthConfig     {
  // Token配置
  accessTokenExpiry: number; // 访问token过期时间（秒）
  refreshTokenExpiry: number; // 刷新token过期时间（秒）
  autoRefreshThreshold: number; // 自动刷新阈值（秒）

  // 会话配置
  maxConcurrentSessions: number; // 最大并发会话数
  sessionTimeout: number; // 会话超时时间（秒）
  enableSessionTracking: boolean; // 启用会话追踪

  // 安全配置
  enableDeviceFingerprinting: boolean; // 启用设备指纹
  enableSecureStorage: boolean; // 启用安全存储
  requireMFA: boolean; // 要求多因素认证

  // 密码策略
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // 密码最大使用天数
    preventReuse: number; // 防止重复使用的历史密码数量
  };

  // API配置
  apiBaseUrl: string;
  endpoints: {
    login: string;
    refresh: string;
    logout: string;
    mfa: string;
    sessions: string;
  };
}

export interface SessionInfo     {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  createdAt: string;
  lastActivityAt: string;
  isActive: boolean;
  isCurrent: boolean;
}

export interface MFAChallenge     {
  type: 'sms' | 'email' | 'totp' | 'backup';
  challengeId: string;
  expiresAt: string;
  maskedTarget?: string; // 如 '***@example.com' 或 '***1234';
}

export interface MFAVerification     {
  challengeId: string;
  code: string;
  trustDevice?: boolean;
}

export interface PasswordStrength     {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    specialChars: boolean;
  };
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: AuthConfig  = {
  accessTokenExpiry: 900, // 15分钟
  refreshTokenExpiry: 604800, // 7天
  autoRefreshThreshold: 300, // 5分钟前自动刷新

  maxConcurrentSessions: 5,
  sessionTimeout: 3600, // 1小时
  enableSessionTracking: true,

  enableDeviceFingerprinting: true,
  enableSecureStorage: true,
  requireMFA: false,

  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // 90天
    preventReuse: 5
  },

  apiBaseUrl: '/api','
  endpoints: {
    login: '/auth/login','
    refresh: '/auth/refresh','
    logout: '/auth/logout','
    mfa: '/auth/mfa','
    sessions: '/auth/sessions';
  }
};
// ==================== 增强认证管理器 ====================

export class AuthManager {
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
    
    const errorType = error.name || 'UnknownError';
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics: ', {'
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
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);`
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  private config: AuthConfig;
  private refreshTimer?: NodeJS.Timeout;
  private sessionCheckTimer?: NodeJS.Timeout;
  private deviceFingerprint?: string;

  // 事件监听器
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeDeviceFingerprint();
    this.startSessionMonitoring();
  }

  // ==================== 事件系统 ====================

  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // ==================== 设备指纹 ====================

  private async initializeDeviceFingerprint() {
    if (!this.config.enableDeviceFingerprinting) return;

    try {
      const fingerprint = await this.generateDeviceFingerprint();
      this.deviceFingerprint = fingerprint;
    } catch (error) {
      console.warn("Failed to generate device fingerprint: ', error);'`
    }
  }

  private async generateDeviceFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,'
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || '','
      navigator.deviceMemory?.toString() || '';
    ];

    // 添加Canvas指纹
    try {
      const canvas = document.createElement('canvas');'
      const ctx = canvas.getContext('2d');'
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint test', 2, 2);'
        components.push(canvas.toDataURL());
      }
    } catch (error) {
      // Canvas指纹生成失败，继续使用其他组件
    }

    const fingerprint = components.join('|');'
    // 生成哈希
    if (crypto.subtle) {
      
        const encoder = new TextEncoder();
      const data = encoder.encode(fingerprint);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);'
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');'
      } else {
      // 降级到简单哈希
      return btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, "').substring(0, 32);'
    }
  }

  // ==================== Token管理 ====================

  async login(credentials: { email: string; password: string; rememberMe?: boolean }): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}${this.config.endpoints.login}`, {`
        method: "POST','`
        headers: {
          'Content-Type': 'application/json','
          ...(this.deviceFingerprint && { 'X-Device-Fingerprint': this.deviceFingerprint })'
        },
        body: JSON.stringify({
          ...credentials,
          deviceInfo: await this.getDeviceInfo()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '登录失败');'
      }

      if (data.success) {
        
        // 检查是否需要MFA
        if (data.requireMFA) {
          this.emit('mfaRequired', data.mfaChallenge);'
          return {
            success: false,
            requireMFA: true,
            mfaChallenge: data.mfaChallenge,
            message: '需要多因素认证';
      };
        }

        // 存储tokens
        await this.storeTokens(data.token, data.refreshToken);

        // 启动自动刷新
        this.startAutoRefresh();

        this.emit('loginSuccess', data.user);'
        return {
          success: true,
          user: data.user,
          token: data.token,
          message: '登录成功';
        };
      } else {
        throw new Error(data.message || '登录失败');'
      }
    } catch (error) {
      const processedError = await defaultErrorHandler.handleError(error);
      this.emit('loginError', processedError);'
      return {
        success: false,
        message: processedError.userMessage,
        errors: { general: processedError.userMessage }
      };
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');'
      }

      const response = await fetch(`${this.config.apiBaseUrl}${this.config.endpoints.refresh}`, {`
        method: "POST','`
        headers: {
          'Content-Type': 'application/json','
          "Authorization': `Bearer ${refreshToken}`,'`
          ...(this.deviceFingerprint && { "X-Device-Fingerprint': this.deviceFingerprint })'`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Token refresh failed');'
      }

      if (data.success) {
        
        await this.storeTokens(data.token, data.refreshToken);
        this.emit('tokenRefreshed', data.token);'
        return true;
      } else {
        throw new Error(data.message || 'Token refresh failed');'
      }
    } catch (error) {
      console.error('Token refresh failed: ', error);'
      this.emit('tokenRefreshFailed', error);'
      await this.logout();
      return false;
    }
  }

  private startAutoRefresh() {
    this.stopAutoRefresh();

    const checkAndRefresh = async () => {
      const token = await this.getAccessToken();
      if (!token) return;

      try {
        const decoded = jwtDecode(token);
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = (decoded.exp || 0) - now;

        if (timeUntilExpiry <= this.config.autoRefreshThreshold) {
          await this.refreshToken();
        }
      } catch (error) {
        console.error('Auto refresh check failed: ', error);'
      }
    };

    // 每分钟检查一次
    this.refreshTimer = setInterval(checkAndRefresh, 60000);

    // 立即检查一次
    checkAndRefresh();
  }

  private stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  // ==================== 多因素认证 ====================

  async verifyMFA(verification: MFAVerification): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}${this.config.endpoints.mfa}/verify`, {`
        method: "POST','`
        headers: {
          'Content-Type': 'application/json','
          ...(this.deviceFingerprint && { 'X-Device-Fingerprint': this.deviceFingerprint })'
        },
        body: JSON.stringify(verification)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'MFA verification failed');'
      }

      if (data.success) {
        
        await this.storeTokens(data.token, data.refreshToken);
        this.startAutoRefresh();
        this.emit('mfaSuccess', data.user);'
        return {
          success: true,
          user: data.user,
          token: data.token,
          message: 'MFA验证成功';
      };
      } else {
        throw new Error(data.message || 'MFA验证失败');'
      }
    } catch (error) {
      const processedError = await defaultErrorHandler.handleError(error);
      this.emit('mfaError', processedError);'
      return {
        success: false,
        message: processedError.userMessage,
        errors: { code: processedError.userMessage }
      };
    }
  }

  async requestMFAChallenge(type: 'sms' | "email'): Promise<{ success: boolean; message: string }> {'
    try {
      const response = await fetch(`${this.config.apiBaseUrl}${this.config.endpoints.mfa}/challenge`, {`
        method: "POST','`
        headers: {
          'Content-Type': 'application/json';
        },
        body: JSON.stringify({ type })
      });

      const data = await response.json();
      return {
        success: data.success,
        message: data.message || (data.success ? '验证码已发送' : '发送失败')'
      };
    } catch (error) {
      return {
        success: false,
        message: '发送验证码失败，请稍后重试';
      };
    }
  }

  // ==================== 会话管理 ====================

  async getSessions(): Promise<SessionInfo[]> {
    try {
      const token = await this.getAccessToken();
      if (!token) return [];

      const response = await fetch(`${this.config.apiBaseUrl}${this.config.endpoints.sessions}`, {`
        headers: {
          "Authorization': `Bearer ${token}`'`
        }
      });

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error("Failed to get sessions: ', error);'`
      return [];
    }
  }

  async terminateSession(sessionId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) return false;

      const response = await fetch(`${this.config.apiBaseUrl}${this.config.endpoints.sessions}/${sessionId}`, {`
        method: "DELETE','`
        headers: {
          "Authorization': `Bearer ${token}`'`
        }
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Failed to terminate session: ', error);'`
      return false;
    }
  }

  async terminateAllOtherSessions(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) return false;

      const response = await fetch(`${this.config.apiBaseUrl}${this.config.endpoints.sessions}/terminate-others`, {`
        method: "POST','`
        headers: {
          "Authorization': `Bearer ${token}`'`
        }
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Failed to terminate other sessions: ', error);'`
      return false;
    }
  }

  private startSessionMonitoring() {
    if (!this.config.enableSessionTracking) return;

    this.sessionCheckTimer = setInterval(async () => {
      const token = await this.getAccessToken();
      if (token) {
        // 检查会话是否仍然有效
        try {
          const response = await fetch(`${this.config.apiBaseUrl}${this.config.endpoints.sessions}/current`, {`
            headers: {
              'Authorization': `Bearer ${token}`'`
            }
          });

          if (!response.ok) {
            this.emit("sessionExpired');'`
            await this.logout();
          }
        } catch (error) {
          // 网络错误，不强制登出
        }
      }
    }, 60000); // 每分钟检查一次
  }

  // ==================== 密码安全 ====================

  validatePasswordStrength(password: string): PasswordStrength {
    const policy = this.config.passwordPolicy;
    const feedback: string[]  = [];
    const requirements = {
      length: password.length >= policy.minLength,
      uppercase: policy.requireUppercase ? /[A-Z]/.test(password) : true,
      lowercase: policy.requireLowercase ? /[a-z]/.test(password) : true,
      numbers: policy.requireNumbers ? //d/.test(password) : true,
        specialChars : policy.requireSpecialChars ? /[!@#$%^&*(),.?':{}|<>]/.test(password) : true'
    };

    let score = 0;

    if (!requirements.length) {
      feedback.push(`密码长度至少需要${policy.minLength}个字符`);`
    } else {
      score += 1;
    }

    if (!requirements.uppercase) {
      feedback.push("密码需要包含大写字母');'`
    } else {
      score += 1;
    }

    if (!requirements.lowercase) {
      feedback.push('密码需要包含小写字母');'
    } else {
      score += 1;
    }

    if (!requirements.numbers) {
      feedback.push('密码需要包含数字');'
    } else {
      score += 1;
    }

    if (!requirements.specialChars) {
      feedback.push('密码需要包含特殊字符');'
    } else {
      score += 1;
    }

    // 检查常见弱密码模式
    const commonPatterns = [
      /^123456/,
      /^password/i,
      /^qwerty/i,
      /^admin/i,
      /(.)\1{2,}/ // 重复字符
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      feedback.push('密码过于简单，请使用更复杂的密码');'
      score = Math.max(0, score - 2);
    }

    const isValid = Object.values(requirements).every(req => req) && feedback.length === 0;

    return {
      score: Math.min(4, score),
      feedback,
      isValid,
      requirements
    };
  }

  // ==================== 存储管理 ====================

  private async storeTokens(accessToken: string, refreshToken: string) {
    if (this.config.enableSecureStorage && 'crypto' in window && crypto.subtle) {'
      // 使用加密存储
      const encryptedAccess = await this.encryptData(accessToken);
      const encryptedRefresh = await this.encryptData(refreshToken);

      localStorage.setItem('auth_access_token_enc', encryptedAccess);'
      localStorage.setItem('auth_refresh_token_enc', encryptedRefresh);'
    } else {
      // 普通存储
      localStorage.setItem('auth_access_token', accessToken);'
      localStorage.setItem('auth_refresh_token', refreshToken);'
    }
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.config.enableSecureStorage) {
      
        const encrypted = localStorage.getItem('auth_access_token_enc');'
      return encrypted ? await this.decryptData(encrypted) : null;
      } else {
      return localStorage.getItem('auth_access_token');'
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    if (this.config.enableSecureStorage) {
      
        const encrypted = localStorage.getItem('auth_refresh_token_enc');'
      return encrypted ? await this.decryptData(encrypted) : null;
      } else {
      return localStorage.getItem('auth_refresh_token');'
    }
  }

  private async encryptData(data: string): Promise<string> {
    // 简化的加密实现，实际项目中应使用更强的加密
    return btoa(data);
  }

  private async decryptData(encryptedData: string): Promise<string> {
    // 简化的解密实现
    return atob(encryptedData);
  }

  // ==================== 工具方法 ====================

  private async getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      fingerprint: this.deviceFingerprint
    };
  }

  async logout(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      if (token) {
        await fetch(`${this.config.apiBaseUrl}${this.config.endpoints.logout}`, {`
          method: "POST','`
          headers: {
            'Authorization': `Bearer ${token}`'`
          }
        });
      }
    } catch (error) {
      console.error("Logout request failed: ', error);'`
    } finally {
      // 清理本地数据
      this.stopAutoRefresh();
      if (this.sessionCheckTimer) {
        clearInterval(this.sessionCheckTimer);
      }

      localStorage.removeItem('auth_access_token');'
      localStorage.removeItem('auth_refresh_token');'
      localStorage.removeItem('auth_access_token_enc');'
      localStorage.removeItem('auth_refresh_token_enc');'
      this.emit('logout');'
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);
      return (decoded.exp || 0) > now;
    } catch (error) {
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const decoded = jwtDecode(token) as any;
      return {
        id: decoded.sub || decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        plan: decoded.plan
      } as User;
    } catch (error) {
      return null;
    }
  }

  // 清理资源
  destroy() {
    this.stopAutoRefresh();
    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
    }
    this.eventListeners.clear();
  }
}

// ==================== 默认实例 ====================

export const authManager = new AuthManager();

export default AuthManager;
