const createEngine = (type, options = {}) => {
  const engines = {
    website: require('../../engines/website'),
    performance: require('../../engines/performance'),
    security: require('../../engines/security'),
    seo: require('../../engines/seo'),
    stress: require('../../engines/stress'),
    api: require('../../engines/api'),
    accessibility: require('../../engines/accessibility')
  };

  const Engine = engines[type];
  if (!Engine) {
    throw new Error(`未知测试引擎类型: ${type}`);
  }

  return new Engine(options);
};

module.exports = {
  createEngine
};
