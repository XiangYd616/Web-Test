import { TestStatus, TestType } from '../../frontend/types/enums';

/**
 * 统一类型定义 - 前后端共享
 * 版本: v2.0.0
 * 创建时间: 2025-08-24
 * 
 * 此文件解决前后端类型定义不一致问题：
 * 1. 统一字段命名规范（camelCase vs snake_case）
 * 2. 统一数据结构定义
 * 3. 提供类型转换工具
 */

// ==================== 基础类型 ====================

export type UUID = string;
export type Timestamp = string; // ISO 8601 格式
export type DatabaseId = number;
export type JsonObject = Record<string, any>;

// ==================== 枚举类型 ====================

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export enum UserPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

// TestType 和 TestStatus 已迁移到统一类型系统
// 请从 frontend/types/unified/testTypes 导入
// 注意：这是共享类型文件，如果需要在后端使用，请考虑创建后端专用的类型定义

// ==================== 用户相关类型 ====================

/**
 * 统一用户接口 - 前端使用camelCase
 */
export interface User {
  // 基础信息
  id: UUID;
  username: string;
  email: string;

  // 角色和权限
  role: UserRole;
  plan: UserPlan;
  status: UserStatus;
  permissions: string[];

  // 个人信息
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;

  // 安全相关
  emailVerified: boolean;
  emailVerifiedAt?: Timestamp;
  twoFactorEnabled: boolean;
  loginAttempts: number;
  lockedUntil?: Timestamp;

  // 统计信息
  loginCount: number;
  lastLoginAt?: Timestamp;
  testCount: number;

  // 偏好设置
  preferences: UserPreferences;

  // 时间戳
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;

  // 元数据
  metadata: JsonObject;
}

/**
 * 数据库用户接口 - 后端使用snake_case
 */
export interface UserDatabase {
  // 基础信息
  id: string;
  username: string;
  email: string;
  password_hash: string;

  // 角色和权限
  role: string;
  plan: string;
  status: string;
  permissions: string; // JSON字符串

  // 个人信息
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;

  // 安全相关
  email_verified: boolean;
  email_verified_at?: string;
  two_factor_enabled: boolean;
  failed_login_attempts: number;
  locked_until?: string;

  // 统计信息
  login_count: number;
  last_login_at?: string;
  test_count: number;

  // 偏好设置
  preferences: string; // JSON字符串

  // 时间戳
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // 元数据
  metadata: string; // JSON字符串
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    testComplete: boolean;
    testFailed: boolean;
    weeklyReport: boolean;
  };
  dashboard: {
    defaultView: string;
    refreshInterval: number;
    showTutorial: boolean;
  };
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  jobTitle?: string;
}

// ==================== 测试相关类型 ====================

export interface TestConfig {
  url: string;
  testType: TestType;
  options: JsonObject;
  timeout?: number;
  retries?: number;
  tags?: string[];
  description?: string;
}

export interface TestSession {
  id: UUID;
  userId: UUID;
  type: TestType;
  status: TestStatus;
  progress: number;
  currentStep: string;
  config: TestConfig;
  result?: JsonObject;
  error?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestProgress {
  stage: string;
  progress: number;
  message: string;
  timestamp: number;
  metrics?: JsonObject;
}

export interface TestResult {
  id: UUID;
  sessionId: UUID;
  type: TestType;
  status: TestStatus;
  score?: number;
  grade?: string;
  summary: string;
  details: JsonObject;
  metrics: JsonObject;
  recommendations: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== API响应类型 ====================

export interface ApiMeta {
  timestamp: string;
  requestId: string;
  path: string;
  method: string;
  version: string;
  duration?: number;
  pagination?: PaginationMeta;
  [key: string]: any;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: ApiMeta;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  current: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number | null;
  prevPage?: number | null;
  count: number;
}

export interface PaginatedResponse<T = any> extends ApiSuccessResponse<T[]> {
  meta: ApiMeta & {
    pagination: PaginationMeta;
  };
}

// ==================== 字段映射配置 ====================

export const USER_FIELD_MAPPING = {
  // 基础字段
  id: 'id',
  username: 'username',
  email: 'email',
  role: 'role',
  plan: 'plan',
  status: 'status',

  // 个人信息
  firstName: 'first_name',
  lastName: 'last_name',
  avatarUrl: 'avatar_url',
  bio: 'bio',
  location: 'location',
  website: 'website',

  // 安全相关
  emailVerified: 'email_verified',
  emailVerifiedAt: 'email_verified_at',
  twoFactorEnabled: 'two_factor_enabled',
  loginAttempts: 'failed_login_attempts',
  lockedUntil: 'locked_until',

  // 统计信息
  loginCount: 'login_count',
  lastLoginAt: 'last_login_at',
  testCount: 'test_count',

  // 时间戳
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',

  // JSON字段
  preferences: 'preferences',
  metadata: 'metadata',
  permissions: 'permissions'
} as const;

export const TEST_FIELD_MAPPING = {
  id: 'id',
  userId: 'user_id',
  sessionId: 'session_id',
  testType: 'test_type',
  status: 'status',
  progress: 'progress',
  currentStep: 'current_step',
  startTime: 'start_time',
  endTime: 'end_time',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  config: 'config',
  result: 'result',
  error: 'error'
} as const;

// ==================== 类型转换工具 ====================

/**
 * 字段映射转换器
 */
export class FieldMapper {
  /**
   * 将前端camelCase对象转换为后端snake_case对象
   */
  static toSnakeCase<T extends Record<string, any>>(
    obj: T,
    mapping: Record<string, string>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [camelKey, snakeKey] of Object.entries(mapping)) {
      if (obj.hasOwnProperty(camelKey) && obj[camelKey] !== undefined) {
        result[snakeKey] = obj[camelKey];
      }
    }

