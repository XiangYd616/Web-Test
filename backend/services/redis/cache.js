/**
 * Redis缓存服务层
 * 提供get、set、delete、exists等基础操作
 * 包含缓存键命名规范和过期时间管理
 */

const redisConnection = require('./connection');
const keys = require('./keys');
const winston = require('winston');

class CacheService {
  constructor() {
    this.redis = redisConnection.getClient();
    this.isEnabled = process.env.REDIS_ENABLED === 'true';
    
    // 默认TTL配置
    this.defaultTTL = parseInt(process.env.REDIS_DEFAULT_TTL) || 3600;
    this.sessionTTL = parseInt(process.env.REDIS_SESSION_TTL) || 86400;
    this.apiCacheTTL = parseInt(process.env.REDIS_API_CACHE_TTL) || 1800;
    this.dbCacheTTL = parseInt(process.env.REDIS_DB_CACHE_TTL) || 600;
    
    // 配置日志
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/cache.log' }),
        new winston.transports.Console()
      ]
    });

    // 统计信息
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * 检查缓存是否可用
   */
  isAvailable() {
    return this.isEnabled && redisConnection.isRedisConnected();
  }

  /**
   * 获取缓存值
   */
  async get(key, options = {}) {
    try {
      if (!this.isAvailable()) {
        this.logger.debug('缓存不可用，跳过获取操作');
        return null;
      }

      const fullKey = keys.buildKey(key, options.namespace);
      const value = await this.redis.get(fullKey);
      
      if (value !== null) {
        this.stats.hits++;
        this.logger.debug(`缓存命中: ${fullKey}`);
        
        // 尝试解析JSON
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      } else {
        this.stats.misses++;
        this.logger.debug(`缓存未命中: ${fullKey}`);
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      this.logger.error('缓存获取失败:', error);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set(key, value, options = {}) {
    try {
      if (!this.isAvailable()) {
        this.logger.debug('缓存不可用，跳过设置操作');
        return false;
      }

      const fullKey = keys.buildKey(key, options.namespace);
      const ttl = options.ttl || this.getTTLByType(options.type) || this.defaultTTL;
      
      // 序列化值
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      // 设置缓存
      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }
      
      this.stats.sets++;
      this.logger.debug(`缓存设置成功: ${fullKey}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('缓存设置失败:', error);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key, options = {}) {
    try {
      if (!this.isAvailable()) {
        this.logger.debug('缓存不可用，跳过删除操作');
        return false;
      }

      const fullKey = keys.buildKey(key, options.namespace);
      const result = await this.redis.del(fullKey);
      
      this.stats.deletes++;
      this.logger.debug(`缓存删除: ${fullKey}, 结果: ${result}`);
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('缓存删除失败:', error);
      return false;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key, options = {}) {
    try {
      if (!this.isAvailable()) {
        return false;
      }

      const fullKey = keys.buildKey(key, options.namespace);
      const result = await this.redis.exists(fullKey);
      
      this.logger.debug(`缓存存在检查: ${fullKey}, 结果: ${result}`);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('缓存存在检查失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存TTL
   */
  async getTTL(key, options = {}) {
    try {
      if (!this.isAvailable()) {
        return -1;
      }

      const fullKey = keys.buildKey(key, options.namespace);
      const ttl = await this.redis.ttl(fullKey);
      
      this.logger.debug(`缓存TTL查询: ${fullKey}, TTL: ${ttl}s`);
      return ttl;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('缓存TTL查询失败:', error);
      return -1;
    }
  }

  /**
   * 设置缓存过期时间
   */
  async expire(key, ttl, options = {}) {
    try {
      if (!this.isAvailable()) {
        return false;
      }

      const fullKey = keys.buildKey(key, options.namespace);
      const result = await this.redis.expire(fullKey, ttl);
      
      this.logger.debug(`设置缓存过期时间: ${fullKey}, TTL: ${ttl}s, 结果: ${result}`);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('设置缓存过期时间失败:', error);
      return false;
    }
  }

  /**
   * 批量获取缓存
   */
  async mget(keys, options = {}) {
    try {
      if (!this.isAvailable() || !keys.length) {
        return [];
      }

      const fullKeys = keys.map(key => keys.buildKey(key, options.namespace));
      const values = await this.redis.mget(...fullKeys);
      
      return values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        
        this.stats.hits++;
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      });
    } catch (error) {
      this.stats.errors++;
      this.logger.error('批量获取缓存失败:', error);
      return [];
    }
  }

  /**
   * 批量设置缓存
   */
  async mset(keyValuePairs, options = {}) {
    try {
      if (!this.isAvailable() || !keyValuePairs.length) {
        return false;
      }

      const pipeline = this.redis.pipeline();
      const ttl = options.ttl || this.getTTLByType(options.type) || this.defaultTTL;
      
      keyValuePairs.forEach(([key, value]) => {
        const fullKey = keys.buildKey(key, options.namespace);
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        
        if (ttl > 0) {
          pipeline.setex(fullKey, ttl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      });
      
      await pipeline.exec();
      this.stats.sets += keyValuePairs.length;
      this.logger.debug(`批量设置缓存成功: ${keyValuePairs.length} 项`);
      return true;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('批量设置缓存失败:', error);
      return false;
    }
  }

  /**
   * 清除指定模式的缓存
   */
  async deletePattern(pattern, options = {}) {
    try {
      if (!this.isAvailable()) {
        return 0;
      }

      const fullPattern = keys.buildKey(pattern, options.namespace);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await this.redis.del(...keys);
      this.stats.deletes += result;
      this.logger.debug(`模式删除缓存: ${fullPattern}, 删除数量: ${result}`);
      return result;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('模式删除缓存失败:', error);
      return 0;
    }
  }

  /**
   * 根据类型获取TTL
   */
  getTTLByType(type) {
    switch (type) {
      case 'session':
        return this.sessionTTL;
      case 'api':
        return this.apiCacheTTL;
      case 'db':
        return this.dbCacheTTL;
      default:
        return this.defaultTTL;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      total,
      isEnabled: this.isEnabled,
      isConnected: redisConnection.isRedisConnected()
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    this.logger.info('缓存统计信息已重置');
  }

  /**
   * 清空所有缓存
   */
  async flush() {
    try {
      if (!this.isAvailable()) {
        return false;
      }

      await this.redis.flushdb();
      this.logger.warn('所有缓存已清空');
      return true;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('清空缓存失败:', error);
      return false;
    }
  }
}

// 创建单例实例
const cacheService = new CacheService();

module.exports = cacheService;
