/**
 * 通用接口定义
 * 定义项目中使用的通用接口
 */

// 基础响应接口
export interface ApiResponse<T = any>   {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number
}

// 分页接口
export interface PaginationParams   {
  page: number;
  pageSize: number;
  total?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]>   {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number
}
}

// 用户接口
export interface User   {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: string;
  roles?: string[]
  permissions?: string[]
  createdAt: string;
  updatedAt: string
}

// 测试相关接口
export interface TestConfig   {
  id?: string;
  name: string;
  type: 'performance' | 'seo' | 'security' | 'api' | 'stress
  url: string;
  settings: Record<string, any>
  createdAt?: string;
  updatedAt?: string'}
export interface TestResult {
  id: string;
  testId: string;
  status: 'pending' | 'running' | 'completed' | 'failed
  score?: number;
  metrics: Record<string, any>
  recommendations?: string[]
  startTime: string;
  endTime?: string;
  duration?: number
}

// 组件Props接口
export interface BaseComponentProps   {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties'}
export interface LoadingProps extends BaseComponentProps   {;
  size?: 'small' | 'medium' | 'large
  text?: string
}

export interface ErrorBoundaryProps extends BaseComponentProps   {
  fallback?: React.ComponentType<{ error: Error }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}
// 表单接口;
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number
}
}

export interface FormData   {
  [key: string]: any
}

export interface FormErrors   {
  [key: string]: string
}

// 导航接口
export interface NavigationItem   {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  children?: NavigationItem[]
  roles?: string[]
  permissions?: string[]
}

// 主题接口
export interface Theme   {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    text: string
}
  typography: {
    fontFamily: string;
    fontSize: Record<string, string>
    fontWeight: Record<string, number>
  }
  spacing: Record<string, string>
  breakpoints: Record<string, string>
}

export default {
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
  User,
  TestConfig,
  TestResult,
  BaseComponentProps,
  LoadingProps,
  ErrorBoundaryProps,
  FormField,
  FormData,
  FormErrors,
  NavigationItem,
  Theme'}