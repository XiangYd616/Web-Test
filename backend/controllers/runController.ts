import type { Request, Response } from 'express';

const { models } = require('../database/sequelize');
const CollectionManager = require('../services/collections/CollectionManager');
const EnvironmentManager = require('../services/environments/EnvironmentManager');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');

const collectionManager = new CollectionManager({ models });
const _environmentManager = new EnvironmentManager({ models });

type ApiResponse = Response & {
  validationError: (errors: ValidationError[]) => Response;
  success: (data?: unknown, message?: string) => Response;
  created: (data?: unknown, message?: string) => Response;
  notFound: (message?: string) => Response;
  forbidden: (message?: string) => Response;
};

type AuthRequest = Request & { user: { id: string; role?: string } };

type ValidationError = { field: string; message: string };

type RunSummary = {
  totalRequests?: number;
  passedRequests?: number;
  failedRequests?: number;
  skippedRequests?: number;
  passRate?: number;
};

type RunResult = {
  success: boolean;
  assertions?: Array<{ passed: boolean; name?: string; test?: string }>;
  response?: {
    status?: number;
    statusCode?: number;
    code?: string | number;
  };
};

const runCancelFlags = new Map<string, boolean>();

const parsePagination = (req: Request) => {
  const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const ensureWorkspaceMember = async (workspaceId: string, userId: string) => {
  const { WorkspaceMember } = models;
  return WorkspaceMember.findOne({
    where: { workspace_id: workspaceId, user_id: userId, status: 'active' },
  });
};

const ensureWorkspacePermission = async (workspaceId: string, userId: string, action: string) => {
  const member = await ensureWorkspaceMember(workspaceId, userId);
  if (!member) {
    return { error: '没有权限访问该工作空间运行记录' };
  }
  if (!hasWorkspacePermission(member.role, action)) {
    return { error: '当前角色无此操作权限' };
  }
  return { member };
};

const ensureCollectionAccess = async (collectionId: string, userId: string) => {
  const { Collection } = models;
  const collection = await Collection.findByPk(collectionId);
  if (!collection) {
    return { error: '集合不存在' };
  }
  const member = await ensureWorkspaceMember(collection.workspace_id, userId);
  if (!member) {
    return { error: '没有权限访问该集合' };
  }
  return { collection, member };
};

const ensureEnvironmentInWorkspace = async (environmentId: string, workspaceId: string) => {
  if (!environmentId) {
    return { environment: null };
  }
  const { Environment } = models;
  const environment = await Environment.findByPk(environmentId);
  if (!environment) {
    return { error: '环境不存在' };
  }
  if (environment.workspace_id !== workspaceId) {
    return { error: '环境不属于当前工作空间' };
  }
  return { environment };
};

const _normalizeRunSummary = (summary: RunSummary = {}) => {
  const total = Number(summary.totalRequests || 0);
  const passed = Number(summary.passedRequests || 0);
  const passRate = Number.isFinite(summary.passRate)
    ? summary.passRate
    : total > 0
      ? Math.round((passed / total) * 100)
      : 0;
  return {
    ...summary,
    totalRequests: total,
    passedRequests: passed,
    failedRequests: Number(summary.failedRequests || Math.max(total - passed, 0)),
    skippedRequests: Number(summary.skippedRequests || 0),
    passRate,
  };
};

const buildRunAggregates = (results: RunResult[]) => {
  const total = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = total - passed;
  const assertionStats = results.reduce(
    (acc, item) => {
      const assertions = Array.isArray(item.assertions) ? item.assertions : [];
      assertions.forEach(assertion => {
        acc.total += 1;
        if (assertion.passed) {
          acc.passed += 1;
        } else {
          acc.failed += 1;
        }
      });
      return acc;
    },
    { total: 0, passed: 0, failed: 0 }
  );

  const statusCodeStats = results.reduce(
    (acc, item) => {
      const response = item.response || {};
      const code = response.status || response.statusCode || response.code || 'unknown';
      const key = String(code);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const assertionFailureStats = results.reduce(
    (acc, item) => {
      const assertions = Array.isArray(item.assertions) ? item.assertions : [];
      assertions.forEach(assertion => {
        if (assertion.passed) {
          return;
        }
        const name = assertion.name || assertion.test || 'unknown';
        acc[name] = (acc[name] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>
  );

  const assertionFailureTop10 = Object.entries(assertionFailureStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    total,
    passed,
    failed,
    passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
    assertionStats,
    statusCodeStats,
    assertionFailureTop10,
  };
};

const escapeCsvValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  const escaped = stringValue.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
};

const formatCsv = (headers: string[], rows: Record<string, unknown>[]) => {
  const headerLine = headers.map(escapeCsvValue).join(',');
  const lines = rows.map(row => headers.map(key => escapeCsvValue(row[key])).join(','));
  return [headerLine, ...lines].join('\n');
};

const fetchAllRunResults = async (runId: string) => {
  const pageSize = 1000;
  let offset = 0;
  let total = 0;
  const results: RunResult[] = [];

  do {
    const batch = await collectionManager.getRunResults({
      runId,
      limit: pageSize,
      offset,
    });
    results.push(...batch.results);
    total = batch.total;
    offset += pageSize;
  } while (offset < total);

  return results;
};

const listRuns = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { workspaceId } = req.params;
    const { page, limit, offset } = parsePagination(req);

    const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const { runs, total } = await collectionManager.getRuns({
      workspaceId,
      limit,
      offset,
    });

    return res.success({
      runs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取运行记录失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取运行记录失败',
    });
  }
};

const createRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { collectionId } = req.params;
    const { environmentId, options = {} } = req.body as {
      environmentId?: string;
      options?: Record<string, unknown>;
    };

    const access = await ensureCollectionAccess(collectionId, req.user.id);
    if (access.error) {
      return access.error === '集合不存在'
        ? res.notFound('集合不存在')
        : res.forbidden(access.error);
    }

    if (!hasWorkspacePermission(access.member.role, 'write')) {
      return res.forbidden('当前角色无运行权限');
    }

    const envCheck = await ensureEnvironmentInWorkspace(
      environmentId || '',
      access.collection.workspace_id
    );
    if (envCheck.error) {
      return res.notFound(envCheck.error);
    }

    const run = await collectionManager.createRun({
      collectionId,
      environmentId: envCheck.environment?.id,
      userId: req.user.id,
      options,
    });

    return res.created(run, '运行创建成功');
  } catch (error) {
    console.error('创建运行失败:', error);
    return res.status(500).json({
      success: false,
      error: '创建运行失败',
    });
  }
};

const getRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { runId } = req.params;

    const run = await collectionManager.getRun(runId);
    if (!run) {
      return res.notFound('运行记录不存在');
    }

    const access = await ensureCollectionAccess(run.collection_id, req.user.id);
    if (access.error) {
      return res.forbidden(access.error);
    }

    return res.success(run);
  } catch (error) {
    console.error('获取运行详情失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取运行详情失败',
    });
  }
};

const cancelRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { runId } = req.params;

    const run = await collectionManager.getRun(runId);
    if (!run) {
      return res.notFound('运行记录不存在');
    }

    const access = await ensureCollectionAccess(run.collection_id, req.user.id);
    if (access.error) {
      return res.forbidden(access.error);
    }

    if (!hasWorkspacePermission(access.member.role, 'write')) {
      return res.forbidden('当前角色无取消权限');
    }

    runCancelFlags.set(runId, true);
    await collectionManager.cancelRun(runId);

    return res.success(null, '运行已取消');
  } catch (error) {
    console.error('取消运行失败:', error);
    return res.status(500).json({
      success: false,
      error: '取消运行失败',
    });
  }
};

const getRunResults = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { runId } = req.params;
    const { page, limit, offset } = parsePagination(req);

    const run = await collectionManager.getRun(runId);
    if (!run) {
      return res.notFound('运行记录不存在');
    }

    const access = await ensureCollectionAccess(run.collection_id, req.user.id);
    if (access.error) {
      return res.forbidden(access.error);
    }

    const { results, total } = await collectionManager.getRunResults({
      runId,
      limit,
      offset,
    });

    const aggregates = buildRunAggregates(results);

    return res.success({
      results,
      aggregates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取运行结果失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取运行结果失败',
    });
  }
};

