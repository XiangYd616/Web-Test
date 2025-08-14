

export type TestType = 'api' | 'compatibility' | 'infrastructure' | 'security' | 'seo' | 'stress' | 'ux' | 'website';

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
  // checkAccessibility: boolean; // Removed - functionality moved to compatibility test
  checkPerformance: boolean;
  checkLinks?: boolean;
  checkSecurity?: boolean;
  checkImages?: boolean;
  checkSpeed?: boolean;
  customKeywords?: string[];
  depth?: number;
}

export interface SecurityTestConfig extends TestConfig {
  checkSSL: boolean;
  checkHeaders: boolean;
  checkCSP: boolean;
  checkXSS: boolean;
  checkSQLInjection: boolean;
  checkCSRF?: boolean;
  checkCookies: boolean;
  checkRedirects: boolean;
  checkMixedContent: boolean;
}

export interface APITestConfig extends TestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: string;
  expectedStatus?: number;
  expectedResponse?: string;
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
  };
}

export interface NetworkTestConfig extends TestConfig {
  testLatency?: boolean;
  testBandwidth?: boolean;
  testConnectivity?: boolean;
  testDNS?: boolean;
  testRouting?: boolean;
  testFirewall?: boolean;
  packetCount?: number;
}

export interface TestResult {
  id: string;
  testType: TestType;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  score?: number;
  metrics?: Record<string, any>;
  errors?: string[];
  warnings?: string[];
  recommendations?: string[];
  screenshots?: string[];
  reports?: {
    html?: string;
    json?: string;
    pdf?: string;
  };
}

export interface TestHistory {
  id: string;
  testName: string;
  testType: TestType;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  score: number;
  grade?: string;
  duration: number; // 秒
  startTime: string;
  endTime: string;
  userId?: string;
  totalIssues?: number;
  criticalIssues?: number;
  majorIssues?: number;
  minorIssues?: number;
  warnings?: number;
  environment?: string;
  tags?: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestFilter {
  testType?: TestType;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  userId?: string;
  search?: string;
  priority?: string;
}

export interface TestEngine {
  name: string;
  version: string;
  available: boolean;
  status: 'healthy' | 'warning' | 'error';
  capabilities?: string[];
  lastCheck?: string;
  error?: string;
}

export interface TestProgress {
  testId: string;
  stage: string;
  progress: number;
  message: string;
  timestamp: string;
}

export interface TestTemplate {
  id: string;
  name: string;
  description: string;
  testType: TestType;
  config: TestConfig;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestSchedule {
  id: string;
  name: string;
  testType: TestType;
  config: TestConfig;
  schedule: {
    type: 'once' | 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  };
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
  createdBy: string;
  createdAt: string;
}

export interface TestReport {
  id: string;
  testId: string;
  testType: TestType;
  url: string;
  generatedAt: string;
  format: 'html' | 'pdf' | 'json';
  filePath: string;
  fileSize: number;
  summary: {
    score: number;
    status: string;
    duration: number;
    issues: number;
    recommendations: number;
  };
}

// 简化的测试配置接口（兼容性）
export interface SimpleStressTestConfig {
  url: string;
  users: number;
  duration: number;
  rampUpTime?: number;
}

export interface SimpleContentTestConfig {
  url: string;
  checkSEO: boolean;
  checkAccessibility: boolean;
  checkPerformance: boolean;
  keywords?: string[];
}

export interface SimpleSecurityTestConfig {
  url: string;
  checkSSL: boolean;
  checkHeaders: boolean;
  checkXSS: boolean;
  checkSQLInjection: boolean;
}

export interface TestEngineStatus {
  k6: TestEngine;
  lighthouse: TestEngine;
  playwright: TestEngine;
  zap: TestEngine;
  nuclei: TestEngine;
}

// 批量测试
export interface BatchTestConfig {
  name: string;
  urls: string[];
  testType: TestType;
  config: TestConfig;
  parallel: boolean;
  maxConcurrency?: number;
}

export interface BatchTestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalTests: number;
  completedTests: number;
  failedTests: number;
  startTime: string;
  endTime?: string;
  results: TestResult[];
}
