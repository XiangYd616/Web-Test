/**
 * 统一测试引擎管理器
 * 解决多个管理器冲突问题，提供统一的引擎管理接口
 */

const { ErrorFactory } = require('../utils/apiError');
const EventEmitter = require('events');

/**
 * 测试引擎接口规范
 */
class TestEngineInterface {
  constructor(name, version = '1.0.0') {
    this.name = name;
    this.version = version;
    this.isAvailable = false;
  }

  /**
   * 健康检查
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error('healthCheck method must be implemented');
  }

  /**
   * 执行测试
   * @param {Object} config - 测试配置
   * @returns {Promise<Object>}
   */
  async executeTest(config) {
    throw new Error('executeTest method must be implemented');
  }

  /**
   * 停止测试
   * @param {string} testId - 测试ID
   * @returns {Promise<boolean>}
   */
  async stopTest(testId) {
    return true; // 默认实现
  }

  /**
   * 获取引擎状态
   * @returns {Object}
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      isAvailable: this.isAvailable
    };
  }
}

/**
 * 统一测试引擎管理器
 */
class UnifiedTestEngineManager extends EventEmitter {
  constructor() {
    super();
    this.engines = new Map();
    this.runningTests = new Map();
    this.engineRegistry = new Map();
    this.initializationPromise = null;
    this.isInitialized = false;

    // 引擎类型映射
    this.engineTypeMapping = {
      'stress': ['k6', 'playwright'],
      'performance': ['lighthouse', 'k6'],
      'seo': ['lighthouse', 'seo'],
      'security': ['security', 'playwright'],
      'accessibility': ['lighthouse', 'accessibility'],
      'compatibility': ['playwright', 'compatibility'],
      'api': ['api', 'k6'],
      'ux': ['lighthouse', 'ux']
    };
  }

  /**
   * 初始化引擎管理器
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  async _doInitialize() {
    try {
      console.log('🚀 初始化统一测试引擎管理器...');

      // 注册核心引擎
      await this.registerCoreEngines();

      // 检查引擎可用性
      await this.checkAllEnginesHealth();

      this.isInitialized = true;
      console.log(`✅ 统一测试引擎管理器初始化完成，注册了 ${this.engines.size} 个引擎`);

      this.emit('initialized', {
        engineCount: this.engines.size,
        availableEngines: this.getAvailableEngines()
      });

    } catch (error) {
      console.error('❌ 统一测试引擎管理器初始化失败:', error);
      this.emit('initializationError', error);
      throw error;
    }
  }

  /**
   * 注册核心引擎
   */
  async registerCoreEngines() {
    const engineConfigs = [
      { type: 'stress', path: '../stress/stressTestEngine.js', className: 'RealStressTestEngine' },
      { type: 'seo', path: '../seo/SEOTestEngine.js', className: 'SEOTestEngine' },
      { type: 'security', path: './SecurityTestEngine', className: 'SecurityTestEngine' },
      { type: 'advanced-security', path: '../security/AdvancedSecurityEngine.js', className: 'AdvancedSecurityEngine' },
      { type: 'performance', path: '../performance/PerformanceAccessibilityEngine.js', className: 'PerformanceAccessibilityEngine' },
      { type: 'accessibility', path: '../performance/PerformanceAccessibilityEngine.js', className: 'PerformanceAccessibilityEngine' },
      { type: 'compatibility', path: '../compatibility/compatibilityTestEngine.js', className: 'RealCompatibilityTestEngine' },
      { type: 'api', path: './apiTestEngine', className: 'RealAPITestEngine' },
      { type: 'ux', path: './uxTestEngine', className: 'RealUXTestEngine' }
    ];

    for (const config of engineConfigs) {
      try {
        await this.registerEngine(config.type, config.path, config.className);
      } catch (error) {
        console.warn(`⚠️ 引擎 ${config.type} 注册失败:`, error.message);
      }
    }
  }

  /**
   * 注册引擎
   * @param {string} type - 引擎类型
   * @param {string} modulePath - 模块路径
   * @param {string} className - 类名
   */
  async registerEngine(type, modulePath, className) {
    try {
      const EngineModule = require(modulePath);
      const EngineClass = className ? EngineModule[className] || EngineModule : EngineModule;

      if (typeof EngineClass !== 'function') {
        throw new Error(`引擎类 ${className} 不是有效的构造函数`);
      }

      const engine = new EngineClass();

      // 包装引擎以符合统一接口
      const wrappedEngine = this.wrapEngine(engine, type);

      this.engines.set(type, wrappedEngine);
      this.engineRegistry.set(type, {
        modulePath,
        className,
        registeredAt: new Date()
      });

      console.log(`✅ 引擎 ${type} 注册成功`);
    } catch (error) {
      console.warn(`⚠️ 引擎 ${type} 注册失败:`, error.message);
      throw error;
    }
  }

