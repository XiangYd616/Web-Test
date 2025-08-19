export type UUID = string;
export type Timestamp = string;
export type URL = string;

export enum TestType {
  API = "api",
  COMPATIBILITY = "compatibility",
  INFRASTRUCTURE = "infrastructure",
  SECURITY = "security",
  SEO = "seo",
  STRESS = "stress",
  UX = "ux",
  WEBSITE = "website",
}

export enum TestStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum TestPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum TestGrade {
  A_PLUS = "A+",
  A = "A",
  B_PLUS = "B+",
  B = "B",
  C_PLUS = "C+",
  C = "C",
  D_PLUS = "D+",
  D = "D",
  F = "F",
}

export interface BaseTestConfig {
  id?: UUID;
  name: string;
  description?: string;
  url: URL;
  priority?: TestPriority;
  environment?: "development" | "staging" | "production";
  metadata?: Record<string, any>;
}

export interface PerformanceTestConfig extends BaseTestConfig {
  device?: "desktop" | "mobile" | "tablet";
  throttling?: "none" | "3g" | "4g" | "slow-3g";
  cacheDisabled?: boolean;
  metrics?: string[];
}

export interface SecurityTestConfig extends BaseTestConfig {
  scanDepth?: "shallow" | "medium" | "deep";
  includeSubdomains?: boolean;
  authRequired?: boolean;
  customPayloads?: string[];
}

export interface APITestConfig extends BaseTestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  expectedStatus?: number[];
  authentication?: {
    type: "none" | "basic" | "bearer" | "api-key";
    credentials?: Record<string, string>;
  };
}

export interface StressTestConfig extends BaseTestConfig {
  users: number;
  duration: number;
  rampUp: number;
  testType?: "load" | "stress" | "spike" | "volume";
}

export interface TestIssue {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  impact: string;
  solution: string;
  line?: number;
  column?: number;
  file?: string;
}

export interface TestRecommendation {
  id: string;
  category: string;
  priority: "low" | "medium" | "high";
  title: string;
  description: string;
  impact: string;
  effort?: "low" | "medium" | "high";
  resources?: Array<{
    title: string;
    url: string;
    type: "documentation" | "tutorial" | "tool" | "example";
  }>;
}

export interface TestResultMetadata {
  version: string;
  userAgent: string;
  timestamp: Timestamp;
  duration: number;
  environment: "development" | "staging" | "production";
  [key: string]: any;
}

export interface TestResultAttachment {
  id: string;
  name: string;
  type: "screenshot" | "video" | "report" | "log" | "trace" | "har";
  url: string;
  size: number;
  mimeType: string;
  description?: string;
}

export interface TestResult {
  id: UUID;
  testId: UUID;
  testType: TestType;
  testName: string;
  url: URL;
  
  status: TestStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number;
  
  overallScore: number;
  grade: TestGrade;
  
  config: BaseTestConfig;
  result: Record<string, any>;
  
  issues: TestIssue[];
  recommendations: TestRecommendation[];
  
  attachments: TestResultAttachment[];
  metadata: TestResultMetadata;
  
  error?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestSession {
  id: UUID;
  name: string;
  description?: string;
  status: "active" | "completed" | "cancelled";
  startedAt: Timestamp;
  completedAt?: Timestamp;
  
  results: TestResult[];
  
  summary: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageScore: number;
    totalDuration: number;
  };
  
  metadata: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestResultSummary {
  totalTests: number;
  completedTests: number;
  failedTests: number;
  averageScore: number;
  averageDuration: number;
  lastTestAt?: Timestamp;
  hasErrors: boolean;
  hasWarnings?: boolean;
}

export interface TestResultQuery {
  testType?: TestType;
  status?: TestStatus;
  sortBy?: "startedAt" | "completedAt" | "overallScore" | "testName" | "duration";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  search?: string;
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface TestBatch {
  id: UUID;
  name: string;
  description?: string;
  
  tests: Array<{
    testType: TestType;
    config: BaseTestConfig;
  }>;
  
  schedule?: {
    type: "once" | "recurring";
    startAt?: Timestamp;
    interval?: number;
    endAt?: Timestamp;
  };
  
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestResultDatabaseFields {
  id: string;
  test_id: string;
  test_type: string;
  test_name: string;
  url: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration?: number;
  overall_score: number;
  grade: string;
  config: string;
  result: string;
  issues: string;
  recommendations: string;
  attachments: string;
  metadata: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

export function fromDatabaseFields(dbData: TestResultDatabaseFields): TestResult {
  return {
    id: dbData.id,
    testId: dbData.test_id,
    testType: dbData.test_type as TestType,
    testName: dbData.test_name,
    url: dbData.url,
    status: dbData.status as TestStatus,
    startedAt: dbData.started_at,
    completedAt: dbData.completed_at,
    duration: dbData.duration,
    overallScore: dbData.overall_score,
    grade: dbData.grade as TestGrade,
    config: JSON.parse(dbData.config),
    result: JSON.parse(dbData.result),
    issues: JSON.parse(dbData.issues),
    recommendations: JSON.parse(dbData.recommendations),
    attachments: JSON.parse(dbData.attachments),
    metadata: JSON.parse(dbData.metadata),
    error: dbData.error,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at
  };
}

export function toDatabaseFields(testResult: TestResult): TestResultDatabaseFields {
  return {
    id: testResult.id,
    test_id: testResult.testId,
    test_type: testResult.testType,
    test_name: testResult.testName,
    url: testResult.url,
    status: testResult.status,
    started_at: testResult.startedAt,
    completed_at: testResult.completedAt,
    duration: testResult.duration,
    overall_score: testResult.overallScore,
    grade: testResult.grade,
    config: JSON.stringify(testResult.config),
    result: JSON.stringify(testResult.result),
    issues: JSON.stringify(testResult.issues),
    recommendations: JSON.stringify(testResult.recommendations),
    attachments: JSON.stringify(testResult.attachments),
    metadata: JSON.stringify(testResult.metadata),
    error: testResult.error,
    created_at: testResult.createdAt,
    updated_at: testResult.updatedAt
  };
}

// 类型不需要默认导出
