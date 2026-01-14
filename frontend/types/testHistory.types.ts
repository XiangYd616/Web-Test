// TestType 和 TestStatus 已迁移到统一类型系统
// 请从 './enums' 导入
import type { TestStatus, TestType } from './enums';
type TestStatusType = TestStatus;

export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TestEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  LOCAL = 'local',
}

// 新增：主从表设计相关类型
export interface TestSession {
  id: string;
  userId: string;
  testName: string;
  testType: TestType;
  url?: string;
  status: TestStatusType;
  createdAt: string;
  updatedAt: string;
  startTime?: string;
  endTime?: string;
  duration?: number; // 秒
  config?: any;
  overallScore?: number;
  grade?: string; // A+, A, B+, B, C+, C, D, F
  totalIssues?: number;
  criticalIssues?: number;
  majorIssues?: number;
  minorIssues?: number;
  warnings?: number;
  environment: string;
  tags: string[];
  description?: string;
  notes?: string;
  deletedAt?: string;
}

// 安全测试详情
export interface SecurityTestDetails {
  sessionId: string;
  securityScore?: number;
  sslScore?: number;
  headerSecurityScore?: number;
  authenticationScore?: number;
  vulnerabilitiesTotal?: number;
  vulnerabilitiesCritical?: number;
  vulnerabilitiesHigh?: number;
  vulnerabilitiesMedium?: number;
  vulnerabilitiesLow?: number;
  sqlInjectionFound?: number;
  xssVulnerabilities?: number;
  csrfVulnerabilities?: number;
  httpsEnforced?: boolean;
  hstsEnabled?: boolean;
  csrfProtection?: boolean;
}

// 性能测试详情
export interface PerformanceTestDetails {
  sessionId: string;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
  speedIndex?: number;
  totalBlockingTime?: number;
  domContentLoaded?: number;
  loadEventEnd?: number;
  totalPageSize?: number;
  imageSize?: number;
  cssSize?: number;
  jsSize?: number;
  fontSize?: number;
  dnsLookupTime?: number;
  tcpConnectTime?: number;
  sslHandshakeTime?: number;
  serverResponseTime?: number;
}

// 压力测试详情
export interface StressTestDetails {
  sessionId: string;
  concurrentUsers?: number;
  rampUpTime?: number;
  testDuration?: number;
  thinkTime?: number;
  tpsPeak?: number;
  tpsAverage?: number;
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  responseTimeAvg?: number;
  responseTimeMin?: number;
  responseTimeMax?: number;
  responseTimeP50?: number;
  responseTimeP90?: number;
  responseTimeP95?: number;
  responseTimeP99?: number;
  errorRate?: number;
  timeoutErrors?: number;
  connectionErrors?: number;
  serverErrors?: number;
  clientErrors?: number;
  cpuUsageAvg?: number;
  cpuUsageMax?: number;
  memoryUsageAvg?: number;
  memoryUsageMax?: number;
  bytesSent?: number;
  bytesReceived?: number;
}

