import React from 'react';
/**
 * 类型定义统一导出
 * 提供项目中所有类型的统一入口
 *
 * 版本: v2.0.0 - 使用统一的测试类型定义
 */

// ==================== 基础类型 ====================
export type {
  ComponentColor, ComponentSize, ComponentVariant,
  // Status, Timestamp, // 注释掉重复的导出
  UUID
} from './unified/baseTypes';

// ==================== API响应类型 ====================
export type {
  ApiError, ApiErrorResponse, ApiResponse,
  ApiSuccessResponse, PaginationInfo, QueryParams,
  RequestConfig,
  ValidationError
} from './unified/apiResponse.types';

// ==================== 核心测试类型 ====================
export { TestStatus, TestType } from './unified/testTypes';

export { getAvailableTestTypes, getEnabledTestTypes, getTestStatusInfo, getTestTypeConfig, isValidTestStatus, isValidTestType, TEST_TYPE_CONFIG } from './unified/testTypes';

// ==================== API相关类型 ====================
// 注意：TestStatus和TestType已从unified/testTypes导出，避免重复导出

// ==================== Hook相关类型 ====================
export type {
  AccessibilityCheck,
  AccessibilityNode, AccessibilityResult,
  AccessibilityViolation, APIEndpoint, APIEndpointResult, APITestActions,
  // API测试Hook
  APITestConfig, APITestHook, APITestResult, APITestState, AuthenticationConfig, BaseTestActions,
  BaseTestHook,
  // 基础测试状态
  BaseTestState, BrowserConfig, BrowserTestResult, CompatibilityIssue, CompatibilityTestActions,
  // 兼容性测试Hook
  CompatibilityTestConfig, CompatibilityTestHook, CompatibilityTestItem,
  CompatibilityTestResult, CompatibilityTestState, CoreWebVitals, DatabaseInfo, DatabaseQuery, DatabaseQueryResult, DatabaseTestActions,
  // 数据库测试Hook
  DatabaseTestConfig, DatabaseTestHook, DatabaseTestResult, DatabaseTestState, DeviceConfig, DeviceTestResult, NetworkTestActions,
  // 网络测试Hook
  NetworkTestConfig, NetworkTestHook, NetworkTestResult, NetworkTestState, PerformanceMetrics, PerformanceResult, PortTestResult,
  ProtocolTestResult, UserActionResult, UserFlowResult, UXIssue, UXTestActions,
  // UX测试Hook
  UXTestConfig, UXTestHook, UXTestResult, UXTestState, ValidationResult
} from './hooks/testState.types';

// ==================== 通用基础类型 ====================
export type {
  Awaited,
  // 选项相关
  BaseOption, CacheConfig,
  CacheImplementation,
  // 缓存相关
  CacheStrategy, ConfigGroup, ConfigItem,
  // 配置相关
  ConfigValueType,
  // 工具类型
  DeepPartial,
  DeepRequired, EventEmitter, EventListener,
  // 事件相关
  EventType, FileInfo,
  // 文件相关
  FileType, FileUploadConfig, FormFieldConfig,
  // 表单相关
  // 基础数据类型
  LogEntry,
  // 日志相关
  LogLevel, Notification,
  NotificationAction, NotificationPriority,
  // 通知相关
  NotificationType, OperationResult, OptionalFields,
  // 分页相关
  PaginationParams, Parameters, Permission,
  // 权限相关
  PermissionType, RequiredFields, ReturnType, Role, SearchCondition,
  // 搜索相关
  SearchOperator, SearchParams,
  SearchResult, SortDirection, TreeOption, UserInfo, ValidationRuleType, ValueOf
} from './common/base.types';

// ==================== 服务相关类型 ====================

/** 测试管理器信息 */
export interface TestManagerInfo {
  /** 管理器ID */
  id: string;
  /** 管理器类型 */
  type: string;
  /** 管理器配置 */
  config: unknown;
  /** 管理器状态 */
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** 进度 */
  progress: number;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 当前步骤 */
  currentStep: string;
  /** 测试结果 */
  result: unknown;
  /** 错误信息 */
  error: string | null;
}

/** 适配器配置 */
export interface AdapterConfig {
  /** 是否使用统一API */
  useUnifiedApi: boolean;
  /** 是否在失败时回退到原始实现 */
  fallbackToOriginal: boolean;
  /** 是否启用WebSocket */
  enableWebSocket: boolean;
  /** 是否启用日志 */
  enableLogging: boolean;
}

/** 服务状态 */
export type ServiceStatus = 'idle' | 'initializing' | 'ready' | 'busy' | 'error' | 'stopped';

/** 服务信息 */
export interface ServiceInfo {
  /** 服务名称 */
  name: string;
  /** 服务版本 */
  version: string;
  /** 服务状态 */
  status: ServiceStatus;
  /** 启动时间 */
  startTime: string;
  /** 最后活动时间 */
  lastActivity: string;
  /** 服务配置 */
  config: Record<string, any>;
  /** 服务指标 */
  metrics?: ServiceMetrics;
}

