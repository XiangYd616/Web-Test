/**
 * 统一测试结果数据模型定义
 * 确保前后端完全一致的TestResult类型定义
 * 版本: v1.0.0
 * 创建时间: 2024-08-08
 */

// ==================== 基础类型定义 ====================

export type UUID = string;
export type Timestamp = string; // ISO 8601 格式
export type URL = string;

// ==================== 测试相关枚举定义 ====================

/**
 * 测试类型和状态枚举 - 已迁移到统一类型系统
 */
import { TestStatus, TestType } from './unified/testTypes';

/**
 * 测试优先级枚举
 */
export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 测试等级枚举
 */
export enum TestGrade {
  A_PLUS = 'A+',
  A = 'A',
  B_PLUS = 'B+',
  B = 'B',
  C_PLUS = 'C+',
  C = 'C',
  D = 'D',
  F = 'F'
}

// ==================== 测试配置接口 ====================

export interface BaseTestConfig {
  url: URL;
  timeout?: number; // 毫秒
  retries?: number;
  priority?: TestPriority;
  tags?: string[];
  environment?: 'development' | 'staging' | 'production';
  metadata?: Record<string, any>;
}

export interface PerformanceTestConfig extends BaseTestConfig {
  device?: 'desktop' | 'mobile' | 'tablet';
  throttling?: 'none' | '3g' | '4g' | 'slow-3g';
  location?: string;
  lighthouse?: boolean;
  metrics?: string[];
}

export interface SecurityTestConfig extends BaseTestConfig {
  scanDepth?: 'shallow' | 'medium' | 'deep';
  includeSubdomains?: boolean;
  checkSSL?: boolean;
  checkHeaders?: boolean;
  customPayloads?: string[];
}

export interface APITestConfig extends BaseTestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  expectedStatus?: number[];
  schema?: unknown;
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'api-key';
    credentials?: Record<string, string>;
  };
}

export interface StressTestConfig extends BaseTestConfig {
  concurrentUsers?: number;
  duration?: number; // 秒
  rampUpTime?: number; // 秒
  testType?: 'load' | 'stress' | 'spike' | 'volume';
}

// ==================== 测试结果相关接口 ====================

export interface TestError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  line?: number;
  column?: number;
  element?: string;
  details?: Record<string, any>;
}

export interface TestWarning {
  code: string;
  message: string;
  category?: string;
  element?: string;
  details?: Record<string, any>;
}

export interface TestRecommendation {
  id: string;
  category: string;
  priority: TestPriority;
  title: string;
  description: string;
  action: string;
  impact?: string;
  effort?: 'low' | 'medium' | 'high';
  savings?: number; // 预期改进分数
}

export interface TestMetrics {
  // 性能指标
  loadTime?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
  timeToInteractive?: number;
  speedIndex?: number;
  totalBlockingTime?: number;

  // 资源指标
  pageSize?: number;
  requestCount?: number;
  domElements?: number;

  // 自定义指标
  [key: string]: unknown;
}

export interface TestArtifact {
  type: 'screenshot' | 'video' | 'report' | 'log' | 'trace' | 'har';
  name: string;
  url?: string;
  path?: string;
  size?: number;
  mimeType?: string;
  metadata?: Record<string, any>;
}

// ==================== 核心测试结果接口 ====================

/**
 * 统一测试结果接口 - 前后端共享
 * 字段名称与数据库字段保持映射关系
 */
export interface TestResult {
  // 基础标识信息
  id: UUID;
  userId: UUID;
  testType: TestType;
  testName: string;
  url: URL;

  // 状态和时间信息
  status: TestStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number; // 毫秒

  // 评分和等级
  overallScore?: number; // 0-100
  grade?: TestGrade;

  // 测试配置和结果
  config: Record<string, any>;
  results: Record<string, any>;

  // 详细信息
  summary?: string;
  metrics?: TestMetrics;
  errors?: TestError[];
  warnings?: TestWarning[];
  recommendations?: TestRecommendation[];
  artifacts?: TestArtifact[];

  // 统计信息
  totalIssues?: number;
  criticalIssues?: number;
  majorIssues?: number;
  minorIssues?: number;
  warningCount?: number;

  // 环境和标签
  environment?: string;
  tags?: string[];
  description?: string;
  notes?: string;

  // 时间戳
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;

  // 元数据
  metadata?: Record<string, any>;
}

// ==================== 数据库映射接口 ====================

/**
 * 数据库字段映射接口
 * 用于前后端数据转换
 */
export interface TestResultDatabaseFields {
  id: string;
  user_id: string;
  test_type: string;
  test_name: string;
  url: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  overall_score?: number;
  grade?: string;
  config: string; // JSON字符串
  results: string; // JSON字符串
  summary?: string;
  total_issues?: number;
  critical_issues?: number;
  major_issues?: number;
  minor_issues?: number;
  warnings?: number;
  environment?: string;
  tags?: string[]; // PostgreSQL数组
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  metadata?: string; // JSON字符串
}

// ==================== 测试历史相关接口 ====================

