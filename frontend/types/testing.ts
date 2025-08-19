import { Timestamp, UUID } from "./common";

export enum TestStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  PAUSED = "paused"
}

export enum TestType {
  STRESS = "stress",
  SECURITY = "security",
  SEO = "seo",
  API = "api",
  COMPATIBILITY = "compatibility",
  PERFORMANCE = "performance",
  ACCESSIBILITY = "accessibility",
  UX = "ux",
  LOAD = "load",
  SMOKE = "smoke"
}

export enum TestPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

export enum TestSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical"
}

export interface BaseTestConfig {
  id?: UUID;
  name: string;
  description?: string;
  url: string;
  priority?: TestPriority;
  environment?: "development" | "staging" | "production";
  metadata?: Record<string, any>;
}

export interface StressTestConfig extends BaseTestConfig {
  users: number;
  duration: number;
  rampUp: number;
  testType?: "load" | "stress" | "spike" | "volume";
  steps: StressTestStep[];
}

export interface StressTestStep {
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  weight?: number;
  thinkTime?: number;
  assertions?: Array<{
    type: "status" | "response_time" | "body_contains";
    value: any;
    operator?: "equals" | "greater_than" | "less_than" | "contains";
  }>;
}

export interface SecurityTestConfig extends BaseTestConfig {
  scanDepth?: "shallow" | "medium" | "deep";
  includeSubdomains?: boolean;
  authRequired?: boolean;
  authentication?: {
    type: "basic" | "bearer" | "cookie" | "custom";
    credentials?: Record<string, string>;
  };
  customPayloads?: string[];
  excludeUrls?: string[];
  maxScanTime?: number;
  reportFormat?: "html" | "json" | "xml";
}

export interface APITestConfig extends BaseTestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  expectedStatus?: number[];
  authentication?: {
    type: "apikey" | "bearer" | "basic" | "oauth";
    credentials?: Record<string, string>;
  };
  environment?: "development" | "production" | "staging";
}

export interface APIEndpoint {
  id: UUID;
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description?: string;
  headers?: Record<string, string>;
  parameters?: Record<string, any>;
  body?: string | Record<string, any>;
  tests?: APITest[];
}

export interface APITest {
  id: UUID;
  name: string;
  type: "response_time" | "status_code" | "response_body" | "headers" | "schema";
  expected: any;
  operator?: "equals" | "greater_than" | "less_than" | "contains" | "matches";
  description?: string;
}

export interface TestResult {
  id: UUID;
  testId: UUID;
  testType: TestType;
  testName: string;
  url: string;

  status: TestStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number;

  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F";

  config: BaseTestConfig;
  result: Record<string, any>;

  issues: TestIssue[];
  recommendations: TestRecommendation[];
  attachments: TestAttachment[];

  metadata: Record<string, any>;
  error?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestIssue {
  id: string;
  type: string;
  severity: TestSeverity;
  title: string;
  description: string;
  impact: string;
  solution: string;
  line?: number;
  column?: number;
  file?: string;
  url?: string;
  category?: string;
  tags?: string[];
}

export interface TestRecommendation {
  id: string;
  category: string;
  priority: TestPriority;
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

export interface TestAttachment {
  id: string;
  name: string;
  type: "screenshot" | "video" | "report" | "log" | "data";
  url: string;
  size: number;
  mimeType: string;
  description?: string;
  createdAt: Timestamp;
}

export interface TestLog {
  id: string;
  testId: UUID;
  timestamp: Timestamp;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: Record<string, any>;
  source?: string;
  category?: string;
}

export interface TestSession {
  id: UUID;
  name: string;
  description?: string;
  status: "active" | "completed" | "cancelled";
  startedAt: Timestamp;
  completedAt?: Timestamp;

  tests: TestResult[];

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

export interface TestSchedule {
  id: UUID;
  name: string;
  description?: string;
  testConfigs: BaseTestConfig[];
  schedule?: {
    type: "once" | "recurring";
    startAt?: Timestamp;
    interval?: number;
    endAt?: Timestamp;
    timezone?: string;
  };
  status: "active" | "paused" | "completed";
  lastRun?: Timestamp;
  nextRun?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestReport {
  id: UUID;
  name: string;
  description?: string;
  type: "single" | "comparison" | "trend";
  testIds: UUID[];
  format: "html" | "pdf" | "json" | "csv";

  config: {
    includeDetails: boolean;
    includeRecommendations: boolean;
    includeAttachments: boolean;
    customSections?: string[];
  };

  status: "generating" | "ready" | "failed";
  url?: string;
  size?: number;
  expiresAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestMetrics {
  totalTests: number;
  completedTests: number;
  failedTests: number;
  averageScore: number;
  averageDuration: number;
  successRate: number;

  byType: Record<TestType, {
    count: number;
    averageScore: number;
    successRate: number;
  }>;

  byPriority: Record<TestPriority, {
    count: number;
    averageScore: number;
    successRate: number;
  }>;

  trends: {
    daily: Array<{
      date: string;
      count: number;
      averageScore: number;
      successRate: number;
    }>;
    weekly: Array<{
      week: string;
      count: number;
      averageScore: number;
      successRate: number;
    }>;
  };
}

export interface TestQuery {
  testType?: TestType | TestType[];
  status?: TestStatus | TestStatus[];
  priority?: TestPriority | TestPriority[];

  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };

  scoreRange?: {
    min: number;
    max: number;
  };

  search?: string;
  url?: string;
  testName?: string;

  tags?: string[];

  sortBy?: "createdAt" | "startedAt" | "completedAt" | "duration" | "overallScore" | "testName" | "status";
  sortOrder?: "asc" | "desc";

  page?: number;
  limit?: number;
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

  progress?: {
    total: number;
    completed: number;
    failed: number;
    current?: string;
  };

  results: TestResult[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ���Ͳ���ҪĬ�ϵ���
