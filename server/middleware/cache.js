/**
 * Redis缓存中间件
 * 为Express路由提供缓存功能
 */

const cacheService = require('../services/redis/cache');
const keys = require('../services/redis/keys');
const winston = require('winston');

class CacheMiddleware {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/cache-middleware.log' }),
        new winston.transports.Console()
      ]
    });
  }

  /**
   * 通用缓存中间件
   */
  cache(options = {}) {
    return async (req, res, next) => {
      try {
        // 检查是否启用缓存
        if (!cacheService.isAvailable()) {
          return next();
        }

        // 解析选项
        const {
          ttl = 3600,
          type = 'api',
          keyGenerator = this.defaultKeyGenerator,
          condition = () => true,
          skipCache = false,
          namespace = 'api'
        } = options;

        // 检查是否跳过缓存
        if (skipCache || !condition(req)) {
          return next();
        }

        // 生成缓存键
        const cacheKey = keyGenerator(req);
        if (!cacheKey) {
          return next();
        }

        // 尝试从缓存获取数据
        const cachedData = await cacheService.get(cacheKey, { namespace });
        
        if (cachedData) {
          this.logger.debug(`缓存命中: ${cacheKey}`);
          
          // 添加缓存头
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'X-Cache-TTL': await cacheService.getTTL(cacheKey, { namespace })
          });
          
          return res.json(cachedData);
        }

        // 缓存未命中，继续处理请求
        this.logger.debug(`缓存未命中: ${cacheKey}`);
        
        // 拦截响应以缓存结果
        const originalJson = res.json;
        res.json = function(data) {
          // 只缓存成功的响应
          if (res.statusCode >= 200 && res.statusCode < 300) {
            cacheService.set(cacheKey, data, { ttl, type, namespace })
              .catch(error => {
                this.logger.error('缓存设置失败:', error);
              });
          }
          
          // 添加缓存头
          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey
          });
          
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        this.logger.error('缓存中间件错误:', error);
        next();
      }
    };
  }

  /**
   * API测试结果缓存中间件
   */
  apiCache(testType, options = {}) {
    return this.cache({
      ttl: parseInt(process.env.REDIS_API_CACHE_TTL) || 1800,
      type: 'api',
      namespace: 'api',
      keyGenerator: (req) => {
        const url = req.body?.url || req.query?.url;
        const config = req.body?.config || req.query;
        
        if (!url) return null;
        
        switch (testType) {
          case 'performance':
            return keys.api.performance(url, config);
          case 'security':
            return keys.api.security(url, config);
          case 'seo':
            return keys.api.seo(url, config);
          case 'stress':
            return keys.api.stress(url, config);
          case 'compatibility':
            return keys.api.compatibility(url, config);
          case 'network':
            return keys.api.network(url, config);
          default:
            return null;
        }
      },
      condition: (req) => {
        // 只缓存GET和POST请求
        return ['GET', 'POST'].includes(req.method);
      },
      ...options
    });
  }

  /**
   * 数据库查询缓存中间件
   */
  dbCache(options = {}) {
    return this.cache({
      ttl: parseInt(process.env.REDIS_DB_CACHE_TTL) || 600,
      type: 'db',
      namespace: 'db',
      keyGenerator: (req) => {
        const { path, query, params } = req;
        return `${path}_${JSON.stringify({ query, params })}`;
      },
      condition: (req) => {
        // 只缓存GET请求
        return req.method === 'GET';
      },
      ...options
    });
  }

  /**
   * 用户会话缓存中间件
   */
  sessionCache(options = {}) {
    return this.cache({
      ttl: parseInt(process.env.REDIS_SESSION_TTL) || 86400,
      type: 'session',
      namespace: 'session',
      keyGenerator: (req) => {
        const userId = req.user?.id || req.userId;
        return userId ? keys.session.user(userId) : null;
      },
      condition: (req) => {
        return req.user || req.userId;
      },
      ...options
    });
  }

  /**
   * 缓存失效中间件
   */
  invalidateCache(patterns = []) {
    return async (req, res, next) => {
      try {
        // 执行原始请求
        const originalJson = res.json;
        res.json = async function(data) {
          // 请求成功后失效相关缓存
          if (res.statusCode >= 200 && res.statusCode < 300) {
            for (const pattern of patterns) {
              const cachePattern = typeof pattern === 'function' 
                ? pattern(req, data) 
                : pattern;
              
              if (cachePattern) {
                await cacheService.deletePattern(cachePattern);
                this.logger.debug(`缓存失效: ${cachePattern}`);
              }
            }
          }
          
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        this.logger.error('缓存失效中间件错误:', error);
        next();
      }
    };
  }

  /**
   * 缓存预热中间件
   */
  warmupCache(warmupFunction) {
    return async (req, res, next) => {
      try {
        // 异步执行预热，不阻塞请求
        setImmediate(async () => {
          try {
            await warmupFunction(req);
          } catch (error) {
            this.logger.error('缓存预热失败:', error);
          }
        });

        next();
      } catch (error) {
        this.logger.error('缓存预热中间件错误:', error);
        next();
      }
    };
  }

  /**
   * 缓存穿透防护中间件
   */
  antiPenetration(options = {}) {
    const {
      nullTTL = 60,
      maxNullCache = 1000
    } = options;

    return async (req, res, next) => {
      try {
        const originalJson = res.json;
        res.json = function(data) {
          // 如果返回空数据，缓存较短时间防止穿透
          if (!data || (Array.isArray(data) && data.length === 0)) {
            const cacheKey = req.cacheKey;
            if (cacheKey) {
              cacheService.set(cacheKey, null, { 
                ttl: nullTTL, 
                namespace: 'anti-penetration' 
              });
            }
          }
          
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        this.logger.error('缓存穿透防护中间件错误:', error);
        next();
      }
    };
  }

  /**
   * 缓存雪崩防护中间件
   */
  antiAvalanche(options = {}) {
    const {
      jitterRange = 0.1 // TTL抖动范围
    } = options;

    return (req, res, next) => {
      // 为TTL添加随机抖动
      const originalTTL = req.cacheTTL || 3600;
      const jitter = originalTTL * jitterRange * (Math.random() - 0.5);
      req.cacheTTL = Math.max(1, Math.floor(originalTTL + jitter));
      
      next();
    };
  }

  /**
   * 默认键生成器
   */
  defaultKeyGenerator(req) {
    const { method, path, query, body } = req;
    const userId = req.user?.id || 'anonymous';
    
    // 创建请求签名
    const signature = {
      method,
      path,
      query: this.sortObject(query),
      body: method === 'POST' ? this.sortObject(body) : undefined,
      userId
    };
    
    return JSON.stringify(signature);
  }

  /**
   * 排序对象（用于生成稳定的键）
   */
  sortObject(obj) {
    if (!obj || typeof obj !== 'object') {
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
   * 缓存统计中间件
   */
  cacheStats() {
    return (req, res, next) => {
      // 添加缓存统计信息到响应头
      const stats = cacheService.getStats();
      res.set({
        'X-Cache-Stats-Hit-Rate': stats.hitRate,
        'X-Cache-Stats-Total': stats.total,
        'X-Cache-Enabled': cacheService.isAvailable()
      });
      
      next();
    };
  }

  /**
   * 条件缓存中间件
   */
  conditionalCache(condition, cacheOptions = {}) {
    return (req, res, next) => {
      if (condition(req)) {
        return this.cache(cacheOptions)(req, res, next);
      }
      next();
    };
  }
}

// 创建单例实例
const cacheMiddleware = new CacheMiddleware();

module.exports = cacheMiddleware;
