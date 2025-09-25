// 用户相关类型
export interface User {
  id: string
  username: string
  email: string
  avatar?: string
  role: 'admin' | 'user' | 'tester'
  createdAt: string
  updatedAt: string
}

// 测试相关类型
export interface TestResult {
  id: string
  type: TestType
  url: string
  status: TestStatus
  startTime: string
  endTime?: string
  duration?: number
  results: any
  createdBy: string
}

export type TestType = 'stress' | 'content' | 'compatibility' | 'seo' | 'api' | 'security'
export type TestStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// 压力测试相关
export interface StressTestConfig {
  url: string
  concurrency: number
  duration: number
  rampUp?: number
  headers?: Record<string, string>
}

export interface StressTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  requestsPerSecond: number
  errors: Array<{
    type: string
    count: number
    message: string
  }>
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: number
}

// 分页相关
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    current: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// 表单相关
export interface LoginForm {
  username: string
  password: string
  remember?: boolean
}

export interface RegisterForm {
  username: string
  email: string
  password: string
  confirmPassword: string
}

// 系统配置
export interface SystemConfig {
  siteName: string
  version: string
  maxConcurrentTests: number
  defaultTimeout: number
  supportedBrowsers: string[]
}

// WebSocket消息类型
export interface WebSocketMessage {
  type: 'test_progress' | 'test_complete' | 'test_error' | 'system_notification'
  payload: any
  timestamp: string
}

// 错误类型
export interface AppError {
  code: string
  message: string
  details?: any
  stack?: string
}
