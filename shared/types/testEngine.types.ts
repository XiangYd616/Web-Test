/**
 * 测试引擎插件化架构 - 核心类型定义
 *
 * 用于统一管理所有测试引擎，解决功能重叠和耦合问题
 */

/**
 * 测试引擎类型枚举 - 优化后的分层架构
 */
export enum TestEngineType {
  // 核心功能引擎 (Core Engines)
  API = 'api',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  STRESS = 'stress',

  // 分析引擎 (Analysis Engines)
  SEO = 'seo',
  ACCESSIBILITY = 'accessibility',
  COMPATIBILITY = 'compatibility',
  UX = 'ux',

  // 复合引擎 (Composite Engines)
  WEBSITE = 'website',
  INFRASTRUCTURE = 'infrastructure',
}

/**
 * 测试引擎层次
 */
export enum TestEngineLayer {
  CORE = 'core', // 核心功能引擎
  ANALYSIS = 'analysis', // 分析引擎
  COMPOSITE = 'composite', // 复合引擎
}

/**
 * 测试优先级
 */
export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 测试状态
 */
export enum TestStatus {
  IDLE = 'idle',
  PREPARING = 'preparing',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 基础测试配置接口
 */
export interface BaseTestConfig {
  url?: string;
  timeout?: number;
  retries?: number;
  priority?: TestPriority;
  metadata?: Record<string, any>;
}

/**
 * 测试进度信息
 */
export interface TestProgress {
  status: TestStatus;
  progress: number;
  currentStep: string;
  startTime: Date;
  estimatedEndTime?: Date;
  messages: string[];
}

/**
 * 测试结果基础接口
 */
export interface BaseTestResult {
  testId: string;
  engineType: TestEngineType;
  status: TestStatus;
  score: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  summary: string;
  details: Record<string, any>;
  errors?: string[];
  warnings?: string[];
  recommendations?: string[];
}

/**
 * 测试引擎能力描述
 */
export interface TestEngineCapabilities {
  type: TestEngineType;
  name: string;
  description: string;
  version: string;
  supportedFeatures: string[];
  requiredConfig: string[];
  optionalConfig: string[];
  outputFormat: string[];
  maxConcurrent: number;
  estimatedDuration: {
    min: number;
    max: number;
    typical: number;
  };
}

/**
 * 测试引擎验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * 测试引擎生命周期钩子
 */
export interface TestEngineLifecycle {
  beforeInit?: () => Promise<void>;
  afterInit?: () => Promise<void>;
  beforeRun?: (config: BaseTestConfig) => Promise<void>;
  afterRun?: (result: BaseTestResult) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
  onCancel?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

/**
 * 统一测试引擎接口
 * 所有测试引擎必须实现此接口
 */
export interface ITestEngine<
  TConfig extends BaseTestConfig = BaseTestConfig,
  TResult extends BaseTestResult = BaseTestResult,
> {
  // 基础属性
  readonly type: TestEngineType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: TestEngineCapabilities;

  // 生命周期钩子
  lifecycle?: TestEngineLifecycle;

  // 核心方法
  initialize(): Promise<void>;
  validate(config: TConfig): ValidationResult;
  run(config: TConfig, onProgress?: (progress: TestProgress) => void): Promise<TResult>;
  cancel(testId: string): Promise<void>;
  getStatus(testId: string): TestProgress;

  // 辅助方法
  estimateDuration(config: TConfig): number;
  getDependencies(): TestEngineType[];
  isAvailable(): Promise<boolean>;
  getMetrics(): Record<string, any>;
}

/**
 * 测试引擎注册信息
 */
export interface TestEngineRegistration {
  engine: ITestEngine;
  priority: number;
  enabled: boolean;
  dependencies?: TestEngineType[];
  metadata?: Record<string, any>;
}

/**
 * 测试执行选项
 */
export interface TestExecutionOptions {
  parallel?: boolean;
  maxConcurrent?: number;
  continueOnError?: boolean;
  timeout?: number;
  retries?: number;
  progressCallback?: (engine: TestEngineType, progress: TestProgress) => void;
  completionCallback?: (engine: TestEngineType, result: BaseTestResult) => void;
  errorCallback?: (engine: TestEngineType, error: Error) => void;
}

/**
 * 组合测试配置
 * 用于WebsiteTest和Test等聚合测试
 */
export interface CompositeTestConfig extends BaseTestConfig {
  engines: TestEngineType[];
  engineConfigs?: Partial<Record<TestEngineType, BaseTestConfig>>;
  executionOptions?: TestExecutionOptions;
}

/**
 * 组合测试结果
 */
export interface CompositeTestResult extends BaseTestResult {
  engineResults: Map<TestEngineType, BaseTestResult>;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  overallScore: number;
  criticalIssues: Array<{
    engine: TestEngineType;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

/**
 * 引擎测试历史记录
 * (注意: 为避免与 testHistory.types 中的 TestHistoryRecord 冲突，改名为 EngineHistoryRecord)
 */
export interface EngineHistoryRecord {
  id: string;
  timestamp: Date;
  engineType: TestEngineType;
  config: BaseTestConfig;
  result: BaseTestResult;
  userId?: string;
  tags?: string[];
  notes?: string;
}

/**
 * 测试比较结果（用于回归测试）
 */
export interface TestComparisonResult {
  baselineId: string;
  currentId: string;
  engineType: TestEngineType;
  timestamp: Date;
  changes: {
    improved: Record<string, any>;
    degraded: Record<string, any>;
    unchanged: Record<string, any>;
  };
  scoreDelta: number;
  regressionDetected: boolean;
  analysis: string;
}
