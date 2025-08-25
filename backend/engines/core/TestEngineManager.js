/**
 * 统一测试引擎管理器
 * 提供引擎池管理、故障转移、健康检查、负载均衡等企业级功能
 */

const { EventEmitter } = require('events');
const { ServiceError, ErrorTypes } = require('../../utils/ErrorHandler');

/**
 * 测试引擎接口
 * 所有测试引擎必须实现此接口
 */
class TestEngineInterface {
  constructor(name, version = '1.0.0') {
    this.name = name;
    this.version = version;
    this.id = `${name}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    this.status = 'idle'; // idle, running, busy, error, maintenance
    this.isAvailable = false;
    this.lastHealthCheck = null;
    this.metrics = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      averageResponseTime: 0,
      uptime: 0,
      lastError: null
    };
  }

  /**
   * 健康检查 - 必须实现
   */
  async healthCheck() {
    throw new ServiceError('healthCheck method must be implemented', ErrorTypes.INTERNAL_ERROR);
  }

  /**
   * 执行测试 - 必须实现
   */
  async executeTest(config, options = {}) {
    throw new ServiceError('executeTest method must be implemented', ErrorTypes.INTERNAL_ERROR);
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    return { success: true, message: 'Test stopped' };
  }

  /**
   * 获取引擎状态
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      status: this.status,
      isAvailable: this.isAvailable,
      lastHealthCheck: this.lastHealthCheck,
      metrics: { ...this.metrics }
    };
  }

  /**
   * 获取引擎能力
   */
  getCapabilities() {
    return [];
  }

  /**
   * 更新指标
   */
  updateMetrics(testResult) {
    this.metrics.totalTests++;
    if (testResult.success) {
      this.metrics.successfulTests++;
    } else {
      this.metrics.failedTests++;
      this.metrics.lastError = testResult.error;
    }

    if (testResult.responseTime) {
      const total = this.metrics.averageResponseTime * (this.metrics.totalTests - 1);
      this.metrics.averageResponseTime = (total + testResult.responseTime) / this.metrics.totalTests;
    }
  }
}

/**
 * 引擎池管理器
 */
class EnginePool extends EventEmitter {
  constructor(engineType, options = {}) {
    super();
    this.engineType = engineType;
    this.engines = new Map();
    this.activeEngines = new Set();
    this.options = {
      minInstances: 1,
      maxInstances: 5,
      healthCheckInterval: 30000,
      failoverTimeout: 5000,
      loadBalanceStrategy: 'round-robin', // round-robin, least-busy, random
      ...options
    };

    this.currentIndex = 0;
    this.healthCheckTimer = null;
    this.isInitialized = false;
  }

  /**
   * 初始化引擎池
   */
  async initialize(engineFactory) {
    if (this.isInitialized) return;

    try {
      // 创建最小数量的引擎实例
      for (let i = 0; i < this.options.minInstances; i++) {
        const engine = await engineFactory();
        await this.addEngine(engine);
      }

      // 启动健康检查
      this.startHealthCheck();

      this.isInitialized = true;
      this.emit('initialized', { engineType: this.engineType, count: this.engines.size });

    } catch (error) {
      throw new ServiceError(
        `Failed to initialize engine pool for ${this.engineType}`,
        ErrorTypes.INTERNAL_ERROR,
        { engineType: this.engineType, error: error.message }
      );
    }
  }

  /**
   * 添加引擎到池中
   */
  async addEngine(engine) {
    try {
      // 执行健康检查
      const healthResult = await engine.healthCheck();
      if (healthResult.status === 'healthy') {
        engine.isAvailable = true;
        engine.lastHealthCheck = new Date();
        this.engines.set(engine.id, engine);
        this.activeEngines.add(engine.id);

        console.log(`✅ Engine ${engine.name}:${engine.id} added to pool`);
        this.emit('engineAdded', { engine: engine.getStatus() });

        return true;
      } else {
        throw new Error(`Engine health check failed: ${healthResult.error}`);
      }
    } catch (error) {
      console.error(`❌ Failed to add engine ${engine.name}:${engine.id}:`, error);
      return false;
    }
  }

  /**
   * 从池中移除引擎
   */
  async removeEngine(engineId) {
    const engine = this.engines.get(engineId);
    if (!engine) return false;

    try {
      // 如果引擎正在运行测试，等待完成或强制停止
      if (engine.status === 'running') {
        engine.status = 'maintenance';
        // 给引擎一些时间完成当前测试
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      this.engines.delete(engineId);
      this.activeEngines.delete(engineId);

      console.log(`🗑️ Engine ${engine.name}:${engineId} removed from pool`);
      this.emit('engineRemoved', { engineId, engineName: engine.name });

      return true;
    } catch (error) {
      console.error(`Failed to remove engine ${engineId}:`, error);
      return false;
    }
  }

  /**
   * 获取可用引擎
   */
  getAvailableEngine() {
    const availableEngines = Array.from(this.activeEngines)
      .map(id => this.engines.get(id))
      .filter(engine => engine && engine.isAvailable && engine.status === 'idle');

    if (availableEngines.length === 0) {

      return null;
    }

    // 根据负载均衡策略选择引擎
    switch (this.options.loadBalanceStrategy) {
      case 'round-robin':
        const engine = availableEngines[this.currentIndex % availableEngines.length];
        this.currentIndex++;
        return engine;

      case 'least-busy':
        return availableEngines.reduce((least, current) =>
          current.metrics.totalTests < least.metrics.totalTests ? current : least
        );

      case 'random':
        return availableEngines[Math.floor(Math.random() * availableEngines.length)];

      default:
        return availableEngines[0];
    }
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.options.healthCheckInterval);
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    const promises = Array.from(this.engines.values()).map(async (engine) => {
      try {
        const healthResult = await Promise.race([
          engine.healthCheck(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 10000)
          )
        ]);

        if (healthResult.status === 'healthy') {
          engine.isAvailable = true;
          engine.lastHealthCheck = new Date();
          this.activeEngines.add(engine.id);
        } else {
          engine.isAvailable = false;
          this.activeEngines.delete(engine.id);
          console.warn(`⚠️ Engine ${engine.name}:${engine.id} health check failed`);
        }
      } catch (error) {
        engine.isAvailable = false;
        this.activeEngines.delete(engine.id);
        console.error(`❌ Engine ${engine.name}:${engine.id} health check error:`, error.message);
      }
    });

    await Promise.allSettled(promises);

    // 检查是否需要添加更多引擎
    if (this.activeEngines.size < this.options.minInstances) {
      this.emit('needMoreEngines', {
        current: this.activeEngines.size,
        required: this.options.minInstances
      });
    }
  }

  /**
   * 获取池状态
   */
  getPoolStatus() {
    const engines = Array.from(this.engines.values()).map(engine => engine.getStatus());

    return {
      engineType: this.engineType,
      totalEngines: this.engines.size,
      activeEngines: this.activeEngines.size,
      availableEngines: engines.filter(e => e.isAvailable && e.status === 'idle').length,
      busyEngines: engines.filter(e => e.status === 'running' || e.status === 'busy').length,
      errorEngines: engines.filter(e => e.status === 'error').length,
      engines,
      options: this.options
    };
  }

  /**
   * 关闭引擎池
   */
  async shutdown() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // 停止所有引擎
    const shutdownPromises = Array.from(this.engines.values()).map(async (engine) => {
      try {
        if (typeof engine.shutdown === 'function') {
          await engine.shutdown();
        }
      } catch (error) {
        console.error(`Error shutting down engine ${engine.id}:`, error);
      }
    });

    await Promise.allSettled(shutdownPromises);

    this.engines.clear();
    this.activeEngines.clear();
    this.isInitialized = false;

    console.log(`🔌 Engine pool ${this.engineType} shut down`);
  }
}

/**
 * 统一测试引擎管理器
 * 管理所有测试引擎的生命周期、负载均衡和健康检查
 */
class TestEngineManager extends EventEmitter {
  constructor() {
    super();
    this.enginePools = new Map();
    this.engineFactories = new Map();
    this.runningTests = new Map();
    this.isInitialized = false;

    // 配置选项
    this.options = {
      enableFailover: true,
      failoverTimeout: 10000,
      enableLoadBalancing: true,
      enableMetrics: true,
      enableAutoScaling: false,
      maxConcurrentTests: 50
    };
  }

  /**
   * 注册引擎类型
   */
  registerEngineType(type, engineFactory, poolOptions = {}) {
    this.engineFactories.set(type, engineFactory);

    const pool = new EnginePool(type, poolOptions);
    this.enginePools.set(type, pool);

    // 监听池事件
    pool.on('needMoreEngines', async (data) => {
      if (this.options.enableAutoScaling) {
        await this.scaleEnginePool(type, data.required - data.current);
      }
    });

    console.log(`📝 Registered engine type: ${type}`);
  }

  /**
   * 初始化所有引擎池
   */
  async initialize() {
    if (this.isInitialized) return;

    const initPromises = Array.from(this.enginePools.entries()).map(async ([type, pool]) => {
      const factory = this.engineFactories.get(type);
      if (factory) {
        await pool.initialize(factory);
      }
    });

    await Promise.allSettled(initPromises);

    this.isInitialized = true;
    console.log('✅ Enhanced Test Engine Manager initialized');
    this.emit('initialized');
  }

  /**
   * 执行测试
   */
  async executeTest(type, config, options = {}) {
    const testId = options.testId || `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const pool = this.enginePools.get(type);
      if (!pool) {
        throw new ServiceError(
          `Engine type ${type} not registered`,
          ErrorTypes.NOT_FOUND_ERROR,
          { type, availableTypes: Array.from(this.enginePools.keys()) }
        );
      }

      // 获取可用引擎
      let engine = pool.getAvailableEngine();

      // 如果没有可用引擎且启用了故障转移
      if (!engine && this.options.enableFailover) {
        engine = await this.findAlternativeEngine(type, config);
      }

      if (!engine) {
        throw new ServiceError(
          `No available engines for type ${type}`,
          ErrorTypes.EXTERNAL_SERVICE_ERROR,
          { type, poolStatus: pool.getPoolStatus() }
        );
      }

      // 标记引擎为忙碌状态
      engine.status = 'running';
      this.runningTests.set(testId, { engine, startTime: Date.now(), type });

      console.log(`🚀 Starting test ${testId} on engine ${engine.name}:${engine.id}`);

      // 执行测试
      const startTime = Date.now();
      const result = await engine.executeTest(config, { ...options, testId });
      const responseTime = Date.now() - startTime;

      // 更新引擎指标
      engine.updateMetrics({ success: true, responseTime });
      engine.status = 'idle';

      // 清理运行中的测试记录
      this.runningTests.delete(testId);

      console.log(`✅ Test ${testId} completed in ${responseTime}ms`);

      return {
        success: true,
        testId,
        result,
        engine: {
          id: engine.id,
          name: engine.name,
          type
        },
        responseTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      // 清理和错误处理
      const testInfo = this.runningTests.get(testId);
      if (testInfo) {
        testInfo.engine.status = 'error';
        testInfo.engine.updateMetrics({ success: false, error: error.message });
        this.runningTests.delete(testId);
      }

      console.error(`❌ Test ${testId} failed:`, error);

      throw new ServiceError(
        `Test execution failed: ${error.message}`,
        ErrorTypes.EXTERNAL_SERVICE_ERROR,
        { testId, type, error: error.message }
      );
    }
  }

