/**
 * 智能错误处理器
 * 提供统一的错误处理、分类、恢复和上报功能
 */

import { 
  ErrorSeverity, 
  ErrorCategory, 
  ErrorCode, 
  RecoveryStrategy, 
  RecoveryConfig, 
  ErrorMessages 
} from './ErrorTypes.js';

/**
 * 服务错误类
 */
export class ServiceError extends Error {
  constructor(code, message, details = {}, cause = null) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.details = details;
    this.cause = cause;
    this.timestamp = new Date().toISOString();
    this.severity = this.determineSeverity(code);
    this.category = this.determineCategory(code);
    this.recoverable = this.isRecoverable(code);
  }

  determineSeverity(code) {
    if (code >= 1000 && code < 2000) return ErrorSeverity.CRITICAL;
    if (code >= 2000 && code < 4000) return ErrorSeverity.HIGH;
    if (code >= 4000 && code < 7000) return ErrorSeverity.MEDIUM;
    if (code >= 7000 && code < 10000) return ErrorSeverity.LOW;
    return ErrorSeverity.INFO;
  }

  determineCategory(code) {
    if (code >= 1000 && code < 2000) return ErrorCategory.SYSTEM;
    if (code >= 2000 && code < 3000) return ErrorCategory.NETWORK;
    if (code >= 3000 && code < 4000) return ErrorCategory.DEPENDENCY;
    if (code >= 4000 && code < 5000) return ErrorCategory.INITIALIZATION;
    if (code >= 5000 && code < 6000) return ErrorCategory.VALIDATION;
    if (code >= 6000 && code < 7000) return ErrorCategory.PARSING;
    if (code >= 7000 && code < 8000) return ErrorCategory.PROCESSING;
    if (code >= 8000 && code < 9000) return ErrorCategory.CONFIGURATION;
    if (code >= 9000 && code < 10000) return ErrorCategory.CONTENT;
    if (code >= 10000 && code < 11000) return ErrorCategory.ANALYSIS;
    if (code >= 11000 && code < 12000) return ErrorCategory.RESOURCE;
    return ErrorCategory.SYSTEM;
  }

  isRecoverable(code) {
    return RecoveryConfig.hasOwnProperty(code);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      cause: this.cause?.message || null,
      timestamp: this.timestamp,
      severity: this.severity,
      category: this.category,
      recoverable: this.recoverable,
      stack: this.stack
    };
  }
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  constructor(serviceName = 'Unknown', options = {}) {
    this.serviceName = serviceName;
    this.options = {
      enableLogging: true,
      enableRecovery: true,
      enableMetrics: true,
      maxRetryAttempts: 3,
      retryDelayMs: 1000,
      ...options
    };
    
    // 错误统计
    this.errorStats = {
      total: 0,
      bySeverity: {},
      byCategory: {},
      byCode: {},
      recoverySuccess: 0,
      recoveryFailed: 0
    };

    // 当前重试计数
    this.retryCounters = new Map();
    
    // 错误监听器
    this.errorListeners = [];
  }

  /**
   * 处理错误
   */
  async handleError(error, context = {}) {
    try {
      // 转换为ServiceError
      const serviceError = this.normalizeError(error, context);
      
      // 记录错误
      this.recordError(serviceError);
      
      // 记录日志
      if (this.options.enableLogging) {
        this.logError(serviceError, context);
      }
      
      // 触发错误事件
      this.notifyErrorListeners(serviceError, context);
      
      // 尝试恢复
      if (this.options.enableRecovery && serviceError.recoverable) {
        const recoveryResult = await this.attemptRecovery(serviceError, context);
        if (recoveryResult.success) {
          return recoveryResult;
        }
      }
      
      // 如果无法恢复，重新抛出错误
      throw serviceError;
      
    } catch (processingError) {
      // 错误处理过程中的错误
      console.error('Error in error handler:', processingError);
      throw error; // 返回原始错误
    }
  }

  /**
   * 标准化错误
   */
  normalizeError(error, context) {
    if (error instanceof ServiceError) {
      return error;
    }

    // 根据错误类型和上下文确定错误代码
    let code = ErrorCode.SYSTEM_FAILURE;
    let message = error.message || '未知错误';
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      code = ErrorCode.NETWORK_UNAVAILABLE;
    } else if (error.code === 'TIMEOUT' || message.includes('timeout') || message.includes('TIMEOUT')) {
      code = ErrorCode.NETWORK_TIMEOUT;
    } else if (message.includes('parse') || message.includes('Parse') || message.toLowerCase().includes('parse error')) {
      code = ErrorCode.PARSING_FAILED;
    } else if (message.includes('validation') || message.includes('Invalid')) {
      code = ErrorCode.VALIDATION_FAILED;
    } else if (error.name === 'TypeError') {
      code = ErrorCode.VALIDATION_TYPE_MISMATCH;
    } else if (message.includes('memory') || message.includes('Memory')) {
      code = ErrorCode.MEMORY_EXCEEDED;
    }

    return new ServiceError(code, message, {
      originalError: error.name,
      originalMessage: error.message,
      service: this.serviceName,
      context
    }, error);
  }

  /**
   * 记录错误统计
   */
  recordError(serviceError) {
    if (!this.options.enableMetrics) return;

    this.errorStats.total++;
    
    // 按严重级别统计
    this.errorStats.bySeverity[serviceError.severity] = 
      (this.errorStats.bySeverity[serviceError.severity] || 0) + 1;
    
    // 按分类统计
    this.errorStats.byCategory[serviceError.category] = 
      (this.errorStats.byCategory[serviceError.category] || 0) + 1;
    
    // 按错误代码统计
    this.errorStats.byCode[serviceError.code] = 
      (this.errorStats.byCode[serviceError.code] || 0) + 1;
  }

  /**
   * 记录日志
   */
  logError(serviceError, context) {
    const logLevel = this.getLogLevel(serviceError.severity);
    const logMessage = this.formatLogMessage(serviceError, context);

    switch (logLevel) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      default:
    }
  }

  /**
   * 获取日志级别
   */
  getLogLevel(severity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'debug';
    }
  }

  /**
   * 格式化日志消息
   */
  formatLogMessage(serviceError, context) {
    return {
      timestamp: serviceError.timestamp,
      service: this.serviceName,
      severity: serviceError.severity,
      category: serviceError.category,
      code: serviceError.code,
      message: serviceError.message,
      details: serviceError.details,
      context: context,
      recoverable: serviceError.recoverable
    };
  }

  /**
   * 尝试错误恢复
   */
  async attemptRecovery(serviceError, context) {
    const recoveryConfig = RecoveryConfig[serviceError.code];
    if (!recoveryConfig) {
      return { success: false, reason: 'No recovery strategy defined' };
    }

    const retryKey = `${serviceError.code}_${context.operation || 'unknown'}`;
    const currentRetries = this.retryCounters.get(retryKey) || 0;

    try {
      switch (recoveryConfig.strategy) {
        case RecoveryStrategy.RETRY:
          return await this.retryOperation(serviceError, context, recoveryConfig);
          
        case RecoveryStrategy.FALLBACK:
          return await this.fallbackOperation(serviceError, context, recoveryConfig);
          
        case RecoveryStrategy.DEGRADE:
          return await this.degradeService(serviceError, context, recoveryConfig);
          
        case RecoveryStrategy.SKIP:
          return this.skipOperation(serviceError, context, recoveryConfig);
          
        case RecoveryStrategy.WAIT_AND_RETRY:
          return await this.waitAndRetry(serviceError, context, recoveryConfig);
          
        case RecoveryStrategy.RESET:
          return await this.resetOperation(serviceError, context, recoveryConfig);
          
        default:
          return { success: false, reason: 'Unknown recovery strategy' };
      }
    } catch (recoveryError) {
      this.errorStats.recoveryFailed++;
      return { 
        success: false, 
        reason: 'Recovery attempt failed',
        error: recoveryError.message
      };
    }
  }

  /**
   * 重试操作
   */
  async retryOperation(serviceError, context, config) {
    const retryKey = `${serviceError.code}_${context.operation || 'unknown'}`;
    const currentRetries = this.retryCounters.get(retryKey) || 0;

    if (currentRetries >= (config.maxRetries || this.options.maxRetryAttempts)) {
      this.retryCounters.delete(retryKey);
      return { success: false, reason: 'Max retry attempts exceeded' };
    }

    // 计算延迟时间（指数退避）
    const delay = (config.retryDelay || this.options.retryDelayMs) * 
      Math.pow(config.backoffMultiplier || 2, currentRetries);

    // 等待
    await this.sleep(delay);

    // 更新重试计数
    this.retryCounters.set(retryKey, currentRetries + 1);

      // 如果有重试函数，调用它
    if (context.retryFunction && typeof context.retryFunction === 'function') {
      try {
        const result = await context.retryFunction();
        this.retryCounters.delete(retryKey); // 成功后清除计数
        this.errorStats.recoverySuccess++;
        return { success: true, result, strategy: 'retry', attempts: currentRetries + 1 };
      } catch (retryError) {
        // 如果还有重试次数，继续重试
        if (currentRetries + 1 < (config.maxRetries || this.options.maxRetryAttempts)) {
          return await this.attemptRecovery(
            this.normalizeError(retryError, context), 
            context
          );
        } else {
          // 达到最大重试次数，清除计数器并返回失败
          this.retryCounters.delete(retryKey);
          this.errorStats.recoveryFailed++;
          return { success: false, reason: 'Max retry attempts exceeded', error: retryError.message };
        }
      }
    }

    return { success: false, reason: 'No retry function provided' };
  }

  /**
   * 备用方案
   */
  async fallbackOperation(serviceError, context, config) {
    if (context.fallbackFunction && typeof context.fallbackFunction === 'function') {
      try {
        const result = await context.fallbackFunction();
        this.errorStats.recoverySuccess++;
        return { success: true, result, strategy: 'fallback' };
      } catch (fallbackError) {
        return { success: false, reason: 'Fallback operation failed', error: fallbackError.message };
      }
    }

    return { success: false, reason: 'No fallback function provided' };
  }

  /**
   * 服务降级
   */
  async degradeService(serviceError, context, config) {
    if (context.degradeFunction && typeof context.degradeFunction === 'function') {
      try {
        const result = await context.degradeFunction();
        this.errorStats.recoverySuccess++;
        return { success: true, result, strategy: 'degrade', degraded: true };
      } catch (degradeError) {
        return { success: false, reason: 'Service degradation failed', error: degradeError.message };
      }
    }

    return { success: false, reason: 'No degradation function provided' };
  }

  /**
   * 跳过操作
   */
  skipOperation(serviceError, context, config) {
    this.errorStats.recoverySuccess++;
    return { 
      success: true, 
      result: null, 
      strategy: 'skip',
      message: config.skipMessage || '操作已跳过'
    };
  }

  /**
   * 等待重试
   */
  async waitAndRetry(serviceError, context, config) {
    const delay = config.retryDelay || 5000;
    await this.sleep(delay);
    
    return await this.retryOperation(serviceError, context, {
      ...config,
      strategy: RecoveryStrategy.RETRY
    });
  }

  /**
   * 重置操作
   */
  async resetOperation(serviceError, context, config) {
    if (context.resetFunction && typeof context.resetFunction === 'function') {
      try {
        await context.resetFunction();
        this.errorStats.recoverySuccess++;
        return { success: true, strategy: 'reset', message: '状态已重置' };
      } catch (resetError) {
        return { success: false, reason: 'Reset operation failed', error: resetError.message };
      }
    }

    return { success: false, reason: 'No reset function provided' };
  }

  /**
   * 创建错误
   */
  createError(code, details = {}, cause = null) {
    let message = ErrorMessages[code] || '未知错误';
    
    // 替换模板变量
    Object.keys(details).forEach(key => {
      message = message.replace(`{${key}}`, details[key]);
    });

    return new ServiceError(code, message, details, cause);
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      service: this.serviceName,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 重置错误统计
   */
  resetErrorStats() {
    this.errorStats = {
      total: 0,
      bySeverity: {},
      byCategory: {},
      byCode: {},
      recoverySuccess: 0,
      recoveryFailed: 0
    };
    this.retryCounters.clear();
  }

  /**
   * 添加错误监听器
   */
  addErrorListener(listener) {
    if (typeof listener === 'function') {
      this.errorListeners.push(listener);
    }
  }

  /**
   * 移除错误监听器
   */
  removeErrorListener(listener) {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 通知错误监听器
   */
  notifyErrorListeners(error, context) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error, context, this.serviceName);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * 工具方法：睡眠
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ErrorHandler;
