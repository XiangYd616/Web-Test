/**
 * 增强版基础服务类
 * 为所有共享服务提供统一的基础功能，包括错误处理和恢复机制
 */

import ErrorHandler, { ServiceError } from '../errors/ErrorHandler.js';
import { ErrorCode } from '../errors/ErrorTypes.js';

class BaseService {
  constructor(serviceName = 'BaseService') {
    this.name = serviceName;
    this.serviceName = serviceName; // 保持兼容性
    this.version = '2.0.0'; // 升级版本
    this.initialized = false;
    this.dependencies = [];
    this.lastError = null;
    
    // 初始化错误处理器
    this.errorHandler = new ErrorHandler(serviceName, {
      enableLogging: true,
      enableRecovery: true,
      enableMetrics: true,
      maxRetryAttempts: 3,
      retryDelayMs: 1000
    });
    
    // 绑定错误监听器
    this.errorHandler.addErrorListener((error, context, service) => {
      this.onError(error, context);
    });
  }

  /**
   * 初始化服务
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      // 使用错误处理器执行初始化
      const result = await this.executeWithErrorHandling(async () => {
        await this.checkDependencies();
        await this.performInitialization();
        return true;
      }, {
        operationName: 'initialize',
        retryFunction: async () => {
          await this.performInitialization();
          return true;
        }
      });

      if (result && result.success) {
        this.initialized = true;
        return true;
      } else if (result === true) {
        this.initialized = true;
        return true;
      }
      
      return false;
    } catch (error) {
      this.lastError = error;
      throw error;
    }
  }

  /**
   * 检查依赖项
   */
  async checkDependencies() {
    for (const dependency of this.dependencies) {
      try {
        // 使用动态import检查依赖
        await import(dependency);
      } catch (error) {
        const serviceError = this.errorHandler.createError(
          ErrorCode.DEPENDENCY_MISSING,
          { dependency },
          error
        );
        throw serviceError;
      }
    }
  }

  /**
   * 执行具体初始化逻辑（子类重写）
   */
  async performInitialization() {
    // 子类实现具体初始化逻辑
  }

  /**
   * 检查服务可用性
   */
  checkAvailability() {
    const errorStats = this.errorHandler.getErrorStats();
    
    return {
      available: this.initialized,
      name: this.name,
      version: this.version,
      dependencies: this.dependencies,
      lastError: this.lastError?.message || null,
      status: this.initialized ? 'ready' : 'not_ready',
      errorStats: {
        totalErrors: errorStats.total,
        recoverySuccessRate: errorStats.total > 0 ? 
          Math.round((errorStats.recoverySuccess / errorStats.total) * 100) : 0,
        criticalErrors: errorStats.bySeverity.critical || 0
      }
    };
  }

  /**
   * 验证配置参数
   */
  validateConfig(config, schema) {
    if (!config) {
      throw this.createError(ErrorCode.CONFIG_MISSING);
    }

    if (schema && typeof schema.validate === 'function') {

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const { error, value } = schema.validate(config);
      if (error) {
        throw this.createError(ErrorCode.CONFIG_INVALID, {
          field: error.details[0].path.join('.'),
          details: error.details[0].message
        });
      }
      return value;
    }

    return config;
  }

  /**
   * 记录性能指标
   */
  measurePerformance(label, fn) {
    return async (...args) => {
      const startTime = Date.now();
      try {
        const result = await fn.apply(this, args);
        const duration = Date.now() - startTime;
        this.logPerformance(label, duration, 'success');
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logPerformance(label, duration, 'error', error.message);
        
        // 通过错误处理器处理
        throw await this.errorHandler.handleError(error, {
          operation: label,
          duration: duration
        });
      }
    };
  }

  /**
   * 记录性能日志
   */
  logPerformance(label, duration, status, error = null) {
    const logData = {
      service: this.name,
      operation: label,
      duration: `${duration}ms`,
      status,
      timestamp: new Date().toISOString()
    };

    if (error) {
      logData.error = error;
    }

    // 可以集成到实际的日志系统中
    if (process.env.NODE_ENV === 'development') {
    }
  }

  /**
   * 处理错误（保持向后兼容）
   */
  handleError(error, context = '') {
    const errorInfo = {
      service: this.name,
      context,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    // 记录错误日志
    console.error(`[${this.name}] Error in ${context}:`, errorInfo);

    return {
      success: false,
      error: error.message,
      service: this.name,
      context
    };
  }

  /**
   * 执行操作并处理错误
   */
  async executeWithErrorHandling(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      return await this.errorHandler.handleError(error, {
        ...context,
        service: this.name,
        operation: context.operationName || 'unknown'
      });
    }
  }

  /**
   * 创建服务专用错误
   */
  createError(code, details = {}, cause = null) {
    return this.errorHandler.createError(code, {
      ...details,
      service: this.name
    }, cause);
  }

  /**
   * 错误事件处理器（可被子类重写）
   */
  onError(error, context) {
    this.lastError = error;
    // 子类可以重写此方法来处理特定的错误事件
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    return this.errorHandler.getErrorStats();
  }

  /**
   * 重置错误统计
   */
  resetErrorStats() {
    this.errorHandler.resetErrorStats();
    this.lastError = null;
  }

  /**
   * 创建成功响应
   */
  createSuccessResponse(data, metadata = {}) {
    return {
      success: true,
      service: this.name,
      timestamp: new Date().toISOString(),
      data,
      metadata
    };
  }

  /**
   * 创建错误响应
   */
  createErrorResponse(error, context = '') {
    return {
      success: false,
      service: this.name,
      timestamp: new Date().toISOString(),
      error: error.message || error,
      context,
      code: error.code || null,
      severity: error.severity || null
    };
  }

  /**
   * 安全执行操作，返回标准响应格式
   */
  async safeExecute(operation, context = '') {
    try {
      const result = await this.executeWithErrorHandling(operation, {
        operationName: context
      });
      
      if (result && result.success !== undefined) {
        return result; // 已经是恢复结果
      }
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error, context);
    }
  }

  /**
   * 获取服务信息
   */
  getServiceInfo() {
    return {
      name: this.name,
      version: this.version,
      initialized: this.initialized,
      capabilities: this.getCapabilities(),
      dependencies: this.dependencies,
      errorHandler: {
        stats: this.errorHandler.getErrorStats(),
        hasRecoveryStrategies: true
      }
    };
  }

  /**
   * 获取服务能力（子类重写）
   */
  getCapabilities() {
    return ['error-handling', 'recovery', 'performance-monitoring'];
  }

  /**
   * 清理资源（子类可重写）
   */
  async cleanup() {
    this.initialized = false;
    this.resetErrorStats();
  }
}

export default BaseService;
