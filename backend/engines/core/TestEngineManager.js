/**
 * 测试引擎管理器
 * 统一管理所有测试引擎的生命周期和状态
 */

const EventEmitter = require('events');

class TestEngineManager extends EventEmitter {
  constructor() {
    super();
    this.engines = new Map();
    this.initialized = false;
    this.status = 'stopped';
  }

  /**
   * 初始化引擎管理器
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🚀 初始化测试引擎管理器...');
      
      // 注册所有测试引擎
      await this.registerEngines();
      
      this.initialized = true;
      this.status = 'running';
      
      console.log(`✅ 测试引擎管理器初始化完成，已注册 ${this.engines.size} 个引擎`);
      
      this.emit('initialized', { 
        engineCount: this.engines.size,
        engines: Array.from(this.engines.keys())
      });
    } catch (error) {
      console.error('❌ 测试引擎管理器初始化失败:', error.message);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * 注册所有测试引擎
   */
  async registerEngines() {
    const engineConfigs = [
      { name: 'website', path: '../api/apiTestEngine', enabled: true },
      { name: 'security', path: '../security/SecurityTestEngine', enabled: true },
      { name: 'performance', path: '../core/PerformanceTestCore', enabled: true },
      { name: 'seo', path: '../seo/SEOTestEngine', enabled: true },
      { name: 'api', path: '../api/APIAnalyzer', enabled: true },
      { name: 'network', path: '../network/NetworkTestEngine', enabled: true },
      { name: 'database', path: '../database/DatabaseTestEngine', enabled: true },
      { name: 'compatibility', path: '../compatibility/CompatibilityAnalyzer', enabled: true },
      { name: 'accessibility', path: '../accessibility/AccessibilityTestEngine', enabled: true },
      { name: 'ux', path: '../api/UXAnalyzer', enabled: true }
    ];

    for (const config of engineConfigs) {
      if (!config.enabled) {
        continue;
      }

      try {
        // 尝试加载引擎模块
        let Engine;
        try {
          Engine = require(config.path);
        } catch (loadError) {
          console.warn(`⚠️ 无法加载引擎 ${config.name}:`, loadError.message);
          continue;
        }

        // 创建引擎实例
        const engine = new Engine();
        engine.name = config.name;
        engine.status = 'ready';
        engine.lastUsed = null;
        engine.testCount = 0;

        // 注册引擎
        this.engines.set(config.name, engine);
        console.log(`✅ 已注册引擎: ${config.name}`);

      } catch (error) {
        console.warn(`⚠️ 注册引擎 ${config.name} 失败:`, error.message);
      }
    }
  }

  /**
   * 获取引擎
   */
  getEngine(name) {
    if (!this.initialized) {
      throw new Error('引擎管理器未初始化');
    }

    const engine = this.engines.get(name);
    if (!engine) {
      throw new Error(`引擎 ${name} 不存在`);
    }

    return engine;
  }

  /**
   * 获取所有引擎状态
   */
  getEnginesStatus() {
    const status = {};
    
    for (const [name, engine] of this.engines) {
      status[name] = {
        name: engine.name || name,
        status: engine.status || 'unknown',
        lastUsed: engine.lastUsed,
        testCount: engine.testCount || 0,
        enabled: true
      };
    }

    return {
      managerStatus: this.status,
      initialized: this.initialized,
      totalEngines: this.engines.size,
      engines: status,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 运行测试
   */
  async runTest(engineName, config) {
    const engine = this.getEngine(engineName);
    
    try {
      engine.status = 'running';
      engine.lastUsed = new Date();
      
      // 运行测试
      let result;
      if (typeof engine.runTest === 'function') {
        result = await engine.runTest(config.url, config);
      } else if (typeof engine.analyze === 'function') {
        result = await engine.analyze(config.url, config);
      } else if (typeof engine.execute === 'function') {
        result = await engine.execute(config);
      } else {
        throw new Error(`引擎 ${engineName} 不支持测试方法`);
      }

      engine.status = 'ready';
      engine.testCount = (engine.testCount || 0) + 1;

      this.emit('testCompleted', { 
        engine: engineName, 
        success: true, 
        result 
      });

      return result;
    } catch (error) {
      engine.status = 'error';
      
      this.emit('testFailed', { 
        engine: engineName, 
        error: error.message 
      });
      
      throw error;
    }
  }

  /**
   * 停止引擎管理器
   */
  async stop() {
    try {
      
      // 停止所有引擎
      for (const [name, engine] of this.engines) {
        if (typeof engine.stop === 'function') {
          try {
            await engine.stop();
          } catch (error) {
            console.warn(`⚠️ 停止引擎 ${name} 失败:`, error.message);
          }
        }
        engine.status = 'stopped';
      }

      this.status = 'stopped';
      this.initialized = false;
      
      console.log('✅ 测试引擎管理器已停止');
      
      this.emit('stopped');
    } catch (error) {
      console.error('❌ 停止测试引擎管理器失败:', error.message);
      throw error;
    }
  }

  /**
   * 重启引擎管理器
   */
  async restart() {
    await this.stop();
    await this.initialize();
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    const health = {
      status: this.status,
      initialized: this.initialized,
      engines: {},
      issues: []
    };

    for (const [name, engine] of this.engines) {
      try {
        // 检查引擎健康状态
        if (typeof engine.healthCheck === 'function') {
          const engineHealth = await engine.healthCheck();
          health.engines[name] = engineHealth;
        } else {
          health.engines[name] = {
            status: engine.status,
            available: true
          };
        }
      } catch (error) {
        health.engines[name] = {
          status: 'error',
          error: error.message,
          available: false
        };
        health.issues.push(`引擎 ${name}: ${error.message}`);
      }
    }

    // 总体健康状态
    const unhealthyEngines = Object.values(health.engines)
      .filter(engine => !engine.available);
    
    if (unhealthyEngines.length === 0) {
      health.overall = 'healthy';
    } else if (unhealthyEngines.length < this.engines.size) {
      health.overall = 'degraded';
    } else {
      health.overall = 'unhealthy';
    }

    return health;
  }

  /**
   * 获取引擎列表
   */
  getEngineList() {
    return Array.from(this.engines.keys());
  }

  /**
   * 引擎是否可用
   */
  isEngineAvailable(name) {
    const engine = this.engines.get(name);
    return engine && engine.status === 'ready';
  }
}

// 导出单例实例
const testEngineManager = new TestEngineManager();

module.exports = TestEngineManager;
module.exports.default = testEngineManager;
module.exports.testEngineManager = testEngineManager;
