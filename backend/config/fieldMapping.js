/**
 * 统一字段映射配置
 * 解决数据库 snake_case 与前端 camelCase 的转换问题
 * 与数据库模式和后端模型完全匹配
 */

// 用户字段映射 - 与数据库users表完全匹配
const USER_FIELD_MAPPING = {
  // 基础字段（无需转换）
  id: 'id',
  username: 'username',
  email: 'email',
  role: 'role',
  plan: 'plan',
  status: 'status',

  // 个人信息字段
  firstName: 'first_name',
  lastName: 'last_name',
  avatarUrl: 'avatar_url',
  bio: 'bio',
  location: 'location',
  website: 'website',

  // 安全相关字段
  emailVerified: 'email_verified',
  emailVerifiedAt: 'email_verified_at',
  twoFactorEnabled: 'two_factor_enabled',
  loginAttempts: 'failed_login_attempts',
  lockedUntil: 'locked_until',

  // 统计信息字段
  loginCount: 'login_count',
  lastLoginAt: 'last_login',  // 修复：统一为last_login

  // 时间戳字段
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',

  // JSON 字段
  preferences: 'preferences',
  metadata: 'metadata',

  // 扩展字段
  apiKey: 'api_key'
};

// 测试字段映射 - 与数据库test_executions表完全匹配
const TEST_FIELD_MAPPING = {
  // 基础字段
  id: 'id',
  userId: 'user_id',
  sessionId: 'session_id',

  // 测试信息字段
  testType: 'test_type',
  testName: 'test_name',
  url: 'url',
  status: 'status',

  // 时间字段
  startTime: 'start_time',
  endTime: 'end_time',
  duration: 'duration',

  // JSON 字段
  config: 'config',
  results: 'results',
  metrics: 'metrics',
  errors: 'errors',
  tags: 'tags',

  // 扩展字段
  notes: 'notes',
  archived: 'archived',

  // 时间戳字段
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
};

/**
 * 通用字段转换函数
 */
class FieldMapper {
  /**
   * 将 camelCase 转换为 snake_case
   */
  static toSnakeCase(obj, mapping) {
    const result = {};
    for (const [camelKey, snakeKey] of Object.entries(mapping)) {
      if (obj.hasOwnProperty(camelKey)) {
        result[snakeKey] = obj[camelKey];
      }
    }
    return result;
  }

  /**
   * 将 snake_case 转换为 camelCase
   */
  static toCamelCase(obj, mapping) {
    const result = {};
    for (const [camelKey, snakeKey] of Object.entries(mapping)) {
      if (obj.hasOwnProperty(snakeKey)) {
        result[camelKey] = obj[snakeKey];
      }
    }
    return result;
  }

  /**
   * 生成 SQL 查询的字段别名
   */
  static generateSQLAliases(mapping, tableName = '') {
    const aliases = [];
    for (const [camelKey, snakeKey] of Object.entries(mapping)) {
      const fullField = tableName ? `${tableName}.${snakeKey}` : snakeKey;
      aliases.push(`${fullField} AS "${camelKey}"`);
    }
    return aliases.join(', ');
  }

  /**
   * 处理 JSON 字段的解析
   */
  static parseJSONFields(obj, jsonFields) {
    const result = { ...obj };
    for (const field of jsonFields) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = JSON.parse(result[field]);
        } catch (error) {
          console.warn(`Failed to parse JSON field ${field}:`, error);
          result[field] = {};
        }
      }
    }
    return result;
  }
}

module.exports = {
  USER_FIELD_MAPPING,
  TEST_FIELD_MAPPING,
  FieldMapper
};
