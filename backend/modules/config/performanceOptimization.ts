/**
 * 性能优化和缓存系统配置
 * 基于已有的CacheService，实施更激进的缓存策略
 */

import { Buffer } from 'buffer';
import type { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import NodeCache from 'node-cache';
import zlib from 'zlib';

type NodeCacheStore = {
  on: (event: string, callback: () => void) => void;
  get: (key: string) => unknown;
  set: (key: string, value: unknown, ttl?: number) => boolean;
  del: (key: string) => number;
  keys: () => string[];
  flushAll: () => void;
  close: () => void;
  getStats: () => Record<string, unknown>;
};

type CacheStrategy = {
  ttl: number;
  maxSize: number;
  compress: boolean;
};

type CacheConfigType = {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
    connectTimeout: number;
    commandTimeout: number;
    lazyConnect: boolean;
    keepAlive: number;
  };
  memory: {
    stdTTL: number;
    checkperiod: number;
    deleteOnExpire: boolean;
    maxKeys: number;
    useClones: boolean;
  };
  strategies: Record<string, CacheStrategy>;
};

type PerformanceConfigType = {
  connectionPool: {
    database: Record<string, number>;
    http: {
      maxSockets: number;
      maxFreeSockets: number;
      timeout: number | string;
      freeSocketTimeout: number;
      keepAlive: boolean;
      keepAliveMsecs: number;
    };
  };
  compression: {
    threshold: number;
    level: number;
    chunkSize: number;
    memLevel: number;
    strategy: string;
    filter: (req: Request, res: Response) => boolean;
  };
  rateLimiting: Record<string, Record<string, unknown>>;
  queue: {
    redis: CacheConfigType['redis'];
    defaultJobOptions: Record<string, unknown>;
    queues: Record<string, Record<string, unknown>>;
  };
  monitoring: {
    metrics: Record<string, unknown>;
    healthCheck: Record<string, unknown>;
    alerts: Record<string, number>;
  };
};

type CacheStats = {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
};

type ResponseWithCache = Response & {
  locals: Record<string, unknown> & { cacheHit?: boolean };
};

/**
 * 缓存配置
 */
const CacheConfig: CacheConfigType = {
  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: Number.parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: 'testweb:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    commandTimeout: 5000,
    // 连接池配置
    lazyConnect: true,
    keepAlive: 30000,
  },

  // 内存缓存配置
  memory: {
    stdTTL: 600, // 默认过期时间 10分钟
    checkperiod: 120, // 清理周期 2分钟
    deleteOnExpire: true,
    maxKeys: 10000, // 最大键数量
    useClones: false, // 性能优化，不克隆对象
  },

  // 缓存策略
  strategies: {
    // API 响应缓存
    apiResponse: {
      ttl: 300, // 5分钟
      maxSize: 1000,
      compress: true,
    },

    // 数据库查询缓存
    database: {
      ttl: 1800, // 30分钟
      maxSize: 5000,
      compress: true,
    },

    // 静态资源缓存
    static: {
      ttl: 86400, // 24小时
      maxSize: 2000,
      compress: false,
    },

    // 会话缓存
    session: {
      ttl: 3600, // 1小时
      maxSize: 10000,
      compress: false,
    },

    // 测试结果缓存
    testResults: {
      ttl: 7200, // 2小时
      maxSize: 3000,
      compress: true,
    },

    // 监控数据缓存
    monitoring: {
      ttl: 60, // 1分钟
      maxSize: 500,
      compress: false,
    },
  },
};

/**
 * 性能优化配置
 */
