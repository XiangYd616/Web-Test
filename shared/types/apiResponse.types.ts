/**
 * API 响应类型定义
 * 统一前后端 API 响应格式
 */

import type { BaseResult, PaginationInfo, Timestamp, UUID } from './base.types';

// =============================================================================
// 基础响应类型
// =============================================================================

/**
 * 标准 API 响应基础结构
 */
export interface ApiResponseBase {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  requestId?: UUID;
  version?: string;
}

/**
 * 成功响应
 */
export interface ApiSuccessResponse<T = any> extends ApiResponseBase {
  success: true;
  data: T;
  meta?: {
    [key: string]: any;
  };
}

/**
 * 错误响应
 */
export interface ApiErrorResponse extends ApiResponseBase {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
    retryAfter?: number;
  };
  errors?: ValidationError[];
}

/**
 * API 响应联合类型
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// =============================================================================
// 分页响应类型
// =============================================================================

/**
 * 分页响应数据
 */
export interface PaginatedResponseData<T> {
  items: T[];
  pagination: PaginationInfo;
}

/**
 * 分页 API 响应
 */
export type PaginatedApiResponse<T> = ApiSuccessResponse<PaginatedResponseData<T>>;

// =============================================================================
// 验证错误类型
// =============================================================================

/**
 * 字段验证错误
 */
export interface ValidationError {
  field: string;
  value?: any;
  message: string;
  code: string;
  context?: Record<string, any>;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult<T = any> {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    index: number;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  errors?: ValidationError[];
}

// =============================================================================
// 文件上传响应类型
// =============================================================================

/**
 * 文件上传响应数据
 */
export interface FileUploadResponseData {
  fileId: UUID;
  fileName: string;
  originalName: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Timestamp;
}

/**
 * 批量文件上传响应数据
 */
export interface BatchFileUploadResponseData {
  files: FileUploadResponseData[];
  failed: Array<{
    fileName: string;
    error: string;
  }>;
}

// =============================================================================
// 状态和进度响应类型
// =============================================================================

/**
 * 操作状态响应
 */
export interface StatusResponse {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  currentStep?: string;
  totalSteps?: number;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  result?: any;
  error?: string;
}

/**
 * 健康检查响应
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Timestamp;
  uptime: number;
  version: string;
  services: {
    [serviceName: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      lastCheck: Timestamp;
      error?: string;
    };
  };
  system: {
    memory: {
      used: number;
      free: number;
      total: number;
    };
    cpu: {
      usage: number;
    };
    disk: {
      used: number;
      free: number;
      total: number;
    };
  };
}

// =============================================================================
// 导出和导入响应类型
// =============================================================================

/**
 * 数据导出响应
 */
export interface ExportResponse {
  exportId: UUID;
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  downloadUrl: string;
  fileName: string;
  size: number;
  recordCount: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

/**
 * 数据导入响应
 */
export interface ImportResponse {
  importId: UUID;
  status: 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors?: Array<{
    row: number;
    field: string;
    value: any;
    error: string;
  }>;
  summary?: {
    created: number;
    updated: number;
    skipped: number;
  };
}

// =============================================================================
// 统计和分析响应类型
// =============================================================================

/**
 * 统计数据响应
 */
export interface StatsResponse {
  period: {
    start: Timestamp;
    end: Timestamp;
    type: 'hour' | 'day' | 'week' | 'month' | 'year';
  };
  metrics: {
    [metricName: string]: {
      value: number;
      previousValue?: number;
      change?: number;
      changePercent?: number;
      trend: 'up' | 'down' | 'stable';
    };
  };
  charts?: {
    [chartName: string]: Array<{
      timestamp: Timestamp;
      value: number;
      label?: string;
    }>;
  };
}

/**
 * 仪表板数据响应
 */
export interface DashboardResponse {
  summary: {
    [key: string]: {
      value: number | string;
      label: string;
      icon?: string;
      color?: string;
      trend?: {
        direction: 'up' | 'down' | 'stable';
        percentage: number;
      };
    };
  };
  charts: {
    [chartId: string]: {
      type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
      title: string;
      data: any;
      options?: any;
    };
  };
  alerts?: Array<{
    id: UUID;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    createdAt: Timestamp;
    actions?: Array<{
      label: string;
      action: string;
    }>;
  }>;
  lastUpdated: Timestamp;
  refreshInterval?: number;
}

// =============================================================================
// 通用工具函数
// =============================================================================

/**
 * 类型守卫：检查是否为成功响应
 */
export function isApiSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * 类型守卫：检查是否为错误响应
 */
export function isApiErrorResponse<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    meta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  errors?: ValidationError[]
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    errors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  items: T[],
  pagination: PaginationInfo,
  message?: string
): PaginatedApiResponse<T> {
  return createSuccessResponse(
    {
      items,
      pagination,
    },
    message
  );
}
