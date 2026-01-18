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

const listRuns = async (req, res) => {
  const workspaceId = req.query.workspaceId;
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  const member = await ensureWorkspaceMember(workspaceId, req.user.id);
  if (!member) {
    return res.forbidden('没有权限访问该工作空间运行记录');
  }

  const { Run } = models;
  const { page, limit, offset } = parsePagination(req);
  const { count, rows } = await Run.findAndCountAll({
    where: { workspace_id: workspaceId },
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
  if (!collectionId) {
    return res.validationError([{ field: 'collectionId', message: 'collectionId 不能为空' }]);
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

  const { page, limit, offset } = parsePagination(req);
  const { count, rows } = await RunResult.findAndCountAll({
    where: { run_id: run.id },
    order: [['created_at', 'ASC']],
    limit,
    offset
  });

  return res.paginated(rows, page, limit, count, '获取运行结果成功', {
    runId: run.id
  });
};

module.exports = {
  listRuns,
  createRun,
  getRun,
  cancelRun,
  rerun,
  getRunResults
};
