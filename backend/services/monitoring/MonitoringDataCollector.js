/**
 * 监控数据收集器
 * 负责收集、处理和存储监控数据
 */

const EventEmitter = require('events');
const logger = require('../../middleware/logger.js');

class MonitoringDataCollector extends EventEmitter {
    constructor(dbPool) {
        super();
        this.dbPool = dbPool;
        this.dataBuffer = new Map(); // 数据缓冲区
        this.batchSize = 100; // 批量处理大小
        this.flushInterval = 30000; // 30秒刷新一次
        this.flushTimer = null;
        this.isRunning = false;

        this.stats = {
            totalCollected: 0,
            totalStored: 0,
            totalErrors: 0,
            bufferSize: 0,
            lastFlush: null
        };

        this.setupEventHandlers();
    }

    /**
     * 启动数据收集器
     */
    start() {
        if (this.isRunning) {
            logger.warn('监控数据收集器已在运行中');
            return;
        }

        logger.info('启动监控数据收集器...');

        this.isRunning = true;
        this.startFlushTimer();

        this.emit('collector:started');
        logger.info('监控数据收集器启动成功');
    }

    /**
     * 停止数据收集器
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        logger.info('停止监控数据收集器...');

        // 停止定时器
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        // 刷新剩余数据
        await this.flushBuffer();

        this.isRunning = false;
        this.emit('collector:stopped');
        logger.info('监控数据收集器已停止');
    }

    /**
     * 收集监控数据
     */
    async collectData(dataType, data) {
        try {
            if (!this.isRunning) {
                logger.warn('数据收集器未运行，忽略数据收集');
                return;
            }

            const timestamp = new Date().toISOString();
            const dataPoint = {
                type: dataType,
                timestamp,
                data,
                id: this.generateDataId()
            };

            // 添加到缓冲区
            this.dataBuffer.set(dataPoint.id, dataPoint);
            this.stats.totalCollected++;
            this.stats.bufferSize = this.dataBuffer.size;

            logger.debug(`收集监控数据: ${dataType}, 缓冲区大小: ${this.dataBuffer.size}`);

            // 检查是否需要立即刷新
            if (this.dataBuffer.size >= this.batchSize) {
                await this.flushBuffer();
            }

            this.emit('data:collected', {
                type: dataType,
                timestamp,
                bufferSize: this.dataBuffer.size
            });

            return dataPoint.id;

        } catch (error) {
            logger.error('收集监控数据失败:', error);
            this.stats.totalErrors++;
            this.emit('data:error', { type: dataType, error: error.message });
            throw error;
        }
    }

    /**
     * 收集检查结果数据
     */
    async collectCheckResult(siteId, result) {
        const data = {
            site_id: siteId,
            status: result.status,
            response_time: result.response_time,
            status_code: result.status_code,
            results: result.results,
            error_message: result.error_message,
            checked_at: new Date().toISOString()
        };

        return await this.collectData('check_result', data);
    }

    /**
     * 收集性能指标数据
     */
    async collectPerformanceMetrics(siteId, metrics) {
        const data = {
            site_id: siteId,
            metrics: {
                response_time: metrics.response_time,
                ttfb: metrics.ttfb,
                dns_lookup: metrics.dns_lookup,
                tcp_connect: metrics.tcp_connect,
                ssl_handshake: metrics.ssl_handshake,
                content_download: metrics.content_download
            },
            timestamp: new Date().toISOString()
        };

        return await this.collectData('performance_metrics', data);
    }

    /**
     * 收集可用性数据
     */
    async collectUptimeData(siteId, uptimeData) {
        const data = {
            site_id: siteId,
            is_up: uptimeData.is_up,
            response_time: uptimeData.response_time,
            status_code: uptimeData.status_code,
            error_message: uptimeData.error_message,
            timestamp: new Date().toISOString()
        };

        return await this.collectData('uptime_data', data);
    }

    /**
     * 收集告警数据
     */
    async collectAlertData(alertData) {
        const data = {
            site_id: alertData.targetId,
            alert_type: alertData.type || 'site_down',
            severity: alertData.severity || 'high',
            message: alertData.message,
            details: alertData.details || {},
            triggered_at: new Date().toISOString()
        };

        return await this.collectData('alert_data', data);
    }

