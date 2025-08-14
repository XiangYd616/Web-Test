/**
 * 缓存预热和批量操作服务
 * 提供缓存预热、批量操作和热点数据管理功能
 */

const CacheService = require('./CacheService');
const QueryCacheService = require('./QueryCacheService');
const winston = require('winston');

class CacheWarmupService {
    constructor(cacheService, queryCacheService, dbPool) {
        this.cache = cacheService;
        this.queryCache = queryCacheService;
        this.dbPool = dbPool;

        // 预热配置
        this.config = {
            enabled: process.env.CACHE_WARMUP_ENABLED === 'true',
            batchSize: 50,
            concurrency: 5,
            retryAttempts: 3,
            retryDelay: 1000,
            scheduleInterval: 60 * 60 * 1000, // 1小时
            priorities: {
                high: 1,
                medium: 2,
                low: 3
            }
        };

        // 预热任务队列
        this.warmupQueue = [];
        this.isProcessing = false;

        // 预热统计
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            totalItems: 0,
            cachedItems: 0,
            lastWarmup: null,
            averageTime: 0
        };

        // 热点数据配置
        this.hotDataConfig = {
            // 系统配置
            systemConfig: {
                priority: 'high',
                ttl: 2 * 60 * 60, // 2小时
                loader: () => this.loadSystemConfig()
            },

            // 引擎状态
            engineStatus: {
                priority: 'high',
                ttl: 30 * 60, // 30分钟
                loader: () => this.loadEngineStatus()
            },

            // 热门URL
            popularUrls: {
                priority: 'medium',
                ttl: 60 * 60, // 1小时
                loader: () => this.loadPopularUrls()
            },

            // 最近测试
            recentTests: {
                priority: 'medium',
                ttl: 30 * 60, // 30分钟
                loader: () => this.loadRecentTests()
            },

            // 用户统计
            userStats: {
                priority: 'low',
                ttl: 60 * 60, // 1小时
                loader: () => this.loadUserStats()
            },

            // 测试统计
            testStats: {
                priority: 'medium',
                ttl: 15 * 60, // 15分钟
                loader: () => this.loadTestStats()
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
                new winston.transports.File({ filename: 'logs/cache-warmup.log' }),
                new winston.transports.Console({ level: 'warn' })
            ]
        });
    }

    /**
     * 启动预热服务
     */
    async start() {
        if (!this.config.enabled) {
            this.logger.info('缓存预热服务已禁用');
            return false;
        }

        if (!this.cache.isAvailable()) {
            this.logger.warn('缓存服务不可用，跳过预热');
            return false;
        }

        this.logger.info('启动缓存预热服务');

        try {
            // 立即执行一次预热
            await this.performWarmup();

            // 启动定时预热
            this.scheduleWarmup();

            return true;
        } catch (error) {
            this.logger.error('启动缓存预热服务失败:', error);
            return false;
        }
    }

    /**
     * 停止预热服务
     */
    stop() {
        if (this.warmupInterval) {
            clearInterval(this.warmupInterval);
            this.warmupInterval = null;
        }

        this.logger.info('缓存预热服务已停止');
    }

    /**
     * 执行预热
     */
    async performWarmup() {
        if (this.isProcessing) {
            this.logger.warn('预热正在进行中，跳过本次执行');
            return;
        }

        this.isProcessing = true;
        const startTime = Date.now();

        try {
            this.logger.info('开始缓存预热...');

            // 清空队列
            this.warmupQueue = [];

            // 添加预热任务
            this.addWarmupTasks();

            // 按优先级排序
            this.sortWarmupQueue();

            // 执行预热任务
            const results = await this.processWarmupQueue();

            // 更新统计
            this.updateStats(results, Date.now() - startTime);

            this.logger.info(`缓存预热完成: ${results.successful}/${results.total} 成功`);

            return results;
        } catch (error) {
            this.logger.error('缓存预热失败:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 添加预热任务
     */
    addWarmupTasks() {
        Object.entries(this.hotDataConfig).forEach(([key, config]) => {
            this.warmupQueue.push({
                id: `warmup_${key}_${Date.now()}`,
                type: key,
                priority: this.config.priorities[config.priority] || 2,
                loader: config.loader,
                ttl: config.ttl,
                retries: 0,
                maxRetries: this.config.retryAttempts
            });
        });

        this.logger.debug(`添加了 ${this.warmupQueue.length} 个预热任务`);
    }

    /**
     * 排序预热队列
     */
    sortWarmupQueue() {
        this.warmupQueue.sort((a, b) => a.priority - b.priority);
    }

    /**
     * 处理预热队列
     */
    async processWarmupQueue() {
        const results = {
            total: this.warmupQueue.length,
            successful: 0,
            failed: 0,
            details: []
        };

        // 分批处理
        const batches = this.createBatches(this.warmupQueue, this.config.batchSize);

        for (const batch of batches) {
            const batchResults = await this.processBatch(batch);

            results.successful += batchResults.successful;
            results.failed += batchResults.failed;
            results.details.push(...batchResults.details);
        }

        return results;
    }

    /**
     * 创建批次
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * 处理批次
     */
    async processBatch(batch) {
        const results = {
            successful: 0,
            failed: 0,
            details: []
        };

        // 限制并发数
        const semaphore = new Array(this.config.concurrency).fill(null);
        const promises = batch.map(async (task, index) => {
            // 等待信号量
            await this.waitForSemaphore(semaphore, index % this.config.concurrency);

            try {
                const result = await this.executeWarmupTask(task);
                results.successful++;
                results.details.push({
                    taskId: task.id,
                    type: task.type,
                    success: true,
                    itemCount: result.itemCount,
                    duration: result.duration
                });
            } catch (error) {
                results.failed++;
                results.details.push({
                    taskId: task.id,
                    type: task.type,
                    success: false,
                    error: error.message
                });

                this.logger.error(`预热任务失败: ${task.type}`, error);
            } finally {
                // 释放信号量
                semaphore[index % this.config.concurrency] = null;
            }
        });

        await Promise.all(promises);

        return results;
    }

    /**
     * 等待信号量
     */
    async waitForSemaphore(semaphore, index) {
        while (semaphore[index] !== null) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        semaphore[index] = true;
    }

    /**
     * 执行预热任务
     */
    async executeWarmupTask(task) {
        const startTime = Date.now();

        try {
            // 加载数据
            const data = await task.loader();

            if (!data || Object.keys(data).length === 0) {
                this.logger.warn(`预热任务 ${task.type} 没有数据`);
                return { itemCount: 0, duration: Date.now() - startTime };
            }

            // 缓存数据
            let cachedCount = 0;
            const promises = Object.entries(data).map(async ([key, value]) => {
                try {
                    const success = await this.cache.set(
                        this.getStrategyForType(task.type),
                        key,
                        value,
                        task.ttl
                    );
                    if (success) cachedCount++;
                } catch (error) {
                    this.logger.warn(`缓存项失败: ${task.type}:${key}`, error);
                }
            });

            await Promise.all(promises);

            const duration = Date.now() - startTime;

            this.logger.debug(`预热任务完成: ${task.type}, 缓存 ${cachedCount}/${Object.keys(data).length} 项, 耗时 ${duration}ms`);

            return { itemCount: cachedCount, duration };
        } catch (error) {
            // 重试逻辑
            if (task.retries < task.maxRetries) {
                task.retries++;
                this.logger.warn(`预热任务重试: ${task.type}, 第 ${task.retries} 次`);

                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * task.retries));
                return this.executeWarmupTask(task);
            }

            throw error;
        }
    }

    /**
     * 获取类型对应的缓存策略
     */
    getStrategyForType(type) {
        const strategyMap = {
            systemConfig: 'system_config',
            engineStatus: 'system_config',
            popularUrls: 'statistics',
            recentTests: 'test_results',
            userStats: 'statistics',
            testStats: 'statistics'
        };

        return strategyMap[type] || 'temporary';
    }

    /**
     * 加载系统配置
     */
    async loadSystemConfig() {
        try {
            const config = {
                'app.name': 'Test-Web Platform',
                'app.version': '1.0.0',
                'features.seo_test': true,
                'features.performance_test': true,
                'features.security_test': true,
                'features.api_test': true,
                'features.compatibility_test': true,
                'features.accessibility_test': true,
                'features.stress_test': true,
                'limits.free_plan_tests': 10,
                'limits.pro_plan_tests': 100,
                'limits.enterprise_plan_tests': 1000,
                'cache.enabled': true,
                'cache.default_ttl': 3600,
                'monitoring.enabled': true,
                'monitoring.interval': 60
            };

            return config;
        } catch (error) {
            this.logger.error('加载系统配置失败:', error);
            return {};
        }
    }

    /**
     * 加载引擎状态
     */
    async loadEngineStatus() {
        try {
            const engines = {
                seo: { status: 'healthy', lastCheck: new Date().toISOString(), version: '1.0.0' },
                performance: { status: 'healthy', lastCheck: new Date().toISOString(), version: '1.0.0' },
                security: { status: 'healthy', lastCheck: new Date().toISOString(), version: '1.0.0' },
                api: { status: 'healthy', lastCheck: new Date().toISOString(), version: '1.0.0' },
                compatibility: { status: 'healthy', lastCheck: new Date().toISOString(), version: '1.0.0' },
                accessibility: { status: 'healthy', lastCheck: new Date().toISOString(), version: '1.0.0' },
                stress: { status: 'healthy', lastCheck: new Date().toISOString(), version: '1.0.0' }
            };

            return engines;
        } catch (error) {
            this.logger.error('加载引擎状态失败:', error);
            return {};
        }
    }

    /**
     * 加载热门URL
     */
    async loadPopularUrls() {
        try {
            if (!this.dbPool) {
                return {};
            }

            const query = `
        SELECT
          url,
          COUNT(*) as test_count,
          MAX(created_at) as last_test,
          AVG(CASE WHEN overall_score IS NOT NULL THEN overall_score END) as avg_score
        FROM test_results
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY url
        ORDER BY test_count DESC, last_test DESC
        LIMIT 50
      `;

            const result = await this.dbPool.query(query);

            const urls = {};
            result.rows.forEach((row, index) => {
                urls[`popular_url_${index}`] = {
                    url: row.url,
                    testCount: parseInt(row.test_count),
                    lastTest: row.last_test,
                    avgScore: parseFloat(row.avg_score) || 0
                };
            });

            return urls;
        } catch (error) {
            this.logger.error('加载热门URL失败:', error);
            return {};
        }
    }

    /**
     * 加载最近测试
     */
    async loadRecentTests() {
        try {
            if (!this.dbPool) {
                return {};
            }

            const query = `
        SELECT
          id,
          url,
          test_type,
          status,
          overall_score,
          created_at,
          completed_at
        FROM test_results
        WHERE created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 100
      `;

            const result = await this.dbPool.query(query);

            const tests = {};
            result.rows.forEach(row => {
                tests[`recent_test_${row.id}`] = {
                    id: row.id,
                    url: row.url,
                    testType: row.test_type,
                    status: row.status,
                    score: parseFloat(row.overall_score) || 0,
                    createdAt: row.created_at,
                    completedAt: row.completed_at
                };
            });

            return tests;
        } catch (error) {
            this.logger.error('加载最近测试失败:', error);
            return {};
        }
    }

    /**
     * 加载用户统计
     */
    async loadUserStats() {
        try {
            if (!this.dbPool) {
                return {};
            }

            const query = `
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
          COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7d,
          COUNT(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 END) as active_users_30d
        FROM users
        WHERE is_active = true
      `;

            const result = await this.dbPool.query(query);

            if (result.rows.length > 0) {
                return {
                    user_stats: {
                        totalUsers: parseInt(result.rows[0].total_users),
                        newUsers30d: parseInt(result.rows[0].new_users_30d),
                        activeUsers7d: parseInt(result.rows[0].active_users_7d),
                        activeUsers30d: parseInt(result.rows[0].active_users_30d),
                        updatedAt: new Date().toISOString()
                    }
                };
            }

            return {};
        } catch (error) {
            this.logger.error('加载用户统计失败:', error);
            return {};
        }
    }

    /**
     * 加载测试统计
     */
    async loadTestStats() {
        try {
            if (!this.dbPool) {
                return {};
            }

            const query = `
        SELECT
          test_type,
          COUNT(*) as total_tests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
          AVG(CASE WHEN overall_score IS NOT NULL THEN overall_score END) as avg_score,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as tests_24h
        FROM test_results
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY test_type
      `;

            const result = await this.dbPool.query(query);

            const stats = {};
            result.rows.forEach(row => {
                stats[`test_stats_${row.test_type}`] = {
                    testType: row.test_type,
                    totalTests: parseInt(row.total_tests),
                    completedTests: parseInt(row.completed_tests),
                    failedTests: parseInt(row.failed_tests),
                    avgScore: parseFloat(row.avg_score) || 0,
                    tests24h: parseInt(row.tests_24h),
                    successRate: row.total_tests > 0 ?
                        ((row.completed_tests / row.total_tests) * 100).toFixed(2) : '0.00'
                };
            });

            return stats;
        } catch (error) {
            this.logger.error('加载测试统计失败:', error);
            return {};
        }
    }

    /**
     * 定时预热
     */
    scheduleWarmup() {
        this.warmupInterval = setInterval(async () => {
            try {
                await this.performWarmup();
            } catch (error) {
                this.logger.error('定时预热失败:', error);
            }
        }, this.config.scheduleInterval);

        this.logger.info(`定时预热已启动，间隔: ${this.config.scheduleInterval}ms`);
    }

    /**
     * 手动预热特定类型
     */
    async warmupType(type) {
        if (!this.hotDataConfig[type]) {
            throw new Error(`未知的预热类型: ${type}`);
        }

        const config = this.hotDataConfig[type];
        const task = {
            id: `manual_${type}_${Date.now()}`,
            type,
            priority: this.config.priorities[config.priority] || 2,
            loader: config.loader,
            ttl: config.ttl,
            retries: 0,
            maxRetries: this.config.retryAttempts
        };

        try {
            const result = await this.executeWarmupTask(task);
            this.logger.info(`手动预热完成: ${type}, 缓存 ${result.itemCount} 项`);
            return result;
        } catch (error) {
            this.logger.error(`手动预热失败: ${type}`, error);
            throw error;
        }
    }

    /**
     * 批量删除缓存
     */
    async batchDelete(patterns) {
        const results = {
            total: patterns.length,
            successful: 0,
            failed: 0,
            deletedItems: 0,
            details: []
        };

        for (const pattern of patterns) {
            try {
                const deleted = await this.cache.deletePattern(pattern.strategy, pattern.pattern);

                results.successful++;
                results.deletedItems += deleted;
                results.details.push({
                    pattern: pattern.pattern,
                    strategy: pattern.strategy,
                    success: true,
                    deletedCount: deleted
                });

                this.logger.info(`批量删除完成: ${pattern.strategy}:${pattern.pattern}, 删除 ${deleted} 项`);
            } catch (error) {
                results.failed++;
                results.details.push({
                    pattern: pattern.pattern,
                    strategy: pattern.strategy,
                    success: false,
                    error: error.message
                });

                this.logger.error(`批量删除失败: ${pattern.strategy}:${pattern.pattern}`, error);
            }
        }

        return results;
    }

    /**
     * 更新统计信息
     */
    updateStats(results, duration) {
        this.stats.totalTasks += results.total;
        this.stats.completedTasks += results.successful;
        this.stats.failedTasks += results.failed;
        this.stats.totalItems += results.details.reduce((sum, detail) => sum + (detail.itemCount || 0), 0);
        this.stats.cachedItems += results.details.reduce((sum, detail) => sum + (detail.success ? (detail.itemCount || 0) : 0), 0);
        this.stats.lastWarmup = new Date().toISOString();

        // 更新平均时间
        if (this.stats.completedTasks > 0) {
            this.stats.averageTime = (this.stats.averageTime * (this.stats.completedTasks - results.successful) + duration) / this.stats.completedTasks;
        }
    }

    /**
     * 获取预热统计
     */
    getStats() {
        return {
            ...this.stats,
            config: this.config,
            queueSize: this.warmupQueue.length,
            isProcessing: this.isProcessing,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 健康检查
     */
    async healthCheck() {
        try {
            const cacheHealth = await this.cache.healthCheck();

            return {
                status: cacheHealth.status === 'healthy' && this.config.enabled ? 'healthy' : 'unhealthy',
                warmup: {
                    enabled: this.config.enabled,
                    isProcessing: this.isProcessing,
                    queueSize: this.warmupQueue.length,
                    lastWarmup: this.stats.lastWarmup
                },
                cache: cacheHealth,
                stats: this.stats,
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

module.exports = CacheWarmupService;