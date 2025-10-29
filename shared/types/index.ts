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
export * from './common.types';

// =============================================================================
// API 相关类型
// =============================================================================
export * from './api.types';
export * from './apiResponse.types';

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
  NETWORK = 'network',
  DATABASE = 'database',
  COMPATIBILITY = 'compatibility',
  ACCESSIBILITY = 'accessibility',
  UX = 'ux',
  STRESS = 'stress',
  CONTENT = 'content',
  INFRASTRUCTURE = 'infrastructure',
  DOCUMENTATION = 'documentation'
}

// 测试状态枚举
export enum TestStatus {
  IDLE = 'idle',
  PREPARING = 'preparing',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

// 测试优先级
export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export * from './test.types';
export * from './testEngine.types';
export * from './testResult.types';
export * from './testHistory.types';

// =============================================================================
// 认证和用户类型
// =============================================================================
export * from './auth.types';
export * from './user.types';
export * from './rbac.types';

// =============================================================================
// 业务模型类型
// =============================================================================
export * from './models.types';
export * from './dataModels.types';
export * from './project.types';

// =============================================================================
// 系统和管理类型
// =============================================================================
export * from './system.types';
export * from './admin.types';
export * from './performance.types';

// =============================================================================
// UI 和组件类型
// =============================================================================
export * from './ui.types';
export * from './theme.types';

// =============================================================================
// 版本和兼容性类型
// =============================================================================
export * from './version.types';
export * from './compatibility.types';

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
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
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

export interface ErrorResponse extends BaseApiResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

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

export interface UnifiedTestConfig {
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
