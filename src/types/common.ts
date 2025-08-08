/**
 * 通用数据模型定义
 * 统一前后端数据结构，确保类型一致性
 * 版本: v1.0.0
 */

// ==================== 基础类型 ====================

export type UUID = string;
export type Timestamp = string; // ISO 8601 格式
export type URL = string;
export type Email = string;

// ==================== API 响应格式 ====================

/**
 * 重新导出统一的API响应类型定义
 * 注意：实际定义已迁移到 src/types/unified/apiResponse.ts
 */
export type {
  ApiError, ApiErrorResponse, ApiMeta, ApiResponse, ApiResponseUtils, ApiSuccessResponse, AuthConfig, CreatedResponse, ErrorCode, ErrorResponseMethods, NoContentResponse, PaginatedRequest, PaginatedResponse, PaginationInfo, QueryParams, RequestConfig, ResponseBuilder, ValidationError
} from './unified/apiResponse';

// ==================== 用户相关类型 ====================

/**
 * 统一用户角色定义
 */
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer' | 'tester';

/**
 * 用户状态
 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

/**
 * 重新导出统一的用户类型定义
 * 注意：实际定义已迁移到 src/types/unified/user.ts
 */
export type {
  AuthResponse, ChangePasswordData, CreateUserData, DEFAULT_USER_PREFERENCES,
  DEFAULT_USER_PROFILE, LoginCredentials,
  RegisterData, UpdateUserData, User, UserActivityLog, UserFilter,
  UserListQuery, UserPlan, UserPreferences, UserProfile, UserRole, UserSession, UserStats, UserStatus
} from './unified/user';

// 注意：UserPreferences, LoginCredentials, RegisterData, AuthResponse 等类型
// 已迁移到 src/types/unified/user.ts，通过上面的 export type 重新导出

export interface UserSession {
  id: UUID;
  userId: UUID;
  token: string;
  refreshToken: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  lastActivityAt: Timestamp;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

// ==================== 测试相关类型 ====================

/**
 * 重新导出统一的测试相关类型定义
 * 注意：实际定义已迁移到 src/types/unified/testResult.ts
 */
export type {
  APITestConfig, BaseTestConfig, BatchTestRequest,
  BatchTestResult, PerformanceTestConfig,
  SecurityTestConfig, StressTestConfig, TestArtifact, TestError, TestGrade, TestHistory, TestMetrics, TestPriority, TestRecommendation, TestResult, TestResultFilter,
  TestResultQuery, TestSession, TestStats, TestStatus, TestType, TestWarning
} from './unified/testResult';

// 向后兼容的类型别名
export type { TestResult as BaseTestResult } from './unified/testResult';

// 注意：TestSession, TestHistoryRecord 等类型
// 已迁移到 src/types/unified/testResult.ts，通过上面的 export type 重新导出

// ==================== 系统监控类型 ====================

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTests: number;
  testsToday: number;
  systemUptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkTraffic: {
    incoming: number;
    outgoing: number;
  };
  errorRate: number;
  responseTime: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  services: Record<string, ServiceStatus>;
  resources: SystemResources;
  metrics: SystemMetrics;
}

export interface ServiceStatus {
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  lastCheck?: Timestamp;
  error?: string;
}

export interface SystemResources {
  cpu: ResourceUsage;
  memory: MemoryUsage;
  disk: DiskUsage;
  network: NetworkUsage;
}

export interface ResourceUsage {
  usage: number; // 百分比
  cores?: number;
}

export interface MemoryUsage {
  usage: number; // 百分比
  total: number; // MB
  available: number; // MB
}

export interface DiskUsage {
  usage: number; // 百分比
  total: number; // GB
  available: number; // GB
}

export interface NetworkUsage {
  incoming: number; // bytes/sec
  outgoing: number; // bytes/sec
}

export interface SystemMetrics {
  requestsPerMinute: number;
  errorRate: number;
  averageResponseTime: number;
  activeConnections: number;
}

// ==================== 导出默认值 ====================

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'auto',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  notifications: {
    email: true,
    sms: false,
    push: true,
    browser: true,
    testComplete: true,
    testFailed: true,
    weeklyReport: false,
    securityAlert: true
  },
  dashboard: {
    defaultView: 'overview',
    layout: 'grid',
    widgets: [],
    refreshInterval: 30,
    showTips: true
  },
  testing: {
    defaultTimeout: 30000,
    maxConcurrentTests: 3,
    autoSaveResults: true,
    enableAdvancedFeatures: false
  },
  privacy: {
    shareUsageData: false,
    allowCookies: true,
    trackingEnabled: false
  }
};

export const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
};
