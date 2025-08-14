/**
 * 缓存配置和初始化
 * 统一管理Redis连接和缓存策略
 */

const redis = require('redis');
const CacheManager = require('../utils/cache/CacheManager');
const QueryCache = require('../utils/cache/QueryCache');
const PerformanceMonitor = require('../utils/monitoring/PerformanceMonitor');

class CacheConfig {
  constructor() {
    this.redisClient = null;
    this.cacheManager = null;
    this.queryCache = null;
    this.performanceMonitor = null;
    this.isConnected = false;
    
    // Redis配置
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      family: 4, // IPv4
      
      // 连接池配置
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxLoadingTimeout: 5000
    };
    
    // 缓存预热配置
    this.warmupConfig = {
      enabled: process.env.CACHE_WARMUP_ENABLED === 'true',
      routes: [
        { path: '/api/v1/tests', description: '测试列表' },
        { path: '/api/v1/system/config', description: '系统配置' },
        { path: '/api/v1/tests/engines/status', description: '引擎状态' }
      ],
      queries: [
        {
          sql: 'SELECT * FROM system_config WHERE is_public = true',
          description: '公共系统配置'
        },
        {
          sql: 'SELECT engine_type, status FROM engine_status',
          description: '引擎状态'
        },
        {
          sql: 'SELECT COUNT(*) as total FROM test_results WHERE created_at >= CURRENT_DATE',
          description: '今日测试统计'
        }
      ]
    };
  }

  /**
   * 初始化缓存系统
   */
  async initialize(dbPool) {
    try {
      console.log('🔧 初始化缓存系统...');
      
      // 创建Redis连接
      await this.createRedisConnection();
      
      // 初始化缓存管理器
      this.cacheManager = new CacheManager(this.redisClient);
      
      // 初始化查询缓存
      if (dbPool) {
        this.queryCache = new QueryCache(this.cacheManager, dbPool);
      }
      
      // 初始化性能监控
      this.performanceMonitor = new PerformanceMonitor(this.cacheManager);
      
      // 设置事件监听
      this.setupEventListeners();
      
      // 缓存预热
      if (this.warmupConfig.enabled) {
        await this.performCacheWarmup();
      }
      
      // 启动性能监控
      this.performanceMonitor.startMonitoring();
      
      console.log('✅ 缓存系统初始化完成');
      
      return {
        cacheManager: this.cacheManager,
        queryCache: this.queryCache,
        performanceMonitor: this.performanceMonitor
      };
      
    } catch (error) {
      console.error('❌ 缓存系统初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建Redis连接
   */
  async createRedisConnection() {
    try {
      console.log(`🔗 连接Redis: ${this.redisConfig.host}:${this.redisConfig.port}`);
      
      // 创建Redis客户端
      this.redisClient = redis.createClient(this.redisConfig);
      
      // 连接到Redis
      await this.redisClient.connect();
      
      // 测试连接
      await this.redisClient.ping();
      
      this.isConnected = true;
      console.log('✅ Redis连接成功');
      
    } catch (error) {
      console.error('❌ Redis连接失败:', error);
      throw error;
    }
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // Redis连接事件
    this.redisClient.on('connect', () => {
      console.log('🔗 Redis连接建立');
      this.isConnected = true;
    });
    
    this.redisClient.on('ready', () => {
      console.log('✅ Redis准备就绪');
    });
    
    this.redisClient.on('error', (error) => {
      console.error('❌ Redis错误:', error);
      this.isConnected = false;
    });
    
    this.redisClient.on('end', () => {
      console.log('🔌 Redis连接断开');
      this.isConnected = false;
    });
    
    this.redisClient.on('reconnecting', () => {
      console.log('🔄 Redis重新连接中...');
    });
    
    // 进程退出时清理
    process.on('SIGINT', () => {
      this.cleanup();
    });
    
    process.on('SIGTERM', () => {
      this.cleanup();
    });
  }

  /**
   * 执行缓存预热
   */
  async performCacheWarmup() {
    try {
      console.log('🔥 开始缓存预热...');
      
      const warmupPromises = [];
      
      // API缓存预热
      if (this.warmupConfig.routes.length > 0) {
        const { cacheWarmup } = require('../api/middleware/cacheMiddleware');
        warmupPromises.push(cacheWarmup(this.cacheManager, this.warmupConfig.routes));
      }
      
      // 查询缓存预热
      if (this.queryCache && this.warmupConfig.queries.length > 0) {
        warmupPromises.push(this.queryCache.warmupQueries(this.warmupConfig.queries));
      }
      
      // 系统配置预热
      warmupPromises.push(this.warmupSystemConfig());
      
      // 引擎状态预热
      warmupPromises.push(this.warmupEngineStatus());
      
      const results = await Promise.all(warmupPromises);
      
      console.log('✅ 缓存预热完成');
      return results;
      
    } catch (error) {
      console.error('❌ 缓存预热失败:', error);
    }
  }

  /**
   * 预热系统配置
   */
  async warmupSystemConfig() {
    try {
      // 模拟系统配置数据
      const systemConfig = {
        'app.name': 'Test-Web Platform',
        'app.version': '1.0.0',
        'features.seo_test': true,
        'features.performance_test': true,
        'limits.free_plan_tests': 10,
        'limits.pro_plan_tests': 100
      };
      
      await this.cacheManager.set('system_config', 'all', systemConfig);
      
      return { type: 'system_config', success: true, count: Object.keys(systemConfig).length };
    } catch (error) {
      return { type: 'system_config', success: false, error: error.message };
    }
  }

  /**
   * 预热引擎状态
   */
  async warmupEngineStatus() {
    try {
      const engineStatus = {
        seo: { status: 'healthy', lastCheck: new Date().toISOString() },
        performance: { status: 'healthy', lastCheck: new Date().toISOString() },
        security: { status: 'maintenance', lastCheck: new Date().toISOString() },
        api: { status: 'healthy', lastCheck: new Date().toISOString() },
        compatibility: { status: 'healthy', lastCheck: new Date().toISOString() },
        accessibility: { status: 'healthy', lastCheck: new Date().toISOString() },
        stress: { status: 'healthy', lastCheck: new Date().toISOString() }
      };
      
      await this.cacheManager.set('system_config', 'engine_status', engineStatus);
      
      return { type: 'engine_status', success: true, count: Object.keys(engineStatus).length };
    } catch (error) {
      return { type: 'engine_status', success: false, error: error.message };
    }
  }

  /**
   * 获取缓存健康状态
   */
  async getHealthStatus() {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          redis: 'disconnected',
          timestamp: new Date().toISOString()
        };
      }
      
      // 测试Redis连接
      const pingResult = await this.redisClient.ping();
      
      // 获取Redis信息
      const redisInfo = await this.redisClient.info('server');
      
      // 获取缓存统计
      const cacheStats = await this.cacheManager.getStats();
      
      return {
        status: 'healthy',
        redis: {
          connected: true,
          ping: pingResult,
          info: this.parseRedisInfo(redisInfo)
        },
        cache: cacheStats,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStatistics() {
    try {
      const stats = {
        redis: await this.cacheManager.getStats(),
        performance: await this.performanceMonitor.getPerformanceReport(),
        queries: this.queryCache ? this.queryCache.getQueryStats() : null,
        timestamp: new Date().toISOString()
      };
      
      return stats;
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return null;
    }
  }

  /**
   * 清空所有缓存
   */
  async flushAllCache() {
    try {
      console.log('🗑️ 清空所有缓存...');
      
      const result = await this.cacheManager.flush();
      
      console.log(`✅ 缓存清空完成: ${result}个键被删除`);
      
      return { success: true, deletedKeys: result };
    } catch (error) {
      console.error('❌ 清空缓存失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 重启缓存系统
   */
  async restart() {
    try {
      console.log('🔄 重启缓存系统...');
      
      // 停止性能监控
      if (this.performanceMonitor) {
        this.performanceMonitor.stopMonitoring();
      }
      
      // 断开Redis连接
      if (this.redisClient && this.isConnected) {
        await this.redisClient.quit();
      }
      
      // 重新初始化
      await this.createRedisConnection();
      
      // 重启性能监控
      if (this.performanceMonitor) {
        this.performanceMonitor.startMonitoring();
      }
      
      console.log('✅ 缓存系统重启完成');
      
      return { success: true };
    } catch (error) {
      console.error('❌ 缓存系统重启失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      console.log('🧹 清理缓存系统资源...');
      
      // 停止性能监控
      if (this.performanceMonitor) {
        this.performanceMonitor.stopMonitoring();
      }
      
      // 关闭Redis连接
      if (this.redisClient && this.isConnected) {
        await this.redisClient.quit();
      }
      
      this.isConnected = false;
      
      console.log('✅ 缓存系统资源清理完成');
    } catch (error) {
      console.error('❌ 清理缓存系统资源失败:', error);
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

  /**
   * 获取缓存管理器实例
   */
  getCacheManager() {
    return this.cacheManager;
  }

  /**
   * 获取查询缓存实例
   */
  getQueryCache() {
    return this.queryCache;
  }

  /**
   * 获取性能监控实例
   */
  getPerformanceMonitor() {
    return this.performanceMonitor;
  }
}

// 创建单例实例
const cacheConfig = new CacheConfig();

module.exports = cacheConfig;
