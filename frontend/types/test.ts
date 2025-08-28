// Test Configuration Types
export interface TestConfiguration {
  id?: string;
  name: string;
  description?: string;
  testType: 'load' | 'stress' | 'performance' | 'security' | 'functional';
  maxUsers: number;
  duration: number; // in seconds
  rampUpTime: number; // in seconds
  targetUrl: string;
  environment: 'development' | 'staging' | 'production';
  protocol: 'HTTP' | 'HTTPS';
  requestsPerSecond?: number;
  customHeaders?: Record<string, string>;
  authentication?: {
    type: 'basic' | 'bearer' | 'oauth';
    credentials: Record<string, string>;
  };
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// Test Metrics Types
export interface TestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number; // requests per second
  errorRate: number; // percentage
  activeUsers: number;
  cpuUsage?: number;
  memoryUsage?: number;
  networkUsage?: number;
}

// Test Result Types
export interface TestResult {
  id: string;
  testConfigurationId: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'pending';
  progress: number; // 0-100
  metrics: TestMetrics;
  errors: TestError[];
  startTime: string;
  endTime?: string;
  duration?: number; // in milliseconds
  environment: string;
  testType: string;
  summary?: TestSummary;
}

// Test Error Types
export interface TestError {
  id?: string;
  type: string;
  message: string;
  count: number;
  percentage?: number;
  timestamp?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// Test Summary Types
export interface TestSummary {
  totalDuration: number;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  peakThroughput: number;
  errorCount: number;
  performanceScore?: number;
  recommendations?: string[];
}

// Test Schedule Types
export interface TestSchedule {
  id: string;
  testConfigurationId: string;
  name: string;
  description?: string;
  scheduledDate: string;
  scheduledTime: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  lastRun?: string;
  nextRun?: string;
}

// Test Template Types
export interface TestTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  configuration: Partial<TestConfiguration>;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  usageCount?: number;
  tags?: string[];
}

// Test Execution Context
export interface TestExecutionContext {
  testId: string;
  configuration: TestConfiguration;
  startTime: Date;
  currentPhase: 'ramp-up' | 'steady-state' | 'ramp-down' | 'completed';
  activeUsers: number;
  elapsedTime: number;
  remainingTime: number;
}

// Test Report Types
export interface TestReport {
  id: string;
  testResultId: string;
  name: string;
  generatedAt: string;
  format: 'pdf' | 'html' | 'json' | 'csv';
  sections: TestReportSection[];
  summary: TestSummary;
  charts?: TestChart[];
}

export interface TestReportSection {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'table' | 'chart' | 'metrics';
  order: number;
}

export interface TestChart {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  config?: Record<string, any>;
}

// Test Comparison Types
export interface TestComparison {
  id: string;
  name: string;
  testResults: TestResult[];
  comparisonMetrics: ComparisonMetric[];
  createdAt: string;
  createdBy: string;
}

export interface ComparisonMetric {
  name: string;
  values: number[];
  unit: string;
  trend: 'improved' | 'degraded' | 'stable';
  changePercentage: number;
}

// Test Analytics Types
export interface TestAnalytics {
  testId: string;
  timeSeriesData: TimeSeriesData[];
  performanceBreakdown: PerformanceBreakdown;
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
}

export interface TimeSeriesData {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  activeUsers: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface PerformanceBreakdown {
  frontend: number;
  backend: number;
  database: number;
  network: number;
  other: number;
}

export interface Bottleneck {
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number; // percentage
  suggestions: string[];
}

export interface Recommendation {
  type: 'performance' | 'scalability' | 'reliability' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation: string;
  estimatedImpact: number; // percentage improvement
}

// Test Status Enums
export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TestType {
  LOAD = 'load',
  STRESS = 'stress',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  FUNCTIONAL = 'functional'
}

export enum TestEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

// Test Validation Types
export interface TestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Test Export Types
export interface TestExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'html';
  includeCharts: boolean;
  includeRawData: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  testTypes?: TestType[];
}

// Test Import Types
export interface TestImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

// Test Notification Types
export interface TestNotification {
  id: string;
  testId: string;
  type: 'started' | 'completed' | 'failed' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
}

// Test Collaboration Types
export interface TestCollaboration {
  testId: string;
  collaborators: TestCollaborator[];
  permissions: TestPermissions;
  comments: TestComment[];
}

export interface TestCollaborator {
  userId: string;
  username: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: string;
}

export interface TestPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canExecute: boolean;
  canViewResults: boolean;
}

export interface TestComment {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  replies?: TestComment[];
}

// Export all types
export type {
  // TestConfiguration, // 注释掉重复导出
  // TestMetrics, // 注释掉重复导出
  // TestResult, // 注释掉重复导出
  // TestError, // 注释掉重复导出
  // TestSummary, // 注释掉重复导出
  // TestSchedule, // 注释掉重复导出
  // TestTemplate, // 注释掉重复导出
  // TestExecutionContext, // 注释掉重复导出
  // TestReport, // 注释掉重复导出
  // TestReportSection, // 注释掉重复导出
  // TestChart, // 注释掉重复导出
  // TestComparison, // 注释掉重复导出
  // ComparisonMetric, // 注释掉重复导出
  // TestAnalytics, // 注释掉重复导出
  // TimeSeriesData, // 注释掉重复导出
  // PerformanceBreakdown, // 注释掉重复导出
  // Bottleneck, // 注释掉重复导出
  // Recommendation, // 注释掉重复导出
  // TestValidationResult, // 注释掉重复导出
  // TestExportOptions, // 注释掉重复导出
  // TestImportResult, // 注释掉重复导出
  // TestNotification, // 注释掉重复导出
  // NotificationAction, // 注释掉重复导出
  // TestCollaboration, // 注释掉重复导出
  // TestCollaborator, // 注释掉重复导出
  // TestPermissions, // 注释掉重复导出
  // TestComment, // 注释掉重复导出
};
