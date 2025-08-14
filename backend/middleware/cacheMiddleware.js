/**
 * 缓存中间件
 * 提供API响应缓存、查询缓存和缓存管理功能
 */

const crypto = require('crypto');

/**
 * API响应缓存中间件
 */
function apiCacheMiddleware(cacheManager, options = {}) {
    const defaultOptions = {
        ttl: 15 * 60, // 15分钟
        skipCache: false,
        varyBy: ['url', 'user'],
        excludeMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
        excludeStatus: [400, 401, 403, 404, 500, 502, 503, 504],
        keyGenerator: null,
        condition: null
    };

    const config = { ...defaultOptions, ...options };

    return async (req, res, next) => {
        try {
            // 检查是否跳过缓存
            if (config.skipCache || !cacheManager.isAvailable()) {
                return next();
            }

            // 检查HTTP方法
            if (config.excludeMethods.includes(req.method)) {
                return next();
            }

            // 检查条件
            if (config.condition && !config.condition(req)) {
                return next();
            }

            // 生成缓存键
            const cacheKey = config.keyGenerator ?
                config.keyGenerator(req) :
                generateApiCacheKey(req, config.varyBy);

            // 尝试从缓存获取
            const cachedResponse = await cacheManager.get('api_responses', cacheKey);

            if (cachedResponse) {
                // 设置缓存头
                res.set('X-Cache', 'HIT');
                res.set('X-Cache-Key', cacheKey);

                // 返回缓存的响应
                return res.status(cachedResponse.status).json(cachedResponse.data);
            }

            // 缓存未命中，继续处理请求
            res.set('X-Cache', 'MISS');
            res.set('X-Cache-Key', cacheKey);

            // 重写res.json以缓存响应
            const originalJson = res.json;
            res.json = function (data) {
                // 检查状态码是否应该缓存
                if (!config.excludeStatus.includes(res.statusCode)) {
                    // 异步缓存响应
                    setImmediate(async () => {
                        try {
                            await cacheManager.set('api_responses', cacheKey, {
                                status: res.statusCode,
                                data: data,
                                headers: res.getHeaders(),
                                timestamp: new Date().toISOString()
                            }, config.ttl);
                        } catch (error) {
                            console.error('缓存API响应失败:', error);
                        }
                    });
                }

                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            console.error('API缓存中间件错误:', error);
            next();
        }
    };
}

/**
 * 查询缓存中间件
 */
function queryCacheMiddleware(cacheManager, options = {}) {
    const defaultOptions = {
        enabled: true,
        ttl: 10 * 60, // 10分钟
        skipCache: false
    };

    const config = { ...defaultOptions, ...options };

    return (req, res, next) => {
        if (!config.enabled || !cacheManager.isAvailable()) {
            return next();
        }

        // 为req对象添加缓存查询方法
        req.cachedQuery = async (sql, params = [], queryOptions = {}) => {
            const options = {
                ...config,
                ...queryOptions,
                skipCache: config.skipCache || queryOptions.skipCache
            };

            return await cacheManager.query(sql, params, options);
        };

        next();
    };
}

/**
 * 缓存失效中间件
 */
function cacheInvalidationMiddleware(cacheManager) {
    return (req, res, next) => {
        if (!cacheManager.isAvailable()) {
            return next();
        }

        // 为req对象添加缓存失效方法
        req.invalidateCache = {
            byPattern: async (pattern) => {
                return await cacheManager.invalidateCache(pattern);
            },

            byEvent: async (event) => {
                return await cacheManager.invalidateByEvent(event);
            },

            byTable: async (tableName) => {
                return await cacheManager.invalidateByTable(tableName);
            },

            byTag: async (tag) => {
                return await cacheManager.deleteByTag(tag);
            }
        };

        // 监听响应完成事件，根据操作类型自动失效缓存
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                autoInvalidateCache(req, cacheManager);
            }
        });

        next();
    };
}