  /**
   * 寻找替代引擎（故障转移）
   */
  async findAlternativeEngine(primaryType, config) {
    // 这里可以实现更复杂的故障转移逻辑
    // 例如：性能测试可以降级到基础HTTP测试
    const fallbackMap = {
      'performance': ['lighthouse', 'basic-http'],
      'security': ['basic-security', 'http'],
      'seo': ['lighthouse', 'basic-http'],
      'accessibility': ['lighthouse', 'basic-http']
    };

    const fallbacks = fallbackMap[primaryType] || [];

    for (const fallbackType of fallbacks) {
      const pool = this.enginePools.get(fallbackType);
      if (pool) {
        const engine = pool.getAvailableEngine();
        if (engine) {
          console.log(`🔄 Using fallback engine ${fallbackType} for ${primaryType}`);
          return engine;
        }
      }
    }

    return null;
  }

  /**
   * 扩展引擎池
   */
  async scaleEnginePool(type, count) {
    const pool = this.enginePools.get(type);
    const factory = this.engineFactories.get(type);

    if (!pool || !factory) return false;

    try {
      for (let i = 0; i < count; i++) {
        const engine = await factory();
        await pool.addEngine(engine);
      }

      console.log(`📈 Scaled engine pool ${type} by ${count} instances`);
      return true;
    } catch (error) {
      console.error(`Failed to scale engine pool ${type}:`, error);
      return false;
    }
  }

