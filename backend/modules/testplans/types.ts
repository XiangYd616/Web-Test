/**
 * 测试计划类型定义
 * 一个测试计划可组合多种测试类型（API集合、性能、安全、SEO等），统一执行并生成综合报告
 */

export type TestType =
  | 'api'
  | 'performance'
  | 'security'
  | 'seo'
  | 'accessibility'
  | 'compatibility'
  | 'stress'
  | 'ux'
  | 'website';

/** 计划中的单个测试步骤 */
export type TestPlanStep = {
  id: string;
  /** 测试类型 */
  type: TestType;
  /** 步骤名称 */
  name: string;
  /** 目标 URL（可覆盖计划级 URL） */
  url?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 排序 */
  sortOrder: number;
  /** 引用的集合 ID（仅 type=api 时有效） */
  collectionId?: string;
  /** 引用的环境 ID（仅 type=api 时有效） */
  environmentId?: string;
  /** 该步骤的引擎配置（与 Dashboard 的 options 结构一致） */
  config: Record<string, unknown>;
};

/** 步骤失败策略 */
export type FailureStrategy = 'continue' | 'abort';

/** 测试计划记录 */
export type TestPlan = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  /** 默认目标 URL（各步骤可覆盖） */
  url: string;
  /** 计划包含的测试步骤 */
  steps: TestPlanStep[];
  /** 默认环境 ID */
  defaultEnvironmentId?: string | null;
  /** 标签 */
  tags: string[];
  /** 状态 */
  status: 'draft' | 'active' | 'archived';
  /** 步骤失败策略：continue=继续后续步骤，abort=立即中止 */
  failureStrategy: FailureStrategy;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** 计划执行记录 */
export type TestPlanExecution = {
  id: string;
  planId: string;
  planName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** 各步骤的测试 ID 映射 */
  stepResults: TestPlanStepResult[];
  /** 综合评分（0-100） */
  overallScore: number | null;
  /** 总耗时（ms） */
  duration: number | null;
  startedAt: string | null;
  completedAt: string | null;
  triggeredBy: 'manual' | 'schedule';
  createdAt: string;
};

/** 单步骤执行结果 */
export type TestPlanStepResult = {
  stepId: string;
  stepName: string;
  type: TestType;
  /** 关联的 test_executions.test_id */
  testId: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'timeout' | 'aborted';
  score: number | null;
  duration: number | null;
  summary: Record<string, unknown>;
};

/** 综合报告摘要 */
export type TestPlanReport = {
  executionId: string;
  planName: string;
  url: string;
  overallScore: number;
  dimensions: TestPlanDimensionScore[];
  duration: number;
  completedAt: string;
};

export type TestPlanDimensionScore = {
  type: TestType;
  name: string;
  score: number;
  status: 'passed' | 'warning' | 'failed';
  highlights: string[];
};

/** API 请求/响应 payload */
export type CreateTestPlanPayload = {
  name: string;
  description?: string;
  url: string;
  steps: Omit<TestPlanStep, 'id'>[];
  defaultEnvironmentId?: string | null;
  tags?: string[];
  workspaceId?: string;
  failureStrategy?: FailureStrategy;
};

export type UpdateTestPlanPayload = Partial<CreateTestPlanPayload> & {
  status?: 'draft' | 'active' | 'archived';
  failureStrategy?: FailureStrategy;
};

export type ExecuteTestPlanPayload = {
  environmentId?: string;
  workspaceId?: string;
};
