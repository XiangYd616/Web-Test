const registry = require('../../core/TestEngineRegistry');
const StandardEngineWrapper = require('./StandardEngineWrapper');
const { TestEngineType } = require('../../../shared/types/testEngine.types');

const registerTestEngines = () => {
  const engineMap = {
    [TestEngineType.WEBSITE]: require('../website/WebsiteTestEngine'),
    [TestEngineType.API]: require('../api/apiTestEngine'),
    [TestEngineType.PERFORMANCE]: require('../performance/PerformanceTestEngine'),
    [TestEngineType.SECURITY]: require('../security/securityTestEngine'),
    [TestEngineType.SEO]: require('../seo/SEOTestEngine'),
    [TestEngineType.ACCESSIBILITY]: require('../accessibility/AccessibilityTestEngine'),
    [TestEngineType.STRESS]: require('../stress/stressTestEngine'),
  } as Record<string, new () => unknown>;

  Object.entries(engineMap).forEach(([type, Engine]) => {
    if (!Engine) return;
    if (registry.getEngine(type)) return;
    const instance = new Engine();
    const wrapper = new StandardEngineWrapper(type, instance);
    registry.register(wrapper);
  });
};

module.exports = registerTestEngines;

export default registerTestEngines;
