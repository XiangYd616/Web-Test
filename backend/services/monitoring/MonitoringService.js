/**
 * 监控服务核心类
 * 实现24/7网站监控功能，支持多种监控指标
 */

const { Pool } = require('pg');
const EventEmitter = require('events');
const axios = require('axios');
const { performance } = require('perf_hooks');
const logger = require('..\..\middleware\logger.js');

class MonitoringService extends EventEmitter {
    constructor(dbPool) {
        super();
        this.dbPool = dbPool;
        this.activeMonitors = new Map(); // 存储活跃的监控任务
        this.scheduler = null;
        this.isRunning = false;
        this.healthCheckInterval = null;

        // 监控配置
        this.config = {
            maxConcurrentChecks: 10,
            defaultTimeout: 30000,
            retryAttempts: 3,
            retryDelay: 5000,
            healthCheckInterval: 60000, // 1分钟
            maxConsecutiveFailures: 3
        };

        this.setupEventHandlers();
    }

    /**
     * 启动监控服务
     */
    async start() {
        try {
            if (this.isRunning) {
                logger.warn('监控服务已在运行中');
                return;
            }

            logger.info('启动监控服务...');

            // 加载监控目标
            await this.loadMonitoringTargets();

            // 启动调度器
            this.startScheduler();

            // 启动健康检查
            this.startHealthCheck();

            this.isRunning = true;
            this.emit('service:started');

            logger.info('监控服务启动成功');
        } catch (error) {
            logger.error('监控服务启动失败:', error);
            throw error;
        }
    }

