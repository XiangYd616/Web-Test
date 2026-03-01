import { ITestEngine, TestEngineType } from '../../../../shared/types/testEngine.types';
import registry from '../../core/TestEngineRegistry';
import AccessibilityTestEngine from '../accessibility/AccessibilityTestEngine';
import ApiTestEngine from '../api/apiTestEngine';
import CompatibilityTestEngine from '../compatibility/CompatibilityTestEngine';
import PerformanceTestEngine from '../performance/PerformanceTestEngine';
import SecurityTestEngine from '../security/securityTestEngine';
import SeoTestEngine from '../seo/SEOTestEngine';
import StressTestEngine from '../stress/stressTestEngine';
import UXTestEngine from '../ux/UXTestEngine';
import WebsiteTestEngine from '../website/WebsiteTestEngine';
import StandardEngineWrapper from './StandardEngineWrapper';

type EngineCtor = new (options?: Record<string, unknown>) => unknown;

type WrapperEngine = {
  name?: string;
  version?: string;
  description?: string;
  checkAvailability?: () => { available: boolean };
  executeTest: (config: Record<string, unknown>) => Promise<Record<string, unknown>>;
  setProgressCallback?: (callback: (progress: Record<string, unknown>) => void) => void;
  stopTest?: (testId: string) => Promise<boolean> | boolean;
  getTestStatus?: (testId: string) => unknown;
};

const DIRECT_ENGINES = new Set<TestEngineType>([
  TestEngineType.UX,
  TestEngineType.STRESS,
  TestEngineType.COMPATIBILITY,
  TestEngineType.API,
  TestEngineType.ACCESSIBILITY,
  TestEngineType.PERFORMANCE,
  TestEngineType.SECURITY,
  TestEngineType.SEO,
  TestEngineType.WEBSITE,
]);

const ENGINE_CONSTRUCTORS: Partial<Record<TestEngineType, EngineCtor>> = {
  [TestEngineType.WEBSITE]: WebsiteTestEngine,
  [TestEngineType.API]: ApiTestEngine,
  [TestEngineType.PERFORMANCE]: PerformanceTestEngine,
  [TestEngineType.SECURITY]: SecurityTestEngine,
  [TestEngineType.SEO]: SeoTestEngine,
  [TestEngineType.ACCESSIBILITY]: AccessibilityTestEngine,
  [TestEngineType.STRESS]: StressTestEngine,
  [TestEngineType.COMPATIBILITY]: CompatibilityTestEngine,
  [TestEngineType.UX]: UXTestEngine,
};

const createEngineInstance = (type: TestEngineType, options?: Record<string, unknown>) => {
  const Engine = ENGINE_CONSTRUCTORS[type];
  if (!Engine) {
    throw new Error(`未知测试引擎类型: ${type}`);
  }
  const instance = new Engine(options);
  if (DIRECT_ENGINES.has(type)) {
    return instance as ITestEngine;
  }
  return new StandardEngineWrapper(type, instance as WrapperEngine);
};

const registerTestEngines = () => {
  (Object.entries(ENGINE_CONSTRUCTORS) as Array<[TestEngineType, EngineCtor | undefined]>).forEach(
    ([type, Engine]) => {
      if (!Engine) return;
      if (registry.getEngine(type)) return;
      const instance = createEngineInstance(type);
      registry.register(instance);
    }
  );
};

export { createEngineInstance, ENGINE_CONSTRUCTORS };
export default registerTestEngines;
