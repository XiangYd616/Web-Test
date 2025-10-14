/**
 * 统一API响应格式标准 - TypeScript版本
 * 版本: v2.0.0
 * 创建时间: 2025-09-29
 * 
 * 此文件定义了项目中所有API接口必须遵循的统一响应格式
 * 确保前后端API响应格式完全一致
 * 
 * 注意: 此文件应该在前后端项目中保持同步
 */

// ==================== 错误代码枚举 ====================

export enum StandardErrorCode {
  // 通用错误 (1000-1099)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // 验证错误 (1100-1199)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // 认证和授权错误 (1200-1299)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // 资源错误 (1300-1399)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  CONFLICT = 'CONFLICT',

  // 业务逻辑错误 (1400-1499)
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // 网络和外部服务错误 (1500-1599)
  NETWORK_ERROR = 'NETWORK_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // 限流和配额错误 (1600-1699)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // 测试相关错误 (1700-1799)
  TEST_EXECUTION_ERROR = 'TEST_EXECUTION_ERROR',
  TEST_CONFIGURATION_ERROR = 'TEST_CONFIGURATION_ERROR',
  TEST_TIMEOUT = 'TEST_TIMEOUT',
  TEST_NOT_FOUND = 'TEST_NOT_FOUND',
  TEST_ALREADY_RUNNING = 'TEST_ALREADY_RUNNING'
}

// ==================== HTTP状态码映射 ====================

