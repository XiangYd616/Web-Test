/**
 * 定时运行服务
 * 提供定时任务调度、执行管理、结果追踪等功能
 */

// 模拟cron功能
interface CronTask {
  start: () => void;
  stop: () => void;
}

interface CronValidator {
  validate: (schedule: string) => boolean;
  schedule: (schedule: string, callback: () => void) => CronTask;
}

const cron: CronValidator = {
  validate: (schedule: string): boolean => {
    const parts = schedule.split(' ');
    return parts.length === 5 || parts.length === 6;
  },
  schedule: (schedule: string, callback: () => void): CronTask => {
    const task: CronTask = {
      start: () => {
        setInterval(callback, 60000); // 简化实现，每分钟执行一次
      },
      stop: () => {
        // 停止任务
      },
    };
    return task;
  },
};

// 模拟数据库模型
interface ScheduledRunModel {
  id: string;
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
}

interface ScheduledRunResultModel {
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
  metadata: Record<string, any>;
}

interface Models {
  ScheduledRun: {
    findAll: (options: any) => Promise<ScheduledRunModel[]>;
    findByPk: (id: string) => Promise<ScheduledRunModel | null>;
    create: (data: any) => Promise<ScheduledRunModel>;
    update: (data: any, options: any) => Promise<[number, ScheduledRunModel[]]>;
    destroy: (options: any) => Promise<number>;
  };
  ScheduledRunResult: {
    create: (data: any) => Promise<ScheduledRunResultModel>;
    findByPk: (id: string) => Promise<ScheduledRunResultModel | null>;
    findAll: (options: any) => Promise<ScheduledRunResultModel[]>;
  };
}

// 模拟CollectionManager
class CollectionManager {
  constructor(options: any) {}

  async executeCollection(
    collectionId: string,
    environmentId: string,
    options: any = {}
  ): Promise<{
    totalRequests: number;
    passedRequests: number;
    failedRequests: number;
    errorCount: number;
    logs: string[];
    duration: number;
  }> {
    // 简化实现
    return {
      totalRequests: 10,
      passedRequests: 8,
      failedRequests: 2,
      errorCount: 2,
      logs: ['Request 1 passed', 'Request 2 failed'],
      duration: 1500,
    };
  }
}

// 模拟EnvironmentManager
class EnvironmentManager {
  constructor(options: any) {}

  async getEnvironment(environmentId: string): Promise<any> {
    return {
      id: environmentId,
      name: 'Production',
      variables: {},
    };
  }
}

// 定时运行配置接口
export interface ScheduledRunConfig {
  id: string;
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
  metadata: Record<string, any>;
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
  private collectionManager: CollectionManager;
  private environmentManager: EnvironmentManager;
  private jobs: Map<string, { task: CronTask; config: ScheduledRunConfig }> = new Map();
  private isRunning: boolean = false;
  private executions: Map<string, JobExecution> = new Map();

