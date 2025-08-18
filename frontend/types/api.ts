/**
 * API 服务统一类型定义
 * 统一前后端API接口规范
 * 版本: v1.0.0
 */

import type { ApiResponse,
  Timestamp
 } from './common;import type { TestStatus, TestType  } from './enums; // 定义缺失的类型
export type UUID    = string;export interface PaginationInfo        {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean
}

// ==================== 请求配置类型 ====================

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS
  headers?: Record<string, string>
  body?: string | FormData | URLSearchParams;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number
}

export interface AuthConfig        {
  token?: string;
  apiKey?: string;
  basicAuth?: { username: string; password: string 
}
  oauth2?: { accessToken: string; refreshToken?: string 
}
}

// ==================== 错误处理类型 ====================

export interface ApiError        {
  code: string;
  message: string;
  details?: Record<string, any>
  retryable?: boolean;
  suggestions?: string[]
  timestamp: Timestamp;
  userMessage?: string; // 用户友好的错误消息
  statusCode?: number; // HTTP状态码
}

export interface ValidationError        {
  field: string;
  message: string;
  code: string;
  value?: any
}

export interface ErrorResponse        {
  success: false;
  error: ApiError;
  errors?: ValidationError[]
  timestamp: Timestamp
}

// ==================== 分页和查询类型 ====================;
;
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc
  search?: string;
  filters?: Record<string, any>
}

export interface PaginatedRequest extends QueryParams        {
  // 继承查询参数
}

export interface PaginatedResponse<T = any>        {
  success: boolean;
  message?: string;
  data: T[]
  meta: {
    timestamp: string;
    requestId: string;
    version: string;
    pagination: PaginationInfo;
    [key: string]: any
}
}

// ==================== 测试API类型 ====================;
;
export interface TestStartRequest {
  url: string;
  testType: TestType;
  config?: Record<string, any>
  priority?: 'low' | 'medium' | 'high' | 'critical
  tags?: string[]
  metadata?: Record<string, any>
}

export interface TestStartResponse extends ApiResponse<       {
  testId: UUID;
  sessionId: UUID;
  status: TestStatus;
  estimatedDuration?: number
}> { }

export interface TestStatusRequest        {
  testId: UUID;
  includeProgress?: boolean;
  includeMetrics?: boolean
}

export interface TestStatusResponse extends ApiResponse<       {
  testId: UUID;
  status: TestStatus;
  progress: number;
  currentStep?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  metrics?: Record<string, any>
  error?: string'}> { }
export interface TestResultRequest {
  testId: UUID;
  format?: 'json' | 'summary' | 'detailed
  includeRawData?: boolean
}

export interface TestResultResponse extends ApiResponse<       {
  testId: UUID;
  testType: TestType;
  status: TestStatus;
  result: Record<string, any>
  summary?: string;
  score?: number;
  grade?: string;
  recommendations?: Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    action: string
}>
}> { }

export interface TestCancelRequest        {
  testId: UUID;
  reason?: string
}

export interface TestCancelResponse extends ApiResponse<       {
  testId: UUID;
  status: TestStatus;
  cancelled: boolean
}> { }

// ==================== 测试历史API类型 ====================

export interface TestHistoryQuery extends QueryParams        {
  testType?: TestType | TestType[]
  status?: TestStatus | TestStatus[]
  dateFrom?: string;
  dateTo?: string;
  userId?: UUID;
  tags?: string[]
  scoreRange?: {
    min: number;
    max: number
}
}

export interface TestHistoryRecord        {
  id: UUID;
  testName: string;
  testType: TestType;
  url: string;
  status: TestStatus;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  score?: number;
  grade?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: UUID;
  tags?: string[]
  environment?: string
}
export interface TestHistoryResponse extends PaginatedResponse<TestHistoryRecord>      { }
export interface TestHistoryStatsRequest {
  timeRange?: '7d' | '30d' | '90d' | '1y
  testType?: TestType;
  userId?: UUID
}

export interface TestHistoryStatsResponse extends ApiResponse<       {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageScore: number;
  averageDuration: number;
  testsByType: Record<TestType number>
  testsByStatus: Record<TestStatus number>
  trendsData: Array<{
    date: string;
    count: number;
    averageScore: number
}>
}> { }

// ==================== 用户API类型 ====================

export interface UserProfileRequest        {
  userId?: UUID; // 如果不提供，获取当前用户
}

export interface UserProfileResponse extends ApiResponse<       {
  id: UUID;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  status: string;
  avatar?: string;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
  preferences: Record<string, any>
  profile: Record<string, any>
  permissions: string[]
}> { }

export interface UpdateUserProfileRequest        {
  fullName?: string;
  avatar?: string;
  preferences?: Record<string, any>
  profile?: Record<string, any>
}

export interface UpdateUserProfileResponse extends ApiResponse<       {
  updated: boolean;
  user: Record<string, any>
}> { }

export interface ChangePasswordRequest        {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string
}

export interface ChangePasswordResponse extends ApiResponse<       {
  changed: boolean;
  message: string'
}> { }
// ==================== 系统API类型 ==================== ;
export interface SystemStatsRequest {
  timeRange?: '1h' | '24h' | '7d' | '30d
  includeDetails?: boolean
}

