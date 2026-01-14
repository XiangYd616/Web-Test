/**
 * 服务类型定义
 * 版本: v2.0.0
 */

// 重新导出所有类型，使用统一的 API 类型
export * from '../types/api';

// 选择性导出以避免与unified/models的冲突
export type {
  TestStatus as EnumTestStatus,
  TestType as EnumTestType,
  UserRole as EnumUserRole,
  UserStatus as EnumUserStatus,
  Language,
  Theme,
} from '../types/enums';

// 选择性导出以避免冲突 - 从统一模型导出
export type {
  User as ServiceUser,
  UserPreferences as ServiceUserPreferences,
  UserProfile as ServiceUserProfile,
} from '../types/unified/models';

export type {
  ProjectStatus as ServiceProjectStatus,
  ProjectType as ServiceProjectType,
} from '../types/project';

export type {
  LogLevel as ServiceLogLevel,
  SystemStatus as ServiceSystemStatus,
} from '../types/system';