const exportRun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { runId } = req.params;
    const format = String(req.query.format || 'json').toLowerCase();

    const run = await collectionManager.getRun(runId);
    if (!run) {
      return res.notFound('运行记录不存在');
    }

    const access = await ensureCollectionAccess(run.collection_id, req.user.id);
    if (access.error) {
      return res.forbidden(access.error);
    }

    const results = await fetchAllRunResults(runId);
    const aggregates = buildRunAggregates(results);
    const payload = {
      run,
      aggregates,
      results,
      exportedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      const rows = results.map(result => {
        const assertions = Array.isArray(result.assertions) ? result.assertions : [];
        const passedAssertions = assertions.filter(assertion => assertion.passed).length;
        const failedAssertions = assertions.length - passedAssertions;
        const response = result.response || {};
        return {
          id: (result as { id?: string }).id || '',
          requestId: (result as { request_id?: string }).request_id || '',
          status: result.success ? 'passed' : 'failed',
          duration: (result as { duration?: number }).duration || 0,
          responseStatus: response.status || response.statusCode || response.code || '',
          passedAssertions,
          failedAssertions,
        };
      });

      const csv = formatCsv(
        [
          'id',
          'requestId',
          'status',
          'duration',
          'responseStatus',
          'passedAssertions',
          'failedAssertions',
        ],
        rows
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="run-${runId}-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="run-${runId}-${Date.now()}.json"`);
    return res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error('导出运行失败:', error);
    return res.status(500).json({
      success: false,
      error: '导出运行失败',
    });
  }
};

const getRunReport = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { runId } = req.params;
    const run = await collectionManager.getRun(runId);
    if (!run) {
      return res.notFound('运行记录不存在');
    }

    const access = await ensureCollectionAccess(run.collection_id, req.user.id);
    if (access.error) {
      return res.forbidden(access.error);
    }

    const results = await fetchAllRunResults(runId);
    const aggregates = buildRunAggregates(results);
    const report = {
      runId,
      status: run.status,
      collectionId: run.collection_id,
      environmentId: run.environment_id,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      summary: run.summary || {},
      aggregates,
      generatedAt: new Date().toISOString(),
    };

    return res.success(report, '运行报告生成成功');
  } catch (error) {
    console.error('获取运行报告失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取运行报告失败',
    });
  }
};

const rerun = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { runId } = req.params;
    const run = await collectionManager.getRun(runId);
    if (!run) {
      return res.notFound('运行记录不存在');
    }

    const access = await ensureCollectionAccess(run.collection_id, req.user.id);
    if (access.error) {
      return res.forbidden(access.error);
    }
    if (!hasWorkspacePermission(access.member.role, 'write')) {
      return res.forbidden('当前角色无运行权限');
    }

    const newRun = await collectionManager.rerunRun(runId, req.user.id);
    return res.created(newRun, '运行重试已创建');
  } catch (error) {
    console.error('重试运行失败:', error);
    return res.status(500).json({
      success: false,
      error: '重试运行失败',
    });
  }
};

export { cancelRun, createRun, exportRun, getRun, getRunReport, getRunResults, listRuns, rerun };

module.exports = {
  listRuns,
  createRun,
  getRun,
  cancelRun,
  getRunResults,
  exportRun,
  getRunReport,
  rerun,
};