/**
 * 缓存统计中间件
 */
function cacheStatsMiddleware(cacheManager) {
    return (req, res, next) => {
        if (!cacheManager.isAvailable()) {
            return next();
        }

        // 记录请求开始时间
        req.cacheStartTime = Date.now();

        // 为res对象添加缓存统计信息
        const originalJson = res.json;
        res.json = function (data) {
            const responseTime = Date.now() - req.cacheStartTime;

            // 添加缓存统计头
            res.set('X-Response-Time', `${responseTime}ms`);

            if (res.get('X-Cache')) {
                res.set('X-Cache-Response-Time', `${responseTime}ms`);
            }

            return originalJson.call(this, data);
        };

        next();
    };
}

/**
 * 缓存预热中间件
 */
function cacheWarmupMiddleware(cacheManager) {
    return async (req, res, next) => {
        // 为管理员用户提供预热接口
        if (req.path === '/api/cache/warmup' && req.method === 'POST') {
            try {
                if (!req.user || req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        error: { code: 'FORBIDDEN', message: '权限不足' }
                    });
                }

                const { type } = req.body;

                if (type) {
                    // 预热特定类型
                    const result = await cacheManager.warmupType(type);
                    return res.json({
                        success: true,
                        data: result,
                        message: `预热完成: ${type}`
                    });
                } else {
                    // 全量预热
                    const result = await cacheManager.performWarmup();
                    return res.json({
                        success: true,
                        data: result,
                        message: '全量预热完成'
                    });
                }
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'WARMUP_ERROR', message: error.message }
                });
            }
        }

        next();
    };
}

/**
 * 生成API缓存键
 */
function generateApiCacheKey(req, varyBy = ['url', 'user']) {
    const keyParts = [];

    varyBy.forEach(factor => {
        switch (factor) {
            case 'url':
                keyParts.push(req.originalUrl || req.url);
                break;
            case 'user':
                keyParts.push(req.user ? req.user.id : 'anonymous');
                break;
            case 'method':
                keyParts.push(req.method);
                break;
            case 'query':
                keyParts.push(JSON.stringify(req.query));
                break;
            case 'body':
                keyParts.push(JSON.stringify(req.body));
                break;
            case 'headers':
                keyParts.push(JSON.stringify(req.headers));
                break;
            default:
                if (req[factor]) {
                    keyParts.push(req[factor]);
                }
        }
    });

    const keyString = keyParts.join(':');
    return crypto.createHash('md5').update(keyString).digest('hex');
}

/**
 * 自动缓存失效
 */
async function autoInvalidateCache(req, cacheManager) {
    try {
        const method = req.method;
        const path = req.path;

        // 根据请求路径和方法自动失效相关缓存
        if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
            // 测试相关操作
            if (path.includes('/api/test') || path.includes('/api/v1/test')) {
                await cacheManager.invalidateByEvent('test_update');
                await cacheManager.invalidateByTag('test');
            }

            // 用户相关操作
            if (path.includes('/api/user') || path.includes('/api/v1/user')) {
                await cacheManager.invalidateByEvent('user_update');
                await cacheManager.invalidateByTag('user');
            }

            // 系统配置相关操作
            if (path.includes('/api/config') || path.includes('/api/v1/config')) {
                await cacheManager.invalidateByEvent('config_update');
                await cacheManager.invalidateByTag('config');
            }

            // 监控相关操作
            if (path.includes('/api/monitoring') || path.includes('/api/v1/monitoring')) {
                await cacheManager.invalidateByEvent('monitoring_update');
                await cacheManager.invalidateByTag('monitoring');
            }
        }
    } catch (error) {
        console.error('自动缓存失效失败:', error);
    }
}

/**
 * 缓存健康检查中间件
 */
