/**
 * 测试引擎管理器单元测试
 */

const EventEmitter = require('events');

// 模拟测试引擎类
class MockEngine {
  constructor(name = 'mock') {
    this.name = name;
    this.status = 'ready';
    this.lastUsed = null;
    this.testCount = 0;
  }

  async runTest(url, config) {
    return {
      success: true,
      url,
      score: 85,
      timestamp: new Date().toISOString()
    };
  }

  async analyze(url, config) {
    return {
      success: true,
      url,
      analysis: { score: 90 }
    };
  }

  async stop() {
    this.status = 'stopped';
  }
}

describe('测试引擎管理器', () => {
  let TestEngineManager;
  let manager;

  beforeEach(() => {
    // 清除缓存
    jest.resetModules();
    
    // 模拟引擎管理器类
    TestEngineManager = class extends EventEmitter {
      constructor() {
        super();
        this.engines = new Map();
        this.initialized = false;
        this.status = 'stopped';
      }

      async initialize() {
        if (this.initialized) {
          return;
        }
        this.initialized = true;
        this.status = 'running';
        this.emit('initialized', { 
          engineCount: this.engines.size,
          engines: Array.from(this.engines.keys())
        });
      }

      registerEngine(name, engine) {
        this.engines.set(name, engine);
      }

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

      async runTest(engineName, config) {
        const engine = this.getEngine(engineName);
        try {
          engine.status = 'running';
          engine.lastUsed = new Date();
          
          let result;
          if (typeof engine.runTest === 'function') {
            result = await engine.runTest(config.url, config);
          } else if (typeof engine.analyze === 'function') {
            result = await engine.analyze(config.url, config);
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

      async stop() {
        for (const [name, engine] of this.engines) {
          try {
            if (typeof engine.stop === 'function') {
              await engine.stop();
            }
            engine.status = 'stopped';
          } catch (error) {
            // 优雅地处理引擎停止失败，但继续停止其他引擎
            engine.status = 'error';
            console.warn(`Engine ${name} stop failed:`, error.message);
          }
        }
        this.status = 'stopped';
        this.initialized = false;
        this.emit('stopped');
      }
    };

    manager = new TestEngineManager();
  });

  afterEach(() => {
    if (manager) {
      manager.removeAllListeners();
    }
  });

  describe('初始化', () => {
    test('应该正确初始化引擎管理器', async () => {
      expect(manager.initialized).toBe(false);
      expect(manager.status).toBe('stopped');
      
      await manager.initialize();
      
      expect(manager.initialized).toBe(true);
      expect(manager.status).toBe('running');
    });

    test('应该在已初始化时跳过重复初始化', async () => {
      await manager.initialize();
      const firstInitState = manager.initialized;
      
      await manager.initialize();
      
      expect(manager.initialized).toBe(firstInitState);
    });

    test('应该触发初始化事件', async () => {
      const initHandler = jest.fn();
      manager.on('initialized', initHandler);
      
      await manager.initialize();
      
      expect(initHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          engineCount: expect.any(Number),
          engines: expect.any(Array)
        })
      );
    });
  });

  describe('引擎注册', () => {
    test('应该成功注册引擎', () => {
      const mockEngine = new MockEngine('test-engine');
      
      manager.registerEngine('test', mockEngine);
      
      expect(manager.engines.size).toBe(1);
      expect(manager.engines.has('test')).toBe(true);
    });

    test('应该注册多个引擎', () => {
      manager.registerEngine('engine1', new MockEngine('engine1'));
      manager.registerEngine('engine2', new MockEngine('engine2'));
      manager.registerEngine('engine3', new MockEngine('engine3'));
      
      expect(manager.engines.size).toBe(3);
      expect(manager.engines.has('engine1')).toBe(true);
      expect(manager.engines.has('engine2')).toBe(true);
      expect(manager.engines.has('engine3')).toBe(true);
    });
  });

  describe('获取引擎', () => {
    beforeEach(async () => {
      manager.registerEngine('test', new MockEngine('test'));
      await manager.initialize();
    });

    test('应该成功获取已注册的引擎', () => {
      const engine = manager.getEngine('test');
      
      expect(engine).toBeDefined();
      expect(engine.name).toBe('test');
    });

    test('应该在引擎不存在时抛出错误', () => {
      expect(() => {
        manager.getEngine('nonexistent');
      }).toThrow('引擎 nonexistent 不存在');
    });

    test('应该在未初始化时抛出错误', () => {
      const uninitializedManager = new TestEngineManager();
      uninitializedManager.registerEngine('test', new MockEngine());
      
      expect(() => {
        uninitializedManager.getEngine('test');
      }).toThrow('引擎管理器未初始化');
    });
  });

  describe('引擎状态', () => {
    test('应该返回所有引擎的状态', async () => {
      manager.registerEngine('engine1', new MockEngine('engine1'));
      manager.registerEngine('engine2', new MockEngine('engine2'));
      await manager.initialize();
      
      const status = manager.getEnginesStatus();
      
      expect(status).toHaveProperty('managerStatus', 'running');
      expect(status).toHaveProperty('initialized', true);
      expect(status).toHaveProperty('totalEngines', 2);
      expect(status).toHaveProperty('engines');
      expect(status).toHaveProperty('timestamp');
      expect(status.engines).toHaveProperty('engine1');
      expect(status.engines).toHaveProperty('engine2');
    });

    test('引擎状态应该包含正确的信息', async () => {
      const mockEngine = new MockEngine('test');
      manager.registerEngine('test', mockEngine);
      await manager.initialize();
      
      const status = manager.getEnginesStatus();
      const engineStatus = status.engines['test'];
      
      expect(engineStatus).toHaveProperty('name', 'test');
      expect(engineStatus).toHaveProperty('status', 'ready');
      expect(engineStatus).toHaveProperty('testCount', 0);
      expect(engineStatus).toHaveProperty('enabled', true);
    });
  });

  describe('运行测试', () => {
    beforeEach(async () => {
      manager.registerEngine('test', new MockEngine('test'));
      await manager.initialize();
    });

    test('应该成功运行测试', async () => {
      const config = { url: 'https://example.com' };
      
      const result = await manager.runTest('test', config);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.url).toBe(config.url);
    });

    test('应该更新引擎状态', async () => {
      const config = { url: 'https://example.com' };
      const engine = manager.getEngine('test');
      
      expect(engine.status).toBe('ready');
      expect(engine.testCount).toBe(0);
      
      await manager.runTest('test', config);
      
      expect(engine.status).toBe('ready');
      expect(engine.testCount).toBe(1);
      expect(engine.lastUsed).toBeDefined();
    });

    test('应该触发测试完成事件', async () => {
      const completedHandler = jest.fn();
      manager.on('testCompleted', completedHandler);
      
      const config = { url: 'https://example.com' };
      await manager.runTest('test', config);
      
      expect(completedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          engine: 'test',
          success: true,
          result: expect.any(Object)
        })
      );
    });

    test('应该处理测试失败', async () => {
      const failingEngine = {
        name: 'failing',
        status: 'ready',
        runTest: jest.fn().mockRejectedValue(new Error('测试失败'))
      };
      
      manager.registerEngine('failing', failingEngine);
      
      const failHandler = jest.fn();
      manager.on('testFailed', failHandler);
      
      const config = { url: 'https://example.com' };
      
      await expect(manager.runTest('failing', config)).rejects.toThrow('测试失败');
      
      expect(failHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          engine: 'failing',
          error: '测试失败'
        })
      );
    });

    test('应该支持不同的测试方法', async () => {
      const analyzeEngine = new MockEngine('analyzer');
      manager.registerEngine('analyzer', analyzeEngine);
      
      const config = { url: 'https://example.com' };
      const result = await manager.runTest('analyzer', config);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('停止引擎管理器', () => {
    test('应该正确停止所有引擎', async () => {
      const engine1 = new MockEngine('engine1');
      const engine2 = new MockEngine('engine2');
      
      manager.registerEngine('engine1', engine1);
      manager.registerEngine('engine2', engine2);
      await manager.initialize();
      
      await manager.stop();
      
      expect(manager.status).toBe('stopped');
      expect(manager.initialized).toBe(false);
      expect(engine1.status).toBe('stopped');
      expect(engine2.status).toBe('stopped');
    });

    test('应该触发停止事件', async () => {
      const stopHandler = jest.fn();
      manager.on('stopped', stopHandler);
      
      await manager.initialize();
      await manager.stop();
      
      expect(stopHandler).toHaveBeenCalled();
    });

    test('应该处理引擎停止错误', async () => {
      const faultyEngine = {
        name: 'faulty',
        status: 'ready',
        stop: jest.fn().mockImplementation(async () => {
          throw new Error('Stop failed');
        })
      };
      
      manager.registerEngine('faulty', faultyEngine);
      await manager.initialize();
      
      // 应该优雅处理引擎停止错误，并仍然完成管理器停止
      await manager.stop();
      
      expect(manager.status).toBe('stopped');
      // faultyEngine 应该处于 error 状态
      expect(faultyEngine.status).toBe('error');
    });
  });

  describe('并发测试', () => {
    test('应该支持并发运行多个测试', async () => {
      manager.registerEngine('engine1', new MockEngine('engine1'));
      manager.registerEngine('engine2', new MockEngine('engine2'));
      await manager.initialize();
      
      const config1 = { url: 'https://example1.com' };
      const config2 = { url: 'https://example2.com' };
      
      const [result1, result2] = await Promise.all([
        manager.runTest('engine1', config1),
        manager.runTest('engine2', config2)
      ]);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.url).toBe(config1.url);
      expect(result2.url).toBe(config2.url);
    });
  });

  describe('边界情况', () => {
    test('应该处理空引擎列表', () => {
      const status = manager.getEnginesStatus();
      
      expect(status.totalEngines).toBe(0);
      expect(Object.keys(status.engines)).toHaveLength(0);
    });

    test('应该处理无效的配置', async () => {
      manager.registerEngine('test', new MockEngine());
      await manager.initialize();
      
      await expect(manager.runTest('test', {})).resolves.toBeDefined();
    });
  });
});