  /**
   * 包装引擎以符合统一接口
   * @param {Object} engine - 原始引擎
   * @param {string} type - 引擎类型
   */
  wrapEngine(engine, type) {
    return {
      name: type,
      version: engine.version || '1.0.0',
      originalEngine: engine,

      async healthCheck() {
        if (typeof engine.healthCheck === 'function') {
          return await engine.healthCheck();
        }

        // 检查引擎是否有必要的方法
        const requiredMethods = ['runTest', 'executeTest', 'performTest'];
        return requiredMethods.some(method => typeof engine[method] === 'function');
      },

      async executeTest(config, options = {}) {
        // 根据引擎类型调用相应的方法
        if (typeof engine.runTest === 'function') {
          return await engine.runTest(config, options);
        } else if (typeof engine.executeTest === 'function') {
          return await engine.executeTest(config, options);
        } else if (typeof engine.performTest === 'function') {
          return await engine.performTest(config, options);
        } else {
          throw new Error(`引擎 ${type} 没有可用的测试执行方法`);
        }
      },

      async stopTest(testId) {
        if (typeof engine.stopTest === 'function') {
          return await engine.stopTest(testId);
        }
        return true;
      },

      getStatus() {
        return {
          name: type,
          version: engine.version || '1.0.0',
          isAvailable: engine.isAvailable !== false
        };
      }
    };
  }

  /**
   * 检查所有引擎健康状态
   */
  async checkAllEnginesHealth() {
    const healthResults = {};

    for (const [type, engine] of this.engines) {
      try {
        const isHealthy = await engine.healthCheck();
        healthResults[type] = isHealthy;
        engine.isAvailable = isHealthy;
      } catch (error) {
        console.warn(`引擎 ${type} 健康检查失败:`, error.message);
        healthResults[type] = false;
        engine.isAvailable = false;
      }
    }

    return healthResults;
  }

  /**
   * 获取可用引擎列表
   */
  getAvailableEngines() {
    const available = [];
    for (const [type, engine] of this.engines) {
      if (engine.isAvailable !== false) {
        available.push(type);
      }
    }
    return available;
  }

  /**
   * 选择最佳引擎
   * @param {string} testType - 测试类型
   * @returns {string} 引擎类型
   */
  selectBestEngine(testType) {
    const candidates = this.engineTypeMapping[testType] || [testType];

    for (const candidate of candidates) {
      const engine = this.engines.get(candidate);
      if (engine && engine.isAvailable !== false) {
        return candidate;
      }
    }

    // 如果没有找到合适的引擎，返回第一个可用的引擎
    const availableEngines = this.getAvailableEngines();
    if (availableEngines.length > 0) {
      return availableEngines[0];
    }

    throw ErrorFactory.test('engineUnavailable', `没有可用的引擎执行 ${testType} 测试`);
  }

  /**
   * 执行测试
   * @param {string} testType - 测试类型
   * @param {Object} config - 测试配置
   * @param {Object} options - 执行选项
   */
  async executeTest(testType, config, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const engineType = this.selectBestEngine(testType);
    const engine = this.engines.get(engineType);

    if (!engine) {
      throw ErrorFactory.test('engineUnavailable', `引擎 ${engineType} 不可用`);
    }

    const { testId, userId, onProgress, onComplete, onError } = options;

    try {
      // 记录运行中的测试
      if (testId) {
        this.runningTests.set(testId, {
          testType,
          engineType,
          userId,
          startTime: new Date(),
          config
        });

        this.emit('testStarted', { testId, testType, engineType });
      }

      // 执行测试
      const result = await engine.executeTest(config, options);

      // 清理运行记录
      if (testId) {
        this.runningTests.delete(testId);
        this.emit('testCompleted', { testId, result });
      }

      return {
        ...result,
        engine: engineType,
        testType,
        executedAt: new Date().toISOString()
      };

    } catch (error) {
      if (testId) {
        this.runningTests.delete(testId);
        this.emit('testFailed', { testId, error });
      }
      throw error;
    }
  }

  /**
   * 停止测试
   * @param {string} testId - 测试ID
   */
  async stopTest(testId) {
    const testInfo = this.runningTests.get(testId);
    if (!testInfo) {
      return false;
    }

    const engine = this.engines.get(testInfo.engineType);
    if (engine && typeof engine.stopTest === 'function') {
      await engine.stopTest(testId);
    }

    this.runningTests.delete(testId);
    this.emit('testStopped', { testId });
    return true;
  }

  /**
   * 获取运行中的测试
   */
  getRunningTests() {
    return Array.from(this.runningTests.entries()).map(([testId, info]) => ({
      testId,
      ...info
    }));
  }

  /**
   * 获取引擎状态
   */
  async getEngineStatus() {
    const status = {};

    for (const [type, engine] of this.engines) {
      status[type] = engine.getStatus();
    }

    return {
      engines: status,
      runningTests: this.getRunningTests().length,
      isInitialized: this.isInitialized
    };
  }
}

// 创建单例实例
const unifiedTestEngineManager = new UnifiedTestEngineManager();

module.exports = {
  UnifiedTestEngineManager,
  TestEngineInterface,
  unifiedTestEngineManager
};
