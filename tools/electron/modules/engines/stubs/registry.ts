/**
 * 桌面端 TestEngineRegistry stub
 * CoreTestEngine 等引擎内部 import registry，但桌面端不需要注册器的完整功能
 */
const registryStub = {
  getEngine: (): undefined => undefined,
  register: (): void => {},
  getAvailableEngines: (): string[] => [],
  execute: async (): Promise<never> => {
    throw new Error('Registry not available in desktop mode');
  },
  cancel: async (): Promise<void> => {},
  getTestStatus: (): undefined => undefined,
  getRunningTests: (): string[] => [],
  cleanup: async (): Promise<void> => {},
  getStats: (): {
    totalEngines: number;
    enabledEngines: number;
    runningTests: number;
    engineTypes: string[];
  } => ({ totalEngines: 0, enabledEngines: 0, runningTests: 0, engineTypes: [] }),
  initialize: async (): Promise<void> => {},
};

export class TestEngineRegistry {
  private static instance = registryStub;
  static getInstance() {
    return TestEngineRegistry.instance;
  }
}

export default registryStub;
