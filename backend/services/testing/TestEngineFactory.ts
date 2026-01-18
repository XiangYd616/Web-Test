type EngineType =
  | 'website'
  | 'performance'
  | 'security'
  | 'seo'
  | 'stress'
  | 'api'
  | 'accessibility';

const registry = require('../../core/TestEngineRegistry');

type EngineConstructor = new (options?: Record<string, unknown>) => unknown;

const createEngine = (type: EngineType, options: Record<string, unknown> = {}) => {
  const existing = registry.getEngine(type);
  if (existing) {
    return existing;
  }

  const engines: Record<EngineType, EngineConstructor> = {
    website: require('../../engines/website'),
    performance: require('../../engines/performance'),
    security: require('../../engines/security'),
    seo: require('../../engines/seo'),
    stress: require('../../engines/stress'),
    api: require('../../engines/api'),
    accessibility: require('../../engines/accessibility'),
  };

  const Engine = engines[type];
  if (!Engine) {
    throw new Error(`未知测试引擎类型: ${type}`);
  }

  const instance = new Engine(options);
  registry.register(type, instance);
  return instance;
};

module.exports = {
  createEngine,
};
