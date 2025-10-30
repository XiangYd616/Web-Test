/**
 * 项目管理相关类型定义
 * 与后端API规范保持一致
 * 版本: v1.0.0
 */

import type { ApiResponse, Timestamp, UUID } from './apiResponse.types';

// ==================== 项目基础类型 ====================

export interface Project {
  id: UUID;
  name: string;
  description: string;
  target_url: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  user_id: UUID;
  status: 'active' | 'inactive' | 'archived';
  settings?: ProjectSettings;
  metadata?: Record<string, any>;
}

export interface ProjectSettings {
  notifications: {
    email: boolean;
    browser: boolean;
    test_completion: boolean;
    test_failure: boolean;
  };
  test_defaults: {
    timeout: number;
    retry_count: number;
    parallel_execution: boolean;
  };
  security: {
    require_auth: boolean;
    allowed_ips?: string[];
    rate_limit?: number;
  };
}

// ==================== 项目请求类型 ====================

export interface CreateProjectRequest {
  name: string;
  description: string;
  target_url: string;
  settings?: Partial<ProjectSettings>;
  metadata?: Record<string, any>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  target_url?: string;
  status?: 'active' | 'inactive' | 'archived';
  settings?: Partial<ProjectSettings>;
  metadata?: Record<string, any>;
}

export interface ProjectListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'archived' | 'all';
  sort?: 'name' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

// ==================== 项目响应类型 ====================

export interface ProjectResponse extends ApiResponse<Project> { }

