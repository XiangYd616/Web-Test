/**
 * 基础类型定义
 * 项目中使用的通用基础类型
 */

// ==================== 基础数据类型 ====================

/** 唯一标识符 */
export type ID = string | number;

/** 时间戳 */
export type Timestamp = string | number | Date;

/** 状态类型 */
export type Status = 'active' | 'inactive' | 'pending' | 'disabled';

/** 排序方向 */
export type SortDirection = 'asc' | 'desc';

/** 操作结果 */
export type OperationResult = 'success' | 'error' | 'warning' | 'info';

// ==================== 分页相关类型 ====================

/** 分页参数 */
export interface PaginationParams {
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortDirection?: SortDirection;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  data: T[];
  /** 分页信息 */
  pagination: {
    /** 当前页码 */
    page: number;
    /** 每页条数 */
    pageSize: number;
    /** 总条数 */
    total: number;
    /** 总页数 */
    totalPages: number;
    /** 是否有下一页 */
    hasNext: boolean;
    /** 是否有上一页 */
    hasPrev: boolean;
  };
}

// ==================== 选项相关类型 ====================

/** 基础选项 */
export interface BaseOption {
  /** 选项值 */
  value: string | number;
  /** 选项标签 */
  label: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/** 分组选项 */
export interface GroupedOption {
  /** 分组标签 */
  label: string;
  /** 分组选项 */
  options: BaseOption[];
}

/** 树形选项 */
export interface TreeOption extends BaseOption {
  /** 子选项 */
  children?: TreeOption[];
  /** 父级值 */
  parentValue?: string | number;
  /** 层级 */
  level?: number;
}

// ==================== 表单相关类型 ====================

/** 表单字段类型 */
export type FormFieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'url' 
  | 'tel'
  | 'textarea' 
  | 'select' 
  | 'multiselect'
  | 'checkbox' 
  | 'radio' 
  | 'switch'
  | 'date' 
  | 'datetime' 
  | 'time'
  | 'file' 
  | 'image';

/** 验证规则类型 */
export type ValidationRuleType = 
  | 'required' 
  | 'minLength' 
  | 'maxLength' 
  | 'min' 
  | 'max'
  | 'pattern' 
  | 'email' 
  | 'url' 
  | 'custom';

/** 验证规则 */
export interface ValidationRule {
  /** 规则类型 */
  type: ValidationRuleType;
  /** 规则值 */
  value?: unknown;
  /** 错误消息 */
  message: string;
  /** 自定义验证函数 */
  validator?: (value: unknown) => boolean | Promise<boolean>;
}

/** 表单字段配置 */
export interface FormFieldConfig {
  /** 字段名称 */
  name: string;
  /** 字段标签 */
  label: string;
  /** 字段类型 */
  type: FormFieldType;
  /** 默认值 */
  defaultValue?: unknown;
  /** 占位符 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否只读 */
  readonly?: boolean;
  /** 验证规则 */
  rules?: ValidationRule[];
  /** 选项列表（用于select等） */
  options?: BaseOption[] | GroupedOption[];
  /** 字段描述 */
  description?: string;
  /** 字段提示 */
  tooltip?: string;
}

/** 表单验证错误 */
export interface FormValidationError {
  /** 字段名称 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  type: ValidationRuleType;
}

// ==================== 文件相关类型 ====================

/** 文件类型 */
export type FileType = 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'document' 
  | 'archive' 
  | 'code' 
  | 'other';

/** 文件信息 */
export interface FileInfo {
  /** 文件ID */
  id: string;
  /** 文件名 */
  name: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件类型 */
  type: string;
  /** 文件分类 */
  category: FileType;
  /** 文件URL */
  url: string;
  /** 缩略图URL */
  thumbnailUrl?: string;
  /** 上传时间 */
  uploadTime: Timestamp;
  /** 上传者 */
  uploader?: string;
}

/** 文件上传配置 */
export interface FileUploadConfig {
  /** 允许的文件类型 */
  accept?: string[];
  /** 最大文件大小（字节） */
  maxSize?: number;
  /** 最大文件数量 */
  maxCount?: number;
  /** 是否支持多选 */
  multiple?: boolean;
  /** 上传URL */
  uploadUrl?: string;
  /** 自定义上传函数 */
  customUpload?: (file: File) => Promise<FileInfo>;
}

// ==================== 权限相关类型 ====================

/** 权限类型 */
export type PermissionType = 'read' | 'write' | 'delete' | 'admin';

/** 权限对象 */
export interface Permission {
  /** 权限ID */
  id: string;
  /** 权限名称 */
  name: string;
  /** 权限类型 */
  type: PermissionType;
  /** 权限描述 */
  description?: string;
  /** 资源路径 */
  resource?: string;
}

/** 角色 */
export interface Role {
  /** 角色ID */
  id: string;
  /** 角色名称 */
  name: string;
  /** 角色描述 */
  description?: string;
  /** 权限列表 */
  permissions: Permission[];
  /** 是否为系统角色 */
  isSystem?: boolean;
}

/** 用户信息 */
export interface UserInfo {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email?: string;
  /** 显示名称 */
  displayName?: string;
  /** 头像URL */
  avatar?: string;
  /** 角色列表 */
  roles: Role[];
  /** 是否激活 */
  isActive: boolean;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 最后登录时间 */
  lastLoginAt?: Timestamp;
}

// ==================== 配置相关类型 ====================

/** 配置项类型 */
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'array' | 'object';

/** 配置项 */
export interface ConfigItem {
  /** 配置键 */
  key: string;
  /** 配置值 */
  value: unknown;
  /** 值类型 */
  type: ConfigValueType;
  /** 配置标签 */
  label: string;
  /** 配置描述 */
  description?: string;
  /** 默认值 */
  defaultValue?: unknown;
  /** 是否必填 */
  required?: boolean;
  /** 验证规则 */
  validation?: ValidationRule[];
  /** 配置分组 */
  group?: string;
  /** 排序权重 */
  order?: number;
}

/** 配置分组 */
export interface ConfigGroup {
  /** 分组名称 */
  name: string;
  /** 分组标签 */
  label: string;
  /** 分组描述 */
  description?: string;
  /** 配置项列表 */
  items: ConfigItem[];
  /** 排序权重 */
  order?: number;
}

// ==================== 日志相关类型 ====================

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** 日志条目 */
export interface LogEntry {
  /** 日志ID */
  id: string;
  /** 日志级别 */
  level: LogLevel;
  /** 日志消息 */
  message: string;
  /** 时间戳 */
  timestamp: Timestamp;
  /** 来源模块 */
  module?: string;
  /** 用户ID */
  userId?: string;
  /** 请求ID */
  requestId?: string;
  /** 额外数据 */
  data?: Record<string, any>;
  /** 错误堆栈 */
  stack?: string;
}

// ==================== 通知相关类型 ====================

/** 通知类型 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/** 通知优先级 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/** 通知 */
export interface Notification {
  /** 通知ID */
  id: string;
  /** 通知类型 */
  type: NotificationType;
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  content: string;
  /** 优先级 */
  priority: NotificationPriority;
  /** 是否已读 */
  isRead: boolean;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 过期时间 */
  expiresAt?: Timestamp;
  /** 相关链接 */
  link?: string;
  /** 操作按钮 */
  actions?: NotificationAction[];
}

/** 通知操作 */
export interface NotificationAction {
  /** 操作ID */
  id: string;
  /** 操作标签 */
  label: string;
  /** 操作类型 */
  type: 'primary' | 'secondary' | 'danger';
  /** 操作回调 */
  onClick: () => void;
}

// ==================== 搜索相关类型 ====================

/** 搜索条件操作符 */
export type SearchOperator = 
  | 'eq'      // 等于
  | 'ne'      // 不等于
  | 'gt'      // 大于
  | 'gte'     // 大于等于
  | 'lt'      // 小于
  | 'lte'     // 小于等于
  | 'like'    // 模糊匹配
  | 'in'      // 包含
  | 'nin'     // 不包含
  | 'between' // 区间
  | 'exists'  // 存在
  | 'null';   // 为空

/** 搜索条件 */
export interface SearchCondition {
  /** 字段名 */
  field: string;
  /** 操作符 */
  operator: SearchOperator;
  /** 值 */
  value: unknown;
  /** 逻辑连接符 */
  logic?: 'and' | 'or';
}

/** 搜索参数 */
export interface SearchParams {
  /** 关键词 */
  keyword?: string;
  /** 搜索条件 */
  conditions?: SearchCondition[];
  /** 分页参数 */
  pagination?: PaginationParams;
  /** 高亮字段 */
  highlight?: string[];
}

/** 搜索结果 */
export interface SearchResult<T> {
  /** 结果数据 */
  data: T[];
  /** 总数 */
  total: number;
  /** 搜索耗时 */
  took: number;
  /** 高亮信息 */
  highlights?: Record<string, string[]>;
  /** 聚合信息 */
  aggregations?: Record<string, any>;
}

// ==================== 缓存相关类型 ====================

/** 缓存策略 */
export type CacheStrategy = 
  | 'memory'     // 内存缓存
  | 'localStorage' // 本地存储
  | 'sessionStorage' // 会话存储
  | 'indexedDB'  // IndexedDB
  | 'custom';    // 自定义

/** 缓存配置 */
export interface CacheConfig {
  /** 缓存策略 */
  strategy: CacheStrategy;
  /** 过期时间（毫秒） */
  ttl?: number;
  /** 最大缓存数量 */
  maxSize?: number;
  /** 缓存键前缀 */
  prefix?: string;
  /** 自定义缓存实现 */
  customCache?: CacheImplementation;
}

/** 缓存实现接口 */
export interface CacheImplementation {
  /** 获取缓存 */
  get<T>(key: string): Promise<T | null>;
  /** 设置缓存 */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  /** 删除缓存 */
  delete(key: string): Promise<void>;
  /** 清空缓存 */
  clear(): Promise<void>;
  /** 检查缓存是否存在 */
  has(key: string): Promise<boolean>;
}

// ==================== 事件相关类型 ====================

/** 事件类型 */
export type EventType = string;

/** 事件监听器 */
export type EventListener<T = any> = (data: T) => void;

/** 事件发射器接口 */
export interface EventEmitter {
  /** 添加事件监听器 */
  on<T>(event: EventType, listener: EventListener<T>): void;
  /** 移除事件监听器 */
  off<T>(event: EventType, listener: EventListener<T>): void;
  /** 触发事件 */
  emit<T>(event: EventType, data: T): void;
  /** 一次性事件监听器 */
  once<T>(event: EventType, listener: EventListener<T>): void;
  /** 移除所有监听器 */
  removeAllListeners(event?: EventType): void;
}

// ==================== 工具类型 ====================

/** 深度可选 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** 深度必需 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/** 选择性必需 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** 选择性可选 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** 值类型 */
export type ValueOf<T> = T[keyof T];

/** 函数参数类型 */
export type Parameters<T extends (...args: unknown) => any> = T extends (...args: infer P) => any ? P : never;

/** 函数返回类型 */
export type ReturnType<T extends (...args: unknown) => any> = T extends (...args: unknown) => infer R ? R : unknown;

/** Promise解包 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;
