/**
 * 统一缓存管理器
 * 整合所有缓存服务，提供统一的缓存管理接口
 */

const CacheService = require('./CacheService');
const QueryCacheService = require('./QueryCacheService');
const CacheMonitoringService = require('./CacheMonitoringService');
const CacheWarmupService = require('./CacheWarmupService');
const winston = require('winston');

class CacheManager {
    constructor(dbPool) {
        this.dbPool = dbPool;
        this.isInitialized = false;

        // 缓存服务实例（使用单例）
        this.cacheService = CacheService;
        this.queryCacheService = null;
        this.monitoringService = null;
        this.warmupService = null;

        // 配置日志
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/cache-manager.log' }),
                new winston.transports.Console({ level: 'error' })
            ]
        });

        // 配置
        this.config = {
            redis: {
                enabled: process.env.REDIS_ENABLED === 'true',
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                db: parseInt(process.env.REDIS_DB) || 0
            },
            features: {
                queryCache: process.env.REDIS_CACHE_DB_QUERIES === 'true',
                monitoring: process.env.REDIS_ENABLE_MONITORING === 'true',
                warmup: process.env.CACHE_WARMUP_ENABLED === 'true'
            },
            fallback: {
                enabled: true,
                memoryCache: new Map(),
                maxSize: 1000,
                defaultTTL: 300 // 5分钟
            }
        };
    }

    /**
     * 初始化缓存管理器
     */
    async initialize() {
        try {
            this.logger.info('初始化缓存管理器...');

            // 初始化核心缓存服务
            const cacheInitialized = await this.cacheService.initialize();

            if (!cacheInitialized) {
                this.logger.warn('Redis缓存服务初始化失败，启用降级模式');
                this.enableFallbackMode();
                return true; // 降级模式下仍然可以工作
            }

            // 初始化查询缓存服务
            if (this.config.features.queryCache && this.dbPool) {
                this.queryCacheService = new QueryCacheService(this.cacheService, this.dbPool);
                this.logger.info('查询缓存服务已启用');
            }

            // 初始化监控服务
            if (this.config.features.monitoring) {
                this.monitoringService = new CacheMonitoringService(this.cacheService);
                this.monitoringService.startMonitoring();
                this.logger.info('缓存监控服务已启用');
            }

            // 初始化预热服务
            if (this.config.features.warmup) {
                this.warmupService = new CacheWarmupService(
                    this.cacheService,
                    this.queryCacheService,
                    this.dbPool
                );
                await this.warmupService.start();
                this.logger.info('缓存预热服务已启用');
            }

            this.isInitialized = true;
            this.logger.info('缓存管理器初始化完成');

            return true;
        } catch (error) {
            this.logger.error('缓存管理器初始化失败:', error);
            this.enableFallbackMode();
            return false;
        }
    }

    /**
     * 启用降级模式
     */
    enableFallbackMode() {
        this.logger.info('启用缓存降级模式');
        this.config.fallback.active = true;

        // 清理过期的内存缓存
        setInterval(() => {
            this.cleanupMemoryCache();
        }, 60000); // 每分钟清理一次
    }

    /**
     * 设置缓存
     */
    async set(strategy, identifier, data, customTTL = null, params = {}) {
        try {
            if (this.cacheService.isAvailable()) {
                return await this.cacheService.set(strategy, identifier, data, customTTL, params);
            } else if (this.config.fallback.active) {
                return this.setMemoryCache(strategy, identifier, data, customTTL, params);
            }
            return false;
        } catch (error) {
            this.logger.error('缓存设置失败:', error);
            return false;
        }
    }

    /**
     * 获取缓存
     */
    async get(strategy, identifier, params = {}) {
        try {
            if (this.cacheService.isAvailable()) {
                return await this.cacheService.get(strategy, identifier, params);
            } else if (this.config.fallback.active) {
                return this.getMemoryCache(strategy, identifier, params);
            }
            return null;
        } catch (error) {
            this.logger.error('缓存获取失败:', error);
            return null;
        }
    }

    /**
     * 删除缓存
     */
    async delete(strategy, identifier, params = {}) {
        try {
            if (this.cacheService.isAvailable()) {
                return await this.cacheService.delete(strategy, identifier, params);
            } else if (this.config.fallback.active) {
                return this.deleteMemoryCache(strategy, identifier, params);
            }
            return false;
        } catch (error) {
            this.logger.error('缓存删除失败:', error);
            return false;
        }
    }

    /**
     * 批量删除缓存
     */
    async deletePattern(strategy, pattern) {
        try {
            if (this.cacheService.isAvailable()) {
                return await this.cacheService.deletePattern(strategy, pattern);
            } else if (this.config.fallback.active) {
                return this.deleteMemoryCachePattern(strategy, pattern);
            }
            return 0;
        } catch (error) {
            this.logger.error('批量缓存删除失败:', error);
            return 0;
        }
    }

    /**
     * 根据标签删除缓存
     */
    async deleteByTag(tag) {
        try {
            if (this.cacheService.isAvailable()) {
                return await this.cacheService.deleteByTag(tag);
            }
            return 0;
        } catch (error) {
            this.logger.error('根据标签删除缓存失败:', error);
            return 0;
        }
    }

    /**
     * 执行查询（带缓存）
     */
    async query(sql, params = [], options = {}) {
        if (this.queryCacheService) {
            return await this.queryCacheService.query(sql, params, options);
        } else if (this.dbPool) {
            // 直接执行查询，不使用缓存
            const result = await this.dbPool.query(sql, params);
            return {
                rows: result.rows,
                rowCount: result.rowCount,
                cached: false
            };
        } else {
            throw new Error('数据库连接池未配置');
        }
    }

    /**
     * 批量查询
     */
    async batchQuery(queries, options = {}) {
        if (this.queryCacheService) {
            return await this.queryCacheService.batchQuery(queries, options);
        } else {
            throw new Error('查询缓存服务未启用');
        }
    }

    /**
     * 使缓存失效
     */
    async invalidateCache(pattern) {
        if (this.queryCacheService) {
            return await this.queryCacheService.invalidateCache(pattern);
        }
        return 0;
    }

    /**
     * 根据事件使缓存失效
     */
    async invalidateByEvent(event) {
        if (this.queryCacheService) {
            return await this.queryCacheService.invalidateByEvent(event);
        }
        return 0;
    }

    /**
     * 根据表名使缓存失效
     */
    async invalidateByTable(tableName) {
        if (this.queryCacheService) {
            return await this.queryCacheService.invalidateByTable(tableName);
        }
        return 0;
    }

    /**
     * 执行预热
     */
    async performWarmup() {
        if (this.warmupService) {
            return await this.warmupService.performWarmup();
        }
        return { total: 0, successful: 0, failed: 0 };
    }

    /**
     * 手动预热特定类型
     */
    async warmupType(type) {
        if (this.warmupService) {
            return await this.warmupService.warmupType(type);
        }
        throw new Error('预热服务未启用');
    }

    /**
     * 批量删除
     */
    async batchDelete(patterns) {
        if (this.warmupService) {
            return await this.warmupService.batchDelete(patterns);
        }
        return { total: 0, successful: 0, failed: 0 };
    }

    /**
     * 内存缓存操作
     */
    generateMemoryKey(strategy, identifier, params = {}) {
        const paramString = Object.keys(params).length > 0 ? JSON.stringify(params) : '';
        return `${strategy}:${identifier}:${paramString}`;
    }

    setMemoryCache(strategy, identifier, data, customTTL = null, params = {}) {
        if (this.config.fallback.memoryCache.size >= this.config.fallback.maxSize) {
            // 清理最旧的缓存项
            const firstKey = this.config.fallback.memoryCache.keys().next().value;
            this.config.fallback.memoryCache.delete(firstKey);
        }

        const key = this.generateMemoryKey(strategy, identifier, params);
        const ttl = customTTL || this.config.fallback.defaultTTL;
        const expireAt = Date.now() + (ttl * 1000);

        this.config.fallback.memoryCache.set(key, {
            data,
            expireAt,
            createdAt: Date.now()
        });

        return true;
    }

    getMemoryCache(strategy, identifier, params = {}) {
        const key = this.generateMemoryKey(strategy, identifier, params);
        const cached = this.config.fallback.memoryCache.get(key);

        if (!cached) {
            return null;
        }

        if (Date.now() > cached.expireAt) {
            this.config.fallback.memoryCache.delete(key);
            return null;
        }

        return cached.data;
    }

    deleteMemoryCache(strategy, identifier, params = {}) {
        const key = this.generateMemoryKey(strategy, identifier, params);
        return this.config.fallback.memoryCache.delete(key);
    }

    deleteMemoryCachePattern(strategy, pattern) {
        let deletedCount = 0;
        const prefix = `${strategy}:${pattern}`;

        for (const key of this.config.fallback.memoryCache.keys()) {
            if (key.startsWith(prefix)) {
                this.config.fallback.memoryCache.delete(key);
                deletedCount++;
            }
        }

        return deletedCount;
    }

    cleanupMemoryCache() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, cached] of this.config.fallback.memoryCache.entries()) {
            if (now > cached.expireAt) {
                this.config.fallback.memoryCache.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            this.logger.debug(`清理过期内存缓存: ${cleanedCount} 项`);
        }
    }

    /**
     * 获取统计信息
     */
    async getStats() {
        const stats = {
            initialized: this.isInitialized,
            fallbackMode: this.config.fallback.active || false,
            timestamp: new Date().toISOString()
        };

        // 核心缓存统计
        if (this.cacheService.isAvailable()) {
            stats.cache = await this.cacheService.getStats();
        } else if (this.config.fallback.active) {
            stats.memoryCache = {
                size: this.config.fallback.memoryCache.size,
                maxSize: this.config.fallback.maxSize
            };
        }

        // 查询缓存统计
        if (this.queryCacheService) {
            stats.queryCache = this.queryCacheService.getQueryStats();
        }

        // 预热统计
        if (this.warmupService) {
            stats.warmup = this.warmupService.getStats();
        }

        return stats;
    }

    /**
     * 获取监控报告
     */
    async getMonitoringReport(period = '1h') {
        if (this.monitoringService) {
            return this.monitoringService.getMonitoringReport(period);
        }

        return {
            status: 'monitoring_disabled',
            timestamp: Date.now()
        };
    }

    /**
     * 获取告警历史
     */
    getAlertHistory(limit = 50) {
        if (this.monitoringService) {
            return this.monitoringService.getAlertHistory(limit);
        }

        return {
            alerts: [],
            summary: { active: 0, resolved: 0, total: 0 },
            timestamp: Date.now()
        };
    }

    /**
     * 清空所有缓存
     */
    async flush() {
        let result = 0;

        if (this.cacheService.isAvailable()) {
            result = await this.cacheService.flush();
        }

        if (this.config.fallback.active) {
            const memorySize = this.config.fallback.memoryCache.size;
            this.config.fallback.memoryCache.clear();
            result += memorySize;
        }

        this.logger.info(`清空所有缓存完成: ${result} 项`);
        return result;
    }

    /**
     * 健康检查
     */
    async healthCheck() {
        try {
            const health = {
                status: 'healthy',
                initialized: this.isInitialized,
                fallbackMode: this.config.fallback.active || false,
                services: {},
                timestamp: new Date().toISOString()
            };

            // 核心缓存服务健康检查
            if (this.cacheService) {
                health.services.cache = await this.cacheService.healthCheck();
                if (health.services.cache.status !== 'healthy') {
                    health.status = 'degraded';
                }
            }

            // 查询缓存服务健康检查
            if (this.queryCacheService) {
                health.services.queryCache = await this.queryCacheService.healthCheck();
            }

            // 监控服务健康检查
            if (this.monitoringService) {
                health.services.monitoring = await this.monitoringService.healthCheck();
            }

            // 预热服务健康检查
            if (this.warmupService) {
                health.services.warmup = await this.warmupService.healthCheck();
            }

            return health;
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 关闭缓存管理器
     */
    async close() {
        try {
            this.logger.info('关闭缓存管理器...');

            // 停止监控服务
            if (this.monitoringService) {
                this.monitoringService.stopMonitoring();
            }

            // 停止预热服务
            if (this.warmupService) {
                this.warmupService.stop();
            }

            // 关闭核心缓存服务
            if (this.cacheService) {
                await this.cacheService.close();
            }

            // 清理内存缓存
            if (this.config.fallback.memoryCache) {
                this.config.fallback.memoryCache.clear();
            }

            this.isInitialized = false;
            this.logger.info('缓存管理器已关闭');
        } catch (error) {
            this.logger.error('关闭缓存管理器失败:', error);
        }
    }

    /**
     * 检查是否可用
     */
    isAvailable() {
        return this.isInitialized && (this.cacheService.isAvailable() || this.config.fallback.active);
    }
}

module.exports = CacheManager;