export interface SystemStatsResponse extends ApiResponse<       {
  totalUsers: number;
  activeUsers: number;
  totalTests: number;
  testsToday: number;
  systemUptime: number;
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    responseTime: number;
    errorRate: number'
}
  services: Record<string, {;
    status: 'healthy' | 'warning' | 'critical
    responseTime: number;
    lastCheck: Timestamp
}>
}> { }

export interface SystemHealthRequest        {
  includeServices?: boolean;
  includeMetrics?: boolean'}
export interface SystemHealthResponse extends ApiResponse<       {;
  status: 'healthy' | 'warning' | 'critical
  uptime: number;
  services?: Record<string, any>
  resources?: Record<string, any>
  metrics?: Record<string, any>
}> { }

// ==================== 监控API类型 ====================

export interface MonitoringSiteRequest        {
  name: string;
  url: string;
  checkInterval: number;
  alertsEnabled: boolean;
  tags?: string[]
  metadata?: Record<string, any>
}
export interface MonitoringSiteResponse extends ApiResponse<       {;
  id: UUID;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'warning' | 'unknown
  checkInterval: number;
  alertsEnabled: boolean;
  createdAt: Timestamp;
  lastCheck?: Timestamp;
  uptime: number;
  responseTime: number'
}> { }
export interface MonitoringDataQuery extends QueryParams        {;
  siteId: UUID;
  timeRange?: '1h' | '24h' | '7d' | '30d
  metrics?: string[]'}
export interface MonitoringDataResponse extends PaginatedResponse<       {;
  timestamp: Timestamp;
  siteId: UUID;
  status: 'online' | 'offline' | 'warning
  responseTime: number;
  statusCode: number;
  errorMessage?: string;
  metrics: Record<string, number>'}> { }
// ==================== 导出API类型 ==================== ;
export interface ExportRequest {
  type: 'test-results' | 'test-history' | 'monitoring-data' | 'system-logs;
  format: 'json' | 'csv' | 'pdf' | 'xlsx
  filters?: Record<string, any>
  dateRange?: {
    start: string;
    end: string
}
  includeDetails?: boolean'}
export interface ExportResponse extends ApiResponse<       {;
  exportId: UUID;
  status: 'pending' | 'processing' | 'completed' | 'failed
  downloadUrl?: string;
  expiresAt?: Timestamp;
  fileSize?: number;
  recordCount?: number
}> { }

export interface ExportStatusRequest        {
  exportId: UUID'
}
export interface ExportStatusResponse extends ApiResponse<       {;
  exportId: UUID;
  status: 'pending' | 'processing' | 'completed' | 'failed
  progress: number;
  downloadUrl?: string;
  expiresAt?: Timestamp;
  error?: string
}> { }

// ==================== WebSocket 消息类型 ====================

export interface WebSocketMessage<T = any>        {
  type: string;
  event: string;
  data: T;
  timestamp: Timestamp;
  requestId?: UUID
}

export interface TestProgressMessage extends WebSocketMessage<       {
  testId: UUID;
  status: TestStatus;
  progress: number;
  currentStep: string;
  metrics?: Record<string, any>
  error?: string'}> {;
  type: 'test-progress;'
}
export interface SystemStatusMessage extends WebSocketMessage<       {;
  status: 'healthy' | 'warning' | 'critical;
  services: Record<string, any>
  metrics: Record<string, any>'}> {;
  type: 'system-status;'
}

export interface MonitoringAlertMessage extends WebSocketMessage<       {;
  siteId: UUID;
  siteName: string;
  alertType: 'down' | 'slow' | 'error' | 'recovered;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical;
  timestamp: Timestamp'
}> {;
  type: 'monitoring-alert;'
}

// ==================== 批量操作类型 ====================

export interface BatchRequest<T = any>        {;
  operations: Array<{;
    id: UUID;
    operation: 'create' | 'update' | 'delete
    data?: T
}>
  options?: {
    stopOnError?: boolean;
    validateOnly?: boolean
}
}

export interface BatchResponse<T = any> extends ApiResponse<       {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  results: Array<{
    id: UUID;
    success: boolean;
    data?: T;
    error?: string
}>
}> { }
// ==================== 文件上传类型 ==================== ;
export interface FileUploadRequest {
  file: File;
  type: 'avatar' | 'test-data' | 'import' | 'backup
  metadata?: Record<string, any>
}

export interface FileUploadResponse extends ApiResponse<       {
  fileId: UUID;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  expiresAt?: Timestamp
}> { }
// ==================== 搜索API类型 ==================== ;
export interface SearchRequest extends QueryParams        {;
  query: string;
  type?: 'tests' | 'users' | 'sites' | 'all
  filters?: Record<string, any>
  highlight?: boolean
}

export interface SearchResponse extends PaginatedResponse<       {
  id: UUID;
  type: string;
  title: string;
  description?: string;
  url?: string;
  score: number;
  highlights?: Record<string, string[]>
  metadata?: Record<string, any>'}> { }
// 重新导出 ApiResponse 以解决导入问题;
// export type { ApiResponse } from './common; // 已修复
// 成功响应类型
export interface ApiSuccessResponse<T  = any> extends ApiResponse<T>        {
  success: true;data: T;
  error?: never
}

// 错误响应类型
export interface ApiErrorResponse extends ApiResponse<never>        {
  success: false;
  data?: never;
  error: ApiError
}
