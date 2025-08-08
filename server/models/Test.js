/**
 * 测试数据模型
 * 对应前端 src/types/unified/models.ts 中的测试相关接口
 * 版本: v2.0.0 - 与前端类型定义保持一致
 */

// 测试类型枚举 - 与前端保持一致
const TestType = {
  PERFORMANCE: 'performance',
  CONTENT: 'content',
  SECURITY: 'security',
  API: 'api',
  STRESS: 'stress',
  COMPATIBILITY: 'compatibility'
};

// 测试状态枚举 - 与前端保持一致
const TestStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

class Test {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;
    this.type = data.type || TestType.PERFORMANCE;
    this.url = data.url || '';
    this.config = data.config || {};
    this.status = data.status || TestStatus.PENDING;
    this.results = data.results || null;
    this.metrics = data.metrics || {};
    this.errors = data.errors || [];
    this.startTime = data.startTime || null;
    this.endTime = data.endTime || null;
    this.duration = data.duration || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.metadata = data.metadata || {};
  }

  /**
   * 验证测试数据
   */
  validate() {
    const errors = [];

    if (!this.url || !this.isValidUrl(this.url)) {
      errors.push('请提供有效的URL');
    }

    if (!Object.values(TestType).includes(this.type)) {
      errors.push('无效的测试类型');
    }

    if (!Object.values(TestStatus).includes(this.status)) {
      errors.push('无效的测试状态');
    }

    // 根据测试类型验证配置
    const configValidation = this.validateConfig();
    if (!configValidation.isValid) {
      errors.push(...configValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证URL格式
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证测试配置
   */
  validateConfig() {
    const errors = [];

    switch (this.type) {
      case TestType.PERFORMANCE:
        if (!this.config.users || this.config.users < 1) {
          errors.push('性能测试需要指定用户数量');
        }
        if (!this.config.duration || this.config.duration < 1) {
          errors.push('性能测试需要指定持续时间');
        }
        break;

      case TestType.API:
        if (!this.config.method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(this.config.method)) {
          errors.push('API测试需要指定有效的HTTP方法');
        }
        break;

      case TestType.STRESS:
        if (!this.config.maxUsers || this.config.maxUsers < 1) {
          errors.push('压力测试需要指定最大用户数');
        }
        if (!this.config.duration || this.config.duration < 1) {
          errors.push('压力测试需要指定持续时间');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 开始测试
   */
  start() {
    this.status = 'running';
    this.startTime = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 完成测试
   */
  complete(results = null, metrics = {}) {
    this.status = 'completed';
    this.endTime = new Date().toISOString();
    this.results = results;
    this.metrics = metrics;

    if (this.startTime) {
      this.duration = new Date(this.endTime) - new Date(this.startTime);
    }

    this.updatedAt = new Date().toISOString();
  }

  /**
   * 测试失败
   */
  fail(error = null) {
    this.status = 'failed';
    this.endTime = new Date().toISOString();

    if (error) {
      this.errors.push({
        message: error.message || error,
        timestamp: new Date().toISOString(),
        stack: error.stack || null
      });
    }

    if (this.startTime) {
      this.duration = new Date(this.endTime) - new Date(this.startTime);
    }

    this.updatedAt = new Date().toISOString();
  }

  /**
   * 取消测试
   */
  cancel() {
    this.status = 'cancelled';
    this.endTime = new Date().toISOString();

    if (this.startTime) {
      this.duration = new Date(this.endTime) - new Date(this.startTime);
    }

    this.updatedAt = new Date().toISOString();
  }

  /**
   * 转换为数据库格式
   */
  toDatabase() {
    return {
      id: this.id,
      user_id: this.userId,
      type: this.type,
      url: this.url,
      config: JSON.stringify(this.config),
      status: this.status,
      results: this.results ? JSON.stringify(this.results) : null,
      metrics: JSON.stringify(this.metrics),
      errors: JSON.stringify(this.errors),
      start_time: this.startTime,
      end_time: this.endTime,
      duration: this.duration,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      metadata: JSON.stringify(this.metadata)
    };
  }

  /**
   * 从数据库格式创建实例
   */
  static fromDatabase(dbData) {
    if (!dbData) return null;

    return new Test({
      id: dbData.id,
      userId: dbData.user_id,
      type: dbData.type,
      url: dbData.url,
      config: dbData.config ? JSON.parse(dbData.config) : {},
      status: dbData.status,
      results: dbData.results ? JSON.parse(dbData.results) : null,
      metrics: dbData.metrics ? JSON.parse(dbData.metrics) : {},
      errors: dbData.errors ? JSON.parse(dbData.errors) : [],
      startTime: dbData.start_time,
      endTime: dbData.end_time,
      duration: dbData.duration,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at,
      metadata: dbData.metadata ? JSON.parse(dbData.metadata) : {}
    });
  }

  /**
   * 转换为API响应格式
   */
  toAPI() {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      url: this.url,
      config: this.config,
      status: this.status,
      results: this.results,
      metrics: this.metrics,
      errors: this.errors,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }

  /**
   * 获取测试进度百分比
   */
  getProgress() {
    if (this.status === 'pending') return 0;
    if (this.status === 'completed' || this.status === 'failed' || this.status === 'cancelled') return 100;

    // 对于运行中的测试，可以根据具体类型计算进度
    if (this.status === 'running' && this.startTime) {
      const elapsed = Date.now() - new Date(this.startTime).getTime();
      const expectedDuration = (this.config.duration || 60) * 1000; // 默认60秒
      const progress = Math.min((elapsed / expectedDuration) * 100, 99);
      return Math.round(progress);
    }

    return 0;
  }

  /**
   * 检查测试是否正在运行
   */
  isRunning() {
    return this.status === 'running';
  }

  /**
   * 检查测试是否已完成
   */
  isCompleted() {
    return [TestStatus.COMPLETED, TestStatus.FAILED, TestStatus.CANCELLED].includes(this.status);
  }
}

// 导出类和枚举
module.exports = Test;
module.exports.TestType = TestType;
module.exports.TestStatus = TestStatus;
