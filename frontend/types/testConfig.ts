/**
 * 统一的测试配置类型定义
 * 与后端测试引擎接口完全匹配
 */

// 基础配置接口
export interface BaseTestConfig {
  url: string;
  timeout?: number;
}

// API测试配置
export interface APITestConfig extends BaseTestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  auth?: {
    type: 'bearer' | 'basic' | 'apikey';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  validation?: {
    statusCode?: number;
    responseTime?: number;
    contentType?: string;
    schema?: any;
  };
}

// 性能测试配置
export interface PerformanceTestConfig extends BaseTestConfig {
  categories?: ('performance' | 'accessibility' | 'best-practices' | 'seo')[];
  device?: 'desktop' | 'mobile';
  throttling?: {
    rttMs?: number;
    throughputKbps?: number;
    cpuSlowdownMultiplier?: number;
  };
  locale?: string;
  emulatedFormFactor?: 'desktop' | 'mobile';
}

// 安全测试配置
export interface SecurityTestConfig extends BaseTestConfig {
  checks?: ('ssl' | 'headers' | 'vulnerabilities' | 'cookies' | 'redirects')[];
  maxRedirects?: number;
  userAgent?: string;
}

// SEO测试配置
export interface SEOTestConfig extends BaseTestConfig {
  checks?: ('meta' | 'headings' | 'images' | 'links' | 'structured-data' | 'robots' | 'sitemap')[];
  userAgent?: string;
}

// 压力测试配置
export interface StressTestConfig extends BaseTestConfig {
  concurrency?: number;
  requests?: number;
  duration?: number;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  rampUp?: number;
  keepAlive?: boolean;
}

// 基础设施测试配置
export interface InfrastructureTestConfig extends BaseTestConfig {
  checks?: ('connectivity' | 'dns' | 'ssl' | 'ports' | 'headers' | 'redirects')[];
  ports?: number[];
  dnsServers?: string[];
  maxRedirects?: number;
}

// UX测试配置
export interface UXTestConfig extends BaseTestConfig {
  checks?: ('accessibility' | 'usability' | 'interactions' | 'mobile' | 'forms')[];
  device?: 'desktop' | 'mobile' | 'tablet';
  viewport?: {
    width: number;
    height: number;
  };
  waitForSelector?: string;
  interactions?: Array<{
    type: 'click' | 'type' | 'scroll' | 'hover';
    selector: string;
    value?: string;
  }>;
}

// 兼容性测试配置
export interface CompatibilityTestConfig extends BaseTestConfig {
  browsers?: ('chromium' | 'firefox' | 'webkit')[];
  devices?: ('desktop' | 'mobile' | 'tablet')[];
  checks?: ('rendering' | 'javascript' | 'css' | 'responsive' | 'features')[];
  screenshots?: boolean;
  waitForSelector?: string;
}

// 网站综合测试配置
export interface WebsiteTestConfig extends BaseTestConfig {
  checks?: ('health' | 'seo' | 'performance' | 'security' | 'accessibility' | 'best-practices')[];
  depth?: number;
  maxPages?: number;
  followExternalLinks?: boolean;
  userAgent?: string;
}

// 联合类型
export type TestConfig =
  | APITestConfig
  | PerformanceTestConfig
  | SecurityTestConfig
  | SEOTestConfig
  | StressTestConfig
  | InfrastructureTestConfig
  | UXTestConfig
  | CompatibilityTestConfig
  | WebsiteTestConfig;

// 测试类型枚举
export enum TestType {
  API = 'api',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  SEO = 'seo',
  STRESS = 'stress',
  INFRASTRUCTURE = 'infrastructure',
  UX = 'ux',
  COMPATIBILITY = 'compatibility',
  WEBSITE = 'website'
}

// 测试状态
export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 测试进度接口
export interface TestProgress {
  testId: string;
  status: TestStatus;
  progress: number;
  message?: string;
  startTime?: number;
  estimatedTimeRemaining?: number;
}

// 测试结果接口
export interface TestResult {
  testId: string;
  url: string;
  timestamp: string;
  checks?: Record<string, any>;
  summary: {
    totalChecks?: number;
    passed?: number;
    failed?: number;
    warnings?: number;
    score: number;
    status?: string;
  };
  totalTime?: number;
  recommendations?: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    suggestion: string;
  }>;
}

// 测试错误类
export class TestError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TestError';
  }
}