/**
 * API客户端相关类型定义
 * 统一管理所有API客户端的类型，提供类型安全和代码提示
 */

// ==================== 基础API类型 ====================

/** API请求方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/** API请求头 */
export interface ApiHeaders {
  [key: string]: string;
}

/** API请求配置 */
export interface ApiRequestConfig {
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 请求头 */
  headers?: ApiHeaders;
  /** 是否启用缓存 */
  cache?: boolean;
  /** 缓存时间（毫秒） */
  cacheTime?: number;
}

/** API响应基础接口 */
export interface BaseApiResponse {
  /** 请求是否成功 */
  success: boolean;
  /** 响应时间戳 */
  timestamp?: string;
  /** 请求ID，用于追踪 */
  requestId?: string;
}

/** 成功响应接口 */
export interface SuccessApiResponse<T = any> extends BaseApiResponse {
  success: true;
  /** 响应数据 */
  data: T;
  /** 成功消息 */
  message?: string;
}

/** 错误响应接口 */
export interface ErrorApiResponse extends BaseApiResponse {
  success: false;
  /** 错误消息 */
  error: string;
  /** 错误代码 */
  errorCode?: string;
  /** 错误详情 */
  details?: unknown;
}

/** 统一API响应类型 */
export type ApiResponse<T = any> = SuccessApiResponse<T> | ErrorApiResponse;

// ==================== 测试API类型 ====================

/** 测试类型和状态 - 已迁移到统一类型系统 */
import type { TestStatus, TestType } from '../unified/testTypes';

/** 设备类型 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet';

/** 网络条件 */
export type NetworkCondition =
  | 'fast-3g'
  | 'slow-3g'
  | '4g'
  | 'wifi'
  | 'offline'
  | 'no-throttling';

/** 基础测试配置 */
export interface BaseTestConfig {
  /** 测试目标URL */
  url: string;
  /** 测试类型 */
  testType: TestType;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 设备类型 */
  device?: DeviceType;
  /** 网络条件 */
  networkCondition?: NetworkCondition;
  /** 自定义请求头 */
  headers?: ApiHeaders;
}

/** 性能测试配置 */
export interface PerformanceTestConfig extends BaseTestConfig {
  testType: TestType.PERFORMANCE;
  /** 是否包含截图 */
  includeScreenshots?: boolean;
  /** Lighthouse测试类别 */
  lighthouseCategories?: string[];
  /** 自定义性能指标 */
  customMetrics?: string[];
}

/** API测试配置 */
export interface ApiTestConfig extends BaseTestConfig {
  testType: TestType.API;
  /** API端点列表 */
  endpoints?: ApiEndpoint[];
  /** 认证信息 */
  authentication?: AuthConfig;
}

/** API端点配置 */
export interface ApiEndpoint {
  /** 端点名称 */
  name: string;
  /** 请求方法 */
  method: HttpMethod;
  /** 端点路径 */
  path: string;
  /** 请求参数 */
  params?: Record<string, any>;
  /** 请求体 */
  body?: unknown;
  /** 预期状态码 */
  expectedStatus?: number;
  /** 响应验证规则 */
  validation?: ValidationRule[];
}

/** 认证配置 */
export interface AuthConfig {
  /** 认证类型 */
  type: 'bearer' | 'basic' | 'api-key' | 'oauth';
  /** 认证令牌 */
  token?: string;
  /** 用户名（Basic认证） */
  username?: string;
  /** 密码（Basic认证） */
  password?: string;
  /** API密钥 */
  apiKey?: string;
  /** API密钥头名称 */
  apiKeyHeader?: string;
}

/** 验证规则 */
export interface ValidationRule {
  /** 字段路径 */
  field: string;
  /** 验证类型 */
  type: 'required' | 'type' | 'value' | 'range' | 'pattern';
  /** 期望值 */
  expected?: unknown;
  /** 验证消息 */
  message?: string;
}

/** 安全测试配置 */
export interface SecurityTestConfig extends BaseTestConfig {
  testType: TestType.SECURITY;
  /** 扫描深度 */
  scanDepth?: 'basic' | 'standard' | 'comprehensive';
  /** 要检查的安全项目 */
  securityChecks?: string[];
}

/** 兼容性测试配置 */
export interface CompatibilityTestConfig extends BaseTestConfig {
  testType: TestType.COMPATIBILITY;
  /** 目标浏览器 */
  browsers?: string[];
  /** 目标设备 */
  devices?: DeviceType[];
}

