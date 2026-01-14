/**
 * 认证数据访问层
 * 封装所有认证相关的API调用
 */

import { apiClient } from '../api/client';
import { User } from './userRepository';

/**
 * 登录凭据
 */
export interface LoginCredentials {
  username: string;
  password: string;
  remember?: boolean;
}

/**
 * 注册数据
 */
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * 认证响应
 */
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
  expiresIn?: number;
}

/**
 * MFA设置
 */
export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * 认证Repository类
 */
export class AuthRepository {
  private readonly basePath = '/auth';

  /**
   * 登录
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(`${this.basePath}/login`, credentials);
  }

  /**
   * 注册
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(`${this.basePath}/register`, data);
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    return apiClient.post<void>(`${this.basePath}/logout`);
  }

  /**
   * 刷新Token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(`${this.basePath}/refresh`, { refreshToken });
  }

  /**
   * 验证Token
   */
  async verifyToken(): Promise<{ valid: boolean; user?: User }> {
    return apiClient.get<{ valid: boolean; user?: User }>(`${this.basePath}/verify`);
  }

  /**
   * 请求密码重置
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`${this.basePath}/password-reset/request`, { email });
  }

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`${this.basePath}/password-reset/confirm`, {
      token,
      newPassword
    });
  }

  /**
   * 启用MFA
   */
  async enableMFA(): Promise<MFASetup> {
    return apiClient.post<MFASetup>(`${this.basePath}/mfa/enable`);
  }

  /**
   * 确认MFA设置
   */
  async confirmMFA(code: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`${this.basePath}/mfa/confirm`, { code });
  }

  /**
   * 禁用MFA
   */
  async disableMFA(code: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`${this.basePath}/mfa/disable`, { code });
  }

  /**
   * 验证MFA代码
   */
  async verifyMFA(code: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(`${this.basePath}/mfa/verify`, { code });
  }

  /**
   * 获取备份码
   */
  async getBackupCodes(): Promise<{ codes: string[] }> {
    return apiClient.get<{ codes: string[] }>(`${this.basePath}/mfa/backup-codes`);
  }

  /**
   * 重新生成备份码
   */
  async regenerateBackupCodes(): Promise<{ codes: string[] }> {
    return apiClient.post<{ codes: string[] }>(`${this.basePath}/mfa/backup-codes/regenerate`);
  }

  /**
   * 检查用户名是否可用
   */
  async checkUsername(username: string): Promise<{ available: boolean }> {
    return apiClient.get<{ available: boolean }>(`${this.basePath}/check-username`, {
      params: { username }
    });
  }

  /**
   * 检查邮箱是否可用
   */
  async checkEmail(email: string): Promise<{ available: boolean }> {
    return apiClient.get<{ available: boolean }>(`${this.basePath}/check-email`, {
      params: { email }
    });
  }

  /**
   * 发送验证邮件
   */
  async sendVerificationEmail(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`${this.basePath}/verify-email/send`);
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`${this.basePath}/verify-email/confirm`, { token });
  }
}

/**
 * 导出单例
 */
export const authRepository = new AuthRepository();

/**
 * 默认导出
 */
export default authRepository;
