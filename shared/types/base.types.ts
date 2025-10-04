/**
 * 基础类型定义
 * 定义项目中最基础的通用类型
 */

// =============================================================================
// 基础标识符类型
// =============================================================================

/**
 * UUID 类型（字符串别名，用于类型提示）
 */
export type UUID = string;

/**
 * 时间戳类型（ISO 8601 格式字符串）
 */
export type Timestamp = string;

/**
 * URL 类型（字符串别名，用于类型提示）
 */
export type URLString = string;

/**
 * 颜色值类型（支持各种颜色格式）
 */
export type ColorValue = string; // #hex, rgb(), rgba(), hsl(), hsla(), 或颜色名称

/**
 * 文件大小类型（字节数）
 */
export type FileSize = number;

/**
 * 持续时间类型（毫秒）
 */
export type Duration = number;

/**
 * 评分类型（0-100）
 */
export type Score = number;

/**
 * 百分比类型（0-100）
 */
export type Percentage = number;

// =============================================================================
// 状态枚举类型
// =============================================================================

/**
 * 通用状态枚举
 */
export enum GeneralStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  DISABLED = 'disabled',
  DELETED = 'deleted'
}

/**
 * 处理状态枚举
 */
export enum ProcessingStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

/**
 * 优先级枚举
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 严重程度枚举
 */
export enum Severity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// =============================================================================
// 基础接口类型
// =============================================================================

/**
 * 基础实体接口（包含ID和时间戳）
 */
export interface BaseEntity {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 可软删除的实体接口
 */
export interface SoftDeletableEntity extends BaseEntity {
  deletedAt?: Timestamp;
  isDeleted?: boolean;
}

/**
 * 带版本控制的实体接口
 */
export interface VersionedEntity extends BaseEntity {
  version: number;
  lastModifiedBy?: UUID;
}

/**
 * 带标签的实体接口
 */
export interface TaggableEntity {
  tags?: string[];
  categories?: string[];
}

/**
 * 带元数据的实体接口
 */
export interface MetadataEntity {
  metadata?: Record<string, any>;
  customFields?: Record<string, any>;
}

// =============================================================================
// 操作结果类型
// =============================================================================

/**
 * 基础操作结果
 */
export interface BaseResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
}

/**
 * 成功结果
 */
export interface SuccessResult<T = any> extends BaseResult {
  success: true;
  data: T;
}

/**
 * 错误结果
 */
export interface ErrorResult extends BaseResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
}

/**
 * 操作结果联合类型
 */
export type OperationResult<T = any> = SuccessResult<T> | ErrorResult;

// =============================================================================
// 分页类型
// =============================================================================

/**
 * 分页信息
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  startIndex: number;
  endIndex: number;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * 排序参数
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 搜索参数
 */
export interface SearchParams {
  search?: string;
  searchFields?: string[];
}

/**
 * 过滤参数
 */
export interface FilterParams {
  filters?: Record<string, any>;
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
}

/**
 * 查询参数（组合类型）
 */
export interface QueryParams extends PaginationParams, SortParams, SearchParams, FilterParams {
  include?: string[];
  exclude?: string[];
}

// =============================================================================
// 配置类型
// =============================================================================

/**
 * 基础配置项
 */
export interface ConfigItem<T = any> {
  key: string;
  value: T;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  defaultValue?: T;
  required?: boolean;
  readonly?: boolean;
  sensitive?: boolean;
}

/**
 * 环境类型
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test'
}

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// =============================================================================
// 文件和媒体类型
// =============================================================================

/**
 * 文件信息
 */
export interface FileInfo {
  id?: UUID;
  name: string;
  originalName?: string;
  size: FileSize;
  type: string;
  extension: string;
  url: URLString;
  thumbnailUrl?: URLString;
  uploadedAt: Timestamp;
  uploadedBy?: UUID;
  metadata?: {
    width?: number;
    height?: number;
    duration?: Duration;
    bitrate?: number;
    codec?: string;
    [key: string]: any;
  };
}

/**
 * 媒体类型
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  CODE = 'code',
  OTHER = 'other'
}

// =============================================================================
// 地理位置类型
// =============================================================================

/**
 * 坐标
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

/**
 * 地理位置
 */
export interface Location {
  coordinates: Coordinates;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
}

// =============================================================================
// 通知和消息类型
// =============================================================================

/**
 * 通知类型
 */
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SYSTEM = 'system'
}

/**
 * 通知
 */
export interface Notification {
  id: UUID;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  actions?: Array<{
    label: string;
    action: string;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
}

// =============================================================================
// 工具类型和类型守卫
// =============================================================================

/**
 * 可选键类型
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 必需键类型
 */
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * 深度只读类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 键值对类型
 */
export type KeyValuePair<K extends string | number | symbol = string, V = any> = {
  key: K;
  value: V;
};

/**
 * 选项类型
 */
export interface SelectOption<T = any> {
  label: string;
  value: T;
  disabled?: boolean;
  description?: string;
  icon?: string;
  color?: ColorValue;
  group?: string;
}

/**
 * 类型守卫：检查是否为成功结果
 */
export function isSuccessResult<T>(result: OperationResult<T>): result is SuccessResult<T> {
  return result.success === true;
}

/**
 * 类型守卫：检查是否为错误结果
 */
export function isErrorResult<T>(result: OperationResult<T>): result is ErrorResult {
  return result.success === false;
}

/**
 * 类型守卫：检查是否为有效UUID
 */
export function isValidUUID(value: string): value is UUID {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * 类型守卫：检查是否为有效时间戳
 */
export function isValidTimestamp(value: string): value is Timestamp {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * 类型守卫：检查是否为有效URL
 */
export function isValidURL(value: string): value is URLString {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