/** UX测试配置 */
export interface UxTestConfig extends BaseTestConfig {
  testType: TestType.UX;
  /** 用户流程 */
  userFlows?: UserFlow[];
  /** 可访问性检查 */
  accessibilityChecks?: boolean;
}

/** 用户流程 */
export interface UserFlow {
  /** 流程名称 */
  name: string;
  /** 操作步骤 */
  steps: UserAction[];
}

/** 用户操作 */
export interface UserAction {
  /** 操作类型 */
  type: 'click' | 'input' | 'scroll' | 'wait' | 'navigate';
  /** 目标选择器 */
  selector?: string;
  /** 输入值 */
  value?: string;
  /** 等待时间 */
  waitTime?: number;
}

/** SEO测试配置 */
export interface SeoTestConfig extends BaseTestConfig {
  testType: TestType.SEO;
  /** 检查项目 */
  checks?: string[];
  /** 关键词 */
  keywords?: string[];
}

/** 网络测试配置 */
export interface NetworkTestConfig extends BaseTestConfig {
  testType: TestType.NETWORK;
  /** 测试端口 */
  ports?: number[];
  /** 协议类型 */
  protocols?: string[];
}

/** 数据库测试配置 */
export interface DatabaseTestConfig extends BaseTestConfig {
  testType: TestType.DATABASE;
  /** 数据库类型 */
  dbType: 'mysql' | 'postgresql' | 'mongodb' | 'redis';
  /** 连接字符串 */
  connectionString: string;
  /** 测试查询 */
  testQueries?: string[];
}

/** 网站综合测试配置 */
export interface WebsiteTestConfig extends BaseTestConfig {
  testType: TestType.WEBSITE;
  /** 包含的测试类型 */
  includeTests?: TestType[];
  /** 测试深度 */
  depth?: 'basic' | 'standard' | 'comprehensive';
}

/** 统一测试配置类型 */
export type UnifiedTestConfig =
  | PerformanceTestConfig
  | ApiTestConfig
  | SecurityTestConfig
  | CompatibilityTestConfig
  | UxTestConfig
  | SeoTestConfig
  | NetworkTestConfig
  | DatabaseTestConfig
  | WebsiteTestConfig;

// ==================== 测试执行类型 ====================

/** 测试执行信息 */
export interface TestExecution {
  /** 测试ID */
  id: string;
  /** 测试状态 */
  status: TestStatus;
  /** 测试进度（0-100） */
  progress?: number;
  /** 当前步骤 */
  currentStep?: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime?: string;
  /** 测试结果 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
  /** 测试配置 */
  config: UnifiedTestConfig;
}

/** 测试历史记录 */
export interface TestHistory {
  /** 总测试数 */
  total: number;
  /** 测试记录列表 */
  records: TestExecution[];
  /** 分页信息 */
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ==================== 回调函数类型 ====================

/** 进度回调函数 */
export type ProgressCallback = (
  progress: number,
  step: string,
  metrics?: Record<string, any>
) => void;

/** 完成回调函数 */
export type CompletionCallback = (result: unknown) => void;

/** 错误回调函数 */
export type ErrorCallback = (error: Error) => void;

/** 测试回调函数集合 */
export interface TestCallbacks {
  /** 进度回调 */
  onProgress?: ProgressCallback;
  /** 完成回调 */
  onComplete?: CompletionCallback;
  /** 错误回调 */
  onError?: ErrorCallback;
}

// ==================== API客户端接口 ====================

/** API客户端基础接口 */
export interface BaseApiClient {
  /** 执行GET请求 */
  get<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>;

  /** 执行POST请求 */
  post<T = any>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>>;

  /** 执行PUT请求 */
  put<T = any>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>>;

  /** 执行DELETE请求 */
  delete<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
}

/** 测试API客户端接口 */
export interface TestApiClient extends BaseApiClient {
  /** 执行测试 */
  executeTest(config: UnifiedTestConfig): Promise<ApiResponse<TestExecution>>;

  /** 获取测试状态 */
  getTestStatus(testId: string, testType: TestType): Promise<ApiResponse<TestExecution>>;

  /** 取消测试 */
  cancelTest(testId: string, testType: TestType): Promise<ApiResponse<void>>;

  /** 获取测试结果 */
  getTestResult(testId: string, testType: TestType): Promise<ApiResponse<any>>;

  /** 获取测试历史 */
  getTestHistory(testType?: TestType, limit?: number): Promise<ApiResponse<TestHistory>>;

  /** 启动实时测试 */
  startRealtimeTest(config: UnifiedTestConfig, callbacks: TestCallbacks): Promise<string>;
}
