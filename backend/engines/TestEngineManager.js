/**
 * 测试引擎管理器
 * 
 * 文件路径: backend/engines/TestEngineManager.js
 * 创建时间: 2025-11-14
 * 
 * 功能:
 * - 统一管理所有测试引擎
 * - 自动加载和初始化引擎
 * - 提供统一的测试执行接口
 * - 支持WebSocket实时通知
 * - 集成告警系统
 */

const path = require('path');
const Logger = require('../utils/logger');

class TestEngineManager {
  constructor(options = {}) {
    this.options = options;
    this.engines = new Map();
    this.engineStats = new Map();
    
    // 自动加载所有引擎
    this.loadEngines();
  }

  /**
   * 加载所有测试引擎
   */
  loadEngines() {
    const engineConfigs = [
      { name: 'stress', path: './stress/stressTestEngine' },
      { name: 'api', path: './api/apiTestEngine' },
      { name: 'performance', path: './performance/PerformanceTestEngine' },
      { name: 'security', path: './security/securityTestEngine' },
      { name: 'seo', path: './seo/SEOTestEngine' },
      { name: 'accessibility', path: './accessibility/AccessibilityTestEngine' },
      { name: 'compatibility', path: './compatibility/compatibilityTestEngine' },
      { name: 'network', path: './network/NetworkTestEngine' },
      { name: 'database', path: './database/DatabaseTestEngine' }
    ];

    engineConfigs.forEach(config => {
      try {
        const EnginePath = require(config.path);
        const Engine = EnginePath.default || EnginePath;
        const engine = new Engine(this.options);
        
        this.engines.set(config.name, engine);
        this.engineStats.set(config.name, {
          loaded: true,
          version: engine.version || '1.0.0',
          executions: 0,
          failures: 0,
          lastExecuted: null
        });
        
        Logger.info(`✅ 加载测试引擎: ${config.name}`);
      } catch (error) {
        Logger.warn(`⚠️  无法加载引擎 ${config.name}: ${error.message}`);
        this.engineStats.set(config.name, {
          loaded: false,
          error: error.message
        });
      }
    });

    Logger.info(`总共加载了 ${this.engines.size} 个测试引擎`);
  }

  /**
   * 执行测试
   */
  async runTest(testType, config) {
    const engine = this.engines.get(testType);
    
    if (!engine) {
      throw new Error(`不支持的测试类型: ${testType}`);
    }

    const stats = this.engineStats.get(testType);
    stats.executions++;
    stats.lastExecuted = new Date();

    try {
      Logger.info(`🚀 执行 ${testType} 测试`);
      
      const startTime = Date.now();
      
      // 执行测试
      let result;
      if (typeof engine.runTest === 'function') {
        result = await engine.runTest(config);
      } else if (typeof engine.executeTest === 'function') {
        result = await engine.executeTest(config);
      } else {
        throw new Error(`引擎 ${testType} 没有实现测试方法`);
      }

      const duration = Date.now() - startTime;

      // 统一返回格式
      return {
        success: result.success !== false,
        type: testType,
        testId: config.testId || `test-${Date.now()}`,
        url: config.url,
        duration,
        timestamp: new Date(),
        result: result.results || result.result || result,
        engine: {
          name: engine.name || testType,
          version: engine.version || '1.0.0'
        }
      };

    } catch (error) {
      stats.failures++;
      Logger.error(`❌ ${testType} 测试失败:`, error);

      return {
        success: false,
        type: testType,
        testId: config.testId || `test-${Date.now()}`,
        url: config.url,
        duration: Date.now() - (config.startTime || Date.now()),
        timestamp: new Date(),
        error: error.message,
        engine: {
          name: engine.name || testType,
          version: engine.version || '1.0.0'
        }
      };
    }
  }

