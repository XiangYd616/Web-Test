/**
 * 后端服务层类型定义
 * 版本: v2.0.0
 * 创建时间: 2025-08-16
 *
 * 此文件定义了后端服务层的接口和类型
 * 包括数据库服务、业务逻辑服务、外部服务等
 */

import {
  CreateTestConfigData,
  CreateUserData,
  PaginatedQueryResult,
  QueryResult,
  TestConfiguration,
  TestExecution,
  TestReport,
  TestResult,
  UpdateTestConfigData,
  UpdateUserData,
  User,
  UserProfile,
  UserSession,
} from './models';

// ==================== 数据库服务接口 ====================

export interface DatabaseService {
  // 连接管理
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // 事务管理
  beginTransaction(): Promise<unknown>;
  commitTransaction(transaction: unknown): Promise<void>;
  rollbackTransaction(transaction: unknown): Promise<void>;

  // 查询执行
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;

  // 健康检查
  healthCheck(): Promise<boolean>;
}

// ==================== 用户服务接口 ====================

export interface UserService {
  // 用户认证
  authenticate(username: string, password: string): Promise<User | null>;
  createUser(userData: CreateUserData): Promise<User>;
  updateUser(userId: number, userData: UpdateUserData): Promise<User>;
  deleteUser(userId: number): Promise<void>;

  // 用户查询
  getUserById(userId: number): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUsers(query: GetUsersQuery): Promise<PaginatedQueryResult<User>>;

  // 密码管理
  changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void>;
  resetPassword(email: string): Promise<string>; // 返回重置令牌
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;

  // 用户状态管理
  activateUser(userId: number): Promise<void>;
  deactivateUser(userId: number): Promise<void>;
  lockUser(userId: number, duration?: number): Promise<void>;
  unlockUser(userId: number): Promise<void>;

  // 用户资料
  getUserProfile(userId: number): Promise<UserProfile | null>;
  updateUserProfile(userId: number, profileData: Partial<UserProfile>): Promise<UserProfile>;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  is_admin?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ==================== 会话服务接口 ====================

export interface SessionService {
  createSession(userId: number, ipAddress?: string, userAgent?: string): Promise<UserSession>;
  getSession(sessionToken: string): Promise<UserSession | null>;
  refreshSession(refreshToken: string): Promise<UserSession>;
  invalidateSession(sessionToken: string): Promise<void>;
  invalidateAllUserSessions(userId: number): Promise<void>;
  cleanupExpiredSessions(): Promise<number>; // 返回清理的会话数
}

// ==================== 测试服务接口 ====================

export interface TestConfigService {
  createTestConfig(configData: CreateTestConfigData): Promise<TestConfiguration>;
  updateTestConfig(configId: number, configData: UpdateTestConfigData): Promise<TestConfiguration>;
  deleteTestConfig(configId: number): Promise<void>;
  getTestConfig(configId: number): Promise<TestConfiguration | null>;
  getTestConfigs(query: GetTestConfigsQuery): Promise<PaginatedQueryResult<TestConfiguration>>;
  validateTestConfig(configData: unknown): Promise<ValidationResult>;
}

export interface GetTestConfigsQuery {
  page?: number;
  limit?: number;
  search?: string;
  test_type?: string;
  is_active?: boolean;
  user_id?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface TestExecutionService {
  startTest(
    testConfigId: number,
    userId: number,
    overrides?: Record<string, unknown>
  ): Promise<TestExecution>;
  cancelTest(executionId: number): Promise<void>;
  getTestExecution(executionId: number): Promise<TestExecution | null>;
  getTestExecutions(query: GetTestExecutionsQuery): Promise<PaginatedQueryResult<TestExecution>>;
  updateTestStatus(
    executionId: number,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;
}

export interface GetTestExecutionsQuery {
  page?: number;
  limit?: number;
  test_config_id?: number;
  user_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface TestResultService {
  saveTestResult(executionId: number, resultData: Record<string, unknown>): Promise<TestResult>;
  getTestResult(resultId: number): Promise<TestResult | null>;
  getTestResults(query: GetTestResultsQuery): Promise<PaginatedQueryResult<TestResult>>;
  getDetailedResult(resultId: number): Promise<unknown>;
  deleteTestResult(resultId: number): Promise<void>;
}

export interface GetTestResultsQuery {
  page?: number;
  limit?: number;
  execution_id?: number;
  test_type?: string;
  status?: string;
  score_min?: number;
  score_max?: number;
  date_from?: string;
  date_to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ==================== 报告服务接口 ====================

export interface ReportService {
  createReport(reportData: CreateReportData): Promise<TestReport>;
  generateReport(reportId: number, format: 'pdf' | 'html' | 'json'): Promise<ReportFile>;
  getReport(reportId: number): Promise<TestReport | null>;
  getReports(query: GetReportsQuery): Promise<PaginatedQueryResult<TestReport>>;
  deleteReport(reportId: number): Promise<void>;

  // 报告模板管理
  getReportTemplates(): Promise<ReportTemplate[]>;
  createReportTemplate(templateData: Record<string, unknown>): Promise<ReportTemplate>;
}

export interface CreateReportData {
  name: string;
  description?: string;
  report_type: string;
  test_executions: number[];
  configuration?: Record<string, unknown>;
  user_id: number;
  is_public?: boolean;
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
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ReportFile {
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  download_url: string;
  expires_at: Date;
}

export interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  template_data: Record<string, unknown>;
  is_default: boolean;
  created_at: Date;
}

// ==================== 文件相关类型 ====================

export interface FileUpload {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface FileRecord {
  id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  path: string;
  user_id: string;
  owner_type?: string | null;
  owner_id?: string | null;
  created_at: Date;
  expires_at?: Date;
}

export interface FileStream {
  stream: NodeJS.ReadableStream;
  filename: string;
  mimetype: string;
  size: number;
}

export interface StorageStats {
  total_files: number;
  total_size: number;
  available_space: number;
  used_space: number;
}

export interface FileUploadOptions {
  ownerType?: string;
  ownerId?: string;
  expiresAt?: Date;
}

// ==================== 通知服务接口 ====================

export interface NotificationService {
  sendEmail(to: string, subject: string, content: string, template?: string): Promise<void>;
  sendWebSocketMessage(userId: number, message: unknown): Promise<void>;
  broadcastMessage(message: unknown, userIds?: number[]): Promise<void>;

  // 通知模板管理
  getEmailTemplate(templateName: string): Promise<EmailTemplate | null>;
  renderEmailTemplate(templateName: string, data: Record<string, unknown>): Promise<string>;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: string[];
}

// ==================== 验证和工具类型 ====================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}
