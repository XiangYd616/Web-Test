/**
 * 监控任务调度器
 * 负责管理和调度监控任务的执行
 */

const EventEmitter = require('events');
const logger = require('../../middleware/logger.js');

class MonitoringScheduler extends EventEmitter {
    constructor() {
        super();
        this.tasks = new Map(); // 存储所有调度任务
        this.isRunning = false;
        this.masterInterval = null;
        this.config = {
            tickInterval: 10000, // 10秒检查一次
            maxConcurrentTasks: 50,
            taskTimeout: 300000, // 5分钟任务超时
            retryDelay: 30000 // 30秒重试延迟
        };

        this.stats = {
            totalTasks: 0,
            activeTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            lastTick: null
        };
    }

    /**
     * 启动调度器
     */
    start() {
        if (this.isRunning) {
            logger.warn('监控调度器已在运行中');
            return;
        }

        logger.info('启动监控任务调度器...');

        this.isRunning = true;
        this.masterInterval = setInterval(() => {
            this.tick();
        }, this.config.tickInterval);

        this.emit('scheduler:started');
        logger.info('监控任务调度器启动成功');
    }

    /**
     * 停止调度器
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        logger.info('停止监控任务调度器...');

        if (this.masterInterval) {
            clearInterval(this.masterInterval);
            this.masterInterval = null;
        }

        // 清理所有任务
        this.tasks.clear();

        this.isRunning = false;
        this.emit('scheduler:stopped');
        logger.info('监控任务调度器已停止');
    }

    /**
     * 调度器主循环
     */
    async tick() {
        try {
            this.stats.lastTick = new Date();

            const now = Date.now();
            const tasksToExecute = [];

            // 检查需要执行的任务
            for (const [taskId, task] of this.tasks) {
                if (this.shouldExecuteTask(task, now)) {
                    tasksToExecute.push(task);
                }
            }

            // 限制并发执行数量
            const concurrentLimit = Math.min(
                tasksToExecute.length,
                this.config.maxConcurrentTasks - this.stats.activeTasks
            );

            const tasksToRun = tasksToExecute.slice(0, concurrentLimit);

            // 执行任务
            for (const task of tasksToRun) {
                this.executeTask(task);
            }

            // 清理过期任务
            this.cleanupExpiredTasks(now);

            // 更新统计信息
            this.updateStats();

        } catch (error) {
            logger.error('调度器执行出错:', error);
            this.emit('scheduler:error', error);
        }
    }

    /**
     * 判断任务是否应该执行
     */
    shouldExecuteTask(task, now) {
        // 任务已在运行中
        if (task.isRunning) {
            return false;
        }

        // 任务被暂停
        if (task.status === 'paused') {
            return false;
        }

        // 检查执行间隔
        const timeSinceLastRun = now - (task.lastExecuted || 0);
        const shouldRun = timeSinceLastRun >= task.interval;

        // 检查重试逻辑
        if (task.lastFailed && task.retryCount < task.maxRetries) {
            const timeSinceFailure = now - task.lastFailed;
            const shouldRetry = timeSinceFailure >= this.config.retryDelay;
            return shouldRetry;
        }

        return shouldRun;
    }

    /**
     * 执行任务
     */
    async executeTask(task) {
        const taskId = task.id;

        try {
            // 标记任务为运行中
            task.isRunning = true;
            task.startTime = Date.now();
            this.stats.activeTasks++;

            logger.debug(`执行监控任务: ${task.name} (${taskId})`);

            // 设置任务超时
            const timeoutId = setTimeout(() => {
                this.handleTaskTimeout(task);
            }, this.config.taskTimeout);

            // 发出任务开始事件
            this.emit('task:started', {
                taskId,
                name: task.name,
                type: task.type,
                startTime: task.startTime
            });

            // 执行任务函数
            const result = await task.execute();

            // 清除超时定时器
            clearTimeout(timeoutId);

            // 处理任务成功
            this.handleTaskSuccess(task, result);

        } catch (error) {
            logger.error(`监控任务执行失败 ${task.name}:`, error);
            this.handleTaskFailure(task, error);
        }
    }

    /**
     * 处理任务成功
     */
    handleTaskSuccess(task, result) {
        const duration = Date.now() - task.startTime;

        // 更新任务状态
        task.isRunning = false;
        task.lastExecuted = Date.now();
        task.lastResult = result;
        task.lastError = null;
        task.retryCount = 0;
        task.successCount = (task.successCount || 0) + 1;

        // 更新统计
        this.stats.activeTasks--;
        this.stats.completedTasks++;

        // 发出任务完成事件
        this.emit('task:completed', {
            taskId: task.id,
            name: task.name,
            result,
            duration,
            successCount: task.successCount
        });

        logger.debug(`监控任务完成: ${task.name}, 耗时: ${duration}ms`);
    }

    /**
     * 处理任务失败
     */
    handleTaskFailure(task, error) {
        const duration = Date.now() - task.startTime;

        // 更新任务状态
        task.isRunning = false;
        task.lastError = error;
        task.lastFailed = Date.now();
        task.retryCount = (task.retryCount || 0) + 1;
        task.failureCount = (task.failureCount || 0) + 1;

        // 更新统计
        this.stats.activeTasks--;
        this.stats.failedTasks++;

        // 发出任务失败事件
        this.emit('task:failed', {
            taskId: task.id,
            name: task.name,
            error: error.message,
            duration,
            retryCount: task.retryCount,
            failureCount: task.failureCount
        });

        logger.warn(`监控任务失败: ${task.name}, 重试次数: ${task.retryCount}`);
    }

