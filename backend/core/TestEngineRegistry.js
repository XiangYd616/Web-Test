class TestEngineRegistry {
  constructor() {
    this.engines = new Map();
  }

  static getInstance() {
    if (!TestEngineRegistry.instance) {
      TestEngineRegistry.instance = new TestEngineRegistry();
    }
    return TestEngineRegistry.instance;
  }

  register(type, engine) {
    if (!type || !engine) {
      throw new Error('测试引擎注册需要类型与实例');
    }
    this.engines.set(type, engine);
  }

  getEngine(type) {
    return this.engines.get(type);
  }

  async execute(type, config = {}, onProgress) {
    const engine = this.engines.get(type);
    if (!engine) {
      throw new Error(`测试引擎未注册: ${type}`);
    }
    if (onProgress && engine.setProgressCallback) {
      engine.setProgressCallback(onProgress);
    }
    if (engine.executeTest) {
      return engine.executeTest(config);
    }
    if (engine.runTest) {
      return engine.runTest(config);
    }
    throw new Error(`测试引擎 ${type} 缺少可执行方法`);
  }

  getStatus(type, testId) {
    const engine = this.engines.get(type);
    if (!engine || !engine.getTestStatus) {
      return null;
    }
    return engine.getTestStatus(testId);
  }

  async cancel(type, testId) {
    const engine = this.engines.get(type);
    if (!engine || !engine.stopTest) {
      return false;
    }
    return engine.stopTest(testId);
  }
}

module.exports = TestEngineRegistry.getInstance();
module.exports.TestEngineRegistry = TestEngineRegistry;
