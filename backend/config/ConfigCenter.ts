/**
 * 统一配置中心
 * 提供企业级配置管理、热更新、验证、历史记录等功能
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

type ConfigValueType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface ConfigSchemaEntry {
  type: ConfigValueType;
  default?: unknown;
  min?: number;
  max?: number;
  required?: boolean;
  description?: string;
  hotReload?: boolean;
  sensitive?: boolean;
  enum?: string[];
}

type ConfigSchema = Record<string, ConfigSchemaEntry>;

type ConfigChangeSource =
  | 'unknown'
  | 'environment'
  | 'default'
  | 'file'
  | 'manual'
  | 'api'
  | 'api_batch'
  | 'rollback'
  | 'reset';

interface ConfigChange {
  timestamp: string;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  source: ConfigChangeSource | string;
  id: string;
}

interface RollbackInfo {
  key: string;
  value: unknown;
  rollbackFrom: unknown;
}

interface ConfigStatus {
  initialized: boolean;
  totalConfigs: number;
  schemaConfigs: number;
  historyCount: number;
  watchersCount: number;
  configFile: string;
  fileExists: boolean;
}

/**
 * 配置验证器
 */
export class ConfigValidator {
  static validateType(value: unknown, type: ConfigValueType, name: string): void {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`配置项 ${name} 必须是字符串类型`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value)) {
          throw new Error(`配置项 ${name} 必须是数字类型`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`配置项 ${name} 必须是布尔类型`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`配置项 ${name} 必须是数组类型`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new Error(`配置项 ${name} 必须是对象类型`);
        }
        break;
      default:
        throw new Error(`未知的配置类型: ${type}`);
    }
  }

  static validateRange(
    value: unknown,
    min: number | undefined,
    max: number | undefined,
    name: string
  ): void {
    if (typeof value === 'number') {
      if (min !== undefined && value < min) {
        throw new Error(`配置项 ${name} 的值 ${value} 小于最小值 ${min}`);
      }
      if (max !== undefined && value > max) {
        throw new Error(`配置项 ${name} 的值 ${value} 大于最大值 ${max}`);
      }
    }
  }

  static validateEnum(value: unknown, allowedValues: string[] | undefined, name: string): void {
    if (allowedValues && !allowedValues.includes(String(value))) {
      throw new Error(
        `配置项 ${name} 的值 ${value} 不在允许的值列表中: ${allowedValues.join(', ')}`
      );
    }
  }
}

/**
 * 配置历史管理器
 */
export class ConfigHistory {
  history: ConfigChange[] = [];

  maxHistory: number;

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory;
  }

  addChange(
    key: string,
    oldValue: unknown,
    newValue: unknown,
    source: ConfigChangeSource | string = 'unknown'
  ): string {
    const change: ConfigChange = {
      timestamp: new Date().toISOString(),
      key,
      oldValue,
      newValue,
      source,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    this.history.unshift(change);

    // 保持历史记录数量限制
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }

    return change.id;
  }

  getHistory(key: string | null = null, limit = 50): ConfigChange[] {
    let filtered = this.history;

    if (key) {
      filtered = this.history.filter(change => change.key === key);
    }

    return filtered.slice(0, limit);
  }

  rollback(changeId: string): RollbackInfo {
    const change = this.history.find(c => c.id === changeId);
    if (!change) {
      throw new Error(`未找到变更记录: ${changeId}`);
    }

    return {
      key: change.key,
      value: change.oldValue,
      rollbackFrom: change.newValue,
    };
  }
}

/**
 * 统一配置中心
 */
export class ConfigCenter extends EventEmitter {
  config: Record<string, unknown> = {};

  schema: ConfigSchema = {};

  history: ConfigHistory;

  watchers: Map<string, Array<(value: unknown, oldValue: unknown) => void>>;

  isInitialized: boolean;

  configFile: string;

  constructor() {
    super();
    this.history = new ConfigHistory();
    this.watchers = new Map();
    this.isInitialized = false;
    this.configFile = path.join(__dirname, 'runtime-config.json');

    // 配置模式定义
    this.defineSchema();

    // 初始化配置
    void this.initialize();
  }

