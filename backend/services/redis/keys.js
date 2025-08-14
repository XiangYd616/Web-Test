/**
 * Redis缓存键命名规范模块
 * 提供统一的键命名规范和管理
 */

class CacheKeys {
  constructor() {
    this.prefix = process.env.NODE_ENV === 'production' ? 'testweb:prod' : 'testweb:dev';
    this.separator = ':';
  }

  /**
   * 构建完整的缓存键
   */
  buildKey(key, namespace = 'default') {
    if (!key) {
      throw new Error('缓存键不能为空');
    }

    // 清理键名，移除特殊字符
    const cleanKey = this.sanitizeKey(key);
    const cleanNamespace = this.sanitizeKey(namespace);

    return `${this.prefix}${this.separator}${cleanNamespace}${this.separator}${cleanKey}`;
  }

  /**
   * 清理键名，移除特殊字符
   */
  sanitizeKey(key) {
    return key.toString()
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * 用户会话相关键
   */
  session = {
    user: (userId) => this.buildKey(`user_${userId}`, 'session'),
    token: (token) => this.buildKey(`token_${token}`, 'session'),
    refresh: (userId) => this.buildKey(`refresh_${userId}`, 'session'),
    loginAttempts: (ip) => this.buildKey(`attempts_${ip}`, 'session')
  };

  /**
   * API测试结果相关键
   */
  api = {
    performance: (url, config) => {
      const configHash = this.hashConfig(config);
      return this.buildKey(`perf_${this.hashUrl(url)}_${configHash}`, 'api');
    },
    security: (url, config) => {
      const configHash = this.hashConfig(config);
      return this.buildKey(`sec_${this.hashUrl(url)}_${configHash}`, 'api');
    },
    seo: (url, config) => {
      const configHash = this.hashConfig(config);
      return this.buildKey(`seo_${this.hashUrl(url)}_${configHash}`, 'api');
    },
    stress: (url, config) => {
      const configHash = this.hashConfig(config);
      return this.buildKey(`stress_${this.hashUrl(url)}_${configHash}`, 'api');
    },
    compatibility: (url, config) => {
      const configHash = this.hashConfig(config);
      return this.buildKey(`compat_${this.hashUrl(url)}_${configHash}`, 'api');
    },
    network: (url, config) => {
      const configHash = this.hashConfig(config);
      return this.buildKey(`network_${this.hashUrl(url)}_${configHash}`, 'api');
    }
  };

  /**
   * 数据库查询相关键
   */
  db = {
    user: (userId) => this.buildKey(`user_${userId}`, 'db'),
    userList: (page, limit, filters) => {
      const filterHash = this.hashConfig(filters);
      return this.buildKey(`users_${page}_${limit}_${filterHash}`, 'db');
    },
    testHistory: (userId, type, page) => {
      return this.buildKey(`history_${userId}_${type}_${page}`, 'db');
    },
    testResults: (testId) => this.buildKey(`result_${testId}`, 'db'),
    analytics: (userId, period) => {
      return this.buildKey(`analytics_${userId}_${period}`, 'db');
    },
    reports: (type, period, filters) => {
      const filterHash = this.hashConfig(filters);
      return this.buildKey(`report_${type}_${period}_${filterHash}`, 'db');
    }
  };

  /**
   * 系统配置相关键
   */
  config = {
    settings: () => this.buildKey('settings', 'config'),
    features: () => this.buildKey('features', 'config'),
    limits: () => this.buildKey('limits', 'config'),
    maintenance: () => this.buildKey('maintenance', 'config')
  };

  /**
   * 监控和统计相关键
   */
  monitoring = {
    stats: (period) => this.buildKey(`stats_${period}`, 'monitoring'),
    health: () => this.buildKey('health', 'monitoring'),
    performance: (service) => this.buildKey(`perf_${service}`, 'monitoring'),
    errors: (service, period) => this.buildKey(`errors_${service}_${period}`, 'monitoring')
  };

  /**
   * 临时数据相关键
   */
  temp = {
    upload: (uploadId) => this.buildKey(`upload_${uploadId}`, 'temp'),
    export: (exportId) => this.buildKey(`export_${exportId}`, 'temp'),
    task: (taskId) => this.buildKey(`task_${taskId}`, 'temp'),
    verification: (code) => this.buildKey(`verify_${code}`, 'temp')
  };

  /**
   * 缓存预热相关键
   */
  warmup = {
    popular: () => this.buildKey('popular_urls', 'warmup'),
    recent: () => this.buildKey('recent_tests', 'warmup'),
    trending: () => this.buildKey('trending_features', 'warmup')
  };

  /**
   * 限流相关键
   */
  rateLimit = {
    api: (ip, endpoint) => this.buildKey(`api_${ip}_${endpoint}`, 'ratelimit'),
    user: (userId, action) => this.buildKey(`user_${userId}_${action}`, 'ratelimit'),
    global: (action) => this.buildKey(`global_${action}`, 'ratelimit')
  };

  /**
   * 生成URL哈希
   */
  hashUrl(url) {
    if (!url) return 'empty';

    // 简单的URL哈希，移除协议和www
    const cleanUrl = url.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');

    return this.createHash(cleanUrl);
  }

  /**
   * 生成配置哈希
   */
  hashConfig(config) {
    if (!config || typeof config !== 'object') {
      return 'default';
    }

    // 创建配置的稳定哈希
    const sortedConfig = this.sortObject(config);
    const configString = JSON.stringify(sortedConfig);
    return this.createHash(configString);
  }

  /**
   * 创建简单哈希
   */
  createHash(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * 递归排序对象
   */
  sortObject(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }

    const sortedKeys = Object.keys(obj).sort();
    const sortedObj = {};

    sortedKeys.forEach(key => {
      sortedObj[key] = this.sortObject(obj[key]);
    });

    return sortedObj;
  }

  /**
   * 解析缓存键
   */
  parseKey(fullKey) {
    const parts = fullKey.split(this.separator);

    if (parts.length < 4 || !fullKey.startsWith(this.prefix)) {
      return null;
    }

    // prefix包含环境信息，如 'testweb:dev' 或 'testweb:prod'
    const prefixParts = this.prefix.split(this.separator);

    return {
      prefix: prefixParts.join(this.separator), // 'testweb:dev'
      environment: prefixParts[1], // 'dev' 或 'prod'
      namespace: parts[prefixParts.length], // 'api', 'session', etc.
      key: parts.slice(prefixParts.length + 1).join(this.separator),
      fullKey
    };
  }

  /**
   * 获取命名空间模式
   */
  getNamespacePattern(namespace) {
    return `${this.prefix}${this.separator}${namespace}${this.separator}*`;
  }

  /**
   * 获取所有命名空间
   */
  getNamespaces() {
    return [
      'session',
      'api',
      'db',
      'config',
      'monitoring',
      'temp',
      'warmup',
      'ratelimit'
    ];
  }

  /**
   * 验证键名格式
   */
  validateKey(key) {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // 检查键名长度
    if (key.length > 250) {
      return false;
    }

    // 检查是否包含非法字符
    const illegalChars = /[\s\n\r\t]/;
    if (illegalChars.test(key)) {
      return false;
    }

    return true;
  }

  /**
   * 生成过期键（用于清理）
   */
  getExpiredPattern(namespace, olderThan) {
    const timestamp = Date.now() - olderThan;
    return `${this.prefix}${this.separator}${namespace}${this.separator}*_${timestamp}`;
  }
}

// 创建单例实例
const cacheKeys = new CacheKeys();

module.exports = cacheKeys;
