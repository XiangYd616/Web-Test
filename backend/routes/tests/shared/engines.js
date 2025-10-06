/**
 * 测试引擎管理
 * 统一管理所有测试引擎实例
 */

const APIAnalyzer = require('../../../engines/api/ApiAnalyzer');
const StressTestEngine = require('../../../engines/stress/StressTestEngine');
const SecurityTestEngine = require('../../../engines/security/SecurityTestEngine');
const CompatibilityTestEngine = require('../../../engines/compatibility/CompatibilityTestEngine');
const UXAnalyzer = require('../../../engines/api/UXAnalyzer');
const ApiTestEngine = require('../../../engines/api/APITestEngine');

/**
 * 测试引擎管理器
 * 提供统一的引擎实例访问接口
 */
class EngineManager {
  constructor() {
    this.engines = {
      api: null,
      stress: null, // 由 UserTestManager 动态管理
      security: null,
      compatibility: null,
      ux: null,
      apiTest: null
    };
    
    this.initialized = false;
  }

  /**
   * 初始化所有引擎
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    try {
      this.engines.api = new APIAnalyzer();
      console.log('✅ API Analyzer 初始化成功');
    } catch (error) {
      console.warn('⚠️ API Analyzer 初始化失败:', error.message);
    }

    try {
      // 压力测试引擎由 UserTestManager 管理，不在这里初始化
      console.log('ℹ️ Stress Test Engine 由 UserTestManager 管理');
    } catch (error) {
      console.warn('⚠️ Stress Test Engine 初始化失败:', error.message);
    }

    try {
      this.engines.security = new SecurityTestEngine();
      console.log('✅ Security Test Engine 初始化成功');
    } catch (error) {
      console.warn('⚠️ Security Test Engine 初始化失败:', error.message);
    }

    try {
      this.engines.compatibility = new CompatibilityTestEngine();
      console.log('✅ Compatibility Test Engine 初始化成功');
    } catch (error) {
      console.warn('⚠️ Compatibility Test Engine 初始化失败:', error.message);
    }

    try {
      this.engines.ux = new UXAnalyzer();
      console.log('✅ UX Analyzer 初始化成功');
    } catch (error) {
      console.warn('⚠️ UX Analyzer 初始化失败:', error.message);
    }

    try {
      this.engines.apiTest = new ApiTestEngine();
      console.log('✅ API Test Engine 初始化成功');
    } catch (error) {
      console.warn('⚠️ API Test Engine 初始化失败:', error.message);
    }

    this.initialized = true;
  }

  /**
   * 获取指定类型的引擎
   * @param {string} type - 引擎类型 (api, stress, security, compatibility, ux, apiTest)
   * @returns {Object|null} 引擎实例
   */
  getEngine(type) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.engines[type]) {
      console.warn(`⚠️ 引擎 ${type} 不存在或未初始化`);
      return null;
    }

    return this.engines[type];
  }

  /**
   * 设置引擎实例（用于外部管理的引擎，如压力测试）
   * @param {string} type - 引擎类型
   * @param {Object} engine - 引擎实例
   */
  setEngine(type, engine) {
    this.engines[type] = engine;
  }

  /**
   * 获取所有引擎状态
   * @returns {Object} 引擎状态对象
   */
  getStatus() {
    if (!this.initialized) {
      this.initialize();
    }

    return {
      api: this.engines.api ? 'initialized' : 'not_initialized',
      stress: this.engines.stress ? 'initialized' : 'managed_externally',
      security: this.engines.security ? 'initialized' : 'not_initialized',
      compatibility: this.engines.compatibility ? 'initialized' : 'not_initialized',
      ux: this.engines.ux ? 'initialized' : 'not_initialized',
      apiTest: this.engines.apiTest ? 'initialized' : 'not_initialized'
    };
  }

  /**
   * 清理所有引擎资源
   */
  cleanup() {
    Object.keys(this.engines).forEach(key => {
      if (this.engines[key] && typeof this.engines[key].cleanup === 'function') {
        this.engines[key].cleanup();
      }
      this.engines[key] = null;
    });
    
    this.initialized = false;
  }
}

// 创建单例实例
const engineManager = new EngineManager();

// 自动初始化
engineManager.initialize();

module.exports = engineManager;

