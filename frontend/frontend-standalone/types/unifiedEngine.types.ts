/**
 * 🧠 统一测试引擎类型定义
 * 基于TypeScript最佳实践，为统一测试引擎提供完整的类型支持
 */

import { TestPriority, TestStatus, TestType, UserRole } from './enums';

/**
 * 基础测试配置接口
 */
export interface BaseTestConfig {
  url: string;
  timeout?: number;
  retries?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * 性能测试配置
 */
export interface PerformanceTestConfig extends BaseTestConfig {
  device?: 'desktop' | 'mobile';
  locale?: string;
  throttling?: 'simulated3G' | 'applied3G' | 'applied4G' | 'none';
  categories?: ('performance' | 'accessibility' | 'best-practices' | 'seo')[];
  checkCoreWebVitals?: boolean;
  checkPageSpeed?: boolean;
  checkResources?: boolean;
  checkCaching?: boolean;
}

/**
 * 安全测试配置
 */
export interface SecurityTestConfig extends BaseTestConfig {
  checkSSL?: boolean;
  checkHeaders?: boolean;
  checkVulnerabilities?: boolean;
  checkCookies?: boolean;
  scanDepth?: number;
}

/**
 * API端点定义
 */
export interface APIEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string;
  url?: string;
  expectedStatus?: number[];
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  maxResponseTime?: number;
  expectedContentType?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

/**
 * API测试配置
 */
export interface APITestConfig extends BaseTestConfig {
  baseUrl: string;
  endpoints: APIEndpoint[];
  concurrency?: number;
  validateSchema?: boolean;
  testSecurity?: boolean;
  testPerformance?: boolean;
  testReliability?: boolean;
  followRedirects?: boolean;
  validateSSL?: boolean;
  generateDocumentation?: boolean;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'apikey';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    headerName?: string;
  };
  globalHeaders?: Array<{
    key: string;
    value: string;
    enabled: boolean;
  }>;
}

/**
 * 压力测试配置
 */
export interface StressTestConfig extends BaseTestConfig {
  users: number;
  duration: number;
  testType?: 'load' | 'stress' | 'spike' | 'volume';
  rampUpTime?: number;
  requestsPerSecond?: number;
  followRedirects?: boolean;
  validateSSL?: boolean;
}

/**
 * 数据库测试配置
 */
export interface DatabaseTestConfig extends BaseTestConfig {
  connectionString: string;
  testType?: 'connection' | 'performance' | 'security' | 'comprehensive';
  maxConnections?: number;
  queryTimeout?: number;
  includePerformanceTests?: boolean;
  includeSecurityTests?: boolean;
  customQueries?: string[];
}

/**
 * 网络测试配置
 */
export interface NetworkTestConfig extends BaseTestConfig {
  testType?: 'connectivity' | 'latency' | 'bandwidth' | 'comprehensive';
  checkDNS?: boolean;
  checkCDN?: boolean;
  checkLatency?: boolean;
  checkBandwidth?: boolean;
}

/**
 * 测试执行配置联合类型
 */
export type TestConfig =
  | PerformanceTestConfig
  | SecurityTestConfig
  | APITestConfig
  | StressTestConfig
  | DatabaseTestConfig
  | NetworkTestConfig
  | BaseTestConfig;

/**
 * 测试执行请求
 */
export interface TestExecutionRequest {
  testType: TestType;
  config: TestConfig;
  options?: {
    testId?: string;
    priority?: TestPriority;
    timeout?: number;
    retries?: number;
    tags?: string[];
    metadata?: Record<string, any>;
  };
}

/**
 * 测试状态信息
 */
export interface TestStatusInfo {
  testId: string;
  status: TestStatus;
  progress: number;
  currentStep: string;
  startTime: number;
  lastUpdate: number;
  error?: string;
  estimatedTimeRemaining?: number;
}

/**
 * 测试结果
 */
export interface TestResult {
  testId: string;
  testType: string;
  testName: string;
  duration: number;
  overallScore: number;
  results: Record<string, any>;
  summary: Record<string, any>;
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    priority: 'low' | 'medium' | 'high';
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * 引擎状态
 */
export interface EngineState {
  isConnected: boolean;
  supportedTypes: string[];
  engineVersion: string;
  lastError: Error | null;
  uptime?: number;
  activeTestsCount?: number;
  totalResultsCount?: number;
}

/**
 * WebSocket消息类型
 */
export interface WebSocketMessage {
  type: 'testProgress' | 'testCompleted' | 'testFailed' | 'engineStatus';
  testId?: string;
  data: any;
  timestamp?: string;
}

/**
 * 测试类型信息
 */
export interface TestTypeInfo {
  id: string;
  name: string;
  description: string;
  core: string;
  methods: string[];
  dependencies: string[];
  configSchema?: any;
  examples?: any[];
  registeredAt: string;
}

/**
 * 引擎统计信息
 */
export interface EngineStats {
  totalActiveTests: number;
  runningTests: number;
  completedTests: number;
  failedTests: number;
  totalResults: number;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    averageExecutionTime: number;
    successRate: number;
    errorRate: number;
  };
}

