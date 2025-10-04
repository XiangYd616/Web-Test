/**
 * 统一错误处理类型定义
 * 版本: v1.0.0
 * 
 * 提供整个应用的错误类型统一定义和处理接口
 */

// ==================== 基础错误类型 ====================

/** 错误严重级别 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/** 错误类别 */
export type ErrorCategory = 
  | 'network' 
  | 'validation' 
  | 'authentication' 
  | 'authorization' 
  | 'business' 
  | 'system' 
  | 'ui' 
  | 'unknown';

/** 基础应用错误接口 */
export interface AppError {
  /** 错误唯一标识码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误严重级别 */
  severity: ErrorSeverity;
  /** 错误类别 */
  category: ErrorCategory;
  /** 错误详细信息 */
  details?: any;
  /** 错误发生时间戳 */
  timestamp: number;
  /** 错误堆栈信息 */
  stack?: string;
  /** 错误上下文信息 */
  context?: Record<string, any>;
  /** 用户友好的错误消息 */
  userMessage?: string;
  /** 是否可以重试 */
  retryable?: boolean;
  /** 建议的解决方案 */
  suggestions?: string[];
}

// ==================== 特定错误类型 ====================

/** 网络错误 */
export interface NetworkError extends AppError {
  category: 'network';
  /** HTTP状态码 */
  statusCode?: number;
  /** 请求URL */
  url?: string;
  /** 请求方法 */
  method?: string;
  /** 是否超时 */
  timeout?: boolean;
  /** 重试次数 */
  retryCount?: number;
}

/** 验证错误 */
export interface ValidationError extends AppError {
  category: 'validation';
  /** 验证失败的字段 */
  field?: string;
  /** 验证失败的字段路径 */
  fieldPath?: string;
  /** 验证失败的值 */
  value?: any;
  /** 验证规则 */
  rule?: string;
  /** 所有验证错误 */
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/** 认证错误 */
export interface AuthenticationError extends AppError {
  category: 'authentication';
  /** 认证类型 */
  authType?: 'login' | 'token' | 'mfa' | 'refresh';
  /** token是否过期 */
  tokenExpired?: boolean;
  /** 是否需要MFA */
  requiresMFA?: boolean;
}

/** 授权错误 */
export interface AuthorizationError extends AppError {
  category: 'authorization';
  /** 需要的权限 */
  requiredPermission?: string;
  /** 用户当前权限 */
  currentPermissions?: string[];
  /** 资源ID */
  resourceId?: string;
  /** 操作类型 */
  operation?: string;
}

/** 业务逻辑错误 */
export interface BusinessError extends AppError {
  category: 'business';
  /** 业务规则代码 */
  businessRule?: string;
  /** 相关业务实体 */
  entity?: string;
  /** 业务操作 */
  operation?: string;
}

/** 系统错误 */
export interface SystemError extends AppError {
  category: 'system';
  /** 系统组件 */
  component?: string;
  /** 错误源 */
  source?: 'client' | 'server' | 'database' | 'cache' | 'filesystem';
  /** 系统状态信息 */
  systemInfo?: Record<string, any>;
}

/** UI错误 */
export interface UIError extends AppError {
  category: 'ui';
  /** 组件名称 */
  component?: string;
  /** 错误的props */
  props?: Record<string, any>;
  /** 渲染阶段 */
  phase?: 'mount' | 'update' | 'unmount' | 'render';
}

// ==================== 错误集合类型 ====================

/** 所有错误类型的联合 */
export type AnyError = 
  | NetworkError
  | ValidationError
  | AuthenticationError
  | AuthorizationError
  | BusinessError
  | SystemError
  | UIError
  | AppError;

// ==================== 错误处理接口 ====================

/** 错误处理器配置 */
export interface ErrorHandlerConfig {
  /** 是否启用错误上报 */
  enableReporting: boolean;
  /** 是否启用控制台日志 */
  enableConsoleLog: boolean;
  /** 是否显示用户通知 */
  showUserNotification: boolean;
  /** 是否自动重试 */
  enableAutoRetry: boolean;
  /** 最大重试次数 */
  maxRetryAttempts: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 忽略的错误代码 */
  ignoredErrorCodes: string[];
}

/** 错误处理结果 */
export interface ErrorHandlingResult {
  /** 是否已处理 */
  handled: boolean;
  /** 是否应该重试 */
  shouldRetry: boolean;
  /** 重试延迟 */
  retryDelay?: number;
  /** 用户消息 */
  userMessage?: string;
  /** 处理操作 */
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

/** 错误处理器接口 */
export interface ErrorHandler {
  /** 处理错误 */
  handle(error: AnyError): Promise<ErrorHandlingResult>;
  /** 是否可以处理该错误 */
  canHandle(error: AnyError): boolean;
  /** 优先级（数字越大优先级越高） */
  priority: number;
}

/** 错误上报器接口 */
export interface ErrorReporter {
  /** 上报错误 */
  report(error: AnyError): Promise<void>;
  /** 上报配置 */
  config: {
    endpoint: string;
    apiKey?: string;
    batchSize: number;
    flushInterval: number;
  };
}

/** 错误恢复策略 */
export type RecoveryStrategy = 
  | 'retry'
  | 'fallback'
  | 'redirect'
  | 'refresh'
  | 'logout'
  | 'ignore'
  | 'escalate';

/** 错误恢复配置 */
export interface RecoveryConfig {
  /** 恢复策略 */
  strategy: RecoveryStrategy;
  /** 策略参数 */
  params?: Record<string, any>;
  /** 恢复条件 */
  condition?: (error: AnyError) => boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 恢复延迟 */
  delay?: number;
}

// ==================== 错误工厂函数类型 ====================

/** 错误创建函数 */
export type ErrorFactory<T extends AppError = AppError> = (
  message: string,
  options?: Partial<Omit<T, 'message' | 'timestamp' | 'category'>>
) => T;

// ==================== 错误边界类型 ====================

/** React错误边界状态 */
export interface ErrorBoundaryState {
  /** 是否有错误 */
  hasError: boolean;
  /** 错误对象 */
  error?: Error;
  /** 错误信息 */
  errorInfo?: React.ErrorInfo;
  /** 错误ID */
  errorId?: string;
  /** 错误时间 */
  timestamp?: number;
}

/** 错误边界Props */
export interface ErrorBoundaryProps {
  /** 子组件 */
  children: React.ReactNode;
  /** 错误后备UI */
  fallback?: React.ComponentType<{ error: Error; errorInfo: React.ErrorInfo; reset: () => void }>;
  /** 错误处理函数 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** 是否在开发环境显示错误详情 */
  showErrorDetails?: boolean;
  /** 重置键，改变时重置错误状态 */
  resetKeys?: Array<string | number>;
}

// ==================== 错误常量 ====================

/** 常用错误代码 */
export const ERROR_CODES = {
  // 网络错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT', 
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  
  // 认证错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  MFA_REQUIRED: 'MFA_REQUIRED',
  
  // 授权错误
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // 验证错误
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // 业务错误
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  
  // 系统错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // UI错误
  COMPONENT_ERROR: 'COMPONENT_ERROR',
  RENDER_ERROR: 'RENDER_ERROR',
} as const;

/** 错误代码类型 */
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
