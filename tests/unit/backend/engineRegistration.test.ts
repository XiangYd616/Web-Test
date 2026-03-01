import registry from '../../../backend/modules/core/TestEngineRegistry';
import registerTestEngines, {
  ENGINE_CONSTRUCTORS,
} from '../../../backend/modules/engines/core/registerEngines';
import { TestEngineType } from '../../../shared/types/testEngine.types';

describe('engine registration', () => {
  beforeEach(async () => {
    await registry.cleanup();
  });

  afterEach(async () => {
    await registry.cleanup();
  });

  it('registers all configured engines', () => {
    registerTestEngines();

    const stats = registry.getStats();
    const expectedTypes = (Object.keys(ENGINE_CONSTRUCTORS) as TestEngineType[]).sort();
    const actualTypes = [...stats.engineTypes].sort();

    expect(actualTypes).toEqual(expectedTypes);
    expect(stats.totalEngines).toBe(expectedTypes.length);
  });
});
