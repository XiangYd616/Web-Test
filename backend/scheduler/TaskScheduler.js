/**
 * 任务调度器
 * 
 * 文件路径: backend/scheduler/TaskScheduler.js
 * 创建时间: 2025-11-14
 * 
 * 功能：
 * - 支持cron表达式定时任务
 * - 支持一次性任务
 * - 任务队列管理
 * - 任务状态追踪
 * - 并发控制
 */

const cron = require('node-cron');
const { EventEmitter } = require('events');
const Logger = require('../utils/logger');

class TaskScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.tasks = new Map(); // 所有任务 { taskId: taskConfig }
    this.cronJobs = new Map(); // cron任务实例 { taskId: cronJob }
    this.runningTasks = new Map(); // 运行中的任务 { executionId: taskInfo }
    
    this.options = {
      maxConcurrent: options.maxConcurrent || 5, // 最大并发任务数
      taskTimeout: options.taskTimeout || 3600000, // 任务超时时间（1小时）
      retryAttempts: options.retryAttempts || 3, // 重试次数
      retryDelay: options.retryDelay || 60000 // 重试延迟（1分钟）
    };

    this.isRunning = false;
    this.executionHistory = []; // 任务执行历史
    this.maxHistorySize = 1000;
  }

  /**
   * 启动调度器
   */
  start() {
    if (this.isRunning) {
      Logger.warn('任务调度器已经在运行');
      return;
    }

    this.isRunning = true;
    Logger.info('任务调度器已启动');
    this.emit('scheduler:started');

    // 启动所有已配置的cron任务
    this.tasks.forEach((task, taskId) => {
      if (task.enabled && task.schedule) {
        this._startCronJob(taskId, task);
      }
    });
  }

  /**
   * 停止调度器
   */
  stop() {
    if (!this.isRunning) {
      Logger.warn('任务调度器未运行');
      return;
    }

    this.isRunning = false;
    
    // 停止所有cron任务
    this.cronJobs.forEach((cronJob, taskId) => {
      cronJob.stop();
      Logger.info(`停止任务: ${taskId}`);
    });
    
    this.cronJobs.clear();
    Logger.info('任务调度器已停止');
    this.emit('scheduler:stopped');
  }

  /**
   * 添加任务
   * @param {Object} taskConfig 任务配置
   * @returns {string} taskId
   */
  addTask(taskConfig) {
    const {
      taskId,
      name,
      type, // 'stress', 'api', 'performance', 'security'
      schedule, // cron表达式或null（一次性任务）
      config, // 测试配置
      enabled = true,
      metadata = {}
    } = taskConfig;

    if (!taskId) {
      throw new Error('缺少taskId');
    }

    if (!type || !['stress', 'api', 'performance', 'security'].includes(type)) {
      throw new Error('无效的任务类型');
    }

    if (schedule && !cron.validate(schedule)) {
      throw new Error('无效的cron表达式');
    }

    const task = {
      taskId,
      name: name || `Task ${taskId}`,
      type,
      schedule,
      config: config || {},
      enabled,
      metadata,
      createdAt: new Date(),
      lastExecutedAt: null,
      nextExecutionAt: schedule ? this._getNextExecutionTime(schedule) : null,
      executionCount: 0,
      failureCount: 0
    };

    this.tasks.set(taskId, task);
    Logger.info(`任务已添加: ${taskId} - ${name}`);

    // 如果调度器正在运行且任务已启用，立即启动cron任务
    if (this.isRunning && enabled && schedule) {
      this._startCronJob(taskId, task);
    }

    this.emit('task:added', task);
    return taskId;
  }

  /**
   * 移除任务
   */
  removeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    // 停止cron任务
    if (this.cronJobs.has(taskId)) {
      this.cronJobs.get(taskId).stop();
      this.cronJobs.delete(taskId);
    }

    this.tasks.delete(taskId);
    Logger.info(`任务已移除: ${taskId}`);
    this.emit('task:removed', taskId);
  }

  /**
   * 启用任务
   */
  enableTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    task.enabled = true;
    
    if (this.isRunning && task.schedule) {
      this._startCronJob(taskId, task);
    }

    Logger.info(`任务已启用: ${taskId}`);
    this.emit('task:enabled', taskId);
  }

  /**
   * 禁用任务
   */
  disableTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    task.enabled = false;

    if (this.cronJobs.has(taskId)) {
      this.cronJobs.get(taskId).stop();
      this.cronJobs.delete(taskId);
    }

    Logger.info(`任务已禁用: ${taskId}`);
    this.emit('task:disabled', taskId);
  }

  /**
   * 立即执行任务（不管调度）
   */
  async executeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    // 检查并发限制
    if (this.runningTasks.size >= this.options.maxConcurrent) {
      throw new Error('已达到最大并发任务数');
    }

    return this._executeTask(task);
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
   * 获取运行中的任务
   */
  getRunningTasks() {
    return Array.from(this.runningTasks.values());
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(taskId = null, limit = 50) {
    let history = this.executionHistory;
    
    if (taskId) {
      history = history.filter(h => h.taskId === taskId);
    }

    return history.slice(-limit);
  }

  /**
   * 启动cron任务
   * @private
   */
  _startCronJob(taskId, task) {
    // 如果已存在，先停止
    if (this.cronJobs.has(taskId)) {
      this.cronJobs.get(taskId).stop();
    }

    const cronJob = cron.schedule(task.schedule, async () => {
      try {
        await this._executeTask(task);
      } catch (error) {
        Logger.error(`Cron任务执行失败: ${taskId}`, error);
      }
    });

    this.cronJobs.set(taskId, cronJob);
    Logger.info(`Cron任务已启动: ${taskId} - ${task.schedule}`);
  }

  /**
   * 执行任务
   * @private
   */
  async _executeTask(task) {
    const executionId = `${task.taskId}-${Date.now()}`;
    const startTime = Date.now();

    const executionInfo = {
      executionId,
      taskId: task.taskId,
      taskName: task.name,
      taskType: task.type,
      status: 'running',
      startTime,
      endTime: null,
      duration: null,
      result: null,
      error: null,
      retryCount: 0
    };

    this.runningTasks.set(executionId, executionInfo);
    this.emit('task:started', executionInfo);

    Logger.info(`开始执行任务: ${task.taskId} (${executionId})`);

    try {
      // 设置超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('任务执行超时')), this.options.taskTimeout);
      });

      // 执行任务
      const resultPromise = this._runTaskEngine(task);
      const result = await Promise.race([resultPromise, timeoutPromise]);

      // 更新执行信息
      executionInfo.status = 'completed';
      executionInfo.endTime = Date.now();
      executionInfo.duration = executionInfo.endTime - startTime;
      executionInfo.result = result;

      // 更新任务统计
      task.lastExecutedAt = new Date();
      task.executionCount++;
      if (task.schedule) {
        task.nextExecutionAt = this._getNextExecutionTime(task.schedule);
      }

      Logger.info(`任务执行完成: ${task.taskId} (${executionInfo.duration}ms)`);
      this.emit('task:completed', executionInfo);

    } catch (error) {
      executionInfo.status = 'failed';
      executionInfo.endTime = Date.now();
      executionInfo.duration = executionInfo.endTime - startTime;
      executionInfo.error = error.message;

      task.failureCount++;

      Logger.error(`任务执行失败: ${task.taskId}`, error);
      this.emit('task:failed', executionInfo);

      // 重试逻辑
      if (executionInfo.retryCount < this.options.retryAttempts) {
        Logger.info(`将在${this.options.retryDelay}ms后重试...`);
        setTimeout(() => {
          executionInfo.retryCount++;
          this._executeTask(task);
        }, this.options.retryDelay);
      }
    } finally {
      this.runningTasks.delete(executionId);

      // 添加到历史记录
      this._addToHistory(executionInfo);
    }

    return executionInfo;
  }

  /**
   * 运行测试引擎
   * @private
   */
  async _runTaskEngine(task) {
    const { type, config } = task;

    // 动态加载测试引擎
    let Engine;
    switch (type) {
      case 'stress':
        Engine = require('../engines/stressTestEngine');
        break;
      case 'api':
        Engine = require('../engines/apiTestEngine');
        break;
      case 'performance':
        Engine = require('../engines/performanceTestEngine');
        break;
      case 'security':
        Engine = require('../engines/securityTestEngine');
        break;
      default:
        throw new Error(`不支持的任务类型: ${type}`);
    }

    const engine = new Engine();
    const result = await engine.runTest(config);

    return result;
  }

  /**
   * 添加到历史记录
   * @private
   */
  _addToHistory(executionInfo) {
    this.executionHistory.push(executionInfo);

    // 限制历史记录大小
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }
  }

  /**
   * 获取下次执行时间
   * @private
   */
  _getNextExecutionTime(cronExpression) {
    // 简化版：返回当前时间 + 1分钟
    // 实际应使用cron-parser库解析
    return new Date(Date.now() + 60000);
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      totalTasks: this.tasks.size,
      enabledTasks: Array.from(this.tasks.values()).filter(t => t.enabled).length,
      runningTasks: this.runningTasks.size,
      totalExecutions: this.executionHistory.length,
      successfulExecutions: this.executionHistory.filter(h => h.status === 'completed').length,
      failedExecutions: this.executionHistory.filter(h => h.status === 'failed').length
    };
  }
}

module.exports = TaskScheduler;
