export type {
  AuthResponse,
  ChangePasswordData,
  CreateUserData,
  LoginCredentials,
  RegisterData,
  UpdateUserData,
  User,
  UserActivityLog,
  UserPreferences,
  UserProfile,
  UserSession,
  UserStats
} from "../user";

export {
  UserRole,
  UserStatus
} from "../enums";

// export type {
//   ApiError,
//   ApiResponse,
//   PaginatedResponse,
//   PaginationInfo
// } from "../api";

// export type {
//   TestConfig,
//   TestPriority,
//   TestResult,
//   TestStatus,
//   TestType,
//   Timestamp,
//   UUID
// } from "../common";

export type {
  Language,
  TestPriority as TestPriorityEnum,
  TestStatus as TestStatusEnum,
  TestType as TestTypeEnum,
  ThemeMode,
  Timezone,
  UserRole as UserRoleEnum,
  UserStatus as UserStatusEnum
} from "../enums";

export type {
  AdminDashboard, SystemConfig, SystemStats, UserManagement
} from "../admin";

export interface UnifiedModels {
  User: any; // User;
  TestResult: any; // TestResult;
  ApiResponse: any; // ApiResponse;
  SystemStats: any; // SystemStats;
}

// ���Ͳ���ҪĬ�ϵ���
