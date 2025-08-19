/**
 * 用户类型定义 - 重新导出统一类型
 * 此文件已迁移到统一类型定义系统，现在只重新导出统一类型
 * 版本: v2.0.0 - 使用统一类型定义
 */

// 重新导出统一的用户类型定义
export type {
  AuthResponse, fromDatabaseFields, LoginCredentials,
  RegisterData, toDatabaseFields, User, UserDatabaseFields, UserPlan, UserPreferences, UserProfile, UserRole, UserSession, UserStatus
} from '../../types/unified/models';

// 扩展类型定义（服务层特有的类型）
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserUpdateData {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  department?: string;
  phone?: string;
  timezone?: string;
  avatar?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
