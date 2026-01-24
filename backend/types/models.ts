/**
 * 后端数据模型类型定义
 * 版本: v2.0.0
 * 创建时间: 2025-08-16
 *
 * 此文件定义了后端使用的所有数据模型类型
 * 确保与前端类型定义保持一致
 */

// 导入共享类型
import { UUID } from '../../shared/types/standardApiResponse';

// ==================== 基础类型 ====================

export type DatabaseId = number;
export type JsonObject = Record<string, unknown>;
export type DatabaseTimestamp = Date | string;

// ==================== 用户相关模型 ====================

export interface User {
  id: DatabaseId;
  uuid: UUID;
  username: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active: boolean;
  is_admin: boolean;
  email_verified: boolean;
  last_login?: DatabaseTimestamp;
  login_attempts: number;
  locked_until?: DatabaseTimestamp;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
  deleted_at?: DatabaseTimestamp;
}

export interface UserProfile {
  id: DatabaseId;
  user_id: DatabaseId;
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  timezone?: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications_enabled: boolean;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

export interface UserSession {
  id: DatabaseId;
  user_id: DatabaseId;
  device_id: string;
  device_name?: string;
  device_type?: string;
  refresh_token?: string;
  expires_at: DatabaseTimestamp;
  ip_address?: string;
  user_agent?: string;
  location?: JsonObject | string;
  last_activity_at?: DatabaseTimestamp;
  terminated_at?: DatabaseTimestamp;
  is_active: boolean;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

// ==================== 测试相关模型 ====================

export interface TestConfiguration {
  id: DatabaseId;
  uuid: UUID;
  user_id: DatabaseId;
  name: string;
  description?: string;
  test_type: 'performance' | 'accessibility' | 'seo' | 'security' | 'api' | 'website' | 'stress';
  target_url: string;
  configuration: JsonObject;
  is_active: boolean;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
  deleted_at?: DatabaseTimestamp;
}

export interface TestExecution {
  id: DatabaseId;
  uuid: UUID;
  test_config_id: DatabaseId;
  user_id: DatabaseId;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: DatabaseTimestamp;
  completed_at?: DatabaseTimestamp;
  duration_ms?: number;
  error_message?: string;
  metadata: JsonObject;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

export interface TestResult {
  id: DatabaseId;
  uuid: UUID;
  execution_id: DatabaseId;
  test_type: string;
  score?: number;
  grade?: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  summary: JsonObject;
  details: JsonObject;
  recommendations?: JsonObject;
  created_at: DatabaseTimestamp;
}

export interface TestResultRecord {
  id: DatabaseId;
  execution_id: DatabaseId;
  summary: JsonObject;
  score?: number;
  grade?: string;
  passed?: boolean;
  warnings?: unknown[];
  errors?: unknown[];
  created_at: DatabaseTimestamp;
}

export interface TestMetricRecord {
  id: DatabaseId;
  metric_name: JsonObject | number | string;
  metric_value: JsonObject | number | string;
  metric_unit?: string | null;
  metric_type?: string | null;
  passed?: boolean | null;
  severity?: string | null;
  recommendation?: string | null;
  created_at: DatabaseTimestamp;
}

// ==================== 性能测试详细结果 ====================

export interface PerformanceTestResult {
  id: DatabaseId;
  test_result_id: DatabaseId;
  metrics: {
    first_contentful_paint: number;
    largest_contentful_paint: number;
    first_input_delay: number;
    cumulative_layout_shift: number;
    speed_index: number;
    time_to_interactive: number;
  };
  lighthouse_score: number;
  opportunities: JsonObject[];
  diagnostics: JsonObject[];
  created_at: DatabaseTimestamp;
}

// ==================== 可访问性测试详细结果 ====================

export interface AccessibilityTestResult {
  id: DatabaseId;
  test_result_id: DatabaseId;
  violations: JsonObject[];
  passes: JsonObject[];
  incomplete: JsonObject[];
  inapplicable: JsonObject[];
  wcag_level: 'A' | 'AA' | 'AAA';
  compliance_score: number;
  created_at: DatabaseTimestamp;
}

// ==================== SEO测试详细结果 ====================

export interface SeoTestResult {
  id: DatabaseId;
  test_result_id: DatabaseId;
  meta_tags: JsonObject;
  headings: JsonObject;
  images: JsonObject;
  links: JsonObject;
  structured_data: JsonObject;
  mobile_friendly: boolean;
  page_speed_score: number;
  created_at: DatabaseTimestamp;
}

// ==================== 安全测试详细结果 ====================

export interface SecurityTestResult {
  id: DatabaseId;
  test_result_id: DatabaseId;
  vulnerabilities: JsonObject[];
  security_headers: JsonObject;
  ssl_info: JsonObject;
  content_security_policy: JsonObject;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: DatabaseTimestamp;
}

// ==================== 压力测试详细结果 ====================

export interface StressTestResult {
  id: DatabaseId;
  test_result_id: DatabaseId;
  max_concurrent_users: number;
  breaking_point: number;
  recovery_time: number;
  cpu_usage: JsonObject;
  memory_usage: JsonObject;
  network_usage: JsonObject;
  created_at: DatabaseTimestamp;
}

// ==================== 报告相关模型 ====================

export interface TestReport {
  id: DatabaseId;
  uuid: UUID;
  user_id: DatabaseId;
  name: string;
  description?: string;
  report_type: 'single' | 'comparison' | 'trend' | 'summary';
  test_executions: DatabaseId[];
  configuration: JsonObject;
  generated_at: DatabaseTimestamp;
  file_path?: string;
  file_size?: number;
  is_public: boolean;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
  deleted_at?: DatabaseTimestamp;
}

// ==================== 系统相关模型 ====================

export interface SystemConfiguration {
  id: DatabaseId;
  key: string;
  value: JsonObject;
  description?: string;
  is_public: boolean;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

export interface AuditLog {
  id: DatabaseId;
  user_id?: DatabaseId;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: JsonObject;
  new_values?: JsonObject;
  ip_address?: string;
  user_agent?: string;
  created_at: DatabaseTimestamp;
}

// ==================== 数据库查询结果类型 ====================

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  command: string;
  fields?: unknown[];
}

export interface PaginatedQueryResult<T = unknown> extends QueryResult<T> {
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ==================== 请求上下文类型 ====================

export interface RequestContext {
  user?: User;
  session?: UserSession;
  requestId: string;
  startTime: number;
  ip: string;
  userAgent: string;
}

// ==================== 导出所有类型 ====================

// ==================== 创建和更新类型 ====================

export type CreateUserData = Omit<
  User,
  | 'id'
  | 'uuid'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
  | 'last_login'
  | 'login_attempts'
  | 'locked_until'
>;
export type UpdateUserData = Partial<
  Pick<
    User,
    'username' | 'email' | 'first_name' | 'last_name' | 'avatar_url' | 'is_active' | 'is_admin'
  >
>;

export type CreateTestConfigData = Omit<
  TestConfiguration,
  'id' | 'uuid' | 'created_at' | 'updated_at' | 'deleted_at'
>;
export type UpdateTestConfigData = Partial<
  Pick<TestConfiguration, 'name' | 'description' | 'configuration' | 'is_active'>
>;

export type CreateTestExecutionData = Omit<
  TestExecution,
  'id' | 'uuid' | 'created_at' | 'updated_at' | 'started_at' | 'completed_at' | 'duration_ms'
>;
export type UpdateTestExecutionData = Partial<
  Pick<TestExecution, 'status' | 'error_message' | 'metadata'>
>;
