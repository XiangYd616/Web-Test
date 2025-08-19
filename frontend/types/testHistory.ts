export type UUID = string;
export type Timestamp = string;
export type URL = string;

export enum TestStatus {
  IDLE = "idle",
  STARTING = "starting",
  RUNNING = "running",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  FAILED = "failed"
}

export type TestStatusType = "idle" | "starting" | "running" | "completed" | "cancelled" | "failed";

export enum TestType {
  API = "api",
  COMPATIBILITY = "compatibility",
  INFRASTRUCTURE = "infrastructure",
  SECURITY = "security",
  SEO = "seo",
  STRESS = "stress",
  UX = "ux",
  WEBSITE = "website"
}

export enum TestPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

export enum TestEnvironment {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
  LOCAL = "local"
}

export interface TestHistoryItem {
  id: UUID;
  testId: UUID;
  testName: string;
  testType: TestType;
  url: URL;
  
  status: TestStatus;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  
  overallScore: number;
  grade: string;
  passed: boolean;
  
  environment: TestEnvironment;
  priority: TestPriority;
  
  result: {
    summary?: string;
    details?: Record<string, any>;
    metrics?: Record<string, number>;
    issues?: Array<{
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      message: string;
    }>;
    recommendations?: Array<{
      category: string;
      priority: "low" | "medium" | "high";
      message: string;
    }>;
  };
  
  metadata: {
    userAgent?: string;
    device?: string;
    viewport?: { width: number; height: number };
    version?: string;
    tags?: string[];
    notes?: string;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestHistoryQuery {
  testType?: TestType | TestType[];
  status?: TestStatus | TestStatus[];
  environment?: TestEnvironment | TestEnvironment[];
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
  
  sortBy?: "createdAt" | "startTime" | "endTime" | "duration" | "overallScore" | "testName" | "status";
  sortOrder?: "asc" | "desc";
  
  page?: number;
  limit?: number;
}

export interface TestHistoryFilters {
  testTypes: TestType[];
  statuses: TestStatus[];
  environments: TestEnvironment[];
  priorities: TestPriority[];
  dateRange: {
    start: Timestamp;
    end: Timestamp;
  };
  scoreRange: {
    min: number;
    max: number;
  };
  tags: string[];
}

export interface TestHistoryStats {
  total: number;
  byStatus: Record<TestStatus, number>;
  byType: Record<TestType, number>;
  byEnvironment: Record<TestEnvironment, number>;
  byPriority: Record<TestPriority, number>;
  
  averageScore: number;
  averageDuration: number;
  successRate: number;
  
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  
  trends: {
    scoreOverTime: Array<{
      date: string;
      averageScore: number;
      testCount: number;
    }>;
    typeDistribution: Array<{
      type: TestType;
      count: number;
      percentage: number;
    }>;
  };
}

export interface TestHistoryComparison {
  baseline: TestHistoryItem;
  current: TestHistoryItem;
  
  changes: {
    score: {
      difference: number;
      percentage: number;
      improved: boolean;
    };
    duration: {
      difference: number;
      percentage: number;
      improved: boolean;
    };
    issues: {
      added: number;
      resolved: number;
      changed: number;
    };
  };
  
  recommendations: Array<{
    category: string;
    message: string;
    priority: "low" | "medium" | "high";
  }>;
}

export interface ExportOptions {
  format: "csv" | "json" | "pdf" | "excel";
  includeDetails: boolean;
  includeMetrics: boolean;
  includeRecommendations: boolean;
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  filters?: Partial<TestHistoryQuery>;
}

export interface BatchOperation {
  action: "delete" | "archive" | "tag" | "category" | "export";
  testIds: UUID[];
  options?: {
    tags?: string[];
    category?: string;
    exportOptions?: ExportOptions;
  };
}

export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    testId: UUID;
    error: string;
  }>;
  result?: {
    downloadUrl?: string;
    message?: string;
  };
}

export interface TestHistoryResponse {
  items: TestHistoryItem[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  stats?: TestHistoryStats;
}

export interface TestHistoryDetailResponse {
  item: TestHistoryItem;
  related: TestHistoryItem[];
  comparison?: TestHistoryComparison;
}

export const DEFAULT_HISTORY_QUERY: Partial<TestHistoryQuery> = {
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 20
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "json",
  includeDetails: true,
  includeMetrics: true,
  includeRecommendations: true
};

export const TEST_STATUS_COLORS: Record<TestStatus, string> = {
  [TestStatus.IDLE]: "#6b7280",
  [TestStatus.STARTING]: "#f59e0b",
  [TestStatus.RUNNING]: "#3b82f6",
  [TestStatus.COMPLETED]: "#10b981",
  [TestStatus.CANCELLED]: "#6b7280",
  [TestStatus.FAILED]: "#ef4444"
};

export const TEST_TYPE_ICONS: Record<TestType, string> = {
  [TestType.API]: "api",
  [TestType.COMPATIBILITY]: "devices",
  [TestType.INFRASTRUCTURE]: "server",
  [TestType.SECURITY]: "shield",
  [TestType.SEO]: "search",
  [TestType.STRESS]: "activity",
  [TestType.UX]: "user",
  [TestType.WEBSITE]: "globe"
};

export type TestHistoryFilter = (item: TestHistoryItem) => boolean;
export type TestHistorySorter = (a: TestHistoryItem, b: TestHistoryItem) => number;
export type TestHistoryGrouper = (items: TestHistoryItem[]) => Record<string, TestHistoryItem[]>;

// 类型不需要默认导出