function cacheHealthMiddleware(cacheManager) {
    return async (req, res, next) => {
        if (req.path === '/api/cache/health' && req.method === 'GET') {
            try {
                const health = await cacheManager.healthCheck();
                return res.json({
                    success: true,
                    data: health
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'HEALTH_CHECK_ERROR', message: error.message }
                });
            }
        }

        next();
    };
}

/**
 * 缓存统计API中间件
 */
function cacheStatsApiMiddleware(cacheManager) {
    return async (req, res, next) => {
        if (req.path === '/api/cache/stats' && req.method === 'GET') {
            try {
                const stats = await cacheManager.getStats();
                return res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'STATS_ERROR', message: error.message }
                });
            }
        }

        if (req.path === '/api/cache/monitoring' && req.method === 'GET') {
            try {
                const period = req.query.period || '1h';
                const report = await cacheManager.getMonitoringReport(period);
                return res.json({
                    success: true,
                    data: report
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'MONITORING_ERROR', message: error.message }
                });
            }
        }

        next();
    };
}

/**
 * 缓存管理API中间件
 */
function cacheManagementMiddleware(cacheManager) {
    return async (req, res, next) => {
        // 清空缓存
        if (req.path === '/api/cache/flush' && req.method === 'POST') {
            try {
                if (!req.user || req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        error: { code: 'FORBIDDEN', message: '权限不足' }
                    });
                }

                const result = await cacheManager.flush();
                return res.json({
                    success: true,
                    data: { deletedItems: result },
                    message: '缓存清空完成'
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'FLUSH_ERROR', message: error.message }
                });
            }
        }

        // 批量删除缓存
        if (req.path === '/api/cache/batch-delete' && req.method === 'POST') {
            try {
                if (!req.user || req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        error: { code: 'FORBIDDEN', message: '权限不足' }
                    });
                }

                const { patterns } = req.body;
                if (!patterns || !Array.isArray(patterns)) {
                    return res.status(400).json({
                        success: false,
                        error: { code: 'INVALID_PATTERNS', message: '无效的删除模式' }
                    });
                }

                const result = await cacheManager.batchDelete(patterns);
                return res.json({
                    success: true,
                    data: result,
                    message: '批量删除完成'
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'BATCH_DELETE_ERROR', message: error.message }
                });
            }
        }

        next();
    };
}

/**
 * 组合缓存中间件
 */
function createCacheMiddleware(cacheManager, options = {}) {
    const middlewares = [];

    // 基础缓存功能
    if (options.apiCache !== false) {
        middlewares.push(apiCacheMiddleware(cacheManager, options.apiCache));
    }

    if (options.queryCache !== false) {
        middlewares.push(queryCacheMiddleware(cacheManager, options.queryCache));
    }

    if (options.invalidation !== false) {
        middlewares.push(cacheInvalidationMiddleware(cacheManager));
    }

    if (options.stats !== false) {
        middlewares.push(cacheStatsMiddleware(cacheManager));
    }

    // 管理功能
    if (options.warmup !== false) {
        middlewares.push(cacheWarmupMiddleware(cacheManager));
    }

    if (options.health !== false) {
        middlewares.push(cacheHealthMiddleware(cacheManager));
    }

    if (options.statsApi !== false) {
        middlewares.push(cacheStatsApiMiddleware(cacheManager));
    }

    if (options.management !== false) {
        middlewares.push(cacheManagementMiddleware(cacheManager));
    }

    // 返回组合中间件
    return (req, res, next) => {
        let index = 0;

        function runNext() {
            if (index >= middlewares.length) {
                return next();
            }

            const middleware = middlewares[index++];
            middleware(req, res, runNext);
        }

        runNext();
    };
}

module.exports = {
    apiCacheMiddleware,
    queryCacheMiddleware,
    cacheInvalidationMiddleware,
    cacheStatsMiddleware,
    cacheWarmupMiddleware,
    cacheHealthMiddleware,
    cacheStatsApiMiddleware,
    cacheManagementMiddleware,
    createCacheMiddleware,
    generateApiCacheKey
};