const PerformanceConfig: PerformanceConfigType = {
  // 连接池配置
  connectionPool: {
    // 数据库连接池
    database: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },

    // HTTP 连接池
    http: {
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      freeSocketTimeout: 30000,
      keepAlive: true,
      keepAliveMsecs: 1000,
    },
  },

  // 压缩配置
  compression: {
    threshold: 1024,
    level: 6,
    chunkSize: 16384,
    memLevel: 8,
    strategy: 'Z_DEFAULT_STRATEGY',
    filter: (req: Request, res: Response) => {
      // 不压缩已经压缩的内容
      if (req.headers['x-no-compression']) {
        return false;
      }
      // 只压缩文本类型的内容
      return /json|text|javascript|css|font|svg/.test(String(res.getHeader('content-type') || ''));
    },
  },

  // 限流配置
  rateLimiting: {
    // 全局限流
    global: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 1000, // 每个IP最多1000请求
      message: '请求过于频繁，请稍后再试',
    },

    // API 限流
    api: {
      windowMs: 1 * 60 * 1000, // 1分钟
      max: 100, // 每个IP最多100请求
      message: 'API调用过于频繁',
    },

    // 测试接口限流
    testing: {
      windowMs: 5 * 60 * 1000, // 5分钟
      max: 20, // 每个IP最多20个测试
      message: '测试请求过于频繁，请等待后再试',
    },

    // 登录限流
    auth: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 5, // 每个IP最多5次登录尝试
      message: '登录尝试过多，请稍后再试',
      skipSuccessfulRequests: true,
    },
  },

  // 异步任务队列配置
  queue: {
    redis: CacheConfig.redis,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },

    // 队列配置
    queues: {
      // 测试任务队列
      testing: {
        concurrency: 5,
        priority: 'high',
      },

      // 数据处理队列
      dataProcessing: {
        concurrency: 10,
        priority: 'normal',
      },

      // 通知队列
      notifications: {
        concurrency: 20,
        priority: 'low',
      },

      // 报告生成队列
      reporting: {
        concurrency: 2,
        priority: 'normal',
      },
    },
  },

  // 监控配置
  monitoring: {
    // 性能指标收集
    metrics: {
      enabled: true,
      interval: 10000, // 10秒收集一次
      retention: 7 * 24 * 3600, // 保留7天
    },

    // 健康检查
    healthCheck: {
      timeout: 5000,
      interval: 30000, // 30秒检查一次
    },

    // 告警阈值
    alerts: {
      cpuUsage: 80, // CPU使用率超过80%
      memoryUsage: 85, // 内存使用率超过85%
      diskUsage: 90, // 磁盘使用率超过90%
      responseTime: 5000, // 响应时间超过5秒
      errorRate: 5, // 错误率超过5%
    },
  },
};

/**
 * 增强型缓存服务类
 */
class CacheService {
  private redis: Redis | null = null;
  private memoryCache = new NodeCache(CacheConfig.memory) as unknown as NodeCacheStore;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  constructor() {
    void this.initialize();
  }

