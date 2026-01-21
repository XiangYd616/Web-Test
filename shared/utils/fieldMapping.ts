/**
 * 统一字段映射配置
 * 解决数据库 snake_case 与前端 camelCase 的转换问题
 */

type FieldMapping = Record<string, string>;

type JsonFields = string[];

type PlainObject = Record<string, unknown>;

// 用户字段映射 - 与数据库users表匹配
const USER_FIELD_MAPPING: FieldMapping = {
  id: 'id',
  username: 'username',
  email: 'email',
  role: 'role',
  plan: 'plan',
  status: 'status',
  firstName: 'first_name',
  lastName: 'last_name',
  avatarUrl: 'avatar_url',
  bio: 'bio',
  location: 'location',
  website: 'website',
  emailVerified: 'email_verified',
  emailVerifiedAt: 'email_verified_at',
  twoFactorEnabled: 'two_factor_enabled',
  loginAttempts: 'failed_login_attempts',
  lockedUntil: 'locked_until',
  loginCount: 'login_count',
  lastLoginAt: 'last_login',
  testCount: 'test_count',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  preferences: 'preferences',
  metadata: 'metadata',
  permissions: 'permissions',
  apiKey: 'api_key',
};

// 测试字段映射 - 与数据库test_executions表匹配
const TEST_FIELD_MAPPING: FieldMapping = {
  id: 'id',
  userId: 'user_id',
  sessionId: 'session_id',
  testType: 'test_type',
  testName: 'test_name',
  url: 'url',
  status: 'status',
  startTime: 'start_time',
  endTime: 'end_time',
  duration: 'duration',
  config: 'config',
  results: 'results',
  metrics: 'metrics',
  errors: 'errors',
  tags: 'tags',
  notes: 'notes',
  archived: 'archived',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
};

class FieldMapper {
  static toSnakeCase(obj: PlainObject, mapping: FieldMapping) {
    const result: PlainObject = {};
    for (const [camelKey, snakeKey] of Object.entries(mapping)) {
      if (Object.prototype.hasOwnProperty.call(obj, camelKey)) {
        result[snakeKey] = obj[camelKey];
      }
    }
    return result;
  }

  static toCamelCase(obj: PlainObject, mapping: FieldMapping) {
    const result: PlainObject = {};
    for (const [camelKey, snakeKey] of Object.entries(mapping)) {
      if (Object.prototype.hasOwnProperty.call(obj, snakeKey)) {
        result[camelKey] = obj[snakeKey];
      }
    }
    return result;
  }

  static generateSQLAliases(mapping: FieldMapping, tableName = '') {
    const aliases: string[] = [];
    for (const [camelKey, snakeKey] of Object.entries(mapping)) {
      const fullField = tableName ? `${tableName}.${snakeKey}` : snakeKey;
      aliases.push(`${fullField} AS "${camelKey}"`);
    }
    return aliases.join(', ');
  }

  static parseJSONFields(obj: PlainObject, jsonFields: JsonFields) {
    const result: PlainObject = { ...obj };
    for (const field of jsonFields) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = JSON.parse(result[field] as string);
        } catch (error) {
          console.warn(`Failed to parse JSON field ${field}:`, error);
          result[field] = {};
        }
      }
    }
    return result;
  }

  static processJsonFields<T extends Record<string, unknown>>(
    obj: T,
    jsonFields: string[],
    operation: 'serialize' | 'deserialize'
  ): T {
    const result = { ...obj } as Record<string, unknown>;

    for (const field of jsonFields) {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          if (operation === 'serialize') {
            if (typeof result[field] === 'object') {
              result[field] = JSON.stringify(result[field]);
            }
          } else if (typeof result[field] === 'string') {
            result[field] = JSON.parse(result[field] as string);
          }
        } catch (error) {
          console.warn(`Failed to ${operation} JSON field ${field}:`, error);
          result[field] = operation === 'serialize' ? '{}' : {};
        }
      }
    }

    return result as T;
  }
}

export { FieldMapper, TEST_FIELD_MAPPING, USER_FIELD_MAPPING };
export type { FieldMapping, JsonFields, PlainObject };
