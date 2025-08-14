/**
 * Redis缓存服务
 * 提供分布式缓存、查询结果缓存、缓存失效策略等功能
 */

const redis = require('redis');
const crypto = require('crypto');
const winston = require('winston');

class CacheService {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.defaultTTL = 3600; // 1小时
        this.keyPrefix = 'testweb:';
        this.version = '1.0';

        // 统计信息
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            operations: 0
        };

        // 缓存策略配置
        this.strategies = {
            // 测试结果缓存 - 24小时
            test_results: {
                ttl: 24 * 60 * 60,
                prefix: 'test:',
                serialize: true,
                compress: true,
                tags: ['test', 'results']
            },

            // 用户会话缓存 - 1小时
            user_sessions: {
                ttl: 60 * 60,
                prefix: 'user:',
                serialize: true,
                compress: false,
                tags: ['user', 'session']
            },

            // API响应缓存 - 15分钟
            api_responses: {
                ttl: 15 * 60,
                prefix: 'api:',
                serialize: true,
                compress: true,
                tags: ['api', 'response']
            },

            // 数据库查询缓存 - 10分钟
            db_queries: {
                ttl: 10 * 60,
                prefix: 'db:',
                serialize: true,
                compress: true,
                tags: ['database', 'query']
            },

            // 系统配置缓存 - 1小时
            system_config: {
                ttl: 60 * 60,
                prefix: 'config:',
                serialize: true,
                compress: false,
                tags: ['system', 'config']
            },

            // 统计数据缓存 - 15分钟
            statistics: {
                ttl: 15 * 60,
                prefix: 'stats:',
                serialize: true,
                compress: true,
                tags: ['statistics', 'analytics']
            },

            // 监控数据缓存 - 5分钟
            monitoring: {
                ttl: 5 * 60,
                prefix: 'monitor:',
                serialize: true,
                compress: false,
                tags: ['monitoring', 'health']
            },

            // 临时数据缓存 - 5分钟
            temporary: {
                ttl: 5 * 60,
                prefix: 'temp:',
                serialize: true,
                compress: false,
                tags: ['temporary']
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
                new winston.transports.File({ filename: 'logs/cache.log' }),
                new winston.transports.Console({ level: 'error' })
            ]
        });

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
            family: 4
        };
    }

    /**
     * 初始化Redis连接
     */
    async initialize() {
        try {
            this.logger.info('初始化Redis缓存服务...');

            // 创建Redis客户端
            this.redis = redis.createClient(this.redisConfig);

            // 设置事件监听
            this.setupEventListeners();

            // 连接到Redis
            await this.redis.connect();

            // 测试连接
            await this.redis.ping();

            this.isConnected = true;
            this.logger.info('Redis缓存服务初始化成功');

            return true;
        } catch (error) {
            this.logger.error('Redis缓存服务初始化失败:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        this.redis.on('connect', () => {
            this.logger.info('Redis连接建立');
            this.isConnected = true;
        });

        this.redis.on('ready', () => {
            this.logger.info('Redis准备就绪');
        });

        this.redis.on('error', (error) => {
            this.logger.error('Redis错误:', error);
            this.isConnected = false;
            this.stats.errors++;
        });

        this.redis.on('end', () => {
            this.logger.warn('Redis连接断开');
            this.isConnected = false;
        });

        this.redis.on('reconnecting', () => {
            this.logger.info('Redis重新连接中...');
        });
    }

    /**
     * 生成缓存键
     */
    generateKey(strategy, identifier, params = {}) {
        const config = this.strategies[strategy];
        if (!config) {
            throw new Error(`未知的缓存策略: ${strategy}`);
        }

        // 基础键
        let key = `${this.keyPrefix}${config.prefix}${identifier}`;

        // 添加参数哈希
        if (Object.keys(params).length > 0) {
            const paramString = JSON.stringify(params, Object.keys(params).sort());
            const paramHash = crypto.createHash('md5').update(paramString).digest('hex').substring(0, 8);
            key += `:${paramHash}`;
        }

        // 添加版本
        key += `:v${this.version}`;

        return key;
    }

    /**
     * 设置缓存
     */
    async set(strategy, identifier, data, customTTL = null, params = {}) {
        if (!this.isConnected) {
            this.logger.warn('Redis未连接，跳过缓存设置');
            return false;
        }

        try {
            const config = this.strategies[strategy];
            if (!config) {
                throw new Error(`未知的缓存策略: ${strategy}`);
            }

            const key = this.generateKey(strategy, identifier, params);
            const ttl = customTTL || config.ttl;

            let value = data;

            // 序列化
            if (config.serialize) {
                value = JSON.stringify(data);
            }

            // 压缩 (简化实现)
            if (config.compress && typeof value === 'string' && value.length > 1000) {
                value = `compressed:${value}`;
            }

            // 设置缓存
            await this.redis.setex(key, ttl, value);

            // 设置标签
            if (config.tags && config.tags.length > 0) {
                await this.setTags(key, config.tags);
            }

            // 更新统计
            this.stats.sets++;
            this.stats.operations++;

            // 记录缓存操作
            await this.recordOperation('set', strategy, key, ttl);

            return true;
        } catch (error) {
            this.logger.error('缓存设置失败:', error);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * 获取缓存
     */
    async get(strategy, identifier, params = {}) {
        if (!this.isConnected) {
            return null;
        }

        try {
            const config = this.strategies[strategy];
            if (!config) {
                throw new Error(`未知的缓存策略: ${strategy}`);
            }

            const key = this.generateKey(strategy, identifier, params);
            let value = await this.redis.get(key);

            if (value === null) {
                // 记录缓存未命中
                this.stats.misses++;
                this.stats.operations++;
                await this.recordOperation('miss', strategy, key);
                return null;
            }

            // 解压缩
            if (value.startsWith('compressed:')) {
                value = value.substring(11);
            }

            // 反序列化
            if (config.serialize) {
                try {
                    value = JSON.parse(value);
                } catch (parseError) {
                    this.logger.error('缓存数据反序列化失败:', parseError);
                    await this.delete(strategy, identifier, params);
                    this.stats.errors++;
                    return null;
                }
            }

            // 更新统计
            this.stats.hits++;
            this.stats.operations++;

            // 记录缓存命中
            await this.recordOperation('hit', strategy, key);

            return value;
        } catch (error) {
            this.logger.error('缓存获取失败:', error);
            this.stats.errors++;
            return null;
        }
    }

    /**
     * 删除缓存
     */
    async delete(strategy, identifier, params = {}) {
        if (!this.isConnected) {
            return false;
        }

        try {
            const key = this.generateKey(strategy, identifier, params);
            const result = await this.redis.del(key);

            // 删除标签
            await this.removeTags(key);

            // 更新统计
            this.stats.deletes++;
            this.stats.operations++;

            // 记录缓存操作
            await this.recordOperation('delete', strategy, key);

            return result > 0;
        } catch (error) {
            this.logger.error('缓存删除失败:', error);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * 批量删除缓存
     */
    async deletePattern(strategy, pattern) {
        if (!this.isConnected) {
            return 0;
        }

        try {
            const config = this.strategies[strategy];
            if (!config) {
                throw new Error(`未知的缓存策略: ${strategy}`);
            }

            const searchPattern = `${this.keyPrefix}${config.prefix}${pattern}*`;
            const keys = await this.redis.keys(searchPattern);

            if (keys.length > 0) {
                const result = await this.redis.del(...keys);

                // 批量删除标签
                await Promise.all(keys.map(key => this.removeTags(key)));

                // 更新统计
                this.stats.deletes += result;
                this.stats.operations += result;

                // 记录批量删除操作
                await this.recordOperation('batch_delete', strategy, searchPattern, null, result);

                return result;
            }

            return 0;
        } catch (error) {
            this.logger.error('批量缓存删除失败:', error);
            this.stats.errors++;
            return 0;
        }
    }

    /**
     * 根据标签删除缓存
     */
    async deleteByTag(tag) {
        if (!this.isConnected) {
            return 0;
        }

        try {
            const tagKey = `${this.keyPrefix}tags:${tag}`;
            const keys = await this.redis.smembers(tagKey);

            if (keys.length > 0) {
                // 删除缓存键
                const result = await this.redis.del(...keys);

                // 删除标签集合
                await this.redis.del(tagKey);

                // 更新统计
                this.stats.deletes += result;
                this.stats.operations += result;

                this.logger.info(`根据标签 ${tag} 删除了 ${result} 个缓存键`);

                return result;
            }

            return 0;
        } catch (error) {
            this.logger.error(`根据标签删除缓存失败 (${tag}):`, error);
            this.stats.errors++;
            return 0;
        }
    }

    /**
     * 设置标签
     */
    async setTags(key, tags) {
        if (!this.isConnected || !tags || tags.length === 0) {
            return;
        }

        try {
            const promises = tags.map(tag => {
                const tagKey = `${this.keyPrefix}tags:${tag}`;
                return this.redis.sadd(tagKey, key);
            });

            await Promise.all(promises);
        } catch (error) {
            this.logger.error('设置缓存标签失败:', error);
        }
    }

    /**
     * 移除标签
     */
    async removeTags(key) {
        if (!this.isConnected) {
            return;
        }

        try {
            // 查找所有标签键
            const tagKeys = await this.redis.keys(`${this.keyPrefix}tags:*`);

            // 从所有标签集合中移除该键
            const promises = tagKeys.map(tagKey => this.redis.srem(tagKey, key));
            await Promise.all(promises);
        } catch (error) {
            this.logger.error('移除缓存标签失败:', error);
        }
    }

    /**
     * 检查缓存是否存在
     */
    async exists(strategy, identifier, params = {}) {
        if (!this.isConnected) {
            return false;
        }

        try {
            const key = this.generateKey(strategy, identifier, params);
            const result = await this.redis.exists(key);
            return result === 1;
        } catch (error) {
            this.logger.error('缓存存在性检查失败:', error);
            return false;
        }
    }

    /**
     * 获取缓存TTL
     */
    async getTTL(strategy, identifier, params = {}) {
        if (!this.isConnected) {
            return -1;
        }

        try {
            const key = this.generateKey(strategy, identifier, params);
            const ttl = await this.redis.ttl(key);
            return ttl;
        } catch (error) {
            this.logger.error('获取缓存TTL失败:', error);
            return -1;
        }
    }

    /**
     * 延长缓存TTL
     */
    async extendTTL(strategy, identifier, additionalSeconds, params = {}) {
        if (!this.isConnected) {
            return false;
        }

        try {
            const key = this.generateKey(strategy, identifier, params);
            const currentTTL = await this.redis.ttl(key);

            if (currentTTL > 0) {
                const newTTL = currentTTL + additionalSeconds;
                await this.redis.expire(key, newTTL);
                return true;
            }

            return false;
        } catch (error) {
            this.logger.error('延长缓存TTL失败:', error);
            return false;
        }
    }

    /**
     * 缓存预热
     */
    async warmup(strategy, dataLoader) {
        if (!this.isConnected) {
            return 0;
        }

        try {
            this.logger.info(`开始缓存预热: ${strategy}`);

            const data = await dataLoader();
            const promises = [];

            for (const [identifier, value] of Object.entries(data)) {
                promises.push(this.set(strategy, identifier, value));
            }

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r).length;

            this.logger.info(`缓存预热完成: ${strategy}, 成功: ${successCount}/${results.length}`);

            return successCount;
        } catch (error) {
            this.logger.error('缓存预热失败:', error);
            return 0;
        }
    }

    /**
     * 批量预热
     */
    async batchWarmup(warmupTasks) {
        if (!this.isConnected) {
            return [];
        }

        try {
            this.logger.info('开始批量缓存预热...');

            const results = await Promise.allSettled(
                warmupTasks.map(task => this.warmup(task.strategy, task.dataLoader))
            );

            const summary = results.map((result, index) => ({
                strategy: warmupTasks[index].strategy,
                success: result.status === 'fulfilled',
                count: result.status === 'fulfilled' ? result.value : 0,
                error: result.status === 'rejected' ? result.reason.message : null
            }));

            const totalSuccess = summary.reduce((sum, item) => sum + item.count, 0);
            this.logger.info(`批量缓存预热完成，总计预热: ${totalSuccess} 个缓存项`);

            return summary;
        } catch (error) {
            this.logger.error('批量缓存预热失败:', error);
            return [];
        }
    }

    /**
     * 获取缓存统计信息
     */
    async getStats() {
        const stats = { ...this.stats };

        if (this.isConnected) {
            try {
                // 获取Redis信息
                const info = await this.redis.info('memory');
                const keyspace = await this.redis.info('keyspace');

                // 获取各策略的键数量
                const strategyStats = {};
                for (const [strategy, config] of Object.entries(this.strategies)) {
                    const pattern = `${this.keyPrefix}${config.prefix}*`;
                    const keys = await this.redis.keys(pattern);
                    strategyStats[strategy] = keys.length;
                }

                stats.redis = {
                    memory: this.parseRedisInfo(info),
                    keyspace: this.parseRedisInfo(keyspace),
                    strategies: strategyStats
                };

                // 计算命中率
                const totalRequests = stats.hits + stats.misses;
                stats.hitRate = totalRequests > 0 ? ((stats.hits / totalRequests) * 100).toFixed(2) : '0.00';

            } catch (error) {
                this.logger.error('获取Redis统计失败:', error);
            }
        }

        stats.connected = this.isConnected;
        stats.timestamp = new Date().toISOString();

        return stats;
    }

    /**
     * 清空所有缓存
     */
    async flush() {
        if (!this.isConnected) {
            return 0;
        }

        try {
            const pattern = `${this.keyPrefix}*`;
            const keys = await this.redis.keys(pattern);

            if (keys.length > 0) {
                const result = await this.redis.del(...keys);

                // 清空标签
                const tagKeys = await this.redis.keys(`${this.keyPrefix}tags:*`);
                if (tagKeys.length > 0) {
                    await this.redis.del(...tagKeys);
                }

                this.logger.info(`清空缓存完成: ${result}个键被删除`);
                return result;
            }

            return 0;
        } catch (error) {
            this.logger.error('清空缓存失败:', error);
            return 0;
        }
    }

    /**
     * 记录缓存操作
     */
    async recordOperation(operation, strategy, key, ttl = null, count = 1) {
        if (!this.isConnected) {
            return;
        }

        try {
            const hour = new Date().toISOString().substring(0, 13);
            const statsKey = `${this.keyPrefix}stats:ops:${hour}`;

            await this.redis.hincrby(statsKey, `${operation}:${strategy}`, count);
            await this.redis.expire(statsKey, 24 * 60 * 60); // 24小时过期

        } catch (error) {
            // 统计失败不影响主要功能
            this.logger.warn('记录缓存操作统计失败:', error);
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
     * 健康检查
     */
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return {
                    status: 'unhealthy',
                    message: 'Redis未连接',
                    timestamp: new Date().toISOString()
                };
            }

            // 测试连接
            const start = Date.now();
            await this.redis.ping();
            const responseTime = Date.now() - start;

            // 获取基本信息
            const info = await this.redis.info('server');
            const memory = await this.redis.info('memory');

            return {
                status: 'healthy',
                responseTime,
                server: this.parseRedisInfo(info),
                memory: this.parseRedisInfo(memory),
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

    /**
     * 关闭连接
     */
    async close() {
        try {
            if (this.redis && this.isConnected) {
                await this.redis.quit();
                this.isConnected = false;
                this.logger.info('Redis连接已关闭');
            }
        } catch (error) {
            this.logger.error('关闭Redis连接失败:', error);
        }
    }

    /**
     * 检查是否可用
     */
    isAvailable() {
        return this.isConnected;
    }
}

// 创建单例实例
const cacheService = new CacheService();

module.exports = cacheService;