export interface TestHistoryQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  testType?: TestType | TestType[];
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TestHistoryResponse {
  success: boolean;
  data: {
    tests: TestSession[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// 详细测试结果（包含详情数据）
export interface DetailedTestResult extends TestSession {
  securityDetails?: SecurityTestDetails;
  performanceDetails?: PerformanceTestDetails;
  stressDetails?: StressTestDetails;
  // 可以根据需要添加其他测试类型的详情
}

// 测试详情响应
export interface TestDetailsResponse {
  success: boolean;
  data: DetailedTestResult;
}

export interface TestStatistics {
  totalTests: number;
  completedTests: number;
  failedTests: number;
  averageScore: number;
  testsByType: Record<TestType, number>;
}

export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

// 基础测试配置
export interface BaseTestConfig {
  timeout?: number;
  retries?: number;
  environment?: TestEnvironment;
  userAgent?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

// 性能测试配置
export interface PerformanceTestConfig extends BaseTestConfig {
  device?: 'desktop' | 'mobile' | 'tablet';
  connection?: 'fast' | 'slow' | '3g' | '4g' | 'wifi';
  metrics?: string[];
  lighthouse?: {
    categories?: string[];
    onlyCategories?: string[];
  };
}

// 安全测试配置
export interface SecurityTestConfig extends BaseTestConfig {
  modules?: string[];
  depth?: 'basic' | 'standard' | 'comprehensive';
  includeSubdomains?: boolean;
  checkCertificate?: boolean;
  scanPorts?: boolean;
}

// SEO测试配置
export interface SEOTestConfig extends BaseTestConfig {
  includeImages?: boolean;
  checkLinks?: boolean;
  analyzeContent?: boolean;
  checkMeta?: boolean;
  validateSchema?: boolean;
}

// 压力测试配置
export interface StressTestConfig extends BaseTestConfig {
  virtualUsers?: number;
  duration?: number;
  rampUpTime?: number;
  rampDownTime?: number;
  thresholds?: {
    responseTime?: number;
    errorRate?: number;
    throughput?: number;
  };
}

export interface TestResultDetails {
  // 性能指标
  performance?: {
    loadTime?: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    cumulativeLayoutShift?: number;
    firstInputDelay?: number;
    timeToInteractive?: number;
    speedIndex?: number;
    totalBlockingTime?: number;
  };

  // 安全指标
  security?: {
    vulnerabilities?: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation?: string;
    }>;
    sslScore?: number;
    headersSecurity?: Record<string, any>;
    certificateInfo?: Record<string, any>;
  };

  // SEO指标
  seo?: {
    metaTags?: Record<string, string>;
    headings?: Array<{ level: number; text: string }>;
    images?: Array<{ src: string; alt?: string; issues?: string[] }>;
    links?: Array<{ href: string; text: string; type: 'internal' | 'external' }>;
    structuredData?: unknown[];
    socialTags?: Record<string, string>;
  };

  // 压力测试指标
  stress?: {
    totalRequests?: number;
    successfulRequests?: number;
    failedRequests?: number;
    averageResponseTime?: number;
    minResponseTime?: number;
    maxResponseTime?: number;
    throughput?: number;
    errorRate?: number;
    concurrentUsers?: number;
  };

  // 通用指标
  general?: {
    httpStatus?: number;
    responseSize?: number;
    redirects?: number;
    resources?: Array<{
      url: string;
      type: string;
      size: number;
      loadTime: number;
    }>;
    errors?: string[];
    warnings?: string[];
  };
}

export interface TestMetadata {
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    browser?: string;
    viewport?: {
      width: number;
      height: number;
    };
  };
  network?: {
    type: string;
    speed?: string;
    latency?: number;
  };
}

// 增强的测试记录接口
export interface TestHistoryRecord {
  // 基础信息
  id: string;
  testName: string;
  testType: TestType;
  url: string;
  status: TestStatus;
  priority?: TestPriority;

  // 时间信息
  startTime: string;
  endTime?: string;
  duration?: number; // 毫秒
  createdAt: string;
  updatedAt?: string;

  // 用户信息
  userId?: string;
  userName?: string;

  // 配置信息
  config:
    | BaseTestConfig
    | PerformanceTestConfig
    | SecurityTestConfig
    | SEOTestConfig
    | StressTestConfig;

  // 结果信息
  overallScore?: number;
  results?: TestResultDetails;
  reportPath?: string;
  reportUrl?: string;

  // 分类和标签
  tags?: string[];
  category?: string;
  environment?: TestEnvironment;

  // 元数据
  metadata?: TestMetadata;

  // 关联信息
  parentTestId?: string; // 父测试ID（用于测试套件）
  childTestIds?: string[]; // 子测试ID
  relatedTestIds?: string[]; // 相关测试ID

  // 统计信息
  viewCount?: number;
  shareCount?: number;
  bookmarked?: boolean;

  // 备注和注释
  notes?: string;
  comments?: Array<{
    id: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: string;
  }>;

  // 文件附件
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    uploadedAt: string;
  }>;
}

// 重复接口 TestHistoryQuery 已注释
// export interface TestHistoryQuery {
//   // 分页
//   page?: number;
//   limit?: number;
//   offset?: number;
//
//   // 搜索
//   search?: string;
//   searchFields?: string[]; // 搜索字段
//
//   // 过滤
//   testType?: TestType | TestType[];
//   status?: TestStatus | TestStatus[];
//   priority?: TestPriority | TestPriority[];
//   environment?: TestEnvironment | TestEnvironment[];
//   tags?: string[];
//   category?: string;
//   userId?: string;
//
//   // 时间范围
//   dateFrom?: string;
//   dateTo?: string;
//   createdAfter?: string;
//   createdBefore?: string;
//
//   // 分数范围
//   minScore?: number;
//   maxScore?: number;
//
//   // 排序
//   sortBy?: 'createdAt' | 'startTime' | 'endTime' | 'duration' | 'overallScore' | 'testName' | 'status';
//   sortOrder?: 'asc' | 'desc';
//
//   // 包含关联数据
//   includeResults?: boolean;
//   includeConfig?: boolean;
//   includeMetadata?: boolean;
//   includeComments?: boolean;
//   includeAttachments?: boolean;
// }

// 重复接口 TestHistoryResponse 已注释
// export interface TestHistoryResponse {
//   success: boolean;
//   data: {
//     tests: TestHistoryRecord[];
//     pagination: {
//       page: number;
//       limit: number;
//       total: number;
//       totalPages: number;
//       hasNext: boolean;
//       hasPrev: boolean;
//     };
//     filters?: {
//       availableTypes: TestType[];
//       availableStatuses: TestStatus[];
//       availableTags: string[];
//       availableCategories: string[];
//       dateRange: {
//         earliest: string;
//         latest: string;
//       };
//       scoreRange: {
//         min: number;
//         max: number;
//       };
//     };
//   };
//   message?: string;
//   error?: string;
// }

export interface TestHistoryStatistics {
  overview: {
    totalTests: number;
    completedTests: number;
    failedTests: number;
    averageScore: number;
    averageDuration: number;
    successRate: number;
  };

  byType: Array<{
    type: TestType;
    count: number;
    averageScore: number;
    successRate: number;
  }>;

  byStatus: Array<{
    status: TestStatus;
    count: number;
    percentage: number;
  }>;

  byTimeRange: Array<{
    date: string;
    count: number;
    averageScore: number;
  }>;

  topUrls: Array<{
    url: string;
    count: number;
    averageScore: number;
  }>;

  recentActivity: Array<{
    date: string;
    testsRun: number;
    averageScore: number;
  }>;
}

// 导出选项
export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  fields?: string[];
  includeResults?: boolean;
  includeConfig?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  filters?: Partial<TestHistoryQuery>;
}

// 批量操作
export interface BatchOperation {
  action: 'delete' | 'archive' | 'tag' | 'category' | 'export';
  testIds: string[];
  options?: {
    tags?: string[];
    category?: string;
    exportOptions?: ExportOptions;
  };
}
