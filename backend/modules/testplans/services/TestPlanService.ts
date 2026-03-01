/**
 * 测试计划服务层
 * 负责 CRUD、执行调度、报告聚合
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import { puppeteerPool } from '../../engines/shared/services/PuppeteerPool.js';
import testBusinessService from '../../testing/services/TestBusinessService';
import type {
  CreateTestPlanPayload,
  ExecuteTestPlanPayload,
  FailureStrategy,
  TestPlan,
  TestPlanExecution,
  TestPlanReport,
  TestPlanStep,
  TestPlanStepResult,
  TestType,
  UpdateTestPlanPayload,
} from '../types';

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

const toTestPlan = (row: Record<string, unknown>): TestPlan => ({
  id: String(row.id),
  workspaceId: String(row.workspace_id || ''),
  name: String(row.name || ''),
  description: String(row.description || ''),
  url: String(row.url || ''),
  steps: parseJson<TestPlanStep[]>(row.steps, []),
  defaultEnvironmentId: row.default_environment_id ? String(row.default_environment_id) : null,
  tags: parseJson<string[]>(row.tags, []),
  status: String(row.status || 'draft') as TestPlan['status'],
  failureStrategy: String(row.failure_strategy || 'continue') as FailureStrategy,
  createdBy: String(row.created_by || ''),
  createdAt: String(row.created_at || ''),
  updatedAt: String(row.updated_at || ''),
});

const toExecution = (row: Record<string, unknown>): TestPlanExecution => ({
  id: String(row.id),
  planId: String(row.plan_id || ''),
  planName: String(row.plan_name || ''),
  status: String(row.status || 'pending') as TestPlanExecution['status'],
  stepResults: parseJson<TestPlanStepResult[]>(row.step_results, []),
  overallScore: row.overall_score != null ? Number(row.overall_score) : null,
  duration: row.duration != null ? Number(row.duration) : null,
  startedAt: row.started_at ? String(row.started_at) : null,
  completedAt: row.completed_at ? String(row.completed_at) : null,
  triggeredBy: String(row.triggered_by || 'manual') as TestPlanExecution['triggeredBy'],
  createdAt: String(row.created_at || ''),
});

const DIMENSION_LABELS: Record<TestType, string> = {
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

// P0: 并发控制 — 最多同时执行 3 个计划
const MAX_CONCURRENT_EXECUTIONS = 3;
let runningExecutions = 0;

// P2: 取消支持 — 跟踪正在执行的 executionId
const cancelledExecutions = new Set<string>();

class TestPlanService {
  // ─── CRUD ───

  async list(params: {
    workspaceId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ plans: TestPlan[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.workspaceId) {
      conditions.push(`workspace_id = $${idx++}`);
      values.push(params.workspaceId);
    }
    if (params.status) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit || 50;
    const offset = ((params.page || 1) - 1) * limit;

    const countResult = await query(`SELECT COUNT(*) as total FROM test_plans ${where}`, values);
    const total = Number((countResult.rows[0] as Record<string, unknown>)?.total || 0);

    const dataResult = await query(
      `SELECT * FROM test_plans ${where} ORDER BY updated_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return {
      plans: (dataResult.rows as Record<string, unknown>[]).map(toTestPlan),
      total,
    };
  }

  async getById(id: string): Promise<TestPlan | null> {
    const result = await query('SELECT * FROM test_plans WHERE id = $1', [id]);
    if (!result.rows.length) return null;
    return toTestPlan(result.rows[0] as Record<string, unknown>);
  }

  async create(payload: CreateTestPlanPayload, userId: string): Promise<TestPlan> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const steps: TestPlanStep[] = (payload.steps || []).map((s, i) => ({
      ...s,
      id: uuidv4(),
      enabled: s.enabled !== false,
      sortOrder: s.sortOrder ?? i,
    }));

    await query(
      `INSERT INTO test_plans (id, workspace_id, name, description, url, steps, default_environment_id, tags, status, failure_strategy, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        payload.workspaceId || '',
        payload.name,
        payload.description || '',
        payload.url || '',
        JSON.stringify(steps),
        payload.defaultEnvironmentId || null,
        JSON.stringify(payload.tags || []),
        'active',
        payload.failureStrategy || 'continue',
        userId,
        now,
        now,
      ]
    );

    const created = await this.getById(id);
    if (!created) throw new Error('创建测试计划失败');
    return created;
  }

  async update(id: string, payload: UpdateTestPlanPayload): Promise<TestPlan | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (payload.name !== undefined) {
      sets.push(`name = $${idx++}`);
      values.push(payload.name);
    }
    if (payload.description !== undefined) {
      sets.push(`description = $${idx++}`);
      values.push(payload.description);
    }
    if (payload.url !== undefined) {
      sets.push(`url = $${idx++}`);
      values.push(payload.url);
    }
    if (payload.steps !== undefined) {
      const steps: TestPlanStep[] = payload.steps.map((s, i) => ({
        ...s,
        id: (s as TestPlanStep).id || uuidv4(),
        enabled: s.enabled !== false,
        sortOrder: s.sortOrder ?? i,
      }));
      sets.push(`steps = $${idx++}`);
      values.push(JSON.stringify(steps));
    }
    if (payload.defaultEnvironmentId !== undefined) {
      sets.push(`default_environment_id = $${idx++}`);
      values.push(payload.defaultEnvironmentId || null);
    }
    if (payload.tags !== undefined) {
      sets.push(`tags = $${idx++}`);
      values.push(JSON.stringify(payload.tags));
    }
    if (payload.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(payload.status);
    }
    if (payload.failureStrategy !== undefined) {
      sets.push(`failure_strategy = $${idx++}`);
      values.push(payload.failureStrategy);
    }

    if (sets.length === 0) return existing;

    sets.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await query(`UPDATE test_plans SET ${sets.join(', ')} WHERE id = $${idx}`, values);
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM test_plans WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // ─── 执行 ───

  async execute(
    planId: string,
    payload: ExecuteTestPlanPayload,
    userId: string
  ): Promise<TestPlanExecution> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('测试计划不存在');

    // P0: 并发控制
    if (runningExecutions >= MAX_CONCURRENT_EXECUTIONS) {
      throw new Error(
        `已达到最大并发执行数 (${MAX_CONCURRENT_EXECUTIONS})，请等待当前任务完成后重试`
      );
    }

    const enabledSteps = plan.steps
      .filter(s => s.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (enabledSteps.length === 0) throw new Error('计划中没有启用的测试步骤');

    const executionId = uuidv4();
    const now = new Date().toISOString();

    const stepResults: TestPlanStepResult[] = enabledSteps.map(step => ({
      stepId: step.id,
      stepName: step.name,
      type: step.type,
      testId: null as string | null,
      status: 'pending',
      score: null as number | null,
      duration: null as number | null,
      summary: {},
    }));

    await query(
      `INSERT INTO test_plan_executions (id, plan_id, plan_name, status, step_results, overall_score, duration, started_at, completed_at, triggered_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        executionId,
        planId,
        plan.name,
        'pending',
        JSON.stringify(stepResults),
        null,
        null,
        null,
        null,
        'manual',
        now,
      ]
    );

    // 异步启动执行（不阻塞响应）
    void this.runExecution(executionId, plan, enabledSteps, payload, userId);

    const created = await this.getExecution(executionId);
    if (!created) throw new Error('创建执行记录失败');
    return created;
  }

  // P2: 取消执行
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = await this.getExecution(executionId);
    if (!execution) return false;
    if (execution.status !== 'running' && execution.status !== 'pending') return false;

    cancelledExecutions.add(executionId);

    // 尝试取消各步骤关联的测试任务
    for (const sr of execution.stepResults) {
      if (sr.testId && (sr.status === 'pending' || sr.status === 'running')) {
        await query(
          `UPDATE test_executions SET status = 'cancelled', updated_at = $1 WHERE test_id = $2 AND status IN ('pending', 'running')`,
          [new Date().toISOString(), sr.testId]
        ).catch(() => {
          /* best effort */
        });
      }
    }

    await query(
      `UPDATE test_plan_executions SET status = 'cancelled', completed_at = $1 WHERE id = $2`,
      [new Date().toISOString(), executionId]
    );

    return true;
  }

  async getExecution(executionId: string): Promise<TestPlanExecution | null> {
    const result = await query('SELECT * FROM test_plan_executions WHERE id = $1', [executionId]);
    if (!result.rows.length) return null;
    return toExecution(result.rows[0] as Record<string, unknown>);
  }

  async listExecutions(params: { planId?: string; limit?: number }): Promise<TestPlanExecution[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.planId) {
      conditions.push(`plan_id = $${idx++}`);
      values.push(params.planId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit || 20;

    const result = await query(
      `SELECT * FROM test_plan_executions ${where} ORDER BY created_at DESC LIMIT $${idx}`,
      [...values, limit]
    );

    return (result.rows as Record<string, unknown>[]).map(toExecution);
  }

  // ─── 报告聚合 ───

  async getReport(executionId: string): Promise<TestPlanReport | null> {
    const execution = await this.getExecution(executionId);
    if (!execution || execution.status !== 'completed') return null;

    const plan = await this.getById(execution.planId);
    if (!plan) return null;

    const dimensions = execution.stepResults
      .filter(sr => sr.status === 'completed' && sr.score != null)
      .map(sr => ({
        type: sr.type,
        name: DIMENSION_LABELS[sr.type] || sr.type,
        score: sr.score ?? 0,
        status: ((sr.score ?? 0) >= 80
          ? 'passed'
          : (sr.score ?? 0) >= 50
            ? 'warning'
            : 'failed') as 'passed' | 'warning' | 'failed',
        highlights: this.extractHighlights(sr),
      }));

    const scores = dimensions.map(d => d.score);
    const overallScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      executionId,
      planName: plan.name,
      url: plan.url,
      overallScore,
      dimensions,
      duration: execution.duration || 0,
      completedAt: execution.completedAt || '',
    };
  }

  // ─── 内部方法 ───

  private extractHighlights(sr: TestPlanStepResult): string[] {
    const highlights: string[] = [];
    const summary = sr.summary || {};

    if (sr.type === 'api') {
      const total = Number(summary.totalRequests || 0);
      const passed = Number(summary.passedRequests || 0);
      if (total > 0) highlights.push(`${passed}/${total} 请求通过`);
    } else if (sr.type === 'performance') {
      if (summary.lcp) highlights.push(`LCP: ${summary.lcp}ms`);
      if (summary.fcp) highlights.push(`FCP: ${summary.fcp}ms`);
    } else if (sr.type === 'security') {
      const vulns = Number(summary.vulnerabilities || 0);
      highlights.push(vulns > 0 ? `发现 ${vulns} 个安全问题` : '未发现安全问题');
    } else if (sr.type === 'seo') {
      if (summary.score != null) highlights.push(`SEO 评分: ${summary.score}`);
    } else if (sr.type === 'accessibility') {
      const violations = Number(summary.violations || 0);
      highlights.push(violations > 0 ? `${violations} 个无障碍问题` : '无障碍检测通过');
    }
    if (sr.status === 'timeout') highlights.push('执行超时');
    if (sr.status === 'aborted') highlights.push('已中止');

    return highlights;
  }

  private async runExecution(
    executionId: string,
    plan: TestPlan,
    steps: TestPlanStep[],
    payload: ExecuteTestPlanPayload,
    _userId: string
  ): Promise<void> {
    const startTime = Date.now();
    runningExecutions++;

    try {
      await query(
        `UPDATE test_plan_executions SET status = 'running', started_at = $1 WHERE id = $2`,
        [new Date().toISOString(), executionId]
      );

      // 冷启动预热：如果计划包含 Puppeteer 依赖的测试类型，提前确保浏览器池就绪
      const puppeteerTypes = new Set([
        'performance',
        'seo',
        'compatibility',
        'accessibility',
        'ux',
        'security',
      ]);
      const needsPuppeteer = steps.some(s => puppeteerTypes.has(s.type));
      if (needsPuppeteer) {
        try {
          const available = await puppeteerPool.isAvailable();
          if (!available) {
            await puppeteerPool.preload();
          }
        } catch {
          // 预热失败不阻塞执行，各引擎有自己的降级逻辑
        }
      }

      const stepResults: TestPlanStepResult[] = [];
      let aborted = false;
      // 链式执行上下文 — 前一步结果传递给下一步
      const chainContext: Record<string, unknown>[] = [];

      for (const step of steps) {
        // P2: 检查取消
        if (cancelledExecutions.has(executionId)) {
          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            type: step.type,
            testId: null,
            status: 'aborted',
            score: null,
            duration: null,
            summary: { reason: '用户取消' },
          });
          continue;
        }

        // P0: abort 策略检查
        if (aborted) {
          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            type: step.type,
            testId: null,
            status: 'aborted',
            score: null,
            duration: null,
            summary: { reason: '前置步骤失败，计划已中止' },
          });
          continue;
        }

        const stepStart = Date.now();
        const stepUrl = step.url || plan.url;

        try {
          // P0: API 集合关联 — 传递环境变量、认证信息
          const testConfig = await this.buildTestConfig(step, stepUrl, payload, plan, chainContext);

          // 通过 TestBusinessService 正常流程创建并启动测试
          // 这会：1) 创建 test_executions 记录 2) 验证配置 3) 调度引擎执行
          const result = await testBusinessService.createAndStartTest(
            {
              testId: uuidv4(),
              url: stepUrl,
              testType: step.type,
              options: testConfig.options as Record<string, unknown> | undefined,
              history: {
                saveToHistory: true,
                title: `[测试计划] ${plan.name} - ${step.name}`,
              },
            },
            {
              userId: _userId,
              role: 'user',
            }
          );

          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            type: step.type,
            testId: result.testId,
            status: 'pending',
            score: null,
            duration: null,
            summary: {},
          });

          await query(`UPDATE test_plan_executions SET step_results = $1 WHERE id = $2`, [
            JSON.stringify(stepResults),
            executionId,
          ]);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[TestPlanService] Step "${step.name}" (${step.type}) failed:`, errMsg);
          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            type: step.type,
            testId: null,
            status: 'failed',
            score: 0,
            duration: Date.now() - stepStart,
            summary: { error: errMsg },
          });
          // 更新 step_results 以便前端能看到失败详情
          await query(`UPDATE test_plan_executions SET step_results = $1 WHERE id = $2`, [
            JSON.stringify(stepResults),
            executionId,
          ]).catch(() => {
            /* best effort */
          });
          // P0: 失败策略
          if (plan.failureStrategy === 'abort') aborted = true;
        }
      }

      // 等待所有步骤完成（轮询，每步 3 分钟，最少 5 分钟）
      const perStepTimeout = 3 * 60 * 1000;
      const maxWait = Math.max(5 * 60 * 1000, stepResults.length * perStepTimeout);
      const pollInterval = 3000;
      const deadline = Date.now() + maxWait;

      while (Date.now() < deadline) {
        // P2: 检查取消
        if (cancelledExecutions.has(executionId)) {
          for (const sr of stepResults) {
            if (sr.status === 'pending' || sr.status === 'running') sr.status = 'aborted';
          }
          break;
        }

        let allDone = true;

        for (const sr of stepResults) {
          if (sr.status === 'pending' || sr.status === 'running') {
            if (!sr.testId) {
              sr.status = 'skipped';
              continue;
            }

            // 查询 test_executions 状态 + LEFT JOIN test_results 获取分数/摘要
            const testResult = await query(
              `SELECT te.status, te.execution_time, te.error_message,
                      tr.score AS result_score, tr.summary AS result_summary, tr.grade
               FROM test_executions te
               LEFT JOIN test_results tr ON tr.execution_id = te.id
               WHERE te.test_id = $1`,
              [sr.testId]
            );

            if (testResult.rows.length > 0) {
              const row = testResult.rows[0] as Record<string, unknown>;
              const testStatus = String(row.status || 'pending');

              if (testStatus === 'completed') {
                const resultSummary = parseJson<Record<string, unknown>>(row.result_summary, {});
                const resultScore = row.result_score != null ? Number(row.result_score) : 0;
                sr.status = 'completed';
                sr.score = resultScore;
                sr.duration = Number(row.execution_time || 0);
                sr.summary = { ...resultSummary, score: resultScore, grade: row.grade };
                // 链式上下文：将完成步骤的摘要传递给后续步骤
                chainContext.push({
                  stepName: sr.stepName,
                  type: sr.type,
                  score: sr.score,
                  summary: sr.summary,
                });
              } else if (testStatus === 'failed' || testStatus === 'cancelled') {
                const failSummary = parseJson<Record<string, unknown>>(row.result_summary, {});
                sr.status = 'failed';
                sr.score = row.result_score != null ? Number(row.result_score) : 0;
                sr.duration = Number(row.execution_time || 0);
                sr.summary = {
                  ...failSummary,
                  error: row.error_message || '测试执行失败',
                };
                // P0: 失败策略 — abort 模式下将后续 pending 步骤标记为 aborted
                if (plan.failureStrategy === 'abort') {
                  for (const other of stepResults) {
                    if (other.status === 'pending') other.status = 'aborted';
                  }
                }
              } else {
                sr.status = 'running';
                allDone = false;
              }
            } else {
              allDone = false;
            }
          }
        }

        await query(`UPDATE test_plan_executions SET step_results = $1 WHERE id = $2`, [
          JSON.stringify(stepResults),
          executionId,
        ]);

        if (allDone) break;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      // P0: 超时处理 — 将仍未完成的步骤标记为 timeout
      for (const sr of stepResults) {
        if (sr.status === 'pending' || sr.status === 'running') {
          sr.status = 'timeout';
          sr.summary = { ...sr.summary, reason: `执行超时（${Math.round(maxWait / 60000)}分钟）` };
        }
      }

      // 计算综合评分
      const completedSteps = stepResults.filter(
        sr => sr.status === 'completed' && sr.score != null
      );
      const overallScore =
        completedSteps.length > 0
          ? Math.round(
              completedSteps.reduce((sum, sr) => sum + (sr.score || 0), 0) / completedSteps.length
            )
          : 0;
      const totalDuration = Date.now() - startTime;
      const hasFailure = stepResults.some(sr => sr.status === 'failed' || sr.status === 'timeout');
      const wasCancelled = cancelledExecutions.has(executionId);

      const finalStatus = wasCancelled ? 'cancelled' : hasFailure ? 'failed' : 'completed';

      await query(
        `UPDATE test_plan_executions SET status = $1, step_results = $2, overall_score = $3, duration = $4, completed_at = $5 WHERE id = $6`,
        [
          finalStatus,
          JSON.stringify(stepResults),
          overallScore,
          totalDuration,
          new Date().toISOString(),
          executionId,
        ]
      );

      // 自动创建 UAT 反馈摘要（仅 completed/failed 时）
      if (finalStatus === 'completed' || finalStatus === 'failed') {
        await this.createUatFeedback(
          executionId,
          plan,
          stepResults,
          overallScore,
          finalStatus
        ).catch((e: unknown) => {
          console.warn('[TestPlanService] Auto UAT feedback failed:', (e as Error).message);
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[TestPlanService] Execution failed:', errMsg);
      // 将错误详情写入 step_results 以便前端展示
      const errorStepResults = JSON.stringify([
        {
          stepId: 'system',
          stepName: '系统错误',
          type: 'system',
          testId: null,
          status: 'failed',
          score: 0,
          duration: Date.now() - startTime,
          summary: { error: errMsg },
        },
      ]);
      await query(
        `UPDATE test_plan_executions SET status = 'failed', completed_at = $1, duration = $2, step_results = $3 WHERE id = $4`,
        [new Date().toISOString(), Date.now() - startTime, errorStepResults, executionId]
      ).catch(() => {
        /* best effort */
      });
    } finally {
      runningExecutions = Math.max(0, runningExecutions - 1);
      cancelledExecutions.delete(executionId);
    }
  }

  // P0: API 集合关联 — 从数据库加载集合的请求、环境变量、认证信息
  private async buildTestConfig(
    step: TestPlanStep,
    url: string,
    _payload: ExecuteTestPlanPayload,
    plan: TestPlan,
    chainContext: Record<string, unknown>[] = []
  ): Promise<Record<string, unknown>> {
    const envId = step.environmentId || _payload.environmentId || plan.defaultEnvironmentId;

    // 加载环境变量
    const envVariables: Record<string, string> = {};
    if (envId) {
      try {
        const envResult = await query('SELECT variables FROM environments WHERE id = $1', [envId]);
        if (envResult.rows.length > 0) {
          const rawVars = parseJson<Array<{ key: string; value: string }>>(
            (envResult.rows[0] as Record<string, unknown>).variables,
            []
          );
          for (const v of rawVars) {
            if (v.key) envVariables[v.key] = v.value || '';
          }
        }
      } catch {
        /* env not found, continue without */
      }
    }

    // API 类型：加载集合的请求列表和认证信息
    let collectionData: Record<string, unknown> = {};
    if (step.type === 'api' && step.collectionId) {
      try {
        const colResult = await query(
          'SELECT id, name, default_environment_id, metadata FROM collections WHERE id = $1',
          [step.collectionId]
        );
        if (colResult.rows.length > 0) {
          const col = colResult.rows[0] as Record<string, unknown>;
          const reqResult = await query(
            'SELECT * FROM collection_requests WHERE collection_id = $1 ORDER BY sort_order',
            [step.collectionId]
          );
          const requests = (reqResult.rows as Record<string, unknown>[]).map(r => ({
            name: r.name,
            method: r.method,
            url: r.url,
            headers: parseJson(r.headers, {}),
            body: parseJson(r.body, {}),
            auth: parseJson(r.auth, null),
          }));
          collectionData = {
            collectionId: step.collectionId,
            collectionName: col.name,
            requests,
            auth: parseJson<Record<string, unknown>>(col.metadata, {}).auth || null,
          };

          // 如果集合有默认环境且步骤未指定环境，使用集合的默认环境
          if (!envId && col.default_environment_id) {
            try {
              const colEnvResult = await query('SELECT variables FROM environments WHERE id = $1', [
                col.default_environment_id,
              ]);
              if (colEnvResult.rows.length > 0) {
                const rawVars = parseJson<Array<{ key: string; value: string }>>(
                  (colEnvResult.rows[0] as Record<string, unknown>).variables,
                  []
                );
                for (const v of rawVars) {
                  if (v.key && !envVariables[v.key]) envVariables[v.key] = v.value || '';
                }
              }
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* collection not found, continue */
      }
    }

    return {
      testType: step.type,
      url,
      options: {
        ...step.config,
        ...collectionData,
        ...(envId ? { environmentId: envId } : {}),
        ...(Object.keys(envVariables).length > 0 ? { variables: envVariables } : {}),
        ...(chainContext.length > 0 ? { previousResults: chainContext } : {}),
      },
    };
  }

  /**
   * 执行完成后自动创建 UAT 反馈条目，汇总测试计划结果
   */
  private async createUatFeedback(
    executionId: string,
    plan: TestPlan,
    stepResults: TestPlanStepResult[],
    overallScore: number,
    status: string
  ): Promise<void> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const completedCount = stepResults.filter(sr => sr.status === 'completed').length;
    const failedCount = stepResults.filter(
      sr => sr.status === 'failed' || sr.status === 'timeout'
    ).length;
    const totalCount = stepResults.length;

    const summaryLines = stepResults.map(
      sr => `[${sr.type}] ${sr.stepName}: ${sr.status}${sr.score != null ? ` (${sr.score}分)` : ''}`
    );

    const content = [
      `测试计划「${plan.name}」执行${status === 'completed' ? '完成' : '失败'}`,
      `综合评分: ${overallScore}`,
      `步骤: ${completedCount}/${totalCount} 通过, ${failedCount} 失败`,
      '',
      ...summaryLines,
    ].join('\n');

    const rating = overallScore >= 80 ? 5 : overallScore >= 60 ? 3 : 1;

    await query(
      `INSERT INTO uat_feedback (id, workspace_id, plan_id, execution_id, type, content, rating, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, plan.workspaceId, plan.id, executionId, 'auto', content, rating, 'open', now, now]
    ).catch(() => {
      // uat_feedback 表可能不存在，静默忽略
    });
  }
}

export const testPlanService = new TestPlanService();
