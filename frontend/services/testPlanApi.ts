/**
 * 测试计划 API 服务层
 * 支持云端模式（apiClient）和桌面模式（localDb）
 */

import type { StandardResponse } from '../types/api.types';
import { DEFAULT_WORKSPACE_ID, generateLocalId, localQuery } from '../utils/localDb';
import { apiClient, unwrapResponse } from './apiClient';
import { routeByMode } from './serviceAdapter';

const unwrap = <T>(payload: StandardResponse<T>) => unwrapResponse(payload);

// ─── 类型定义 ───

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

export type TestPlanStep = {
  id: string;
  type: TestType;
  name: string;
  url?: string;
  enabled: boolean;
  sortOrder: number;
  collectionId?: string;
  environmentId?: string;
  config: Record<string, unknown>;
};

export type FailureStrategy = 'continue' | 'abort';

export type TestPlanItem = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  url: string;
  steps: TestPlanStep[];
  defaultEnvironmentId?: string | null;
  tags: string[];
  status: 'draft' | 'active' | 'archived';
  failureStrategy: FailureStrategy;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TestPlanStepResult = {
  stepId: string;
  stepName: string;
  type: TestType;
  testId: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'timeout' | 'aborted';
  score: number | null;
  duration: number | null;
  summary: Record<string, unknown>;
};

export type TestPlanExecution = {
  id: string;
  planId: string;
  planName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  stepResults: TestPlanStepResult[];
  overallScore: number | null;
  duration: number | null;
  startedAt: string | null;
  completedAt: string | null;
  triggeredBy: 'manual' | 'schedule';
  createdAt: string;
};

export type TestPlanDimensionScore = {
  type: TestType;
  name: string;
  score: number;
  status: 'passed' | 'warning' | 'failed';
  highlights: string[];
};

export type TestPlanReport = {
  executionId: string;
  planName: string;
  url: string;
  overallScore: number;
  dimensions: TestPlanDimensionScore[];
  duration: number;
  completedAt: string;
};

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

// ─── 辅助 ───

const parseJson = <T>(raw: unknown, fallback: T): T => {
  if (!raw) return fallback;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  if (typeof raw === 'object') return raw as T;
  return fallback;
};

const rowToPlan = (r: Record<string, unknown>): TestPlanItem => ({
  id: String(r.id),
  workspaceId: String(r.workspace_id || ''),
  name: String(r.name || ''),
  description: String(r.description || ''),
  url: String(r.url || ''),
  steps: parseJson<TestPlanStep[]>(r.steps, []),
  defaultEnvironmentId: r.default_environment_id ? String(r.default_environment_id) : null,
  tags: parseJson<string[]>(r.tags, []),
  status: String(r.status || 'active') as TestPlanItem['status'],
  failureStrategy: String(r.failure_strategy || r.failureStrategy || 'continue') as FailureStrategy,
  createdBy: String(r.created_by || r.createdBy || ''),
  createdAt: String(r.created_at || r.createdAt || ''),
  updatedAt: String(r.updated_at || r.updatedAt || ''),
});

const rowToExecution = (r: Record<string, unknown>): TestPlanExecution => ({
  id: String(r.id),
  planId: String(r.plan_id || r.planId || ''),
  planName: String(r.plan_name || r.planName || ''),
  status: String(r.status || 'pending') as TestPlanExecution['status'],
  stepResults: parseJson<TestPlanStepResult[]>(r.step_results || r.stepResults, []),
  overallScore:
    r.overall_score != null || r.overallScore != null
      ? Number(r.overall_score ?? r.overallScore)
      : null,
  duration: r.duration != null ? Number(r.duration) : null,
  startedAt: r.started_at || r.startedAt ? String(r.started_at || r.startedAt) : null,
  completedAt: r.completed_at || r.completedAt ? String(r.completed_at || r.completedAt) : null,
  triggeredBy: String(
    r.triggered_by || r.triggeredBy || 'manual'
  ) as TestPlanExecution['triggeredBy'],
  createdAt: String(r.created_at || r.createdAt || ''),
});

// ─── CRUD ───