export const StandardStatusCodeMap: Record<StandardErrorCode, number> = {
  [StandardErrorCode.UNKNOWN_ERROR]: 500,
  [StandardErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [StandardErrorCode.SERVICE_UNAVAILABLE]: 503,

  [StandardErrorCode.VALIDATION_ERROR]: 400,
  [StandardErrorCode.INVALID_INPUT]: 400,
  [StandardErrorCode.MISSING_REQUIRED_FIELD]: 400,

  [StandardErrorCode.UNAUTHORIZED]: 401,
  [StandardErrorCode.FORBIDDEN]: 403,
  [StandardErrorCode.TOKEN_EXPIRED]: 401,
  [StandardErrorCode.INVALID_TOKEN]: 401,
  [StandardErrorCode.INVALID_CREDENTIALS]: 401,

  [StandardErrorCode.NOT_FOUND]: 404,
  [StandardErrorCode.RESOURCE_NOT_FOUND]: 404,
  [StandardErrorCode.DUPLICATE_RESOURCE]: 409,
  [StandardErrorCode.CONFLICT]: 409,

  [StandardErrorCode.BUSINESS_LOGIC_ERROR]: 422,
  [StandardErrorCode.OPERATION_NOT_ALLOWED]: 403,

  [StandardErrorCode.NETWORK_ERROR]: 502,
  [StandardErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [StandardErrorCode.TIMEOUT_ERROR]: 504,

  [StandardErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [StandardErrorCode.QUOTA_EXCEEDED]: 429,
  [StandardErrorCode.TOO_MANY_REQUESTS]: 429,

  [StandardErrorCode.TEST_EXECUTION_ERROR]: 422,
  [StandardErrorCode.TEST_CONFIGURATION_ERROR]: 400,
  [StandardErrorCode.TEST_TIMEOUT]: 408,
  [StandardErrorCode.TEST_NOT_FOUND]: 404,
  [StandardErrorCode.TEST_ALREADY_RUNNING]: 409
};

// ==================== 错误消息映射 ====================

export const StandardErrorMessages: Record<StandardErrorCode, string> = {
  [StandardErrorCode.UNKNOWN_ERROR]: '未知错误',
  [StandardErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [StandardErrorCode.SERVICE_UNAVAILABLE]: '服务暂不可用',

  [StandardErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [StandardErrorCode.INVALID_INPUT]: '输入数据无效',
  [StandardErrorCode.MISSING_REQUIRED_FIELD]: '缺少必填字段',

  [StandardErrorCode.UNAUTHORIZED]: '未授权访问',
  [StandardErrorCode.FORBIDDEN]: '禁止访问',
  [StandardErrorCode.TOKEN_EXPIRED]: '令牌已过期',
  [StandardErrorCode.INVALID_TOKEN]: '无效令牌',
  [StandardErrorCode.INVALID_CREDENTIALS]: '凭据无效',

  [StandardErrorCode.NOT_FOUND]: '资源未找到',
  [StandardErrorCode.RESOURCE_NOT_FOUND]: '请求的资源不存在',
  [StandardErrorCode.DUPLICATE_RESOURCE]: '资源已存在',
  [StandardErrorCode.CONFLICT]: '资源冲突',

  [StandardErrorCode.BUSINESS_LOGIC_ERROR]: '业务逻辑错误',
  [StandardErrorCode.OPERATION_NOT_ALLOWED]: '操作不被允许',

  [StandardErrorCode.NETWORK_ERROR]: '网络连接错误',
  [StandardErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [StandardErrorCode.TIMEOUT_ERROR]: '请求超时',

  [StandardErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超出限制',
  [StandardErrorCode.QUOTA_EXCEEDED]: '配额已用完',
  [StandardErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',

  [StandardErrorCode.TEST_EXECUTION_ERROR]: '测试执行失败',
  [StandardErrorCode.TEST_CONFIGURATION_ERROR]: '测试配置错误',
  [StandardErrorCode.TEST_TIMEOUT]: '测试执行超时',
  [StandardErrorCode.TEST_NOT_FOUND]: '测试不存在',
  [StandardErrorCode.TEST_ALREADY_RUNNING]: '测试已在运行中'
};

// ==================== 基础类型定义 ====================

/**
 * 标准API响应元数据
 */
export interface StandardApiMeta {
  /** 请求ID，用于追踪和调试 */
  requestId: string;
  /** 响应时间戳 */
  timestamp: string;
  /** 请求耗时（毫秒） */
  duration?: number;
  /** 请求路径 */
  path?: string;
  /** 请求方法 */
  method?: string;
  /** API版本 */
  version?: string;
  /** 服务器ID（可选） */
  serverId?: string;
  /** 扩展元数据 */
  [key: string]: unknown;
}

/**
 * 标准API错误信息
 */
export interface StandardApiError {
  /** 错误代码 */
  code: StandardErrorCode;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: unknown;
  /** 是否可重试 */
  retryable?: boolean;
  /** 建议的重试延迟（毫秒） */
  retryAfter?: number;
}

/**
 * 分页元数据
 */
export interface PaginationMeta {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
  /** 下一页页码 */
  nextPage?: number | null;
  /** 上一页页码 */
  prevPage?: number | null;
}

// ==================== 标准响应类型 ====================

/**
 * 标准成功响应
 */
export interface StandardApiSuccessResponse<T = any> {
  /** 成功标识 */
  success: true;
  /** 响应数据 */
  data: T;
  /** 响应消息 */
  message?: string;
  /** 响应元数据 */
  meta: StandardApiMeta;
}

/**
 * 标准错误响应
 */
export interface StandardApiErrorResponse {
  /** 成功标识 */
  success: false;
  /** 错误信息 */
  error: StandardApiError;
  /** 响应元数据 */
  meta: StandardApiMeta;
  /** 调试信息（仅开发环境） */
  debug?: {
    originalError?: string;
    stack?: string;
    code?: string;
    [key: string]: unknown;
  };
}

/**
 * 标准分页响应
 */
export interface StandardApiPaginatedResponse<T = any> {
  /** 成功标识 */
  success: true;
  /** 响应数据（数组） */
  data: T[];
  /** 分页信息 */
  pagination: PaginationMeta;
  /** 响应消息 */
  message?: string;
  /** 响应元数据 */
  meta: StandardApiMeta;
}

/**
 * 标准验证错误响应
 */
export interface StandardApiValidationErrorResponse {
  /** 成功标识 */
  success: false;
  /** 错误信息 */
  error: StandardApiError & {
    /** 验证错误详情 */
    details: {
      /** 字段验证错误 */
      fields?: Record<string, string[]>;
      /** 全局验证错误 */
      global?: string[];
      /** 原始验证错误 */
      raw?: unknown;
    };
  };
  /** 响应元数据 */
  meta: StandardApiMeta;
}

/**
 * 标准API响应联合类型
 */
export type StandardApiResponse<T = any> = 
  | StandardApiSuccessResponse<T>
  | StandardApiErrorResponse
  | StandardApiPaginatedResponse<T>
  | StandardApiValidationErrorResponse;

// ==================== 类型守卫函数 ====================

/**
 * 检查是否为成功响应
 */
export function isStandardApiSuccessResponse<T>(
  response: StandardApiResponse<T>
): response is StandardApiSuccessResponse<T> {
  return response && response.success === true && 'data' in response;
}

/**
 * 检查是否为错误响应
 */
export function isStandardApiErrorResponse(
  response: StandardApiResponse
): response is StandardApiErrorResponse {
  return response && response.success === false && 'error' in response;
}

/**
 * 检查是否为分页响应
 */
export function isStandardApiPaginatedResponse<T>(
  response: StandardApiResponse<T>
): response is StandardApiPaginatedResponse<T> {
  return (
    response && 
    response.success === true && 
    'data' in response && 
    'pagination' in response &&
    Array.isArray((response as any).data)
  );
}

/**
 * 检查是否为验证错误响应
 */
export function isStandardApiValidationErrorResponse(
  response: StandardApiResponse
): response is StandardApiValidationErrorResponse {
  return (
    response && 
    response.success === false && 
    'error' in response &&
    response.error.code === StandardErrorCode.VALIDATION_ERROR
  );
}

// ==================== 响应验证函数 ====================

/**
 * 验证成功响应格式
 */
export function validateSuccessResponse<T>(
  response: unknown
): response is StandardApiSuccessResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    (response as any).success === true &&
    'data' in (response as object) &&
    'meta' in (response as object) &&
    typeof (response as any).meta === 'object' &&
    typeof (response as any).meta.timestamp === 'string' &&
    typeof (response as any).meta.requestId === 'string'
  );
}

/**
 * 验证错误响应格式
 */
export function validateErrorResponse(
  response: unknown
): response is StandardApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    (response as any).success === false &&
    'error' in (response as object) &&
    typeof (response as any).error === 'object' &&
    typeof (response as any).error.code === 'string' &&
    typeof (response as any).error.message === 'string' &&
    'meta' in (response as object) &&
    typeof (response as any).meta === 'object' &&
    typeof (response as any).meta.timestamp === 'string' &&
    typeof (response as any).meta.requestId === 'string'
  );
}

/**
 * 验证分页元数据格式
 */
export function validatePaginationMeta(
  pagination: unknown
): pagination is PaginationMeta {
  return (
    typeof pagination === 'object' &&
    pagination !== null &&
    typeof (pagination as any).page === 'number' &&
    typeof (pagination as any).limit === 'number' &&
    typeof (pagination as any).total === 'number' &&
    typeof (pagination as any).totalPages === 'number' &&
    typeof (pagination as any).hasNext === 'boolean' &&
    typeof (pagination as any).hasPrev === 'boolean'
  );
}

// ==================== 工具函数 ====================

/**
 * 获取错误代码对应的HTTP状态码
 */
export function getStandardHttpStatusCode(errorCode: StandardErrorCode): number {
  return StandardStatusCodeMap[errorCode] || 500;
}

/**
 * 获取错误代码对应的默认消息
 */
export function getStandardErrorMessage(errorCode: StandardErrorCode): string {
  return StandardErrorMessages[errorCode] || StandardErrorMessages[StandardErrorCode.UNKNOWN_ERROR];
}

/**
 * 生成标准请求ID
 */
export function generateStandardRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建标准时间戳
 */
export function createStandardTimestamp(): string {
  return new Date().toISOString();
}

// ==================== 测试相关类型 ====================

/**
 * 测试配置接口
 */
export interface StandardTestConfig {
  id?: string;
  name: string;
  type: string;
  url: string;
  options: Record<string, any>;
  engineId?: string;
  timeout?: number;
  [key: string]: unknown;
}

/**
 * 测试结果接口
 */
export interface StandardTestResult {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  score?: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  message?: string;
  summary?: string;
  details?: unknown;
  recommendations?: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    solution: string;
  }>;
  error?: string;
  timestamp: number;
}

/**
 * 测试进度接口
 */
export interface StandardTestProgress {
  id: string;
  progress: number; // 0-100
  currentStep: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  estimatedTimeRemaining?: number;
  details?: unknown;
}

// ==================== 向后兼容的别名 ====================

/** @deprecated 使用 StandardErrorCode 替代 */
export const ErrorCode = StandardErrorCode;

/** @deprecated 使用 StandardStatusCodeMap 替代 */
export const StatusCodeMap = StandardStatusCodeMap;

/** @deprecated 使用 StandardErrorMessages 替代 */
export const ErrorMessages = StandardErrorMessages;

/** @deprecated 使用 isStandardApiSuccessResponse 替代 */
export const isApiSuccessResponse = isStandardApiSuccessResponse;

/** @deprecated 使用 isStandardApiErrorResponse 替代 */
export const isApiErrorResponse = isStandardApiErrorResponse;

/** @deprecated 使用 StandardApiResponse 替代 */
export type ApiResponse<T = any> = StandardApiResponse<T>;

/** @deprecated 使用 StandardApiError 替代 */
export type ApiError = StandardApiError;