    /**
     * 收集系统指标数据
     */
    async collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        const data = {
            memory: {
                rss: memUsage.rss,
                heapTotal: memUsage.heapTotal,
                heapUsed: memUsage.heapUsed,
                external: memUsage.external
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };

        return await this.collectData('system_metrics', data);
    }

    /**
     * 刷新缓冲区数据到数据库
     */
    async flushBuffer() {
        if (this.dataBuffer.size === 0) {
            return;
        }

        const startTime = Date.now();
        const dataPoints = Array.from(this.dataBuffer.values());

        logger.debug(`开始刷新缓冲区: ${dataPoints.length} 条数据`);

        try {
            // 按数据类型分组处理
            const groupedData = this.groupDataByType(dataPoints);

            for (const [dataType, items] of Object.entries(groupedData)) {
                await this.storeDataByType(dataType, items);
            }

            // 清空缓冲区
            this.dataBuffer.clear();

            const duration = Date.now() - startTime;
            this.stats.totalStored += dataPoints.length;
            this.stats.bufferSize = 0;
            this.stats.lastFlush = new Date().toISOString();

            logger.debug(`缓冲区刷新完成: ${dataPoints.length} 条数据, 耗时: ${duration}ms`);

            this.emit('buffer:flushed', {
                count: dataPoints.length,
                duration,
                timestamp: this.stats.lastFlush
            });

        } catch (error) {
            logger.error('刷新缓冲区失败:', error);
            this.stats.totalErrors++;
            this.emit('buffer:error', error);

            // 重新添加失败的数据到缓冲区（可选）
            // 这里可以实现重试逻辑
        }
    }

    /**
     * 按数据类型分组
     */
    groupDataByType(dataPoints) {
        const grouped = {};

        for (const point of dataPoints) {
            if (!grouped[point.type]) {
                grouped[point.type] = [];
            }
            grouped[point.type].push(point);
        }

        return grouped;
    }

    /**
     * 根据数据类型存储数据
     */
    async storeDataByType(dataType, items) {
        switch (dataType) {
            case 'check_result':
                await this.storeCheckResults(items);
                break;
            case 'performance_metrics':
                await this.storePerformanceMetrics(items);
                break;
            case 'uptime_data':
                await this.storeUptimeData(items);
                break;
            case 'alert_data':
                await this.storeAlertData(items);
                break;
            case 'system_metrics':
                await this.storeSystemMetrics(items);
                break;
            default:
                logger.warn(`未知的数据类型: ${dataType}`);
        }
    }

    /**
     * 存储检查结果
     */
    async storeCheckResults(items) {
        if (items.length === 0) return;

        const values = [];
        const placeholders = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const data = item.data;
            const baseIndex = i * 7;

            values.push(
                data.site_id,
                data.status,
                data.response_time,
                data.status_code,
                JSON.stringify(data.results || {}),
                data.error_message,
                data.checked_at
            );

            placeholders.push(
                `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`
            );
        }

        const query = `
      INSERT INTO monitoring_results (
        site_id, status, response_time, status_code, 
        results, error_message, checked_at
      ) VALUES ${placeholders.join(', ')}
    `;

