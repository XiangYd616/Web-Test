/**
 * 基础测试引擎类
 * 提供所有测试引擎的公共功能和接口
 */

const EventEmitter = require('events');
const Logger = require('../../utils/logger');
const { AppError } = require('../../middleware/errorHandler');

class BaseTestEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 基础配置
    this.id = options.id || this.generateId();
    this.name = options.name || 'BaseTestEngine';
    this.version = options.version || '1.0.0';
    
    // 状态管理
    this.state = 'idle'; // idle, running, paused, stopped, error
    this.startTime = null;
    this.endTime = null;
    this.duration = 0;
    
    // 取消和清理
    this.cancelled = false;
    this.cleanupCallbacks = [];
    
    // 配置选项
    this.config = {
      timeout: 30000,
      retries: 3,
      logLevel: 'info',
      enableMetrics: true,
      enableProgress: true,
      ...options.config
    };
    
    // 指标收集
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalErrors: 0,
      responseTimes: [],
      errorTypes: {},
      startTime: null,
      endTime: null
    };
    
    // 进度跟踪
    this.progress = {
      current: 0,
      total: 0,
      percentage: 0,
      stage: 'initializing',
      message: ''
    };
    
    // 绑定方法
    this.handleError = this.handleError.bind(this);
    this.updateProgress = this.updateProgress.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `${this.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 启动测试
   */
  async start(testConfig) {
    try {
      this.validateConfig(testConfig);
      
      this.state = 'running';
      this.startTime = Date.now();
      this.metrics.startTime = this.startTime;
      this.cancelled = false;
      
      this.log('info', `Starting ${this.name} test`, { id: this.id, config: testConfig });
      this.emit('start', { id: this.id, timestamp: this.startTime });
      
      // 子类实现具体的测试逻辑
      const result = await this.executeTest(testConfig);
      
      if (!this.cancelled) {
        this.state = 'completed';
        this.endTime = Date.now();
        this.duration = this.endTime - this.startTime;
        this.metrics.endTime = this.endTime;
        
        this.log('info', `Test completed successfully`, { 
          id: this.id, 
          duration: this.duration,
          metrics: this.getMetricsSummary()
        });
        
        this.emit('complete', { 
          id: this.id, 
          result, 
          metrics: this.metrics,
          duration: this.duration
        });
      }
      
      return result;
      
    } catch (error) {
      return this.handleError(error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 停止测试
   */
  async stop() {
    this.log('info', `Stopping test ${this.id}`);
    
    this.cancelled = true;
    this.state = 'stopped';
    this.endTime = Date.now();
    this.duration = this.endTime - (this.startTime || this.endTime);
    
    this.emit('stop', { id: this.id, timestamp: this.endTime });
    
    await this.cleanup();
  }

  /**
   * 暂停测试
   */
  pause() {
    if (this.state === 'running') {
      this.state = 'paused';
      this.log('info', `Test ${this.id} paused`);
      this.emit('pause', { id: this.id, timestamp: Date.now() });
    }
  }

  /**
   * 恢复测试
   */
  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      this.log('info', `Test ${this.id} resumed`);
      this.emit('resume', { id: this.id, timestamp: Date.now() });
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    if (!config) {
      throw new AppError('Test configuration is required', 400);
    }
    
    // 子类可以重写此方法添加特定验证
    return true;
  }

  /**
   * 执行测试 - 子类必须实现
   */
  async executeTest(config) {
    throw new AppError('executeTest method must be implemented by subclass', 500);
  }

  /**
   * 更新进度
   */
  updateProgress(current, total, stage = '', message = '') {
    this.progress.current = current;
    this.progress.total = total;
    this.progress.percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    this.progress.stage = stage;
    this.progress.message = message;
    
    if (this.config.enableProgress) {
      this.emit('progress', { ...this.progress, id: this.id });
    }
  }

  /**
   * 记录指标
   */
  recordMetric(type, value, metadata = {}) {
    if (!this.config.enableMetrics) return;
    
    switch (type) {
      case 'request':
        this.metrics.totalRequests++;
        break;
      case 'success':
        this.metrics.successfulRequests++;
        break;
      case 'failure':
        this.metrics.failedRequests++;
        break;
      case 'error':
        this.metrics.totalErrors++;
        const errorType = metadata.type || 'unknown';
        this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;
        break;
      case 'responseTime':
        this.metrics.responseTimes.push(value);
        break;
    }
    
    this.emit('metric', { type, value, metadata, id: this.id });
  }

  /**
   * 获取指标摘要
   */
  getMetricsSummary() {
    const responseTimes = this.metrics.responseTimes;
    const summary = {
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      successRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) : 0,
      totalErrors: this.metrics.totalErrors,
      errorTypes: this.metrics.errorTypes
    };
    
    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      summary.responseTime = {
        min: responseTimes[0],
        max: responseTimes[responseTimes.length - 1],
        avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
        p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
        p99: responseTimes[Math.floor(responseTimes.length * 0.99)]
      };
    }
    
    return summary;
  }

  /**
   * 错误处理
   */
  handleError(error) {
    this.state = 'error';
    this.endTime = Date.now();
    this.duration = this.endTime - (this.startTime || this.endTime);
    
    const standardError = {
      id: this.id,
      name: error.name || 'TestEngineError',
      message: error.message || 'Unknown error occurred',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      testDuration: this.duration
    };
    
    this.log('error', `Test failed: ${standardError.message}`, standardError);
    this.emit('error', standardError);
    
    return {
      success: false,
      error: standardError,
      metrics: this.getMetricsSummary()
    };
  }

  /**
   * 添加清理回调
   */
  addCleanupCallback(callback) {
    if (typeof callback === 'function') {
      this.cleanupCallbacks.push(callback);
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    this.log('debug', `Cleaning up test ${this.id}`);
    
    // 执行所有清理回调
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        this.log('warn', `Cleanup callback failed: ${error.message}`);
      }
    }
    
    // 清空回调数组
    this.cleanupCallbacks = [];
    
    this.emit('cleanup', { id: this.id, timestamp: Date.now() });
  }

  /**
   * 日志记录
   */
  log(level, message, metadata = {}) {
    const logData = {
      testId: this.id,
      testName: this.name,
      state: this.state,
      ...metadata
    };
    
    Logger[level](message, logData);
  }

  /**
   * 获取测试状态
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      state: this.state,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      progress: this.progress,
      metrics: this.getMetricsSummary(),
      cancelled: this.cancelled
    };
  }

  /**
   * 检查是否已取消
   */
  isCancelled() {
    return this.cancelled;
  }

  /**
   * 等待指定时间（可中断）
   */
  async sleep(ms) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.cancelled) {
          reject(new Error('Test was cancelled'));
        } else {
          resolve();
        }
      }, ms);
      
      // 添加清理回调
      this.addCleanupCallback(() => {
        clearTimeout(timeout);
      });
    });
  }
}

module.exports = BaseTestEngine;
