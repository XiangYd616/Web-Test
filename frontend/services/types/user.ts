/**
 * 用户类型定义 - 重新导出类型
 * 此文件已迁移到类型定义系统，现在只重新导出类型
 * 版本: v2.0.0 - 使用类型定义
 */

// 重新导出的用户类型定义
export type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  UserPreferences,
  UserProfile,
} from '../../types/auth/models';

// 从枚举中导入用户相关枚举
export { UserRole } from '../../types/enums';

// 注释掉不存在的类型导入
// fromDatabaseFields, toDatabaseFields, UserDatabaseFields, UserPlan, UserSession, UserStatus

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