  /**
   * 定义配置模式
   */
  defineSchema(): void {
    this.schema = {
      // 服务器配置
      'server.port': {
        type: 'number',
        default: 3001,
        min: 1000,
        max: 65535,
        required: true,
        description: '服务器端口号',
        hotReload: false, // 端口变更需要重启
      },
      'server.host': {
        type: 'string',
        default: '0.0.0.0',
        required: false,
        description: '服务器主机地址',
        hotReload: false,
      },
      'server.nodeEnv': {
        type: 'string',
        default: 'development',
        enum: ['development', 'production', 'test'],
        required: true,
        description: '运行环境',
        hotReload: false,
      },

      // 数据库配置
      'database.host': {
        type: 'string',
        default: 'localhost',
        required: true,
        description: '数据库主机地址',
        hotReload: false,
      },
      'database.port': {
        type: 'number',
        default: 5432,
        min: 1,
        max: 65535,
        required: true,
        description: '数据库端口',
        hotReload: false,
      },
      'database.name': {
        type: 'string',
        default: 'testweb',
        required: true,
        description: '数据库名称',
        hotReload: false,
      },
      'database.user': {
        type: 'string',
        default: 'postgres',
        required: true,
        description: '数据库用户名',
        hotReload: false,
      },
      'database.password': {
        type: 'string',
        default: '',
        required: true,
        description: '数据库密码',
        sensitive: true,
        hotReload: false,
      },
      'database.maxConnections': {
        type: 'number',
        default: 20,
        min: 1,
        max: 100,
        required: false,
        description: '最大连接数',
        hotReload: true,
      },

      // 认证配置
      'auth.jwtSecret': {
        type: 'string',
        default: 'your-secret-key',
        required: true,
        description: 'JWT密钥',
        sensitive: true,
        hotReload: true,
      },
      'auth.jwtExpiration': {
        type: 'string',
        default: '24h',
        required: false,
        description: 'JWT过期时间',
        hotReload: true,
      },
      'auth.sessionTimeout': {
        type: 'number',
        default: 3600000,
        min: 60000,
        max: 86400000,
        required: false,
        description: '会话超时时间（毫秒）',
        hotReload: true,
      },

      // 测试引擎配置
      'testEngine.maxConcurrentTests': {
        type: 'number',
        default: 5,
        min: 1,
        max: 20,
        required: false,
        description: '最大并发测试数',
        hotReload: true,
      },
      'testEngine.defaultTimeout': {
        type: 'number',
        default: 300000,
        min: 10000,
        max: 1800000,
        required: false,
        description: '默认测试超时时间（毫秒）',
        hotReload: true,
      },
      'testEngine.enableHistory': {
        type: 'boolean',
        default: true,
        required: false,
        description: '是否启用测试历史',
        hotReload: true,
      },

      // 文件存储配置
      'storage.uploadsDir': {
        type: 'string',
        default: './uploads',
        required: false,
        description: '上传文件目录',
        hotReload: true,
      },
      'storage.exportsDir': {
        type: 'string',
        default: './exports',
        required: false,
        description: '导出文件目录',
        hotReload: true,
      },
      'storage.maxFileSize': {
        type: 'number',
        default: 10485760, // 10MB
        min: 1024,
        max: 104857600, // 100MB
        required: false,
        description: '最大文件大小（字节）',
        hotReload: true,
      },

      // 监控配置
      'monitoring.enabled': {
        type: 'boolean',
        default: true,
        required: false,
        description: '是否启用监控',
        hotReload: true,
      },
      'monitoring.interval': {
        type: 'number',
        default: 60000,
        min: 5000,
        max: 300000,
        required: false,
        description: '监控间隔（毫秒）',
        hotReload: true,
      },
      'monitoring.retentionDays': {
        type: 'number',
        default: 30,
        min: 1,
        max: 365,
        required: false,
        description: '监控数据保留天数',
        hotReload: true,
      },

      // 安全配置
      'security.corsOrigins': {
        type: 'array',
        default: ['http://localhost:5173'],
        required: false,
        description: 'CORS允许的源',
        hotReload: true,
      },
      'security.rateLimitWindow': {
        type: 'number',
        default: 900000, // 15分钟
        min: 60000,
        max: 3600000,
        required: false,
        description: '速率限制窗口（毫秒）',
        hotReload: true,
      },
      'security.rateLimitMax': {
        type: 'number',
        default: 100,
        min: 10,
        max: 1000,
        required: false,
        description: '速率限制最大请求数',
        hotReload: true,
      },

      // 日志配置
      'logging.level': {
        type: 'string',
        default: 'info',
        enum: ['error', 'warn', 'info', 'debug'],
        required: false,
        description: '日志级别',
        hotReload: true,
      },
      'logging.enableConsole': {
        type: 'boolean',
        default: true,
        required: false,
        description: '是否启用控制台日志',
        hotReload: true,
      },
      'logging.enableFile': {
        type: 'boolean',
        default: false,
        required: false,
        description: '是否启用文件日志',
        hotReload: true,
      },
    };
  }