  /**
   * 初始化缓存服务
   */
  async initialize() {
    try {
      // 初始化Redis连接
      this.redis = new Redis(CacheConfig.redis);

      this.redis.on('connect', () => {
        console.log('✅ Redis连接成功');
      });

      this.redis.on('error', (error: Error) => {
        console.error('❌ Redis连接错误:', error);
        this.stats.errors += 1;
      });

      this.redis.on('close', () => {
        console.log('⚠️ Redis连接关闭');
      });

      // 设置内存缓存事件监听
      this.memoryCache.on('set', () => {
        this.stats.sets += 1;
      });

      this.memoryCache.on('del', () => {
        this.stats.deletes += 1;
      });

      this.memoryCache.on('expired', () => {
        // no-op
      });

      // 启动定期统计报告
      this.startStatsReporting();

      console.log('✅ 缓存服务初始化完成');
    } catch (error) {
      console.error('❌ 缓存服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取缓存
   */
  async get(key: string, strategy = 'default') {
    try {
      // 先从内存缓存获取
      let value = this.memoryCache.get(key);
      if (value !== undefined) {
        this.stats.hits += 1;
        return value;
      }

      // 再从Redis获取
      if (this.redis) {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          // 解压缩和反序列化
          value = await this.deserialize(redisValue);

          // 回写到内存缓存
          const config = CacheConfig.strategies[strategy] || CacheConfig.strategies.apiResponse;
          this.memoryCache.set(key, value as unknown, config.ttl);

          this.stats.hits += 1;
          return value;
        }
      }

      this.stats.misses += 1;
      return null;
    } catch (error) {
      this.stats.errors += 1;
      console.error(`缓存获取失败 ${key}:`, error);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: unknown, strategy = 'default', customTTL: number | null = null) {
    try {
      const config = CacheConfig.strategies[strategy] || CacheConfig.strategies.apiResponse;
      const ttl = customTTL || config.ttl;

      // 设置内存缓存
      this.memoryCache.set(key, value, ttl);

      // 设置Redis缓存
      if (this.redis) {
        const serializedValue = await this.serialize(value, config.compress);
        await this.redis.setex(key, ttl, serializedValue);
      }

      this.stats.sets += 1;
      return true;
    } catch (error) {
      this.stats.errors += 1;
      console.error(`缓存设置失败 ${key}:`, error);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string) {
    try {
      // 从内存缓存删除
      this.memoryCache.del(key);

      // 从Redis删除
      if (this.redis) {
        await this.redis.del(key);
      }

      this.stats.deletes += 1;
      return true;
    } catch (error) {
      this.stats.errors += 1;
      console.error(`缓存删除失败 ${key}:`, error);
      return false;
    }
  }

  /**
   * 批量删除缓存
   */
  async deletePattern(pattern: string) {
    try {
      let count = 0;

      // 删除内存缓存匹配的键
      const memoryKeys = this.memoryCache.keys();
      const matchingKeys = memoryKeys.filter((key: string) =>
        new RegExp(pattern.replace(/\*/g, '.*')).test(key)
      );

      matchingKeys.forEach((key: string) => {
        this.memoryCache.del(key);
        count += 1;
      });

      // 删除Redis匹配的键
      if (this.redis) {
        const redisKeys = await this.redis.keys(pattern);
        if (redisKeys.length > 0) {
          await this.redis.del(...redisKeys);
          count += redisKeys.length;
        }
      }

      this.stats.deletes += count;
      return count;
    } catch (error) {
      this.stats.errors += 1;
      console.error(`批量删除缓存失败 ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * 清空所有缓存
   */
  async flush() {
    try {
      // 清空内存缓存
      this.memoryCache.flushAll();

      // 清空Redis缓存
      if (this.redis) {
        await this.redis.flushdb();
      }

      console.log('✅ 所有缓存已清空');
      return true;
    } catch (error) {
      this.stats.errors += 1;
      console.error('缓存清空失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
        : '0';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memoryKeys: this.memoryCache.keys().length,
      memorySize: JSON.stringify(this.memoryCache.getStats()).length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 序列化数据
   */
  async serialize(data: unknown, compress = false) {
    try {
      const serialized = JSON.stringify(data);

      if (compress && serialized.length > 1024) {
        const compressed = await new Promise<Buffer>((resolve, reject) => {
          zlib.gzip(serialized, (err: Error | null, result: Buffer) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        return `gzip:${compressed.toString('base64')}`;
      }

      return serialized;
    } catch (error) {
      console.error('序列化失败:', error);
      throw error;
    }
  }

  /**
   * 反序列化数据
   */
  async deserialize(data: string) {
    try {
      if (typeof data === 'string' && data.startsWith('gzip:')) {
        const compressed = Buffer.from(data.substring(5), 'base64');
        const decompressed = await new Promise<string>((resolve, reject) => {
          zlib.gunzip(compressed, (err: Error | null, result: Buffer) => {
            if (err) reject(err);
            else resolve(result.toString());
          });
        });
        return JSON.parse(decompressed) as unknown;
      }

      return JSON.parse(data) as unknown;
    } catch (error) {
      console.error('反序列化失败:', error);
      throw error;
    }
  }

  /**
   * 启动统计报告
   */
  startStatsReporting() {
    setInterval(() => {
      const stats = this.getStats();
      console.log('📊 缓存统计:', {
        命中率: stats.hitRate,
        命中次数: stats.hits,
        未命中: stats.misses,
        设置次数: stats.sets,
        删除次数: stats.deletes,
        错误次数: stats.errors,
        内存键数: stats.memoryKeys,
      });
    }, 60000); // 每分钟报告一次
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const testKey = `health_check_${Date.now()}`;
      const testValue = { timestamp: Date.now(), status: 'ok' };

      // 测试设置
      await this.set(testKey, testValue, 'monitoring', 10);

      // 测试获取
      const retrieved = await this.get(testKey);

      // 测试删除
      await this.delete(testKey);

      const isHealthy = Boolean(retrieved && (retrieved as { status?: string }).status === 'ok');

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        memory: this.memoryCache.keys().length > 0,
        redis: this.redis && this.redis.status === 'ready',
        stats: this.getStats(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 关闭服务
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryCache.flushAll();
    this.memoryCache.close();
  }
}

/**
 * 性能监控中间件
 */
function createPerformanceMiddleware() {
  const responseTimeCache = new Map<string, number[]>();

  return (req: Request, res: ResponseWithCache, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send.bind(res);

    // 重写res.send方法来记录响应时间
    res.send = ((body?: unknown) => {
      const responseTime = Date.now() - startTime;

      // 设置性能头部
      res.set({
        'X-Response-Time': `${responseTime}ms`,
        'X-Cache-Status': res.locals.cacheHit ? 'HIT' : 'MISS',
        'X-Server-Timing': `total;dur=${responseTime}`,
      });

      // 记录慢请求
      if (responseTime > PerformanceConfig.monitoring.alerts.responseTime) {
        console.warn(`🐌 慢请求检测: ${req.method} ${req.path} - ${responseTime}ms`);
      }

      // 更新统计
      if (!responseTimeCache.has(req.path)) {
        responseTimeCache.set(req.path, []);
      }

      const times = responseTimeCache.get(req.path) || [];
      times.push(responseTime);

      // 只保留最近100次请求的数据
      if (times.length > 100) {
        times.shift();
      }

      responseTimeCache.set(req.path, times);

      return originalSend(body as unknown);
    }) as Response['send'];

    next();
  };
}

/**
 * 缓存中间件工厂
 */
function createCacheMiddleware(strategy = 'apiResponse', customTTL: number | null = null) {
  return async (req: Request, res: ResponseWithCache, next: NextFunction) => {
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      // 尝试从缓存获取
      const cachedResponse = await global.cacheService?.get(cacheKey, strategy);

      if (cachedResponse) {
        res.locals.cacheHit = true;
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // 缓存未命中，继续处理请求
      res.locals.cacheHit = false;
      res.set('X-Cache', 'MISS');

      // 重写res.json方法来缓存响应
      const originalJson = res.json.bind(res);
      res.json = ((body?: unknown) => {
        // 只缓存成功的响应
        if (res.statusCode === 200 && body) {
          void global.cacheService?.set(cacheKey, body, strategy, customTTL);
        }
        return originalJson(body as unknown);
      }) as Response['json'];

      return next();
    } catch (error) {
      console.error('缓存中间件错误:', error);
      return next();
    }
  };
}

declare global {
  var cacheService: CacheService | undefined;
}

// 导出配置和服务
export {
  CacheConfig,
  CacheService,
  createCacheMiddleware,
  createPerformanceMiddleware,
  PerformanceConfig,
};

export const initializePerformanceOptimization = async () => {
  try {
    global.cacheService = new CacheService();

    console.log('✅ 性能优化系统初始化完成');
    return global.cacheService;
  } catch (error) {
    console.error('❌ 性能优化系统初始化失败:', error);
    throw error;
  }
};
