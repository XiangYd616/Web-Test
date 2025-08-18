/**
 * 测试引擎服务
 * 统一管理所有测试引擎的调用和结果处理
 */

const { v4: uuidv4 } = require('uuid');

// 导入所有测试引擎
const performanceEngine = require('../../engines/performance/performanceTestEngine');
const seoEngine = require('../../engines/seo/seoTestEngine');
const securityEngine = require('../../engines/security/securityTestEngine');
const compatibilityEngine = require('../../engines/compatibility/compatibilityTestEngine');
const apiEngine = require('../../engines/api/apiTestEngine');
const stressEngine = require('../../engines/stress/stressTestEngine');
const uxEngine = require('../../engines/ux/uxTestEngine');
const infrastructureEngine = require('../../engines/infrastructure/infrastructureTestEngine');

class TestEngineService {
  constructor() {
    this.engines = {
      performance: performanceEngine,
      seo: seoEngine,
      security: securityEngine,
      compatibility: compatibilityEngine,
      api: apiEngine,
      stress: stressEngine,
      ux: uxEngine,
      infrastructure: infrastructureEngine
    };

    this.activeTests = new Map();
    this.testResults = new Map();
  }

  /**
   * 获取所有可用的测试引擎
   */
  getAvailableEngines() {
    return Object.keys(this.engines);
  }

