export interface TestInfo {
  id: string;
  type: 'database' | 'api' | 'performance' | 'security' | 'compatibility' | 'content' | 'stress';
  config: any;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: Date;
  endTime?: Date;
  currentStep: string;
  result: any;
  error: string | null;
  onProgress?: (progress: number, step: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export type TestEvent = 'testStarted' | 'testProgress' | 'testCompleted' | 'testFailed' | 'testCancelled';

export type TestListener = (event: TestEvent, testInfo: TestInfo) => void;

declare class BackgroundTestManager {
  constructor();

  generateTestId(): string;

  startTest(
    testType: TestInfo['type'],
    config: any,
    onProgress?: (progress: number, step: string) => void,
    onComplete?: (result: any) => void,
    onError?: (error: Error) => void
  ): string;

  executeTest(testInfo: TestInfo): Promise<void>;
  executeDatabaseTest(testInfo: TestInfo): Promise<void>;
  executeAPITest(testInfo: TestInfo): Promise<void>;
  executePerformanceTest(testInfo: TestInfo): Promise<void>;
  executeSecurityTest(testInfo: TestInfo): Promise<void>;
  executeCompatibilityTest(testInfo: TestInfo): Promise<void>;
  executeContentTest(testInfo: TestInfo): Promise<void>;

  simulateProgressiveTest(testId: string, startProgress: number, endProgress: number, steps: string[]): Promise<void>;

  updateTestProgress(testId: string, progress: number, currentStep: string): void;
  completeTest(testId: string, result: any): void;
  handleTestError(testId: string, error: Error): void;
  cancelTest(testId: string): void;

  getTestStatus(testId: string): TestInfo | undefined;
  getRunningTests(): TestInfo[];
  getCompletedTests(): TestInfo[];
  getTestInfo(testId: string): TestInfo | undefined;
  getTestHistory(limit?: number): TestInfo[];
  cleanupCompletedTests(): void;

  addListener(callback: TestListener): () => void;
  notifyListeners(event: TestEvent, data: TestInfo): void;

  saveToStorage(): void;
  loadFromStorage(): void;
  cleanup(): void;
}

declare const backgroundTestManager: BackgroundTestManager;
export default backgroundTestManager;