/**
 * 测试结果分析
 */
export interface TestResultAnalysis {
  hasResult: boolean;
  overallScore: number;
  grade: string;
  hasRecommendations: boolean;
  priorityLevel: 'low' | 'medium' | 'high';
  testDuration: number;
  completedAt: string;
  scoreColor: 'green' | 'yellow' | 'red';
  recommendationCount: {
    immediate: number;
    shortTerm: number;
    longTerm: number;
    total: number;
  };
  topIssues: string[];
}

/**
 * 用户限制信息
 */
export interface UserLimits {
  role: UserRole;
  maxConcurrentTests: number;
  maxTestsPerHour: number;
  maxTestsPerDay: number;
  allowedTestTypes: TestType[];
  priorityLevel: TestPriority;
}

/**
 * API响应基础接口
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp?: string;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T = any> extends APIResponse<T> {
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 错误详情接口
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  allowedValues?: any[];
}

/**
 * 验证失败响应
 */
export interface ValidationErrorResponse extends APIResponse {
  details?: ValidationError[];
}

/**
 * 速率限制响应
 */
export interface RateLimitResponse extends APIResponse {
  details?: {
    userType: string;
    testType: string;
    currentUsage: number;
    limit: number;
    resetTime: string;
    retryAfter: number;
  };
  upgradeHint?: string;
}

/**
 * Hook返回类型
 */
export interface UnifiedTestEngineHook {
  // 引擎状态
  engineState: EngineState;
  isConnected: boolean;
  supportedTypes: string[];
  engineVersion: string;
  lastError: Error | null;

  // 测试管理
  activeTests: Map<string, TestStatusInfo>;
  testResults: Map<string, TestResult>;
  executingTest: boolean;

  // 操作函数
  executeTest: (config: TestExecutionRequest) => Promise<string>;
  getTestStatus: (testId: string) => Promise<TestStatusInfo | null>;
  getTestResult: (testId: string) => Promise<TestResult | null>;
  cancelTest: (testId: string) => Promise<boolean>;

  // WebSocket管理
  subscribeToTest: (testId: string) => void;
  unsubscribeFromTest: (testId: string) => void;
  connectWebSocket: () => void;

  // 工具函数
  fetchSupportedTypes: () => void;
  isTestRunning: (testId: string) => boolean;
  getTestProgress: (testId: string) => number;
  getTestCurrentStep: (testId: string) => string;
  hasTestResult: (testId: string) => boolean;

  // 批量操作
  cancelAllTests: () => Promise<void>;
  clearCompletedTests: () => void;

  // 统计信息
  getStats: () => EngineStats;
}

/**
 * 测试执行Hook返回类型
 */
export interface TestExecutionHook extends UnifiedTestEngineHook {
  executeTest: (config: Record<string, any>, options?: any) => Promise<string>;
  isSupported: boolean;
  testType: TestType;
}

/**
 * 测试结果分析Hook返回类型
 */
export interface TestResultAnalysisHook {
  result: TestResult | null;
  analysis: TestResultAnalysis | null;
  hasResult: boolean;
  testId: string;
}

/**
 * 组件Props类型
 */
export interface UnifiedTestPanelProps {
  testType?: TestType;
  defaultConfig?: Partial<TestConfig>;
  onTestComplete?: (testId: string, result: TestResult) => void;
  onTestError?: (error: Error) => void;
  className?: string;
  showHistory?: boolean;
  showStats?: boolean;
  allowMultipleTests?: boolean;
}

/**
 * 测试配置表单值类型
 */
export interface TestConfigFormValues {
  testType: TestType;
  url: string;
  [key: string]: any;
}

// 注意：所有类型已在上面单独导出，无需重复导出
// 基于Context7 TypeScript最佳实践，避免重复导出冲突

// 补充缺失的Hook类型定义
export interface UnifiedTestEngineHook {
  activeTests: Map<string, TestStatusInfo>;
  engineState: EngineState;
  executeTest: (config: TestExecutionRequest) => Promise<string>;
  getTestStatus: (testId: string) => Promise<TestStatusInfo | null>;
  cancelTest: (testId: string) => Promise<boolean>;
  getStats: () => EngineStats;
}

export interface TestExecutionHook {
  execute: (config: TestExecutionRequest) => Promise<string>;
  cancel: (testId: string) => Promise<boolean>;
  getStatus: (testId: string) => Promise<TestStatusInfo | null>;
}

export interface TestResultAnalysisHook {
  analysis: TestResultAnalysis | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
