/**
 * 服务类型定义
 * 版本: v2.0.0
 */

// 注释：由于 '../types/api' 和 '@shared/types' 导出相同的类型，我们只导出一个来源
// 如需使用这些类型，请直接从 '@/types' 导入
// export type * from '../types/api';
// export type * from '@shared/types';

// 选择性导出以避免与unified/models的冲突
export type {
    TestStatus as EnumTestStatus,
    TestType as EnumTestType,
    UserRole as EnumUserRole,
    UserStatus as EnumUserStatus,
    Language,
    Theme
} from '../types/enums';

// 选择性导出以避免冲突
export type {
    User as ServiceUser,
    UserPreferences as ServiceUserPreferences,
    UserProfile as ServiceUserProfile
} from '../types/user';

export type {
    ProjectStatus as ServiceProjectStatus,
    ProjectType as ServiceProjectType
} from '../types/project';

export type {
    LogLevel as ServiceLogLevel,
    SystemStatus as ServiceSystemStatus
} from '../types/system';

