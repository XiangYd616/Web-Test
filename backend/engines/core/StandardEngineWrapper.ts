import {
  BaseTestConfig,
  BaseTestResult,
  ITestEngine,
  TestEngineCapabilities,
  TestEngineType,
  TestProgress,
  TestStatus,
  ValidationResult,
} from '../../../shared/types/testEngine.types';

type RawEngine = {
  name?: string;
  version?: string;
  description?: string;
  checkAvailability?: () => { available: boolean };
  executeTest: (config: Record<string, unknown>) => Promise<Record<string, unknown>>;
  setProgressCallback?: (callback: (progress: Record<string, unknown>) => void) => void;
  stopTest?: (testId: string) => Promise<boolean> | boolean;
  getTestStatus?: (testId: string) => unknown;
};

class StandardEngineWrapper implements ITestEngine<BaseTestConfig, BaseTestResult> {
  readonly type: TestEngineType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: TestEngineCapabilities;

  private engine: RawEngine;

  constructor(type: TestEngineType, engine: RawEngine) {
    this.type = type;
    this.engine = engine;
    this.name = engine.name || type;
    this.version = engine.version || '1.0.0';
    this.capabilities = {
      type,
      name: this.name,
      description: engine.description || `${this.name} engine`,
      version: this.version,
      supportedFeatures: [],
      requiredConfig: [],
      optionalConfig: [],
      outputFormat: [],
      maxConcurrent: 1,
      estimatedDuration: {
        min: 0,
        max: 0,
        typical: 0,
      },
    };
  }

  async initialize(): Promise<void> {
    return;
  }

  validate(config: BaseTestConfig): ValidationResult {
    if (this.type !== TestEngineType.STRESS && !config.url) {
      return {
        isValid: false,
        errors: ['测试URL不能为空'],
        warnings: [],
        suggestions: [],
      };
    }
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };
  }

  async run(
    config: BaseTestConfig,
    onProgress?: (progress: TestProgress) => void
  ): Promise<BaseTestResult> {
    const startTime = new Date();
    const metadata = (config.metadata || {}) as Record<string, unknown>;
    const testId =
      typeof metadata.testId === 'string' ? metadata.testId : `${this.type}_${Date.now()}`;

    if (this.engine.setProgressCallback) {
      this.engine.setProgressCallback(progress => {
        if (!onProgress) return;
        const progressValue = Number((progress as { progress?: number }).progress ?? 0);
        onProgress({
          status: TestStatus.RUNNING,
          progress: progressValue,
          currentStep:
            (progress as { message?: string }).message ||
            (progress as { stage?: string }).stage ||
            'running',
          startTime,
          messages: [String((progress as { message?: string }).message || '')],
        });
      });
    }

    const payload = {
      ...config,
      testId,
    } as Record<string, unknown>;

    const rawResult = await this.engine.executeTest(payload);
    const endTime = new Date();
    const success = Boolean((rawResult as { success?: boolean }).success);
    const details = (rawResult as { results?: Record<string, unknown> }).results || rawResult;
    const normalizedStatus = this.normalizeStatus(
      (rawResult as { status?: unknown }).status ?? (details as { status?: unknown }).status,
      success ? TestStatus.COMPLETED : TestStatus.FAILED
    );
    const detailErrors = (details as { errors?: unknown }).errors;
    const detailWarnings = (details as { warnings?: unknown }).warnings;
    const errors = Array.isArray(detailErrors)
      ? detailErrors.map(item => String(item))
      : normalizedStatus === TestStatus.FAILED
        ? [String((rawResult as { error?: string }).error || '测试失败')]
        : [];
    const warnings = Array.isArray(detailWarnings) ? detailWarnings.map(item => String(item)) : [];

    return {
      testId,
      engineType: this.type,
      status: normalizedStatus,
      score: this.extractScore(details as Record<string, unknown>),
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      summary: success ? '测试完成' : '测试失败',
      details: (details || {}) as Record<string, unknown>,
      errors,
      warnings,
      recommendations: [],
    };
  }

  async cancel(testId: string): Promise<void> {
    if (this.engine.stopTest) {
      await this.engine.stopTest(testId);
    }
  }

  getStatus(testId: string): TestProgress {
    const status = this.engine.getTestStatus ? this.engine.getTestStatus(testId) : null;
    const statusValue =
      typeof status === 'string' ? status : (status as { status?: string })?.status;
    const progressValue = Number((status as { progress?: number })?.progress ?? 0);
    return {
      status: this.normalizeStatus(statusValue, TestStatus.RUNNING),
      progress: progressValue,
      currentStep: 'running',
      startTime: new Date(),
      messages: [],
    };
  }

  estimateDuration(): number {
    return 0;
  }

  getDependencies(): TestEngineType[] {
    return [];
  }

  async isAvailable(): Promise<boolean> {
    if (this.engine.checkAvailability) {
      return Boolean(this.engine.checkAvailability().available);
    }
    return true;
  }

  getMetrics(): Record<string, unknown> {
    return {};
  }

  private extractScore(details: Record<string, unknown>): number {
    const summary = details.summary as Record<string, unknown> | undefined;
    const score =
      (summary?.overallScore as number) ??
      (summary?.score as number) ??
      (details.overallScore as number) ??
      (details.score as number);
    return typeof score === 'number' && Number.isFinite(score) ? Math.round(score) : 0;
  }

  private normalizeStatus(value: unknown, fallback: TestStatus): TestStatus {
    if (!value) return fallback;
    const raw = typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase();
    if (raw === 'completed' || raw === 'success' || raw === 'passed') return TestStatus.COMPLETED;
    if (raw === 'failed' || raw === 'error' || raw === 'timeout') return TestStatus.FAILED;
    if (raw === 'cancelled' || raw === 'canceled' || raw === 'stopped') return TestStatus.CANCELLED;
    if (raw === 'running') return TestStatus.RUNNING;
    if (raw === 'pending' || raw === 'queued' || raw === 'preparing') return TestStatus.PREPARING;
    if (raw === 'idle') return TestStatus.IDLE;
    return fallback;
  }
}

export default StandardEngineWrapper;

module.exports = StandardEngineWrapper;
