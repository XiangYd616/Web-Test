/**
 * Redis缓存管理器
 * 提供统一的缓存操作接口，支持多种缓存策略
 */

const crypto = require('crypto');

class CacheManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.defaultTTL = 3600; // 1小时
    this.keyPrefix = 'testweb:';
    this.version = '1.0';
    
    // 缓存策略配置
    this.strategies = {
      // 测试结果缓存 - 24小时
      test_results: {
        ttl: 24 * 60 * 60,
        prefix: 'test:',
        serialize: true,
        compress: true
      },
      
      // 用户会话缓存 - 1小时
      user_sessions: {
        ttl: 60 * 60,
        prefix: 'user:',
        serialize: true,
        compress: false
      },
      
      // API响应缓存 - 5-30分钟
      api_responses: {
        ttl: 15 * 60,
        prefix: 'api:',
        serialize: true,
        compress: true
      },
      
      // 系统配置缓存 - 1小时
      system_config: {
        ttl: 60 * 60,
        prefix: 'config:',
        serialize: true,
        compress: false
      },
      
      // 统计数据缓存 - 15分钟
      statistics: {
        ttl: 15 * 60,
        prefix: 'stats:',
        serialize: true,
        compress: true
      },
      
      // 临时数据缓存 - 5分钟
      temporary: {
        ttl: 5 * 60,
        prefix: 'temp:',
        serialize: true,
        compress: false
      }
    };
  }

  /**
   * 生成缓存键
   */
  generateKey(strategy, identifier, params = {}) {
    const config = this.strategies[strategy];
    if (!config) {
      throw new Error(`未知的缓存策略: ${strategy}`);
    }
    
    // 基础键
    let key = `${this.keyPrefix}${config.prefix}${identifier}`;
    
    // 添加参数哈希
    if (Object.keys(params).length > 0) {
      const paramString = JSON.stringify(params, Object.keys(params).sort());
      const paramHash = crypto.createHash('md5').update(paramString).digest('hex').substring(0, 8);
      key += `:${paramHash}`;
    }
    
    // 添加版本
    key += `:v${this.version}`;
    
    return key;
  }

  /**
   * 设置缓存
   */
  async set(strategy, identifier, data, customTTL = null, params = {}) {
    try {
      const config = this.strategies[strategy];
      if (!config) {
        throw new Error(`未知的缓存策略: ${strategy}`);
      }
      
      const key = this.generateKey(strategy, identifier, params);
      const ttl = customTTL || config.ttl;
      
      let value = data;
      
      // 序列化
      if (config.serialize) {
        value = JSON.stringify(data);
      }
      
      // 压缩 (简化实现，实际可使用zlib)
      if (config.compress && typeof value === 'string' && value.length > 1000) {
        // 这里可以集成压缩算法
        value = `compressed:${value}`;
      }
      
      // 设置缓存
      await this.redis.setex(key, ttl, value);
      
      // 记录缓存操作
      await this.recordCacheOperation('set', strategy, key, ttl);
      
      return true;
    } catch (error) {
      console.error('缓存设置失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存
   */
  async get(strategy, identifier, params = {}) {
    try {
      const config = this.strategies[strategy];
      if (!config) {
        throw new Error(`未知的缓存策略: ${strategy}`);
      }
      
      const key = this.generateKey(strategy, identifier, params);
      let value = await this.redis.get(key);
      
      if (value === null) {
        // 记录缓存未命中
        await this.recordCacheOperation('miss', strategy, key);
        return null;
      }
      
      // 解压缩
      if (value.startsWith('compressed:')) {
        value = value.substring(11);
      }
      
      // 反序列化
      if (config.serialize) {
        try {
          value = JSON.parse(value);
        } catch (parseError) {
          console.error('缓存数据反序列化失败:', parseError);
          await this.delete(strategy, identifier, params);
          return null;
        }
      }
      
      // 记录缓存命中
      await this.recordCacheOperation('hit', strategy, key);
      
      return value;
    } catch (error) {
      console.error('缓存获取失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async delete(strategy, identifier, params = {}) {
    try {
      const key = this.generateKey(strategy, identifier, params);
      const result = await this.redis.del(key);
      
      // 记录缓存操作
      await this.recordCacheOperation('delete', strategy, key);
      
      return result > 0;
    } catch (error) {
      console.error('缓存删除失败:', error);
      return false;
    }
  }

  /**
   * 批量删除缓存
   */
  async deletePattern(strategy, pattern) {
    try {
      const config = this.strategies[strategy];
      if (!config) {
        throw new Error(`未知的缓存策略: ${strategy}`);
      }
      
      const searchPattern = `${this.keyPrefix}${config.prefix}${pattern}*`;
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length > 0) {
        const result = await this.redis.del(...keys);
        
        // 记录批量删除操作
        await this.recordCacheOperation('batch_delete', strategy, searchPattern, null, keys.length);
        
        return result;
      }
      
      return 0;
    } catch (error) {
      console.error('批量缓存删除失败:', error);
      return 0;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(strategy, identifier, params = {}) {
    try {
      const key = this.generateKey(strategy, identifier, params);
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('缓存存在性检查失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存TTL
   */
  async getTTL(strategy, identifier, params = {}) {
    try {
      const key = this.generateKey(strategy, identifier, params);
      const ttl = await this.redis.ttl(key);
      return ttl;
    } catch (error) {
      console.error('获取缓存TTL失败:', error);
      return -1;
    }
  }

  /**
   * 延长缓存TTL
   */
  async extendTTL(strategy, identifier, additionalSeconds, params = {}) {
    try {
      const key = this.generateKey(strategy, identifier, params);
      const currentTTL = await this.redis.ttl(key);
      
      if (currentTTL > 0) {
        const newTTL = currentTTL + additionalSeconds;
        await this.redis.expire(key, newTTL);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('延长缓存TTL失败:', error);
      return false;
    }
  }

  /**
   * 缓存预热
   */
  async warmup(strategy, dataLoader) {
    try {
      console.log(`🔥 开始缓存预热: ${strategy}`);
      
      const data = await dataLoader();
      const promises = [];
      
      for (const [identifier, value] of Object.entries(data)) {
        promises.push(this.set(strategy, identifier, value));
      }
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;
      
      console.log(`✅ 缓存预热完成: ${strategy}, 成功: ${successCount}/${results.length}`);
      
      return successCount;
    } catch (error) {
      console.error('缓存预热失败:', error);
      return 0;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // 获取各策略的键数量
      const strategyStats = {};
      for (const [strategy, config] of Object.entries(this.strategies)) {
        const pattern = `${this.keyPrefix}${config.prefix}*`;
        const keys = await this.redis.keys(pattern);
        strategyStats[strategy] = keys.length;
      }
      
      return {
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        strategies: strategyStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return null;
    }
  }

  /**
   * 清空所有缓存
   */
  async flush() {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        const result = await this.redis.del(...keys);
        console.log(`🗑️ 清空缓存完成: ${result}个键被删除`);
        return result;
      }
      
      return 0;
    } catch (error) {
      console.error('清空缓存失败:', error);
      return 0;
    }
  }

  /**
   * 记录缓存操作
   */
  async recordCacheOperation(operation, strategy, key, ttl = null, count = 1) {
    try {
      const statsKey = `${this.keyPrefix}stats:cache_ops:${new Date().toISOString().substring(0, 13)}`; // 按小时统计
      
      await this.redis.hincrby(statsKey, `${operation}:${strategy}`, count);
      await this.redis.expire(statsKey, 24 * 60 * 60); // 24小时过期
      
    } catch (error) {
      // 统计失败不影响主要功能
      console.warn('记录缓存操作统计失败:', error);
    }
  }

  /**
   * 解析Redis信息
   */
  parseRedisInfo(info) {
    const result = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(value) ? value : Number(value);
      }
    }
    
    return result;
  }
}

module.exports = CacheManager;
