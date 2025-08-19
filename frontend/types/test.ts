export type TestType = "api" | "compatibility" | "infrastructure" | "security" | "seo" | "stress" | "ux" | "website";

export interface TestConfig {
  url: string;
  timeout?: number;
  retries?: number;
  userAgent?: string;
  headers?: Record<string, string>;
}

export interface PerformanceTestConfig extends TestConfig {
  users: number;
  duration: number;
  rampUpTime?: number;
  thresholds?: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
}

export interface ContentTestConfig extends TestConfig {
  checkSEO: boolean;
  checkPerformance: boolean;
  checkLinks?: boolean;
  checkSecurity?: boolean;
  checkImages?: boolean;
  checkSpeed?: boolean;
  customKeywords?: string[];
  depth?: number;
}

export interface SecurityTestConfig extends TestConfig {
  scanDepth?: "shallow" | "medium" | "deep";
  includeSubdomains?: boolean;
  authRequired?: boolean;
  customPayloads?: string[];
}

export interface APITestConfig extends TestConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: string | Record<string, any>;
  expectedStatus?: number[];
  authentication?: {
    type: "bearer" | "basic" | "api-key";
    credentials?: Record<string, string>;
  };
}

export interface TestResult {
  id: string;
  testId: string;
  type: TestType;
  url: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startTime: string;
  endTime?: string;
  duration?: number;
  score: number;
  grade: string;
  passed: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  details: Record<string, any>;
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
  }>;
  error?: string;
}

export interface TestSession {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startTime: string;
  endTime?: string;
  duration?: number;
  tests: TestResult[];
  summary: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageScore: number;
  };
}

export interface TestEngine {
  id: string;
  name: string;
  type: TestType;
  version: string;
  status: "healthy" | "warning" | "error";
  capabilities: string[];
  config: Record<string, any>;
  lastHealthCheck: string;
}

export interface TestQueue {
  id: string;
  name: string;
  status: "active" | "paused" | "stopped";
  tests: Array<{
    id: string;
    priority: number;
    config: TestConfig;
    status: "queued" | "running" | "completed" | "failed";
  }>;
  maxConcurrency: number;
  currentRunning: number;
}

export interface TestSchedule {
  id: string;
  name: string;
  description?: string;
  testConfigs: TestConfig[];
  schedule: {
    type: "once" | "daily" | "weekly" | "monthly";
    startTime: string;
    interval?: number;
    endTime?: string;
  };
  status: "active" | "paused" | "completed";
  lastRun?: string;
  nextRun?: string;
}

export interface TestReport {
  id: string;
  name: string;
  type: "single" | "comparison" | "trend";
  testIds: string[];
  format: "html" | "pdf" | "json";
  status: "generating" | "ready" | "failed";
  url?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface TestMetrics {
  totalTests: number;
  completedTests: number;
  failedTests: number;
  averageScore: number;
  averageDuration: number;
  successRate: number;
  testsToday: number;
  testsThisWeek: number;
  testsThisMonth: number;
}

export interface BatchTestConfig {
  name: string;
  description?: string;
  tests: Array<{
    type: TestType;
    config: TestConfig;
  }>;
  maxConcurrency?: number;
}

export interface BatchTestResult {
  id: string;
  batchId: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime: string;
  endTime?: string;
  duration?: number;
  results: TestResult[];
  summary: {
    total: number;
    completed: number;
    failed: number;
    averageScore: number;
  };
}

// 类型不需要默认导出
