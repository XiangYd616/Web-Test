const { models } = require('../database/sequelize');
const CollectionManager = require('../services/collections/CollectionManager');
const EnvironmentManager = require('../services/environments/EnvironmentManager');

const collectionManager = new CollectionManager({ models });
const environmentManager = new EnvironmentManager({ models });

const runCancelFlags = new Map();

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const ensureWorkspaceMember = async (workspaceId, userId) => {
  const { WorkspaceMember } = models;
  return WorkspaceMember.findOne({
    where: { workspace_id: workspaceId, user_id: userId, status: 'active' }
  });
};

const ensureCollectionAccess = async (collectionId, userId) => {
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

const buildEnvironmentContext = async (environmentId) => {
  if (!environmentId) {
    return {};
  }
  const environment = await environmentManager.getEnvironment(environmentId, { raw: true });
  if (!environment) {
    return {};
  }
  const envMap = {};
  (environment.variables || []).forEach(variable => {
    if (variable.enabled !== false) {
      envMap[variable.key] = environmentManager.getVariableValue(variable);
    }
  });
  return envMap;
};

const createRunRecord = async ({ workspaceId, collectionId, environmentId, userId }) => {
  const { Run } = models;
  return Run.create({
    workspace_id: workspaceId,
    collection_id: collectionId,
    environment_id: environmentId || null,
    status: 'running',
    started_at: new Date(),
    created_by: userId,
    summary: {}
  });
};

const persistRunResults = async (runRecord, result) => {
  const { RunResult } = models;
  await RunResult.bulkCreate(
    result.results.map(item => ({
      run_id: runRecord.id,
      item_id: item.itemId || null,
      request_snapshot: item.requestSnapshot || item.request || {},
      response: item.response || { error: item.error },
      assertions: item.assertions || [],
      duration_ms: item.duration || null,
      success: item.success !== false
    }))
  );
};

const validateRunInput = (data, res) => {
  const errors = [];
  if (!data?.collectionId) {
    errors.push({ field: 'collectionId', message: 'collectionId 不能为空' });
  }
  if (data?.iterations !== undefined) {
    const iterations = Number(data.iterations);
    if (!Number.isFinite(iterations) || iterations < 1 || iterations > 100) {
      errors.push({ field: 'iterations', message: 'iterations 需在 1~100 之间' });
    }
  }
  if (data?.delay !== undefined) {
    const delay = Number(data.delay);
    if (!Number.isFinite(delay) || delay < 0 || delay > 10000) {
      errors.push({ field: 'delay', message: 'delay 需在 0~10000 之间' });
    }
  }
  if (data?.timeout !== undefined) {
    const timeout = Number(data.timeout);
    if (!Number.isFinite(timeout) || timeout < 100 || timeout > 120000) {
      errors.push({ field: 'timeout', message: 'timeout 需在 100~120000 之间' });
    }
  }
  if (errors.length > 0) {
    res.validationError(errors);
    return false;
  }
  return true;
};

const listRuns = async (req, res) => {
  const workspaceId = req.query.workspaceId;
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  const member = await ensureWorkspaceMember(workspaceId, req.user.id);
  if (!member) {
    return res.forbidden('没有权限访问该工作空间运行记录');
  }

  const where = { workspace_id: workspaceId };
  if (req.query.status) {
    const allowed = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    if (!allowed.includes(req.query.status)) {
      return res.validationError([{ field: 'status', message: 'status 不合法' }]);
    }
    where.status = req.query.status;
  }
  if (req.query.collectionId) {
    where.collection_id = req.query.collectionId;
  }
  if (req.query.environmentId) {
    where.environment_id = req.query.environmentId;
  }

  const { Run } = models;
  const { page, limit, offset } = parsePagination(req);
  const { count, rows } = await Run.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });

  const data = rows.map(run => ({
    id: run.id,
    status: run.status,
    collectionId: run.collection_id,
    environmentId: run.environment_id,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    durationMs: run.duration_ms,
    summary: run.summary || {}
  }));

  return res.paginated(data, page, limit, count, '获取运行列表成功');
};

