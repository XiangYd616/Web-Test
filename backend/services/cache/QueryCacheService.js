/**
 * 数据库查询缓存服务
 * 提供查询结果缓存和缓存失效策略
 */

const CacheService = require('./CacheService');
const crypto = require('crypto');
const winston = require('winston');

class QueryCacheService {
    constructor(cacheService, dbPool) {
        this.cache = cacheService;
        this.dbPool = dbPool;

        // 查询统计
        this.queryStats = {
            totalQueries: 0,
            cachedQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            avgQueryTime: 0,
            avgCacheTime: 0
        };

        // 缓存配置
        this.config = {
            defaultTTL: 600, // 10分钟
            maxCacheSize: 1000, // 最大缓存查询数
            enableCompression: true,
            enableStatistics: true
        };

        // 查询类型配置
        this.queryTypes = {
            // 用户查询 - 30分钟
            user: {
                ttl: 30 * 60,
                tables: ['users', 'user_preferences'],
                invalidateOn: ['user_update', 'user_delete']
            },

            // 测试结果查询 - 1小时
            test_results: {
                ttl: 60 * 60,
                tables: ['test_results', 'test_sessions'],
                invalidateOn: ['test_complete', 'test_delete']
            },

            // 系统配置查询 - 2小时
            system_config: {
                ttl: 2 * 60 * 60,
                tables: ['system_config', 'engine_status'],
                invalidateOn: ['config_update']
            },

            // 统计查询 - 15分钟
            statistics: {
                ttl: 15 * 60,
                tables: ['test_results', 'test_sessions', 'users'],
                invalidateOn: ['test_complete', 'user_register']
            },

            // 监控查询 - 5分钟
            monitoring: {
                ttl: 5 * 60,
                tables: ['monitoring_targets', 'monitoring_logs'],
                invalidateOn: ['monitoring_update']
            }
        };

        // 配置日志
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/query-cache.log' }),
                new winston.transports.Console({ level: 'error' })
            ]
        });
    }

    /**
     * 生成查询缓存键
     */
    generateQueryKey(sql, params = []) {
        // 标准化SQL（移除多余空格、换行等）
        const normalizedSQL = sql.replace(/\s+/g, ' ').trim().toLowerCase();

        // 创建参数字符串
        const paramString = JSON.stringify(params);

        // 生成哈希
        const hash = crypto.createHash('md5')
            .update(normalizedSQL + paramString)
            .digest('hex');

        return `query:${hash}`;
    }

    /**
     * 检测查询类型
     */
    detectQueryType(sql) {
        const normalizedSQL = sql.toLowerCase();

        // 检查表名匹配
        for (const [type, config] of Object.entries(this.queryTypes)) {
            for (const table of config.tables) {
                if (normalizedSQL.includes(table)) {
                    return type;
                }
            }
        }

        // 默认类型
        return 'default';
    }

    /**
     * 执行带缓存的查询
     */
    async query(sql, params = [], options = {}) {
        const startTime = Date.now();

        try {
            // 更新统计
            this.queryStats.totalQueries++;

            // 生成缓存键
            const cacheKey = this.generateQueryKey(sql, params);

            // 检测查询类型
            const queryType = options.type || this.detectQueryType(sql);
            const typeConfig = this.queryTypes[queryType] || { ttl: this.config.defaultTTL };

            // 尝试从缓存获取
            if (!options.skipCache) {
                const cacheStart = Date.now();
                const cachedResult = await this.cache.get('db_queries', cacheKey);

                if (cachedResult) {
                    // 缓存命中
                    this.queryStats.cacheHits++;
                    this.queryStats.cachedQueries++;

                    const cacheTime = Date.now() - cacheStart;
                    this.updateAvgCacheTime(cacheTime);

                    this.logger.debug(`查询缓存命中: ${cacheKey}`);

                    return {
                        rows: cachedResult.rows,
                        rowCount: cachedResult.rowCount,
                        cached: true,
                        cacheTime,
                        queryType
                    };
                } else {
                    // 缓存未命中
                    this.queryStats.cacheMisses++;
                }
            }

            // 执行数据库查询
            const queryStart = Date.now();
            const result = await this.dbPool.query(sql, params);
            const queryTime = Date.now() - queryStart;

            this.updateAvgQueryTime(queryTime);

            // 缓存结果（如果不是写操作）
            if (!this.isWriteQuery(sql) && !options.skipCache) {
                const cacheData = {
                    rows: result.rows,
                    rowCount: result.rowCount,
                    timestamp: new Date().toISOString(),
                    queryType
                };

                await this.cache.set(
                    'db_queries',
                    cacheKey,
                    cacheData,
                    options.ttl || typeConfig.ttl
                );

                this.logger.debug(`查询结果已缓存: ${cacheKey}, TTL: ${options.ttl || typeConfig.ttl}s`);
            }

            return {
                rows: result.rows,
                rowCount: result.rowCount,
                cached: false,
                queryTime,
                queryType
            };

        } catch (error) {
            this.logger.error('查询执行失败:', error);
            throw error;
        } finally {
            const totalTime = Date.now() - startTime;
            this.logger.debug(`查询完成，总耗时: ${totalTime}ms`);
        }
    }

    /**
     * 批量查询
     */
    async batchQuery(queries, options = {}) {
        try {
            this.logger.info(`开始批量查询: ${queries.length} 个查询`);

            const results = await Promise.allSettled(
                queries.map(query => this.query(query.sql, query.params, query.options))
            );

            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            this.logger.info(`批量查询完成: ${successful} 成功, ${failed} 失败`);

            return results.map((result, index) => ({
                index,
                success: result.status === 'fulfilled',
                data: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason.message : null
            }));

        } catch (error) {
            this.logger.error('批量查询失败:', error);
            throw error;
        }
    }

    /**
     * 预热查询缓存
     */
    async warmupQueries(queries) {
        try {
            this.logger.info(`开始查询缓存预热: ${queries.length} 个查询`);

            const results = await Promise.allSettled(
                queries.map(query => this.query(query.sql, query.params, {
                    ...query.options,
                    skipCache: true // 跳过缓存读取，强制执行查询
                }))
            );

            const successful = results.filter(r => r.status === 'fulfilled').length;

            this.logger.info(`查询缓存预热完成: ${successful}/${queries.length}`);

            return successful;
        } catch (error) {
            this.logger.error('查询缓存预热失败:', error);
            return 0;
        }
    }

    /**
     * 使缓存失效
     */
    async invalidateCache(pattern) {
        try {
            const deletedCount = await this.cache.deletePattern('db_queries', pattern);

            this.logger.info(`缓存失效完成: ${pattern}, 删除 ${deletedCount} 个缓存项`);

            return deletedCount;
        } catch (error) {
            this.logger.error('缓存失效失败:', error);
            return 0;
        }
    }

    /**
     * 根据事件使缓存失效
     */
    async invalidateByEvent(event) {
        try {
            let totalDeleted = 0;

            // 查找需要失效的查询类型
            for (const [type, config] of Object.entries(this.queryTypes)) {
                if (config.invalidateOn.includes(event)) {
                    const pattern = `*`; // 简化实现，实际可以更精确
                    const deleted = await this.cache.deletePattern('db_queries', pattern);
                    totalDeleted += deleted;

                    this.logger.info(`事件 ${event} 触发 ${type} 类型缓存失效: ${deleted} 个`);
                }
            }

            return totalDeleted;
        } catch (error) {
            this.logger.error(`事件缓存失效失败 (${event}):`, error);
            return 0;
        }
    }

    /**
     * 根据表名使缓存失效
     */
    async invalidateByTable(tableName) {
        try {
            let totalDeleted = 0;

            // 查找涉及该表的查询类型
            for (const [type, config] of Object.entries(this.queryTypes)) {
                if (config.tables.includes(tableName)) {
                    const pattern = `*`; // 简化实现
                    const deleted = await this.cache.deletePattern('db_queries', pattern);
                    totalDeleted += deleted;

                    this.logger.info(`表 ${tableName} 变更触发 ${type} 类型缓存失效: ${deleted} 个`);
                }
            }

            return totalDeleted;
        } catch (error) {
            this.logger.error(`表缓存失效失败 (${tableName}):`, error);
            return 0;
        }
    }

    /**
     * 检查是否为写操作
     */
    isWriteQuery(sql) {
        const normalizedSQL = sql.trim().toLowerCase();
        const writeOperations = ['insert', 'update', 'delete', 'create', 'drop', 'alter', 'truncate'];

        return writeOperations.some(op => normalizedSQL.startsWith(op));
    }

    /**
     * 更新平均查询时间
     */
    updateAvgQueryTime(queryTime) {
        if (this.queryStats.totalQueries === 1) {
            this.queryStats.avgQueryTime = queryTime;
        } else {
            this.queryStats.avgQueryTime = (
                (this.queryStats.avgQueryTime * (this.queryStats.totalQueries - 1) + queryTime) /
                this.queryStats.totalQueries
            );
        }
    }

    /**
     * 更新平均缓存时间
     */
    updateAvgCacheTime(cacheTime) {
        if (this.queryStats.cacheHits === 1) {
            this.queryStats.avgCacheTime = cacheTime;
        } else {
            this.queryStats.avgCacheTime = (
                (this.queryStats.avgCacheTime * (this.queryStats.cacheHits - 1) + cacheTime) /
                this.queryStats.cacheHits
            );
        }
    }

    /**
     * 获取查询统计
     */
    getQueryStats() {
        const stats = { ...this.queryStats };

        // 计算命中率
        const totalCacheRequests = stats.cacheHits + stats.cacheMisses;
        stats.cacheHitRate = totalCacheRequests > 0 ?
            ((stats.cacheHits / totalCacheRequests) * 100).toFixed(2) : '0.00';

        // 计算缓存使用率
        stats.cacheUsageRate = stats.totalQueries > 0 ?
            ((stats.cachedQueries / stats.totalQueries) * 100).toFixed(2) : '0.00';

        // 性能提升计算
        if (stats.avgQueryTime > 0 && stats.avgCacheTime > 0) {
            stats.performanceImprovement = (
                ((stats.avgQueryTime - stats.avgCacheTime) / stats.avgQueryTime) * 100
            ).toFixed(2);
        } else {
            stats.performanceImprovement = '0.00';
        }

        stats.timestamp = new Date().toISOString();

        return stats;
    }

    /**
     * 获取缓存大小
     */
    async getCacheSize() {
        try {
            const stats = await this.cache.getStats();
            return stats.redis?.strategies?.db_queries || 0;
        } catch (error) {
            this.logger.error('获取缓存大小失败:', error);
            return 0;
        }
    }

    /**
     * 清理过期缓存
     */
    async cleanupExpiredCache() {
        try {
            this.logger.info('开始清理过期查询缓存...');

            // Redis会自动清理过期键，这里主要是统计和日志
            const beforeSize = await this.getCacheSize();

            // 触发Redis的过期键清理（通过访问一个不存在的键）
            await this.cache.get('db_queries', 'cleanup_trigger');

            const afterSize = await this.getCacheSize();
            const cleaned = beforeSize - afterSize;

            if (cleaned > 0) {
                this.logger.info(`清理过期查询缓存完成: ${cleaned} 个`);
            }

            return cleaned;
        } catch (error) {
            this.logger.error('清理过期缓存失败:', error);
            return 0;
        }
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.queryStats = {
            totalQueries: 0,
            cachedQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            avgQueryTime: 0,
            avgCacheTime: 0
        };

        this.logger.info('查询缓存统计信息已重置');
    }

    /**
     * 获取热门查询
     */
    async getPopularQueries(limit = 10) {
        try {
            // 这里简化实现，实际可以维护查询频率统计
            const stats = await this.cache.getStats();

            return {
                totalQueries: this.queryStats.totalQueries,
                cachedQueries: this.queryStats.cachedQueries,
                cacheHitRate: this.getQueryStats().cacheHitRate,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('获取热门查询失败:', error);
            return null;
        }
    }

    /**
     * 健康检查
     */
    async healthCheck() {
        try {
            const cacheHealth = await this.cache.healthCheck();
            const queryStats = this.getQueryStats();

            return {
                status: cacheHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
                cache: cacheHealth,
                queries: queryStats,
                config: this.config,
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
}

module.exports = QueryCacheService;