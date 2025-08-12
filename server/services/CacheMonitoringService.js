/**
 * 缓存监控和统计分析服务
 * 提供缓存性能监控、统计分析和告警功能
 */

const CacheService = require('./CacheService');
const winston = require('winston');

class CacheMonitoringService {
    constructor(cacheService) {
        this.cache = cacheService;
        this.isMonitoring = false;

        // 监控配置
        this.config = {
            monitoringInterval: 60000, // 1分钟
            metricsRetention: 24 * 60 * 60 * 1000, // 24小时
            alertThresholds: {
                responseTime: 100, // 100ms
                memoryUsage: 80,   // 80%
                hitRate: 70,       // 70%
                errorRate: 5,      // 5%
                connectionCount: 100
            }
        };

        // 监控数据
        this.metrics = {
            responseTime: [],
            memoryUsage: [],
            hitRate: [],
            errorRate: [],
            connectionCount: [],
            keyCount: [],
            operationsPerSecond: []
        };

        // 告警状态
        this.alerts = {
            active: [],
            history: []
        };

        // 性能基线
        this.baseline = {
            responseTime: 0,
            hitRate: 0,
            operationsPerSecond: 0,
            established: false
        };

        // 配置日志
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/cache-monitoring.log' }),
                new winston.transports.Console({ level: 'warn' })
            ]
        });
    }

    /**
     * 启动监控
     */
    startMonitoring() {
        if (this.isMonitoring) {
            this.logger.warn('缓存监控已在运行');
            return;
        }

        this.logger.info('启动缓存监控服务');
        this.isMonitoring = true;

        // 性能监控
        this.performanceMonitor = setInterval(() => {
            this.collectMetrics();
        }, this.config.monitoringInterval);

        // 告警检查
        this.alertMonitor = setInterval(() => {
            this.checkAlerts();
        }, this.config.monitoringInterval);

        // 数据清理
        this.cleanupMonitor = setInterval(() => {
            this.cleanupOldMetrics();
        }, this.config.monitoringInterval * 10); // 10分钟清理一次

        // 基线更新
        this.baselineMonitor = setInterval(() => {
            this.updateBaseline();
        }, this.config.monitoringInterval * 60); // 1小时更新一次基线
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.logger.info('停止缓存监控服务');
        this.isMonitoring = false;

        if (this.performanceMonitor) {
            clearInterval(this.performanceMonitor);
        }
        if (this.alertMonitor) {
            clearInterval(this.alertMonitor);
        }
        if (this.cleanupMonitor) {
            clearInterval(this.cleanupMonitor);
        }
        if (this.baselineMonitor) {
            clearInterval(this.baselineMonitor);
        }
    }

    /**
     * 收集监控指标
     */
    async collectMetrics() {
        try {
            if (!this.cache.isAvailable()) {
                return;
            }

            const timestamp = Date.now();

            // 响应时间
            const responseTime = await this.measureResponseTime();
            this.addMetric('responseTime', responseTime, timestamp);

            // 缓存统计
            const cacheStats = await this.cache.getStats();

            // 命中率
            const hitRate = parseFloat(cacheStats.hitRate) || 0;
            this.addMetric('hitRate', hitRate, timestamp);

            // 错误率
            const totalOps = cacheStats.hits + cacheStats.misses + cacheStats.sets + cacheStats.deletes;
            const errorRate = totalOps > 0 ? (cacheStats.errors / totalOps) * 100 : 0;
            this.addMetric('errorRate', errorRate, timestamp);

            // 操作频率
            const opsPerSecond = this.calculateOperationsPerSecond(cacheStats);
            this.addMetric('operationsPerSecond', opsPerSecond, timestamp);

            // Redis特定指标
            if (cacheStats.redis) {
                // 内存使用
                const memoryUsage = this.calculateMemoryUsage(cacheStats.redis.memory);
                this.addMetric('memoryUsage', memoryUsage, timestamp);

                // 键数量
                const keyCount = this.calculateTotalKeys(cacheStats.redis.keyspace);
                this.addMetric('keyCount', keyCount, timestamp);

                // 连接数（如果可用）
                if (cacheStats.redis.clients) {
                    this.addMetric('connectionCount', cacheStats.redis.clients.connected_clients || 0, timestamp);
                }
            }

        } catch (error) {
            this.logger.error('收集监控指标失败:', error);
        }
    }

    /**
     * 测量响应时间
     */
    async measureResponseTime() {
        const start = Date.now();
        try {
            await this.cache.get('system_config', 'ping_test');
            return Date.now() - start;
        } catch (error) {
            return -1;
        }
    }

    /**
     * 计算内存使用率
     */
    calculateMemoryUsage(memoryInfo) {
        if (!memoryInfo || !memoryInfo.used_memory || !memoryInfo.maxmemory) {
            return 0;
        }

        if (memoryInfo.maxmemory === 0) {
            return 0; // 无限制
        }

        return (memoryInfo.used_memory / memoryInfo.maxmemory) * 100;
    }

    /**
     * 计算总键数
     */
    calculateTotalKeys(keyspaceInfo) {
        if (!keyspaceInfo) {
            return 0;
        }

        let totalKeys = 0;
        Object.keys(keyspaceInfo).forEach(db => {
            if (db.startsWith('db') && keyspaceInfo[db].keys) {
                totalKeys += keyspaceInfo[db].keys;
            }
        });

        return totalKeys;
    }

    /**
     * 计算每秒操作数
     */
    calculateOperationsPerSecond(stats) {
        const currentTime = Date.now();
        const totalOps = stats.operations || 0;

        if (!this.lastOpsCount || !this.lastOpsTime) {
            this.lastOpsCount = totalOps;
            this.lastOpsTime = currentTime;
            return 0;
        }

        const timeDiff = (currentTime - this.lastOpsTime) / 1000; // 秒
        const opsDiff = totalOps - this.lastOpsCount;

        this.lastOpsCount = totalOps;
        this.lastOpsTime = currentTime;

        return timeDiff > 0 ? opsDiff / timeDiff : 0;
    }

    /**
     * 添加监控指标
     */
    addMetric(type, value, timestamp) {
        if (!this.metrics[type]) {
            this.metrics[type] = [];
        }

        this.metrics[type].push({
            value,
            timestamp
        });

        // 保持指定时间内的数据
        const cutoffTime = timestamp - this.config.metricsRetention;
        this.metrics[type] = this.metrics[type].filter(
            metric => metric.timestamp > cutoffTime
        );
    }

    /**
     * 检查告警
     */
    async checkAlerts() {
        try {
            const currentMetrics = this.getCurrentMetrics();
            const newAlerts = [];

            // 检查响应时间
            if (currentMetrics.responseTime > this.config.alertThresholds.responseTime) {
                newAlerts.push({
                    type: 'response_time',
                    level: 'warning',
                    message: `缓存响应时间过高: ${currentMetrics.responseTime}ms`,
                    value: currentMetrics.responseTime,
                    threshold: this.config.alertThresholds.responseTime,
                    timestamp: Date.now()
                });
            }

            // 检查内存使用
            if (currentMetrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
                newAlerts.push({
                    type: 'memory_usage',
                    level: 'warning',
                    message: `缓存内存使用过高: ${currentMetrics.memoryUsage.toFixed(2)}%`,
                    value: currentMetrics.memoryUsage,
                    threshold: this.config.alertThresholds.memoryUsage,
                    timestamp: Date.now()
                });
            }

            // 检查命中率
            if (currentMetrics.hitRate < this.config.alertThresholds.hitRate) {
                newAlerts.push({
                    type: 'hit_rate',
                    level: 'info',
                    message: `缓存命中率偏低: ${currentMetrics.hitRate.toFixed(2)}%`,
                    value: currentMetrics.hitRate,
                    threshold: this.config.alertThresholds.hitRate,
                    timestamp: Date.now()
                });
            }

            // 检查错误率
            if (currentMetrics.errorRate > this.config.alertThresholds.errorRate) {
                newAlerts.push({
                    type: 'error_rate',
                    level: 'error',
                    message: `缓存错误率过高: ${currentMetrics.errorRate.toFixed(2)}%`,
                    value: currentMetrics.errorRate,
                    threshold: this.config.alertThresholds.errorRate,
                    timestamp: Date.now()
                });
            }

            // 处理新告警
            for (const alert of newAlerts) {
                await this.handleAlert(alert);
            }

            // 清理已解决的告警
            this.clearResolvedAlerts(currentMetrics);

        } catch (error) {
            this.logger.error('告警检查失败:', error);
        }
    }

    /**
     * 处理告警
     */
    async handleAlert(alert) {
        // 检查是否已存在相同类型的活跃告警
        const existingAlert = this.alerts.active.find(a => a.type === alert.type);

        if (existingAlert) {
            // 更新现有告警
            existingAlert.count = (existingAlert.count || 1) + 1;
            existingAlert.lastSeen = alert.timestamp;
            existingAlert.value = alert.value;
        } else {
            // 添加新告警
            alert.id = this.generateAlertId();
            alert.count = 1;
            alert.firstSeen = alert.timestamp;
            alert.lastSeen = alert.timestamp;

            this.alerts.active.push(alert);

            // 记录日志
            this.logger.warn(`缓存告警: ${alert.message}`, {
                type: alert.type,
                level: alert.level,
                value: alert.value,
                threshold: alert.threshold
            });
        }

        // 缓存告警信息
        await this.cache.set('monitoring', 'alerts', this.alerts.active, 300); // 5分钟
    }

    /**
     * 清理已解决的告警
     */
    clearResolvedAlerts(currentMetrics) {
        const resolvedAlerts = [];

        this.alerts.active = this.alerts.active.filter(alert => {
            let isResolved = false;

            switch (alert.type) {
                case 'response_time':
                    isResolved = currentMetrics.responseTime <= this.config.alertThresholds.responseTime;
                    break;
                case 'memory_usage':
                    isResolved = currentMetrics.memoryUsage <= this.config.alertThresholds.memoryUsage;
                    break;
                case 'hit_rate':
                    isResolved = currentMetrics.hitRate >= this.config.alertThresholds.hitRate;
                    break;
                case 'error_rate':
                    isResolved = currentMetrics.errorRate <= this.config.alertThresholds.errorRate;
                    break;
            }

            if (isResolved) {
                alert.resolvedAt = Date.now();
                resolvedAlerts.push(alert);
                this.logger.info(`缓存告警已解决: ${alert.message}`);
            }

            return !isResolved;
        });

        // 将已解决的告警移到历史记录
        this.alerts.history.push(...resolvedAlerts);

        // 限制历史记录数量
        if (this.alerts.history.length > 1000) {
            this.alerts.history = this.alerts.history.slice(-500);
        }
    }

    /**
     * 生成告警ID
     */
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取当前指标
     */
    getCurrentMetrics() {
        const current = {};

        Object.keys(this.metrics).forEach(type => {
            const metrics = this.metrics[type];
            if (metrics.length > 0) {
                current[type] = metrics[metrics.length - 1].value;
            } else {
                current[type] = 0;
            }
        });

        return current;
    }

    /**
     * 获取指标统计
     */
    getMetricStats(type, period = '1h') {
        const metrics = this.metrics[type] || [];
        if (metrics.length === 0) {
            return null;
        }

        const periodMs = this.parsePeriod(period);
        const cutoffTime = Date.now() - periodMs;

        const filteredMetrics = metrics.filter(m => m.timestamp >= cutoffTime);
        if (filteredMetrics.length === 0) {
            return null;
        }

        const values = filteredMetrics.map(m => m.value);

        return {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            latest: values[values.length - 1],
            trend: this.calculateTrend(filteredMetrics),
            period,
            startTime: cutoffTime,
            endTime: Date.now()
        };
    }

    /**
     * 计算趋势
     */
    calculateTrend(metrics) {
        if (metrics.length < 2) {
            return 'stable';
        }

        const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
        const secondHalf = metrics.slice(Math.floor(metrics.length / 2));

        const firstAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

        const change = ((secondAvg - firstAvg) / firstAvg) * 100;

        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }

    /**
     * 解析时间周期
     */
    parsePeriod(period) {
        const match = period.match(/^(\d+)([smhd])$/);
        if (!match) {
            return 60 * 60 * 1000; // 默认1小时
        }

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
     * 更新性能基线
     */
    updateBaseline() {
        try {
            const stats = {
                responseTime: this.getMetricStats('responseTime', '1h'),
                hitRate: this.getMetricStats('hitRate', '1h'),
                operationsPerSecond: this.getMetricStats('operationsPerSecond', '1h')
            };

            if (stats.responseTime && stats.hitRate && stats.operationsPerSecond) {
                this.baseline = {
                    responseTime: stats.responseTime.avg,
                    hitRate: stats.hitRate.avg,
                    operationsPerSecond: stats.operationsPerSecond.avg,
                    established: true,
                    updatedAt: Date.now()
                };

                this.logger.info('性能基线已更新', this.baseline);
            }
        } catch (error) {
            this.logger.error('更新性能基线失败:', error);
        }
    }

    /**
     * 清理过期指标
     */
    cleanupOldMetrics() {
        const cutoffTime = Date.now() - this.config.metricsRetention;
        let totalCleaned = 0;

        Object.keys(this.metrics).forEach(type => {
            const originalLength = this.metrics[type].length;
            this.metrics[type] = this.metrics[type].filter(
                metric => metric.timestamp > cutoffTime
            );

            const cleaned = originalLength - this.metrics[type].length;
            totalCleaned += cleaned;
        });

        if (totalCleaned > 0) {
            this.logger.debug(`清理过期监控数据: ${totalCleaned} 条`);
        }
    }

    /**
     * 获取完整监控报告
     */
    getMonitoringReport(period = '1h') {
        const report = {
            timestamp: Date.now(),
            period,
            status: this.cache.isAvailable() ? 'healthy' : 'unhealthy',
            isMonitoring: this.isMonitoring,
            metrics: {},
            alerts: {
                active: this.alerts.active.length,
                total: this.alerts.history.length + this.alerts.active.length
            },
            baseline: this.baseline,
            thresholds: this.config.alertThresholds
        };

        // 添加各项指标统计
        Object.keys(this.metrics).forEach(type => {
            report.metrics[type] = this.getMetricStats(type, period);
        });

        return report;
    }

    /**
     * 获取告警历史
     */
    getAlertHistory(limit = 50) {
        const allAlerts = [...this.alerts.active, ...this.alerts.history]
            .sort((a, b) => b.timestamp - a.timestamp)
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
            const cacheHealth = await this.cache.healthCheck();
            const currentMetrics = this.getCurrentMetrics();

            return {
                status: cacheHealth.status === 'healthy' && this.isMonitoring ? 'healthy' : 'unhealthy',
                monitoring: {
                    isActive: this.isMonitoring,
                    metricsCount: Object.keys(this.metrics).reduce((sum, type) => sum + this.metrics[type].length, 0),
                    activeAlerts: this.alerts.active.length
                },
                cache: cacheHealth,
                currentMetrics,
                baseline: this.baseline,
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
}

module.exports = CacheMonitoringService;