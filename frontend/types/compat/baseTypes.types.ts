// 基础类型定义
export type Timestamp = string | Date | number;
export type UUID = string;
export type ID = string | number;

// 状态类型
export type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'cancelled';

// 组件相关类型
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type ComponentVariant = 'solid' | 'outline' | 'ghost' | 'link';

// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// 成功响应类型
export interface ApiSuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
}

// 错误响应类型
export interface ApiErrorResponse extends ApiResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// 分页信息
export interface PaginationInfo {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// 分页响应
export interface PaginatedResponse<T = any> extends ApiSuccessResponse<T[]> {
  pagination: PaginationInfo;
}

// 查询参数
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filter?: Record<string, any>;
}

// 请求配置
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  params?: QueryParams;
}

// 验证错误
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// API错误
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Timestamp;
}

// 用户基础信息
export interface BaseUser {
  id: ID;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
}

// 测试会话基础信息
export interface BaseTestSession {
  id: ID;
  userId: ID;
  testType: string;
  status: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

// 系统配置基础信息
export interface BaseSystemConfig {
  id: ID;
  key: string;
  value: any;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 审计日志基础信息
export interface BaseAuditLog {
  id: ID;
  userId?: ID;
  action: string;
  resource: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

// 导出所有类型
// 基于Context7最佳实践：移除重复导出语句
// 所有类型已通过 export interface/type 关键字直接导出
// 避免TS2484导出声明冲突错误
