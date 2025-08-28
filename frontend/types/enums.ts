/**
 * 枚举类型定义
 * 版本: v2.0.0
 */

// 测试类型枚举
export enum TestType {
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  API = 'api',
  COMPATIBILITY = 'compatibility',
  SEO = 'seo',
  UX = 'ux',
  NETWORK = 'network',
  DATABASE = 'database',
  STRESS = 'stress',
  LOAD = 'load',
  FUNCTIONAL = 'functional',
  INTEGRATION = 'integration',
  UNIT = 'unit',
  E2E = 'e2e',
  ACCESSIBILITY = 'accessibility',
  WEBSITE = 'website'
}

// 测试状态枚举
export enum TestStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  TIMEOUT = 'timeout'
}

// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  MODERATOR = 'moderator',
  MANAGER = 'manager',
  TESTER = 'tester'
}

// 用户状态枚举
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PENDING = 'pending'
}

// 项目状态枚举
export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// 项目类型枚举
export enum ProjectType {
  WEB = 'web',
  MOBILE = 'mobile',
  API = 'api',
  DESKTOP = 'desktop'
}

// 通知类型枚举
export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

// 日志级别枚举
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// 权限枚举
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
  EXECUTE = 'execute'
}

// 审计事件类型枚举
export enum AuditEventType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESS = 'access',
  EXPORT = 'export',
  IMPORT = 'import'
}

// 系统状态枚举
export enum SystemStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

// 数据类型枚举
export enum DataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  DATE = 'date',
  NULL = 'null',
  UNDEFINED = 'undefined'
}

// 排序方向枚举
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

// 主题枚举
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

// 语言枚举
export enum Language {
  EN = 'en',
  ZH = 'zh',
  ES = 'es',
  FR = 'fr',
  DE = 'de',
  JA = 'ja'
}

// 用户计划枚举
export enum UserPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

// 测试等级枚举
export enum TestGrade {
  A_PLUS = 'A+',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F'
}

// 测试优先级枚举
export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 主题模式枚举
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

// 时区枚举
export enum Timezone {
  UTC = 'UTC',
  ASIA_SHANGHAI = 'Asia/Shanghai',
  AMERICA_NEW_YORK = 'America/New_York',
  EUROPE_LONDON = 'Europe/London',
  ASIA_TOKYO = 'Asia/Tokyo'
}

// 基于Context7最佳实践：移除重复导出语句
// 所有枚举已通过 export enum 关键字直接导出
// 避免TS2484导出声明冲突错误

