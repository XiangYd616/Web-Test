// 测试相关类型定义

import { UUID, Timestamp, BaseEntity    } from './common';// 测试状态枚举'
export enum TestStatus {
  PENDING = 'pending','
  RUNNING = 'running','
  COMPLETED = 'completed','
  FAILED = 'failed','
  CANCELLED = 'cancelled','
  PAUSED = 'paused';
}

// 测试类型枚举
export enum TestType {
  STRESS = 'stress','
  SECURITY = 'security','
  SEO = 'seo','
  API = 'api','
  COMPATIBILITY = 'compatibility','
  PERFORMANCE = 'performance','
  ACCESSIBILITY = 'accessibility','
  UX = 'ux','
  LOAD = 'load','
  SMOKE = 'smoke';
}

// 测试优先级
export enum TestPriority {
  LOW = 'low','
  MEDIUM = 'medium','
  HIGH = 'high','
  CRITICAL = 'critical';
}

// 测试严重程度
export enum TestSeverity {
  INFO = 'info','
  WARNING = 'warning','
  ERROR = 'error','
  CRITICAL = 'critical';
}

// 基础测试配置
export interface BaseTestConfig     {
  url: string;
  timeout?: number;
  retries?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
}

// 压力测试配置
export interface StressTestConfig extends BaseTestConfig     {
  duration: number; // 测试持续时间（秒）
  concurrency: number; // 并发用户数
  rampUpTime?: number; // 爬坡时间（秒）
  rampDownTime?: number; // 降压时间（秒）
  thresholds?: {
    responseTime?: number; // 响应时间阈值（毫秒）
    errorRate?: number; // 错误率阈值（百分比）
    throughput?: number; // 吞吐量阈值（请求/秒）
  };
  scenarios?: StressTestScenario[];
}

// 压力测试场景
export interface StressTestScenario     {
  name: string;
  weight: number; // 权重（百分比）
  steps: StressTestStep[];
}

// 压力测试步骤
export interface StressTestStep     {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  checks?: StressTestCheck[];
  sleep?: number; // 等待时间（秒）
}

// 压力测试检查
export interface StressTestCheck     {
  name: string;
  condition: string; // 检查条件
  expected: any; // 期望值
}

// 安全测试配置
export interface SecurityTestConfig extends BaseTestConfig     {
  scanDepth?: 'shallow' | 'medium' | 'deep';
  includeTests?: string[]; // 包含的测试类型
  excludeTests?: string[]; // 排除的测试类型
  authentication?: {
    type: 'basic' | 'bearer' | 'cookie' | 'custom';
    credentials: Record<string, string>;
  };
  scope?: {
    includePaths?: string[];
    excludePaths?: string[];
    maxPages?: number;
  };
}

// SEO测试配置
export interface SEOTestConfig extends BaseTestConfig     {
  checkMobile?: boolean;
  checkDesktop?: boolean;
  lighthouse?: boolean;
  pagespeed?: boolean;
  includeChecks?: string[];
  excludeChecks?: string[];
}

// API测试配置
export interface APITestConfig extends BaseTestConfig     {
  baseUrl: string;
  endpoints: APIEndpoint[];
  authentication?: {
    type: 'apikey' | 'bearer' | 'basic' | 'oauth';
    config: Record<string, string>;
  };
  environment?: string;
}

// API端点定义
export interface APIEndpoint     {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, any>;
  body?: any;
  expectedStatus?: number;
  expectedResponse?: any;
  tests?: APITest[];
}

// API测试用例
export interface APITest     {
  name: string;
  type: 'response_time' | 'status_code' | 'response_body' | 'headers' | 'schema';
  condition: string;
  expected: any;
}

// 兼容性测试配置
export interface CompatibilityTestConfig extends BaseTestConfig     {
  browsers?: string[]; // 浏览器列表
  devices?: string[]; // 设备列表
  viewports?: Array<{ width: number; height: number; name: string }>;
  features?: string[]; // 要测试的功能特性
}

