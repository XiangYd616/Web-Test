/**
 * 环境变量管理器 - 类似Postman的Environment功能
 * 支持多环境切换、变量加密、动态变量生成等功能
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const { models } = require('../../database/sequelize');

type EnvironmentConfig = {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  followRedirects?: boolean;
  auth?: unknown;
  proxy?: unknown;
  ssl?: Record<string, unknown>;
  [key: string]: unknown;
};

type EnvironmentMetadata = {
  isActive?: boolean;
  isGlobal?: boolean;
  tags?: string[];
  color?: string;
  order?: number;
  [key: string]: unknown;
};

type EnvironmentVariable = {
  key: string;
  value: string;
  type?: string;
  description?: string;
  enabled?: boolean;
  secret?: boolean;
  encrypted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type EnvironmentCache = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  variables: EnvironmentVariable[];
  config: EnvironmentConfig;
  auth: unknown;
  proxy: unknown;
  ssl: Record<string, unknown>;
  metadata: EnvironmentMetadata;
};

type VariableHistoryItem = {
  type: string;
  timestamp: string;
  [key: string]: unknown;
};

type EnvironmentRecord = {
  id: string;
  name: string;
  description?: string;
  workspace_id?: string | null;
  config?: EnvironmentConfig;
  metadata?: EnvironmentMetadata;
  createdAt?: Date;
  updatedAt?: Date;
  created_at?: string;
  updated_at?: string;
  save?: () => Promise<void>;
} & Record<string, unknown>;

type VariableRecord = {
  key: string;
  value: string;
  type?: string;
  enabled?: boolean;
  secret?: boolean;
  encrypted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  created_at?: string;
  updated_at?: string;
  save?: () => Promise<void>;
} & Record<string, unknown>;

type Model<T> = {
  create: (data: Record<string, unknown>) => Promise<T>;
  findByPk: (id: string) => Promise<T | null>;
  findAll: (options?: Record<string, unknown>) => Promise<T[]>;
  update: (values: Record<string, unknown>, options: Record<string, unknown>) => Promise<unknown>;
  destroy: (options: Record<string, unknown>) => Promise<unknown>;
  count?: (options?: Record<string, unknown>) => Promise<number>;
  findOne?: (options: Record<string, unknown>) => Promise<T | null>;
  bulkCreate?: (data: Record<string, unknown>[]) => Promise<unknown>;
};

type EnvironmentModels = {
  Environment: Model<EnvironmentRecord>;
  EnvironmentVariable: Model<VariableRecord>;
  GlobalVariable: Model<VariableRecord>;
};

type EnvironmentManagerOptions = {
  storageDir?: string;
  encryptionKey?: string;
  allowGlobalAccess?: boolean;
  models?: EnvironmentModels;
};

type ResolvedEnvironmentManagerOptions = {
  storageDir: string;
  encryptionKey: string;
  allowGlobalAccess: boolean;
  models?: EnvironmentModels;
};

type VariableInput = {
  key: string;
  value: string;
  type?: string;
  description?: string;
  enabled?: boolean;
  secret?: boolean;
  encrypted?: boolean;
};

type CreateEnvironmentInput = {
  workspaceId?: string;
  name?: string;
  description?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  followRedirects?: boolean;
  auth?: unknown;
  proxy?: unknown;
  ssl?: Record<string, unknown>;
  config?: EnvironmentConfig;
  variables?: VariableInput[];
  isActive?: boolean;
  isGlobal?: boolean;
  tags?: string[];
  color?: string;
  order?: number;
  metadata?: EnvironmentMetadata;
  createdBy?: string | null;
};

type SetVariableOptions = {
  scope?: 'environment' | 'global';
  environmentId?: string;
  secret?: boolean;
  type?: string;
  description?: string;
  userId?: string;
  workspaceId?: string | null;
};

type GetVariableOptions = {
  context?: string;
  environmentId?: string;
  defaultValue?: unknown;
};

class EnvironmentManager {
  private options: ResolvedEnvironmentManagerOptions;
  private models: EnvironmentModels;
  private environments = new Map<string, EnvironmentCache>();
  private globalVariables = new Map<string, EnvironmentVariable>();
  private activeEnvironment: EnvironmentCache | null = null;
  private variableHistory: VariableHistoryItem[] = [];
  private dynamicVariables: Record<string, ((length?: number) => unknown) | unknown>;

  constructor(options: EnvironmentManagerOptions = {}) {
    this.options = {
      storageDir: options.storageDir || './data/environments',
      encryptionKey: options.encryptionKey || this.generateEncryptionKey(),
      allowGlobalAccess: options.allowGlobalAccess !== false,
      ...options,
    };

    this.models = options.models || (models as EnvironmentModels);

    // 预定义动态变量
    this.dynamicVariables = {
      $timestamp: () => Math.floor(Date.now() / 1000),
      $isoTimestamp: () => new Date().toISOString(),
      $randomInt: () => Math.floor(Math.random() * 1000),
      $randomFloat: () => Math.random(),
      $randomString: (length = 10) =>
        crypto
          .randomBytes(Math.ceil(length / 2))
          .toString('hex')
          .slice(0, length),
      $guid: () => uuidv4(),
      $randomEmail: () => `user${Math.floor(Math.random() * 1000)}@example.com`,
      $randomUserAgent: () => this.getRandomUserAgent(),
      $randomIP: () => this.generateRandomIP(),
      $randomPort: () => Math.floor(Math.random() * 65535) + 1024,
      $randomColor: () =>
        `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, '0')}`,
    };

    void this.ensureStorageDir();
  }

  /**
   * 创建新环境
   */
  async createEnvironment(environmentData: CreateEnvironmentInput) {
    const { Environment, EnvironmentVariable } = this.models;
    if (!environmentData.workspaceId) {
      throw new Error('workspaceId 不能为空');
    }

    const variables = this.processVariables(environmentData.variables || []);
    const config: EnvironmentConfig = {
      baseUrl: environmentData.baseUrl || '',
      timeout: environmentData.timeout || 30000,
      retries: environmentData.retries || 0,
      followRedirects: environmentData.followRedirects !== false,
      auth: environmentData.auth || null,
      proxy: environmentData.proxy || null,
      ssl: environmentData.ssl || {},
      ...environmentData.config,
    };

    const metadata: EnvironmentMetadata = {
      isActive: environmentData.isActive || false,
      isGlobal: environmentData.isGlobal || false,
      tags: environmentData.tags || [],
      color: environmentData.color || this.getRandomColor(),
      order: environmentData.order || 0,
      ...(environmentData.metadata || {}),
    };

    const environmentRecord = await Environment.create({
      workspace_id: environmentData.workspaceId,
      name: environmentData.name || 'New Environment',
      description: environmentData.description || '',
      config,
      metadata,
      created_by: environmentData.createdBy || null,
      updated_by: environmentData.createdBy || null,
    });

    if (variables.length > 0 && EnvironmentVariable.bulkCreate) {
      await EnvironmentVariable.bulkCreate(
        variables.map(variable => ({
          environment_id: environmentRecord.id,
          key: variable.key,
          value: variable.value,
          type: variable.type || 'text',
          enabled: variable.enabled !== false,
          secret: variable.secret || false,
          encrypted: variable.encrypted || false,
        }))
      );
    }

    const environment = this.buildEnvironmentCache(environmentRecord, variables);
    this.environments.set(environment.id, environment);

    return environment;
  }

  /**
   * 处理变量定义（包括加密）
   */
  processVariables(variables: VariableInput[]) {
    return variables.map(variable => {
      const processed: EnvironmentVariable = {
        key: variable.key,
        value: variable.value,
        type: variable.type || 'text',
        description: variable.description || '',
        enabled: variable.enabled !== false,
        secret: variable.secret || false,
      };

      // 加密敏感变量
      if (processed.secret && processed.value) {
        processed.value = this.encryptValue(processed.value);
        processed.encrypted = true;
      }

      return processed;
    });
  }

  /**
   * 设置活跃环境
   */
  async setActiveEnvironment(environmentId: string) {
    const { Environment } = this.models;
    const environmentRecord = await Environment.findByPk(environmentId);
    if (!environmentRecord) {
      throw new Error(`环境不存在: ${environmentId}`);
    }

    if (environmentRecord.workspace_id) {
      await Environment.update(
        { metadata: { ...(environmentRecord.metadata || {}), isActive: false } },
        { where: { workspace_id: environmentRecord.workspace_id } }
      );
    }

    environmentRecord.metadata = {
      ...(environmentRecord.metadata || {}),
      isActive: true,
    };
    await environmentRecord.save?.();

    const cached = this.environments.get(environmentId);
    if (cached) {
      cached.metadata.isActive = true;
    }

    const environment = cached || this.buildEnvironmentCache(environmentRecord, []);
    this.activeEnvironment = environment;

    // 记录环境切换历史
    this.recordEnvironmentSwitch(environment);

    return environment;
  }

  /**
   * 获取变量值（支持作用域和动态变量）
   */
  getVariable(key: string, options: GetVariableOptions = {}) {
    const _context = options.context || 'environment';
    const environmentId = options.environmentId;

    // 1. 检查动态变量
    if (this.isDynamicVariable(key)) {
      return this.resolveDynamicVariable(key);
    }

    // 2. 检查指定环境的变量
    if (environmentId) {
      const environment = this.environments.get(environmentId);
      if (environment) {
        const variable = environment.variables.find(v => v.key === key && v.enabled);
        if (variable) {
          return this.getVariableValue(variable);
        }
      }
    }

    // 3. 检查活跃环境的变量
    if (this.activeEnvironment) {
      const variable = this.activeEnvironment.variables.find(v => v.key === key && v.enabled);
      if (variable) {
        return this.getVariableValue(variable);
      }
    }

    // 4. 检查全局变量
    void _context;
    if (this.globalVariables.has(key)) {
      const variable = this.globalVariables.get(key);
      if (variable?.enabled) {
        return this.getVariableValue(variable);
      }
    }

    // 5. 返回默认值或未定义
    return options.defaultValue || undefined;
  }

  /**
   * 设置变量值
   */
  async setVariable(key: string, value: string, options: SetVariableOptions = {}) {
    const scope = options.scope || 'environment';
    const environmentId = options.environmentId || this.activeEnvironment?.id;
    const isSecret = options.secret || false;
    const { Environment, EnvironmentVariable, GlobalVariable } = this.models;

    if (scope === 'global') {
      // 设置全局变量
      if (!options.userId) {
        throw new Error('global 变量需要 userId');
      }
      const variableValue = isSecret ? this.encryptValue(value) : value;
      const existingGlobal = await GlobalVariable.findOne?.({
        where: {
          user_id: options.userId,
          workspace_id: options.workspaceId || null,
          key,
        },
      });

      if (existingGlobal) {
        existingGlobal.value = variableValue;
        existingGlobal.secret = isSecret;
        existingGlobal.encrypted = isSecret;
        existingGlobal.type = options.type || existingGlobal.type || 'text';
        existingGlobal.enabled = true;
        await existingGlobal.save?.();
      } else {
        await GlobalVariable.create({
          user_id: options.userId,
          workspace_id: options.workspaceId || null,
          key,
          value: variableValue,
          type: options.type || 'text',
          enabled: true,
          secret: isSecret,
          encrypted: isSecret,
        });
      }

      this.globalVariables.set(key, {
        key,
        value: variableValue,
        type: options.type || 'text',
        enabled: true,
        secret: isSecret,
        encrypted: isSecret,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // 设置环境变量
      if (!environmentId) {
        throw new Error('没有指定环境或活跃环境');
      }
      const environmentRecord = await Environment.findByPk(environmentId);
      if (!environmentRecord) {
        throw new Error(`环境不存在: ${environmentId}`);
      }

      const variableValue = isSecret ? this.encryptValue(value) : value;
      const existingVar = await EnvironmentVariable.findOne?.({
        where: { environment_id: environmentId, key },
      });

      if (existingVar) {
        existingVar.value = variableValue;
        existingVar.secret = isSecret;
        existingVar.encrypted = isSecret;
        existingVar.type = options.type || existingVar.type || 'text';
        existingVar.enabled = true;
        await existingVar.save?.();
      } else {
        await EnvironmentVariable.create({
          environment_id: environmentId,
          key,
          value: variableValue,
          type: options.type || 'text',
          enabled: true,
          secret: isSecret,
          encrypted: isSecret,
        });
      }

      const environment = this.environments.get(environmentId);
      if (environment) {
        const variable = environment.variables.find(v => v.key === key);
        if (variable) {
          variable.value = variableValue;
          variable.secret = isSecret;
          variable.encrypted = isSecret;
          variable.updatedAt = new Date().toISOString();
        } else {
          environment.variables.push({
            key,
            value: variableValue,
            type: options.type || 'text',
            enabled: true,
            secret: isSecret,
            encrypted: isSecret,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        environment.updatedAt = new Date().toISOString();
      }
    }

    // 记录变量变更历史
    this.recordVariableChange(key, value, scope, environmentId);
  }

  /**
   * 批量变量替换
   */
  resolveVariables(text: string, options: GetVariableOptions = {}) {
    if (typeof text !== 'string') {
      return text;
    }

    // 替换所有 {{variableName}} 格式的变量
    return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = String(variableName).trim();
      const value = this.getVariable(trimmedName, options);

      if (value !== undefined) {
        return String(value);
      }

      // 如果找不到变量，记录警告并保持原样
      console.warn(`⚠️ 未找到变量: ${trimmedName}`);
      return match;
    });
  }

  /**
   * 批量解析对象中的变量
   */
  resolveObjectVariables(obj: unknown, options: GetVariableOptions = {}) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObjectVariables(item, options));
    }

    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveVariables(value, options);
      } else if (typeof value === 'object') {
        resolved[key] = this.resolveObjectVariables(value, options);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * 动态变量处理
   */
  isDynamicVariable(key: string) {
    return key.startsWith('$') && Object.prototype.hasOwnProperty.call(this.dynamicVariables, key);
  }

  resolveDynamicVariable(key: string) {
    const generator = this.dynamicVariables[key];
    if (typeof generator === 'function') {
      return generator();
    }
    return generator;
  }

  /**
   * 导入/导出功能
   */
  async importEnvironment(environmentData: Record<string, unknown>) {
    // 支持Postman环境格式
    if ('values' in environmentData && Array.isArray(environmentData.values)) {
      return await this.importPostmanEnvironment(
        environmentData as { values: Array<Record<string, unknown>>; name?: string }
      );
    }

    // 标准格式
    return await this.createEnvironment(environmentData as CreateEnvironmentInput);
  }

  async importPostmanEnvironment(postmanEnv: {
    values: Array<Record<string, unknown>>;
    name?: string;
  }) {
    const variables = postmanEnv.values.map(v => ({
      key: String(v.key),
      value: String(v.value),
      type: (v.type as string) || 'text',
      description: (v.description as string) || '',
      enabled: v.enabled !== false,
      secret: false,
    }));

    return await this.createEnvironment({
      name: postmanEnv.name || 'Imported Environment',
      description: 'Imported from Postman',
      variables,
    });
  }

  async exportEnvironment(environmentId: string, format = 'testweb') {
    const environment = await this.getEnvironment(environmentId, { raw: true });
    if (!environment) {
      throw new Error(`环境不存在: ${environmentId}`);
    }

    if (format === 'postman') {
      return this.exportToPostmanFormat(environment);
    }

    // 导出时解密敏感变量
    const exportData = JSON.parse(JSON.stringify(environment)) as EnvironmentCache;
    exportData.variables = exportData.variables.map(v => {
      if (v.encrypted) {
        v.value = this.decryptValue(v.value);
        delete v.encrypted;
      }
      return v;
    });

    return exportData;
  }

  exportToPostmanFormat(environment: EnvironmentCache) {
    return {
      id: environment.id,
      name: environment.name,
      values: environment.variables.map(v => ({
        key: v.key,
        value: v.encrypted ? this.decryptValue(v.value) : v.value,
        type: v.type,
        enabled: v.enabled,
        description: v.description,
      })),
      _postman_variable_scope: 'environment',
      _postman_exported_at: new Date().toISOString(),
      _postman_exported_using: 'Test-Web Environment Manager',
    };
  }

  /**
   * 加密/解密功能
   */
  encryptValue(value: string) {
    const cipher = crypto.createCipher('aes192', this.options.encryptionKey);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptValue(encryptedValue: string) {
    try {
      const decipher = crypto.createDecipher('aes192', this.options.encryptionKey);
      let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('解密失败:', error);
      return '[ENCRYPTED]';
    }
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 工具方法
   */
  getVariableValue(variable: EnvironmentVariable) {
    if (variable.encrypted) {
      return this.decryptValue(variable.value);
    }
    return variable.value;
  }

  getRandomColor() {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E9',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(
      Math.random() * 255
    )}.${Math.floor(Math.random() * 255)}`;
  }

  /**
   * 历史记录
   */
  recordEnvironmentSwitch(environment: EnvironmentCache) {
    this.variableHistory.push({
      type: 'environment_switch',
      environmentId: environment.id,
      environmentName: environment.name,
      timestamp: new Date().toISOString(),
    });

    // 保持历史记录在合理范围内
    if (this.variableHistory.length > 1000) {
      this.variableHistory = this.variableHistory.slice(-500);
    }
  }

  recordVariableChange(key: string, value: string, scope: string, environmentId?: string) {
    this.variableHistory.push({
      type: 'variable_change',
      key,
      value:
        typeof value === 'string' && value.length > 100 ? `${value.substring(0, 100)}...` : value,
      scope,
      environmentId,
      timestamp: new Date().toISOString(),
    });

    if (this.variableHistory.length > 1000) {
      this.variableHistory = this.variableHistory.slice(-500);
    }
  }

  /**
   * 存储方法
   */
  async ensureStorageDir() {
    try {
      await fs.mkdir(this.options.storageDir, { recursive: true });
    } catch (error) {
      console.error('创建存储目录失败:', error);
    }
  }

  async saveEnvironment(environment: EnvironmentCache) {
    const filePath = path.join(this.options.storageDir, `${environment.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(environment, null, 2));
  }

  async saveGlobalVariables() {
    const filePath = path.join(this.options.storageDir, 'globals.json');
    const globalData = {
      variables: Array.from(this.globalVariables.entries()).map(([key, variable]) => ({
        key,
        ...variable,
      })),
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(filePath, JSON.stringify(globalData, null, 2));
  }

  async loadEnvironment(environmentId: string) {
    const filePath = path.join(this.options.storageDir, `${environmentId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data) as EnvironmentCache;
    } catch {
      return null;
    }
  }

  /**
   * 查询方法
   */
  getEnvironments() {
    return this.getEnvironmentsFromDb();
  }

  async getEnvironmentsFromDb() {
    const { Environment, EnvironmentVariable } = this.models;
    const environments = await Environment.findAll();

    const results: Array<Record<string, unknown>> = [];
    for (const environmentRecord of environments) {
      const variableCount = await EnvironmentVariable.count?.({
        where: { environment_id: environmentRecord.id },
      });
      results.push({
        id: environmentRecord.id,
        name: environmentRecord.name,
        description: environmentRecord.description,
        variableCount: variableCount || 0,
        isActive: environmentRecord.metadata?.isActive || false,
        color: environmentRecord.metadata?.color || null,
        createdAt: environmentRecord.createdAt?.toISOString?.() || environmentRecord.created_at,
        updatedAt: environmentRecord.updatedAt?.toISOString?.() || environmentRecord.updated_at,
      });
    }

    return results;
  }

  async getEnvironment(environmentId: string, options: { raw?: boolean } = {}) {
    const { Environment, EnvironmentVariable } = this.models;
    const environmentRecord = await Environment.findByPk(environmentId);
    if (!environmentRecord) {
      return null;
    }

    const variableRecords = await EnvironmentVariable.findAll({
      where: { environment_id: environmentId },
      order: [['created_at', 'ASC']],
    });
    const variables = variableRecords.map(record => ({
      key: record.key,
      value: record.value,
      type: record.type || 'text',
      enabled: record.enabled,
      secret: record.secret,
      encrypted: record.encrypted,
      createdAt: record.createdAt?.toISOString?.() || record.created_at,
      updatedAt: record.updatedAt?.toISOString?.() || record.updated_at,
    }));

    const environment = this.buildEnvironmentCache(environmentRecord, variables);
    this.environments.set(environment.id, environment);

    if (options.raw) {
      return environment;
    }

    const result = JSON.parse(JSON.stringify(environment)) as EnvironmentCache;
    result.variables = result.variables.map(v => {
      if (v.encrypted) {
        v.value = '[ENCRYPTED]';
      }
      return v;
    });

    return result;
  }

  getActiveEnvironment() {
    return this.activeEnvironment;
  }

  async getGlobalVariables(options: { userId?: string; workspaceId?: string | null } = {}) {
    const { GlobalVariable } = this.models;
    if (!options.userId) {
      throw new Error('获取全局变量需要 userId');
    }

    const globals = await GlobalVariable.findAll({
      where: {
        user_id: options.userId,
        workspace_id: options.workspaceId || null,
      },
    });

    return globals.map(record => {
      const result: EnvironmentVariable = {
        key: record.key,
        value: record.value,
        type: record.type || 'text',
        enabled: record.enabled,
        secret: record.secret,
        encrypted: record.encrypted,
        createdAt: record.createdAt?.toISOString?.() || record.created_at,
        updatedAt: record.updatedAt?.toISOString?.() || record.updated_at,
      };
      if (result.encrypted) {
        result.value = '[ENCRYPTED]';
      }
      return result;
    });
  }

  getVariableHistory(limit = 50) {
    return this.variableHistory.slice(-limit);
  }

  /**
   * 删除方法
   */
  async deleteEnvironment(environmentId: string) {
    const { Environment } = this.models;
    const environment = await Environment.findByPk(environmentId);
    if (!environment) {
      throw new Error(`环境不存在: ${environmentId}`);
    }

    if (this.activeEnvironment?.id === environmentId) {
      this.activeEnvironment = null;
    }

    await Environment.destroy({ where: { id: environmentId } });
    this.environments.delete(environmentId);

    return true;
  }

  buildEnvironmentCache(environmentRecord: EnvironmentRecord, variables: EnvironmentVariable[]) {
    return {
      id: environmentRecord.id,
      name: environmentRecord.name,
      description: environmentRecord.description || '',
      createdAt: environmentRecord.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: environmentRecord.updatedAt?.toISOString?.() || new Date().toISOString(),
      variables,
      config: environmentRecord.config || {},
      auth: environmentRecord.config?.auth || null,
      proxy: environmentRecord.config?.proxy || null,
      ssl: environmentRecord.config?.ssl || {},
      metadata: environmentRecord.metadata || {},
    };
  }
}

export { EnvironmentManager };

module.exports = EnvironmentManager;
