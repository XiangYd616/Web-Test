/**
 * 增强版数据库连接管理器
 * 提供连接池优化、自动重连、健康检查、故障恢复、性能监控等功能
 */

const { Pool } = require('pg');
const EventEmitter = require('events');

// 简单的日志记录器
const Logger = {
    info: (msg, data) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : ''),
    warn: (msg, data) => console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data) : ''),
    error: (msg, error, data) => console.error(`[ERROR] ${msg}`, error?.message || error, data ? JSON.stringify(data) : ''),
    debug: (msg, data) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${msg}`, data ? JSON.stringify(data) : '');
        }
    }
};

class EnhancedDatabaseConnectionManager extends EventEmitter {
    constructor(config = {}) {
        super();

        // 根据环境自动选择数据库
        const getDefaultDatabase = () => {
            const env = process.env.NODE_ENV || 'development';
            switch (env) {
                case 'production':
                    return 'testweb_prod';
                case 'test':
                    return 'testweb_test';
                default:
                    return 'testweb_dev';
            }
        };

        this.config = {
            // 连接池配置
            max: config.max || parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
            min: config.min || parseInt(process.env.DB_MIN_CONNECTIONS) || 5,
            idleTimeoutMillis: config.idleTimeoutMillis || parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
            connectionTimeoutMillis: config.connectionTimeoutMillis || parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
            acquireTimeoutMillis: config.acquireTimeoutMillis || parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,

            // 重连配置
            retryAttempts: config.retryAttempts || parseInt(process.env.DB_RETRY_ATTEMPTS) || 5,
            retryDelay: config.retryDelay || parseInt(process.env.DB_RETRY_DELAY) || 1000,
            maxRetryDelay: config.maxRetryDelay || parseInt(process.env.DB_MAX_RETRY_DELAY) || 30000,

            // 健康检查配置
            healthCheckInterval: config.healthCheckInterval || parseInt(process.env.DB_HEALTH_CHECK_INTERVAL) || 30000,
            healthCheckQuery: config.healthCheckQuery || 'SELECT 1 as health_check, NOW() as current_time',

            // 数据库配置
            host: config.host || process.env.DB_HOST || 'localhost',
            port: config.port || parseInt(process.env.DB_PORT) || 5432,
            database: config.database || process.env.DB_NAME || getDefaultDatabase(),
            user: config.user || process.env.DB_USER || 'postgres',
            password: config.password || process.env.DB_PASSWORD || 'postgres',

            // SSL配置
            ssl: config.ssl || (process.env.NODE_ENV === 'production' ? {
                rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
            } : false),

            // 应用名称
            application_name: config.application_name || process.env.DB_APPLICATION_NAME || `testweb_${process.env.NODE_ENV || 'dev'}`,

            // 性能配置
            statement_timeout: config.statement_timeout || parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
            query_timeout: config.query_timeout || parseInt(process.env.DB_QUERY_TIMEOUT) || 30000
        };

        this.pool = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.healthCheckTimer = null;
        this.lastHealthCheck = null;
        this.connectionStats = {
            totalConnections: 0,
            activeConnections: 0,
            idleConnections: 0,
            waitingClients: 0,
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            errorCount: 0,
            lastError: null,
            uptime: Date.now(),
            averageQueryTime: 0,
            slowQueries: 0,
            transactionCount: 0,
            commitCount: 0,
            rollbackCount: 0
        };

        // 环境信息
        this.environment = process.env.NODE_ENV || 'development';
        this.isProduction = this.environment === 'production';
    }

    /**
     * 初始化连接池
     */
    async initialize() {
        try {
            Logger.info('初始化增强版数据库连接池', {
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                maxConnections: this.config.max,
                environment: this.environment
            });

            this.pool = new Pool({
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.user,
                password: this.config.password,
                ssl: this.config.ssl,
                max: this.config.max,
                min: this.config.min,
                idleTimeoutMillis: this.config.idleTimeoutMillis,
                connectionTimeoutMillis: this.config.connectionTimeoutMillis,
                acquireTimeoutMillis: this.config.acquireTimeoutMillis,
                application_name: this.config.application_name,

                // 连接级别的优化参数
                options: `-c statement_timeout=${this.config.statement_timeout}ms`
            });

            // 设置连接池事件监听
            this.setupPoolEventListeners();

            // 测试连接
            await this.testConnection();

            this.isConnected = true;
            this.reconnectAttempts = 0;

            // 启动健康检查
            this.startHealthCheck();

            Logger.info('增强版数据库连接池初始化成功');
            this.emit('connected', { config: this.getPublicConfig() });

            return true;

        } catch (error) {
            Logger.error('数据库连接池初始化失败', error);
            await this.handleConnectionError(error);
            throw error;
        }
    }

    /**
     * 设置连接池事件监听
     */
    setupPoolEventListeners() {
        this.pool.on('connect', (client) => {
            this.connectionStats.totalConnections++;
            Logger.debug('新的数据库连接建立', {
                totalConnections: this.connectionStats.totalConnections,
                processId: client.processID
            });

            // 设置连接级别的优化参数
            client.query(`
        SET search_path TO public;
        SET timezone TO 'UTC';
        SET lock_timeout TO '10s';
        SET idle_in_transaction_session_timeout TO '60s';
      `).catch(err => {
                Logger.error('连接初始化参数设置失败', err);
            });

            this.emit('connectionCreated', { processId: client.processID });
        });

        this.pool.on('acquire', (client) => {
            this.connectionStats.activeConnections++;
            Logger.debug('获取数据库连接', {
                activeConnections: this.connectionStats.activeConnections,
                processId: client.processID
            });
        });

        this.pool.on('release', (client) => {
            this.connectionStats.activeConnections--;
            this.connectionStats.idleConnections++;
            Logger.debug('释放数据库连接', {
                activeConnections: this.connectionStats.activeConnections,
                idleConnections: this.connectionStats.idleConnections
            });
        });

        this.pool.on('remove', (client) => {
            this.connectionStats.totalConnections--;
            Logger.debug('移除数据库连接', {
                totalConnections: this.connectionStats.totalConnections,
                processId: client.processID
            });
        });

        this.pool.on('error', (error, client) => {
            this.connectionStats.errorCount++;
            this.connectionStats.lastError = {
                message: error.message,
                code: error.code,
                timestamp: new Date().toISOString(),
                processId: client?.processID
            };

            Logger.error('数据库连接池错误', error, {
                processId: client?.processID
            });

            this.emit('poolError', { error, processId: client?.processID });
            this.handleConnectionError(error);
        });
    }

    /**
     * 测试数据库连接
     */
    async testConnection() {
        const client = await this.pool.connect();
        try {
            const result = await client.query(this.config.healthCheckQuery);
            Logger.debug('数据库连接测试成功', {
                result: result.rows[0],
                processId: client.processID
            });
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * 执行查询（带重连机制和性能监控）
     */
    async query(sql, params = [], options = {}) {
        const { retryOnFailure = true, timeout = this.config.query_timeout } = options;
        const startTime = Date.now();

        this.connectionStats.totalQueries++;

        try {
            // 检查连接状态
            if (!this.isConnected) {
                await this.reconnect();
            }

            // 设置查询超时
            const queryPromise = this.pool.query(sql, params);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
            });

            const result = await Promise.race([queryPromise, timeoutPromise]);
            const duration = Date.now() - startTime;

            // 更新统计信息
            this.connectionStats.successfulQueries++;
            this.updateQueryStats(duration);

            // 记录慢查询
            if (duration > 1000) { // 超过1秒的查询
                this.connectionStats.slowQueries++;
                Logger.warn('慢查询检测', {
                    duration: `${duration}ms`,
                    sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
                    rowCount: result.rowCount
                });
            }

            Logger.debug('数据库查询成功', {
                rowCount: result.rowCount,
                duration: `${duration}ms`
            });

            // 发出查询成功事件
            this.emit('query', { sql, params, duration, rowCount: result.rowCount });

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            this.connectionStats.errorCount++;
            this.connectionStats.failedQueries++;
            this.connectionStats.lastError = {
                message: error.message,
                code: error.code,
                sql: sql.substring(0, 100) + '...',
                timestamp: new Date().toISOString(),
                duration
            };

            Logger.error('数据库查询失败', error, {
                sql: sql.substring(0, 100) + '...',
                params: params?.length || 0,
                duration: `${duration}ms`
            });

            // 发出查询错误事件
            this.emit('queryError', { sql, params, error, duration });

            // 如果是连接错误且允许重试，尝试重连
            if (retryOnFailure && this.isConnectionError(error)) {
                Logger.warn('检测到连接错误，尝试重连');
                await this.reconnect();
                return this.query(sql, params, { ...options, retryOnFailure: false });
            }

            throw error;
        }
    }

    /**
     * 执行事务
     */
    async transaction(callback, options = {}) {
        const client = await this.pool.connect();
        const startTime = Date.now();

        this.connectionStats.transactionCount++;

        try {
            await client.query('BEGIN');
            Logger.debug('事务开始', { processId: client.processID });

            const result = await callback(client);

            await client.query('COMMIT');
            const duration = Date.now() - startTime;

            this.connectionStats.commitCount++;
            Logger.debug('事务提交成功', {
                duration: `${duration}ms`,
                processId: client.processID
            });

            this.emit('transaction', { type: 'commit', duration, processId: client.processID });

            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            const duration = Date.now() - startTime;

            this.connectionStats.rollbackCount++;
            Logger.error('事务回滚', error, {
                duration: `${duration}ms`,
                processId: client.processID
            });

            this.emit('transaction', { type: 'rollback', error, duration, processId: client.processID });

            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 批量插入
     */
    async batchInsert(tableName, columns, values, options = {}) {
        if (!values || values.length === 0) {
            return { rowCount: 0 };
        }

        const { batchSize = 1000 } = options;
        const results = [];

        // 分批处理大量数据
        for (let i = 0; i < values.length; i += batchSize) {
            const batch = values.slice(i, i + batchSize);
            const columnNames = columns.join(', ');
            const placeholders = batch.map((_, index) => {
                const rowPlaceholders = columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`);
                return `(${rowPlaceholders.join(', ')})`;
            }).join(', ');

            const flatValues = batch.flat();
            const query = `INSERT INTO ${tableName} (${columnNames}) VALUES ${placeholders}`;

            try {
                const result = await this.query(query, flatValues);
                results.push(result);
            } catch (error) {
                Logger.error('批量插入失败', error, {
                    tableName,
                    batchIndex: Math.floor(i / batchSize),
                    batchSize: batch.length
                });
                throw error;
            }
        }

        const totalRowCount = results.reduce((sum, result) => sum + result.rowCount, 0);
        return { rowCount: totalRowCount, batches: results.length };
    }

    /**
     * 更新查询统计信息
     */
    updateQueryStats(duration) {
        const totalQueries = this.connectionStats.successfulQueries;
        const currentAvg = this.connectionStats.averageQueryTime;

        // 计算移动平均值
        this.connectionStats.averageQueryTime =
            (currentAvg * (totalQueries - 1) + duration) / totalQueries;
    }

    /**
     * 自动重连
     */
    async reconnect() {
        if (this.reconnectAttempts >= this.config.retryAttempts) {
            throw new Error(`数据库重连失败，已达到最大重试次数: ${this.config.retryAttempts}`);
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            this.config.retryDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.config.maxRetryDelay
        );

        Logger.warn(`数据库重连尝试 ${this.reconnectAttempts}/${this.config.retryAttempts}`, {
            delay,
            nextAttemptIn: delay
        });

        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            // 关闭现有连接池
            if (this.pool) {
                await this.pool.end();
            }

            // 重新初始化
            await this.initialize();

            Logger.info('数据库重连成功', {
                attempts: this.reconnectAttempts
            });

            this.emit('reconnected', { attempts: this.reconnectAttempts });

        } catch (error) {
            Logger.error(`数据库重连失败 (尝试 ${this.reconnectAttempts})`, error);

            if (this.reconnectAttempts < this.config.retryAttempts) {
                return this.reconnect();
            } else {
                this.emit('reconnectFailed', { attempts: this.reconnectAttempts, error });
                throw error;
            }
        }
    }

    /**
     * 启动健康检查
     */
    startHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        this.healthCheckTimer = setInterval(async () => {
            try {
                const result = await this.testConnection();
                this.lastHealthCheck = {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    result
                };

                Logger.debug('数据库健康检查通过', result);
                this.emit('healthCheck', { status: 'healthy', result });

            } catch (error) {
                this.lastHealthCheck = {
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: error.message
                };

                Logger.error('数据库健康检查失败', error);
                this.isConnected = false;

                this.emit('healthCheck', { status: 'unhealthy', error });
                await this.handleConnectionError(error);
            }
        }, this.config.healthCheckInterval);
    }

    /**
     * 处理连接错误
     */
    async handleConnectionError(error) {
        this.isConnected = false;

        Logger.error('数据库连接错误', error, {
            reconnectAttempts: this.reconnectAttempts,
            maxRetryAttempts: this.config.retryAttempts
        });

        this.emit('connectionError', { error, reconnectAttempts: this.reconnectAttempts });

        // 如果还有重试机会，启动重连
        if (this.reconnectAttempts < this.config.retryAttempts) {
            setTimeout(() => {
                this.reconnect().catch(err => {
                    Logger.error('自动重连失败', err);
                });
            }, this.config.retryDelay);
        }
    }

    /**
     * 判断是否为连接错误
     */
    isConnectionError(error) {
        const connectionErrorCodes = [
            'ECONNREFUSED',
            'ENOTFOUND',
            'ETIMEDOUT',
            'ECONNRESET',
            'EPIPE',
            'PROTOCOL_CONNECTION_LOST',
            'CONNECTION_LOST'
        ];

        return connectionErrorCodes.includes(error.code) ||
            error.message.includes('connection') ||
            error.message.includes('timeout') ||
            error.message.includes('server closed the connection');
    }

    /**
     * 获取连接池状态
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            environment: this.environment,
            reconnectAttempts: this.reconnectAttempts,
            lastHealthCheck: this.lastHealthCheck,
            pool: this.pool ? {
                totalCount: this.pool.totalCount,
                idleCount: this.pool.idleCount,
                waitingCount: this.pool.waitingCount
            } : null,
            stats: {
                ...this.connectionStats,
                uptime: Date.now() - this.connectionStats.uptime,
                successRate: this.connectionStats.totalQueries > 0 ?
                    (this.connectionStats.successfulQueries / this.connectionStats.totalQueries * 100).toFixed(2) + '%' : '0%'
            },
            config: this.getPublicConfig()
        };
    }

    /**
     * 获取公开的配置信息（不包含敏感信息）
     */
    getPublicConfig() {
        return {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            max: this.config.max,
            min: this.config.min,
            application_name: this.config.application_name,
            environment: this.environment
        };
    }

    /**
     * 获取性能指标
     */
    getPerformanceMetrics() {
        const uptime = Date.now() - this.connectionStats.uptime;
        const qps = this.connectionStats.totalQueries / (uptime / 1000); // 每秒查询数

        return {
            uptime,
            qps: qps.toFixed(2),
            averageQueryTime: this.connectionStats.averageQueryTime.toFixed(2),
            slowQueries: this.connectionStats.slowQueries,
            successRate: this.connectionStats.totalQueries > 0 ?
                (this.connectionStats.successfulQueries / this.connectionStats.totalQueries * 100).toFixed(2) : 0,
            transactionSuccessRate: this.connectionStats.transactionCount > 0 ?
                (this.connectionStats.commitCount / this.connectionStats.transactionCount * 100).toFixed(2) : 0,
            connectionPoolUtilization: this.pool ?
                ((this.pool.totalCount - this.pool.idleCount) / this.pool.totalCount * 100).toFixed(2) : 0
        };
    }

    /**
     * 关闭连接池
     */
    async close() {
        Logger.info('关闭增强版数据库连接池');

        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }

        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }

        this.isConnected = false;
        this.emit('closed');

        Logger.info('增强版数据库连接池已关闭');
    }
}

module.exports = EnhancedDatabaseConnectionManager;