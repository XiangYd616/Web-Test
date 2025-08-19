/**
 * 统一数据模型定义
 * 解决前后端数据模型差异问题，确保字段命名和类型完全一致
 * 版本: v2.0.0 - 基于差异分析报告的修复版本
 * 创建时间: 2024-08-08
 * 更新时间: 2024-08-08
 */

import {
  UserRole,
  UserStatus,
  UserPlan,
  TestType,
  TestStatus,
  TestGrade,
  TestPriority,
  ThemeMode,
  Language,
  Timezone
} from './enums';

// ==================== 基础类型定义 ====================

export type UUID = string;
export type Timestamp = string; // ISO 8601 格式: 2024-08-08T10:30:00.000Z
export type URL = string;
export type Email = string;

// ==================== 用户相关接口 ====================

/**
 * 用户个人资料接口
 * 修复问题：统一profile字段结构
 */
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  fullName?: string;        // 计算字段：firstName + lastName
  company?: string;
  department?: string;
  phone?: string;
  timezone?: Timezone;
  avatar?: string;
  bio?: string;
}

/**
 * 通知设置接口
 */
export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  browser: boolean;
  testComplete: boolean;
  testFailed: boolean;
  weeklyReport: boolean;
  securityAlert: boolean;
}

/**
 * 仪表板设置接口
 */
export interface DashboardSettings {
  defaultView: 'overview' | 'tests' | 'reports' | 'analytics';
  layout: 'grid' | 'list' | 'cards';
  widgets: string[];
  refreshInterval: number; // 秒
  showTips: boolean;
}

/**
 * 测试设置接口
 */
export interface TestingSettings {
  defaultTimeout: number;     // 毫秒
  maxConcurrentTests: number;
  autoSaveResults: boolean;
  enableAdvancedFeatures: boolean;
}

/**
 * 隐私设置接口
 */
export interface PrivacySettings {
  shareUsageData: boolean;
  allowCookies: boolean;
  trackingEnabled: boolean;
}

/**
 * 用户偏好设置接口
 * 修复问题：统一preferences字段结构
 */
export interface UserPreferences {
  theme: ThemeMode;
  language: Language;
  timezone: Timezone;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
  testing: TestingSettings;
  privacy: PrivacySettings;
}

/**
 * 统一用户接口 - 前后端共享
 * 修复问题：解决字段命名不一致问题
 * 
 * 字段命名规范：
 * - 前端使用 camelCase
 * - 数据库使用 snake_case
 * - 通过转换函数进行映射
 */
export interface User {
  // 基础标识信息
  id: UUID;
  username: string;
  email: Email;
  
  // 角色和权限
  role: UserRole;
  plan: UserPlan;
  status: UserStatus;
  permissions: string[];
  
  // 个人信息
  profile: UserProfile;
  preferences: UserPreferences;
  
  // 安全相关
  emailVerified: boolean;
  emailVerifiedAt?: Timestamp;
  twoFactorEnabled?: boolean;      // 修复：添加缺失字段
  loginAttempts: number;           // 修复：统一字段名（原 failed_login_attempts）
  lockedUntil?: Timestamp;
  
  // 时间戳 - 统一字段命名
  createdAt: Timestamp;            // 数据库：created_at
  updatedAt: Timestamp;            // 数据库：updated_at
  lastLoginAt?: Timestamp;         // 修复：统一字段名（原 lastLogin/last_login）
  
  // 统计信息
  loginCount: number;              // 数据库：login_count
  testCount?: number;
  
  // 元数据
  metadata: Record<string, any>;
}

/**
 * 数据库字段映射接口
 * 用于前后端数据转换，解决 camelCase vs snake_case 问题
 */
export interface UserDatabaseFields {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  role: string;
  plan: string;
  status: string;
  email_verified: boolean;
  email_verified_at?: string;
  two_factor_enabled?: boolean;    // 修复：添加缺失的数据库字段
  last_login_at?: string;          // 修复：统一字段名
  login_count: number;
  failed_login_attempts: number;   // 映射到 loginAttempts
  locked_until?: string;
  preferences: string;             // JSON字符串
  metadata: string;                // JSON字符串
  created_at: string;
  updated_at: string;
}

// ==================== 测试相关接口 ====================

/**
 * 测试配置接口
 * 修复问题：统一不同测试类型的配置结构
 */