// 测试实例
export interface TestInstance extends BaseEntity     {
  name: string;
  description?: string;
  type: TestType;
  status: TestStatus;
  priority: TestPriority;
  config: BaseTestConfig;
  tags?: string[];
  userId: UUID;
  projectId?: UUID;
  scheduledAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  duration?: number; // 执行时间（毫秒）
  progress?: number; // 进度百分比
  results?: TestResult;
  logs?: TestLog[];
  metadata?: Record<string, any>;
}

// 测试结果
export interface TestResult     {
  id: UUID;
  testId: UUID;
  status: TestStatus;
  score?: number; // 总分
  summary: TestSummary;
  details: TestDetails;
  metrics: TestMetrics;
  issues: TestIssue[];
  recommendations: TestRecommendation[];
  artifacts?: TestArtifact[]; // 测试产物（截图、报告等）
  rawData?: any; // 原始数据
}

// 测试摘要
export interface TestSummary     {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  skippedChecks: number;
  duration: number;
  startTime: Timestamp;
  endTime: Timestamp;
}

// 测试详情
export interface TestDetails     {
  [category: string]: {
    score?: number;
    status: TestStatus;
    checks: TestCheck[];
    metrics?: Record<string, number>;
  };
}

// 测试检查项
export interface TestCheck     {
  id: string;
  name: string;
  description?: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  severity: TestSeverity;
  message?: string;
  expected?: any;
  actual?: any;
  impact?: string;
  category?: string;
  tags?: string[];
}

// 测试指标
export interface TestMetrics     {
  performance?: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    cpuUsage?: number;
    memoryUsage?: number;
  };
  security?: {
    vulnerabilities: number;
    riskScore: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  seo?: {
    score: number;
    mobileScore?: number;
    desktopScore?: number;
    accessibility: number;
    bestPractices: number;
    performance: number;
  };
  compatibility?: {
    supportedBrowsers: number;
    totalBrowsers: number;
    supportedDevices: number;
    totalDevices: number;
  };
}

// 测试问题
export interface TestIssue     {
  id: string;
  type: string;
  severity: TestSeverity;
  title: string;
  description: string;
  impact?: string;
  solution?: string;
  category?: string;
  location?: {
    url?: string;
    line?: number;
    column?: number;
    selector?: string;
  };
  evidence?: {
    screenshot?: string;
    code?: string;
    request?: any;
    response?: any;
  };
}

// 测试建议
export interface TestRecommendation     {
  id: string;
  category: string;
  priority: TestPriority;
  title: string;
  description: string;
  impact?: string;
  effort?: 'low' | 'medium' | 'high';
  resources?: Array<{
    title: string;
    url: string;
    type: 'documentation' | 'tutorial' | 'tool' | 'example';
  }>;
}

// 测试产物
export interface TestArtifact     {
  id: string;
  type: 'screenshot' | 'video' | 'report' | 'log' | 'data';
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  description?: string;
  timestamp: Timestamp;
}

// 测试日志
export interface TestLog     {
  id: string;
  timestamp: Timestamp;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  category?: string;
  data?: any;
}

// 测试模板
export interface TestTemplate     {
  id: UUID;
  name: string;
  description?: string;
  type: TestType;
  config: BaseTestConfig;
  tags?: string[];
  isPublic?: boolean;
  userId: UUID;
  usageCount?: number;
  rating?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 测试计划
export interface TestPlan     {
  id: UUID;
  name: string;
  description?: string;
  tests: UUID[]; // 测试ID列表
  schedule?: {
    type: 'once' | 'recurring';
    startTime: Timestamp;
    endTime?: Timestamp;
    interval?: string; // cron表达式
    timezone?: string;
  };
  notifications?: {
    onStart?: boolean;
    onComplete?: boolean;
    onFailure?: boolean;
    recipients?: string[];
  };
  userId: UUID;
  projectId?: UUID;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 测试报告
export interface TestReport     {
  id: UUID;
  name: string;
  type: 'single' | 'comparison' | 'trend';
  testIds: UUID[];
  format: 'html' | 'pdf' | 'json' | 'csv';
  config: {
    includeDetails?: boolean;
    includeMetrics?: boolean;
    includeRecommendations?: boolean;
    includeArtifacts?: boolean;
    customSections?: string[];
  };
  url?: string;
  status: 'generating' | 'ready' | 'failed';
  userId: UUID;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}
