/**
 * 测试引擎统一缓存策略
 * 本地化程度：100%
 * 为所有测试引擎提供统一的缓存接口和策略
 */

const crypto = require('crypto');
const Logger = require('../logger');

class EngineCache {
  constructor(engineName) {
    this.engineName = engineName;
    this.cacheManager = global.cacheManager;
    
    // 缓存配置
    this.config = {
      // 默认TTL配置（秒）
      defaultTTL: {
        analysis: 3600,      // 分析结果缓存1小时
        progress: 300,       // 进度缓存5分钟
        config: 86400,       // 配置缓存24小时
        temporary: 1800      // 临时数据缓存30分钟
      },
      
      // 缓存键前缀
      keyPrefix: {
        analysis: 'analysis',
        progress: 'progress',
        config: 'config',
        temporary: 'temp'
      },
      
      // 缓存策略
      strategy: {
        writeThrough: true,   // 写入时同时更新缓存
        readThrough: true,    // 读取时自动从源获取
        refreshAhead: false   // 提前刷新
      }
    };
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(type, identifier, params = {}) {
    const baseKey = `${this.config.keyPrefix[type]}:${this.engineName}`;
    
    // 创建参数哈希
    const paramString = Object.keys(params).length > 0 ? 
      JSON.stringify(params, Object.keys(params).sort()) : '';
    
    const hash = crypto.createHash('md5')
      .update(`${identifier}:${paramString}`)
      .digest('hex')
      .substring(0, 8);
    
    return `${baseKey}:${hash}`;
  }

  /**
   * 生成URL哈希
   */
  hashUrl(url) {
    return crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
  }

  /**
   * 缓存分析结果
   */
  async cacheAnalysisResult(url, config, result, customTTL = null) {
    if (!this.cacheManager) {
      Logger.debug('缓存管理器不可用，跳过缓存', { engine: this.engineName });
      return false;
    }

    try {
      const cacheKey = this.generateCacheKey('analysis', this.hashUrl(url), {
        engine: this.engineName,
        config: this.sanitizeConfig(config)
      });
      
      const ttl = customTTL || this.config.defaultTTL.analysis;
      
      const cacheData = {
        url,
        engine: this.engineName,
        result,
        cachedAt: new Date().toISOString(),
        config: this.sanitizeConfig(config)
      };
      
      await this.cacheManager.set('analysis', cacheKey, cacheData, ttl);
      
      Logger.debug('分析结果已缓存', { 
        engine: this.engineName, 
        url: url.substring(0, 50), 
        cacheKey,
        ttl 
      });
      
      return true;
    } catch (error) {
      Logger.warn('缓存分析结果失败', { 
        error: error.message, 
        engine: this.engineName,
        url: url.substring(0, 50)
      });
      return false;
    }
  }

  /**
   * 获取缓存的分析结果
   */
  async getCachedAnalysisResult(url, config) {
    if (!this.cacheManager) {
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey('analysis', this.hashUrl(url), {
        engine: this.engineName,
        config: this.sanitizeConfig(config)
      });
      
      const cached = await this.cacheManager.get('analysis', cacheKey);
      
      if (cached) {
        Logger.debug('使用缓存的分析结果', { 
          engine: this.engineName, 
          url: url.substring(0, 50),
          cachedAt: cached.cachedAt
        });
        
        return cached.result;
      }
      
      return null;
    } catch (error) {
      Logger.warn('获取缓存分析结果失败', { 
        error: error.message, 
        engine: this.engineName,
        url: url.substring(0, 50)
      });
      return null;
    }
  }

  /**
   * 缓存测试进度
   */
  async cacheTestProgress(testId, progress) {
    if (!this.cacheManager) {
      return false;
    }

    try {
      const cacheKey = this.generateCacheKey('progress', testId);
      const ttl = this.config.defaultTTL.progress;
      
      const progressData = {
        testId,
        engine: this.engineName,
        progress,
        updatedAt: new Date().toISOString()
      };
      
      await this.cacheManager.set('temporary', cacheKey, progressData, ttl);
      
      return true;
    } catch (error) {
      Logger.warn('缓存测试进度失败', { 
        error: error.message, 
        engine: this.engineName,
        testId
      });
      return false;
    }
  }

  /**
   * 获取缓存的测试进度
   */
  async getCachedTestProgress(testId) {
    if (!this.cacheManager) {
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey('progress', testId);
      const cached = await this.cacheManager.get('temporary', cacheKey);
      
      return cached ? cached.progress : null;
    } catch (error) {
      Logger.warn('获取缓存测试进度失败', { 
        error: error.message, 
        engine: this.engineName,
        testId
      });
      return null;
    }
  }

  /**
   * 缓存引擎配置
   */
  async cacheEngineConfig(configKey, config) {
    if (!this.cacheManager) {
      return false;
    }

    try {
      const cacheKey = this.generateCacheKey('config', configKey);
      const ttl = this.config.defaultTTL.config;
      
      await this.cacheManager.set('config', cacheKey, config, ttl);
      
      Logger.debug('引擎配置已缓存', { 
        engine: this.engineName, 
        configKey,
        ttl
      });
      
      return true;
    } catch (error) {
      Logger.warn('缓存引擎配置失败', { 
        error: error.message, 
        engine: this.engineName,
        configKey
      });
      return false;
    }
  }

  /**
   * 获取缓存的引擎配置
   */
  async getCachedEngineConfig(configKey) {
    if (!this.cacheManager) {
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey('config', configKey);
      return await this.cacheManager.get('config', cacheKey);
    } catch (error) {
      Logger.warn('获取缓存引擎配置失败', { 
        error: error.message, 
        engine: this.engineName,
        configKey
      });
      return null;
    }
  }

  /**
   * 清除引擎相关缓存
   */
  async clearEngineCache(type = 'all') {
    if (!this.cacheManager) {
      return false;
    }

    try {
      const patterns = [];
      
      if (type === 'all') {
        patterns.push(`analysis:${this.engineName}:*`);
        patterns.push(`progress:${this.engineName}:*`);
        patterns.push(`config:${this.engineName}:*`);
        patterns.push(`temp:${this.engineName}:*`);
      } else {
        patterns.push(`${this.config.keyPrefix[type]}:${this.engineName}:*`);
      }
      
      for (const pattern of patterns) {
        await this.cacheManager.deletePattern(pattern);
      }
      
      Logger.info('引擎缓存已清除', { 
        engine: this.engineName, 
        type,
        patterns
      });
      
      return true;
    } catch (error) {
      Logger.error('清除引擎缓存失败', error, { 
        engine: this.engineName,
        type
      });
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats() {
    if (!this.cacheManager) {
      return null;
    }

    try {
      const stats = {
        engine: this.engineName,
        timestamp: new Date().toISOString(),
        keys: {
          analysis: 0,
          progress: 0,
          config: 0,
          temporary: 0
        },
        hitRate: 0,
        totalSize: 0
      };

      // 这里可以添加具体的统计逻辑
      // 由于Redis的限制，实际实现可能需要维护单独的统计数据

      return stats;
    } catch (error) {
      Logger.warn('获取缓存统计失败', { 
        error: error.message, 
        engine: this.engineName
      });
      return null;
    }
  }

  /**
   * 清理配置对象（移除敏感信息）
   */
  sanitizeConfig(config) {
    const sanitized = { ...config };
    
    // 移除敏感字段
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    });
    
    return sanitized;
  }

  /**
   * 检查缓存是否可用
   */
  isCacheAvailable() {
    return !!this.cacheManager;
  }

  /**
   * 预热缓存
   */
  async warmupCache(urls = [], configs = []) {
    if (!this.cacheManager || urls.length === 0) {
      return false;
    }

    try {
      Logger.info('开始缓存预热', { 
        engine: this.engineName, 
        urlCount: urls.length,
        configCount: configs.length
      });

      // 这里可以添加具体的预热逻辑
      // 例如预先分析常用URL和配置组合

      return true;
    } catch (error) {
      Logger.error('缓存预热失败', error, { 
        engine: this.engineName
      });
      return false;
    }
  }
}

module.exports = EngineCache;
