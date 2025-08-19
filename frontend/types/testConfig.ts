export interface BaseTestConfig {
  url: string;
  timeout?: number;
  retries?: number;
  name?: string;
  description?: string;
  tags?: string[];
  environment?: "development" | "staging" | "production";
}

export interface APITestConfig extends BaseTestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  auth?: {
    type: "bearer" | "basic" | "apikey" | "oauth";
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

export interface PerformanceTestConfig extends BaseTestConfig {
  device?: "desktop" | "mobile" | "tablet";
  throttling?: {
    downloadThroughput?: number;
    uploadThroughput?: number;
    latency?: number;
    cpuSlowdownMultiplier?: number;
  };
  metrics?: string[];
  lighthouse?: boolean;
}

export interface SecurityTestConfig extends BaseTestConfig {
  scanDepth?: "shallow" | "medium" | "deep";
  includeSubdomains?: boolean;
  authRequired?: boolean;
  customPayloads?: string[];
}

export interface SEOTestConfig extends BaseTestConfig {
  checkMeta?: boolean;
  checkImages?: boolean;
  checkLinks?: boolean;
  checkStructuredData?: boolean;
  checkPerformance?: boolean;
}

export interface StressTestConfig extends BaseTestConfig {
  users: number;
  duration: number;
  rampUp?: number;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  keepAlive?: boolean;
}

export interface InfrastructureTestConfig extends BaseTestConfig {
  checkDNS?: boolean;
  checkSSL?: boolean;
  checkPorts?: number[];
  checkServices?: string[];
  checkDatabase?: boolean;
  checkCache?: boolean;
}

export interface UXTestConfig extends BaseTestConfig {
  device?: "desktop" | "mobile" | "tablet";
  viewport?: {
    width: number;
    height: number;
  };
  interactions?: Array<{
    type: "click" | "type" | "scroll" | "hover";
    selector: string;
    value?: string;
  }>;
}

export interface CompatibilityTestConfig extends BaseTestConfig {
  browsers?: string[];
  devices?: string[];
  resolutions?: Array<{ width: number; height: number }>;
  checkCSS?: boolean;
  checkJS?: boolean;
}

export interface WebsiteTestConfig extends BaseTestConfig {
  checkAccessibility?: boolean;
  checkSEO?: boolean;
  checkPerformance?: boolean;
  checkSecurity?: boolean;
  checkMobile?: boolean;
  depth?: number;
  maxPages?: number;
}

export enum TestType {
  API = "api",
  PERFORMANCE = "performance",
  SECURITY = "security",
  SEO = "seo",
  STRESS = "stress",
  INFRASTRUCTURE = "infrastructure",
  UX = "ux",
  COMPATIBILITY = "compatibility",
  WEBSITE = "website"
}

export enum TestStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

export interface TestResult {
  id: string;
  testId: string;
  type: TestType;
  status: TestStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  
  summary: {
    passed?: number;
    failed?: number;
    warnings?: number;
    score: number;
  };
  
  totalTime?: number;
  recommendations?: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
  }>;
  
  details?: Record<string, any>;
  error?: string;
}

export class TestConfigValidator {
  constructor(
    private config: BaseTestConfig,
    private type: TestType,
    public retryable: boolean = false
  ) {}

  validate(): string[] {
    const errors: string[] = [];
    
    if (!this.config.url) {
      errors.push("URL is required");
    }
    
    if (this.config.timeout && this.config.timeout < 0) {
      errors.push("Timeout must be positive");
    }
    
    return errors;
  }
}

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

export function createTestConfig(type: TestType, baseConfig: BaseTestConfig): TestConfig {
  switch (type) {
    case TestType.API:
      return { ...baseConfig, method: "GET" } as APITestConfig;
    case TestType.PERFORMANCE:
      return { ...baseConfig, device: "desktop" } as PerformanceTestConfig;
    case TestType.SECURITY:
      return { ...baseConfig, scanDepth: "medium" } as SecurityTestConfig;
    case TestType.SEO:
      return { ...baseConfig, checkMeta: true } as SEOTestConfig;
    case TestType.STRESS:
      return { ...baseConfig, users: 10, duration: 60 } as StressTestConfig;
    case TestType.INFRASTRUCTURE:
      return { ...baseConfig, checkDNS: true } as InfrastructureTestConfig;
    case TestType.UX:
      return { ...baseConfig, device: "desktop" } as UXTestConfig;
    case TestType.COMPATIBILITY:
      return { ...baseConfig, browsers: ["chrome", "firefox"] } as CompatibilityTestConfig;
    case TestType.WEBSITE:
      return { ...baseConfig, checkAccessibility: true } as WebsiteTestConfig;
    default:
      return baseConfig as TestConfig;
  }
}

export function validateTestConfig(config: TestConfig, type: TestType): string[] {
  const validator = new TestConfigValidator(config, type);
  return validator.validate();
}

// 类型不需要默认导出
