import type { TestEngineType } from '../../../../shared/types/testEngine.types';
import registry from '../../core/TestEngineRegistry';
import { createEngineInstance } from '../../engines/core/registerEngines';

const createEngine = (type: TestEngineType, options: Record<string, unknown> = {}) => {
  const existing = registry.getEngine(type as TestEngineType);
  if (existing) {
    return existing;
  }

  const instance = createEngineInstance(type, options);
  registry.register(instance);
  return instance;
};

export { createEngine };