  /**
   * 获取引擎列表
   */
  getEngines() {
    const engines = [];
    
    this.engines.forEach((engine, name) => {
      const stats = this.engineStats.get(name);
      
      engines.push({
        name,
        displayName: this._getDisplayName(name),
        version: engine.version || '1.0.0',
        description: engine.description || '',
        available: stats.loaded,
        stats: {
          executions: stats.executions,
          failures: stats.failures,
          successRate: stats.executions > 0 
            ? ((stats.executions - stats.failures) / stats.executions * 100).toFixed(2) 
            : 0,
          lastExecuted: stats.lastExecuted
        }
      });
    });

    return engines;
  }

  /**
   * 获取引擎信息
   */
  getEngineInfo(testType) {
    const engine = this.engines.get(testType);
    
    if (!engine) {
      return null;
    }

    const stats = this.engineStats.get(testType);

    return {
      name: testType,
      displayName: this._getDisplayName(testType),
      version: engine.version || '1.0.0',
      description: engine.description || '',
      available: stats.loaded,
      features: engine.features || [],
      stats
    };
  }

  /**
   * 检查引擎是否可用
   */
  isEngineAvailable(testType) {
    const stats = this.engineStats.get(testType);
    return stats && stats.loaded;
  }

  /**
   * 获取引擎统计
   */
  getStatistics() {
    const totalEngines = this.engines.size;
    const loadedEngines = Array.from(this.engineStats.values()).filter(s => s.loaded).length;
    
    let totalExecutions = 0;
    let totalFailures = 0;

    this.engineStats.forEach(stats => {
      if (stats.loaded) {
        totalExecutions += stats.executions;
        totalFailures += stats.failures;
      }
    });

    return {
      totalEngines,
      loadedEngines,
      failedEngines: totalEngines - loadedEngines,
      totalExecutions,
      totalFailures,
      successRate: totalExecutions > 0 
        ? ((totalExecutions - totalFailures) / totalExecutions * 100).toFixed(2)
        : 0
    };
  }

  /**
   * 重新加载引擎
   */
  reloadEngine(testType) {
    try {
      const engine = this.engines.get(testType);
      if (engine && typeof engine.cleanup === 'function') {
        engine.cleanup();
      }

      // 清除require缓存
      const enginePath = this._getEnginePath(testType);
      if (require.cache[require.resolve(enginePath)]) {
        delete require.cache[require.resolve(enginePath)];
      }

      // 重新加载
      this.loadEngines();
      
      Logger.info(`✅ 引擎 ${testType} 重新加载成功`);
      return true;
    } catch (error) {
      Logger.error(`❌ 引擎 ${testType} 重新加载失败:`, error);
      return false;
    }
  }

  /**
   * 清理所有引擎
   */
  async cleanup() {
    for (const [name, engine] of this.engines.entries()) {
      try {
        if (typeof engine.cleanup === 'function') {
          await engine.cleanup();
        }
        Logger.info(`✅ 清理引擎: ${name}`);
      } catch (error) {
        Logger.error(`❌ 清理引擎 ${name} 失败:`, error);
      }
    }

    this.engines.clear();
    this.engineStats.clear();
  }

  /**
   * 获取显示名称
   * @private
   */
  _getDisplayName(name) {
    const displayNames = {
      stress: '压力测试',
      api: 'API测试',
      performance: '性能测试',
      security: '安全测试',
      seo: 'SEO测试',
      accessibility: '可访问性测试',
      compatibility: '兼容性测试',
      network: '网络测试',
      database: '数据库测试'
    };

    return displayNames[name] || name;
  }

  /**
   * 获取引擎路径
   * @private
   */
  _getEnginePath(testType) {
    const paths = {
      stress: './stress/stressTestEngine',
      api: './api/apiTestEngine',
      performance: './performance/PerformanceTestEngine',
      security: './security/securityTestEngine',
      seo: './seo/SEOTestEngine',
      accessibility: './accessibility/AccessibilityTestEngine',
      compatibility: './compatibility/compatibilityTestEngine',
      network: './network/NetworkTestEngine',
      database: './database/DatabaseTestEngine'
    };

    return paths[testType];
  }
}

// 创建单例实例
let instance = null;

function getTestEngineManager(options = {}) {
  if (!instance) {
    instance = new TestEngineManager(options);
  }
  return instance;
}

module.exports = {
  TestEngineManager,
  getTestEngineManager
};