export const listTestPlans = routeByMode(
  async (params?: {
    workspaceId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<TestPlanItem[]> => {
    const wsId = params?.workspaceId || DEFAULT_WORKSPACE_ID;
    const { rows } = await localQuery(
      'SELECT * FROM test_plans WHERE workspace_id = ? ORDER BY updated_at DESC',
      [wsId]
    );
    return rows.map(r => rowToPlan(r as Record<string, unknown>));
  },
  async (params?: {
    workspaceId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<TestPlanItem[]> => {
    const { data } = await apiClient.get<StandardResponse<{ plans: Record<string, unknown>[] }>>(
      '/test-plans',
      { params }
    );
    const result = unwrap(data);
    return (result.plans || []).map(rowToPlan);
  }
);

export const getTestPlan = routeByMode(
  async (planId: string): Promise<TestPlanItem> => {
    const { rows } = await localQuery('SELECT * FROM test_plans WHERE id = ?', [planId]);
    if (!rows.length) throw new Error('测试计划不存在');
    return rowToPlan(rows[0] as Record<string, unknown>);
  },
  async (planId: string): Promise<TestPlanItem> => {
    const { data } = await apiClient.get<StandardResponse<Record<string, unknown>>>(
      `/test-plans/${planId}`
    );
    return rowToPlan(unwrap(data));
  }
);

export const createTestPlan = routeByMode(
  async (payload: CreateTestPlanPayload): Promise<TestPlanItem> => {
    const id = generateLocalId();
    const now = new Date().toISOString();
    const steps = (payload.steps || []).map((s, i) => ({
      ...s,
      id: generateLocalId(),
      enabled: s.enabled !== false,
      sortOrder: s.sortOrder ?? i,
    }));
    await localQuery(
      `INSERT INTO test_plans (id, workspace_id, name, description, url, steps, default_environment_id, tags, status, failure_strategy, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 'local-user', ?, ?)`,
      [
        id,
        payload.workspaceId || DEFAULT_WORKSPACE_ID,
        payload.name,
        payload.description || '',
        payload.url || '',
        JSON.stringify(steps),
        payload.defaultEnvironmentId || null,
        JSON.stringify(payload.tags || []),
        payload.failureStrategy || 'continue',
        now,
        now,
      ]
    );
    return getTestPlan(id);
  },
  async (payload: CreateTestPlanPayload): Promise<TestPlanItem> => {
    const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
      '/test-plans',
      payload
    );
    return rowToPlan(unwrap(data));
  }
);

export const updateTestPlan = routeByMode(
  async (planId: string, payload: UpdateTestPlanPayload): Promise<TestPlanItem> => {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (payload.name !== undefined) {
      sets.push('name = ?');
      values.push(payload.name);
    }
    if (payload.description !== undefined) {
      sets.push('description = ?');
      values.push(payload.description);
    }
    if (payload.url !== undefined) {
      sets.push('url = ?');
      values.push(payload.url);
    }
    if (payload.steps !== undefined) {
      const steps = payload.steps.map((s, i) => ({
        ...s,
        id: (s as TestPlanStep).id || generateLocalId(),
        enabled: s.enabled !== false,
        sortOrder: s.sortOrder ?? i,
      }));
      sets.push('steps = ?');
      values.push(JSON.stringify(steps));
    }
    if (payload.defaultEnvironmentId !== undefined) {
      sets.push('default_environment_id = ?');
      values.push(payload.defaultEnvironmentId || null);
    }
    if (payload.tags !== undefined) {
      sets.push('tags = ?');
      values.push(JSON.stringify(payload.tags));
    }
    if (payload.status !== undefined) {
      sets.push('status = ?');
      values.push(payload.status);
    }
    if (payload.failureStrategy !== undefined) {
      sets.push('failure_strategy = ?');
      values.push(payload.failureStrategy);
    }
    sets.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(planId);
    await localQuery(`UPDATE test_plans SET ${sets.join(', ')} WHERE id = ?`, values);
    return getTestPlan(planId);
  },
  async (planId: string, payload: UpdateTestPlanPayload): Promise<TestPlanItem> => {
    const { data } = await apiClient.put<StandardResponse<Record<string, unknown>>>(
      `/test-plans/${planId}`,
      payload
    );
    return rowToPlan(unwrap(data));
  }
);

export const cancelTestPlanExecution = routeByMode(
  async (executionId: string): Promise<boolean> => {
    await localQuery(
      `UPDATE test_plan_executions SET status = 'cancelled', completed_at = ? WHERE id = ? AND status IN ('pending', 'running')`,
      [new Date().toISOString(), executionId]
    );
    return true;
  },
  async (executionId: string): Promise<boolean> => {
    const { data } = await apiClient.post<StandardResponse<{ cancelled: boolean }>>(
      `/test-plans/executions/${executionId}/cancel`
    );
    return unwrap(data).cancelled;
  }
);

export const deleteTestPlan = routeByMode(
  async (planId: string): Promise<void> => {
    await localQuery('DELETE FROM test_plan_executions WHERE plan_id = ?', [planId]);
    await localQuery('DELETE FROM test_plans WHERE id = ?', [planId]);
  },
  async (planId: string): Promise<void> => {
    await apiClient.delete(`/test-plans/${planId}`);
  }
);

// ─── 执行 ───

export const executeTestPlan = routeByMode(
  async (
    planId: string,
    _payload?: { environmentId?: string; workspaceId?: string }
  ): Promise<TestPlanExecution> => {
    const plan = await getTestPlan(planId);
    const id = generateLocalId();
    const now = new Date().toISOString();
    const enabledSteps = plan.steps.filter(s => s.enabled);
    const stepResults: TestPlanStepResult[] = enabledSteps.map(s => ({
      stepId: s.id,
      stepName: s.name,
      type: s.type,
      testId: null,
      status: 'pending' as const,
      score: null,
      duration: null,
      summary: {},
    }));
    await localQuery(
      `INSERT INTO test_plan_executions (id, plan_id, plan_name, status, step_results, triggered_by, created_at)
       VALUES (?, ?, ?, 'pending', ?, 'manual', ?)`,
      [id, planId, plan.name, JSON.stringify(stepResults), now]
    );
    return getTestPlanExecution(id);
  },
  async (
    planId: string,
    payload?: { environmentId?: string; workspaceId?: string }
  ): Promise<TestPlanExecution> => {
    const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
      `/test-plans/${planId}/execute`,
      payload || {}
    );
    return rowToExecution(unwrap(data));
  }
);

export const getTestPlanExecution = routeByMode(
  async (executionId: string): Promise<TestPlanExecution> => {
    const { rows } = await localQuery('SELECT * FROM test_plan_executions WHERE id = ?', [
      executionId,
    ]);
    if (!rows.length) throw new Error('执行记录不存在');
    return rowToExecution(rows[0] as Record<string, unknown>);
  },
  async (executionId: string): Promise<TestPlanExecution> => {
    const { data } = await apiClient.get<StandardResponse<Record<string, unknown>>>(
      `/test-plans/executions/${executionId}`
    );
    return rowToExecution(unwrap(data));
  }
);

export const listTestPlanExecutions = routeByMode(
  async (params?: { planId?: string; limit?: number }): Promise<TestPlanExecution[]> => {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (params?.planId) {
      conditions.push('plan_id = ?');
      values.push(params.planId);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params?.limit || 20;
    values.push(limit);
    const { rows } = await localQuery(
      `SELECT * FROM test_plan_executions ${where} ORDER BY created_at DESC LIMIT ?`,
      values
    );
    return rows.map(r => rowToExecution(r as Record<string, unknown>));
  },
  async (params?: { planId?: string; limit?: number }): Promise<TestPlanExecution[]> => {
    const { data } = await apiClient.get<StandardResponse<Record<string, unknown>[]>>(
      '/test-plans/executions/list',
      { params }
    );
    const list = unwrap(data);
    return (Array.isArray(list) ? list : []).map(r => rowToExecution(r as Record<string, unknown>));
  }
);

// ─── 报告 ───

export const getTestPlanReport = routeByMode(
  async (executionId: string): Promise<TestPlanReport | null> => {
    const execution = await getTestPlanExecution(executionId);
    if (execution.status !== 'completed') return null;
    const plan = await getTestPlan(execution.planId);
    const LABELS: Record<string, string> = {
      api: 'API 测试',
      performance: '性能测试',
      security: '安全扫描',
      seo: 'SEO 检查',
      accessibility: '无障碍检测',
      compatibility: '兼容性测试',
      stress: '压力测试',
      ux: '用户体验',
      website: '综合网站测试',
    };
    const dimensions: TestPlanDimensionScore[] = execution.stepResults
      .filter(sr => sr.status === 'completed' && sr.score != null)
      .map(sr => ({
        type: sr.type,
        name: LABELS[sr.type] || sr.type,
        score: sr.score ?? 0,
        status: ((sr.score ?? 0) >= 80
          ? 'passed'
          : (sr.score ?? 0) >= 50
            ? 'warning'
            : 'failed') as 'passed' | 'warning' | 'failed',
        highlights: [],
      }));
    const scores = dimensions.map(d => d.score);
    return {
      executionId,
      planName: plan.name,
      url: plan.url,
      overallScore:
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      dimensions,
      duration: execution.duration || 0,
      completedAt: execution.completedAt || '',
    };
  },
  async (executionId: string): Promise<TestPlanReport | null> => {
    try {
      const { data } = await apiClient.get<StandardResponse<TestPlanReport>>(
        `/test-plans/executions/${executionId}/report`
      );
      return unwrap(data);
    } catch {
      return null;
    }
  }
);

// ─── 常量 ───

export const TEST_TYPE_OPTIONS: { value: TestType; label: string; description: string }[] = [
  { value: 'api', label: 'API 测试', description: '运行 API 集合中的请求并验证响应' },
  { value: 'performance', label: '性能测试', description: '测量 Web Vitals、加载时间等性能指标' },
  { value: 'security', label: '安全扫描', description: '检测 XSS、CSRF、安全头等安全问题' },
  { value: 'seo', label: 'SEO 检查', description: '分析页面 SEO 元素、结构化数据等' },
  { value: 'accessibility', label: '无障碍检测', description: '检查 WCAG 合规性、键盘导航等' },
  { value: 'compatibility', label: '兼容性测试', description: '跨浏览器和设备兼容性检测' },
  { value: 'stress', label: '压力测试', description: '并发请求压力测试' },
  { value: 'ux', label: '用户体验', description: '页面交互、滚动、视觉稳定性检测' },
  { value: 'website', label: '综合网站测试', description: '全方位网站质量评估' },
];
