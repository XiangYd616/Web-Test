/**
 * 降级处理工具
 * 当Redis不可用时提供降级机制
 */

const winston = require('winston');

class FallbackHandler {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/fallback.log' }),
        new winston.transports.Console()
      ]
    });

    // 内存缓存作为降级方案
    this.memoryCache = new Map();
    this.maxMemoryCacheSize = 1000;
    this.defaultTTL = 300000; // 5分钟
  }

  /**
   * 内存缓存获取
   */
  async memoryGet(key) {
    try {
      const item = this.memoryCache.get(key);
      
      if (!item) {
        return null;
      }
      
      // 检查是否过期
      if (Date.now() > item.expiry) {
        this.memoryCache.delete(key);
        return null;
      }
      
      this.logger.debug(`内存缓存命中: ${key}`);
      return item.value;
    } catch (error) {
      this.logger.error('内存缓存获取失败:', error);
      return null;
    }
  }

  /**
   * 内存缓存设置
   */
  async memorySet(key, value, ttl = this.defaultTTL) {
    try {
      // 检查缓存大小限制
      if (this.memoryCache.size >= this.maxMemoryCacheSize) {
        this.evictOldest();
      }
      
      const expiry = Date.now() + ttl;
      this.memoryCache.set(key, {
        value,
        expiry,
        created: Date.now()
      });
      
      this.logger.debug(`内存缓存设置: ${key}, TTL: ${ttl}ms`);
      return true;
    } catch (error) {
      this.logger.error('内存缓存设置失败:', error);
      return false;
    }
  }

  /**
   * 内存缓存删除
   */
  async memoryDelete(key) {
    try {
      const deleted = this.memoryCache.delete(key);
      this.logger.debug(`内存缓存删除: ${key}, 结果: ${deleted}`);
      return deleted;
    } catch (error) {
      this.logger.error('内存缓存删除失败:', error);
      return false;
    }
  }

  /**
   * 检查内存缓存是否存在
   */
  async memoryExists(key) {
    try {
      const item = this.memoryCache.get(key);
      
      if (!item) {
        return false;
      }
      
      // 检查是否过期
      if (Date.now() > item.expiry) {
        this.memoryCache.delete(key);
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error('内存缓存存在检查失败:', error);
      return false;
    }
  }

  /**
   * 清理过期的内存缓存项
   */
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiry) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`清理过期内存缓存: ${cleaned} 项`);
    }
    
    return cleaned;
  }

  /**
   * 驱逐最旧的缓存项
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.created < oldestTime) {
        oldestTime = item.created;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.logger.debug(`驱逐最旧缓存项: ${oldestKey}`);
    }
  }

  /**
   * 获取内存缓存统计
   */
  getMemoryCacheStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiry) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.memoryCache.size,
      valid,
      expired,
      maxSize: this.maxMemoryCacheSize,
      usage: `${((this.memoryCache.size / this.maxMemoryCacheSize) * 100).toFixed(2)}%`
    };
  }

  /**
   * 数据库查询降级处理
   */
  async fallbackDatabaseQuery(queryFunction, cacheKey, ttl = 300000) {
    try {
      // 先尝试从内存缓存获取
      const cached = await this.memoryGet(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      // 执行数据库查询
      this.logger.info(`执行降级数据库查询: ${cacheKey}`);
      const result = await queryFunction();
      
      // 缓存结果到内存
      await this.memorySet(cacheKey, result, ttl);
      
      return result;
    } catch (error) {
      this.logger.error('降级数据库查询失败:', error);
      throw error;
    }
  }

  /**
   * API调用降级处理
   */
  async fallbackApiCall(apiFunction, cacheKey, ttl = 600000) {
    try {
      // 先尝试从内存缓存获取
      const cached = await this.memoryGet(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      // 执行API调用
      this.logger.info(`执行降级API调用: ${cacheKey}`);
      const result = await apiFunction();
      
      // 缓存结果到内存
      await this.memorySet(cacheKey, result, ttl);
      
      return result;
    } catch (error) {
      this.logger.error('降级API调用失败:', error);
      throw error;
    }
  }

  /**
   * 会话数据降级处理
   */
  async fallbackSessionData(sessionId, sessionData = null) {
    const cacheKey = `session_${sessionId}`;
    
    if (sessionData !== null) {
      // 设置会话数据
      return await this.memorySet(cacheKey, sessionData, 1800000); // 30分钟
    } else {
      // 获取会话数据
      return await this.memoryGet(cacheKey);
    }
  }

  /**
   * 限流降级处理
   */
  async fallbackRateLimit(key, limit, window) {
    const now = Date.now();
    const windowStart = now - window;
    const cacheKey = `ratelimit_${key}`;
    
    // 获取当前计数
    let requests = await this.memoryGet(cacheKey) || [];
    
    // 清理过期的请求记录
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // 检查是否超过限制
    if (requests.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...requests) + window
      };
    }
    
    // 添加当前请求
    requests.push(now);
    await this.memorySet(cacheKey, requests, window);
    
    return {
      allowed: true,
      remaining: limit - requests.length,
      resetTime: now + window
    };
  }

  /**
   * 清空内存缓存
   */
  clearMemoryCache() {
    const size = this.memoryCache.size;
    this.memoryCache.clear();
    this.logger.info(`清空内存缓存: ${size} 项`);
    return size;
  }

  /**
   * 启动定期清理
   */
  startCleanupSchedule(interval = 300000) { // 5分钟
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, interval);
    
    this.logger.info(`启动内存缓存定期清理，间隔: ${interval}ms`);
  }

  /**
   * 停止定期清理
   */
  stopCleanupSchedule() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.info('停止内存缓存定期清理');
    }
  }

  /**
   * 获取降级状态报告
   */
  getFallbackReport() {
    return {
      memoryCache: this.getMemoryCacheStats(),
      isActive: true,
      type: 'memory-fallback',
      timestamp: new Date().toISOString()
    };
  }
}

// 创建单例实例
const fallbackHandler = new FallbackHandler();

// 启动定期清理
fallbackHandler.startCleanupSchedule();

module.exports = fallbackHandler;
