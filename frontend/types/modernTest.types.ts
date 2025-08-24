// 现代化测试类型定义

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'security' | 'quality' | 'monitoring';
  tests: TestCase[];
  schedule?: TestSchedule;
  notifications?: NotificationConfig;
}

export interface TestCase {
  id: string;
  name: string;
  type: TestType;
  config: TestConfig;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeout: number;
  retries: number;
  dependencies?: string[];
}

// 重命名以避免与统一类型系统中的TestType冲突
export type ModernTestType =
  | 'core-web-vitals'
  | 'lighthouse-audit'
  | 'security-scan'
  | 'load-test'
  | 'api-test'
  // | 'accessibility-test' // Removed - functionality moved to compatibility test
  | 'seo-audit'
  | 'uptime-monitor'
  | 'synthetic-monitor'
  | 'real-user-monitor';

// 兼容性导出
export type TestType = ModernTestType;

export interface CoreWebVitalsConfig extends TestConfig {
  metrics: {
    lcp: { threshold: number; weight: number };
    fid: { threshold: number; weight: number };
    cls: { threshold: number; weight: number };
    fcp: { threshold: number; weight: number };
    ttfb: { threshold: number; weight: number };
  };
  devices: ('desktop' | 'mobile' | 'tablet')[];
  locations: string[];
  throttling: 'none' | '3g' | '4g' | 'slow-3g';
}

export interface LighthouseAuditConfig extends TestConfig {
  categories: {
    performance: boolean;
    accessibility: boolean;
    bestPractices: boolean;
    seo: boolean;
    pwa: boolean;
  };
  device: 'desktop' | 'mobile';
  throttling: 'none' | 'simulated-3g' | 'simulated-4g';
  locale: string;
  onlyCategories?: string[];
}

export interface SecurityScanConfig extends TestConfig {
  depth: 'surface' | 'deep' | 'comprehensive';
  checks: {
    ssl: boolean;
    headers: boolean;
    vulnerabilities: boolean;
    authentication: boolean;
    authorization: boolean;
    dataExposure: boolean;
    csrf: boolean;
    xss: boolean;
    sqlInjection: boolean;
  };
  excludePatterns?: string[];
  customPayloads?: SecurityPayload[];
}

export interface LoadTestConfig extends TestConfig {
  scenarios: LoadScenario[];
  duration: number;
  rampUp: number;
  rampDown: number;
  thresholds: {
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  regions: string[];
}

export interface LoadScenario {
  name: string;
  weight: number;
  executor: 'constant-vus' | 'ramping-vus' | 'constant-arrival-rate';
  stages: LoadStage[];
  options?: {
    userAgent?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  };
}

export interface LoadStage {
  duration: string;
  target: number;
}

export interface APITestConfig extends TestConfig {
  baseUrl: string;
  authentication?: {
    type: 'bearer' | 'basic' | 'oauth2' | 'api-key';
    credentials: Record<string, string>;
  };
  environments: {
    [key: string]: {
      baseUrl: string;
      variables: Record<string, string>;
    };
  };
  collections: APICollection[];
  globalSetup?: string;
  globalTeardown?: string;
}

export interface APICollection {
  name: string;
  requests: APIRequest[];
  variables?: Record<string, string>;
  preRequestScript?: string;
  postResponseScript?: string;
}

export interface APIRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: {
    type: 'json' | 'form' | 'raw' | 'binary';
    content: any;
  };
  assertions: APIAssertion[];
  extractors?: APIExtractor[];
}

export interface APIAssertion {
  type: 'status' | 'header' | 'body' | 'response-time' | 'json-path' | 'regex';
  target: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'greater-than' | 'less-than';
  value: any;
}

export interface APIExtractor {
  name: string;
  type: 'header' | 'json-path' | 'regex' | 'xpath';
  expression: string;
  scope: 'global' | 'collection' | 'request';
}

export interface UptimeMonitorConfig extends TestConfig {
  interval: number; // seconds
  locations: string[];
  alerting: {
    downtime: { threshold: number; channels: string[] };
    responseTime: { threshold: number; channels: string[] };
    ssl: { daysBeforeExpiry: number; channels: string[] };
  };
  maintenance: {
    windows: MaintenanceWindow[];
    pauseDuringMaintenance: boolean;
  };
}

export interface MaintenanceWindow {
  name: string;
  start: string; // cron expression
  duration: number; // minutes
  timezone: string;
}

export interface TestConfig {
  url: string;
  name?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TestSchedule {
  enabled: boolean;
  cron: string;
  timezone: string;
  maxConcurrent: number;
}

export interface NotificationConfig {
  channels: NotificationChannel[];
  conditions: NotificationCondition[];
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export interface NotificationCondition {
  metric: string;
  operator: 'greater-than' | 'less-than' | 'equals' | 'not-equals';
  threshold: number;
  duration?: number; // seconds
}

export interface SecurityPayload {
  name: string;
  type: 'xss' | 'sql' | 'command' | 'path-traversal' | 'custom';
  payload: string;
  expectedResponse?: string;
}

export interface TestResult {
  id: string;
  testId: string;
  suiteId?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  score?: number;
  metrics: Record<string, any>;
  issues: TestIssue[];
  recommendations: TestRecommendation[];
  artifacts: TestArtifact[];
  metadata: Record<string, any>;
}

export interface TestIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  impact: string;
  solution: string;
  references?: string[];
  location?: {
    file?: string;
    line?: number;
    column?: number;
    selector?: string;
  };
}

export interface TestRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  implementation: string;
  resources?: string[];
}

export interface TestArtifact {
  type: 'screenshot' | 'video' | 'har' | 'report' | 'log';
  name: string;
  url: string;
  size: number;
  metadata?: Record<string, any>;
}
