/**
 * 基础测试引擎抽象类
 * 提供所有测试引擎的通用功能和默认实现
 */

const Joi = require('joi');

class BaseTestEngine {
  constructor() {
    this.name = 'base';
    this.version = '1.0.0';
    this.activeTests = new Map();
    this.testHistory = [];
  }

  /**
   * 检查引擎可用性
   * 子类应该重写此方法
   */
  async checkAvailability() {
    return {
      available: true,
      version: this.version,
      capabilities: this.getCapabilities()
    };
  }

  /**
   * 获取引擎能力
   * 子类应该重写此方法
   */
  getCapabilities() {
    return {
      supportedTests: [],
      maxConcurrent: 1,
      timeout: 60000
    };
  }

  /**
   * 验证配置
   * 子类可以重写此方法添加自定义验证
   */
  validateConfig(config) {
    const baseSchema = Joi.object({
      url: Joi.string().uri().optional(),
      timeout: Joi.number().min(1000).max(300000).default(60000)
    });


    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const { error, value } = baseSchema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * 执行测试
   * 子类必须重写此方法
   */
  async executeTest(config) {
    throw new Error('executeTest 方法必须在子类中实现');
  }

  /**
   * 运行测试的通用方法
   */
  async runTest(config) {
    const testId = `${this.name}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
        config: validatedConfig
      });

      const results = await this.executeTest(validatedConfig);
      
      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });

      // 添加到历史记录
      this.testHistory.push({
        testId,
        results,
        timestamp: new Date(),
        config: validatedConfig
      });

      // 限制历史记录大小
      if (this.testHistory.length > 100) {
        this.testHistory.shift();
      }

      return {
        success: true,
        testId,
        results,
        duration: Date.now() - this.activeTests.get(testId)?.startTime || 0
      };

    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test && test.status === 'running') {
      this.activeTests.set(testId, {
        ...test,
        status: 'stopped'
      });
      return true;
    }
    return false;
  }

  /**
   * 获取所有活动测试
   */
  getActiveTests() {
    return Array.from(this.activeTests.entries()).map(([testId, test]) => ({
      testId,
      ...test
    }));
  }

  /**
   * 获取测试历史
   */
  getTestHistory(limit = 10) {
    return this.testHistory.slice(-limit).reverse();
  }

  /**
   * 清理资源
   */
  async cleanup() {
    this.activeTests.clear();
    this.testHistory = [];
  }

  /**
   * 更新测试进度
   */
  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        progress,
        message,
        lastUpdate: Date.now()
      });
    }
  }

  /**
   * 生成测试报告
   */
  generateReport(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`测试 ${testId} 不存在`);
    }

    return {
      testId,
      engineName: this.name,
      engineVersion: this.version,
      timestamp: new Date().toISOString(),
      status: test.status,
      progress: test.progress,
      duration: Date.now() - test.startTime,
      results: test.results,
      config: test.config
    };
  }

  /**
   * 获取引擎信息
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      capabilities: this.getCapabilities(),
      available: this.checkAvailability()
    };
  }
}

module.exports = BaseTestEngine;