export interface ProjectListResponse extends ApiResponse<{
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> { }

export interface ProjectStatsResponse extends ApiResponse<{
  total_projects: number;
  active_projects: number;
  total_tests: number;
  successful_tests: number;
  failed_tests: number;
  average_response_time: number;
  last_test_date?: Timestamp;
}> { }

// ==================== 测试配置类型 ====================

export interface TestConfiguration {
  id: UUID;
  test_type: TestType;
  name: string;
  configuration: Record<string, any>;
  project_id: UUID;
  is_template: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: UUID;
  tags?: string[];
  description?: string;
}

// TestType 已迁移到统一类型系统
// 请从 '../types' 或 '../types/unified/testTypes' 导入
import type { TestType } from './unified/testTypes';

export interface CreateTestConfigRequest {
  test_type: TestType;
  name: string;
  configuration: Record<string, any>;
  project_id: UUID;
  is_template?: boolean;
  tags?: string[];
  description?: string;
}

export interface UpdateTestConfigRequest {
  name?: string;
  configuration?: Record<string, any>;
  is_template?: boolean;
  tags?: string[];
  description?: string;
}

export interface TestConfigListQuery {
  test_type?: TestType;
  project_id?: UUID;
  is_template?: boolean;
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
}

// ==================== 测试执行类型 ====================

export interface TestExecution {
  id: UUID;
  test_type: TestType;
  project_id: UUID;
  target_url: string;
  configuration: Record<string, any>;
  status: TestExecutionStatus;
  progress: number;
  current_step?: string;
  start_time: Timestamp;
  end_time?: Timestamp;
  duration?: number;
  result?: TestResult;
  error?: string;
  created_by: UUID;
  metadata?: Record<string, any>;
}

export type TestExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface TestResult {
  score?: number;
  grade?: string;
  summary: string;
  details: Record<string, any>;
  recommendations?: TestRecommendation[];
  metrics?: Record<string, number>;
  screenshots?: string[];
  raw_data?: Record<string, any>;
}

export interface TestRecommendation {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  impact?: string;
  effort?: string;
}

export interface ExecuteTestRequest {
  test_type: TestType;
  configuration: Record<string, any>;
  project_id: UUID;
  target_url: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TestExecutionQuery {
  test_type?: TestType;
  project_id?: UUID;
  status?: TestExecutionStatus;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
  sort?: 'start_time' | 'end_time' | 'duration' | 'score';
  order?: 'asc' | 'desc';
}

// ==================== 报告类型 ====================

export interface TestReport {
  id: UUID;
  execution_ids: UUID[];
  report_type: 'comprehensive' | 'performance' | 'security';
  format: 'html' | 'pdf' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  file_size?: number;
  record_count?: number;
  created_at: Timestamp;
  expires_at?: Timestamp;
  include_recommendations: boolean;
  metadata?: Record<string, any>;
}

export interface GenerateReportRequest {
  execution_ids: UUID[];
  report_type: 'comprehensive' | 'performance' | 'security';
  format: 'html' | 'pdf' | 'json';
  include_recommendations?: boolean;
  custom_title?: string;
  custom_description?: string;
  metadata?: Record<string, any>;
}

// ==================== 监控类型 ====================

export interface MonitoringSite {
  id: UUID;
  name: string;
  url: string;
  project_id?: UUID;
  check_interval: number; // 秒
  alerts_enabled: boolean;
  status: 'online' | 'offline' | 'warning' | 'unknown';
  last_check?: Timestamp;
  uptime: number; // 百分比
  response_time: number; // 毫秒
  created_at: Timestamp;
  updated_at: Timestamp;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CreateMonitoringSiteRequest {
  name: string;
  url: string;
  project_id?: UUID;
  check_interval: number;
  alerts_enabled: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface MonitoringData {
  id: UUID;
  site_id: UUID;
  timestamp: Timestamp;
  status: 'online' | 'offline' | 'warning';
  response_time: number;
  status_code: number;
  error_message?: string;
  metrics: Record<string, number>;
}

// ==================== 分析类型 ====================

export interface DashboardData {
  overview: {
    total_projects: number;
    total_tests: number;
    tests_today: number;
    success_rate: number;
    average_response_time: number;
  };
  recent_tests: TestExecution[];
  test_trends: Array<{
    date: string;
    count: number;
    success_count: number;
    average_score: number;
  }>;
  project_stats: Array<{
    project_id: UUID;
    project_name: string;
    test_count: number;
    success_rate: number;
    last_test: Timestamp;
  }>;
  alerts: Array<{
    id: UUID;
    type: 'test_failure' | 'site_down' | 'performance_degradation';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Timestamp;
  }>;
}

export interface TrendsData {
  time_range: string;
  test_type?: TestType;
  metric: string;
  data_points: Array<{
    timestamp: Timestamp;
    value: number;
    label?: string;
  }>;
  summary: {
    total: number;
    average: number;
    min: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
    change_percentage: number;
  };
}

export interface ComparisonData {
  comparison_type: 'project' | 'test_type' | 'time_period';
  items: Array<{
    id: string;
    name: string;
    metrics: Record<string, number>;
    trend: 'up' | 'down' | 'stable';
  }>;
  summary: {
    best_performer: string;
    worst_performer: string;
    average_improvement: number;
  };
}

// ==================== 系统类型 ====================

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  services: Record<string, {
    status: 'healthy' | 'warning' | 'critical';
    response_time: number;
    last_check: Timestamp;
    error_count: number;
  }>;
  resources: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_io: number;
  };
  metrics: {
    requests_per_minute: number;
    error_rate: number;
    average_response_time: number;
    active_connections: number;
  };
}

export interface SystemMetrics {
  timestamp: Timestamp;
  performance: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    response_time: number;
    error_rate: number;
  };
  usage: {
    total_users: number;
    active_users: number;
    total_tests: number;
    tests_today: number;
  };
  services: Record<string, {
    status: string;
    response_time: number;
    last_check: Timestamp;
  }>;
}

// ==================== 类型导出说明 ====================
// 基于Context7最佳实践：所有interface和type定义已通过export关键字导出
// 无需额外的导出语句，避免重复导出冲突

// 所有类型已通过以下方式导出：
// - export interface Project { ... }
// - export interface ProjectSettings { ... }
// - export interface TestConfiguration { ... }
// - 等等...

