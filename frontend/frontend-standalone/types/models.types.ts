/**
 * 统一数据模型定义
 * 前后端共享的核心数据模型，确保类型一致性
 * 版本: v2.1.0 - 完善统一数据模型定义
 * 更新时间: 2025-08-08
 */

// ==================== 基础类型导出 ====================

// 重新导出基础类型
export type {
  Email, Timestamp,
  URL, UUID
} from './common';

// ==================== 枚举类型导出 ====================

// 重新导出所有枚举类型（只导出实际存在的枚举）
export {
  Language, TestGrade,
  TestPriority, TestStatus, TestType, ThemeMode, Timezone, UserPlan, UserRole,
  UserStatus
} from './enums';

// ==================== 用户相关类型导出 ====================

// 重新导出用户相关类型（仅导出存在的类型）
export type {
  ChangePasswordData, CreateUserData, LoginCredentials,
  RegisterData, UpdateUserData, User, UserPreferences, UserProfile, UserQuery, UserStats
} from './user';

// 从common.ts导入基础用户类型
export type {
  AuthResponse, UserSession
} from './common';

// 注释掉不存在的类型导入
// DEFAULT_USER_PREFERENCES, DEFAULT_USER_PROFILE, UserActivityLog, UserDatabaseFields, UserFilter,
// UserListQuery, fromDatabaseFields, toDatabaseFields

// ==================== API响应类型导出 ====================

// 重新导出API响应类型（仅导出存在的类型）
export type {
  ApiError, ApiErrorResponse, ApiResponse, ApiSuccessResponse, ErrorCode, PaginatedResponse,
  PaginationInfo, QueryParams, RequestConfig, ValidationError
} from './apiResponse';

// 注释掉不存在的类型导入
// ApiMeta, ApiResponseUtils, AuthConfig, CreatedResponse, ErrorResponseMethods,
// NoContentResponse, PaginatedRequest, ResponseBuilder

// ==================== 测试相关类型导出 ====================

// 测试相关枚举已在上面导出，这里只导出接口类型

// 重新导出测试相关接口类型（从统一类型系统导入）
export type {
  ApiTestConfig as APITestConfig,
  PerformanceTestConfig,
  SecurityTestConfig
} from './api/client.types';

// ContentTestConfig 已废弃，使用 UxTestConfig 替代
export type { UxTestConfig as ContentTestConfig } from './api/client.types';

/**
 * 测试配置接口
 */
export interface TestConfig {
  // 性能测试配置
  performance?: {
    users?: number;
    duration?: number;
    rampUpTime?: number;
    scenarios?: string[];
  };

  // API测试配置
  api?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: unknown;
    expectedStatus?: number[];
    timeout?: number;
  };

  // 内容测试配置
  content?: {
    checkSEO?: boolean;
    checkAccessibility?: boolean;
    checkPerformance?: boolean;
    checkSecurity?: boolean;
    checkMobile?: boolean;
    customKeywords?: string[];
  };

  // 压力测试配置
  stress?: {
    maxUsers: number;
    duration: number;
    rampUpTime?: number;
    scenarios?: string[];
  };

  // 安全测试配置
  security?: {
    checkSSL?: boolean;
    checkHeaders?: boolean;
    checkVulnerabilities?: boolean;
    customChecks?: string[];
  };

  // 兼容性测试配置
  compatibility?: {
    browsers?: string[];
    devices?: string[];
    viewports?: Array<{ width: number; height: number }>;
  };
}

/**
 * 测试结果接口
 */
export interface TestResult {
  // 基础信息
  id: string;
  testId: string;
  userId: string;

  // 测试配置
  type: string;
  url: string;
  config: unknown;

  // 执行状态
  status: string;
  startTime?: string;
  endTime?: string;
  duration?: number; // 毫秒

  // 结果数据
  results: unknown; // 具体结果数据，根据测试类型而定
  metrics: Record<string, number>; // 性能指标
  errors: Array<{
    type: string;
    message: string;
    details?: unknown;
  }>;