/** 服务指标 */
export interface ServiceMetrics {
  /** 请求总数 */
  totalRequests: number;
  /** 成功请求数 */
  successRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 内存使用量 */
  memoryUsage?: number;
  /** CPU使用率 */
  cpuUsage?: number;
}

// ==================== 常用类型别名 ====================

/** 通用回调函数 */
export type Callback<T = void> = (data: T) => void;

/** 异步回调函数 */
export type AsyncCallback<T = void> = (data: T) => Promise<void>;

/** 错误处理函数 */
export type ErrorHandler = (error: Error) => void;

/** 清理函数 */
export type CleanupFunction = () => void;

/** 订阅函数 */
export type SubscribeFunction<T> = (callback: Callback<T>) => CleanupFunction;

/** 状态更新函数 */
export type StateUpdater<T> = (prevState: T) => T;

/** 状态设置函数 */
export type StateSetter<T> = (value: T | StateUpdater<T>) => void;

// ==================== React相关类型扩展 ====================

/** React组件Props基础类型 */
export interface BaseComponentProps {
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 测试ID */
  'data-testid'?: string;
  /** 子组件 */
  children?: React.ReactNode;
}

/** 带有ref的组件Props */
export interface RefComponentProps<T = HTMLElement> extends BaseComponentProps {
  /** 组件引用 */
  ref?: React.Ref<T>;
}

/** 表单组件Props基础类型 */
export interface BaseFormComponentProps<T = any> extends BaseComponentProps {
  /** 字段名称 */
  name?: string;
  /** 字段值 */
  value?: T;
  /** 默认值 */
  defaultValue?: T;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 值变化回调 */
  onChange?: (value: T) => void;
  /** 失焦回调 */
  onBlur?: () => void;
  /** 获焦回调 */
  onFocus?: () => void;
}

// ==================== 环境和配置类型 ====================

/** 环境类型 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/** 应用配置 */
export interface AppConfig {
  /** 应用名称 */
  name: string;
  /** 应用版本 */
  version: string;
  /** 运行环境 */
  environment: Environment;
  /** API基础URL */
  apiBaseUrl: string;
  /** WebSocket URL */
  wsUrl?: string;
  /** 是否启用调试 */
  debug: boolean;
  /** 功能开关 */
  features: Record<string, boolean>;
  /** 第三方服务配置 */
  services: Record<string, any>;
}

/** 构建信息 */
export interface BuildInfo {
  /** 构建时间 */
  buildTime: string;
  /** 构建版本 */
  buildVersion: string;
  /** Git提交哈希 */
  gitCommit: string;
  /** Git分支 */
  gitBranch: string;
  /** 构建环境 */
  buildEnv: Environment;
}

// ==================== 适配器和测试配置类型 ====================

// 适配器配置类型
export interface AdapterConfig {
  name: string;
  version: string;
  enabled: boolean;
  settings: Record<string, any>;
  timeout?: number;
  retries?: number;
}

// 性能测试配置类型
export interface PerformanceTestConfig {
  duration: number;
  concurrency: number;
  rampUp: number;
  rampDown: number;
  targetRPS?: number;
  maxResponseTime?: number;
  device?: string;
  network_condition?: string;
  thresholds: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
}

// 安全测试配置类型
export interface SecurityTestConfig {
  scanDepth: 'shallow' | 'medium' | 'deep';
  includeVulnerabilities: string[];
  excludeVulnerabilities: string[];
  include_ssl?: boolean;
  include_headers?: boolean;
  custom_checks?: string[];
  authConfig?: {
    type: 'basic' | 'bearer' | 'cookie';
    credentials: Record<string, string>;
  };
  customHeaders?: Record<string, string>;
}

// 测试API客户端接口
export interface TestApiClient {
  executeTest(config: unknown): Promise<any>;
  getTestResult(testId: string): Promise<any>;
  cancelTest(testId: string): Promise<any>;
  getTestHistory(filters?: unknown): Promise<any>;
}

// 回调函数类型
export type CompletionCallback = (result: unknown) => void;
export type ProgressCallback = (progress: number, stage: string) => void;
export type ErrorCallback = (error: Error) => void;

// ==================== 错误处理类型 ====================
export type {
  AppError,
  AnyError,
  AuthenticationError,
  AuthorizationError,
  BusinessError,
  ErrorBoundaryProps,
  ErrorBoundaryState,
  ErrorCategory,
  ErrorCode,
  ErrorFactory,
  ErrorHandlingResult,
  ErrorReporter,
  ErrorSeverity,
  NetworkError,
  RecoveryConfig,
  RecoveryStrategy,
  SystemError,
  UIError,
} from './errors';

export { ERROR_CODES } from './errors';

// ==================== 第三方库类型扩展 ====================

// 导入Axios类型扩展
import './axios';

// 导入浏览器API类型扩展
import './browser';

// ==================== 导出默认类型集合 ====================

// 注意：移除了有问题的类型集合定义，直接使用具体的类型导出