export interface TestHistory {
  id: UUID;
  userId: UUID;
  testResults: TestResult[];
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageScore: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestSession {
  id: UUID;
  userId: UUID;
  name: string;
  description?: string;
  tests: TestResult[];
  status: 'active' | 'completed' | 'cancelled';
  startedAt: Timestamp;
  completedAt?: Timestamp;
  metadata?: Record<string, any>;
}

// ==================== 测试查询和过滤 ====================

export interface TestResultFilter {
  testType?: TestType | TestType[];
  status?: TestStatus | TestStatus[];
  userId?: UUID;
  url?: string;
  startedAfter?: Timestamp;
  startedBefore?: Timestamp;
  completedAfter?: Timestamp;
  completedBefore?: Timestamp;
  minScore?: number;
  maxScore?: number;
  grade?: TestGrade | TestGrade[];
  tags?: string[];
  environment?: string;
  hasErrors?: boolean;
  hasWarnings?: boolean;
}

export interface TestResultQuery {
  page?: number;
  limit?: number;
  sortBy?: 'startedAt' | 'completedAt' | 'overallScore' | 'testName' | 'duration';
  sortOrder?: 'asc' | 'desc';
  filter?: TestResultFilter;
  includeDeleted?: boolean;
}

// ==================== 测试统计信息 ====================

export interface TestStats {
  totalTests: number;
  completedTests: number;
  failedTests: number;
  runningTests: number;
  averageScore: number;
  averageDuration: number;
  testsByType: Record<TestType, number>;
  testsByStatus: Record<TestStatus, number>;
  testsByGrade: Record<TestGrade, number>;
  recentTests: TestResult[];
}

// ==================== 批量测试相关接口 ====================

export interface BatchTestRequest {
  name: string;
  description?: string;
  tests: Array<{
    testType: TestType;
    config: BaseTestConfig;
  }>;
  schedule?: {
    type: 'once' | 'recurring';
    startAt?: Timestamp;
    interval?: number; // 分钟
    endAt?: Timestamp;
  };
}

export interface BatchTestResult {
  id: UUID;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalTests: number;
  completedTests: number;
  failedTests: number;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  results: TestResult[];
  summary?: {
    averageScore: number;
    totalIssues: number;
    recommendations: TestRecommendation[];
  };
}

// ==================== 类型守卫函数 ====================

export function isValidTestType(type: string): type is TestType {
  return Object.values(TestType).includes(type as TestType);
}

export function isValidTestStatus(status: string): status is TestStatus {
  return Object.values(TestStatus).includes(status as TestStatus);
}

export function isValidTestPriority(priority: string): priority is TestPriority {
  return Object.values(TestPriority).includes(priority as TestPriority);
}

export function isValidTestGrade(grade: string): grade is TestGrade {
  return Object.values(TestGrade).includes(grade as TestGrade);
}

// ==================== 数据转换工具函数 ====================

/**
 * 将数据库字段转换为前端TestResult对象
 */
export function fromDatabaseFields(dbData: TestResultDatabaseFields): TestResult {
  return {
    id: dbData.id,
    userId: dbData.user_id,
    testType: dbData.test_type as TestType,
    testName: dbData.test_name,
    url: dbData.url,
    status: dbData.status as TestStatus,
    startedAt: dbData.started_at || '',
    completedAt: dbData.completed_at,
    duration: dbData.duration_ms,
    overallScore: dbData.overall_score,
    grade: dbData.grade as TestGrade,
    config: dbData.config ? JSON.parse(dbData.config) : {},
    results: dbData.results ? JSON.parse(dbData.results) : {},
    summary: dbData.summary,
    totalIssues: dbData.total_issues,
    criticalIssues: dbData.critical_issues,
    majorIssues: dbData.major_issues,
    minorIssues: dbData.minor_issues,
    warningCount: dbData.warnings,
    environment: dbData.environment,
    tags: dbData.tags || [],
    description: dbData.description,
    notes: dbData.notes,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
    deletedAt: dbData.deleted_at,
    metadata: dbData.metadata ? JSON.parse(dbData.metadata) : {}
  };
}

/**
 * 将前端TestResult对象转换为数据库字段
 */
export function toDatabaseFields(testResult: TestResult): TestResultDatabaseFields {
  return {
    id: testResult.id,
    user_id: testResult.userId,
    test_type: testResult.testType,
    test_name: testResult.testName,
    url: testResult.url,
    status: testResult.status,
    started_at: testResult.startedAt,
    completed_at: testResult.completedAt,
    duration_ms: testResult.duration,
    overall_score: testResult.overallScore,
    grade: testResult.grade,
    config: JSON.stringify(testResult.config),
    results: JSON.stringify(testResult.results),
    summary: testResult.summary,
    total_issues: testResult.totalIssues,
    critical_issues: testResult.criticalIssues,
    major_issues: testResult.majorIssues,
    minor_issues: testResult.minorIssues,
    warnings: testResult.warningCount,
    environment: testResult.environment,
    tags: testResult.tags,
    description: testResult.description,
    notes: testResult.notes,
    created_at: testResult.createdAt,
    updated_at: testResult.updatedAt,
    deleted_at: testResult.deletedAt,
    metadata: JSON.stringify(testResult.metadata)
  };
}