  // 元数据
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 测试历史接口
 */
export interface TestHistory {
  id: string;
  userId: string;
  testType: string;
  url: string;
  status: string;
  results?: TestResult;
  createdAt: string;
  updatedAt: string;
}

// ==================== 数据库映射接口 ====================

/**
 * 测试结果数据库字段映射
 */
export interface TestResultDatabaseFields {
  id: string;
  test_id: string;
  user_id: string;
  type: string;
  url: string;
  config: string; // JSON字符串
  status: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  results: string; // JSON字符串
  metrics: string; // JSON字符串
  errors: string; // JSON字符串
  metadata: string; // JSON字符串
  created_at: string;
  updated_at: string;
}

/**
 * 测试历史数据库字段映射
 */
export interface TestHistoryDatabaseFields {
  id: string;
  user_id: string;
  test_type: string;
  url: string;
  status: string;
  results?: string; // JSON字符串
  created_at: string;
  updated_at: string;
}

// ==================== 数据转换函数 ====================

/**
 * 将数据库字段转换为TestResult对象
 */
export function testResultFromDatabase(dbData: TestResultDatabaseFields): TestResult {
  return {
    id: dbData.id,
    testId: dbData.test_id,
    userId: dbData.user_id,
    type: dbData.type,
    url: dbData.url,
    config: JSON.parse(dbData.config || '{}'),
    status: dbData.status,
    startTime: dbData.start_time,
    endTime: dbData.end_time,
    duration: dbData.duration,
    results: JSON.parse(dbData.results || 'null'),
    metrics: JSON.parse(dbData.metrics || '{}'),
    errors: JSON.parse(dbData.errors || '[]'),
    metadata: JSON.parse(dbData.metadata || '{}'),
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at
  };
}

/**
 * 将TestResult对象转换为数据库字段
 */
export function testResultToDatabase(testResult: TestResult): TestResultDatabaseFields {
  return {
    id: testResult.id,
    test_id: testResult.testId,
    user_id: testResult.userId,
    type: testResult.type,
    url: testResult.url,
    config: JSON.stringify(testResult.config),
    status: testResult.status,
    start_time: testResult.startTime,
    end_time: testResult.endTime,
    duration: testResult.duration,
    results: JSON.stringify(testResult.results),
    metrics: JSON.stringify(testResult.metrics),
    errors: JSON.stringify(testResult.errors),
    metadata: JSON.stringify(testResult.metadata),
    created_at: testResult.createdAt,
    updated_at: testResult.updatedAt
  };
}

/**
 * 将数据库字段转换为TestHistory对象
 */
export function testHistoryFromDatabase(dbData: TestHistoryDatabaseFields): TestHistory {
  return {
    id: dbData.id,
    userId: dbData.user_id,
    testType: dbData.test_type,
    url: dbData.url,
    status: dbData.status,
    results: dbData.results ? JSON.parse(dbData.results) : undefined,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at
  };
}

/**
 * 将TestHistory对象转换为数据库字段
 */
export function testHistoryToDatabase(testHistory: TestHistory): TestHistoryDatabaseFields {
  return {
    id: testHistory.id,
    user_id: testHistory.userId,
    test_type: testHistory.testType,
    url: testHistory.url,
    status: testHistory.status,
    results: testHistory.results ? JSON.stringify(testHistory.results) : undefined,
    created_at: testHistory.createdAt,
    updated_at: testHistory.updatedAt
  };
}

// ==================== 验证函数 ====================

/**
 * 验证测试配置
 */
export function validateTestConfig(type: string, config: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (type) {
    case 'performance':
      if (!config.performance?.users || config.performance.users < 1) {
        errors.push('性能测试需要指定用户数量');
      }
      if (!config.performance?.duration || config.performance.duration < 1) {
        errors.push('性能测试需要指定持续时间');
      }
      break;

    case 'api':
      if (!config.api?.method) {
        errors.push('API测试需要指定HTTP方法');
      }
      break;

    case 'stress':
      if (!config.stress?.maxUsers || config.stress.maxUsers < 1) {
        errors.push('压力测试需要指定最大用户数');
      }
      if (!config.stress?.duration || config.stress.duration < 1) {
        errors.push('压力测试需要指定持续时间');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证URL格式
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
