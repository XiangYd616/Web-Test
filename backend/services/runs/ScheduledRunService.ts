/**
 * 定时运行服务
 * 提供定时任务调度、执行管理、结果追踪等功能
 */

import cronParser from 'cron-parser';
import cron from 'node-cron';
const CollectionManager = require('../collections/CollectionManager');
const EnvironmentManager = require('../environments/EnvironmentManager');

const { models: sequelizeModels } = require('../../database/sequelize');

interface CronTask {
  start: () => void;
  stop: () => void;
}

type ScheduledRunRecord = {
  id: string;
  workspace_id: string;
  collection_id: string;
  environment_id?: string | null;
  cron_expression: string;
  timezone?: string | null;
  status: string;
  name?: string | null;
  description?: string | null;
  config?: Record<string, unknown>;
  created_by?: string | null;
  last_run_at?: Date | null;
  next_run_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
};

type ScheduledRunResultRecord = {
  id: string;
  scheduled_run_id: string;
  status: string;
  started_at?: Date;
  completed_at?: Date;
  duration?: number;
  total_requests?: number;
  passed_requests?: number;
  failed_requests?: number;
  error_count?: number;
  logs?: string[];
  triggered_by?: string;
  metadata?: Record<string, unknown>;
};

type Model<T> = {
  findAll: (options?: Record<string, unknown>) => Promise<T[]>;
  findByPk: (id: string) => Promise<T | null>;
  create: (data: Record<string, unknown>) => Promise<T>;
  update: (
    data: Record<string, unknown>,
    options: Record<string, unknown>
  ) => Promise<[number, T[]]>;
  destroy: (options: Record<string, unknown>) => Promise<number>;
};

interface Models {
  ScheduledRun: Model<ScheduledRunRecord>;
  ScheduledRunResult: Model<ScheduledRunResultRecord>;
}

// 定时运行配置接口
export interface ScheduledRunConfig {
  id: string;
  workspaceId?: string;
  name: string;
  description: string;
  cronExpression: string;
  timezone: string;
  collectionId: string;
  environmentId: string;
  status: 'active' | 'inactive' | 'paused';
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  config?: Record<string, unknown>;
  createdBy?: string;
}

// 定时运行结果接口
export interface ScheduledRunResult {
  id: string;
  scheduledRunId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  totalRequests: number;
  passedRequests: number;
  failedRequests: number;
  errorCount: number;
  logs: string[];
  triggeredBy?: 'schedule' | 'manual';
  metadata: Record<string, unknown>;
}

// 任务执行接口
export interface JobExecution {
  id: string;
  scheduledRunId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  result?: ScheduledRunResult;
  error?: string;
}

// 定时运行统计接口
export interface ScheduledRunStatistics {
  totalSchedules: number;
  activeSchedules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  byCollection: Record<string, number>;
  byEnvironment: Record<string, number>;
  byStatus: Record<string, number>;
  trends: Array<{
    date: string;
    executions: number;
    successRate: number;
    averageTime: number;
  }>;
}

/**
 * 定时运行服务
 */
class ScheduledRunService {
  private models: Models;
  private collectionManager: InstanceType<typeof CollectionManager>;
  private environmentManager: InstanceType<typeof EnvironmentManager>;
  private jobs: Map<string, { task: CronTask; config: ScheduledRunConfig }> = new Map();
  private isRunning: boolean = false;
  private executions: Map<string, JobExecution> = new Map();
  private readonly retryIntervalMs = 5 * 60 * 1000;
  private readonly maxRetries = 3;

  constructor(
    options: {
      models?: Models;
      collectionManager?: InstanceType<typeof CollectionManager>;
      environmentManager?: InstanceType<typeof EnvironmentManager>;
    } = {}
  ) {
    this.models = options.models || (sequelizeModels as Models);
    this.collectionManager =
      options.collectionManager || new CollectionManager({ models: this.models });
    this.environmentManager =
      options.environmentManager || new EnvironmentManager({ models: this.models });
  }

