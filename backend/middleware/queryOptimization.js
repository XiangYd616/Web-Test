/**
 * 查询优化中间件
 * 提供查询性能监控、慢查询检测和优化建议
 */

const DatabasePerformanceOptimizer = require('../services/DatabasePerformanceOptimizer');

// 全局性能优化器实例
let performanceOptimizer = null;

/**
 * 初始化性能优化器
 */
async function initializeOptimizer() {
    if (!performanceOptimizer) {
        performanceOptimizer = new DatabasePerformanceOptimizer();
        await performanceOptimizer.initialize();
    }
    return performanceOptimizer;
}

/**
 * 查询性能监控中间件
 */
function queryPerformanceMiddleware() {
    return async (req, res, next) => {
        // 为请求对象添加优化查询方法
        req.optimizedQuery = async (sql, params = [], options = {}) => {
            const startTime = Date.now();

            try {
                // 确保优化器已初始化
                const optimizer = await initializeOptimizer();

                // 执行查询
                const result = await req.db.query(sql, params);

                const duration = Date.now() - startTime;

                // 记录查询性能
                optimizer.recordSlowQuery(sql, duration, params);

                // 在开发环境分析查询计划
                if (process.env.NODE_ENV === 'development' && duration > 100) {
                    const analysis = await optimizer.analyzeQueryPlan(sql, params);
                    if (analysis && analysis.analysis.issues.length > 0) {
                        console.warn('查询性能问题:', {
                            sql: sql.substring(0, 100) + '...',
                            duration: `${duration}ms`,
                            issues: analysis.analysis.issues,
                            suggestions: analysis.suggestions
                        });
                    }
                }

                return {
                    ...result,
                    queryTime: duration,
                    optimized: true
                };
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error('查询执行失败:', {
                    sql: sql.substring(0, 100) + '...',
                    duration: `${duration}ms`,
                    error: error.message
                });
                throw error;
            }
        };

        // 为请求对象添加批量查询方法
        req.batchQuery = async (queries, options = {}) => {
            const startTime = Date.now();
            const results = [];

            try {
                for (const query of queries) {
                    const result = await req.optimizedQuery(query.sql, query.params, query.options);
                    results.push(result);
                }

                const totalDuration = Date.now() - startTime;
                console.log(`批量查询完成: ${queries.length} 个查询, 总耗时: ${totalDuration}ms`);

                return results;
            } catch (error) {
                console.error('批量查询失败:', error);
                throw error;
            }
        };

        // 为请求对象添加事务方法
        req.transaction = async (callback) => {
            const client = await req.db.pool.connect();

            try {
                await client.query('BEGIN');

                // 为事务客户端添加优化查询方法
                client.optimizedQuery = async (sql, params = []) => {
                    const startTime = Date.now();
                    const result = await client.query(sql, params);
                    const duration = Date.now() - startTime;

                    // 记录事务中的查询性能
                    const optimizer = await initializeOptimizer();
                    optimizer.recordSlowQuery(sql, duration, params);

                    return { ...result, queryTime: duration };
                };

                const result = await callback(client);
                await client.query('COMMIT');

                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        };

        next();
    };
}

/**
 * 分页查询优化中间件
 */
function paginationOptimizationMiddleware() {
    return (req, res, next) => {
        // 为请求对象添加优化分页查询方法
        req.paginatedQuery = async (baseQuery, countQuery, options = {}) => {
            const {
                page = 1,
                limit = 20,
                orderBy = 'id',
                orderDirection = 'DESC',
                filters = {}
            } = options;

            const offset = (page - 1) * limit;
            const maxLimit = 100; // 最大限制
            const actualLimit = Math.min(limit, maxLimit);

            try {
                // 构建WHERE条件
                let whereClause = '';
                let params = [];
                let paramIndex = 1;

                if (Object.keys(filters).length > 0) {
                    const conditions = [];
                    for (const [key, value] of Object.entries(filters)) {
                        if (value !== null && value !== undefined && value !== '') {
                            if (Array.isArray(value)) {
                                // IN 查询
                                const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
                                conditions.push(`${key} IN (${placeholders})`);
                                params.push(...value);
                            } else if (typeof value === 'string' && value.includes('%')) {
                                // LIKE 查询
                                conditions.push(`${key} ILIKE $${paramIndex++}`);
                                params.push(value);
                            } else {
                                // 等值查询
                                conditions.push(`${key} = $${paramIndex++}`);
                                params.push(value);
                            }
                        }
                    }

                    if (conditions.length > 0) {
                        whereClause = `WHERE ${conditions.join(' AND ')}`;
                    }
                }

                // 构建完整查询
                const dataQuery = `
                    ${baseQuery}
                    ${whereClause}
                    ORDER BY ${orderBy} ${orderDirection}
                    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
                `;

                const totalCountQuery = `
                    ${countQuery}
                    ${whereClause}
                `;

                // 添加分页参数
                params.push(actualLimit, offset);

                // 并行执行数据查询和计数查询
                const [dataResult, countResult] = await Promise.all([
                    req.optimizedQuery(dataQuery, params),
                    req.optimizedQuery(totalCountQuery, params.slice(0, -2)) // 移除LIMIT和OFFSET参数
                ]);

                const total = parseInt(countResult.rows[0].count) || 0;
                const totalPages = Math.ceil(total / actualLimit);

                return {
                    data: dataResult.rows,
                    pagination: {
                        page: parseInt(page),
                        limit: actualLimit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    },
                    queryTime: dataResult.queryTime + countResult.queryTime
                };
            } catch (error) {
                console.error('分页查询失败:', error);
                throw error;
            }
        };

        next();
    };
}

/**
 * 查询缓存中间件
 */
function queryCacheMiddleware(cacheManager) {
    return (req, res, next) => {
        if (!cacheManager || !cacheManager.isAvailable()) {
            return next();
        }

        // 为请求对象添加缓存查询方法
        req.cachedQuery = async (sql, params = [], options = {}) => {
            const {
                ttl = 300, // 5分钟默认TTL
                skipCache = false,
                cacheKey = null
            } = options;

            if (skipCache) {
                return req.optimizedQuery(sql, params);
            }

            // 生成缓存键
            const key = cacheKey || generateQueryCacheKey(sql, params);

            try {
                // 尝试从缓存获取
                const cached = await cacheManager.get('db_queries', key);
                if (cached) {
                    return {
                        rows: cached.rows,
                        rowCount: cached.rowCount,
                        cached: true,
                        queryTime: 0
                    };
                }

                // 缓存未命中，执行查询
                const result = await req.optimizedQuery(sql, params);

                // 缓存结果（只缓存SELECT查询）
                if (sql.trim().toLowerCase().startsWith('select')) {
                    await cacheManager.set('db_queries', key, {
                        rows: result.rows,
                        rowCount: result.rowCount,
                        timestamp: new Date().toISOString()
                    }, ttl);
                }

                return {
                    ...result,
                    cached: false
                };
            } catch (error) {
                console.error('缓存查询失败:', error);
                // 降级到普通查询
                return req.optimizedQuery(sql, params);
            }
        };

        next();
    };
}

/**
 * 生成查询缓存键
 */
function generateQueryCacheKey(sql, params) {
    const crypto = require('crypto');
    const normalizedSQL = sql.replace(//s+/g, ' ').trim().toLowerCase();
    const paramString = JSON.stringify(params);
    return crypto.createHash('md5').update(normalizedSQL + paramString).digest('hex');
}

/**
 * 查询统计中间件
 */
function queryStatsMiddleware() {
    const stats = {
        totalQueries: 0,
        slowQueries: 0,
        cachedQueries: 0,
        averageQueryTime: 0,
        queryTypes: {}
    };

    return (req, res, next) => {
        // 重写查询方法以收集统计信息
        const originalOptimizedQuery = req.optimizedQuery;

        req.optimizedQuery = async (sql, params = [], options = {}) => {
            const startTime = Date.now();

            try {
                const result = await originalOptimizedQuery.call(req, sql, params, options);
                const duration = result.queryTime || (Date.now() - startTime);

                // 更新统计信息
                stats.totalQueries++;

                if (duration > 1000) {
                    stats.slowQueries++;
                }

                if (result.cached) {
                    stats.cachedQueries++;
                }

                // 更新平均查询时间
                stats.averageQueryTime = (stats.averageQueryTime * (stats.totalQueries - 1) + duration) / stats.totalQueries;

                // 统计查询类型
                const queryType = sql.trim().split(' ')[0].toUpperCase();
                stats.queryTypes[queryType] = (stats.queryTypes[queryType] || 0) + 1;

                return result;
            } catch (error) {
                throw error;
            }
        };

        // 添加获取统计信息的方法
        req.getQueryStats = () => ({ ...stats });

        next();
    };
}

/**
 * 数据库健康检查中间件
 */
function dbHealthCheckMiddleware() {
    return async (req, res, next) => {
        if (req.path === '/api/db/health' && req.method === 'GET') {
            try {
                const optimizer = await initializeOptimizer();
                const health = await optimizer.healthCheck();

                return res.json({
                    success: true,
                    data: health
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'DB_HEALTH_CHECK_ERROR', message: error.message }
                });
            }
        }

        next();
    };
}

/**
 * 性能报告中间件
 */
function performanceReportMiddleware() {
    return async (req, res, next) => {
        if (req.path === '/api/db/performance' && req.method === 'GET') {
            try {
                const optimizer = await initializeOptimizer();
                const report = optimizer.getPerformanceReport();

                return res.json({
                    success: true,
                    data: report
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'PERFORMANCE_REPORT_ERROR', message: error.message }
                });
            }
        }

        if (req.path === '/api/db/optimize' && req.method === 'POST') {
            try {
                if (!req.user || req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        error: { code: 'FORBIDDEN', message: '权限不足' }
                    });
                }

                const optimizer = await initializeOptimizer();
                const result = await optimizer.performOptimization();

                return res.json({
                    success: true,
                    data: result,
                    message: '数据库优化完成'
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'OPTIMIZATION_ERROR', message: error.message }
                });
            }
        }

        next();
    };
}

/**
 * 组合查询优化中间件
 */
function createQueryOptimizationMiddleware(cacheManager, options = {}) {
    const middlewares = [];

    // 基础查询优化
    middlewares.push(queryPerformanceMiddleware());

    // 分页优化
    if (options.pagination !== false) {
        middlewares.push(paginationOptimizationMiddleware());
    }

    // 查询缓存
    if (options.cache !== false && cacheManager) {
        middlewares.push(queryCacheMiddleware(cacheManager));
    }

    // 查询统计
    if (options.stats !== false) {
        middlewares.push(queryStatsMiddleware());
    }

    // 健康检查
    if (options.healthCheck !== false) {
        middlewares.push(dbHealthCheckMiddleware());
    }

    // 性能报告
    if (options.performanceReport !== false) {
        middlewares.push(performanceReportMiddleware());
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
    queryPerformanceMiddleware,
    paginationOptimizationMiddleware,
    queryCacheMiddleware,
    queryStatsMiddleware,
    dbHealthCheckMiddleware,
    performanceReportMiddleware,
    createQueryOptimizationMiddleware,
    initializeOptimizer
};