    /**
     * 停止监控服务
     */
    async stop() {
        try {
            if (!this.isRunning) {
                return;
            }

            logger.info('停止监控服务...');

            // 停止调度器
            if (this.scheduler) {
                clearInterval(this.scheduler);
                this.scheduler = null;
            }

            // 停止健康检查
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }

            // 清理活跃监控
            this.activeMonitors.clear();

            this.isRunning = false;
            this.emit('service:stopped');

            logger.info('监控服务已停止');
        } catch (error) {
            logger.error('停止监控服务时出错:', error);
            throw error;
        }
    }

    /**
     * 加载监控目标
     */
    async loadMonitoringTargets() {
        try {
            const query = `
        SELECT 
          id, user_id, name, url, monitoring_type, 
          check_interval, timeout, config, status,
          notification_settings, last_check, consecutive_failures
        FROM monitoring_sites 
        WHERE status = 'active' AND deleted_at IS NULL
        ORDER BY check_interval ASC
      `;

            const result = await this.dbPool.query(query);
            const targets = result.rows;

            logger.info(`加载了 ${targets.length} 个监控目标`);

            // 为每个目标创建监控任务
            for (const target of targets) {
                this.createMonitoringTask(target);
            }

            return targets;
        } catch (error) {
            logger.error('加载监控目标失败:', error);
            throw error;
        }
    }

    /**
     * 创建监控任务
     */
    createMonitoringTask(target) {
        const taskId = target.id;
        const interval = (target.check_interval || 300) * 1000; // 转换为毫秒

        // 如果任务已存在，先清理
        if (this.activeMonitors.has(taskId)) {
            const existingTask = this.activeMonitors.get(taskId);
            clearInterval(existingTask.intervalId);
        }

        // 创建新的监控任务
        const task = {
            target,
            intervalId: null,
            lastCheck: target.last_check ? new Date(target.last_check) : null,
            isRunning: false
        };

        // 设置定时检查
        task.intervalId = setInterval(async () => {
            if (!task.isRunning) {
                await this.performCheck(target);
            }
        }, interval);

        this.activeMonitors.set(taskId, task);

        logger.debug(`创建监控任务: ${target.name} (${target.url}), 间隔: ${target.check_interval}秒`);
    }

    /**
     * 执行监控检查
     */
    async performCheck(target) {
        const startTime = performance.now();
        const task = this.activeMonitors.get(target.id);

        if (!task) {
            logger.warn(`监控任务不存在: ${target.id}`);
            return;
        }

        task.isRunning = true;

        try {
            logger.debug(`开始检查: ${target.name} (${target.url})`);

            const checkResult = await this.executeCheck(target);

            // 保存检查结果
            await this.saveCheckResult(target.id, checkResult);

            // 更新监控目标状态
            await this.updateTargetStatus(target.id, checkResult);

            // 检查是否需要发送告警
            await this.checkAlertConditions(target, checkResult);

            // 发出检查完成事件
            this.emit('check:completed', {
                targetId: target.id,
                target: target.name,
                result: checkResult,
                duration: performance.now() - startTime
            });

        } catch (error) {
            logger.error(`监控检查失败 ${target.name}:`, error);

            // 保存错误结果
            const errorResult = {
                status: 'error',
                error_message: error.message,
                response_time: null,
                status_code: null,
                results: { error: error.message }
            };

            await this.saveCheckResult(target.id, errorResult);
            await this.updateTargetStatus(target.id, errorResult);

            this.emit('check:error', {
                targetId: target.id,
                target: target.name,
                error: error.message
            });

        } finally {
            task.isRunning = false;
            task.lastCheck = new Date();
        }
    }

    /**
     * 执行具体的检查逻辑
     */
    async executeCheck(target) {
        const startTime = performance.now();
        const timeout = (target.timeout || this.config.defaultTimeout) * 1000;

        try {
            // 根据监控类型执行不同的检查
            switch (target.monitoring_type) {
                case 'uptime':
                    return await this.performUptimeCheck(target, timeout);
                case 'performance':
                    return await this.performPerformanceCheck(target, timeout);
                case 'security':
                    return await this.performSecurityCheck(target, timeout);
                case 'seo':
                    return await this.performSEOCheck(target, timeout);
                default:
                    return await this.performUptimeCheck(target, timeout);
            }
        } catch (error) {
            const duration = performance.now() - startTime;

            // 判断错误类型
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                return {
                    status: 'timeout',
                    response_time: Math.round(duration),
                    status_code: null,
                    error_message: '请求超时',
                    results: { timeout: true, duration }
                };
            }

            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                return {
                    status: 'down',
                    response_time: Math.round(duration),
                    status_code: null,
                    error_message: '无法连接到服务器',
                    results: { connection_error: true, code: error.code }
                };
            }

            throw error;
        }
    }

    /**
     * 执行可用性检查
     */
    async performUptimeCheck(target, timeout) {
        const startTime = performance.now();

        const response = await axios.get(target.url, {
            timeout,
            validateStatus: () => true, // 不抛出状态码错误
            headers: {
                'User-Agent': 'TestWebApp-Monitor/1.0'
            }
        });

        const responseTime = Math.round(performance.now() - startTime);
        const isUp = response.status >= 200 && response.status < 400;

        return {
            status: isUp ? 'up' : 'down',
            response_time: responseTime,
            status_code: response.status,
            error_message: isUp ? null : `HTTP ${response.status}`,
            results: {
                headers: response.headers,
                response_size: response.data ? response.data.length : 0,
                ssl_info: this.extractSSLInfo(response)
            }
        };
    }

    /**
     * 执行性能检查
     */
    async performPerformanceCheck(target, timeout) {
        const uptimeResult = await this.performUptimeCheck(target, timeout);

        if (uptimeResult.status !== 'up') {
            return uptimeResult;
        }

        // 添加性能指标
        const performanceMetrics = {
            response_time: uptimeResult.response_time,
            ttfb: uptimeResult.response_time, // Time to First Byte
            dns_lookup: 0, // 需要更详细的实现
            tcp_connect: 0,
            ssl_handshake: 0
        };

        // 性能评级
        let performanceGrade = 'A';
        if (uptimeResult.response_time > 3000) performanceGrade = 'F';
        else if (uptimeResult.response_time > 2000) performanceGrade = 'D';
        else if (uptimeResult.response_time > 1000) performanceGrade = 'C';
        else if (uptimeResult.response_time > 500) performanceGrade = 'B';

        return {
            ...uptimeResult,
            results: {
                ...uptimeResult.results,
                performance: performanceMetrics,
                grade: performanceGrade
            }
        };
    }

    /**
     * 执行安全检查
     */
    async performSecurityCheck(target, timeout) {
        const uptimeResult = await this.performUptimeCheck(target, timeout);

        if (uptimeResult.status !== 'up') {
            return uptimeResult;
        }

        const securityChecks = {
            https: target.url.startsWith('https://'),
            hsts: false,
            csp: false,
            xframe: false,
            xss_protection: false
        };

        // 检查安全头
        const headers = uptimeResult.results.headers || {};
        securityChecks.hsts = !!headers['strict-transport-security'];
        securityChecks.csp = !!headers['content-security-policy'];
        securityChecks.xframe = !!headers['x-frame-options'];
        securityChecks.xss_protection = !!headers['x-xss-protection'];

        const securityScore = Object.values(securityChecks).filter(Boolean).length;
        const maxScore = Object.keys(securityChecks).length;

        return {
            ...uptimeResult,
            results: {
                ...uptimeResult.results,
                security: securityChecks,
                security_score: `${securityScore}/${maxScore}`
            }
        };
    }

    /**
     * 执行SEO检查
     */
    async performSEOCheck(target, timeout) {
        const uptimeResult = await this.performUptimeCheck(target, timeout);

        if (uptimeResult.status !== 'up') {
            return uptimeResult;
        }

        // 简单的SEO检查（可以扩展）
        const seoChecks = {
            has_title: false,
            has_description: false,
            has_h1: false,
            has_robots: false
        };

        // 这里可以添加HTML解析逻辑
        // 目前返回基本结构

        return {
            ...uptimeResult,
            results: {
                ...uptimeResult.results,
                seo: seoChecks
            }
        };
    }

    /**
     * 提取SSL信息
     */
    extractSSLInfo(response) {
        // 从响应中提取SSL相关信息
        // 这是一个简化版本，实际实现需要更详细的SSL检查
        return {
            secure: response.config.url.startsWith('https://'),
            protocol: response.request?.socket?.getProtocol?.() || null
        };
    }

    /**
     * 保存检查结果
     */
    async saveCheckResult(siteId, result) {
        try {
            const query = `
        INSERT INTO monitoring_results (
          site_id, status, response_time, status_code, 
          results, error_message, checked_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `;

            const values = [
                siteId,
                result.status,
                result.response_time,
                result.status_code,
                JSON.stringify(result.results || {}),
                result.error_message
            ];

            const insertResult = await this.dbPool.query(query, values);

            logger.debug(`保存监控结果: ${insertResult.rows[0].id}`);

            return insertResult.rows[0].id;
        } catch (error) {
            logger.error('保存监控结果失败:', error);
            throw error;
        }
    }

    /**
     * 更新监控目标状态
     */
    async updateTargetStatus(siteId, result) {
        try {
            const isFailure = ['down', 'timeout', 'error'].includes(result.status);

            const query = `
        UPDATE monitoring_sites 
        SET 
          last_check = NOW(),
          last_status = $2,
          consecutive_failures = CASE 
            WHEN $3 THEN consecutive_failures + 1 
            ELSE 0 
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING consecutive_failures
      `;

            const updateResult = await this.dbPool.query(query, [
                siteId,
                result.status,
                isFailure
            ]);

            if (updateResult.rows.length > 0) {
                const consecutiveFailures = updateResult.rows[0].consecutive_failures;

                // 发出状态变化事件
                this.emit('status:changed', {
                    siteId,
                    status: result.status,
                    consecutiveFailures,
                    isFailure
                });
            }

        } catch (error) {
            logger.error('更新监控目标状态失败:', error);
            throw error;
        }
    }

    /**
     * 检查告警条件
     */
    async checkAlertConditions(target, result) {
        try {
            const isFailure = ['down', 'timeout', 'error'].includes(result.status);

            if (!isFailure) {
                return;
            }

            // 获取当前连续失败次数
            const query = `
        SELECT consecutive_failures, notification_settings 
        FROM monitoring_sites 
        WHERE id = $1
      `;

            const queryResult = await this.dbPool.query(query, [target.id]);

            if (queryResult.rows.length === 0) {
                return;
            }

            const { consecutive_failures, notification_settings } = queryResult.rows[0];
            const alertThreshold = this.config.maxConsecutiveFailures;

            // 检查是否达到告警阈值
            if (consecutive_failures >= alertThreshold) {
                this.emit('alert:triggered', {
                    targetId: target.id,
                    target: target.name,
                    url: target.url,
                    status: result.status,
                    consecutiveFailures: consecutive_failures,
                    errorMessage: result.error_message,
                    notificationSettings: notification_settings || {}
                });

                logger.warn(`触发告警: ${target.name} 连续失败 ${consecutive_failures} 次`);
            }

        } catch (error) {
            logger.error('检查告警条件失败:', error);
        }
    }

    /**
     * 启动调度器
     */
    startScheduler() {
        // 每分钟检查一次是否有需要执行的监控任务
        this.scheduler = setInterval(() => {
            this.checkScheduledTasks();
        }, 60000); // 1分钟

        logger.debug('监控调度器已启动');
    }

    /**
     * 检查计划任务
     */
    async checkScheduledTasks() {
        try {
            // 重新加载可能有变化的监控目标
            const targets = await this.loadMonitoringTargets();

            // 清理不再活跃的监控任务
            for (const [taskId, task] of this.activeMonitors) {
                const targetExists = targets.some(t => t.id === taskId);
                if (!targetExists) {
                    clearInterval(task.intervalId);
                    this.activeMonitors.delete(taskId);
                    logger.debug(`清理无效监控任务: ${taskId}`);
                }
            }

        } catch (error) {
            logger.error('检查计划任务失败:', error);
        }
    }

    /**
     * 启动健康检查
     */
    startHealthCheck() {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);

        logger.debug('监控服务健康检查已启动');
    }

    /**
     * 执行健康检查
     */
    async performHealthCheck() {
        try {
            const stats = {
                isRunning: this.isRunning,
                activeMonitors: this.activeMonitors.size,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                timestamp: new Date().toISOString()
            };

            // 检查数据库连接
            try {
                await this.dbPool.query('SELECT 1');
                stats.databaseStatus = 'healthy';
            } catch (dbError) {
                stats.databaseStatus = 'unhealthy';
                stats.databaseError = dbError.message;
                logger.error('数据库健康检查失败:', dbError);
            }

            // 检查监控任务状态
            const taskStats = this.getTaskHealthStats();
            stats.taskStats = taskStats;

            // 检查系统资源
            const resourceStats = this.getResourceStats();
            stats.resources = resourceStats;

            // 判断整体健康状态
            stats.overallHealth = this.determineOverallHealth(stats);

            this.emit('health:check', stats);

            logger.debug(`监控服务健康检查: ${stats.activeMonitors} 个活跃监控, 状态: ${stats.overallHealth}`);

            // 如果健康状态不佳，尝试自动恢复
            if (stats.overallHealth !== 'healthy') {
                await this.attemptAutoRecovery(stats);
            }

        } catch (error) {
            logger.error('健康检查失败:', error);
            this.emit('health:error', error);
        }
    }

    /**
     * 获取任务健康统计
     */
    getTaskHealthStats() {
        const now = Date.now();
        let healthyTasks = 0;
        let stuckTasks = 0;
        let errorTasks = 0;

        for (const [taskId, task] of this.activeMonitors) {
            if (task.isRunning) {
                // 检查是否有任务卡住
                const runningTime = now - (task.startTime || now);
                if (runningTime > 300000) { // 5分钟
                    stuckTasks++;
                } else {
                    healthyTasks++;
                }
            } else {
                // 检查最近是否有错误
                const timeSinceLastCheck = now - (task.lastCheck?.getTime() || 0);
                if (timeSinceLastCheck > task.target?.check_interval * 2000) { // 超过2倍检查间隔
                    errorTasks++;
                } else {
                    healthyTasks++;
                }
            }
        }

        return {
            total: this.activeMonitors.size,
            healthy: healthyTasks,
            stuck: stuckTasks,
            error: errorTasks
        };
    }

    /**
     * 获取资源统计
     */
    getResourceStats() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        return {
            memory: {
                used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) // %
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            uptime: process.uptime()
        };
    }

    /**
     * 确定整体健康状态
     */
    determineOverallHealth(stats) {
        // 数据库不健康
        if (stats.databaseStatus !== 'healthy') {
            return 'critical';
        }

        // 内存使用过高
        if (stats.resources.memory.usage > 90) {
            return 'degraded';
        }

        // 有卡住的任务
        if (stats.taskStats.stuck > 0) {
            return 'degraded';
        }

        // 错误任务过多
        if (stats.taskStats.error > stats.taskStats.total * 0.5) {
            return 'degraded';
        }

        return 'healthy';
    }

    /**
     * 尝试自动恢复
     */
    async attemptAutoRecovery(healthStats) {
        try {
            logger.info('检测到健康问题，尝试自动恢复...');

            // 重启卡住的任务
            if (healthStats.taskStats.stuck > 0) {
                await this.restartStuckTasks();
            }

            // 清理内存
            if (healthStats.resources.memory.usage > 85) {
                this.performMemoryCleanup();
            }

            // 重新加载监控目标
            if (healthStats.taskStats.error > 0) {
                await this.reloadMonitoringTargets();
            }

            logger.info('自动恢复尝试完成');

        } catch (error) {
            logger.error('自动恢复失败:', error);
            this.emit('recovery:failed', error);
        }
    }

    /**
     * 重启卡住的任务
     */
    async restartStuckTasks() {
        const now = Date.now();
        const stuckTasks = [];

        for (const [taskId, task] of this.activeMonitors) {
            if (task.isRunning) {
                const runningTime = now - (task.startTime || now);
                if (runningTime > 300000) { // 5分钟
                    stuckTasks.push({ taskId, task });
                }
            }
        }

        for (const { taskId, task } of stuckTasks) {
            try {
                logger.warn(`重启卡住的监控任务: ${task.target?.name || taskId}`);

                // 停止任务
                task.isRunning = false;
                if (task.intervalId) {
                    clearInterval(task.intervalId);
                }

                // 重新创建任务
                this.createMonitoringTask(task.target);

            } catch (error) {
                logger.error(`重启任务失败 ${taskId}:`, error);
            }
        }

        if (stuckTasks.length > 0) {
            logger.info(`重启了 ${stuckTasks.length} 个卡住的任务`);
        }
    }

    /**
     * 执行内存清理
     */
    performMemoryCleanup() {
        try {
            // 清理告警历史缓存
            if (this.alertHistory && this.alertHistory.size > 1000) {
                const entries = Array.from(this.alertHistory.entries());
                const toKeep = entries.slice(-500); // 只保留最近500条
                this.alertHistory.clear();
                toKeep.forEach(([key, value]) => {
                    this.alertHistory.set(key, value);
                });
            }

            // 强制垃圾回收（如果可用）
            if (global.gc) {
                global.gc();
            }

            logger.info('内存清理完成');

        } catch (error) {
            logger.error('内存清理失败:', error);
        }
    }

    /**
     * 重新加载监控目标
     */
    async reloadMonitoringTargets() {
        try {
            logger.info('重新加载监控目标...');

            // 停止所有当前任务
            for (const [taskId, task] of this.activeMonitors) {
                if (task.intervalId) {
                    clearInterval(task.intervalId);
                }
            }
            this.activeMonitors.clear();

            // 重新加载目标
            await this.loadMonitoringTargets();

            logger.info('监控目标重新加载完成');

        } catch (error) {
            logger.error('重新加载监控目标失败:', error);
            throw error;
        }
    }

    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        this.on('error', (error) => {
            logger.error('监控服务错误:', error);
        });

        this.on('alert:triggered', (alertData) => {
            logger.warn('监控告警:', alertData);
        });
    }

    /**
     * 添加监控目标
     */
    async addMonitoringTarget(targetData) {
        try {
            const query = `
        INSERT INTO monitoring_sites (
          user_id, name, url, monitoring_type, check_interval, 
          timeout, config, notification_settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

            const values = [
                targetData.user_id,
                targetData.name,
                targetData.url,
                targetData.monitoring_type || 'uptime',
                targetData.check_interval || 300,
                targetData.timeout || 30,
                JSON.stringify(targetData.config || {}),
                JSON.stringify(targetData.notification_settings || {})
            ];

            const result = await this.dbPool.query(query, values);
            const newTarget = result.rows[0];

            // 创建监控任务
            this.createMonitoringTask(newTarget);

            logger.info(`添加监控目标: ${newTarget.name} (${newTarget.url})`);

            return newTarget;
        } catch (error) {
            logger.error('添加监控目标失败:', error);
            throw error;
        }
    }

    /**
     * 移除监控目标
     */
    async removeMonitoringTarget(targetId) {
        try {
            // 停止监控任务
            if (this.activeMonitors.has(targetId)) {
                const task = this.activeMonitors.get(targetId);
                clearInterval(task.intervalId);
                this.activeMonitors.delete(targetId);
            }

            // 软删除监控目标
            const query = `
        UPDATE monitoring_sites 
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING name
      `;

            const result = await this.dbPool.query(query, [targetId]);

            if (result.rows.length > 0) {
                logger.info(`移除监控目标: ${result.rows[0].name}`);
                return true;
            }

            return false;
        } catch (error) {
            logger.error('移除监控目标失败:', error);
            throw error;
        }
    }

    /**
     * 获取监控统计
     */
    async getMonitoringStats(userId = null) {
        try {
            const userFilter = userId ? 'AND ms.user_id = $1' : '';
            const params = userId ? [userId] : [];

            const query = `
        SELECT 
          COUNT(*) as total_sites,
          COUNT(CASE WHEN ms.status = 'active' THEN 1 END) as active_sites,
          COUNT(CASE WHEN ms.last_status = 'down' THEN 1 END) as down_sites,
          AVG(CASE WHEN mr.response_time IS NOT NULL THEN mr.response_time END) as avg_response_time,
          COUNT(CASE WHEN ms.consecutive_failures >= 3 THEN 1 END) as critical_alerts
        FROM monitoring_sites ms
        LEFT JOIN LATERAL (
          SELECT response_time 
          FROM monitoring_results 
          WHERE site_id = ms.id 
          ORDER BY checked_at DESC 
          LIMIT 1
        ) mr ON true
        WHERE ms.deleted_at IS NULL ${userFilter}
      `;

            const result = await this.dbPool.query(query, params);
            const stats = result.rows[0];

            // 计算可用性百分比
            const uptime = stats.total_sites > 0
                ? ((stats.total_sites - stats.down_sites) / stats.total_sites * 100).toFixed(2)
                : 100;

            return {
                totalSites: parseInt(stats.total_sites),
                activeSites: parseInt(stats.active_sites),
                downSites: parseInt(stats.down_sites),
                avgResponseTime: stats.avg_response_time ? Math.round(stats.avg_response_time) : 0,
                uptime: parseFloat(uptime),
                criticalAlerts: parseInt(stats.critical_alerts)
            };

        } catch (error) {
            logger.error('获取监控统计失败:', error);
            throw error;
        }
    }

    /**
     * 获取监控目标列表
     */
    async getMonitoringTargets(userId, options = {}) {
        try {
            const { page = 1, limit = 20, status = null } = options;
            const offset = (page - 1) * limit;

            let query = `
        SELECT 
          ms.*,
          mr.status as last_result_status,
          mr.response_time as last_response_time,
          mr.checked_at as last_checked_at
        FROM monitoring_sites ms
        LEFT JOIN LATERAL (
          SELECT status, response_time, checked_at
          FROM monitoring_results 
          WHERE site_id = ms.id 
          ORDER BY checked_at DESC 
          LIMIT 1
        ) mr ON true
        WHERE ms.deleted_at IS NULL AND ms.user_id = $1
      `;

            const params = [userId];
            let paramIndex = 2;

            if (status) {
                query += ` AND ms.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            query += ` ORDER BY ms.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await this.dbPool.query(query, params);

            // 获取总数
            const countQuery = `
        SELECT COUNT(*) as total 
        FROM monitoring_sites 
        WHERE deleted_at IS NULL AND user_id = $1 
        ${status ? `AND status = '${status}'` : ''}
      `;

            const countResult = await this.dbPool.query(countQuery, [userId]);
            const total = parseInt(countResult.rows[0].total);

            return {
                data: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('获取监控目标列表失败:', error);
            throw error;
        }
    }
    /**
     * 获取单个监控目标
     */
    async getMonitoringTarget(siteId, userId) {
        try {
            const query = `
        SELECT 
          ms.*,
          mr.status as last_result_status,
          mr.response_time as last_response_time,
          mr.checked_at as last_checked_at,
          mr.results as last_results
        FROM monitoring_sites ms
        LEFT JOIN LATERAL (
          SELECT status, response_time, checked_at, results
          FROM monitoring_results 
          WHERE site_id = ms.id 
          ORDER BY checked_at DESC 
          LIMIT 1
        ) mr ON true
        WHERE ms.id = $1 AND ms.user_id = $2 AND ms.deleted_at IS NULL
      `;

            const result = await this.dbPool.query(query, [siteId, userId]);

            return result.rows.length > 0 ? result.rows[0] : null;

        } catch (error) {
            logger.error('获取监控目标失败:', error);
            throw error;
        }
    }

    /**
     * 更新监控目标
     */
    async updateMonitoringTarget(siteId, userId, updateData) {
        try {
            const allowedFields = ['name', 'monitoring_type', 'check_interval', 'timeout', 'config', 'notification_settings'];
            const updates = [];
            const values = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key)) {
                    updates.push(`${key} = $${paramIndex}`);
                    values.push(typeof value === 'object' ? JSON.stringify(value) : value);
                    paramIndex++;
                }
            }

            if (updates.length === 0) {
                throw new Error('没有有效的更新字段');
            }

            values.push(siteId, userId);
            const siteIdParam = paramIndex;
            const userIdParam = paramIndex + 1;

            const query = `
        UPDATE monitoring_sites 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${siteIdParam} AND user_id = $${userIdParam} AND deleted_at IS NULL
        RETURNING *
      `;

            const result = await this.dbPool.query(query, values);

            if (result.rows.length > 0) {
                const updatedTarget = result.rows[0];

                // 更新监控任务
                if (this.activeMonitors.has(siteId)) {
                    this.createMonitoringTask(updatedTarget);
                }

                logger.info(`更新监控目标: ${updatedTarget.name}`);
                return updatedTarget;
            }

            return null;

        } catch (error) {
            logger.error('更新监控目标失败:', error);
            throw error;
        }
    }

    /**
     * 立即执行监控检查
     */
    async executeImmediateCheck(siteId, userId) {
        try {
            // 验证用户权限
            const target = await this.getMonitoringTarget(siteId, userId);
            if (!target) {
                throw new Error('监控站点不存在或无权限访问');
            }

            // 执行检查
            const result = await this.executeCheck(target);

            // 保存结果
            await this.saveCheckResult(target.id, result);
            await this.updateTargetStatus(target.id, result);

            logger.info(`立即执行监控检查: ${target.name}`);

            return {
                siteId: target.id,
                siteName: target.name,
                result,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('立即执行监控检查失败:', error);
            throw error;
        }
    }

    /**
     * 获取监控历史记录
     */
    async getMonitoringHistory(siteId, userId, options = {}) {
        try {
            // 验证用户权限
            const target = await this.getMonitoringTarget(siteId, userId);
            if (!target) {
                throw new Error('监控站点不存在或无权限访问');
            }

            const { page = 1, limit = 50, timeRange = '24h' } = options;
            const offset = (page - 1) * limit;

            let timeCondition = '';
            switch (timeRange) {
                case '1h':
                    timeCondition = "AND checked_at >= NOW() - INTERVAL '1 hour'";
                    break;
                case '24h':
                    timeCondition = "AND checked_at >= NOW() - INTERVAL '24 hours'";
                    break;
                case '7d':
                    timeCondition = "AND checked_at >= NOW() - INTERVAL '7 days'";
                    break;
                case '30d':
                    timeCondition = "AND checked_at >= NOW() - INTERVAL '30 days'";
                    break;
            }

            const query = `
        SELECT 
          id, status, response_time, status_code, 
          results, error_message, checked_at
        FROM monitoring_results 
        WHERE site_id = $1 ${timeCondition}
        ORDER BY checked_at DESC 
        LIMIT $2 OFFSET $3
      `;

            const result = await this.dbPool.query(query, [siteId, limit, offset]);

            // 获取总数
            const countQuery = `
        SELECT COUNT(*) as total 
        FROM monitoring_results 
        WHERE site_id = $1 ${timeCondition}
      `;

            const countResult = await this.dbPool.query(countQuery, [siteId]);
            const total = parseInt(countResult.rows[0].total);

            return {
                data: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('获取监控历史记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取告警列表
     */
    async getAlerts(userId, options = {}) {
        try {
            const { page = 1, limit = 20, severity, status = 'active' } = options;
            const offset = (page - 1) * limit;

            // 这里需要创建告警表，暂时从监控结果中生成告警
            let query = `
        SELECT 
          mr.id,
          ms.name as site_name,
          ms.url,
          mr.status,
          mr.error_message,
          mr.checked_at,
          ms.consecutive_failures,
          'monitoring' as alert_type,
          CASE 
            WHEN ms.consecutive_failures >= 5 THEN 'critical'
            WHEN ms.consecutive_failures >= 3 THEN 'high'
            WHEN ms.consecutive_failures >= 1 THEN 'medium'
            ELSE 'low'
          END as severity
        FROM monitoring_results mr
        JOIN monitoring_sites ms ON mr.site_id = ms.id
        WHERE ms.user_id = $1 
          AND mr.status IN ('down', 'timeout', 'error')
          AND ms.deleted_at IS NULL
      `;

            const params = [userId];
            let paramIndex = 2;

            if (severity) {
                // 添加严重程度过滤
                const severityCondition = {
                    'critical': 'ms.consecutive_failures >= 5',
                    'high': 'ms.consecutive_failures >= 3 AND ms.consecutive_failures < 5',
                    'medium': 'ms.consecutive_failures >= 1 AND ms.consecutive_failures < 3',
                    'low': 'ms.consecutive_failures < 1'
                };

                if (severityCondition[severity]) {
                    query += ` AND ${severityCondition[severity]}`;
                }
            }

            query += ` ORDER BY mr.checked_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await this.dbPool.query(query, params);

            // 获取总数
            const countQuery = `
        SELECT COUNT(*) as total 
        FROM monitoring_results mr
        JOIN monitoring_sites ms ON mr.site_id = ms.id
        WHERE ms.user_id = $1 
          AND mr.status IN ('down', 'timeout', 'error')
          AND ms.deleted_at IS NULL
      `;

            const countResult = await this.dbPool.query(countQuery, [userId]);
            const total = parseInt(countResult.rows[0].total);

            return {
                data: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('获取告警列表失败:', error);
            throw error;
        }
    }

    /**
     * 标记告警为已读
     */
    async markAlertAsRead(alertId, userId) {
        try {
            // 这里需要实现告警状态管理
            // 暂时返回成功
            logger.info(`标记告警为已读: ${alertId} by user ${userId}`);
            return true;
        } catch (error) {
            logger.error('标记告警为已读失败:', error);
            throw error;
        }
    }

    /**
     * 批量更新告警
     */
    async batchUpdateAlerts(alertIds, userId, action) {
        try {
            // 这里需要实现批量告警操作
            logger.info(`批量${action}告警: ${alertIds.length}个告警 by user ${userId}`);
            return { updated: alertIds.length };
        } catch (error) {
            logger.error('批量更新告警失败:', error);
            throw error;
        }
    }

    /**
     * 获取系统统计
     */
    async getSystemStats() {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();

            return {
                uptime: process.uptime(),
                memory: {
                    used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                    total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                    usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) // %
                },
                cpu: {
                    user: cpuUsage.user,
                    system: cpuUsage.system
                },
                activeMonitors: this.activeMonitors.size,
                isRunning: this.isRunning
            };
        } catch (error) {
            logger.error('获取系统统计失败:', error);
            throw error;
        }
    }

    /**
     * 获取最近事件
     */
    async getRecentEvents(userId, limit = 10) {
        try {
            const query = `
        SELECT 
          mr.id,
          ms.name as site_name,
          ms.url,
          mr.status,
          mr.error_message,
          mr.checked_at,
          CASE 
            WHEN mr.status = 'up' THEN 'recovery'
            WHEN mr.status IN ('down', 'timeout', 'error') THEN 'site_down'
            ELSE 'status_change'
          END as event_type
        FROM monitoring_results mr
        JOIN monitoring_sites ms ON mr.site_id = ms.id
        WHERE ms.user_id = $1 AND ms.deleted_at IS NULL
        ORDER BY mr.checked_at DESC
        LIMIT $2
      `;

            const result = await this.dbPool.query(query, [userId, limit]);

            return result.rows.map(row => ({
                id: row.id,
                type: row.event_type,
                site: row.site_name,
                url: row.url,
                timestamp: row.checked_at,
                message: row.error_message || `站点状态: ${row.status}`
            }));

        } catch (error) {
            logger.error('获取最近事件失败:', error);
            throw error;
        }
    }

    /**
     * 获取健康状态
     */
    async getHealthStatus() {
        try {
            return {
                service: this.isRunning ? 'healthy' : 'down',
                activeMonitors: this.activeMonitors.size,
                uptime: process.uptime(),
                lastCheck: new Date().toISOString(),
                version: '1.0.0'
            };
        } catch (error) {
            logger.error('获取健康状态失败:', error);
            throw error;
        }
    }

    /**
     * 获取分析数据
     */
    async getAnalytics(userId, options = {}) {
        try {
            const { timeRange = '24h', siteId } = options;

            let timeCondition = '';
            switch (timeRange) {
                case '1h':
                    timeCondition = "AND mr.checked_at >= NOW() - INTERVAL '1 hour'";
                    break;
                case '24h':
                    timeCondition = "AND mr.checked_at >= NOW() - INTERVAL '24 hours'";
                    break;
                case '7d':
                    timeCondition = "AND mr.checked_at >= NOW() - INTERVAL '7 days'";
                    break;
                case '30d':
                    timeCondition = "AND mr.checked_at >= NOW() - INTERVAL '30 days'";
                    break;
            }

            let siteCondition = '';
            const params = [userId];
            if (siteId) {
                siteCondition = 'AND ms.id = $2';
                params.push(siteId);
            }

            const query = `
        SELECT 
          COUNT(*) as total_checks,
          COUNT(CASE WHEN mr.status = 'up' THEN 1 END) as successful_checks,
          COUNT(CASE WHEN mr.status IN ('down', 'timeout', 'error') THEN 1 END) as failed_checks,
          AVG(mr.response_time) as avg_response_time,
          MIN(mr.response_time) as min_response_time,
          MAX(mr.response_time) as max_response_time
        FROM monitoring_results mr
        JOIN monitoring_sites ms ON mr.site_id = ms.id
        WHERE ms.user_id = $1 ${siteCondition} ${timeCondition}
          AND ms.deleted_at IS NULL
      `;

            const result = await this.dbPool.query(query, params);
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
            logger.error('获取分析数据失败:', error);
            throw error;
        }
    }

    /**
     * 导出数据
     */
    async exportData(userId, options = {}) {
        try {
            const { format = 'json', timeRange = '24h', siteId } = options;

            // 获取数据
            const analytics = await this.getAnalytics(userId, { timeRange, siteId });
            const sites = await this.getMonitoringTargets(userId);

            const exportData = {
                metadata: {
                    exportedAt: new Date().toISOString(),
                    timeRange,
                    format,
                    userId
                },
                analytics,
                sites: sites.data
            };

            if (format === 'csv') {
                // 简单的CSV格式转换
                const csvLines = [
                    'Site Name,URL,Status,Last Check,Response Time',
                    ...sites.data.map(site =>
                        `"${site.name}","${site.url}","${site.last_status || 'unknown'}","${site.last_checked_at || ''}","${site.last_response_time || ''}"`
                    )
                ];
                return csvLines.join('\n');
            }

            return JSON.stringify(exportData, null, 2);

        } catch (error) {
            logger.error('导出数据失败:', error);
            throw error;
        }
    }
    /**
     * 生成监控报告
     */
    async generateReport(userId, options = {}) {
        try {
            const {
                reportType = 'summary',
                timeRange = '24h',
                siteIds = [],
                format = 'pdf',
                includeCharts = true,
                includeDetails = true
            } = options;

            // 获取报告数据
            const reportData = await this.getReportData(userId, {
                reportType,
                timeRange,
                siteIds,
                includeDetails
            });

            // 生成报告文件
            const reportFile = await this.createReportFile(reportData, {
                format,
                includeCharts,
                reportType
            });

            // 保存报告记录
            const reportRecord = await this.saveReportRecord(userId, {
                reportType,
                timeRange,
                format,
                filename: reportFile.filename,
                filePath: reportFile.path,
                siteIds
            });

            logger.info(`监控报告生成成功: ${reportRecord.id} for user ${userId}`);

            return {
                id: reportRecord.id,
                filename: reportFile.filename,
                downloadUrl: `/api/v1/monitoring/reports/${reportRecord.id}/download`,
                createdAt: reportRecord.created_at
            };

        } catch (error) {
            logger.error('生成监控报告失败:', error);
            throw error;
        }
    }

    /**
     * 获取报告数据
     */
    async getReportData(userId, options) {
        const { reportType, timeRange, siteIds, includeDetails } = options;

        // 获取基础统计数据
        const stats = await this.getMonitoringStats(userId);

        // 获取站点列表
        let sites = [];
        if (siteIds.length > 0) {
            // 获取指定站点
            for (const siteId of siteIds) {
                const site = await this.getMonitoringTarget(siteId, userId);
                if (site) sites.push(site);
            }
        } else {
            // 获取所有站点
            const result = await this.getMonitoringTargets(userId, { limit: 1000 });
            sites = result.data;
        }

        // 获取历史数据
        const historyData = [];
        if (includeDetails) {
            for (const site of sites) {
                const history = await this.getMonitoringHistory(site.id, userId, {
                    timeRange,
                    limit: 100
                });
                historyData.push({
                    siteId: site.id,
                    siteName: site.name,
                    history: history.data
                });
            }
        }

        // 获取告警数据
        const alerts = await this.getAlerts(userId, {
            timeRange,
            limit: 100
        });

        return {
            reportType,
            timeRange,
            generatedAt: new Date().toISOString(),
            stats,
            sites,
            historyData,
            alerts: alerts.data,
            summary: {
                totalSites: sites.length,
                activeSites: sites.filter(s => s.is_active).length,
                onlineSites: sites.filter(s => s.status === 'online').length,
                totalAlerts: alerts.data.length,
                activeAlerts: alerts.data.filter(a => a.status === 'active').length
            }
        };
    }

    /**
     * 创建报告文件
     */
    async createReportFile(reportData, options) {
        const { format, includeCharts, reportType } = options;
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `monitoring-report-${reportType}-${timestamp}.${format}`;

        if (format === 'json') {
            return {
                filename,
                data: JSON.stringify(reportData, null, 2),
                contentType: 'application/json'
            };
        } else if (format === 'csv') {
            const csvData = this.convertToCSV(reportData);
            return {
                filename: filename.replace('.csv', '.csv'),
                data: csvData,
                contentType: 'text/csv'
            };
        } else if (format === 'pdf') {
            // 这里可以集成PDF生成库，暂时返回JSON格式
            return {
                filename: filename.replace('.pdf', '.json'),
                data: JSON.stringify(reportData, null, 2),
                contentType: 'application/json'
            };
        }

        throw new Error(`不支持的报告格式: ${format}`);
    }

    /**
     * 转换为CSV格式
     */
    convertToCSV(reportData) {
        const lines = [];

        // 添加标题
        lines.push('监控报告');
        lines.push(`生成时间,${reportData.generatedAt}`);
        lines.push(`报告类型,${reportData.reportType}`);
        lines.push(`时间范围,${reportData.timeRange}`);
        lines.push('');

        // 添加摘要
        lines.push('摘要信息');
        lines.push('指标,数值');
        lines.push(`总站点数,${reportData.summary.totalSites}`);
        lines.push(`活跃站点数,${reportData.summary.activeSites}`);
        lines.push(`在线站点数,${reportData.summary.onlineSites}`);
        lines.push(`总告警数,${reportData.summary.totalAlerts}`);
        lines.push(`活跃告警数,${reportData.summary.activeAlerts}`);
        lines.push('');

        // 添加站点信息
        if (reportData.sites.length > 0) {
            lines.push('站点信息');
            lines.push('站点名称,URL,状态,类型,检查间隔,最后检查时间');
            reportData.sites.forEach(site => {
                lines.push(`${site.name},${site.url},${site.status},${site.monitoring_type},${site.check_interval},${site.last_checked || '从未'}`);
            });
            lines.push('');
        }

        // 添加告警信息
        if (reportData.alerts.length > 0) {
            lines.push('告警信息');
            lines.push('站点名称,告警类型,严重程度,状态,消息,创建时间');
            reportData.alerts.forEach(alert => {
                lines.push(`${alert.site_name},${alert.alert_type},${alert.severity},${alert.status},${alert.message},${alert.created_at}`);
            });
        }

        return lines.join('\n');
    }

    /**
     * 保存报告记录
     */
    async saveReportRecord(userId, reportInfo) {
        try {
            const query = `
                INSERT INTO monitoring_reports (
                    id, user_id, report_type, time_range, format,
                    filename, file_path, site_ids, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const values = [
                reportId,
                userId,
                reportInfo.reportType,
                reportInfo.timeRange,
                reportInfo.format,
                reportInfo.filename,
                reportInfo.filePath || null,
                JSON.stringify(reportInfo.siteIds),
                new Date().toISOString()
            ];

            const result = await this.dbPool.query(query, values);
            return result.rows[0];

        } catch (error) {
            // 如果表不存在，先创建表
            if (error.code === '42P01') {
                await this.createReportsTable();
                return this.saveReportRecord(userId, reportInfo);
            }
            throw error;
        }
    }

    /**
     * 创建报告表
     */
    async createReportsTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS monitoring_reports (
                id VARCHAR(255) PRIMARY KEY,
                user_id UUID NOT NULL,
                report_type VARCHAR(50) NOT NULL,
                time_range VARCHAR(20) NOT NULL,
                format VARCHAR(10) NOT NULL,
                filename VARCHAR(255) NOT NULL,
                file_path TEXT,
                site_ids JSONB DEFAULT '[]',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                
                INDEX idx_monitoring_reports_user (user_id),
                INDEX idx_monitoring_reports_created (created_at DESC)
            );
        `;

        await this.dbPool.query(createTableQuery);
        logger.info('创建监控报告表成功');
    }

    /**
     * 获取报告列表
     */
    async getReports(userId, options = {}) {
        try {
            const { page = 1, limit = 20 } = options;
            const offset = (page - 1) * limit;

            const query = `
                SELECT * FROM monitoring_reports
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            `;

            const countQuery = `
                SELECT COUNT(*) as total FROM monitoring_reports
                WHERE user_id = $1
            `;

            const [dataResult, countResult] = await Promise.all([
                this.dbPool.query(query, [userId, limit, offset]),
                this.dbPool.query(countQuery, [userId])
            ]);

            const total = parseInt(countResult.rows[0].total);

            return {
                data: dataResult.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('获取报告列表失败:', error);
            return {
                data: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
            };
        }
    }

    /**
     * 下载报告
     */
    async downloadReport(reportId, userId) {
        try {
            const query = `
                SELECT * FROM monitoring_reports
                WHERE id = $1 AND user_id = $2
            `;

            const result = await this.dbPool.query(query, [reportId, userId]);

            if (result.rows.length === 0) {
                return null;
            }

            const report = result.rows[0];

            // 如果有文件路径，读取文件
            if (report.file_path && require('fs').existsSync(report.file_path)) {
                const fs = require('fs');
                const data = fs.readFileSync(report.file_path);
                return {
                    filename: report.filename,
                    data,
                    contentType: this.getContentType(report.format)
                };
            }

            // 否则重新生成报告数据
            const reportData = await this.getReportData(userId, {
                reportType: report.report_type,
                timeRange: report.time_range,
                siteIds: JSON.parse(report.site_ids || '[]'),
                includeDetails: true
            });

            const reportFile = await this.createReportFile(reportData, {
                format: report.format,
                includeCharts: true,
                reportType: report.report_type
            });

            return {
                filename: report.filename,
                data: reportFile.data,
                contentType: reportFile.contentType
            };

        } catch (error) {
            logger.error('下载报告失败:', error);
            return null;
        }
    }

    /**
     * 获取内容类型
     */
    getContentType(format) {
        const contentTypes = {
            json: 'application/json',
            csv: 'text/csv',
            pdf: 'application/pdf',
            html: 'text/html'
        };
        return contentTypes[format] || 'application/octet-stream';
    }
}

module.exports = MonitoringService;