    return result;
  }

  /**
   * 将后端snake_case对象转换为前端camelCase对象
   */
  static toCamelCase<T extends Record<string, any>>(
    obj: T,
    mapping: Record<string, string>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [camelKey, snakeKey] of Object.entries(mapping)) {
      if (obj.hasOwnProperty(snakeKey) && obj[snakeKey] !== undefined) {
        result[camelKey] = obj[snakeKey];
      }
    }

    return result;
  }

  /**
   * 处理JSON字段的序列化和反序列化
   */
  static processJsonFields<T extends Record<string, any>>(
    obj: T,
    jsonFields: string[],
    operation: 'serialize' | 'deserialize'
  ): T {
    const result = { ...obj };

    for (const field of jsonFields) {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          if (operation === 'serialize') {
            // 前端 -> 后端：对象转JSON字符串
            if (typeof result[field] === 'object') {
              (result as any)[field] = JSON.stringify((result as any)[field]);
            }
          } else {
            // 后端 -> 前端：JSON字符串转对象
            if (typeof result[field] === 'string') {
              (result as any)[field] = JSON.parse((result as any)[field]);
            }
          }
        } catch (error) {
          console.warn(`Failed to ${operation} JSON field ${field}:`, error);
          (result as any)[field] = operation === 'serialize' ? '{}' : {};
        }
      }
    }

    return result;
  }
}

// ==================== 用户类型转换器 ====================

export class UserTypeConverter {
  private static readonly JSON_FIELDS = ['preferences', 'metadata', 'permissions'];

  /**
   * 将前端User对象转换为数据库UserDatabase对象
   */
  static toDatabase(user: Partial<User>): Partial<UserDatabase> {
    // 先转换字段名
    let dbUser = FieldMapper.toSnakeCase(user, USER_FIELD_MAPPING);

    // 处理JSON字段序列化
    dbUser = FieldMapper.processJsonFields(dbUser, this.JSON_FIELDS, 'serialize');

    return dbUser as Partial<UserDatabase>;
  }

  /**
   * 将数据库UserDatabase对象转换为前端User对象
   */
  static fromDatabase(dbUser: Partial<UserDatabase>): Partial<User> {
    // 先处理JSON字段反序列化
    let user = FieldMapper.processJsonFields(dbUser, this.JSON_FIELDS, 'deserialize');

    // 再转换字段名
    user = FieldMapper.toCamelCase(user, USER_FIELD_MAPPING);

    return user as unknown as Partial<User>;
  }
}

// ==================== 测试类型转换器 ====================

export class TestTypeConverter {
  private static readonly JSON_FIELDS = ['config', 'result', 'error'];

  /**
   * 将前端TestSession对象转换为数据库对象
   */
  static toDatabase(test: Partial<TestSession>): Record<string, any> {
    let dbTest = FieldMapper.toSnakeCase(test, TEST_FIELD_MAPPING);
    dbTest = FieldMapper.processJsonFields(dbTest, this.JSON_FIELDS, 'serialize');
    return dbTest;
  }

  /**
   * 将数据库对象转换为前端TestSession对象
   */
  static fromDatabase(dbTest: Record<string, any>): Partial<TestSession> {
    let test = FieldMapper.processJsonFields(dbTest, this.JSON_FIELDS, 'deserialize');
    test = FieldMapper.toCamelCase(test, TEST_FIELD_MAPPING);
    return test as Partial<TestSession>;
  }
}

// ==================== 验证工具 ====================

export class TypeValidator {
  /**
   * 验证用户对象
   */
  static validateUser(user: any): user is User {
    return (
      user &&
      typeof user.id === 'string' &&
      typeof user.username === 'string' &&
      typeof user.email === 'string' &&
      Object.values(UserRole).includes(user.role) &&
      Object.values(UserStatus).includes(user.status) &&
      Object.values(UserPlan).includes(user.plan)
    );
  }

  /**
   * 验证测试会话对象
   */
  static validateTestSession(session: any): session is TestSession {
    return (
      session &&
      typeof session.id === 'string' &&
      typeof session.userId === 'string' &&
      Object.values(TestType).includes(session.type) &&
      Object.values(TestStatus).includes(session.status)
    );
  }

  /**
   * 验证API响应格式
   */
  static validateApiResponse(response: any): response is ApiResponse {
    return (
      response &&
      typeof response.success === 'boolean' &&
      typeof response.message === 'string' &&
      response.meta &&
      typeof response.meta.timestamp === 'string' &&
      typeof response.meta.requestId === 'string'
    );
  }
}