export interface TestConfig {
  // 基础配置
  timeout?: number;                // 毫秒
  retries?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  
  // 性能测试配置
  performance?: {
    users?: number;
    duration?: number;             // 秒
    rampUpTime?: number;          // 秒
    scenarios?: string[];
    thresholds?: {
      responseTime: number;        // 毫秒
      errorRate: number;          // 百分比
      throughput: number;         // 请求/秒
    };
  };
  
  // API测试配置
  api?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    expectedStatus?: number[];
    timeout?: number;
  };
  
  // 内容测试配置
  content?: {
    checkSEO?: boolean;
    checkAccessibility?: boolean;
    checkPerformance?: boolean;
    checkSecurity?: boolean;
    checkMobile?: boolean;
    customKeywords?: string[];
    depth?: number;
  };
  
  // 压力测试配置
  stress?: {
    maxUsers: number;
    duration: number;              // 秒
    rampUpTime?: number;          // 秒
    scenarios?: string[];
  };
  
  // 安全测试配置
  security?: {
    checkSSL?: boolean;
    checkHeaders?: boolean;
    checkVulnerabilities?: boolean;
    customChecks?: string[];
  };
  
  // 兼容性测试配置
  compatibility?: {
    browsers?: string[];
    devices?: string[];
    viewports?: Array<{ width: number; height: number }>;
  };
}

/**
 * 测试错误接口
 */
export interface TestError {
  type: string;
  message: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line?: number;
  column?: number;
  file?: string;
}

/**
 * 测试警告接口
 */
export interface TestWarning {
  type: string;
  message: string;
  details?: any;
  suggestion?: string;
}

/**
 * 测试建议接口
 */
export interface TestRecommendation {
  type: string;
  title: string;
  description: string;
  priority: TestPriority;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  category: string;
  resources?: Array<{
    title: string;
    url: string;
    type: 'documentation' | 'tutorial' | 'tool' | 'article';
  }>;
}

/**
 * 测试产物接口
 */
export interface TestArtifact {
  type: 'screenshot' | 'video' | 'report' | 'log' | 'trace';
  name: string;
  url: string;
  size?: number;                   // 字节
  mimeType?: string;
  description?: string;
}

/**
 * 测试指标接口
 */
export interface TestMetrics {
  // 性能指标
  responseTime?: number;           // 毫秒
  throughput?: number;             // 请求/秒
  errorRate?: number;              // 百分比
  
  // 质量指标
  score?: number;                  // 0-100
  grade?: TestGrade;
  
  // 资源指标
  totalRequests?: number;
  totalSize?: number;              // 字节
  loadTime?: number;               // 毫秒
  
  // 自定义指标
  custom?: Record<string, number>;
}

/**
 * 统一测试结果接口 - 前后端共享
 * 修复问题：解决字段命名不一致和结构差异问题
 * 
 * 字段命名修复：
 * - startTime -> startedAt (统一使用 -edAt 后缀)
 * - endTime -> completedAt
 * - score -> overallScore (更明确的命名)
 */
export interface TestResult {
  // 基础标识信息
  id: UUID;
  userId: UUID;
  testType: TestType;              // 修复：统一使用 TestType 枚举
  testName: string;
  url: URL;
  
  // 状态和时间信息 - 修复字段命名不一致问题
  status: TestStatus;
  startedAt: Timestamp;            // 修复：统一字段名（原 startTime/start_time）
  completedAt?: Timestamp;         // 修复：统一字段名（原 endTime/end_time）
  duration?: number;               // 毫秒
  
  // 评分和等级
  overallScore?: number;           // 修复：统一字段名（原 score）
  grade?: TestGrade;
  
  // 测试配置和结果
  config: TestConfig;
  results: Record<string, any>;
  
  // 详细信息
  summary?: string;
  metrics?: TestMetrics;
  errors?: TestError[];
  warnings?: TestWarning[];
  recommendations?: TestRecommendation[];
  artifacts?: TestArtifact[];
  
  // 统计信息
  totalIssues?: number;
  criticalIssues?: number;
  majorIssues?: number;
  minorIssues?: number;
  warningCount?: number;
  
  // 环境信息
  environment?: string;
  tags?: string[];
  
  // 时间戳
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 元数据
  metadata: Record<string, any>;
}