  /**
   * 启动服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      await this.recoverRunningExecutions();
      await this.resumeScheduledRetries();
      const schedules = await this.models.ScheduledRun.findAll({ where: { status: 'active' } });

      for (const schedule of schedules) {
        await this.updateScheduleNextRunAt(schedule);
        await this.scheduleJob(schedule);
      }

      await this.compensateMissedRuns(schedules);

      this.isRunning = true;
      console.log('Scheduled run service started');
    } catch (error) {
      console.error('Failed to start scheduled run service:', error);
      throw error;
    }
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    for (const job of this.jobs.values()) {
      job.task.stop();
    }

    this.jobs.clear();
    this.isRunning = false;
    console.log('Scheduled run service stopped');
  }

  /**
   * 创建定时任务
   */
  async createSchedule(
    scheduleData: Omit<ScheduledRunConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const schedule: ScheduledRunRecord = await this.models.ScheduledRun.create({
      workspace_id: scheduleData.workspaceId,
      name: scheduleData.name,
      description: scheduleData.description,
      cron_expression: scheduleData.cronExpression,
      timezone: scheduleData.timezone,
      collection_id: scheduleData.collectionId,
      environment_id: scheduleData.environmentId,
      status: scheduleData.status,
      last_run_at: scheduleData.lastRunAt,
      next_run_at: scheduleData.nextRunAt,
      config: scheduleData.config,
      created_by: scheduleData.createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const config: ScheduledRunConfig = {
      id: schedule.id,
      workspaceId: schedule.workspace_id,
      name: schedule.name || '',
      description: schedule.description || '',
      cronExpression: schedule.cron_expression,
      timezone: schedule.timezone || 'UTC',
      collectionId: schedule.collection_id,
      environmentId: schedule.environment_id || '',
      status: schedule.status as ScheduledRunConfig['status'],
      lastRunAt: schedule.last_run_at || undefined,
      nextRunAt: schedule.next_run_at || undefined,
      createdAt: schedule.created_at || new Date(),
      updatedAt: schedule.updated_at || new Date(),
      config: schedule.config || {},
      createdBy: schedule.created_by || undefined,
    };

    if (config.status === 'active') {
      await this.scheduleJob(schedule);
    }

    return schedule.id;
  }

  /**
   * 获取定时任务
   */
  async getSchedule(scheduleId: string): Promise<ScheduledRunConfig | null> {
    const schedule = await this.models.ScheduledRun.findByPk(scheduleId);
    if (!schedule) {
      return null;
    }

    return {
      id: schedule.id,
      workspaceId: schedule.workspace_id,
      name: schedule.name || '',
      description: schedule.description || '',
      cronExpression: schedule.cron_expression,
      timezone: schedule.timezone || 'UTC',
      collectionId: schedule.collection_id,
      environmentId: schedule.environment_id || '',
      status: schedule.status as ScheduledRunConfig['status'],
      lastRunAt: schedule.last_run_at || undefined,
      nextRunAt: schedule.next_run_at || undefined,
      createdAt: schedule.created_at || new Date(),
      updatedAt: schedule.updated_at || new Date(),
      config: schedule.config || {},
      createdBy: schedule.created_by || undefined,
    };
  }

  /**
   * 获取所有定时任务
   */
  async getAllSchedules(): Promise<ScheduledRunConfig[]> {
    const schedules = await this.models.ScheduledRun.findAll();

    return schedules.map(schedule => ({
      id: schedule.id,
      workspaceId: schedule.workspace_id,
      name: schedule.name || '',
      description: schedule.description || '',
      cronExpression: schedule.cron_expression,
      timezone: schedule.timezone || 'UTC',
      collectionId: schedule.collection_id,
      environmentId: schedule.environment_id || '',
      status: schedule.status as ScheduledRunConfig['status'],
      lastRunAt: schedule.last_run_at || undefined,
      nextRunAt: schedule.next_run_at || undefined,
      createdAt: schedule.created_at || new Date(),
      updatedAt: schedule.updated_at || new Date(),
      config: schedule.config || {},
      createdBy: schedule.created_by || undefined,
    }));
  }

  /**
   * 更新定时任务
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ScheduledRunConfig>
  ): Promise<ScheduledRunConfig> {
    const schedule = await this.models.ScheduledRun.findByPk(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const [_, updatedSchedules] = await this.models.ScheduledRun.update(
      {
        name: updates.name,
        description: updates.description,
        cron_expression: updates.cronExpression,
        timezone: updates.timezone,
        collection_id: updates.collectionId,
        environment_id: updates.environmentId,
        status: updates.status,
        last_run_at: updates.lastRunAt,
        next_run_at: updates.nextRunAt,
        config: updates.config,
        updated_at: new Date(),
      },
      { where: { id: scheduleId }, returning: true }
    );

    const updatedSchedule =
      updatedSchedules[0] || (await this.models.ScheduledRun.findByPk(scheduleId));
    if (!updatedSchedule) {
      throw new Error('Schedule not found');
    }

    // 重新调度任务
    if (updates.status || updates.cronExpression) {
      await this.rescheduleJob(scheduleId);
    }

    return {
      id: updatedSchedule.id,
      workspaceId: updatedSchedule.workspace_id,
      name: updatedSchedule.name || '',
      description: updatedSchedule.description || '',
      cronExpression: updatedSchedule.cron_expression,
      timezone: updatedSchedule.timezone || 'UTC',
      collectionId: updatedSchedule.collection_id,
      environmentId: updatedSchedule.environment_id || '',
      status: updatedSchedule.status as ScheduledRunConfig['status'],
      lastRunAt: updatedSchedule.last_run_at || undefined,
      nextRunAt: updatedSchedule.next_run_at || undefined,
      createdAt: updatedSchedule.created_at || new Date(),
      updatedAt: updatedSchedule.updated_at || new Date(),
      config: updatedSchedule.config || {},
      createdBy: updatedSchedule.created_by || undefined,
    };
  }

  /**
   * 删除定时任务
   */
  async deleteSchedule(scheduleId: string): Promise<boolean> {
    const schedule = await this.models.ScheduledRun.findByPk(scheduleId);
    if (!schedule) {
      return false;
    }

    // 停止任务
    await this.unscheduleJob(scheduleId);

    await this.models.ScheduledRun.destroy({ where: { id: scheduleId } });
    return true;
  }

  /**
   * 手动执行定时任务
   */
  async executeSchedule(
    scheduleId: string,
    options: {
      dryRun?: boolean;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    const schedule = await this.models.ScheduledRun.findByPk(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const executionId = this.generateExecutionId();
    const startTime = new Date();

    const execution: JobExecution = {
      id: executionId,
      scheduledRunId: scheduleId,
      status: 'running',
      startTime,
    };

    const baseMetadata = { ...options.metadata };
    const triggeredBy =
      (baseMetadata?.triggeredBy as ScheduledRunResult['triggeredBy']) || 'schedule';
    const retryCount = typeof baseMetadata?.retryCount === 'number' ? baseMetadata.retryCount : 0;
    if (baseMetadata?.triggeredBy !== undefined) {
      delete baseMetadata.triggeredBy;
    }
    if (baseMetadata?.retryCount !== undefined) {
      delete baseMetadata.retryCount;
    }
    const runningResult: ScheduledRunResult = {
      id: this.generateId(),
      scheduledRunId: scheduleId,
      status: 'running',
      startedAt: startTime,
      totalRequests: 0,
      passedRequests: 0,
      failedRequests: 0,
      errorCount: 0,
      logs: [],
      triggeredBy,
      metadata: { ...baseMetadata, executionId, retryCount },
    };

    this.executions.set(executionId, execution);
    await this.models.ScheduledRunResult.create(this.toScheduledRunResultRecord(runningResult));
    try {
      if (options.dryRun) {
        // 干运行模式
        const result: ScheduledRunResult = {
          id: runningResult.id,
          scheduledRunId: scheduleId,
          status: 'success',
          startedAt: startTime,
          completedAt: new Date(),
          duration: 0,
          totalRequests: 0,
          passedRequests: 0,
          failedRequests: 0,
          errorCount: 0,
          logs: ['Dry run completed'],
          triggeredBy,
          metadata: { dryRun: true, ...baseMetadata },
        };

        execution.result = result;
        execution.status = 'success';
        execution.endTime = new Date();
        execution.duration = 0;

        await this.models.ScheduledRunResult.update(this.toScheduledRunResultRecord(result), {
          where: { id: runningResult.id },
        });
        return executionId;
      }

      // 实际执行
      const result = await this.executeCollectionRun(schedule, options.metadata);

      execution.result = result;
      execution.status = result.status;
      execution.endTime = new Date();
      execution.duration = result.duration;

      await this.models.ScheduledRunResult.update(this.toScheduledRunResultRecord(result), {
        where: { id: runningResult.id },
      });

      // 更新任务的最后/下次运行时间
      await this.updateScheduleRunTimes(scheduleId, startTime);
      await this.models.ScheduledRun.update(
        {
          last_run_at: new Date(),
          updated_at: new Date(),
        },
        { where: { id: scheduleId } }
      );

      return executionId;
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = Date.now() - startTime.getTime();
      execution.error = error instanceof Error ? error.message : String(error);

      const nextRetryAt =
        retryCount < this.maxRetries ? new Date(Date.now() + this.retryIntervalMs) : undefined;
      const failedResult: ScheduledRunResult = {
        id: runningResult.id,
        scheduledRunId: scheduleId,
        status: 'failed',
        startedAt: startTime,
        completedAt: new Date(),
        duration: execution.duration,
        totalRequests: 0,
        passedRequests: 0,
        failedRequests: 0,
        errorCount: 1,
        logs: [`Execution failed: ${execution.error}`],
        triggeredBy,
        metadata: {
          error: execution.error,
          retryCount,
          nextRetryAt: nextRetryAt ? nextRetryAt.toISOString() : null,
          ...baseMetadata,
        },
      };

      await this.models.ScheduledRunResult.update(this.toScheduledRunResultRecord(failedResult), {
        where: { id: runningResult.id },
      });

      if (nextRetryAt) {
        this.scheduleRetry(scheduleId, retryCount + 1, nextRetryAt, {
          ...baseMetadata,
          previousExecutionId: executionId,
        });
      }
      throw error;
    }
  }

  /**
   * 获取执行结果
   */
  async getExecution(executionId: string): Promise<JobExecution | null> {
    return this.executions.get(executionId) || null;
  }

  /**
   * 获取所有执行结果
   */
  async getAllExecutions(): Promise<JobExecution[]> {
    return Array.from(this.executions.values());
  }

  /**
   * 取消执行
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.duration = Date.now() - execution.startTime.getTime();

    if (execution.result) {
      execution.result.status = 'cancelled';
    }

    return true;
  }

  /**
   * 获取统计信息
   */
  async getStatistics(workspaceId?: string): Promise<ScheduledRunStatistics> {
    const scheduleWhere = workspaceId ? { workspace_id: workspaceId } : undefined;
    const schedules = await this.models.ScheduledRun.findAll({ where: scheduleWhere });

    let results: ScheduledRunResultRecord[] = [];
    if (schedules.length > 0) {
      const scheduleIds = schedules.map(schedule => schedule.id);
      results = await this.models.ScheduledRunResult.findAll({
        where: workspaceId ? { scheduled_run_id: scheduleIds } : undefined,
      });
    }

    const totalSchedules = schedules.length;
    const activeSchedules = schedules.filter(s => s.status === 'active').length;
    const totalExecutions = results.length;
    const successfulExecutions = results.filter(r => r.status === 'success').length;
    const failedExecutions = results.filter(r => r.status === 'failed').length;

    const durations = results
      .map(result => result.duration)
      .filter((duration): duration is number => typeof duration === 'number');
    const averageExecutionTime =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0;

    const byCollection: Record<string, number> = {};
    const byEnvironment: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    schedules.forEach(schedule => {
      byCollection[schedule.collection_id] = (byCollection[schedule.collection_id] || 0) + 1;
      const envId = schedule.environment_id || 'unknown';
      byEnvironment[envId] = (byEnvironment[envId] || 0) + 1;
      byStatus[schedule.status] = (byStatus[schedule.status] || 0) + 1;
    });

    const trends = this.calculateExecutionTrends(results);

    return {
      totalSchedules,
      activeSchedules,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      byCollection,
      byEnvironment,
      byStatus,
      trends,
    };
  }

  /**
   * 调度任务
   */
  private async scheduleJob(schedule: ScheduledRunRecord): Promise<void> {
    if (!cron.validate(schedule.cron_expression)) {
      throw new Error(`Invalid cron expression: ${schedule.cron_expression}`);
    }

    const config: ScheduledRunConfig = {
      id: schedule.id,
      name: schedule.name || '',
      description: schedule.description || '',
      cronExpression: schedule.cron_expression,
      timezone: schedule.timezone || 'UTC',
      collectionId: schedule.collection_id,
      environmentId: schedule.environment_id || '',
      status: schedule.status as ScheduledRunConfig['status'],
      lastRunAt: schedule.last_run_at || undefined,
      nextRunAt: schedule.next_run_at || undefined,
      createdAt: schedule.created_at || new Date(),
      updatedAt: schedule.updated_at || new Date(),
      config: schedule.config || {},
      createdBy: schedule.created_by || undefined,
    };

    const task = cron.schedule(
      schedule.cron_expression,
      async () => {
        try {
          await this.executeSchedule(schedule.id);
        } catch (error) {
          console.error(`Scheduled execution failed for ${schedule.name}:`, error);
        }
      },
      {
        timezone: schedule.timezone || 'UTC',
      }
    );

    this.jobs.set(schedule.id, { task, config });
    task.start();
  }

  private scheduleRetry(
    scheduleId: string,
    retryCount: number,
    nextRetryAt: Date,
    metadata: Record<string, unknown>
  ) {
    const delay = Math.max(nextRetryAt.getTime() - Date.now(), 0);
    setTimeout(() => {
      this.executeSchedule(scheduleId, {
        metadata: {
          ...metadata,
          triggeredBy: 'retry',
          retryCount,
        },
      }).catch(error => {
        console.error(`Retry execution failed for schedule ${scheduleId}:`, error);
      });
    }, delay);
  }

  private getNextRunAt(schedule: ScheduledRunRecord, fromDate: Date): Date | null {
    try {
      const interval = cronParser.parseExpression(schedule.cron_expression, {
        currentDate: fromDate,
        tz: schedule.timezone || 'UTC',
      });
      return interval.next().toDate();
    } catch (error) {
      console.error('Failed to calculate next run time:', error);
      return null;
    }
  }

  private getPreviousRunAt(schedule: ScheduledRunRecord, fromDate: Date): Date | null {
    try {
      const interval = cronParser.parseExpression(schedule.cron_expression, {
        currentDate: fromDate,
        tz: schedule.timezone || 'UTC',
      });
      return interval.prev().toDate();
    } catch (error) {
      console.error('Failed to calculate previous run time:', error);
      return null;
    }
  }

  private async updateScheduleNextRunAt(schedule: ScheduledRunRecord): Promise<void> {
    const nextRunAt = this.getNextRunAt(schedule, new Date());
    if (!nextRunAt) {
      return;
    }
    await this.models.ScheduledRun.update(
      { next_run_at: nextRunAt, updated_at: new Date() },
      { where: { id: schedule.id } }
    );
  }

  private async updateScheduleRunTimes(scheduleId: string, startedAt: Date): Promise<void> {
    const schedule = await this.models.ScheduledRun.findByPk(scheduleId);
    if (!schedule) {
      return;
    }
    const nextRunAt = this.getNextRunAt(schedule, startedAt);
    await this.models.ScheduledRun.update(
      {
        last_run_at: new Date(),
        next_run_at: nextRunAt || schedule.next_run_at,
        updated_at: new Date(),
      },
      { where: { id: scheduleId } }
    );
  }

  private async recoverRunningExecutions(): Promise<void> {
    const runningResults = await this.models.ScheduledRunResult.findAll({
      where: { status: 'running' },
    });
    if (!runningResults.length) {
      return;
    }
    const now = new Date();
    await Promise.all(
      runningResults.map(async result => {
        const startedAt = result.started_at ? new Date(result.started_at) : now;
        const duration = now.getTime() - startedAt.getTime();
        const existingMetadata = (result.metadata || {}) as Record<string, unknown>;
        const retryCount =
          typeof existingMetadata.retryCount === 'number' ? existingMetadata.retryCount : 0;
        await this.models.ScheduledRunResult.update(
          {
            status: 'failed',
            completed_at: now,
            duration,
            error_count: 1,
            logs: [...(result.logs || []), 'Marked failed due to service restart'],
            metadata: {
              ...existingMetadata,
              error: 'Marked failed due to service restart',
              retryCount,
              recoveredAt: now.toISOString(),
            },
            updated_at: now,
          },
          { where: { id: result.id } }
        );
      })
    );
  }

  private async resumeScheduledRetries(): Promise<void> {
    const failedResults = await this.models.ScheduledRunResult.findAll({
      where: { status: 'failed' },
    });
    if (!failedResults.length) {
      return;
    }
    const now = new Date();
    for (const result of failedResults) {
      const metadata = (result.metadata || {}) as Record<string, unknown>;
      const retryCount = typeof metadata.retryCount === 'number' ? metadata.retryCount : 0;
      const nextRetryAtRaw = metadata.nextRetryAt as string | undefined;
      const nextRetryAt = nextRetryAtRaw ? new Date(nextRetryAtRaw) : null;
      if (!nextRetryAt || retryCount >= this.maxRetries || nextRetryAt > now) {
        continue;
      }
      this.scheduleRetry(result.scheduled_run_id, retryCount + 1, now, {
        ...metadata,
        resumedFromExecutionId: result.id,
      });
    }
  }

  private async compensateMissedRuns(schedules: ScheduledRunRecord[]): Promise<void> {
    const now = new Date();
    for (const schedule of schedules) {
      const lastRunAt = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
      const previousRunAt = this.getPreviousRunAt(schedule, now);
      if (previousRunAt && (!lastRunAt || lastRunAt < previousRunAt)) {
        await this.executeSchedule(schedule.id, {
          metadata: {
            triggeredBy: 'recovery',
            recoveryFor: previousRunAt.toISOString(),
          },
        });
      }
      await this.updateScheduleNextRunAt(schedule);
    }
  }

  /**
   * 重新调度任务
   */
  private async rescheduleJob(scheduleId: string): Promise<void> {
    await this.unscheduleJob(scheduleId);

    const schedule = await this.models.ScheduledRun.findByPk(scheduleId);
    if (schedule && schedule.status === 'active') {
      await this.scheduleJob(schedule);
    }
  }

  /**
   * 取消调度任务
   */
  private async unscheduleJob(scheduleId: string): Promise<void> {
    const job = this.jobs.get(scheduleId);
    if (job) {
      job.task.stop();
      this.jobs.delete(scheduleId);
    }
  }

  /**
   * 执行集合运行
   */
  private async executeCollectionRun(
    schedule: ScheduledRunRecord,
    metadata?: Record<string, unknown>
  ): Promise<ScheduledRunResult> {
    const startTime = new Date();

    try {
      // 获取环境配置
      const environment = schedule.environment_id
        ? await this.environmentManager.getEnvironment(schedule.environment_id)
        : null;

      // 执行集合
      const result = await this.collectionManager.executeCollection(
        schedule.collection_id,
        schedule.environment_id || '',
        { environment }
      );

      const runResult: ScheduledRunResult = {
        id: this.generateId(),
        scheduledRunId: schedule.id,
        status: result.failedRequests === 0 ? 'success' : 'failed',
        startedAt: startTime,
        completedAt: new Date(),
        duration: result.duration,
        totalRequests: result.totalRequests,
        passedRequests: result.passedRequests,
        failedRequests: result.failedRequests,
        errorCount: result.errorCount,
        logs: result.logs,
        triggeredBy: (metadata?.triggeredBy as ScheduledRunResult['triggeredBy']) || 'schedule',
        metadata: (() => {
          const next = { ...(metadata || {}) };
          if (next.triggeredBy !== undefined) {
            delete next.triggeredBy;
          }
          return next;
        })(),
      };

      return runResult;
    } catch (error) {
      const failedResult: ScheduledRunResult = {
        id: this.generateId(),
        scheduledRunId: schedule.id,
        status: 'failed',
        startedAt: startTime,
        completedAt: new Date(),
        duration: Date.now() - startTime.getTime(),
        totalRequests: 0,
        passedRequests: 0,
        failedRequests: 0,
        errorCount: 1,
        logs: [
          `Collection execution failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
        triggeredBy: (metadata?.triggeredBy as ScheduledRunResult['triggeredBy']) || 'schedule',
        metadata: (() => {
          const next: Record<string, unknown> = {
            error: error instanceof Error ? error.message : String(error),
            ...(metadata || {}),
          };
          if (next.triggeredBy !== undefined) {
            delete next.triggeredBy;
          }
          return next;
        })(),
      };
      return failedResult;
    }
  }

  /**
   * 计算执行趋势
   */
  private calculateExecutionTrends(results: ScheduledRunResultRecord[]): Array<{
    date: string;
    executions: number;
    successRate: number;
    averageTime: number;
  }> {
    const dailyStats: Record<
      string,
      {
        executions: number;
        successes: number;
        totalTime: number;
      }
    > = {};

    results.forEach(result => {
      if (result.completed_at) {
        const date = result.completed_at.toISOString().split('T')[0];

        if (!dailyStats[date]) {
          dailyStats[date] = { executions: 0, successes: 0, totalTime: 0 };
        }

        dailyStats[date].executions++;
        if (result.status === 'success') {
          dailyStats[date].successes++;
        }
        if (result.duration) {
          dailyStats[date].totalTime += result.duration;
        }
      }
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        executions: stats.executions,
        successRate: stats.executions > 0 ? (stats.successes / stats.executions) * 100 : 0,
        averageTime: stats.executions > 0 ? stats.totalTime / stats.executions : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private toScheduledRunResultRecord(result: ScheduledRunResult): ScheduledRunResultRecord {
    const triggeredBy =
      result.triggeredBy || (result.metadata?.triggeredBy as ScheduledRunResult['triggeredBy']);
    return {
      id: result.id,
      scheduled_run_id: result.scheduledRunId,
      status: result.status,
      started_at: result.startedAt,
      completed_at: result.completedAt,
      duration: result.duration,
      total_requests: result.totalRequests,
      passed_requests: result.passedRequests,
      failed_requests: result.failedRequests,
      error_count: result.errorCount,
      logs: result.logs,
      triggered_by: triggeredBy,
      metadata: result.metadata,
    };
  }
}

export default ScheduledRunService;