  constructor(
    options: {
      models?: Models;
      collectionManager?: CollectionManager;
      environmentManager?: EnvironmentManager;
    } = {}
  ) {
    this.models = options.models || {
      ScheduledRun: {
        findAll: async () => [],
        findByPk: async () => null,
        create: async () => ({}) as ScheduledRunModel,
        update: async () => [0, []],
        destroy: async () => 0,
      },
      ScheduledRunResult: {
        create: async () => ({}) as ScheduledRunResultModel,
        findByPk: async () => null,
        findAll: async () => [],
      },
    };
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
      const schedules = await this.models.ScheduledRun.findAll({ where: { status: 'active' } });

      for (const schedule of schedules) {
        await this.scheduleJob(schedule);
      }

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
    const schedule: ScheduledRunModel = await this.models.ScheduledRun.create({
      ...scheduleData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const config: ScheduledRunConfig = {
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      collectionId: schedule.collectionId,
      environmentId: schedule.environmentId,
      status: schedule.status,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };

    if (config.status === 'active') {
      await this.scheduleJob(config);
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
      name: schedule.name,
      description: schedule.description,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      collectionId: schedule.collectionId,
      environmentId: schedule.environmentId,
      status: schedule.status,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }

  /**
   * 获取所有定时任务
   */
  async getAllSchedules(): Promise<ScheduledRunConfig[]> {
    const schedules = await this.models.ScheduledRun.findAll();

    return schedules.map(schedule => ({
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      collectionId: schedule.collectionId,
      environmentId: schedule.environmentId,
      status: schedule.status,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
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
        ...updates,
        updatedAt: new Date(),
      },
      { where: { id: scheduleId } }
    );

    const updatedSchedule = updatedSchedules[0];

    // 重新调度任务
    if (updates.status || updates.cronExpression) {
      await this.rescheduleJob(scheduleId);
    }

    return {
      id: updatedSchedule.id,
      name: updatedSchedule.name,
      description: updatedSchedule.description,
      cronExpression: updatedSchedule.cronExpression,
      timezone: updatedSchedule.timezone,
      collectionId: updatedSchedule.collectionId,
      environmentId: updatedSchedule.environmentId,
      status: updatedSchedule.status,
      lastRunAt: updatedSchedule.lastRunAt,
      nextRunAt: updatedSchedule.nextRunAt,
      createdAt: updatedSchedule.createdAt,
      updatedAt: updatedSchedule.updatedAt,
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
      metadata?: Record<string, any>;
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

    this.executions.set(executionId, execution);

    try {
      if (options.dryRun) {
        // 干运行模式
        const result: ScheduledRunResult = {
          id: this.generateId(),
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
          metadata: { dryRun: true, ...options.metadata },
        };

        execution.result = result;
        execution.status = 'success';
        execution.endTime = new Date();
        execution.duration = 0;

        await this.models.ScheduledRunResult.create(result);
        return executionId;
      }

      // 实际执行
      const result = await this.executeCollectionRun(schedule, options.metadata);

      execution.result = result;
      execution.status = result.status;
      execution.endTime = new Date();
      execution.duration = result.duration;

      // 更新任务的最后运行时间
      await this.models.ScheduledRun.update(
        {
          lastRunAt: new Date(),
          updatedAt: new Date(),
        },
        { where: { id: scheduleId } }
      );

      return executionId;
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = Date.now() - startTime.getTime();
      execution.error = error instanceof Error ? error.message : String(error);

      const failedResult: ScheduledRunResult = {
        id: this.generateId(),
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
        metadata: { error: execution.error, ...options.metadata },
      };

      await this.models.ScheduledRunResult.create(failedResult);
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
  async getStatistics(): Promise<ScheduledRunStatistics> {
    const schedules = await this.models.ScheduledRun.findAll();
    const results = await this.models.ScheduledRunResult.findAll();

    const totalSchedules = schedules.length;
    const activeSchedules = schedules.filter(s => s.status === 'active').length;
    const totalExecutions = results.length;
    const successfulExecutions = results.filter(r => r.status === 'success').length;
    const failedExecutions = results.filter(r => r.status === 'failed').length;

    const durations = results.filter(r => r.duration).map(r => r.duration!);
    const averageExecutionTime =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0;

    const byCollection: Record<string, number> = {};
    const byEnvironment: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    schedules.forEach(schedule => {
      byCollection[schedule.collectionId] = (byCollection[schedule.collectionId] || 0) + 1;
      byEnvironment[schedule.environmentId] = (byEnvironment[schedule.environmentId] || 0) + 1;
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
  private async scheduleJob(schedule: ScheduledRunModel): Promise<void> {
    if (!cron.validate(schedule.cronExpression)) {
      throw new Error(`Invalid cron expression: ${schedule.cronExpression}`);
    }

    const config: ScheduledRunConfig = {
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      collectionId: schedule.collectionId,
      environmentId: schedule.environmentId,
      status: schedule.status,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };

    const task = cron.schedule(schedule.cronExpression, async () => {
      try {
        await this.executeSchedule(schedule.id);
      } catch (error) {
        console.error(`Scheduled execution failed for ${schedule.name}:`, error);
      }
    });

    this.jobs.set(schedule.id, { task, config });
    task.start();
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
    schedule: ScheduledRunModel,
    metadata?: Record<string, any>
  ): Promise<ScheduledRunResult> {
    const startTime = new Date();

    try {
      // 获取环境配置
      const environment = await this.environmentManager.getEnvironment(schedule.environmentId);

      // 执行集合
      const result = await this.collectionManager.executeCollection(
        schedule.collectionId,
        schedule.environmentId,
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
        metadata: metadata || {},
      };

      await this.models.ScheduledRunResult.create(runResult);
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
        metadata: { error: error instanceof Error ? error.message : String(error), ...metadata },
      };

      await this.models.ScheduledRunResult.create(failedResult);
      throw error;
    }
  }

  /**
   * 计算执行趋势
   */
  private calculateExecutionTrends(results: ScheduledRunResultModel[]): Array<{
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
      if (result.completedAt) {
        const date = result.completedAt.toISOString().split('T')[0];

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
}

export default ScheduledRunService;
