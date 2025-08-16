/**
 * 数据库监控服务
 * 提供实时数据库性能监控、连接池监控和告警功能
 */

const EventEmitter = require('events');
const winston = require('winston');
const { getConnectionManager } = require('../../config/database.js');

class DatabaseMonitoringService extends EventEmitter {
    constructor() {
        super();
        this.connectionManager = null;
        this.isMonitoring = false;

        // 监控配置
        this.config = {
            monitoringInterval: 30000, // 30秒
            alertThresholds: {
                connectionPoolUsage: 80, // 连接池使用率阈值
                slowQueryTime: 1000, // 慢查询时间阈值（毫秒）
                deadlockCount: 5, // 死锁数量阈值
                lockWaitTime: 5000, // 锁等待时间阈值（毫秒）
                diskUsage: 85, // 磁盘使用率阈值
                cacheHitRatio: 90 // 缓存命中率阈值
            },
            retentionPeriod: 24 * 60 * 60 * 1000, // 24小时数据保留期
            maxHistoryRecords: 2880 // 最大历史记录数（24小时 * 60分钟 / 0.5分钟）
        };

        // 监控数据
        this.metrics = {
            connectionPool: [],
            queryPerformance: [],
            lockStatistics: [],
            cacheStatistics: [],
            diskUsage: [],
            systemLoad: []
        };

        // 告警状态
        this.alerts = {
            active: [],
            history: []
        };

        // 配置日志
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'backend/runtime/logs/db-monitoring.log' }),
                new winston.transports.Console({ level: 'warn' })
            ]
        });
    }

    /**
     * 初始化监控服务
     */
    async initialize() {
        try {
            this.logger.info('初始化数据库监控服务...');

            this.connectionManager = await getConnectionManager();

            // 启动监控
            this.startMonitoring();

            this.logger.info('数据库监控服务初始化完成');
            return true;
        } catch (error) {
            this.logger.error('数据库监控服务初始化失败:', error);
            return false;
        }
    }

    /**
     * 启动监控
     */
    startMonitoring() {
        if (this.isMonitoring) {
            
        this.logger.warn('数据库监控已在运行');
            return;
      }

        this.isMonitoring = true;
        this.logger.info('启动数据库监控');

        // 主监控循环
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics().catch(error => {
                this.logger.error('收集监控指标失败:', error);
            });
        }, this.config.monitoringInterval);

        // 数据清理循环
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldData();
        }, this.config.monitoringInterval * 10); // 每5分钟清理一次

        // 立即执行一次监控
        this.collectMetrics().catch(error => {
            this.logger.error('初始监控指标收集失败:', error);
        });
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            
        return;
      }

        this.isMonitoring = false;
        this.logger.info('停止数据库监控');

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * 收集监控指标
     */
    async collectMetrics() {
        const timestamp = Date.now();

        try {
            // 并行收集各种指标
            const [
                connectionPoolMetrics,
                queryPerformanceMetrics,
                lockStatistics,
                cacheStatistics,
                diskUsage,
                systemLoad
            ] = await Promise.allSettled([
                this.collectConnectionPoolMetrics(),
                this.collectQueryPerformanceMetrics(),
                this.collectLockStatistics(),
                this.collectCacheStatistics(),
                this.collectDiskUsage(),
                this.collectSystemLoad()
            ]);

            // 处理连接池指标
            if (connectionPoolMetrics.status === 'fulfilled') {
                this.addMetric('connectionPool', connectionPoolMetrics.value, timestamp);
                this.checkConnectionPoolAlerts(connectionPoolMetrics.value);
            }

            // 处理查询性能指标
            if (queryPerformanceMetrics.status === 'fulfilled') {
                this.addMetric('queryPerformance', queryPerformanceMetrics.value, timestamp);
                this.checkQueryPerformanceAlerts(queryPerformanceMetrics.value);
            }

            // 处理锁统计
            if (lockStatistics.status === 'fulfilled') {
                this.addMetric('lockStatistics', lockStatistics.value, timestamp);
                this.checkLockAlerts(lockStatistics.value);
            }

            // 处理缓存统计
            if (cacheStatistics.status === 'fulfilled') {
                this.addMetric('cacheStatistics', cacheStatistics.value, timestamp);
                this.checkCacheAlerts(cacheStatistics.value);
            }

            // 处理磁盘使用
            if (diskUsage.status === 'fulfilled') {
                this.addMetric('diskUsage', diskUsage.value, timestamp);
                this.checkDiskUsageAlerts(diskUsage.value);
            }

            // 处理系统负载
            if (systemLoad.status === 'fulfilled') {
                this.addMetric('systemLoad', systemLoad.value, timestamp);
            }

            // 发出监控事件
            this.emit('metricsCollected', {
                timestamp,
                connectionPool: connectionPoolMetrics.value,
                queryPerformance: queryPerformanceMetrics.value,
                lockStatistics: lockStatistics.value,
                cacheStatistics: cacheStatistics.value,
                diskUsage: diskUsage.value,
                systemLoad: systemLoad.value
            });

        } catch (error) {
            this.logger.error('收集监控指标时发生错误:', error);
        }
    }

    /**
     * 收集连接池指标
     */
    async collectConnectionPoolMetrics() {
        try {
            const status = this.connectionManager.getStatus();
            const poolStats = status.pool || {};

            // 获取数据库连接统计
            const connectionStatsQuery = `
                SELECT
                    COUNT(*) as total_connections,
                    COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
                    COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
                    COUNT(CASE WHEN state = 'idle in transaction' THEN 1 END) as idle_in_transaction,
                    COUNT(CASE WHEN waiting THEN 1 END) as waiting_connections
                FROM pg_stat_activity
                WHERE datname = current_database()
            `;

            const result = await this.connectionManager.query(connectionStatsQuery);
            const dbStats = result.rows[0];

            return {
                poolSize: poolStats.totalCount || 0,
                activeConnections: parseInt(dbStats.active_connections) || 0,
                idleConnections: parseInt(dbStats.idle_connections) || 0,
                idleInTransaction: parseInt(dbStats.idle_in_transaction) || 0,
                waitingConnections: parseInt(dbStats.waiting_connections) || 0,
                totalDbConnections: parseInt(dbStats.total_connections) || 0,
                poolUsagePercent: poolStats.totalCount > 0 ?
                    ((poolStats.totalCount - (poolStats.idleCount || 0)) / poolStats.totalCount) * 100 : 0
            };
        } catch (error) {
            this.logger.error('收集连接池指标失败:', error);
            return {};
        }
    }

    /**
     * 收集查询性能指标
     */
    async collectQueryPerformanceMetrics() {
        try {
            // 获取查询统计信息
            const queryStatsQuery = `
                SELECT
                    COUNT(*) as total_queries,
                    AVG(total_time) as avg_query_time,
                    MAX(total_time) as max_query_time,
                    COUNT(CASE WHEN total_time > ${this.config.alertThresholds.slowQueryTime} THEN 1 END) as slow_queries,
                    SUM(calls) as total_calls,
                    SUM(rows) as total_rows
                FROM pg_stat_statements
                WHERE query NOT LIKE '%pg_stat_statements%'
            `;

            try {
                const result = await this.connectionManager.query(queryStatsQuery);
                const stats = result.rows[0];

                return {
                    totalQueries: parseInt(stats.total_queries) || 0,
                    avgQueryTime: parseFloat(stats.avg_query_time) || 0,
                    maxQueryTime: parseFloat(stats.max_query_time) || 0,
                    slowQueries: parseInt(stats.slow_queries) || 0,
                    totalCalls: parseInt(stats.total_calls) || 0,
                    totalRows: parseInt(stats.total_rows) || 0,
                    slowQueryRatio: stats.total_queries > 0 ?
                        (stats.slow_queries / stats.total_queries) * 100 : 0
                };
            } catch (error) {
                // pg_stat_statements 可能未启用
                this.logger.debug('pg_stat_statements 未启用，使用基础查询统计');
                return {
                    totalQueries: 0,
                    avgQueryTime: 0,
                    maxQueryTime: 0,
                    slowQueries: 0,
                    totalCalls: 0,
                    totalRows: 0,
                    slowQueryRatio: 0
                };
            }
        } catch (error) {
            this.logger.error('收集查询性能指标失败:', error);
            return {};
        }
    }

    /**
     * 收集锁统计信息
     */
    async collectLockStatistics() {
        try {
            const lockStatsQuery = `
                SELECT
                    COUNT(*) as total_locks,
                    COUNT(CASE WHEN NOT granted THEN 1 END) as waiting_locks,
                    COUNT(CASE WHEN mode = 'ExclusiveLock' THEN 1 END) as exclusive_locks,
                    COUNT(CASE WHEN mode = 'ShareLock' THEN 1 END) as share_locks
                FROM pg_locks
                WHERE pid != pg_backend_pid()
            `;

            const deadlockQuery = `
                SELECT COUNT(*) as deadlocks
                FROM pg_stat_database
                WHERE datname = current_database()
            `;

            const [lockResult, deadlockResult] = await Promise.all([
                this.connectionManager.query(lockStatsQuery),
                this.connectionManager.query(deadlockQuery)
            ]);

            const lockStats = lockResult.rows[0];
            const deadlockStats = deadlockResult.rows[0];

            return {
                totalLocks: parseInt(lockStats.total_locks) || 0,
                waitingLocks: parseInt(lockStats.waiting_locks) || 0,
                exclusiveLocks: parseInt(lockStats.exclusive_locks) || 0,
                shareLocks: parseInt(lockStats.share_locks) || 0,
                deadlocks: parseInt(deadlockStats.deadlocks) || 0
            };
        } catch (error) {
            this.logger.error('收集锁统计信息失败:', error);
            return {};
        }
    }

    /**
     * 收集缓存统计信息
     */
    async collectCacheStatistics() {
        try {
            const cacheStatsQuery = `
                SELECT
                    SUM(heap_blks_read) as heap_read,
                    SUM(heap_blks_hit) as heap_hit,
                    SUM(idx_blks_read) as idx_read,
                    SUM(idx_blks_hit) as idx_hit
                FROM pg_statio_user_tables
            `;

            const result = await this.connectionManager.query(cacheStatsQuery);
            const stats = result.rows[0];

            const heapRead = parseInt(stats.heap_read) || 0;
            const heapHit = parseInt(stats.heap_hit) || 0;
            const idxRead = parseInt(stats.idx_read) || 0;
            const idxHit = parseInt(stats.idx_hit) || 0;

            const totalRead = heapRead + idxRead;
            const totalHit = heapHit + idxHit;
            const hitRatio = (totalRead + totalHit) > 0 ?
                (totalHit / (totalRead + totalHit)) * 100 : 0;

            return {
                heapBlocksRead: heapRead,
                heapBlocksHit: heapHit,
                indexBlocksRead: idxRead,
                indexBlocksHit: idxHit,
                totalBlocksRead: totalRead,
                totalBlocksHit: totalHit,
                cacheHitRatio: hitRatio
            };
        } catch (error) {
            this.logger.error('收集缓存统计信息失败:', error);
            return {};
        }
    }

    /**
     * 收集磁盘使用信息
     */
    async collectDiskUsage() {
        try {
            const diskUsageQuery = `
                SELECT
                    pg_database_size(current_database()) as database_size,
                    pg_size_pretty(pg_database_size(current_database())) as database_size_pretty
            `;

            const tableSpaceQuery = `
                SELECT
                    spcname,
                    pg_size_pretty(pg_tablespace_size(spcname)) as size
                FROM pg_tablespace
            `;

            const [dbResult, tsResult] = await Promise.all([
                this.connectionManager.query(diskUsageQuery),
                this.connectionManager.query(tableSpaceQuery)
            ]);

            return {
                databaseSize: parseInt(dbResult.rows[0].database_size) || 0,
                databaseSizePretty: dbResult.rows[0].database_size_pretty,
                tablespaces: tsResult.rows
            };
        } catch (error) {
            this.logger.error('收集磁盘使用信息失败:', error);
            return {};
        }
    }

    /**
     * 收集系统负载信息
     */
    async collectSystemLoad() {
        try {
            const systemStatsQuery = `
                SELECT
                    (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
                    (SELECT setting FROM pg_settings WHERE name = 'shared_buffers') as shared_buffers,
                    (SELECT setting FROM pg_settings WHERE name = 'work_mem') as work_mem,
                    (SELECT setting FROM pg_settings WHERE name = 'maintenance_work_mem') as maintenance_work_mem
            `;

            const result = await this.connectionManager.query(systemStatsQuery);
            const settings = result.rows[0];

            return {
                maxConnections: parseInt(settings.max_connections) || 0,
                sharedBuffers: settings.shared_buffers,
                workMem: settings.work_mem,
                maintenanceWorkMem: settings.maintenance_work_mem
            };
        } catch (error) {
            this.logger.error('收集系统负载信息失败:', error);
            return {};
        }
    }

    /**
     * 添加指标数据
     */
    addMetric(type, data, timestamp) {
        if (!this.metrics[type]) {
            this.metrics[type] = [];
        }

        this.metrics[type].push({
            ...data,
            timestamp
        });

        // 限制历史记录数量
        if (this.metrics[type].length > this.config.maxHistoryRecords) {
            this.metrics[type] = this.metrics[type].slice(-this.config.maxHistoryRecords);
        }
    }

    /**
     * 检查连接池告警
     */
    checkConnectionPoolAlerts(metrics) {
        const { poolUsagePercent, waitingConnections } = metrics;

        if (poolUsagePercent > this.config.alertThresholds.connectionPoolUsage) {
            this.createAlert('CONNECTION_POOL_HIGH_USAGE', 'HIGH',
                `连接池使用率过高: ${poolUsagePercent.toFixed(2)}%`);
        }

        if (waitingConnections > 0) {
            this.createAlert('CONNECTION_POOL_WAITING', 'MEDIUM',
                `有 ${waitingConnections} 个连接在等待`);
        }
    }

    /**
     * 检查查询性能告警
     */
    checkQueryPerformanceAlerts(metrics) {
        const { slowQueryRatio, avgQueryTime } = metrics;

        if (slowQueryRatio > 10) { // 慢查询比例超过10%
            this.createAlert('HIGH_SLOW_QUERY_RATIO', 'HIGH',
                `慢查询比例过高: ${slowQueryRatio.toFixed(2)}%`);
        }

        if (avgQueryTime > this.config.alertThresholds.slowQueryTime) {
            this.createAlert('HIGH_AVG_QUERY_TIME', 'MEDIUM',
                `平均查询时间过长: ${avgQueryTime.toFixed(2)}ms`);
        }
    }

    /**
     * 检查锁告警
     */
    checkLockAlerts(metrics) {
        const { waitingLocks, deadlocks } = metrics;

        if (waitingLocks > 5) {
            this.createAlert('HIGH_LOCK_WAITING', 'MEDIUM',
                `有 ${waitingLocks} 个锁在等待`);
        }

        if (deadlocks > this.config.alertThresholds.deadlockCount) {
            this.createAlert('HIGH_DEADLOCK_COUNT', 'HIGH',
                `死锁数量过多: ${deadlocks}`);
        }
    }

    /**
     * 检查缓存告警
     */
    checkCacheAlerts(metrics) {
        const { cacheHitRatio } = metrics;

        if (cacheHitRatio < this.config.alertThresholds.cacheHitRatio) {
            this.createAlert('LOW_CACHE_HIT_RATIO', 'MEDIUM',
                `缓存命中率过低: ${cacheHitRatio.toFixed(2)}%`);
        }
    }

    /**
     * 检查磁盘使用告警
     */
    checkDiskUsageAlerts(metrics) {
        // 这里可以添加磁盘使用率检查
        // 需要额外的系统调用来获取磁盘使用率
    }

    /**
     * 创建告警
     */
    createAlert(type, severity, message) {
        const existingAlert = this.alerts.active.find(alert => alert.type === type);

        if (existingAlert) {
            // 更新现有告警
            existingAlert.count++;
            existingAlert.lastSeen = Date.now();
            existingAlert.message = message;
        } else {
            // 创建新告警
            const alert = {
                id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                type,
                severity,
                message,
                count: 1,
                firstSeen: Date.now(),
                lastSeen: Date.now()
            };

            this.alerts.active.push(alert);

            // 发出告警事件
            this.emit('alert', alert);

            this.logger.warn(`数据库告警: ${message}`, {
                type,
                severity,
                alertId: alert.id
            });
        }
    }

    /**
     * 清理过期数据
     */
    cleanupOldData() {
        const cutoffTime = Date.now() - this.config.retentionPeriod;

        Object.keys(this.metrics).forEach(type => {
            const originalLength = this.metrics[type].length;
            this.metrics[type] = this.metrics[type].filter(
                metric => metric.timestamp > cutoffTime
            );

            const cleaned = originalLength - this.metrics[type].length;
            if (cleaned > 0) {
                this.logger.debug(`清理过期监控数据: ${type}, 清理 ${cleaned} 条记录`);
            }
        });

        // 清理已解决的告警
        this.cleanupResolvedAlerts();
    }

    /**
     * 清理已解决的告警
     */
    cleanupResolvedAlerts() {
        const now = Date.now();
        const resolveTimeout = 5 * 60 * 1000; // 5分钟

        const resolvedAlerts = this.alerts.active.filter(alert =>
            now - alert.lastSeen > resolveTimeout
        );

        if (resolvedAlerts.length > 0) {
            // 移动到历史记录
            resolvedAlerts.forEach(alert => {
                alert.resolvedAt = now;
                this.alerts.history.push(alert);
                this.logger.info(`告警已解决: ${alert.message}`, { alertId: alert.id });
            });

            // 从活跃告警中移除
            this.alerts.active = this.alerts.active.filter(alert =>
                now - alert.lastSeen <= resolveTimeout
            );

            // 限制历史记录数量
            if (this.alerts.history.length > 1000) {
                this.alerts.history = this.alerts.history.slice(-500);
            }
        }
    }

    /**
     * 获取监控报告
     */
    getMonitoringReport(period = '1h') {
        const periodMs = this.parsePeriod(period);
        const cutoffTime = Date.now() - periodMs;

        const report = {
            timestamp: Date.now(),
            period,
            isMonitoring: this.isMonitoring,
            alerts: {
                active: this.alerts.active.length,
                total: this.alerts.history.length + this.alerts.active.length
            },
            metrics: {}
        };

        // 过滤指定时间段的数据
        Object.keys(this.metrics).forEach(type => {
            const filteredData = this.metrics[type].filter(
                metric => metric.timestamp >= cutoffTime
            );

            if (filteredData.length > 0) {
                report.metrics[type] = {
                    count: filteredData.length,
                    latest: filteredData[filteredData.length - 1],
                    summary: this.calculateSummary(filteredData, type)
                };
            }
        });

        return report;
    }

    /**
     * 计算指标摘要
     */
    calculateSummary(data, type) {
        if (data.length === 0) return null;

        const summary = {};

        // 根据指标类型计算不同的摘要
        switch (type) {
            case 'connectionPool':
                summary.avgPoolUsage = this.calculateAverage(data, 'poolUsagePercent');
                summary.maxActiveConnections = this.calculateMax(data, 'activeConnections');
                summary.avgWaitingConnections = this.calculateAverage(data, 'waitingConnections');
                break;

            case 'queryPerformance':
                summary.avgQueryTime = this.calculateAverage(data, 'avgQueryTime');
                summary.maxQueryTime = this.calculateMax(data, 'maxQueryTime');
                summary.avgSlowQueryRatio = this.calculateAverage(data, 'slowQueryRatio');
                break;

            case 'lockStatistics':
                summary.avgTotalLocks = this.calculateAverage(data, 'totalLocks');
                summary.maxWaitingLocks = this.calculateMax(data, 'waitingLocks');
                summary.totalDeadlocks = this.calculateSum(data, 'deadlocks');
                break;

            case 'cacheStatistics':
                summary.avgCacheHitRatio = this.calculateAverage(data, 'cacheHitRatio');
                summary.totalBlocksRead = this.calculateSum(data, 'totalBlocksRead');
                summary.totalBlocksHit = this.calculateSum(data, 'totalBlocksHit');
                break;
        }

        return summary;
    }

    /**
     * 计算平均值
     */
    calculateAverage(data, field) {
        const values = data.map(item => item[field] || 0).filter(val => !isNaN(val));
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    /**
     * 计算最大值
     */
    calculateMax(data, field) {
        const values = data.map(item => item[field] || 0).filter(val => !isNaN(val));
        return values.length > 0 ? Math.max(...values) : 0;
    }

    /**
     * 计算总和
     */
    calculateSum(data, field) {
        const values = data.map(item => item[field] || 0).filter(val => !isNaN(val));
        return values.reduce((a, b) => a + b, 0);
    }

    /**
     * 解析时间周期
     */
    parsePeriod(period) {
        const match = period.match(/^(/d +)([smhd])$/);
        if (!match) return 60 * 60 * 1000; // 默认1小时

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 60 * 60 * 1000;
        }
    }

    /**
     * 获取告警历史
     */
    getAlertHistory(limit = 50) {
        const allAlerts = [...this.alerts.active, ...this.alerts.history]
            .sort((a, b) => b.lastSeen - a.lastSeen)
            .slice(0, limit);

        return {
            alerts: allAlerts,
            summary: {
                active: this.alerts.active.length,
                resolved: this.alerts.history.length,
                total: allAlerts.length
            },
            timestamp: Date.now()
        };
    }

    /**
     * 健康检查
     */
    async healthCheck() {
        try {
            const connectionStatus = this.connectionManager.getStatus();
            const latestMetrics = this.getLatestMetrics();

            return {
                status: connectionStatus.isConnected && this.isMonitoring ? 'healthy' : 'unhealthy',
                monitoring: {
                    isActive: this.isMonitoring,
                    metricsCount: Object.keys(this.metrics).reduce(
                        (sum, type) => sum + this.metrics[type].length, 0
                    ),
                    activeAlerts: this.alerts.active.length
                },
                database: connectionStatus,
                latestMetrics,
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * 获取最新指标
     */
    getLatestMetrics() {
        const latest = {};

        Object.keys(this.metrics).forEach(type => {
            if (this.metrics[type].length > 0) {
                latest[type] = this.metrics[type][this.metrics[type].length - 1];
            }
        });

        return latest;
    }
}

module.exports = DatabaseMonitoringService;