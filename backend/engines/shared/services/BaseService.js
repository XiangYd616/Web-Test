/**
 * 基础服务类
 * 提供所有共享服务的公共接口和通用功能
 */

class BaseService {
  constructor(name) {
    this.name = name;
    this.version = '1.0.0';
    this.initialized = false;
    this.dependencies = [];
  }

  /**
   * 初始化服务
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      await this.checkDependencies();
      await this.performInitialization();
      this.initialized = true;
      return true;
    } catch (error) {
      throw new Error(`${this.name}服务初始化失败: ${error.message}`);
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
        void error;
        throw new Error(`缺少必需依赖: ${dependency}`);
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
    return {
      available: this.initialized,
      name: this.name,
      version: this.version,
      dependencies: this.dependencies
    };
  }

  /**
   * 验证配置参数
   */
  validateConfig(config, schema) {
    if (!config) {
      throw new Error('配置参数不能为空');
    }

    if (schema && typeof schema.validate === 'function') {

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const { error, value } = schema.validate(config);
      if (error) {
        throw new Error(`配置验证失败: ${error.details[0].message}`);
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
        throw error;
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
      console.debug(`[${this.name}] Performance`, logData);
    }
  }

  /**
   * 处理错误
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
      context
    };
  }

  /**
   * 清理资源（子类可重写）
   */
  async cleanup() {
    this.initialized = false;
  }
}

module.exports = BaseService;
