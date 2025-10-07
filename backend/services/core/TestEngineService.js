/**
 * 统一测试引擎服务 - 重构版本
 * 
 * 整合功能：
 * - TestEngineService.js 的测试执行功能
 * - TestEngineManager.js 的引擎管理功能
 * - 统一的接口调用方式
 * - 完整的生命周期管理
 * 
 * 设计目标：
 * - 消除重复代码
 * - 提供统一的测试引擎接口
 * - 支持所有测试类型
 * - 完整的错误处理和状态管理
 * - 向后兼容性
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// 导入标准响应类型
const {
  StandardErrorCode,
  StandardStatusCodeMap,
  StandardErrorMessages
} = require('../../../shared/types/standardApiResponse');

// 测试类型枚举
const TestType = {
  PERFORMANCE: 'performance',
  SEO: 'seo',
  SECURITY: 'security',
  COMPATIBILITY: 'compatibility',
  API: 'api',
  STRESS: 'stress',
  UX: 'ux',
  INFRASTRUCTURE: 'infrastructure',
  ACCESSIBILITY: 'accessibility',
  DATABASE: 'database',
  NETWORK: 'network',
  WEBSITE: 'website',
  CONTENT: 'content',
  DOCUMENTATION: 'documentation',
  REGRESSION: 'regression',
  AUTOMATION: 'automation',
  CLIENTS: 'clients',
  SERVICES: 'services'
};

// 测试状态枚举
const TestStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout'
};

/**
 * 统一测试引擎服务类
 */