  /**
   * 检查测试引擎是否可用
   */
  async checkEngineAvailability(engineType) {
    const engine = this.engines[engineType];
    if (!engine) {
      return { available: false, error: '未知的测试引擎类型' };
    }

    try {
      if (typeof engine.checkAvailability === 'function') {
        return await engine.checkAvailability();
      }
      return { available: true };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * 启动测试
   */
  async startTest(testType, url, options = {}) {
    const engine = this.engines[testType];
    if (!engine) {
      throw new Error(`不支持的测试类型: ${testType}`);
    }

    const testId = uuidv4();
    const startTime = new Date();

    // 记录测试状态
    this.activeTests.set(testId, {
      id: testId,
      type: testType,
      url,
      status: 'running',
      progress: 0,
      startTime,
      message: '测试初始化中...'
    });

    try {
      // 根据不同引擎调用相应的方法
      let result;

      // 统一的配置对象
      const testConfig = { url, ...options };

      switch (testType) {
        case 'performance':
          result = await engine.runPerformanceTest(testConfig);
          break;
        case 'seo':
          result = await engine.runSeoTest(testConfig);
          break;
        case 'security':
          result = await engine.runSecurityTest(testConfig);
          break;
        case 'compatibility':
          result = await engine.runCompatibilityTest(testConfig);
          break;
        case 'api':
          result = await engine.runApiTest(testConfig);
          break;
        case 'stress':
          result = await engine.runStressTest(testConfig);
          break;
        case 'ux':
          result = await engine.runUxTest(testConfig);
          break;
        case 'infrastructure':
          result = await engine.runInfrastructureTest(testConfig);
          break;
        default:
          throw new Error(`不支持的测试类型: ${testType}`);
      }

      // 保存测试结果
      const finalResult = {
        id: testId,
        type: testType,
        url,
        result,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        status: 'completed'
      };

      this.testResults.set(testId, finalResult);

      // 更新测试状态
      this.activeTests.set(testId, {
        ...this.activeTests.get(testId),
        status: 'completed',
        progress: 100,
        endTime: new Date(),
        message: '测试完成'
      });

      return { testId, status: 'completed', result };

    } catch (error) {
      // 更新失败状态
      this.activeTests.set(testId, {
        ...this.activeTests.get(testId),
        status: 'failed',
        error: error.message,
        endTime: new Date(),
        message: '测试失败'
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
   * 获取测试结果
   */
  getTestResult(testId) {
    return this.testResults.get(testId);
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error('测试不存在');
    }

    if (test.status !== 'running') {
      throw new Error('测试已经结束');
    }

    // 尝试停止引擎中的测试
    const engine = this.engines[test.type];
    if (engine && typeof engine.stopTest === 'function') {
      try {
        await engine.stopTest(testId);
      } catch (error) {
        console.warn('停止引擎测试失败:', error);
      }
    }

    // 更新状态
    this.activeTests.set(testId, {
      ...test,
      status: 'cancelled',
      endTime: new Date(),
      message: '测试已取消'
    });

    return { success: true, message: '测试已停止' };
  }

  /**
   * 运行综合测试
   */
  async runComprehensiveTest(url, options = {}) {
    const testTypes = options.testTypes || ['performance', 'seo', 'security'];
    const results = {};
    const errors = {};

    for (const testType of testTypes) {
      try {
        const result = await this.startTest(testType, url, options[testType] || {});
        results[testType] = result;
      } catch (error) {
        errors[testType] = error.message;
      }
    }

    // 计算综合评分
    const overallScore = this.calculateOverallScore(results);

    return {
      url,
      timestamp: new Date().toISOString(),
      results,
      errors,
      overall: overallScore,
      summary: this.generateTestSummary(results, errors)
    };
  }

  /**
   * 计算综合评分
   */
  calculateOverallScore(results) {
    const scores = [];

    Object.values(results).forEach(result => {
      if (result.result && typeof result.result.score === 'number') {
        scores.push(result.result.score);
      } else if (result.result && result.result.summary && typeof result.result.summary.score === 'number') {
        scores.push(result.result.summary.score);
      }
    });

    if (scores.length === 0) {
      return { score: 0, grade: 'F', message: '无法计算评分' };
    }

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    return {
      score: Math.round(averageScore),
      grade: this.getGrade(averageScore),
      breakdown: scores,
      message: this.getScoreMessage(averageScore)
    };
  }

  /**
   * 获取评级
   */
  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取评分说明
   */
  getScoreMessage(score) {
    if (score >= 90) return '优秀 - 网站表现出色';
    if (score >= 80) return '良好 - 网站表现不错，有小幅优化空间';
    if (score >= 70) return '一般 - 网站表现中等，建议优化';
    if (score >= 60) return '较差 - 网站存在明显问题，需要改进';
    return '很差 - 网站存在严重问题，急需优化';
  }

  /**
   * 生成测试摘要
   */
  generateTestSummary(results, errors) {
    const totalTests = Object.keys(results).length + Object.keys(errors).length;
    const successfulTests = Object.keys(results).length;
    const failedTests = Object.keys(errors).length;

    const issues = [];
    const recommendations = [];

    // 收集所有问题和建议
    Object.values(results).forEach(result => {
      if (result.result && result.result.issues) {
        issues.push(...result.result.issues);
      }
      if (result.result && result.result.recommendations) {
        recommendations.push(...result.result.recommendations);
      }
    });

    return {
      totalTests,
      successfulTests,
      failedTests,
      successRate: Math.round((successfulTests / totalTests) * 100),
      totalIssues: issues.length,
      criticalIssues: issues.filter(issue =>
        issue.severity === 'critical' || issue.severity === 'high'
      ).length,
      topRecommendations: recommendations.slice(0, 5)
    };
  }

  /**
   * 获取引擎健康状态
   */
  async getEngineHealthStatus() {
    const status = {};

    for (const [engineType, engine] of Object.entries(this.engines)) {
      try {
        const availability = await this.checkEngineAvailability(engineType);
        status[engineType] = {
          available: availability.available,
          healthy: availability.available && !availability.error,
          lastCheck: new Date().toISOString(),
          version: availability.version,
          error: availability.error
        };
      } catch (error) {
        status[engineType] = {
          available: false,
          healthy: false,
          lastCheck: new Date().toISOString(),
          error: error.message
        };
      }
    }

    return status;
  }

  /**
   * 清理过期的测试数据
   */
  cleanupExpiredTests(maxAge = 24 * 60 * 60 * 1000) { // 24小时
    const now = Date.now();

    for (const [testId, test] of this.activeTests.entries()) {
      if (test.startTime && (now - test.startTime.getTime()) > maxAge) {
        this.activeTests.delete(testId);
      }
    }

    for (const [testId, result] of this.testResults.entries()) {
      if (result.startTime && (now - result.startTime.getTime()) > maxAge) {
        this.testResults.delete(testId);
      }
    }
  }
}

// 创建单例实例
const testEngineService = new TestEngineService();

// 定期清理过期数据
setInterval(() => {
  testEngineService.cleanupExpiredTests();
}, 60 * 60 * 1000); // 每小时清理一次

module.exports = testEngineService;
