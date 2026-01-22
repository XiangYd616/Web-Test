/**
 * 统一配置管理器
 * 管理环境变量、应用配置和运行时配置
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

type ConfigSchemaEntry = {
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  default: unknown;
  required: boolean;
};

type ConfigSchema = Record<string, Record<string, ConfigSchemaEntry>>;

type ConfigStore = Record<string, Record<string, unknown>>;

class ConfigManager {
  private config: ConfigStore = {};
  private envLoaded = false;
  private configSchema = this.defineConfigSchema();
  private validationErrors: string[] = [];

  constructor() {
    // 加载配置
    this.loadEnvironmentConfig();
    this.loadApplicationConfig();
    this.validateConfig();
  }

  /**
   * 定义配置模式
   */
  defineConfigSchema(): ConfigSchema {
    return {
      // 服务器配置
      server: {
        port: { type: 'number', default: 3001, required: true },
        host: { type: 'string', default: '0.0.0.0', required: false },
        nodeEnv: { type: 'string', default: 'development', required: true },
      },

      // 数据库配置
      database: {
        host: { type: 'string', default: 'localhost', required: true },
        port: { type: 'number', default: 5432, required: true },
        name: { type: 'string', default: 'testweb', required: true },
        user: { type: 'string', default: 'postgres', required: true },
        password: { type: 'string', default: '', required: true },
        ssl: { type: 'boolean', default: false, required: false },
        maxConnections: { type: 'number', default: 20, required: false },
      },

      // Redis配置
      redis: {
        host: { type: 'string', default: 'localhost', required: false },
        port: { type: 'number', default: 6379, required: false },
        password: { type: 'string', default: '', required: false },
        db: { type: 'number', default: 0, required: false },
      },

      // JWT配置
      jwt: {
        secret: { type: 'string', default: 'your-secret-key', required: true },
        expiresIn: { type: 'string', default: '24h', required: false },
        refreshExpiresIn: { type: 'string', default: '7d', required: false },
      },

      // 测试引擎配置
      testEngines: {
        timeout: { type: 'number', default: 300000, required: false },
        maxConcurrent: { type: 'number', default: 10, required: false },
        retryAttempts: { type: 'number', default: 3, required: false },
      },

      // 测试队列配置
      testQueue: {
        replayLimits: {
          type: 'object',
          default: {
            default: 3,
            roles: {
              admin: 5,
              superadmin: 8,
            },
            users: {},
          },
          required: false,
        },
        exportLimits: {
          type: 'object',
          default: {
            roles: {
              admin: {
                maxLimit: 1000,
                maxBatchSize: 1000,
              },
              user: {
                maxLimit: 500,
                maxBatchSize: 500,
              },
              superadmin: {
                maxLimit: 100000,
                maxBatchSize: 100000,
              },
            },
            users: {},
          },
          required: false,
        },
      },

      // 文件存储配置
      storage: {
        uploadsDir: { type: 'string', default: './uploads', required: false },
        exportsDir: { type: 'string', default: './exports', required: false },
        maxFileSize: { type: 'number', default: 10485760, required: false },
      },

      // 监控配置
      monitoring: {
        enabled: { type: 'boolean', default: true, required: false },
        interval: { type: 'number', default: 60000, required: false },
        retentionDays: { type: 'number', default: 30, required: false },
      },

      // 安全配置
      security: {
        corsOrigins: { type: 'array', default: ['http://localhost:5173'], required: false },
        rateLimitWindow: { type: 'number', default: 900000, required: false },
        rateLimitMax: { type: 'number', default: 100, required: false },
      },
    };
  }

  /**
   * 加载环境配置
   */
  loadEnvironmentConfig() {
    try {
      // 加载.env文件
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log('✅ 加载.env文件成功');
      }

      // 加载环境特定的配置文件
      const envSpecificPath = path.join(process.cwd(), `.env.${process.env.NODE_ENV}`);
      if (fs.existsSync(envSpecificPath)) {
        dotenv.config({ path: envSpecificPath });
        console.log(`✅ 加载.env.${process.env.NODE_ENV}文件成功`);
      }

      this.envLoaded = true;
    } catch (error) {
      console.error('❌ 加载环境配置失败:', error);
    }
  }

  /**
   * 加载应用配置
   */
  loadApplicationConfig() {
    // 服务器配置
    this.config.server = {
      port: this.getEnvValue('PORT', 'number', 3001),
      host: this.getEnvValue('HOST', 'string', '0.0.0.0'),
      nodeEnv: this.getEnvValue('NODE_ENV', 'string', 'development'),
    };

    // 数据库配置
    this.config.database = {
      host: this.getEnvValue('DB_HOST', 'string', 'localhost'),
      port: this.getEnvValue('DB_PORT', 'number', 5432),
      name: this.getEnvValue('DB_NAME', 'string', 'testweb'),
      user: this.getEnvValue('DB_USER', 'string', 'postgres'),
      password: this.getEnvValue('DB_PASSWORD', 'string', ''),
      ssl: this.getEnvValue('DB_SSL', 'boolean', false),
      maxConnections: this.getEnvValue('DB_MAX_CONNECTIONS', 'number', 20),
    };

    // Redis配置
    this.config.redis = {
      host: this.getEnvValue('REDIS_HOST', 'string', 'localhost'),
      port: this.getEnvValue('REDIS_PORT', 'number', 6379),
      password: this.getEnvValue('REDIS_PASSWORD', 'string', ''),
      db: this.getEnvValue('REDIS_DB', 'number', 0),
    };

    // JWT配置
    this.config.jwt = {
      secret: this.getEnvValue('JWT_SECRET', 'string', 'your-secret-key'),
      expiresIn: this.getEnvValue('JWT_EXPIRES_IN', 'string', '24h'),
      refreshExpiresIn: this.getEnvValue('JWT_REFRESH_EXPIRES_IN', 'string', '7d'),
    };

    // 测试引擎配置
    this.config.testEngines = {
      timeout: this.getEnvValue('TEST_TIMEOUT', 'number', 300000),
      maxConcurrent: this.getEnvValue('TEST_MAX_CONCURRENT', 'number', 10),
      retryAttempts: this.getEnvValue('TEST_RETRY_ATTEMPTS', 'number', 3),
    };

    // 测试队列配置
    this.config.testQueue = {
      replayLimits: this.getEnvValue('TEST_QUEUE_REPLAY_LIMITS', 'object', {
        default: 3,
        roles: {
          admin: 5,
          superadmin: 8,
        },
        users: {},
      }),
      exportLimits: this.getEnvValue('TEST_QUEUE_EXPORT_LIMITS', 'object', {
        roles: {
          admin: {
            maxLimit: 1000,
            maxBatchSize: 1000,
          },
          user: {
            maxLimit: 500,
            maxBatchSize: 500,
          },
          superadmin: {
            maxLimit: 100000,
            maxBatchSize: 100000,
          },
        },
        users: {},
      }),
    };

    // 文件存储配置
    this.config.storage = {
      uploadsDir: this.getEnvValue('UPLOADS_DIR', 'string', './uploads'),
      exportsDir: this.getEnvValue('EXPORTS_DIR', 'string', './exports'),
      maxFileSize: this.getEnvValue('MAX_FILE_SIZE', 'number', 10485760),
    };

    // 监控配置
    this.config.monitoring = {
      enabled: this.getEnvValue('MONITORING_ENABLED', 'boolean', true),
      interval: this.getEnvValue('MONITORING_INTERVAL', 'number', 60000),
      retentionDays: this.getEnvValue('MONITORING_RETENTION_DAYS', 'number', 30),
    };

    // 安全配置
    this.config.security = {
      corsOrigins: this.getEnvValue('CORS_ORIGINS', 'array', ['http://localhost:5173']),
      rateLimitWindow: this.getEnvValue('RATE_LIMIT_WINDOW', 'number', 900000),
      rateLimitMax: this.getEnvValue('RATE_LIMIT_MAX', 'number', 100),
    };
  }

  /**
   * 获取环境变量值并转换类型
   */
  getEnvValue(key: string, type: ConfigSchemaEntry['type'], defaultValue: unknown) {
    const value = process.env[key];

    if (value === undefined || value === '') {
      return defaultValue;
    }

    try {
      switch (type) {
        case 'number': {
          const num = Number(value);
          return Number.isNaN(num) ? defaultValue : num;
        }
        case 'boolean':
          return value.toLowerCase() === 'true' || value === '1';
        case 'array':
          return value.split(',').map(item => item.trim());
        case 'object':
          return JSON.parse(value);
        case 'string':
        default:
          return value;
      }
    } catch (error) {
      console.warn(`⚠️ 环境变量 ${key} 类型转换失败，使用默认值:`, error);
      return defaultValue;
    }
  }

  /**
   * 验证配置
   */
  validateConfig() {
    this.validationErrors = [];

    for (const [section, sectionSchema] of Object.entries(this.configSchema)) {
      for (const [key, schema] of Object.entries(sectionSchema)) {
        const value = this.config[section]?.[key];

        // 检查必需字段
        if (schema.required && (value === undefined || value === '')) {
          this.validationErrors.push(`${section}.${key} 是必需的`);
          continue;
        }

        // 检查类型
        if (value !== undefined && !this.isValidType(value, schema.type)) {
          this.validationErrors.push(`${section}.${key} 类型错误，期望 ${schema.type}`);
        }
      }
    }

    if (this.validationErrors.length > 0) {
      console.error('❌ 配置验证失败:');
      this.validationErrors.forEach(error => console.error(`  - ${error}`));
    } else {
      console.log('✅ 配置验证通过');
    }
  }

  /**
   * 检查值类型是否正确
   */
  isValidType(value: unknown, expectedType: ConfigSchemaEntry['type']) {
    switch (expectedType) {
      case 'number':
        return typeof value === 'number' && !Number.isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      case 'string':
      default:
        return typeof value === 'string';
    }
  }

  /**
   * 获取配置值
   */
  get(pathKey: string, defaultValue: unknown = undefined) {
    const keys = pathKey.split('.');
    let value: unknown = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * 设置配置值
   */
  set(pathKey: string, value: unknown) {
    const keys = pathKey.split('.');
    let target: Record<string, unknown> = this.config;

    for (let i = 0; i < keys.length - 1; i += 1) {
      const key = keys[i];
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key] as Record<string, unknown>;
    }

    target[keys[keys.length - 1]] = value;
  }

  /**
   * 获取所有配置
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * 获取数据库连接字符串
   */
  getDatabaseUrl() {
    const db = this.config.database as Record<string, unknown>;
    const sslParam = db.ssl ? '?ssl=true' : '';
    return `postgresql://${db.user}:${db.password}@${db.host}:${db.port}/${db.name}${sslParam}`;
  }

  /**
   * 获取Redis连接配置
   */
  getRedisConfig() {
    const redis = this.config.redis as Record<string, unknown>;
    return {
      host: redis.host,
      port: redis.port,
      password: redis.password || undefined,
      db: redis.db,
    };
  }

  /**
   * 检查配置是否有效
   */
  isValid() {
    return this.validationErrors.length === 0;
  }

  /**
   * 获取验证错误
   */
  getValidationErrors() {
    return [...this.validationErrors];
  }

  /**
   * 生成配置报告
   */
  generateReport() {
    return {
      isValid: this.isValid(),
      validationErrors: this.getValidationErrors(),
      config: this.getAll(),
      environment: process.env.NODE_ENV,
      loadedAt: new Date().toISOString(),
    };
  }
}

// 创建单例实例
const configManager = new ConfigManager();

export { ConfigManager, configManager };

module.exports = {
  ConfigManager,
  configManager,
};
