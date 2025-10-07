/**
 * 统一类型导出索引
 * 集中管理所有类型定义，便于导入和维护
 * 
 * 使用方式:
 * import { TestConfig, TestResult, UserProfile } from '@/types';
 * 
 * @version 2.0
 * @updated 2025-10-07
 */

// ==================== 核心通用类型 ====================
export type {
  // 基础类型
  StressTestRecord,
  TestMetrics,
  TestResults,
  TestSummary,
  TestProgress,
  TestConfig,
  TestRecordQuery,
  TestHistory,
  // 用户类型
  User,
  UserProfile,
  UserPreferences,
  // 认证类型
  LoginCredentials,
  RegisterData,
  AuthResponse,
  // API类型
  APIResponse,
  APIError,
  FlexibleObject,
  // 实时数据类型
  RealTimeMetrics,
  QueueStats,
  ProgressListener,
  SecurityTestProgress
} from './common';

// ==================== 测试相关类型 ====================
export type {
  TestType,
  TestStatus,
  TestResult as TestResultType,
  TestRecord
} from './test';

// Re-export TestResult for backward compatibility
export type { TestResult } from './testResult.types';

// Export specific test configuration types
export interface CompatibilityTestConfig {
  browsers?: string[];
  devices?: string[];
  url?: string;
  [key: string]: any;
}

export interface CompatibilityTestResult {
  browser?: string;
  device?: string;
  status?: string;
  issues?: any[];
  [key: string]: any;
}

export interface NetworkTestConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  timeout?: number;
  [key: string]: any;
}

export interface NetworkTestResult {
  latency?: number;
  bandwidth?: number;
  status?: string;
  [key: string]: any;
}

export interface DatabaseTestConfig {
  connection?: string;
  queries?: string[];
  [key: string]: any;
}

export interface DatabaseTestResult {
  queryTime?: number;
  rowCount?: number;
  status?: string;
  [key: string]: any;
}

export interface DatabaseTestHook {
  runTest: () => Promise<void>;
  loading: boolean;
  error?: Error | null;
  result?: DatabaseTestResult;
}

export interface NetworkTestHook {
  runTest: () => Promise<void>;
  loading: boolean;
  error?: Error | null;
  result?: NetworkTestResult;
}

export interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  [key: string]: any;
}

// ==================== Hook类型 ====================
export type {
  // API测试Hook
  APITestConfig,
  APITestResult,
  APITestHook,
  APIEndpoint as APITestEndpoint,
  APITestState,
  APITestActions,
  // 兼容性测试Hook
  CompatibilityTestConfig as CompatibilityTestHookConfig,
  CompatibilityTestResult as CompatibilityTestHookResult,
  CompatibilityTestHook,
  // UX测试Hook
  UXTestConfig,
  UXTestResult,
  UXTestHook,
  // 网络测试Hook
  NetworkTestConfig as NetworkTestHookConfig,
  NetworkTestResult as NetworkTestHookResult,
  NetworkTestHook as NetworkTestHookImported,
  // 数据库测试Hook
  DatabaseTestConfig as DatabaseTestHookConfig,
  DatabaseTestResult as DatabaseTestHookResult,
  DatabaseTestHook as DatabaseTestHookImported
} from './hooks/testState.types';

// ==================== 扩展类型导出 ====================
// 注意：避免使用通配符导出以防止类型冲突
// 所需的类型已经通过上面的特定导出进行了处理

// 认证授权类型 - 已通过 common 导出
// export type * from './auth.types';

// API响应类型 - 已通过 common 导出 APIResponse, APIError
// export type * from './api.types';
// export type * from './apiResponse.types';

// 数据模型类型 - 与 models.types 有冲突
// export type * from './dataModels.types';
// export type * from './models.types';

// 测试历史类型 - 已通过 common 导出 TestHistory
// export type * from './testHistory.types';
// export type * from './testResult.types';

// 用户相关类型 - 已通过 common 导出 User, UserProfile, UserPreferences
// export type * from './user.types';

// 管理后台类型
export type * from './admin.types';

// 通知类型
// export type * from './notification.types'; // 文件不存在

// 报告类型
// export type * from './report.types'; // 文件不存在

// 错误处理类型
export type * from './errors.types';

// 引擎类型 - 与其他有冲突
// export type * from './engine.types';

// 扩展API测试类型
export type * from './apiTestExtended.types';

// 性能类型 - 与 models.types 有冲突
// export type * from './performance.types';

// 安全类型
// export type * from './security.types'; // 文件不存在

// SEO类型
// export type * from './seo.types'; // 文件不存在

// 统一类型
export type * from './unified/testTypes';

// ==================== 类型守卫 ====================
/**
 * 类型守卫函数 - 用于运行时类型检查
 */
import type { TestResult as TR } from './testResult.types';
import type { UserProfile as UP } from './common';

export const isTestResult = (obj: any): obj is TR => {
  return obj && typeof obj === 'object' && 'id' in obj;
};

export const isUserProfile = (obj: any): obj is UP => {
  return obj && typeof obj === 'object' && 'id' in obj && 'email' in obj;
};

// ==================== 默认导出 ====================
import type * as CommonTypes from './common';
export default CommonTypes;

// ==================== 类型文件说明 ====================
/**
 * 类型文件组织结构:
 * 
 * 基础类型:
 * - common.d.ts - 通用类型声明
 * - base.types.ts - 基础类型定义
 * - enums.ts - 枚举类型
 * 
 * 业务类型:
 * - test.ts - 测试相关类型
 * - user.types.ts - 用户类型
 * - auth.types.ts - 认证类型
 * - api.types.ts - API类型
 * 
 * 特殊类型:
 * - *.d.ts - 全局类型声明文件（自动导入）
 */
