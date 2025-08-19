export type {
  Email,
  Timestamp,
  URL,
  UUID
} from "./common";

export {
  Language,
  TestGrade,
  TestPriority,
  TestStatus,
  TestType,
  ThemeMode,
  Timezone,
  UserPlan,
  UserRole,
  UserStatus
} from "./enums";

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
} from "./user";

export type {
  TestConfig,
  TestResult,
  TestSession,
  TestEngine,
  TestQueue,
  TestSchedule,
  TestReport,
  TestMetrics,
  BatchTestConfig,
  BatchTestResult,
  PerformanceTestConfig,
  ContentTestConfig,
  SecurityTestConfig,
  APITestConfig
} from "./test";

export type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  ValidationError,
  ErrorCode,
  ErrorSeverity
} from "./unified/apiResponse";

export type {
  SystemStats,
  AdminDashboard,
  UserManagement,
  UserBulkAction,
  SystemTask,
  SystemConfig,
  SystemLog,
  SystemAlert,
  BackupInfo,
  AdminUser
} from "./admin";

export interface BaseModel {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  pagination?: PaginationParams;
}

export interface ModelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateModel(model: any, rules: Record<string, any>): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation logic
  if (!model.id) {
    errors.push("ID is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function createPaginationParams(
  page: number = 1,
  limit: number = 20,
  sortBy?: string,
  sortOrder: "asc" | "desc" = "asc"
): PaginationParams {
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    sortBy,
    sortOrder
  };
}

export function createSearchParams(
  query?: string,
  filters?: Record<string, any>,
  pagination?: PaginationParams
): SearchParams {
  return {
    query,
    filters,
    pagination: pagination || createPaginationParams()
  };
}

// 类型不需要默认导出
