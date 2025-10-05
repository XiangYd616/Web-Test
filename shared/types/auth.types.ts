/**
 * auth.types.ts - 认证相关类型定义
 */

import { Email } from './common.types';

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: Email;
  password: string;
  confirmPassword?: string;
  agreeTerm?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: any;
  token?: string;
  refreshToken?: string;
  message?: string;
  error?: string;
}

export interface UserSession {
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: number;
  createdAt: number;
}