  /**
   * 初始化配置中心
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 加载环境变量配置
      this.loadFromEnvironment();

      // 加载运行时配置文件
      await this.loadFromFile();

      // 验证所有配置
      this.validateAllConfigs();

      // 设置文件监听（用于热更新）
      this.setupFileWatcher();

      this.isInitialized = true;
      console.log('✅ 配置中心初始化完成');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ 配置中心初始化失败:', error);
      throw error;
    }
  }

  /**
   * 从环境变量加载配置
   */
  loadFromEnvironment(): void {
    const envMapping: Record<string, string> = {
      'server.port': 'PORT',
      'server.host': 'HOST',
      'server.nodeEnv': 'NODE_ENV',
      'database.host': 'DB_HOST',
      'database.port': 'DB_PORT',
      'database.name': 'DB_NAME',
      'database.user': 'DB_USER',
      'database.password': 'DB_PASSWORD',
      'database.maxConnections': 'DB_MAX_CONNECTIONS',
      'auth.jwtSecret': 'JWT_SECRET',
      'auth.jwtExpiration': 'JWT_EXPIRATION',
      'auth.sessionTimeout': 'SESSION_TIMEOUT',
      'testEngine.maxConcurrentTests': 'MAX_CONCURRENT_TESTS',
      'testEngine.defaultTimeout': 'DEFAULT_TEST_TIMEOUT',
      'testEngine.enableHistory': 'ENABLE_TEST_HISTORY',
      'storage.uploadsDir': 'UPLOADS_DIR',
      'storage.exportsDir': 'EXPORTS_DIR',
      'storage.maxFileSize': 'MAX_FILE_SIZE',
      'monitoring.enabled': 'MONITORING_ENABLED',
      'monitoring.interval': 'MONITORING_INTERVAL',
      'monitoring.retentionDays': 'MONITORING_RETENTION_DAYS',
      'security.corsOrigins': 'CORS_ORIGINS',
      'security.rateLimitWindow': 'RATE_LIMIT_WINDOW',
      'security.rateLimitMax': 'RATE_LIMIT_MAX',
      'logging.level': 'LOG_LEVEL',
      'logging.enableConsole': 'LOG_ENABLE_CONSOLE',
      'logging.enableFile': 'LOG_ENABLE_FILE',
    };

    for (const [configKey, envKey] of Object.entries(envMapping)) {
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        this.setConfigValue(configKey, this.parseEnvValue(envValue, configKey), 'environment');
      } else {
        // 使用默认值
        const schema = this.schema[configKey];
        if (schema && schema.default !== undefined) {
          this.setConfigValue(configKey, schema.default, 'default');
        }
      }
    }
  }

  /**
   * 解析环境变量值
   */
  parseEnvValue(value: string, configKey: string): unknown {
    const schema = this.schema[configKey];
    if (!schema) return value;

    switch (schema.type) {
      case 'number': {
        const num = Number(value);
        return Number.isNaN(num) ? schema.default : num;
      }
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          return value.split(',').map(item => item.trim());
        }
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return schema.default;
        }
      default:
        return value;
    }
  }

  /**
   * 从文件加载配置
   */
  async loadFromFile(): Promise<void> {
    try {
      if (fs.existsSync(this.configFile)) {
        const fileContent = fs.readFileSync(this.configFile, 'utf8');
        const fileConfig: Record<string, unknown> = JSON.parse(fileContent);

        for (const [key, value] of Object.entries(fileConfig)) {
          this.setConfigValue(key, value, 'file');
        }
      }
    } catch (error) {
      console.warn(`⚠️ 加载配置文件失败: ${(error as Error).message}`);
    }
  }

  /**
   * 设置配置值
   */
  setConfigValue(
    key: string,
    value: unknown,
    source: ConfigChangeSource | string = 'manual'
  ): void {
    const oldValue = this.config[key];
    this.config[key] = value;

    // 记录变更历史
    if (oldValue !== value) {
      this.history.addChange(key, oldValue, value, source);

      // 触发变更事件
      this.emit('configChanged', { key, oldValue, newValue: value, source });

      // 触发特定配置的监听器
      if (this.watchers.has(key)) {
        this.watchers.get(key)?.forEach(callback => {
          try {
            callback(value, oldValue);
          } catch (error) {
            console.error(`配置监听器执行失败 [${key}]:`, error);
          }
        });
      }
    }
  }

  /**
   * 获取配置值
   */
  get(key: string, defaultValue: unknown = undefined): unknown {
    if (Object.prototype.hasOwnProperty.call(this.config, key)) {
      return this.config[key];
    }

    const schema = this.schema[key];
    if (schema && schema.default !== undefined) {
      return schema.default;
    }

    return defaultValue;
  }

  /**
   * 设置配置值（带验证）
   */
  set(key: string, value: unknown, source: ConfigChangeSource | string = 'manual'): void {
    this.validateConfig(key, value);
    this.setConfigValue(key, value, source);

    // 如果支持热更新，保存到文件
    const schema = this.schema[key];
    if (schema && schema.hotReload) {
      void this.saveToFile();
    }
  }

  /**
   * 验证配置
   */
  validateConfig(key: string, value: unknown): void {
    const schema = this.schema[key];
    if (!schema) {
      throw new Error(`未知的配置项: ${key}`);
    }

    // 类型验证
    ConfigValidator.validateType(value, schema.type, key);

    // 范围验证
    if (schema.min !== undefined || schema.max !== undefined) {
      ConfigValidator.validateRange(value, schema.min, schema.max, key);
    }

    // 枚举验证
    if (schema.enum) {
      ConfigValidator.validateEnum(value, schema.enum, key);
    }
  }

  /**
   * 验证所有配置
   */
  validateAllConfigs(): void {
    for (const [key, value] of Object.entries(this.config)) {
      try {
        this.validateConfig(key, value);
      } catch (error) {
        console.error(`配置验证失败 [${key}]:`, (error as Error).message);
        throw error;
      }
    }
  }

  /**
   * 保存配置到文件
   */
  async saveToFile(): Promise<void> {
    try {
      // 只保存支持热更新的配置
      const hotReloadConfig: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(this.config)) {
        const schema = this.schema[key];
        if (schema && schema.hotReload) {
          hotReloadConfig[key] = value;
        }
      }

      fs.writeFileSync(this.configFile, JSON.stringify(hotReloadConfig, null, 2));
    } catch (error) {
      console.error('保存配置文件失败:', error);
      throw error;
    }
  }

  /**
   * 设置文件监听
   */
  setupFileWatcher(): void {
    if (fs.existsSync(this.configFile)) {
      fs.watchFile(this.configFile, { interval: 1000 }, async () => {
        try {
          await this.loadFromFile();
          this.emit('fileReloaded');
        } catch (error) {
          console.error('重新加载配置文件失败:', error);
        }
      });
    }
  }

  /**
   * 监听配置变更
   */
  watch(key: string, callback: (value: unknown, oldValue: unknown) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, []);
    }
    this.watchers.get(key)?.push(callback);

    // 返回取消监听的函数
    return () => {
      const callbacks = this.watchers.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 获取所有配置
   */
  getAll(includeSensitive = false): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.config)) {
      const schema = this.schema[key];
      if (!includeSensitive && schema && schema.sensitive) {
        result[key] = '***';
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * 获取配置模式
   */
  getSchema(): ConfigSchema {
    return this.schema;
  }

  /**
   * 获取配置历史
   */
  getHistory(key: string | null = null, limit = 50): ConfigChange[] {
    return this.history.getHistory(key, limit);
  }

  /**
   * 回滚配置
   */
  rollback(changeId: string): RollbackInfo {
    const rollbackInfo = this.history.rollback(changeId);
    this.set(rollbackInfo.key, rollbackInfo.value, 'rollback');
    return rollbackInfo;
  }

  /**
   * 重置配置为默认值
   */
  reset(key: string | null = null): void {
    if (key) {
      const schema = this.schema[key];
      if (schema && schema.default !== undefined) {
        this.set(key, schema.default, 'reset');
      }
    } else {
      for (const [configKey, schema] of Object.entries(this.schema)) {
        if (schema.default !== undefined) {
          this.setConfigValue(configKey, schema.default, 'reset');
        }
      }
    }
  }

  /**
   * 获取配置状态
   */
  getStatus(): ConfigStatus {
    return {
      initialized: this.isInitialized,
      totalConfigs: Object.keys(this.config).length,
      schemaConfigs: Object.keys(this.schema).length,
      historyCount: this.history.history.length,
      watchersCount: this.watchers.size,
      configFile: this.configFile,
      fileExists: fs.existsSync(this.configFile),
    };
  }
}

// 创建全局配置中心实例
export const configCenter = new ConfigCenter();

// 兼容 CommonJS require
module.exports = {
  ConfigCenter,
  ConfigValidator,
  ConfigHistory,
  configCenter,
};