const createRun = async (req, res) => {
  const { collectionId, environmentId, iterations, delay, timeout } = req.body || {};
  if (!validateRunInput(req.body, res)) {
    return;
  }

  const access = await ensureCollectionAccess(collectionId, req.user.id);
  if (access.error) {
    return access.error === '集合不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }

  const envContext = await buildEnvironmentContext(environmentId);

  const runRecord = await createRunRecord({
    workspaceId: access.collection.workspace_id,
    collectionId,
    environmentId,
    userId: req.user.id
  });

  runCancelFlags.set(runRecord.id, false);

  try {
    const result = await collectionManager.runCollection(collectionId, {
      environment: envContext,
      iterations: iterations || 1,
      delay: delay || 0,
      timeout: timeout || 30000,
      shouldCancel: () => runCancelFlags.get(runRecord.id) === true
    });

    const summary = {
      totalRequests: result.totalRequests,
      passedRequests: result.passedRequests,
      failedRequests: result.failedRequests,
      skippedRequests: result.skippedRequests
    };

    await persistRunResults(runRecord, result);

    const status = result.cancelled ? 'cancelled' : 'completed';
    await runRecord.update({
      status,
      completed_at: new Date(),
      duration_ms: result.duration,
      summary
    });

    runCancelFlags.delete(runRecord.id);
    return res.created({ id: runRecord.id, summary, status }, '运行完成');
  } catch (error) {
    await runRecord.update({
      status: 'failed',
      completed_at: new Date(),
      summary: { error: error.message }
    });
    runCancelFlags.delete(runRecord.id);
    return res.serverError('运行失败');
  }
};

const getRun = async (req, res) => {
  const { Run, RunResult } = models;
  const run = await Run.findByPk(req.params.runId);
  if (!run) {
    return res.notFound('运行记录不存在');
  }
  const member = await ensureWorkspaceMember(run.workspace_id, req.user.id);
  if (!member) {
    return res.forbidden('没有权限访问该运行记录');
  }

  const { page, limit, offset } = parsePagination(req);
  const { count, rows } = await RunResult.findAndCountAll({
    where: { run_id: run.id },
    order: [['created_at', 'ASC']],
    limit,
    offset
  });

  if (req.query.page || req.query.limit) {
    return res.paginated(rows, page, limit, count, '获取运行详情成功', {
      run: {
        id: run.id,
        status: run.status,
        collectionId: run.collection_id,
        environmentId: run.environment_id,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        durationMs: run.duration_ms,
        summary: run.summary || {}
      }
    });
  }

  return res.success({
    id: run.id,
    status: run.status,
    collectionId: run.collection_id,
    environmentId: run.environment_id,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    durationMs: run.duration_ms,
    summary: run.summary || {},
    results: rows
  }, '获取运行详情成功');
};

const cancelRun = async (req, res) => {
  const { Run } = models;
  const run = await Run.findByPk(req.params.runId);
  if (!run) {
    return res.notFound('运行记录不存在');
  }
  const member = await ensureWorkspaceMember(run.workspace_id, req.user.id);
  if (!member) {
    return res.forbidden('没有权限取消该运行');
  }
  if (run.status !== 'running') {
    return res.conflict('运行', '当前状态不可取消');
  }

  runCancelFlags.set(run.id, true);
  await run.update({ status: 'cancelled', completed_at: new Date() });
  return res.success({ id: run.id, status: 'cancelled' }, '已发出取消指令');
};

const rerun = async (req, res) => {
  const { Run } = models;
  const run = await Run.findByPk(req.params.runId);
  if (!run) {
    return res.notFound('运行记录不存在');
  }
  const member = await ensureWorkspaceMember(run.workspace_id, req.user.id);
  if (!member) {
    return res.forbidden('没有权限重跑该运行');
  }

  const envContext = await buildEnvironmentContext(run.environment_id);
  const runRecord = await createRunRecord({
    workspaceId: run.workspace_id,
    collectionId: run.collection_id,
    environmentId: run.environment_id,
    userId: req.user.id
  });
  runCancelFlags.set(runRecord.id, false);

  try {
    const result = await collectionManager.runCollection(run.collection_id, {
      environment: envContext,
      timeout: req.body?.timeout || 30000,
      shouldCancel: () => runCancelFlags.get(runRecord.id) === true
    });

    const summary = {
      totalRequests: result.totalRequests,
      passedRequests: result.passedRequests,
      failedRequests: result.failedRequests,
      skippedRequests: result.skippedRequests
    };

    await persistRunResults(runRecord, result);
    const status = result.cancelled ? 'cancelled' : 'completed';
    await runRecord.update({
      status,
      completed_at: new Date(),
      duration_ms: result.duration,
      summary
    });
    runCancelFlags.delete(runRecord.id);
    return res.created({ id: runRecord.id, summary, status }, '重跑完成');
  } catch (error) {
    await runRecord.update({
      status: 'failed',
      completed_at: new Date(),
      summary: { error: error.message }
    });
    runCancelFlags.delete(runRecord.id);
    return res.serverError('重跑失败');
  }
};

const getRunResults = async (req, res) => {
  const { Run, RunResult } = models;
  const run = await Run.findByPk(req.params.runId);
  if (!run) {
    return res.notFound('运行记录不存在');
  }
  const member = await ensureWorkspaceMember(run.workspace_id, req.user.id);
  if (!member) {
    return res.forbidden('没有权限访问该运行结果');
  }

  const where = { run_id: run.id };
  if (req.query.success !== undefined) {
    if (!['true', 'false'].includes(String(req.query.success))) {
      return res.validationError([{ field: 'success', message: 'success 仅支持 true/false' }]);
    }
    where.success = String(req.query.success) === 'true';
  }

  let order = [['created_at', 'ASC']];
  if (req.query.orderBy) {
    const allowed = {
      duration: 'duration_ms',
      createdAt: 'created_at'
    };
    const field = allowed[req.query.orderBy];
    if (!field) {
      return res.validationError([{ field: 'orderBy', message: 'orderBy 不合法' }]);
    }
    const direction = String(req.query.order || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    order = [[field, direction]];
  }

  const { page, limit, offset } = parsePagination(req);
  if (req.query.statusCode) {
    const statusCode = Number(req.query.statusCode);
    if (!Number.isFinite(statusCode)) {
      return res.validationError([{ field: 'statusCode', message: 'statusCode 必须是数字' }]);
    }
    const allRows = await RunResult.findAll({
      where,
      order
    });
    const filtered = allRows.filter(item => {
      const response = item.response || {};
      const code = response.status || response.statusCode || response.code;
      return Number(code) === statusCode;
    });
    const paged = filtered.slice(offset, offset + limit);
    return res.paginated(paged, page, limit, filtered.length, '获取运行结果成功', {
      runId: run.id
    });
  }

  const { count, rows } = await RunResult.findAndCountAll({
    where,
    order,
    limit,
    offset
  });

  return res.paginated(rows, page, limit, count, '获取运行结果成功', {
    runId: run.id
  });
};

const exportRun = async (req, res) => {
  const format = req.query.format || 'json';
  const { Run, RunResult } = models;
  const run = await Run.findByPk(req.params.runId);
  if (!run) {
    return res.notFound('运行记录不存在');
  }
  const member = await ensureWorkspaceMember(run.workspace_id, req.user.id);
  if (!member) {
    return res.forbidden('没有权限导出该运行记录');
  }

  const results = await RunResult.findAll({
    where: { run_id: run.id },
    order: [['created_at', 'ASC']]
  });

  const derivedResults = results.map(item => {
    const request = item.request_snapshot || {};
    const response = item.response || {};
    const assertions = Array.isArray(item.assertions) ? item.assertions : [];
    const passedAssertions = assertions.filter(a => a.passed).length;
    const failedAssertions = assertions.filter(a => !a.passed).length;
    const responseBody = response.body || response.data || response.text || '';
    const responseSize = typeof responseBody === 'string'
      ? responseBody.length
      : Buffer.byteLength(JSON.stringify(responseBody || {}));
    const requestHeaders = request.header || request.headers || null;
    const responseHeaders = response.headers || null;
    return {
      id: item.id,
      itemId: item.item_id,
      success: item.success,
      durationMs: item.duration_ms,
      requestMethod: request.method || null,
      requestUrl: request.url?.raw || request.url || null,
      statusCode: response.status || response.statusCode || response.code || null,
      assertionsPassed: passedAssertions,
      assertionsFailed: failedAssertions,
      responseSize,
      responsePreview: typeof responseBody === 'string'
        ? responseBody.slice(0, 200)
        : JSON.stringify(responseBody).slice(0, 200),
      requestHeaders,
      responseHeaders,
      raw: item
    };
  });

  if (format === 'json') {
    return res.success({
      run: {
        id: run.id,
        status: run.status,
        collectionId: run.collection_id,
        environmentId: run.environment_id,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        durationMs: run.duration_ms,
        summary: run.summary || {}
      },
      results: derivedResults
    }, '导出运行记录成功');
  }

  if (format === 'csv') {
    const escapeCsv = (value) => {
      const str = value === null || value === undefined ? '' : String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = [
      'id',
      'item_id',
      'success',
      'duration_ms',
      'method',
      'url',
      'status_code',
      'assertions_passed',
      'assertions_failed',
      'response_size',
      'response_preview',
      'request_headers',
      'response_headers'
    ].join(',');
    const rows = derivedResults.map(row => [
      escapeCsv(row.id),
      escapeCsv(row.itemId),
      escapeCsv(row.success),
      escapeCsv(row.durationMs),
      escapeCsv(row.requestMethod),
      escapeCsv(row.requestUrl),
      escapeCsv(row.statusCode),
      escapeCsv(row.assertionsPassed),
      escapeCsv(row.assertionsFailed),
      escapeCsv(row.responseSize),
      escapeCsv(row.responsePreview),
      escapeCsv(row.requestHeaders ? JSON.stringify(row.requestHeaders) : ''),
      escapeCsv(row.responseHeaders ? JSON.stringify(row.responseHeaders) : '')
    ].join(','));
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    return res.status(200).send(csv);
  }

  return res.validationError([{ field: 'format', message: 'format 仅支持 json/csv' }]);
};

const getRunReport = async (req, res) => {
  const { Run, RunResult } = models;
  const run = await Run.findByPk(req.params.runId);
  if (!run) {
    return res.notFound('运行记录不存在');
  }
  const member = await ensureWorkspaceMember(run.workspace_id, req.user.id);
  if (!member) {
    return res.forbidden('没有权限查看运行报告');
  }

  const results = await RunResult.findAll({ where: { run_id: run.id } });
  const total = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = total - passed;
  const assertionStats = results.reduce((acc, item) => {
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
  }, { total: 0, passed: 0, failed: 0 });

  const statusCodeStats = results.reduce((acc, item) => {
    const response = item.response || {};
    const code = response.status || response.statusCode || response.code || 'unknown';
    const key = String(code);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const assertionFailureStats = results.reduce((acc, item) => {
    const assertions = Array.isArray(item.assertions) ? item.assertions : [];
    assertions.forEach(assertion => {
      if (assertion.passed) {
        return;
      }
      const name = assertion.name || assertion.test || 'unknown';
      acc[name] = (acc[name] || 0) + 1;
    });
    return acc;
  }, {});

  const assertionFailureTop10 = Object.entries(assertionFailureStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const errorMessageStats = results.reduce((acc, item) => {
    if (item.success) {
      return acc;
    }
    const response = item.response || {};
    const message = item.error || response.error || response.message || 'unknown';
    acc[message] = (acc[message] || 0) + 1;
    return acc;
  }, {});

  const errorMessageTop20 = Object.entries(errorMessageStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([message, count]) => ({ message, count }));
  const avgDuration = total > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / total)
    : 0;

  return res.success({
    runId: run.id,
    status: run.status,
    summary: run.summary || {},
    totalRequests: total,
    passedRequests: passed,
    failedRequests: failed,
    assertionTotal: assertionStats.total,
    assertionPassed: assertionStats.passed,
    assertionFailed: assertionStats.failed,
    assertionPassRate: assertionStats.total > 0
      ? Math.round((assertionStats.passed / assertionStats.total) * 100)
      : 0,
    statusCodeStats,
    assertionFailureTop10,
    errorMessageTop20,
    averageDurationMs: avgDuration
  }, '获取运行报告成功');
};

module.exports = {
  listRuns,
  createRun,
  getRun,
  cancelRun,
  rerun,
  getRunResults,
  exportRun,
  getRunReport
};
