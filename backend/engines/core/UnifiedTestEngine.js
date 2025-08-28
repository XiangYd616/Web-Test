/**
 * 🧠 统一测试引擎 - 超级大脑系统核心
 * 消除所有测试工具的功能重复，提供统一的测试服务
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

// 导入核心测试服务
const PerformanceTestCore = require('./services/PerformanceTestCore');
const SecurityTestCore = require('./services/SecurityTestCore');
const HTTPTestCore = require('./services/HTTPTestCore');
const AnalysisCore = require('./services/AnalysisCore');
const { ValidationCore } = require('../../services/ValidationCore');

class UnifiedTestEngine extends EventEmitter {
  constructor() {
    super();
    this.name = 'unified-test-engine';
    this.version = '2.0.0';

    // 初始化核心服务
    this.performance = new PerformanceTestCore();
    this.security = new SecurityTestCore();
    this.http = new HTTPTestCore();
    this.analysis = new AnalysisCore();
    this.validation = new ValidationCore();

    // 活跃测试管理
    this.activeTests = new Map();
    this.testResults = new Map();

    // 测试类型注册表
    this.testTypes = new Map();
    this.registerDefaultTestTypes();

    console.log('🧠 统一测试引擎已启动');
  }

  /**
   * 注册默认测试类型
   */
  registerDefaultTestTypes() {
    // 性能测试类型
    this.registerTestType('performance', {
      name: '性能测试',
      core: 'performance',
      methods: ['coreWebVitals', 'pageSpeed', 'resourceAnalysis', 'caching'],
      dependencies: ['lighthouse', 'puppeteer']
    });

    // 安全测试类型
    this.registerTestType('security', {
      name: '安全测试',
      core: 'security',
      methods: ['sslCheck', 'securityHeaders', 'vulnerabilityScan', 'cookieAnalysis'],
      dependencies: ['tls', 'axios']
    });

    // API测试类型
    this.registerTestType('api', {
      name: 'API测试',
      core: 'http',
      methods: ['endpointTest', 'authenticationTest', 'performanceTest', 'securityTest'],
      dependencies: ['axios', 'joi']
    });

    // 压力测试类型
    this.registerTestType('stress', {
      name: '压力测试',
      core: 'http',
      methods: ['loadTest', 'concurrencyTest', 'enduranceTest'],
      dependencies: ['k6', 'axios']
    });

    // 兼容性测试类型
    this.registerTestType('compatibility', {
      name: '兼容性测试',
      core: 'analysis',
      methods: ['browserCompatibility', 'deviceCompatibility', 'accessibilityTest'],
      dependencies: ['puppeteer', 'axe-core']
    });
  }

  /**
   * 注册测试类型
   */
  registerTestType(id, config) {
    this.testTypes.set(id, {
      id,
      ...config,
      registeredAt: new Date().toISOString()
    });
    console.log(`✅ 测试类型已注册: ${config.name} (${id})`);
  }

  /**
   * 执行统一测试
   */
  async executeTest(testType, config, options = {}) {
    const testId = options.testId || uuidv4();

    try {
      // 验证测试类型
      if (!this.testTypes.has(testType)) {
        throw new Error(`未知的测试类型: ${testType}`);
      }

      const typeConfig = this.testTypes.get(testType);

      // 初始化测试会话
      this.initializeTestSession(testId, testType, config, options);

      // 执行测试
      const result = await this.runTestByType(testId, typeConfig, config, options);

      // 后处理和分析
      const finalResult = await this.postProcessResult(testId, result, typeConfig);

      // 保存结果
      this.testResults.set(testId, finalResult);

      // 发送完成事件
      this.emit('testCompleted', testId, finalResult);

      // 通过WebSocket广播测试完成
      if (global.unifiedEngineWSHandler) {
        global.unifiedEngineWSHandler.broadcastTestCompleted(testId, finalResult);
      }

      return finalResult;

    } catch (error) {
      this.handleTestError(testId, error);
      throw error;
    }
  }

  /**
   * 初始化测试会话
   */
  initializeTestSession(testId, testType, config, options) {
    const session = {
      testId,
      testType,
      config,
      options,
      startTime: Date.now(),
      status: 'running',
      progress: 0,
      currentStep: '初始化测试...'
    };

    this.activeTests.set(testId, session);
    this.emit('testStarted', testId, session);

    console.log(`🚀 测试会话已启动: ${testId} (${testType})`);
  }

  /**
   * 根据测试类型执行测试
   */
  async runTestByType(testId, typeConfig, config, options) {
    const coreService = this[typeConfig.core];
    if (!coreService) {
      throw new Error(`核心服务未找到: ${typeConfig.core}`);
    }

    this.updateTestProgress(testId, 10, `启动${typeConfig.name}...`);

    // 根据测试类型调用相应的核心服务
    switch (typeConfig.core) {
      case 'performance':
        return await this.executePerformanceTest(testId, config, options);

      case 'security':
        return await this.executeSecurityTest(testId, config, options);

      case 'http':
        return await this.executeHTTPTest(testId, config, options);

      case 'analysis':
        return await this.executeAnalysisTest(testId, config, options);

      default:
        throw new Error(`未实现的核心服务: ${typeConfig.core}`);
    }
  }

  /**
   * 执行性能测试
   */
  async executePerformanceTest(testId, config, options) {
    this.updateTestProgress(testId, 20, '开始性能分析...');

    const results = {};

    // Core Web Vitals 检测
    if (config.checkCoreWebVitals !== false) {
      this.updateTestProgress(testId, 30, '检测 Core Web Vitals...');
      results.coreWebVitals = await this.performance.getCoreWebVitals(config.url, config);
    }

    // 页面速度分析
    if (config.checkPageSpeed !== false) {
      this.updateTestProgress(testId, 50, '分析页面加载速度...');
      results.pageSpeed = await this.performance.analyzePageSpeed(config.url, config);
    }

    // 资源优化分析
    if (config.checkResources !== false) {
      this.updateTestProgress(testId, 70, '分析资源优化...');
      results.resources = await this.performance.analyzeResources(config.url, config);
    }

    // 缓存策略分析
    if (config.checkCaching !== false) {
      this.updateTestProgress(testId, 85, '分析缓存策略...');
      results.caching = await this.performance.analyzeCaching(config.url, config);
    }

    this.updateTestProgress(testId, 95, '生成性能报告...');

    return {
      testType: 'performance',
      url: config.url,
      timestamp: new Date().toISOString(),
      results,
      summary: this.analysis.generatePerformanceSummary(results)
    };
  }

  /**
   * 执行安全测试
   */
  async executeSecurityTest(testId, config, options) {
    this.updateTestProgress(testId, 20, '开始安全扫描...');

    const results = {};

    // SSL/TLS 检查
    if (config.checkSSL !== false) {
      this.updateTestProgress(testId, 30, '检查 SSL/TLS 配置...');
      results.ssl = await this.security.checkSSL(config.url);
    }

    // 安全头检查
    if (config.checkHeaders !== false) {
      this.updateTestProgress(testId, 50, '检查安全头配置...');
      results.headers = await this.security.checkSecurityHeaders(config.url);
    }

    // 漏洞扫描
    if (config.checkVulnerabilities !== false) {
      this.updateTestProgress(testId, 70, '扫描安全漏洞...');
      results.vulnerabilities = await this.security.scanVulnerabilities(config.url, config);
    }

    // Cookie 安全分析
    if (config.checkCookies !== false) {
      this.updateTestProgress(testId, 85, '分析 Cookie 安全...');
      results.cookies = await this.security.analyzeCookies(config.url);
    }

    this.updateTestProgress(testId, 95, '生成安全报告...');

    return {
      testType: 'security',
      url: config.url,
      timestamp: new Date().toISOString(),
      results,
      summary: this.analysis.generateSecuritySummary(results)
    };
  }

  /**
   * 执行HTTP测试
   */
  async executeHTTPTest(testId, config, options) {
    this.updateTestProgress(testId, 20, '开始HTTP测试...');

    const results = {};

    if (config.testType === 'api') {
      // API端点测试
      this.updateTestProgress(testId, 30, '测试API端点...');
      results.endpoints = await this.http.testAPIEndpoints(config.endpoints || [], config);

      // API性能测试
      if (config.testPerformance) {
        this.updateTestProgress(testId, 60, '测试API性能...');
        results.performance = await this.http.testAPIPerformance(config.endpoints || [], config);
      }

      // API安全测试
      if (config.testSecurity) {
        this.updateTestProgress(testId, 80, '测试API安全...');
        results.security = await this.http.testAPISecurity(config.endpoints || [], config);
      }

    } else if (config.testType === 'stress') {
      // 压力测试
      this.updateTestProgress(testId, 30, '执行压力测试...');
      results.stress = await this.http.executeStressTest(config.url, config);
    }

    this.updateTestProgress(testId, 95, '生成测试报告...');

    return {
      testType: config.testType,
      url: config.url,
      timestamp: new Date().toISOString(),
      results,
      summary: this.analysis.generateHTTPSummary(results, config.testType)
    };
  }

  /**
   * 执行分析测试
   */
  async executeAnalysisTest(testId, config, options) {
    this.updateTestProgress(testId, 20, '开始分析测试...');

    const results = {};

    // 兼容性分析
    if (config.testType === 'compatibility') {
      this.updateTestProgress(testId, 40, '分析浏览器兼容性...');
      results.browserCompatibility = await this.analysis.analyzeBrowserCompatibility(config.url, config);

      this.updateTestProgress(testId, 70, '分析设备兼容性...');
      results.deviceCompatibility = await this.analysis.analyzeDeviceCompatibility(config.url, config);
    }

    this.updateTestProgress(testId, 95, '生成分析报告...');

    return {
      testType: config.testType,
      url: config.url,
      timestamp: new Date().toISOString(),
      results,
      summary: this.analysis.generateAnalysisSummary(results, config.testType)
    };
  }

  /**
   * 后处理测试结果
   */
  async postProcessResult(testId, result, typeConfig) {
    this.updateTestProgress(testId, 98, '后处理测试结果...');

    // 添加测试元数据
    result.testId = testId;
    result.testType = typeConfig.id;
    result.testName = typeConfig.name;
    result.duration = Date.now() - this.activeTests.get(testId).startTime;
    result.version = this.version;

    // 生成建议
    result.recommendations = await this.analysis.generateRecommendations(result);

    // 计算综合评分
    result.overallScore = this.analysis.calculateOverallScore(result);

    this.updateTestProgress(testId, 100, '测试完成');

    return result;
  }

  /**
   * 更新测试进度
   */
  updateTestProgress(testId, progress, step) {
    const session = this.activeTests.get(testId);
    if (session) {
      session.progress = progress;
      session.currentStep = step;
      session.lastUpdate = Date.now();

      this.emit('testProgress', testId, { progress, step });

      // 通过WebSocket广播进度更新
      if (global.unifiedEngineWSHandler) {
        global.unifiedEngineWSHandler.broadcastTestProgress(testId, {
          progress,
          currentStep: step,
          lastUpdate: session.lastUpdate
        });
      }
    }
  }

  /**
   * 处理测试错误
   */
  handleTestError(testId, error) {
    const session = this.activeTests.get(testId);
    if (session) {
      session.status = 'failed';
      session.error = error.message;
      session.endTime = Date.now();
    }

    this.emit('testFailed', testId, error);

    // 通过WebSocket广播测试失败
    if (global.unifiedEngineWSHandler) {
      global.unifiedEngineWSHandler.broadcastTestFailed(testId, error);
    }
    console.error(`❌ 测试失败: ${testId}`, error.message);
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
   * 取消测试
   */
  cancelTest(testId) {
    const session = this.activeTests.get(testId);
    if (session) {
      session.status = 'cancelled';
      session.endTime = Date.now();
      this.emit('testCancelled', testId);
      console.log(`🛑 测试已取消: ${testId}`);
    }
  }

  /**
   * 获取支持的测试类型
   */
  getSupportedTestTypes() {
    return Array.from(this.testTypes.values());
  }

  /**
   * 健康检查
   */
  healthCheck() {
    return {
      status: 'healthy',
      version: this.version,
      activeTests: this.activeTests.size,
      supportedTypes: this.testTypes.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

// 创建全局单例
const unifiedTestEngine = new UnifiedTestEngine();

module.exports = unifiedTestEngine;