class TestEngineService extends EventEmitter {
  constructor() {
    super();
    
    // 引擎注册表
    this.engines = new Map();
    this.engineConfigs = new Map();
    
    // 测试状态管理
    this.activeTests = new Map();
    this.testResults = new Map();
    this.testQueue = [];
    
    // 服务状态
    this.initialized = false;
    this.status = 'stopped';
    this.maxConcurrentTests = 5;
    this.runningTestCount = 0;
    
    // 缓存管理
    this.resultCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5分钟缓存
    
    // 统计信息
    this.stats = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      averageExecutionTime: 0,
      engineUsage: {}
    };
  }

  /**
   * 初始化服务
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🚀 初始化统一测试引擎服务...');
      
      // 注册所有测试引擎
      await this.registerAllEngines();
      
      // 启动内部服务
      this.startInternalServices();
      
      this.initialized = true;
      this.status = 'running';
      
      console.log(`✅ 统一测试引擎服务初始化完成，已注册 ${this.engines.size} 个引擎`);
      
      this.emit('initialized', { 
        engineCount: this.engines.size,
        engines: Array.from(this.engines.keys()),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ 统一测试引擎服务初始化失败:', error.message);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * 注册所有测试引擎
   */
  async registerAllEngines() {
    // 引擎配置列表 - 整合所有可用的测试引擎
    const engineConfigs = [
      // 核心测试引擎
      { 
        name: TestType.PERFORMANCE, 
        path: '../../engines/performance/performanceTestEngine',
        methods: ['runPerformanceTest', 'runTest'],
        enabled: true,
        description: '性能测试引擎'
      },
      { 
        name: TestType.SEO, 
        path: '../../engines/seo/seoTestEngine',
        methods: ['runSeoTest', 'runTest'],
        enabled: true,
        description: 'SEO测试引擎'
      },
      { 
        name: TestType.SECURITY, 
        path: '../../engines/security/SecurityTestEngine',
        methods: ['runSecurityTest', 'runTest'],
        enabled: true,
        description: '安全测试引擎'
      },
      { 
        name: TestType.COMPATIBILITY, 
        path: '../../engines/compatibility/CompatibilityTestEngine',
        methods: ['runCompatibilityTest', 'runTest'],
        enabled: true,
        description: '兼容性测试引擎'
      },
      { 
        name: TestType.API, 
        path: '../../engines/api/ApiTestEngine',
        methods: ['runApiTest', 'runTest'],
        enabled: true,
        description: 'API测试引擎'
      },
      { 
        name: TestType.STRESS, 
        path: '../../engines/stress/StressTestEngine',
        methods: ['runStressTest', 'runTest'],
        enabled: true,
        description: '压力测试引擎'
      },
      
      // 扩展测试引擎
      { 
        name: TestType.UX, 
        path: '../../engines/ux/uxTestEngine',
        methods: ['runUxTest', 'runTest'],
        enabled: true,
        description: '用户体验测试引擎'
      },
      { 
        name: TestType.ACCESSIBILITY, 
        path: '../../engines/accessibility/AccessibilityTestEngine',
        methods: ['runAccessibilityTest', 'runTest'],
        enabled: true,
        description: '可访问性测试引擎'
      },
      { 
        name: TestType.DATABASE, 
        path: '../../engines/database/DatabaseTestEngine',
        methods: ['runDatabaseTest', 'runTest'],
        enabled: true,
        description: '数据库测试引擎'
      },
      { 
        name: TestType.NETWORK, 
        path: '../../engines/network/NetworkTestEngine',
        methods: ['runNetworkTest', 'runTest'],
        enabled: true,
        description: '网络测试引擎'
      },
      { 
        name: TestType.WEBSITE, 
        path: '../../engines/website/websiteTestEngine',
        methods: ['runWebsiteTest', 'runTest'],
        enabled: true,
        description: '网站测试引擎'
      },
      
      // 专业测试引擎
      { 
        name: TestType.CONTENT, 
        path: '../../engines/content/ContentTestEngine',
        methods: ['runContentTest', 'runTest'],
        enabled: true,
        description: '内容测试引擎'
      },
      { 
        name: TestType.INFRASTRUCTURE, 
        path: '../../engines/infrastructure/infrastructureTestEngine',
        methods: ['runInfrastructureTest', 'runTest'],
        enabled: true,
        description: '基础设施测试引擎'
      },
      { 
        name: TestType.DOCUMENTATION, 
        path: '../../engines/documentation/DocumentationTestEngine',
        methods: ['runDocumentationTest', 'runTest'],
        enabled: false, // 可选引擎
        description: '文档测试引擎'
      },
      { 
        name: TestType.REGRESSION, 
        path: '../../engines/regression/RegressionTestEngine',
        methods: ['runRegressionTest', 'runTest'],
        enabled: false, // 可选引擎
        description: '回归测试引擎'
      },
      { 
        name: TestType.AUTOMATION, 
        path: '../../engines/automation/AutomationTestEngine',
        methods: ['runAutomationTest', 'runTest'],
        enabled: false, // 可选引擎
        description: '自动化测试引擎'
      },
      { 
        name: TestType.CLIENTS, 
        path: '../../engines/clients/ClientsTestEngine',
        methods: ['runClientsTest', 'runTest'],
        enabled: false, // 可选引擎
        description: '客户端测试引擎'
      },
      { 
        name: TestType.SERVICES, 
        path: '../../engines/services/ServicesTestEngine',
        methods: ['runServicesTest', 'runTest'],
        enabled: false, // 可选引擎
        description: '服务测试引擎'
      }
    ];

    let registeredCount = 0;
    let skippedCount = 0;

    for (const config of engineConfigs) {
      if (!config.enabled) {
        console.log(`⏭️  跳过引擎: ${config.name} (未启用)`);
        skippedCount++;
        continue;
      }

      try {
        await this.registerEngine(config);
        registeredCount++;
      } catch (error) {
        console.warn(`⚠️ 注册引擎 ${config.name} 失败: ${error.message}`);
        skippedCount++;
      }
    }

    console.log(`📊 引擎注册完成: ${registeredCount} 个成功, ${skippedCount} 个跳过`);
  }

  /**
   * 注册单个测试引擎
   */
  async registerEngine(config) {
    try {
      // 尝试加载引擎模块
      let EngineClass;
      try {
        const modulePath = path.resolve(__dirname, config.path);
        EngineClass = require(modulePath);
        
        // 处理不同的导出格式
        if (typeof EngineClass === 'function') {
          // 直接导出类
        } else if (EngineClass.default && typeof EngineClass.default === 'function') {
          // ES6默认导出
          EngineClass = EngineClass.default;
        } else if (typeof EngineClass === 'object' && EngineClass.constructor) {
          // 已实例化的对象
          this.engines.set(config.name, EngineClass);
          this.engineConfigs.set(config.name, config);
          console.log(`✅ 已注册引擎: ${config.name} (预实例化)`);
          return;
        } else {
          throw new Error('无效的引擎导出格式');
        }
      } catch (loadError) {
        throw new Error(`无法加载引擎模块: ${loadError.message}`);
      }

      // 创建引擎实例
      const engineInstance = new EngineClass();
      
      // 设置引擎元数据
      engineInstance.name = config.name;
      engineInstance.status = 'ready';
      engineInstance.lastUsed = null;
      engineInstance.testCount = 0;
      engineInstance.description = config.description;
      engineInstance.methods = config.methods;

      // 初始化引擎（如果支持）
      if (typeof engineInstance.initialize === 'function') {
        await engineInstance.initialize();
      }

      // 注册引擎
      this.engines.set(config.name, engineInstance);
      this.engineConfigs.set(config.name, config);
      
      // 初始化统计信息
      this.stats.engineUsage[config.name] = {
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0,
        averageExecutionTime: 0
      };

      console.log(`✅ 已注册引擎: ${config.name} - ${config.description}`);
      
    } catch (error) {
      throw new Error(`注册引擎失败: ${error.message}`);
    }
  }

  /**
   * 启动内部服务
   */
  startInternalServices() {
    // 启动测试队列处理器
    this.startQueueProcessor();
    
    // 启动缓存清理器
    this.startCacheCleaner();
    
    // 启动健康检查
    this.startHealthCheck();
  }

  /**
   * 启动测试队列处理器
   */
  startQueueProcessor() {
    setInterval(() => {
      this.processTestQueue();
    }, 1000); // 每秒检查一次队列
  }

  /**
   * 处理测试队列
   */
  async processTestQueue() {
    while (this.testQueue.length > 0 && this.runningTestCount < this.maxConcurrentTests) {
      const testRequest = this.testQueue.shift();
      if (testRequest) {
        this.executeTestFromQueue(testRequest);
      }
    }
  }

  /**
   * 从队列执行测试
   */
  async executeTestFromQueue(testRequest) {
    this.runningTestCount++;
    
    try {
      await this.executeTest(testRequest);
    } catch (error) {
      console.error('队列测试执行失败:', error);
    } finally {
      this.runningTestCount--;
    }
  }

  /**
   * 启动缓存清理器
   */
  startCacheCleaner() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.resultCache.entries()) {
        if (now - entry.timestamp > this.cacheTTL) {
          this.resultCache.delete(key);
        }
      }
    }, 60000); // 每分钟清理一次过期缓存
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // 每30秒进行一次健康检查
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    try {
      const healthStatus = {
        service: 'healthy',
        engines: {},
        activeTests: this.activeTests.size,
        queueLength: this.testQueue.length,
        runningTests: this.runningTestCount,
        timestamp: new Date().toISOString()
      };

      // 检查每个引擎的健康状态
      for (const [name, engine] of this.engines) {
        try {
          if (typeof engine.healthCheck === 'function') {
            healthStatus.engines[name] = await engine.healthCheck();
          } else {
            healthStatus.engines[name] = { status: 'unknown' };
          }
        } catch (error) {
          healthStatus.engines[name] = { status: 'error', error: error.message };
        }
      }

      this.emit('healthCheck', healthStatus);
    } catch (error) {
      console.error('健康检查失败:', error);
    }
  }

  /**
   * 启动测试 - 统一接口
   */
  async startTest(testType, config = {}) {
    try {
      // 验证测试类型
      if (!this.engines.has(testType)) {
        throw new Error(`不支持的测试类型: ${testType}`);
      }

      // 检查引擎可用性
      const availability = await this.checkEngineAvailability(testType);
      if (!availability.available) {
        throw new Error(`引擎不可用: ${availability.error}`);
      }

      // 生成测试ID
      const testId = uuidv4();
      const startTime = new Date();

      // 创建测试请求
      const testRequest = {
        id: testId,
        type: testType,
        config: {
          url: config.url || '',
          options: config.options || {},
          timeout: config.timeout || 300000,
          ...config
        },
        status: TestStatus.PENDING,
        startTime,
        priority: config.priority || 'normal'
      };

      // 检查是否使用缓存
      if (config.useCache !== false) {
        const cachedResult = this.getCachedResult(testType, config.url, config.options);
        if (cachedResult) {
          return {
            testId: cachedResult.id,
            status: TestStatus.COMPLETED,
            result: cachedResult.result,
            fromCache: true,
            timestamp: cachedResult.timestamp
          };
        }
      }

      // 记录测试状态
      this.activeTests.set(testId, testRequest);

      // 如果可以立即执行，则直接执行，否则加入队列
      if (this.runningTestCount < this.maxConcurrentTests) {
        this.executeTestFromQueue(testRequest);
      } else {
        testRequest.status = TestStatus.PENDING;
        this.testQueue.push(testRequest);
        
        // 通知测试已加入队列
        this.emit('testQueued', {
          testId,
          type: testType,
          queuePosition: this.testQueue.length,
          estimatedWaitTime: this.estimateWaitTime()
        });
      }

      return {
        testId,
        status: testRequest.status,
        queuePosition: testRequest.status === TestStatus.PENDING ? this.testQueue.length : 0,
        estimatedStartTime: this.estimateStartTime(testRequest)
      };

    } catch (error) {
      console.error('启动测试失败:', error);
      throw new Error(`启动测试失败: ${error.message}`);
    }
  }

  /**
   * 执行测试
   */
  async executeTest(testRequest) {
    const { id: testId, type: testType, config } = testRequest;
    
    try {
      // 更新测试状态
      testRequest.status = TestStatus.RUNNING;
      testRequest.actualStartTime = new Date();
      
      this.emit('testStarted', {
        testId,
        type: testType,
        startTime: testRequest.actualStartTime
      });

      // 获取引擎
      const engine = this.engines.get(testType);
      if (!engine) {
        throw new Error(`引擎 ${testType} 不存在`);
      }

      // 更新引擎状态
      engine.status = 'running';
      engine.lastUsed = new Date();

      // 执行测试
      const result = await this.runEngineTest(engine, testType, config);

      // 计算执行时间
      const executionTime = Date.now() - testRequest.actualStartTime.getTime();

      // 创建测试结果
      const testResult = {
        id: testId,
        type: testType,
        config: config,
        result: result,
        status: TestStatus.COMPLETED,
        startTime: testRequest.startTime,
        actualStartTime: testRequest.actualStartTime,
        endTime: new Date(),
        executionTime,
        success: true
      };

      // 保存结果
      this.testResults.set(testId, testResult);
      this.activeTests.delete(testId);

      // 缓存结果
      if (config.useCache !== false) {
        this.setCachedResult(testType, config.url, config.options, testResult);
      }

      // 更新统计信息
      this.updateStats(testType, executionTime, true);

      // 更新引擎状态
      engine.status = 'ready';
      engine.testCount = (engine.testCount || 0) + 1;

      // 发送完成事件
      this.emit('testCompleted', {
        testId,
        type: testType,
        result: testResult,
        executionTime
      });

      return testResult;

    } catch (error) {
      // 处理测试失败
      const errorResult = {
        id: testId,
        type: testType,
        config: config,
        status: TestStatus.FAILED,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code || StandardErrorCode.TEST_EXECUTION_ERROR
        },
        startTime: testRequest.startTime,
        actualStartTime: testRequest.actualStartTime,
        endTime: new Date(),
        success: false
      };

      // 保存错误结果
      this.testResults.set(testId, errorResult);
      this.activeTests.delete(testId);

      // 更新统计信息
      this.updateStats(testType, 0, false);

      // 更新引擎状态
      const engine = this.engines.get(testType);
      if (engine) {
        engine.status = 'error';
      }

      // 发送失败事件
      this.emit('testFailed', {
        testId,
        type: testType,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 运行引擎测试
   */
  async runEngineTest(engine, testType, config) {
    const engineConfig = this.engineConfigs.get(testType);
    if (!engineConfig) {
      throw new Error(`引擎配置不存在: ${testType}`);
    }

    // 尝试不同的测试方法
    const methods = engineConfig.methods || ['runTest'];
    
    for (const method of methods) {
      if (typeof engine[method] === 'function') {
        try {
          return await engine[method](config);
        } catch (error) {
          console.warn(`方法 ${method} 执行失败:`, error.message);
          // 继续尝试下一个方法
        }
      }
    }

    // 如果所有预定义方法都失败，尝试通用方法
    const fallbackMethods = ['execute', 'analyze', 'test'];
    for (const method of fallbackMethods) {
      if (typeof engine[method] === 'function') {
        try {
          return await engine[method](config);
        } catch (error) {
          console.warn(`回退方法 ${method} 执行失败:`, error.message);
        }
      }
    }

    throw new Error(`引擎 ${testType} 没有可用的执行方法`);
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    const activeTest = this.activeTests.get(testId);
    if (!activeTest) {
      throw new Error(`测试 ${testId} 不存在或已完成`);
    }

    try {
      // 更新测试状态
      activeTest.status = TestStatus.CANCELLED;
      
      // 尝试停止引擎中的测试
      const engine = this.engines.get(activeTest.type);
      if (engine && typeof engine.stopTest === 'function') {
        await engine.stopTest(testId);
      }

      // 创建取消结果
      const cancelledResult = {
        id: testId,
        type: activeTest.type,
        config: activeTest.config,
        status: TestStatus.CANCELLED,
        startTime: activeTest.startTime,
        endTime: new Date(),
        success: false,
        message: '测试已被取消'
      };

      // 保存结果
      this.testResults.set(testId, cancelledResult);
      this.activeTests.delete(testId);

      // 发送取消事件
      this.emit('testCancelled', {
        testId,
        type: activeTest.type
      });

      return cancelledResult;

    } catch (error) {
      console.error('停止测试失败:', error);
      throw new Error(`停止测试失败: ${error.message}`);
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    // 首先检查活跃测试
    const activeTest = this.activeTests.get(testId);
    if (activeTest) {
      return {
        id: testId,
        type: activeTest.type,
        status: activeTest.status,
        startTime: activeTest.startTime,
        config: activeTest.config,
        queuePosition: activeTest.status === TestStatus.PENDING ? 
          this.testQueue.findIndex(test => test.id === testId) + 1 : 0
      };
    }

    // 检查已完成的测试
    const completedTest = this.testResults.get(testId);
    if (completedTest) {
      return {
        id: testId,
        type: completedTest.type,
        status: completedTest.status,
        startTime: completedTest.startTime,
        endTime: completedTest.endTime,
        executionTime: completedTest.executionTime,
        success: completedTest.success,
        result: completedTest.result,
        error: completedTest.error
      };
    }

    return null;
  }

  /**
   * 获取测试结果
   */
  getTestResult(testId) {
    return this.testResults.get(testId) || null;
  }

  /**
   * 获取测试历史
   */
  getTestHistory(filters = {}) {
    let results = Array.from(this.testResults.values());

    // 应用过滤器
    if (filters.type) {
      results = results.filter(result => result.type === filters.type);
    }

    if (filters.status) {
      results = results.filter(result => result.status === filters.status);
    }

    if (filters.limit) {
      results = results.slice(0, parseInt(filters.limit));
    }

    // 按时间倒序排列
    results.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return results;
  }

  /**
   * 检查引擎可用性
   */
  async checkEngineAvailability(testType) {
    const engine = this.engines.get(testType);
    if (!engine) {
      return { available: false, error: '引擎不存在' };
    }

    try {
      if (typeof engine.checkAvailability === 'function') {
        return await engine.checkAvailability();
      }
      
      // 默认检查引擎状态
      return { 
        available: engine.status !== 'error',
        status: engine.status
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * 获取所有可用引擎
   */
  getAvailableEngines() {
    const engines = [];
    
    for (const [name, engine] of this.engines) {
      const config = this.engineConfigs.get(name);
      engines.push({
        name,
        description: config?.description || engine.description || name,
        status: engine.status,
        methods: config?.methods || [],
        lastUsed: engine.lastUsed,
        testCount: engine.testCount || 0
      });
    }

    return engines;
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats() {
    return {
      ...this.stats,
      activeTests: this.activeTests.size,
      queueLength: this.testQueue.length,
      runningTests: this.runningTestCount,
      maxConcurrentTests: this.maxConcurrentTests,
      totalEngines: this.engines.size,
      cacheSize: this.resultCache.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取缓存结果
   */
  getCachedResult(testType, url, options) {
    const cacheKey = this.generateCacheKey(testType, url, options);
    const cached = this.resultCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached;
    }
    
    return null;
  }

  /**
   * 设置缓存结果
   */
  setCachedResult(testType, url, options, result) {
    const cacheKey = this.generateCacheKey(testType, url, options);
    this.resultCache.set(cacheKey, {
      ...result,
      timestamp: Date.now()
    });
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(testType, url, options) {
    const optionsStr = JSON.stringify(options || {});
    return `${testType}:${url}:${Buffer.from(optionsStr).toString('base64')}`;
  }

  /**
   * 更新统计信息
   */
  updateStats(testType, executionTime, success) {
    this.stats.totalTests++;
    
    if (success) {
      this.stats.successfulTests++;
    } else {
      this.stats.failedTests++;
    }

    // 更新平均执行时间
    const totalTime = this.stats.averageExecutionTime * (this.stats.totalTests - 1) + executionTime;
    this.stats.averageExecutionTime = totalTime / this.stats.totalTests;

    // 更新引擎使用统计
    if (this.stats.engineUsage[testType]) {
      const engineStats = this.stats.engineUsage[testType];
      engineStats.totalTests++;
      
      if (success) {
        engineStats.successfulTests++;
      } else {
        engineStats.failedTests++;
      }

      // 更新引擎平均执行时间
      const engineTotalTime = engineStats.averageExecutionTime * (engineStats.totalTests - 1) + executionTime;
      engineStats.averageExecutionTime = engineTotalTime / engineStats.totalTests;
    }
  }

  /**
   * 估算等待时间
   */
  estimateWaitTime() {
    if (this.testQueue.length === 0) {
      return 0;
    }

    // 基于平均执行时间和队列长度估算
    const averageTime = this.stats.averageExecutionTime || 30000; // 默认30秒
    const availableSlots = this.maxConcurrentTests - this.runningTestCount;
    
    if (availableSlots > 0) {
      return Math.ceil(this.testQueue.length / availableSlots) * averageTime;
    }

    return this.testQueue.length * averageTime;
  }

  /**
   * 估算开始时间
   */
  estimateStartTime(testRequest) {
    const waitTime = this.estimateWaitTime();
    return new Date(Date.now() + waitTime);
  }

  /**
   * 停止服务
   */
  async stop() {
    try {
      console.log('🛑 停止统一测试引擎服务...');
      
      // 取消所有活跃测试
      const cancelPromises = [];
      for (const testId of this.activeTests.keys()) {
        cancelPromises.push(this.stopTest(testId).catch(console.error));
      }
      await Promise.all(cancelPromises);

      // 停止所有引擎
      const stopPromises = [];
      for (const [name, engine] of this.engines) {
        if (typeof engine.stop === 'function') {
          stopPromises.push(
            engine.stop().catch(error => 
              console.warn(`停止引擎 ${name} 失败:`, error.message)
            )
          );
        }
        engine.status = 'stopped';
      }
      await Promise.all(stopPromises);

      // 清理资源
      this.activeTests.clear();
      this.testQueue.length = 0;
      this.resultCache.clear();

      this.status = 'stopped';
      this.initialized = false;
      this.runningTestCount = 0;

      console.log('✅ 统一测试引擎服务已停止');
      
      this.emit('stopped', {
        timestamp: new Date().toISOString(),
        message: '服务已安全停止'
      });

    } catch (error) {
      console.error('❌ 停止服务时发生错误:', error.message);
      throw error;
    }
  }

  /**
   * 重启服务
   */
  async restart() {
    await this.stop();
    await this.initialize();
  }
}

// 导出服务类和常量
module.exports = {
  TestEngineService,
  testEngineService
};