  /**
   * 获取所有引擎状态
   */
  getAllEngineStatus() {
    const status = {
      initialized: this.isInitialized,
      totalPools: this.enginePools.size,
      runningTests: this.runningTests.size,
      pools: {}
    };

    for (const [type, pool] of this.enginePools) {
      status.pools[type] = pool.getPoolStatus();
    }

    return status;
  }

  /**
   * 获取健康状态 - 兼容方法
   */
  getHealthStatus() {
    const healthStatus = {};

    for (const [type, pool] of this.enginePools) {
      const poolStatus = pool.getPoolStatus();
      healthStatus[type] = {
        healthy: poolStatus.availableEngines > 0,
        poolSize: poolStatus.totalEngines,
        busyInstances: poolStatus.busyEngines,
        availableInstances: poolStatus.availableEngines,
        lastCheck: new Date().toISOString()
      };
    }

    return healthStatus;
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    const testInfo = this.runningTests.get(testId);
    if (!testInfo) {

      return {
        success: false, message: 'Test not found'
      };
    }

    try {
      const result = await testInfo.engine.stopTest(testId);
      testInfo.engine.status = 'idle';
      this.runningTests.delete(testId);

      return { success: true, message: 'Test stopped successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 关闭管理器
   */
  async shutdown() {
    console.log('🔌 Shutting down Enhanced Test Engine Manager...');

    // 停止所有运行中的测试
    const stopPromises = Array.from(this.runningTests.keys()).map(testId =>
      this.stopTest(testId).catch(err => console.error(`Error stopping test ${testId}:`, err))
    );
    await Promise.allSettled(stopPromises);

    // 关闭所有引擎池
    const shutdownPromises = Array.from(this.enginePools.values()).map(pool =>
      pool.shutdown().catch(err => console.error('Error shutting down pool:', err))
    );
    await Promise.allSettled(shutdownPromises);

    this.enginePools.clear();
    this.engineFactories.clear();
    this.runningTests.clear();
    this.isInitialized = false;

    console.log('✅ Enhanced Test Engine Manager shut down');
  }
}

/**
 * 引擎适配器 - 将现有引擎适配到标准接口
 */
class EngineAdapter extends TestEngineInterface {
  constructor(originalEngine, engineType) {
    super(originalEngine.name || engineType, originalEngine.version || '1.0.0');
    this.originalEngine = originalEngine;
    this.engineType = engineType;
  }

  async healthCheck() {
    try {
      // 尝试调用原引擎的健康检查方法
      if (typeof this.originalEngine.healthCheck === 'function') {

        const result = await this.originalEngine.healthCheck();
        return result.status ? result : {
          status: 'healthy', timestamp: new Date().toISOString()
        };
      }

      // 如果没有健康检查方法，尝试检查可用性
      if (typeof this.originalEngine.checkAvailability === 'function') {

        const isAvailable = await this.originalEngine.checkAvailability();
        return {
          status: isAvailable ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString()
        };
      }

      // 默认认为健康
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async executeTest(config, options = {}) {
    try {
      // 尝试不同的执行方法名
      const methods = ['executeTest', 'runTest', 'performTest', 'run', 'test'];

      for (const method of methods) {
        if (typeof this.originalEngine[method] === 'function') {

          const result = await this.originalEngine[method](config, options);

          // 标准化返回结果
          return {
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
            engine: this.name,
            type: this.engineType
          };
        }
      }

      throw new Error(`No suitable execution method found in engine ${this.name}`);
    } catch (error) {
      throw new ServiceError(
        `Engine execution failed: ${error.message}`,
        ErrorTypes.EXTERNAL_SERVICE_ERROR,
        { engine: this.name, type: this.engineType }
      );
    }
  }

  async stopTest(testId) {
    try {
      if (typeof this.originalEngine.stopTest === 'function') {

        return await this.originalEngine.stopTest(testId);
      }

      if (typeof this.originalEngine.cancel === 'function') {

        return await this.originalEngine.cancel(testId);
      }

      return { success: true, message: 'Stop not supported by engine' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  getCapabilities() {
    if (typeof this.originalEngine.getCapabilities === 'function') {

      return this.originalEngine.getCapabilities();
    }

    if (this.originalEngine.capabilities) {

      return this.originalEngine.capabilities;
    }

    // 根据引擎类型返回默认能力
    const defaultCapabilities = {
      'performance': ['response-time', 'throughput', 'resource-usage'],
      'security': ['vulnerability-scan', 'ssl-check', 'header-analysis'],
      'seo': ['meta-analysis', 'content-check', 'structure-validation'],
      'accessibility': ['wcag-compliance', 'screen-reader', 'keyboard-navigation'],
      'compatibility': ['cross-browser', 'responsive-design', 'feature-detection']
    };

    return defaultCapabilities[this.engineType] || ['basic-testing'];
  }
}

/**
 * 引擎工厂 - 创建适配后的引擎实例
 */
class EngineFactory {
  static createPerformanceEngine() {
    try {
      const PerformanceEngine = require('../performance/PerformanceTestEngine');
      const engine = new PerformanceEngine();
      return new EngineAdapter(engine, 'performance');
    } catch (error) {
      console.error('Failed to create performance engine:', error);
      return null;
    }
  }

  static createSecurityEngine() {
    try {
      const SecurityEngine = require('../security/securityTestEngine');
      const engine = new SecurityEngine();
      return new EngineAdapter(engine, 'security');
    } catch (error) {
      console.error('Failed to create security engine:', error);
      return null;
    }
  }

  static createCompatibilityEngine() {
    try {
      const CompatibilityEngine = require('../compatibility/compatibilityTestEngine');
      const engine = new CompatibilityEngine();
      return new EngineAdapter(engine, 'compatibility');
    } catch (error) {
      console.error('Failed to create compatibility engine:', error);
      return null;
    }
  }

  static createUXEngine() {
    try {
      const UXEngine = require('../api/uxTestEngine');
      const engine = new UXEngine();
      return new EngineAdapter(engine, 'ux');
    } catch (error) {
      console.error('Failed to create UX engine:', error);
      return null;
    }
  }

  static createNetworkEngine() {
    try {
      const NetworkEngine = require('../api/networkTestEngine');
      const engine = new NetworkEngine();
      return new EngineAdapter(engine, 'network');
    } catch (error) {
      console.error('Failed to create network engine:', error);
      return null;
    }
  }

  static createSEOEngine() {
    try {
      const SEOEngine = require('../seo/SEOTestEngine');
      const engine = new SEOEngine();
      return new EngineAdapter(engine, 'seo');
    } catch (error) {
      console.error('Failed to create SEO engine:', error);
      return null;
    }
  }
}

// 创建全局实例并注册引擎类型
const testEngineManager = new TestEngineManager();

// 注册所有引擎类型
testEngineManager.registerEngineType('performance', () => EngineFactory.createPerformanceEngine(), {
  minInstances: 2,
  maxInstances: 5,
  loadBalanceStrategy: 'least-busy'
});

testEngineManager.registerEngineType('security', () => EngineFactory.createSecurityEngine(), {
  minInstances: 1,
  maxInstances: 3,
  loadBalanceStrategy: 'round-robin'
});

testEngineManager.registerEngineType('compatibility', () => EngineFactory.createCompatibilityEngine(), {
  minInstances: 1,
  maxInstances: 4,
  loadBalanceStrategy: 'round-robin'
});

testEngineManager.registerEngineType('ux', () => EngineFactory.createUXEngine(), {
  minInstances: 1,
  maxInstances: 3,
  loadBalanceStrategy: 'least-busy'
});

testEngineManager.registerEngineType('network', () => EngineFactory.createNetworkEngine(), {
  minInstances: 1,
  maxInstances: 2,
  loadBalanceStrategy: 'round-robin'
});

testEngineManager.registerEngineType('seo', () => EngineFactory.createSEOEngine(), {
  minInstances: 1,
  maxInstances: 2,
  loadBalanceStrategy: 'round-robin'
});

module.exports = {
  TestEngineInterface,
  EnginePool,
  TestEngineManager,
  EngineAdapter,
  EngineFactory,
  testEngineManager
};