    /**
     * 处理任务超时
     */
    handleTaskTimeout(task) {
        if (!task.isRunning) {
            return;
        }

        const duration = Date.now() - task.startTime;
        const timeoutError = new Error(`任务执行超时: ${duration}ms`);

        logger.warn(`监控任务超时: ${task.name}, 耗时: ${duration}ms`);

        this.handleTaskFailure(task, timeoutError);
    }

    /**
     * 清理过期任务
     */
    cleanupExpiredTasks(now) {
        const expiredTasks = [];

        for (const [taskId, task] of this.tasks) {
            // 清理长时间未执行的失败任务
            if (task.lastFailed && task.retryCount >= task.maxRetries) {
                const timeSinceFailure = now - task.lastFailed;
                if (timeSinceFailure > 24 * 60 * 60 * 1000) { // 24小时
                    expiredTasks.push(taskId);
                }
            }

            // 清理被标记为删除的任务
            if (task.status === 'deleted') {
                expiredTasks.push(taskId);
            }
        }

        // 移除过期任务
        for (const taskId of expiredTasks) {
            this.removeTask(taskId);
            logger.debug(`清理过期任务: ${taskId}`);
        }
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        this.stats.totalTasks = this.tasks.size;

        // 发出统计更新事件
        this.emit('stats:updated', { ...this.stats });
    }

    /**
     * 添加监控任务
     */
    addTask(taskConfig) {
        const task = {
            id: taskConfig.id || this.generateTaskId(),
            name: taskConfig.name,
            type: taskConfig.type || 'monitoring',
            interval: taskConfig.interval * 1000, // 转换为毫秒
            execute: taskConfig.execute,
            maxRetries: taskConfig.maxRetries || 3,

            // 状态信息
            status: 'active',
            isRunning: false,
            lastExecuted: null,
            lastResult: null,
            lastError: null,
            lastFailed: null,
            retryCount: 0,
            successCount: 0,
            failureCount: 0,

            // 时间信息
            createdAt: Date.now(),
            startTime: null
        };

        this.tasks.set(task.id, task);

        logger.info(`添加监控任务: ${task.name} (${task.id}), 间隔: ${taskConfig.interval}秒`);

        this.emit('task:added', {
            taskId: task.id,
            name: task.name,
            interval: taskConfig.interval
        });

        return task.id;
    }

    /**
     * 移除监控任务
     */
    removeTask(taskId) {
        const task = this.tasks.get(taskId);

        if (!task) {
            logger.warn(`尝试移除不存在的任务: ${taskId}`);
            return false;
        }

        // 如果任务正在运行，标记为删除而不是立即移除
        if (task.isRunning) {
            task.status = 'deleted';
            logger.debug(`标记运行中的任务为删除: ${task.name}`);
            return true;
        }

        this.tasks.delete(taskId);

        logger.info(`移除监控任务: ${task.name} (${taskId})`);

        this.emit('task:removed', {
            taskId,
            name: task.name
        });

        return true;
    }

    /**
     * 暂停任务
     */
    pauseTask(taskId) {
        const task = this.tasks.get(taskId);

        if (!task) {
            return false;
        }

        task.status = 'paused';

        logger.info(`暂停监控任务: ${task.name} (${taskId})`);

        this.emit('task:paused', {
            taskId,
            name: task.name
        });

        return true;
    }

    /**
     * 恢复任务
     */
    resumeTask(taskId) {
        const task = this.tasks.get(taskId);

        if (!task) {
            return false;
        }

        task.status = 'active';
        task.retryCount = 0; // 重置重试计数

        logger.info(`恢复监控任务: ${task.name} (${taskId})`);

        this.emit('task:resumed', {
            taskId,
            name: task.name
        });

        return true;
    }

    /**
     * 获取任务信息
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }

    /**
     * 获取所有任务
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    /**
     * 获取调度器统计信息
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * 生成任务ID
     */
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 立即执行任务
     */
    async executeTaskNow(taskId) {
        const task = this.tasks.get(taskId);

        if (!task) {
            throw new Error(`任务不存在: ${taskId}`);
        }

        if (task.isRunning) {
            throw new Error(`任务正在运行中: ${task.name}`);
        }

        logger.info(`立即执行监控任务: ${task.name}`);

        await this.executeTask(task);
    }

    /**
     * 更新任务配置
     */
    updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);

        if (!task) {
            return false;
        }

        // 允许更新的字段
        const allowedUpdates = ['name', 'interval', 'maxRetries'];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedUpdates.includes(key)) {
                if (key === 'interval') {
                    task[key] = value * 1000; // 转换为毫秒
                } else {
                    task[key] = value;
                }
            }
        }

        logger.info(`更新监控任务: ${task.name} (${taskId})`);

        this.emit('task:updated', {
            taskId,
            name: task.name,
            updates
        });

        return true;
    }
}

module.exports = MonitoringScheduler;