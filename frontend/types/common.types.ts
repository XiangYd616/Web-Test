/**
 * 通用类型定义 - 重构版本
 * 使用统一的类型定义，解决前后端不一致问题
 * 版本: v2.0.0
 */

// 重新导出统一类型
export * from '../../shared/types/unifiedTypes';

// 向后兼容的类型别名
export type ID = string | number;
export type Status = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// 注意：API响应类型已从统一类型定义中导入
// 这里保留注释以说明类型来源

// 分页类型 - 向后兼容
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 注意：PaginationMeta 和 PaginatedResponse 已从统一类型定义中导入

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

// 测试相关类型 - 已迁移到统一类型系统
import type { TestType } from './unified/testTypes';
import type { ReactNode } from 'react';

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

// 导出所有类型
export type {
  AlertCondition, AlertConfig,
  // 重新导出以确保类型可用
  ApiResponse, AppConfig, BaseComponentProps, CustomEvent, ErrorProps,
  FormField,
  FormState, LoadingProps, MonitoringTarget, NotificationConfig, PaginatedResponse, PaginationMeta, PaginationParams, TestConfig,
  TestResult, TestType, Theme, User
};

