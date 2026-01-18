const cron = require('node-cron');
const { models } = require('../../database/sequelize');
const CollectionManager = require('../collections/CollectionManager');
const EnvironmentManager = require('../environments/EnvironmentManager');

class ScheduledRunService {
  constructor(options = {}) {
    this.models = options.models || models;
    this.collectionManager = options.collectionManager || new CollectionManager({ models: this.models });
    this.environmentManager = options.environmentManager || new EnvironmentManager({ models: this.models });
    this.jobs = new Map();
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      return;
    }
    const { ScheduledRun } = this.models;
    const schedules = await ScheduledRun.findAll({ where: { status: 'active' } });
    schedules.forEach(schedule => this.scheduleJob(schedule));
    this.isRunning = true;
  }

  async stop() {
    for (const job of this.jobs.values()) {
      job.task.stop();
    }
    this.jobs.clear();
    this.isRunning = false;
  }

  async reload() {
    await this.stop();
    await this.start();
  }

  removeJob(scheduleId) {
    if (!this.jobs.has(scheduleId)) {
      return;
    }
    this.jobs.get(scheduleId).task.stop();
    this.jobs.delete(scheduleId);
  }

  scheduleJob(schedule) {
    if (!cron.validate(schedule.cron)) {
      return;
    }
    if (this.jobs.has(schedule.id)) {
      this.jobs.get(schedule.id).task.stop();
      this.jobs.delete(schedule.id);
    }
    if (schedule.status !== 'active') {
      return;
    }
    const task = cron.schedule(schedule.cron, async () => {
      await this.executeScheduledRun(schedule.id);
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Shanghai'
    });
    this.jobs.set(schedule.id, { task, schedule });
  }

  async executeScheduledRun(scheduleId) {
    const { ScheduledRun, Run, RunResult } = this.models;
    const schedule = await ScheduledRun.findByPk(scheduleId);
    if (!schedule || schedule.status !== 'active') {
      return null;
    }

    const envContext = await this.buildEnvironmentContext(schedule.environment_id);
    const runRecord = await Run.create({
      workspace_id: schedule.workspace_id,
      collection_id: schedule.collection_id,
      environment_id: schedule.environment_id,
      status: 'running',
      started_at: new Date(),
      created_by: schedule.created_by,
      summary: {
        scheduledRunId: schedule.id,
        scheduledName: schedule.name
      }
    });

    try {
      const result = await this.collectionManager.runCollection(schedule.collection_id, {
        environment: envContext,
        iterations: schedule.config?.iterations || 1,
        delay: schedule.config?.delay || 0,
        timeout: schedule.config?.timeout || 30000
      });

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

      await runRecord.update({
        status: result.cancelled ? 'cancelled' : 'completed',
        completed_at: new Date(),
        duration_ms: result.duration,
        summary: {
          ...runRecord.summary,
          totalRequests: result.totalRequests,
          passedRequests: result.passedRequests,
          failedRequests: result.failedRequests,
          skippedRequests: result.skippedRequests
        }
      });

      await schedule.update({ last_run_at: new Date() });
      return runRecord;
    } catch (error) {
      await runRecord.update({
        status: 'failed',
        completed_at: new Date(),
        summary: { error: error.message, scheduledRunId: schedule.id }
      });
      return null;
    }
  }

  async buildEnvironmentContext(environmentId) {
    if (!environmentId) {
      return {};
    }
    const environment = await this.environmentManager.getEnvironment(environmentId, { raw: true });
    if (!environment) {
      return {};
    }
    const envMap = {};
    (environment.variables || []).forEach(variable => {
      if (variable.enabled !== false) {
        envMap[variable.key] = this.environmentManager.getVariableValue(variable);
      }
    });
    return envMap;
  }
}

module.exports = ScheduledRunService;
