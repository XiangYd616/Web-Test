/**
 * 环境变量管理器 - 类似Postman的Environment功能
 * 支持多环境切换、变量加密、动态变量生成等功能
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class EnvironmentManager {
  constructor(options = {}) {
    this.options = {
      storageDir: options.storageDir || './data/environments',
      encryptionKey: options.encryptionKey || this.generateEncryptionKey(),
      allowGlobalAccess: options.allowGlobalAccess !== false,
      ...options
    };

    this.environments = new Map();
    this.globalVariables = new Map();
    this.activeEnvironment = null;
    this.variableHistory = [];

    // 预定义动态变量
    this.dynamicVariables = {
      '$timestamp': () => Math.floor(Date.now() / 1000),
      '$isoTimestamp': () => new Date().toISOString(),
      '$randomInt': () => Math.floor(Math.random() * 1000),
      '$randomFloat': () => Math.random(),
      '$randomString': (length = 10) => crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length),
      '$guid': () => uuidv4(),
      '$randomEmail': () => `user${Math.floor(Math.random() * 1000)}@example.com`,
      '$randomUserAgent': () => this.getRandomUserAgent(),
      '$randomIP': () => this.generateRandomIP(),
      '$randomPort': () => Math.floor(Math.random() * 65535) + 1024,
      '$randomColor': () => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
    };

    this.ensureStorageDir();
  }

  /**
   * 创建新环境
   */
  async createEnvironment(environmentData) {
    const environment = {
      id: uuidv4(),
      name: environmentData.name || 'New Environment',
      description: environmentData.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // 变量定义
      variables: this.processVariables(environmentData.variables || []),
      
      // 环境配置
      config: {
        baseUrl: environmentData.baseUrl || '',
        timeout: environmentData.timeout || 30000,
        retries: environmentData.retries || 0,
        followRedirects: environmentData.followRedirects !== false,
        ...environmentData.config
      },
      
      // 认证配置
      auth: environmentData.auth || null,
      
      // 代理配置
      proxy: environmentData.proxy || null,
      
      // SSL配置
      ssl: environmentData.ssl || {},
      
      // 元数据
      metadata: {
        isActive: environmentData.isActive || false,
        isGlobal: environmentData.isGlobal || false,
        tags: environmentData.tags || [],
        color: environmentData.color || this.getRandomColor(),
        order: environmentData.order || 0
      }
    };

    this.environments.set(environment.id, environment);
    await this.saveEnvironment(environment);
    
    console.log(`🌍 创建环境: ${environment.name} (${environment.id})`);
    
    return environment;
  }

  /**
   * 处理变量定义（包括加密）
   */
  processVariables(variables) {
    return variables.map(variable => {
      const processed = {
        key: variable.key,
        value: variable.value,
        type: variable.type || 'text',
        description: variable.description || '',
        enabled: variable.enabled !== false,
        secret: variable.secret || false
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
  async setActiveEnvironment(environmentId) {
    // 清除之前的活跃状态
    if (this.activeEnvironment) {
      this.activeEnvironment.metadata.isActive = false;
      await this.saveEnvironment(this.activeEnvironment);
    }

    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error(`环境不存在: ${environmentId}`);
    }

    environment.metadata.isActive = true;
    this.activeEnvironment = environment;
    await this.saveEnvironment(environment);

    console.log(`🔄 切换到环境: ${environment.name}`);
    
    // 记录环境切换历史
    this.recordEnvironmentSwitch(environment);
    
    return environment;
  }

  /**
   * 获取变量值（支持作用域和动态变量）
   */
  getVariable(key, options = {}) {
    const context = options.context || 'environment';
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
    if (this.globalVariables.has(key)) {
      const variable = this.globalVariables.get(key);
      if (variable.enabled) {
        return this.getVariableValue(variable);
      }
    }

    // 5. 返回默认值或未定义
    return options.defaultValue || undefined;
  }

  /**
   * 设置变量值
   */
  async setVariable(key, value, options = {}) {
    const scope = options.scope || 'environment';
    const environmentId = options.environmentId || (this.activeEnvironment?.id);
    const isSecret = options.secret || false;

    if (scope === 'global') {
      // 设置全局变量
      const variable = {
        key,
        value,
        type: options.type || 'text',
        description: options.description || '',
        enabled: true,
        secret: isSecret,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isSecret) {
        variable.value = this.encryptValue(value);
        variable.encrypted = true;
      }

      this.globalVariables.set(key, variable);
      await this.saveGlobalVariables();
    } else {
      // 设置环境变量
      if (!environmentId) {
        throw new Error('没有指定环境或活跃环境');
      }

      const environment = this.environments.get(environmentId);
      if (!environment) {
        throw new Error(`环境不存在: ${environmentId}`);
      }

      // 查找现有变量或创建新变量
      let variable = environment.variables.find(v => v.key === key);
      if (variable) {
        variable.value = isSecret ? this.encryptValue(value) : value;
        variable.secret = isSecret;
        variable.encrypted = isSecret;
        variable.updatedAt = new Date().toISOString();
      } else {
        variable = {
          key,
          value: isSecret ? this.encryptValue(value) : value,
          type: options.type || 'text',
          description: options.description || '',
          enabled: true,
          secret: isSecret,
          encrypted: isSecret,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        environment.variables.push(variable);
      }

      environment.updatedAt = new Date().toISOString();
      await this.saveEnvironment(environment);
    }

    // 记录变量变更历史
    this.recordVariableChange(key, value, scope, environmentId);
    
    console.log(`📝 设置变量: ${key} (${scope})`);
  }

  /**
   * 批量变量替换
   */
  resolveVariables(text, options = {}) {
    if (typeof text !== 'string') {
      return text;
    }

    // 替换所有 {{variableName}} 格式的变量
    return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();
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
  resolveObjectVariables(obj, options = {}) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObjectVariables(item, options));
    }

    const resolved = {};
    for (const [key, value] of Object.entries(obj)) {
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
  isDynamicVariable(key) {
    return key.startsWith('$') && this.dynamicVariables.hasOwnProperty(key);
  }

  resolveDynamicVariable(key) {
    const generator = this.dynamicVariables[key];
    if (typeof generator === 'function') {
      return generator();
    }
    return generator;
  }

  /**
   * 导入/导出功能
   */
  async importEnvironment(environmentData) {
    console.log('📥 导入环境配置...');
    
    // 支持Postman环境格式
    if (environmentData.values) {
      return await this.importPostmanEnvironment(environmentData);
    }
    
    // 标准格式
    return await this.createEnvironment(environmentData);
  }

  async importPostmanEnvironment(postmanEnv) {
    const variables = postmanEnv.values.map(v => ({
      key: v.key,
      value: v.value,
      type: v.type || 'text',
      description: v.description || '',
      enabled: v.enabled !== false,
      secret: false
    }));

    return await this.createEnvironment({
      name: postmanEnv.name || 'Imported Environment',
      description: 'Imported from Postman',
      variables: variables
    });
  }

  async exportEnvironment(environmentId, format = 'testweb') {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error(`环境不存在: ${environmentId}`);
    }

    if (format === 'postman') {
      return this.exportToPostmanFormat(environment);
    }

    // 导出时解密敏感变量
    const exportData = JSON.parse(JSON.stringify(environment));
    exportData.variables = exportData.variables.map(v => {
      if (v.encrypted) {
        v.value = this.decryptValue(v.value);
        delete v.encrypted;
      }
      return v;
    });

    return exportData;
  }

  exportToPostmanFormat(environment) {
    return {
      id: environment.id,
      name: environment.name,
      values: environment.variables.map(v => ({
        key: v.key,
        value: v.encrypted ? this.decryptValue(v.value) : v.value,
        type: v.type,
        enabled: v.enabled,
        description: v.description
      })),
      _postman_variable_scope: "environment",
      _postman_exported_at: new Date().toISOString(),
      _postman_exported_using: "Test-Web Environment Manager"
    };
  }

  /**
   * 加密/解密功能
   */
  encryptValue(value) {
    const cipher = crypto.createCipher('aes192', this.options.encryptionKey);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptValue(encryptedValue) {
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
  getVariableValue(variable) {
    if (variable.encrypted) {
      return this.decryptValue(variable.value);
    }
    return variable.value;
  }

  getRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  /**
   * 历史记录
   */
  recordEnvironmentSwitch(environment) {
    this.variableHistory.push({
      type: 'environment_switch',
      environmentId: environment.id,
      environmentName: environment.name,
      timestamp: new Date().toISOString()
    });

    // 保持历史记录在合理范围内
    if (this.variableHistory.length > 1000) {
      this.variableHistory = this.variableHistory.slice(-500);
    }
  }

  recordVariableChange(key, value, scope, environmentId) {
    this.variableHistory.push({
      type: 'variable_change',
      key,
      value: typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value,
      scope,
      environmentId,
      timestamp: new Date().toISOString()
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

  async saveEnvironment(environment) {
    const filePath = path.join(this.options.storageDir, `${environment.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(environment, null, 2));
  }

  async saveGlobalVariables() {
    const filePath = path.join(this.options.storageDir, 'globals.json');
    const globalData = {
      variables: Array.from(this.globalVariables.entries()).map(([key, variable]) => ({
        key,
        ...variable
      })),
      updatedAt: new Date().toISOString()
    };
    await fs.writeFile(filePath, JSON.stringify(globalData, null, 2));
  }

  async loadEnvironment(environmentId) {
    const filePath = path.join(this.options.storageDir, `${environmentId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * 查询方法
   */
  getEnvironments() {
    return Array.from(this.environments.values()).map(env => ({
      id: env.id,
      name: env.name,
      description: env.description,
      variableCount: env.variables.length,
      isActive: env.metadata.isActive,
      color: env.metadata.color,
      createdAt: env.createdAt,
      updatedAt: env.updatedAt
    }));
  }

  getEnvironment(environmentId) {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      return null;
    }

    // 返回时不包含加密变量的实际值
    const result = JSON.parse(JSON.stringify(environment));
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

  getGlobalVariables() {
    return Array.from(this.globalVariables.values()).map(v => {
      const result = { ...v };
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
  async deleteEnvironment(environmentId) {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error(`环境不存在: ${environmentId}`);
    }

    // 如果是活跃环境，清除活跃状态
    if (this.activeEnvironment?.id === environmentId) {
      this.activeEnvironment = null;
    }

    this.environments.delete(environmentId);

    // 删除文件
    const filePath = path.join(this.options.storageDir, `${environmentId}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('删除环境文件失败:', error.message);
    }

    console.log(`🗑️ 删除环境: ${environment.name}`);
    return true;
  }
}

module.exports = EnvironmentManager;
