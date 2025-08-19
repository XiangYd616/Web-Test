import type { TestPriority } from "./enums";

export type UUID = string;
export type URL = string;
export type Timestamp = string;

export interface BaseTestConfig {
  id?: UUID;
  name: string;
  description?: string;
  url: URL;
  priority?: TestPriority;
  timeout?: number;
  retries?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface BaseTestResult {
  id: UUID;
  testId: UUID;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  score?: number;
  grade?: string;
  errors: TestError[];
  warnings: TestWarning[];
  recommendations: TestRecommendation[];
}

export interface TestError {
  code: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  line?: number;
  column?: number;
  file?: string;
  stack?: string;
}

export interface TestWarning {
  code: string;
  message: string;
  severity: "info" | "warning";
  suggestion?: string;
  line?: number;
  column?: number;
  file?: string;
}

export interface TestRecommendation {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  category: string;
  action?: string;
  resources?: Array<{
    title: string;
    url: string;
    type: "documentation" | "tutorial" | "tool";
  }>;
}

export interface PerformanceTestConfig extends BaseTestConfig {
  device?: "desktop" | "mobile" | "tablet";
  throttling?: "none" | "3g" | "4g" | "slow-3g";
  cacheDisabled?: boolean;
  metrics?: string[];
  lighthouse?: {
    categories?: string[];
    onlyCategories?: string[];
    skipAudits?: string[];
  };
}

export interface PerformanceTestResult extends BaseTestResult {
  metrics: {
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
    tti?: number;
    tbt?: number;
    si?: number;
  };
  lighthouse?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    pwa: number;
  };
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    savings: number;
    impact: "low" | "medium" | "high";
  }>;
}

export interface SecurityTestConfig extends BaseTestConfig {
  scanDepth?: "shallow" | "medium" | "deep";
  includeSubdomains?: boolean;
  authConfig?: {
    type: "none" | "basic" | "bearer" | "cookie";
    credentials?: Record<string, string>;
  };
  customPayloads?: string[];
}

export interface SecurityTestResult extends BaseTestResult {
  vulnerabilities: Array<{
    id: string;
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    impact: string;
    solution: string;
    cwe?: string;
    cvss?: number;
    evidence?: {
      request?: string;
      response?: string;
      payload?: string;
    };
  }>;
  securityScore: number;
  compliance: {
    owasp: number;
    pci: number;
    gdpr: number;
  };
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
  validation?: {
    schema?: Record<string, any>;
    rules?: Array<{
      field: string;
      operator: "equals" | "contains" | "matches" | "exists";
      value?: any;
    }>;
  };
}

export interface APITestResult extends BaseTestResult {
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    size: number;
    time: number;
  };
  validationResults: Array<{
    field: string;
    expected: any;
    actual: any;
    passed: boolean;
    message?: string;
  }>;
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
}

export interface StressTestConfig extends BaseTestConfig {
  users: number;
  duration: number;
  rampUp: number;
  testType?: "load" | "stress" | "spike" | "volume";
  scenarios?: Array<{
    name: string;
    weight: number;
    steps: Array<{
      action: "request" | "wait" | "think";
      config: Record<string, any>;
    }>;
  }>;
}

export interface StressTestResult extends BaseTestResult {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
  };
  timeline: Array<{
    timestamp: Timestamp;
    activeUsers: number;
    responseTime: number;
    throughput: number;
    errorRate: number;
  }>;
  errors: TestError[];
}

export interface SEOTestConfig extends BaseTestConfig {
  includeImages?: boolean;
  includeLinks?: boolean;
  includeMetadata?: boolean;
  includeStructuredData?: boolean;
  mobileOptimization?: boolean;
}

export interface SEOTestResult extends BaseTestResult {
  seoScore: number;
  checks: Array<{
    id: string;
    name: string;
    passed: boolean;
    score: number;
    impact: "low" | "medium" | "high";
    description: string;
    recommendation?: string;
  }>;
  metadata: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    robots?: string;
    openGraph?: Record<string, string>;
    twitterCard?: Record<string, string>;
  };
  structuredData: Array<{
    type: string;
    valid: boolean;
    errors: string[];
  }>;
}

export interface TestEngine<TConfig extends BaseTestConfig, TResult extends BaseTestResult> {
  name: string;
  version: string;
  description: string;
  supportedTypes: string[];

  validateConfig(config: TConfig): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  runTest(config: TConfig): Promise<TResult>;
  stopTest(testId: UUID): Promise<void>;

  getTestStatus(testId: UUID): Promise<{
    status: string;
    progress: number;
    message?: string;
  }>;

  getConfigSchema(): Record<string, any>;
}

export interface TestEngineManager {
  registerEngine<TConfig extends BaseTestConfig, TResult extends BaseTestResult>(
    type: string,
    engine: TestEngine<TConfig, TResult>
  ): void;

  getEngine(type: string): TestEngine<any, any> | undefined;
  getSupportedTypes(): string[];

  runTest<TConfig extends BaseTestConfig>(
    type: string,
    config: TConfig
  ): Promise<BaseTestResult>;
}

export const DEFAULT_TEST_CONFIG: Partial<BaseTestConfig> = {
  timeout: 30000,
  retries: 3,
  priority: "medium" as TestPriority,
  tags: [],
  metadata: {}
};

// ���Ͳ���ҪĬ�ϵ���
