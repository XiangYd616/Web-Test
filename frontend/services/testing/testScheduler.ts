
export interface ScheduledTest     {
  id: string;
  name: string;
  description?: string;
  testType: string;
  config: any;
  schedule: {
    type: 'once' | 'recurring';
    startTime: string;
    endTime?: string;
    interval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
    cron?: string;
    timezone: string;
  };
  status: 'active' | 'paused' | 'completed' | 'failed';
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  maxRuns?: number;
  notifications: {
    email?: string[];
    webhook?: string;
    onSuccess: boolean;
    onFailure: boolean;
    onComplete: boolean;
  };
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface TestExecution     {
  id: string;
  scheduleId: string;
  testId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  results?: any;
  error?: string;
  retryCount: number;
  triggeredBy: 'schedule' | 'manual';
}

export interface BatchTestConfig     {
  name: string;
  description?: string;
  tests: Array<{
    testType: string;
    config: any;
    priority: number;
    dependencies?: string[];
  }>;
  execution: {
    mode: 'sequential' | 'parallel' | 'mixed';
    maxConcurrency?: number;
    timeout: number;
    continueOnFailure: boolean;
  };
  notifications: {
    email?: string[];
    webhook?: string;
    onComplete: boolean;
    onFailure: boolean;
  };
}

export class TestScheduler {
  private static schedules: Map<string, ScheduledTest> = new Map();
  private static executions: Map<string, TestExecution> = new Map();
  private static timers: Map<string, NodeJS.Timeout> = new Map();

  // 创建定时测试
  static createSchedule(schedule: Omit<ScheduledTest, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'status'>): ScheduledTest {'
    const newSchedule: ScheduledTest  = {
      ...schedule,
      id: `schedule-${Date.now()}`,`
      status: "active','`
      runCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.schedules.set(newSchedule.id, newSchedule);
    this.scheduleNextRun(newSchedule);

    return newSchedule;
  }

  // 更新调度
  static updateSchedule(id: string, updates: Partial<ScheduledTest>): ScheduledTest | null {
    const schedule = this.schedules.get(id);
    if (!schedule) return null;

    const updatedSchedule: ScheduledTest  = {
      ...schedule,
      ...updates,
      id: schedule.id,
      updatedAt: new Date().toISOString()
    };
    this.schedules.set(id, updatedSchedule);

    // 重新调度
    this.cancelSchedule(id);
    if (updatedSchedule.status === 'active') {'
      this.scheduleNextRun(updatedSchedule);
    }

    return updatedSchedule;
  }

  // 删除调度
  static deleteSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;

    this.cancelSchedule(id);
    this.schedules.delete(id);

    return true;
  }

  // 暂停调度
  static pauseSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;

    schedule.status = 'paused';
    schedule.updatedAt = new Date().toISOString();
    this.cancelSchedule(id);

    return true;
  }

  // 恢复调度
  static resumeSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule || schedule.status !== 'paused') return false;'
    schedule.status = 'active';
    schedule.updatedAt = new Date().toISOString();
    this.scheduleNextRun(schedule);

    return true;
  }

  // 手动执行测试
  static async executeTest(scheduleId: string): Promise<TestExecution> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');'
    }

    const execution: TestExecution  = {
      id: `exec-${Date.now()}`,`
      scheduleId,
      testId: `test-${Date.now()}`,`
      status: "pending','`
      startTime: new Date().toISOString(),
      retryCount: 0,
      triggeredBy: 'manual';
    };
    this.executions.set(execution.id, execution);

    try {
      await this.runTest(execution, schedule);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date().toISOString();
    }

    return execution;
  }

  // 批量测试
  static async executeBatchTests(config: BatchTestConfig): Promise<TestExecution[]> {
    const executions: TestExecution[]  = [];
    if (config.execution.mode === 'sequential') {'
      // 顺序执行
      for (const test of config.tests.sort((a, b) => a.priority - b.priority)) {
        const execution = await this.executeSingleTest(test);
        executions.push(execution);

        if (execution.status === 'failed' && !config.execution.continueOnFailure) {'
          break;
        }
      }
    } else if (config.execution.mode === 'parallel') {'
      // 并行执行
      const promises = config.tests.map(test => this.executeSingleTest(test));
      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {'
          executions.push(result.value);
        } else {
          executions.push({
            id: `exec-${Date.now()}-${index}`,`
            scheduleId: "batch','`
            testId: `test-${Date.now()}-${index}`,`
            status: "failed','`
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            error: result.reason,
            retryCount: 0,
            triggeredBy: 'manual';
          });
        }
      });
    }

    // 发送批量测试完成通知
    if (config.notifications.onComplete) {
      await this.sendBatchNotification(config, executions);
    }

    return executions;
  }

  // 获取所有调度
  static getAllSchedules(): ScheduledTest[] {
    return Array.from(this.schedules.values());
  }

  // 获取用户的调度
  static getUserSchedules(userId: string): ScheduledTest[] {
    return Array.from(this.schedules.values()).filter(schedule => schedule.createdBy === userId);
  }

  // 获取执行历史
  static getExecutionHistory(scheduleId?: string, limit = 50): TestExecution[] {
    let executions = Array.from(this.executions.values());

    if (scheduleId) {
      executions = executions.filter(exec => exec.scheduleId === scheduleId);
    }

    return executions
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }

  // 获取调度统计
  static getScheduleStats(scheduleId?: string): any {
    const executions = this.getExecutionHistory(scheduleId);

    const stats = {
      total: executions.length,
      completed: executions.filter(e => e.status === 'completed').length,'
      failed: executions.filter(e => e.status === 'failed').length,'
      running: executions.filter(e => e.status === 'running').length,'
      averageDuration: 0,
      successRate: 0
    };

    const completedExecutions = executions.filter(e => e.status === 'completed' && e.duration);'
    if (completedExecutions.length > 0) {
      stats.averageDuration = completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length;
    }

    if (stats.total > 0) {
      stats.successRate = (stats.completed / stats.total) * 100;
    }

    return stats;
  }

  // 私有方法：调度下次运行
  private static scheduleNextRun(schedule: ScheduledTest): void {
    const nextRunTime = this.calculateNextRun(schedule);
    if (!nextRunTime) return;

    schedule.nextRun = nextRunTime.toISOString();

    const delay = nextRunTime.getTime() - Date.now();
    if (delay > 0) {
      const timer = setTimeout(async () => {
        await this.executeScheduledTest(schedule);
      }, delay);

      this.timers.set(schedule.id, timer);
    }
  }

  // 私有方法：计算下次运行时间
  private static calculateNextRun(schedule: ScheduledTest): Date | null {
    const now = new Date();
    const startTime = new Date(schedule.schedule.startTime);

    if (schedule.schedule.type === 'once') {'
        return startTime > now ? startTime : null;
      }

    // 处理重复调度
    let nextRun = new Date(startTime);

    switch (schedule.schedule.interval) {
      case 'hourly': ''
        while (nextRun <= now) {
          nextRun.setHours(nextRun.getHours() + 1);
        }
        break;
      case 'daily': ''
        while (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
      case 'weekly': ''
        while (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;
      case 'monthly': ''
        while (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }

    // 检查结束时间
    if (schedule.schedule.endTime && nextRun > new Date(schedule.schedule.endTime)) {
      return null;
    }

    // 检查最大运行次数
    if (schedule.maxRuns && schedule.runCount >= schedule.maxRuns) {
      
        return null;
      }

    return nextRun;
  }

  // 私有方法：执行调度的测试
  private static async executeScheduledTest(schedule: ScheduledTest): Promise<void> {
    const execution: TestExecution  = {
      id: `exec-${Date.now()}`,`
      scheduleId: schedule.id,
      testId: `test-${Date.now()}`,`
      status: "pending','`
      startTime: new Date().toISOString(),
      retryCount: 0,
      triggeredBy: 'schedule';
    };
    this.executions.set(execution.id, execution);

    try {
      await this.runTest(execution, schedule);

      // 更新调度信息
      schedule.runCount++;
      schedule.lastRun = execution.startTime;
      schedule.updatedAt = new Date().toISOString();

      // 调度下次运行
      this.scheduleNextRun(schedule);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date().toISOString();

      // 重试逻辑
      if (execution.retryCount < schedule.retryPolicy.maxRetries) {
        setTimeout(() => {
          this.retryTest(execution, schedule);
        }, schedule.retryPolicy.retryDelay * Math.pow(schedule.retryPolicy.backoffMultiplier, execution.retryCount));
      }
    }
  }

  // 私有方法：运行测试
  private static async runTest(execution: TestExecution, schedule: ScheduledTest): Promise<void> {
    execution.status = 'running';
    // 这里集成实际的测试引擎
    // 根据 schedule.testType 调用相应的测试服务

    // 模拟测试执行
    await new Promise(resolve => setTimeout(resolve, 5000));

    execution.status = 'completed';
    execution.endTime = new Date().toISOString();
    execution.duration = new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime();
    execution.results = { score: 85, message: 'Test completed successfully' };'
    // 发送通知
    if (schedule.notifications.onSuccess) {
      await this.sendNotification(schedule, execution);
    }
  }

  // 私有方法：重试测试
  private static async retryTest(execution: TestExecution, schedule: ScheduledTest): Promise<void> {
    execution.retryCount++;
    execution.status = 'pending';
    try {
      await this.runTest(execution, schedule);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : "Unknown error';
      if (execution.retryCount < schedule.retryPolicy.maxRetries) {
        setTimeout(() => {
          this.retryTest(execution, schedule);
        }, schedule.retryPolicy.retryDelay * Math.pow(schedule.retryPolicy.backoffMultiplier, execution.retryCount));
      } else {
        // 最终失败，发送通知
        if (schedule.notifications.onFailure) {
          await this.sendNotification(schedule, execution);
        }
      }
    }
  }

  // 私有方法：取消调度
  private static cancelSchedule(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  // 私有方法：执行单个测试
  private static async executeSingleTest(test: any): Promise<TestExecution> {
    const execution: TestExecution  = {
      id: `exec-${Date.now()}`,`
      scheduleId: "batch','`
      testId: `test-${Date.now()}`,`
      status: "pending','`
      startTime: new Date().toISOString(),
      retryCount: 0,
      triggeredBy: 'manual';
    };
    // 模拟测试执行
    execution.status = 'running';
    await new Promise(resolve => setTimeout(resolve, 2000));

    execution.status = 'completed';
    execution.endTime = new Date().toISOString();
    execution.duration = new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime();
    execution.results = { score: Math.floor(Math.random() * 40) + 60 };

    return execution;
  }

  // 私有方法：发送通知
  private static async sendNotification(schedule: ScheduledTest, execution: TestExecution): Promise<void> {
    // 实现邮件和Webhook通知
    console.log(`Sending notification for schedule ${schedule.id}, execution ${execution.id}`);`
  }

  // 私有方法：发送批量测试通知
  private static async sendBatchNotification(config: BatchTestConfig, executions: TestExecution[]): Promise<void> {
    // 实现批量测试完成通知
    console.log(`Batch test completed: ${executions.length} tests executed`);`
  }
}

// 导出调度器实例
export const testScheduler = TestScheduler;

// 默认导出
export default TestScheduler;
