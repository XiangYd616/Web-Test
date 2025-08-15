/**
 * 通用类型定义
 * 包含项目中常用的基础类型和接口
 */

// 基础类型
export type ID = string | number;
export type UUID = string;
export type Timestamp = string; // 统一使用 ISO 8601 字符串格式
export type Status = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// 重新导出用户相关类型以保持兼容性
export type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  UserPreferences,
  UserProfile,
  UserSession
} from './user';

// 重新导出枚举类型
export {
  Language,
  TestPriority,
  TestStatus,
  ThemeMode,
  Timezone,
  UserRole,
  UserStatus
} from './enums';

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp?: string;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// 分页类型
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// 用户类型
export interface User {
  id: ID;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
}

// 测试相关类型
export type TestType =
  | 'api'
  | 'compatibility'
  | 'infrastructure'
  | 'security'
  | 'seo'
  | 'stress'
  | 'ux'
  | 'website';

export interface TestConfig {
  url: string;
  type: TestType;
  duration?: number;
  concurrency?: number;
  options?: Record<string, any>;
}

export interface TestResult {
  id: ID;
  testId: ID;
  userId: ID;
  type: TestType;
  status: Status;
  config: TestConfig;
  results?: Record<string, any>;
  metrics?: Record<string, number>;
  error?: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

// 监控类型
export interface MonitoringTarget {
  id: ID;
  name: string;
  url: string;
  checkInterval: number; // 秒
  timeout: number; // 秒
  isActive: boolean;
  alertConfig?: AlertConfig;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AlertConfig {
  enabled: boolean;
  conditions: AlertCondition[];
  notifications: NotificationConfig[];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
  duration?: number; // 持续时间（秒）
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook';
  target: string;
  enabled: boolean;
}

// 组件Props类型
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

export interface LoadingProps extends BaseComponentProps {
  loading: boolean;
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export interface ErrorProps extends BaseComponentProps {
  error: Error | string | null;
  onRetry?: () => void;
  showDetails?: boolean;
}

// 表单类型
export interface FormField<T = any> {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea';
  value: T;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: T) => string | null;
  };
}

export interface FormState {
  fields: Record<string, FormField>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}

// 主题类型
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

// 工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 事件类型
export interface CustomEvent<T = any> {
  type: string;
  data: T;
  timestamp: Timestamp;
  source?: string;
}

// 配置类型
export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  features: {
    monitoring: boolean;
    analytics: boolean;
    debugging: boolean;
  };
  limits: {
    maxFileSize: number;
    maxConcurrentTests: number;
    requestTimeout: number;
  };
}

// 帮助系统相关类型
export interface FAQFeedback {
  faqId: string;
  isHelpful: boolean;
  userId?: string;
}

export interface FeedbackSubmission {
  type: 'bug' | 'feature' | 'improvement' | 'question';
  title: string;
  description: string;
  email: string;
  priority: 'low' | 'medium' | 'high';
  userId?: string;
}

export interface SearchResult {
  id: string;
  type: 'faq' | 'guide' | 'video' | 'download';
  title: string;
  description: string;
  relevance: number;
  url?: string;
}

export interface DownloadRequest {
  resourceId: string;
  userId?: string;
}
