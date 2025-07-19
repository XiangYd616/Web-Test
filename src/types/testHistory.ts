/**
 * 测试历史相关类型定义
 */

// 测试状态枚举
export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

// 测试类型枚举
export enum TestType {
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  SEO = 'seo',
  STRESS = 'stress',
  API = 'api',
  WEBSITE = 'website',
  DATABASE = 'database',
  COMPATIBILITY = 'compatibility',
  NETWORK = 'network'
}

// 测试优先级
export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 测试环境
export enum TestEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  LOCAL = 'local'
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

// 测试结果详情
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
    structuredData?: any[];
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

// 测试元数据
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
export interface EnhancedTestRecord {
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
  config: BaseTestConfig | PerformanceTestConfig | SecurityTestConfig | SEOTestConfig | StressTestConfig;
  
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

// 测试历史查询参数
export interface TestHistoryQuery {
  // 分页
  page?: number;
  limit?: number;
  offset?: number;
  
  // 搜索
  search?: string;
  searchFields?: string[]; // 搜索字段
  
  // 过滤
  testType?: TestType | TestType[];
  status?: TestStatus | TestStatus[];
  priority?: TestPriority | TestPriority[];
  environment?: TestEnvironment | TestEnvironment[];
  tags?: string[];
  category?: string;
  userId?: string;
  
  // 时间范围
  dateFrom?: string;
  dateTo?: string;
  createdAfter?: string;
  createdBefore?: string;
  
  // 分数范围
  minScore?: number;
  maxScore?: number;
  
  // 排序
  sortBy?: 'createdAt' | 'startTime' | 'endTime' | 'duration' | 'overallScore' | 'testName' | 'status';
  sortOrder?: 'asc' | 'desc';
  
  // 包含关联数据
  includeResults?: boolean;
  includeConfig?: boolean;
  includeMetadata?: boolean;
  includeComments?: boolean;
  includeAttachments?: boolean;
}

// 测试历史响应
export interface TestHistoryResponse {
  success: boolean;
  data: {
    tests: EnhancedTestRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters?: {
      availableTypes: TestType[];
      availableStatuses: TestStatus[];
      availableTags: string[];
      availableCategories: string[];
      dateRange: {
        earliest: string;
        latest: string;
      };
      scoreRange: {
        min: number;
        max: number;
      };
    };
  };
  message?: string;
  error?: string;
}

// 测试历史统计
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

// 测试比较
export interface TestComparison {
  baseTest: EnhancedTestRecord;
  compareTests: EnhancedTestRecord[];
  metrics: {
    scoreComparison: Array<{
      testId: string;
      testName: string;
      score: number;
      difference: number;
      percentageChange: number;
    }>;
    performanceComparison?: Array<{
      metric: string;
      values: Array<{
        testId: string;
        value: number;
        difference: number;
      }>;
    }>;
  };
}
