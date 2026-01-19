/**
 * 后端API请求和响应类型定义
 * 版本: v2.0.0
 * 创建时间: 2025-08-16
 *
 * 此文件定义了后端API的请求和响应类型
 * 确保与前端API类型保持一致
 */

// 导入共享类型和后端模型
import {
  PaginationMeta,
  StandardApiErrorResponse,
  StandardApiResponse,
  StandardApiSuccessResponse,
  StandardPaginatedResponse,
} from '../../shared/types/standardApiResponse';

import {
  CreateTestConfigData,
  TestConfiguration,
  TestExecution,
  TestReport,
  TestResult,
  UpdateTestConfigData,
  UpdateUserData,
  User,
  UserProfile,
} from './models';

// ==================== 基础API类型 ====================

export type ApiResponse<T = any> = StandardApiResponse<T>;
export type ApiSuccessResponse<T = any> = StandardApiSuccessResponse<T>;
export type ApiErrorResponse = StandardApiErrorResponse;
export type PaginatedResponse<T = any> = StandardPaginatedResponse<T>;

// ==================== 认证相关API类型 ====================

export interface LoginRequest {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  user: Omit<User, 'password_hash'>;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface RegisterResponse {
  user: Omit<User, 'password_hash'>;
  message: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirmRequest {
  token: string;
  new_password: string;
}

// ==================== 用户相关API类型 ====================

export interface GetUserResponse {
  user: Omit<User, 'password_hash'>;
  profile?: UserProfile;
}

export interface UpdateUserRequest extends UpdateUserData {}

export interface UpdateUserResponse {
  user: Omit<User, 'password_hash'>;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  is_admin?: boolean;
  sort?: 'username' | 'email' | 'created_at' | 'last_login';
  order?: 'asc' | 'desc';
}

export interface GetUsersResponse {
  users: Omit<User, 'password_hash'>[];
  pagination: PaginationMeta;
}

// ==================== 测试配置相关API类型 ====================

export interface CreateTestConfigRequest extends CreateTestConfigData {}

export interface CreateTestConfigResponse {
  test_config: TestConfiguration;
}

export interface UpdateTestConfigRequest extends UpdateTestConfigData {}

export interface UpdateTestConfigResponse {
  test_config: TestConfiguration;
}

export interface GetTestConfigsQuery {
  page?: number;
  limit?: number;
  search?: string;
  test_type?: string;
  is_active?: boolean;
  user_id?: number;
  sort?: 'name' | 'test_type' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface GetTestConfigsResponse {
  test_configs: TestConfiguration[];
  pagination: PaginationMeta;
}

// ==================== 测试执行相关API类型 ====================

export interface StartTestRequest {
  test_config_id: number;
  configuration_override?: Record<string, any>;
}

export interface StartTestResponse {
  execution: TestExecution;
}

export interface GetTestExecutionsQuery {
  page?: number;
  limit?: number;
  test_config_id?: number;
  user_id?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  date_from?: string;
  date_to?: string;
  sort?: 'started_at' | 'completed_at' | 'duration_ms' | 'created_at';
  order?: 'asc' | 'desc';
}

export interface GetTestExecutionsResponse {
  executions: TestExecution[];
  pagination: PaginationMeta;
}

export interface GetTestExecutionResponse {
  execution: TestExecution;
  results?: TestResult[];
}

export interface CancelTestRequest {
  execution_id: number;
}

// ==================== 测试结果相关API类型 ====================

export interface GetTestResultsQuery {
  page?: number;
  limit?: number;
  execution_id?: number;
  test_type?: string;
  status?: 'pass' | 'fail' | 'warning' | 'info';
  score_min?: number;
  score_max?: number;
  date_from?: string;
  date_to?: string;
  sort?: 'score' | 'created_at';
  order?: 'asc' | 'desc';
}

export interface GetTestResultsResponse {
  results: TestResult[];
  pagination: PaginationMeta;
}

export interface GetTestResultResponse {
  result: TestResult;
  detailed_result?: any; // 根据test_type返回对应的详细结果
}

// ==================== 报告相关API类型 ====================

export interface CreateReportRequest {
  name: string;
  description?: string;
  report_type: 'single' | 'comparison' | 'trend' | 'summary';
  test_executions: number[];
  configuration?: Record<string, any>;
  is_public?: boolean;
}

export interface CreateReportResponse {
  report: TestReport;
}

export interface GetReportsQuery {
  page?: number;
  limit?: number;
  search?: string;
  report_type?: string;
  user_id?: number;
  is_public?: boolean;
  date_from?: string;
  date_to?: string;
  sort?: 'name' | 'report_type' | 'generated_at' | 'created_at';
  order?: 'asc' | 'desc';
}

export interface GetReportsResponse {
  reports: TestReport[];
  pagination: PaginationMeta;
}

export interface GenerateReportRequest {
  report_id: number;
  format?: 'pdf' | 'html' | 'json';
}

export interface GenerateReportResponse {
  download_url: string;
  file_size: number;
  expires_at: string;
}

// ==================== 系统相关API类型 ====================

export interface GetSystemStatsResponse {
  users: {
    total: number;
    active: number;
    new_today: number;
  };
  tests: {
    total_executions: number;
    running: number;
    completed_today: number;
    success_rate: number;
  };
  system: {
    uptime: number;
    memory_usage: number;
    cpu_usage: number;
    disk_usage: number;
  };
}

export interface GetSystemConfigResponse {
  config: Record<string, any>;
}

export interface UpdateSystemConfigRequest {
  config: Record<string, any>;
}

// ==================== 文件上传相关API类型 ====================

export interface UploadFileResponse {
  file_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_url: string;
}

export interface DeleteFileRequest {
  file_id: string;
}

// ==================== WebSocket相关类型 ====================

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: string;
  request_id?: string;
}

export interface TestProgressMessage {
  execution_id: number;
  status: 'started' | 'progress' | 'completed' | 'failed';
  progress_percentage?: number;
  current_step?: string;
  message?: string;
  error?: string;
}

export interface SystemNotificationMessage {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action_url?: string;
}

// ==================== 错误处理类型 ====================

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface BusinessLogicError {
  code: string;
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
}
