import { afterEach, describe, expect, it } from '@jest/globals';
import { TestEngineRegistry } from '../../../backend/core/TestEngineRegistry';
import {
  BaseTestConfig,
  BaseTestResult,
  TestEngineType,
  TestStatus,
} from '../../../shared/types/testEngine.types';

const createEngine = (type: TestEngineType, name: string) => ({
  type,
  name,
  version: '1.0.0',
  capabilities: {
    type,
    name,
    description: 'mock',
    version: '1.0.0',
    supportedFeatures: [],
    requiredConfig: [],
    optionalConfig: [],
    outputFormat: [],
    maxConcurrent: 1,
    estimatedDuration: { min: 0, max: 0, typical: 0 },
  },
  async initialize() {
    return;
  },
  validate(_config: BaseTestConfig) {
    return { isValid: true, errors: [], warnings: [], suggestions: [] };
  },
  async run(_config: BaseTestConfig): Promise<BaseTestResult> {
    return {
      testId: `${type}-1`,
      engineType: type,
      status: TestStatus.COMPLETED,
      score: 90,
      startTime: new Date(),
      endTime: new Date(),
      duration: 10,
      summary: 'ok',
      details: {},
    } as BaseTestResult;
  },
  async cancel() {
    return;
  },
  getStatus() {
    return {
      status: TestStatus.COMPLETED,
      progress: 100,
      currentStep: 'done',
      startTime: new Date(),
      messages: [],
    };
  },
  estimateDuration() {
    return 0;
  },
  getDependencies() {
    return [];
  },
  async isAvailable() {
    return true;
  },
  getMetrics() {
    return {};
  },
});

describe('TestEngineRegistry', () => {
  afterEach(async () => {
    await TestEngineRegistry.getInstance().cleanup();
  });

  it('应支持组合执行多个引擎', async () => {
    const registry = TestEngineRegistry.getInstance();
    registry.register(createEngine(TestEngineType.API, 'api'));
    registry.register(createEngine(TestEngineType.SEO, 'seo'));

    const result = await registry.executeComposite({
      engines: [TestEngineType.API, TestEngineType.SEO],
    });

    expect(result.successCount).toBe(2);
    expect(result.overallScore).toBeGreaterThan(0);
  });
});
