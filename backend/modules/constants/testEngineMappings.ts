import { TestType, TestTypeValues } from '../../../shared/types/test.types';
import { TestEngineType } from '../../../shared/types/testEngine.types';

export const QUEUE_NAMES = {
  DEFAULT: 'test-execution',
  HEAVY: 'test-execution-heavy',
  SECURITY: 'test-execution-security',
  DEAD: 'test-execution-dead',
} as const;

export const QUEUE_NAME_LIST = Object.values(QUEUE_NAMES);

export const TEST_TYPE_ENGINE_META: Record<
  TestType,
  {
    engineType: TestEngineType;
    engineName: string;
    testName: string;
    queueName: string;
  }
> = {
  website: {
    engineType: TestEngineType.WEBSITE,
    engineName: 'WebsiteTestEngine',
    testName: '网站综合测试',
    queueName: QUEUE_NAMES.DEFAULT,
  },
  seo: {
    engineType: TestEngineType.SEO,
    engineName: 'SeoTestEngine',
    testName: 'SEO测试',
    queueName: QUEUE_NAMES.DEFAULT,
  },
  performance: {
    engineType: TestEngineType.PERFORMANCE,
    engineName: 'PerformanceTestEngine',
    testName: '性能测试',
    queueName: QUEUE_NAMES.HEAVY,
  },
  accessibility: {
    engineType: TestEngineType.ACCESSIBILITY,
    engineName: 'AccessibilityTestEngine',
    testName: '可访问性测试',
    queueName: QUEUE_NAMES.DEFAULT,
  },
  security: {
    engineType: TestEngineType.SECURITY,
    engineName: 'SecurityTestEngine',
    testName: '安全测试',
    queueName: QUEUE_NAMES.SECURITY,
  },
  api: {
    engineType: TestEngineType.API,
    engineName: 'ApiTestEngine',
    testName: 'API测试',
    queueName: QUEUE_NAMES.DEFAULT,
  },
  stress: {
    engineType: TestEngineType.STRESS,
    engineName: 'StressTestEngine',
    testName: '压力测试',
    queueName: QUEUE_NAMES.HEAVY,
  },
  compatibility: {
    engineType: TestEngineType.COMPATIBILITY,
    engineName: 'CompatibilityTestEngine',
    testName: '兼容性测试',
    queueName: QUEUE_NAMES.DEFAULT,
  },
  ux: {
    engineType: TestEngineType.UX,
    engineName: 'UXTestEngine',
    testName: 'UX测试',
    queueName: QUEUE_NAMES.DEFAULT,
  },
};

export const isTestType = (value: string): value is TestType =>
  (TestTypeValues as readonly string[]).includes(value);

export const getQueueNameByTestType = (testType?: string) => {
  if (testType && isTestType(testType)) {
    return TEST_TYPE_ENGINE_META[testType].queueName;
  }
  return QUEUE_NAMES.DEFAULT;
};
