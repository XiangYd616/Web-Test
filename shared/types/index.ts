/**
 * 统一类型系统 - 主入口文件
 *
 * 本文件作为整个项目类型定义的统一入口，
 * 避免类型定义分散和重复的问题
 */

// =============================================================================
// 基础类型
// =============================================================================
export * from './base.types';
// common.types 已包含在 base.types 中，避免重复导出
// export * from './common.types';

// =============================================================================
// API 相关类型
// =============================================================================
// 显式导出 api.types，排除与 base.types 冲突的类型
export type {
  FilterParams as ApiFilterParams,
  PaginatedResponse as ApiPaginatedResponse,
  PaginationParams as ApiPaginationParams,
  ApiRequest,
  ApiResponse,
  TestProgress as ApiTestProgress,
  TestResult as ApiTestResult,
  AuthCredentials,
  AuthResponse,
  AuthToken,
  ErrorResponse,
  TestOptions,
  TestRequest,
  User,
  UserRole,
  UserSettings,
} from './api.types';

// ErrorCode 是 enum，需要作为值导出（不能用 export type）
export { ErrorCode } from './api.types';

// TestType 和 TestStatus 在本文件中重新定义（第 48-74 行），不从 api.types 导出
// apiResponse.types 已包含在 api.types 中
// export * from './apiResponse.types';

// =============================================================================
// 测试相关类型
// =============================================================================

// 核心测试类型枚举
export enum TestType {
  WEBSITE = 'website',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  SEO = 'seo',
  API = 'api',
  ACCESSIBILITY = 'accessibility',
  STRESS = 'stress',
}

// 测试状态枚举
export enum TestStatus {
  IDLE = 'idle',
  PREPARING = 'preparing',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

// 测试优先级
export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 显式导出 test.types，排除与 index.ts 中已定义的 TestType 和 TestStatus
export type { TestConfig } from './test.types';

// testResult.types 已包含在 test.types 中
// export * from './testResult.types';

// 先导出 testHistory.types
export * from './testHistory.types';

// 再导出 testEngine.types
// 注意: testEngine.types 也定义了 TestHistoryRecord，但会被 testHistory.types 的定义覆盖
// 这是预期的行为，因为 testHistory.types 的定义更通用
// 如果需要 testEngine 特定的 TestHistoryRecord，请直接从 './testEngine.types' 导入
export * from './testEngine.types';

// =============================================================================
// 认证和用户类型
// =============================================================================
export * from './auth.types';
// user.types 已包含在 auth.types 中
// export * from './user.types';
export * from './rbac.types';

// =============================================================================
// 业务模型类型
// =============================================================================
// models.types 和 dataModels.types 有重复，只导出 models.types
// 显式导出 models.types，排除与 base.types 冲突的类型
export type {
  BaseModel,
  FilterParams as ModelsFilterParams,
  PaginatedResponse as ModelsPaginatedResponse,
  PaginationParams as ModelsPaginationParams,
  QueryParams as ModelsQueryParams,
  SortParams as ModelsSortParams,
} from './models.types';
// export * from './dataModels.types';
export * from './project.types';

// =============================================================================
// 系统和管理类型
// =============================================================================
export * from './admin.types';
export * from './performance.types';
export * from './system.types';

// =============================================================================
// UI 和组件类型
// =============================================================================
export * from './ui.types';
// theme.types 已包含在 ui.types 中
// export * from './theme.types';

// =============================================================================
// 版本和兼容性类型
// =============================================================================
export * from './compatibility.types';
export * from './version.types';

// =============================================================================
// 工具类型
// =============================================================================

/**
 * 常用工具类型
 */
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;
export type EmptyObject = Record<string, never>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

/**
 * 数据状态类型
 */
export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

/**
 * 分页数据类型
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * API 响应基础类型
 * 注意：ApiResponse 和 ErrorResponse 已从 api.types 导出，此处不再重复定义
 */
export interface BaseApiResponse {
  success: boolean;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface SuccessResponse<T = any> extends BaseApiResponse {
  success: true;
  data: T;
}

// ErrorResponse 和 ApiResponse 已在第 20-22 行从 api.types 导出
// 此处注释掉重复定义以避免冲突
// export interface ErrorResponse extends BaseApiResponse {
//   success: false;
//   error: {
//     code: string;
//     message: string;
//     details?: any;
//   };
// }
//
// export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Additional API types
export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export interface RequestConfig extends ApiRequestConfig {
  method?: string;
  baseURL?: string;
  url?: string;
  data?: any;
}

export interface TestCallbacks {
  onProgress?: (progress: number, stage: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface TestExecutionConfig {
  testType: string;
  target: string;
  options?: any;
  callbacks?: TestCallbacks;
}

export type TestTypeValue = string;

export interface TestExecution {
  id: string;
  testType: string;
  status: string;
  startTime: string;
  endTime?: string;
  result?: any;
  error?: string;
}