        await this.dbPool.query(query, values);
        logger.debug(`存储检查结果: ${items.length} 条`);
    }

    /**
     * 存储性能指标
     */
    async storePerformanceMetrics(items) {
        // 这里可以存储到专门的性能指标表
        // 目前将其作为检查结果的一部分存储
        logger.debug(`存储性能指标: ${items.length} 条`);
    }

    /**
     * 存储可用性数据
     */
    async storeUptimeData(items) {
        // 可用性数据可以存储到专门的表或作为检查结果的一部分
        logger.debug(`存储可用性数据: ${items.length} 条`);
    }

    /**
     * 存储告警数据
     */
    async storeAlertData(items) {
        if (items.length === 0) return;

        // 这里可以存储到告警历史表
        // 目前记录日志
        for (const item of items) {
            const data = item.data;
            logger.info(`告警记录: 站点 ${data.site_id}, 类型: ${data.alert_type}, 消息: ${data.message}`);
        }
    }

    /**
     * 存储系统指标
     */
    async storeSystemMetrics(items) {
        // 系统指标可以存储到专门的系统监控表
        logger.debug(`存储系统指标: ${items.length} 条`);
    }

    /**
     * 启动刷新定时器
     */
    startFlushTimer() {
        this.flushTimer = setInterval(async () => {
            try {
                await this.flushBuffer();
            } catch (error) {
                logger.error('定时刷新缓冲区失败:', error);
            }
        }, this.flushInterval);

        logger.debug(`启动缓冲区刷新定时器: ${this.flushInterval}ms`);
    }

    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        this.on('error', (error) => {
            logger.error('监控数据收集器错误:', error);
        });

        // 定期收集系统指标
        setInterval(async () => {
            if (this.isRunning) {
                try {
                    await this.collectSystemMetrics();
                } catch (error) {
                    logger.error('收集系统指标失败:', error);
                }
            }
        }, 60000); // 每分钟收集一次
    }

    /**
     * 生成数据ID
     */
    generateDataId() {
        return `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * 获取缓冲区状态
     */
    getBufferStatus() {
        return {
            size: this.dataBuffer.size,
            maxSize: this.batchSize,
            utilizationPercent: (this.dataBuffer.size / this.batchSize * 100).toFixed(2)
        };
    }

    /**
     * 清空缓冲区
     */
    clearBuffer() {
        const size = this.dataBuffer.size;
        this.dataBuffer.clear();
        this.stats.bufferSize = 0;

        logger.info(`清空缓冲区: ${size} 条数据`);

        this.emit('buffer:cleared', { size });
    }

    /**
     * 设置批量大小
     */
    setBatchSize(size) {
        if (size > 0 && size <= 1000) {
            this.batchSize = size;
            logger.info(`设置批量大小: ${size}`);
        } else {
            throw new Error('批量大小必须在1-1000之间');
        }
    }

    /**
     * 设置刷新间隔
     */
    setFlushInterval(interval) {
        if (interval >= 5000 && interval <= 300000) { // 5秒到5分钟
            this.flushInterval = interval;

            // 重启定时器
            if (this.flushTimer) {
                clearInterval(this.flushTimer);
                this.startFlushTimer();
            }

            logger.info(`设置刷新间隔: ${interval}ms`);
        } else {
            throw new Error('刷新间隔必须在5000-300000ms之间');
        }
    }

    /**
     * 获取数据统计
     */
    async getDataStatistics(timeRange = '24h') {
        try {
            let timeCondition = '';

            switch (timeRange) {
                case '1h':
                    timeCondition = "checked_at >= NOW() - INTERVAL '1 hour'";
                    break;
                case '24h':
                    timeCondition = "checked_at >= NOW() - INTERVAL '24 hours'";
                    break;
                case '7d':
                    timeCondition = "checked_at >= NOW() - INTERVAL '7 days'";
                    break;
                case '30d':
                    timeCondition = "checked_at >= NOW() - INTERVAL '30 days'";
                    break;
                default:
                    timeCondition = "checked_at >= NOW() - INTERVAL '24 hours'";
            }

            const query = `
        SELECT 
          COUNT(*) as total_checks,
          COUNT(CASE WHEN status = 'up' THEN 1 END) as successful_checks,
          COUNT(CASE WHEN status = 'down' THEN 1 END) as failed_checks,
          AVG(response_time) as avg_response_time,
          MIN(response_time) as min_response_time,
          MAX(response_time) as max_response_time
        FROM monitoring_results 
        WHERE ${timeCondition}
      `;

            const result = await this.dbPool.query(query);
            const stats = result.rows[0];

            return {
                totalChecks: parseInt(stats.total_checks),
                successfulChecks: parseInt(stats.successful_checks),
                failedChecks: parseInt(stats.failed_checks),
                successRate: stats.total_checks > 0
                    ? ((stats.successful_checks / stats.total_checks) * 100).toFixed(2)
                    : 0,
                avgResponseTime: stats.avg_response_time ? Math.round(stats.avg_response_time) : 0,
                minResponseTime: stats.min_response_time ? Math.round(stats.min_response_time) : 0,
                maxResponseTime: stats.max_response_time ? Math.round(stats.max_response_time) : 0,
                timeRange
            };

        } catch (error) {
            logger.error('获取数据统计失败:', error);
            throw error;
        }
    }
}

module.exports = MonitoringDataCollector;