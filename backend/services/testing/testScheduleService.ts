import cronParser from 'cron-parser';
import { query } from '../../config/database';
import testService from './testService';

type TestScheduleRecord = {
  id: number;
  user_id: string;
  template_id?: number | null;
  schedule_name: string;
  engine_type: string;
  test_url?: string | null;
  test_config?: Record<string, unknown> | null;
  schedule_type: string;
  cron_expression?: string | null;
  timezone?: string | null;
  is_active: boolean;
  last_run_at?: Date | null;
  next_run_at?: Date | null;
  run_count: number;
  created_at: Date;
  updated_at: Date;
};

type TestScheduleInput = {
  scheduleName: string;
  engineType: string;
  testUrl?: string;
  testConfig?: Record<string, unknown>;
  templateId?: number;
  scheduleType: 'once' | 'daily' | 'weekly' | 'monthly' | 'cron';
  cronExpression?: string;
  timezone?: string;
  nextRunAt?: Date | string;
  isActive?: boolean;
};

type TestScheduleSummary = {
  id: number;
  scheduleName: string;
  engineType: string;
  testUrl?: string;
  scheduleType: string;
  cronExpression?: string | null;
  timezone?: string | null;
  isActive: boolean;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
  templateId?: number | null;
  testConfig: Record<string, unknown>;
};

class TestScheduleService {
  private schedulerTimer: NodeJS.Timeout | null = null;
  private runningSchedules = new Set<number>();

  startScheduler(pollMs = 60000): void {
    if (this.schedulerTimer) {
      return;
    }
    this.schedulerTimer = setInterval(() => {
      this.runDueSchedules().catch((error: unknown) => {
        console.error('调度轮询执行失败', error);
      });
    }, pollMs);
  }

  stopScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private normalizeScheduleConfig(config: Record<string, unknown>): Record<string, unknown> {
    const scheduleOptions = (config.scheduleOptions as Record<string, unknown>) || {};
    const maxRetriesRaw = Number(scheduleOptions.maxRetries ?? 0);
    const retryDelayRaw = Number(scheduleOptions.retryDelayMinutes ?? 5);

    const maxRetries = Number.isFinite(maxRetriesRaw)
      ? Math.min(Math.max(maxRetriesRaw, 0), 10)
      : 0;
    const retryDelayMinutes = Number.isFinite(retryDelayRaw)
      ? Math.min(Math.max(retryDelayRaw, 1), 120)
      : 5;

    return {
      ...config,
      scheduleOptions: {
        ...scheduleOptions,
        maxRetries,
        retryDelayMinutes,
        retryCount: typeof scheduleOptions.retryCount === 'number' ? scheduleOptions.retryCount : 0,
      },
    };
  }

  private parseJsonValue<T>(value: unknown, fallback: T): T {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
    if (value !== null && value !== undefined) {
      return value as T;
    }
    return fallback;
  }

  private extractScheduleOptions(config: Record<string, unknown>): {
    maxRetries: number;
    retryDelayMinutes: number;
    retryCount: number;
  } {
    const scheduleOptions = (config.scheduleOptions as Record<string, unknown>) || {};
    return {
      maxRetries: typeof scheduleOptions.maxRetries === 'number' ? scheduleOptions.maxRetries : 0,
      retryDelayMinutes:
        typeof scheduleOptions.retryDelayMinutes === 'number'
          ? scheduleOptions.retryDelayMinutes
          : 5,
      retryCount: typeof scheduleOptions.retryCount === 'number' ? scheduleOptions.retryCount : 0,
    };
  }

  private applyScheduleOptions(
    config: Record<string, unknown>,
    options: { retryCount: number; lastError?: string }
  ): Record<string, unknown> {
    const existing = (config.scheduleOptions as Record<string, unknown>) || {};
    return {
      ...config,
      scheduleOptions: {
        ...existing,
        retryCount: options.retryCount,
        lastError: options.lastError,
      },
    };
  }

  async listSchedules(
    userId: string,
    limit = 20,
    offset = 0,
    engineType?: string,
    isActive?: boolean
  ): Promise<{ schedules: TestScheduleSummary[]; total: number; hasMore: boolean }> {
    const params: Array<string | number | boolean> = [userId];
    let whereClause = 'WHERE user_id = $1';

    if (engineType) {
      params.push(engineType);
      whereClause += ` AND engine_type = $${params.length}`;
    }

    if (typeof isActive === 'boolean') {
      params.push(isActive);
      whereClause += ` AND is_active = $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM test_schedules ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    const listResult = await query(
      `SELECT * FROM test_schedules ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const schedules = listResult.rows.map(row => this.formatSchedule(row as TestScheduleRecord));

    return {
      schedules,
      total,
      hasMore: offset + limit < total,
    };
  }

  async getSchedule(userId: string, scheduleId: number): Promise<TestScheduleSummary> {
    const schedule = await this.findSchedule(userId, scheduleId);
    if (!schedule) {
      throw new Error('调度任务不存在');
    }
    return this.formatSchedule(schedule);
  }

  async createSchedule(userId: string, payload: TestScheduleInput): Promise<TestScheduleSummary> {
    const nextRunAt = this.resolveNextRunAt(payload);
    const normalizedConfig = this.normalizeScheduleConfig(payload.testConfig || {});
    const insertResult = await query(
      `INSERT INTO test_schedules
        (user_id, template_id, schedule_name, engine_type, test_url, test_config,
         schedule_type, cron_expression, timezone, is_active, next_run_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId,
        payload.templateId ?? null,
        payload.scheduleName,
        payload.engineType,
        payload.testUrl || null,
        JSON.stringify(normalizedConfig),
        payload.scheduleType,
        payload.cronExpression || null,
        payload.timezone || 'UTC',
        payload.isActive ?? true,
        nextRunAt,
      ]
    );

    return this.formatSchedule(insertResult.rows[0] as TestScheduleRecord);
  }

  async updateSchedule(
    userId: string,
    scheduleId: number,
    updates: Partial<TestScheduleInput>
  ): Promise<TestScheduleSummary> {
    const schedule = await this.findSchedule(userId, scheduleId);
    if (!schedule) {
      throw new Error('调度任务不存在');
    }

    const nextRunAt = this.resolveNextRunAt({
      scheduleName: schedule.schedule_name,
      engineType: schedule.engine_type,
      scheduleType: (updates.scheduleType ||
        schedule.schedule_type) as TestScheduleInput['scheduleType'],
      cronExpression: updates.cronExpression ?? schedule.cron_expression ?? undefined,
      timezone: updates.timezone ?? schedule.timezone ?? undefined,
      nextRunAt: updates.nextRunAt ?? schedule.next_run_at ?? undefined,
    });

    const result = await query(
      `UPDATE test_schedules
       SET schedule_name = $1,
           engine_type = $2,
           test_url = $3,
           test_config = $4,
           template_id = $5,
           schedule_type = $6,
           cron_expression = $7,
           timezone = $8,
           is_active = $9,
           next_run_at = $10,
           updated_at = NOW()
       WHERE id = $11 AND user_id = $12
       RETURNING *`,
      [
        updates.scheduleName ?? schedule.schedule_name,
        updates.engineType ?? schedule.engine_type,
        updates.testUrl ?? schedule.test_url ?? null,
        JSON.stringify(
          this.normalizeScheduleConfig(updates.testConfig ?? schedule.test_config ?? {})
        ),
        updates.templateId ?? schedule.template_id ?? null,
        updates.scheduleType ?? schedule.schedule_type,
        updates.cronExpression ?? schedule.cron_expression ?? null,
        updates.timezone ?? schedule.timezone ?? 'UTC',
        updates.isActive ?? schedule.is_active,
        nextRunAt,
        scheduleId,
        userId,
      ]
    );

    return this.formatSchedule(result.rows[0] as TestScheduleRecord);
  }

  async deleteSchedule(userId: string, scheduleId: number): Promise<void> {
    await query('DELETE FROM test_schedules WHERE id = $1 AND user_id = $2', [scheduleId, userId]);
  }

  async toggleSchedule(
    userId: string,
    scheduleId: number,
    isActive: boolean
  ): Promise<TestScheduleSummary> {
    const schedule = await this.findSchedule(userId, scheduleId);
    if (!schedule) {
      throw new Error('调度任务不存在');
    }

    const result = await query(
      `UPDATE test_schedules
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [isActive, scheduleId, userId]
    );

    return this.formatSchedule(result.rows[0] as TestScheduleRecord);
  }

  async executeSchedule(
    userId: string,
    scheduleId: number,
    role = 'free'
  ): Promise<Record<string, unknown>> {
    const schedule = await this.findSchedule(userId, scheduleId);
    if (!schedule) {
      throw new Error('调度任务不存在');
    }

    const scheduleConfig = (schedule.test_config || {}) as Record<string, unknown>;
    const scheduleOptions = this.extractScheduleOptions(scheduleConfig);
    const maxRetries = scheduleOptions.maxRetries;
    const retryDelayMinutes = scheduleOptions.retryDelayMinutes;
    let retryCount = scheduleOptions.retryCount;

    const config = {
      url: schedule.test_url || '',
      testType: schedule.engine_type,
      options: schedule.test_config || {},
      templateId: schedule.template_id ? String(schedule.template_id) : undefined,
      scheduleId,
    };

    try {
      const result = await testService.createAndStart(config, { userId, role });
      const nextRunAt = this.resolveNextRunAt({
        scheduleName: schedule.schedule_name,
        engineType: schedule.engine_type,
        scheduleType: schedule.schedule_type as TestScheduleInput['scheduleType'],
        cronExpression: schedule.cron_expression ?? undefined,
        timezone: schedule.timezone ?? undefined,
        nextRunAt: schedule.next_run_at ?? undefined,
      });

      const nextActive = schedule.schedule_type === 'once' ? false : schedule.is_active;
      const updatedConfig = this.applyScheduleOptions(scheduleConfig, {
        retryCount: 0,
        lastError: undefined,
      });

      await query(
        `UPDATE test_schedules
         SET last_run_at = NOW(),
             next_run_at = $1,
             run_count = run_count + 1,
             is_active = $2,
             test_config = $3,
             updated_at = NOW()
         WHERE id = $4 AND user_id = $5`,
        [nextRunAt, nextActive, JSON.stringify(updatedConfig), scheduleId, userId]
      );

      return result;
    } catch (error) {
      retryCount += 1;
      const shouldRetry = retryCount <= maxRetries && schedule.is_active;
      const retryAt = shouldRetry ? new Date(Date.now() + retryDelayMinutes * 60 * 1000) : null;
      const updatedConfig = this.applyScheduleOptions(scheduleConfig, {
        retryCount,
        lastError: error instanceof Error ? error.message : String(error),
      });

      await query(
        `UPDATE test_schedules
         SET next_run_at = $1,
             run_count = run_count + 1,
             is_active = $2,
             test_config = $3,
             updated_at = NOW()
         WHERE id = $4 AND user_id = $5`,
        [retryAt, shouldRetry, JSON.stringify(updatedConfig), scheduleId, userId]
      );

      throw error;
    }
  }

  async listScheduleRuns(
    userId: string,
    scheduleId: number,
    limit = 20,
    offset = 0
  ): Promise<{ runs: Array<Record<string, unknown>>; total: number; hasMore: boolean }> {
    const schedule = await this.findSchedule(userId, scheduleId);
    if (!schedule) {
      throw new Error('调度任务不存在');
    }

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM test_executions
       WHERE user_id = $1 AND test_config->>'scheduleId' = $2`,
      [userId, String(scheduleId)]
    );
    const total = countResult.rows[0]?.total || 0;

    const listResult = await query(
      `SELECT test_id, status, created_at, completed_at, test_config
       FROM test_executions
       WHERE user_id = $1 AND test_config->>'scheduleId' = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, String(scheduleId), limit, offset]
    );

    return {
      runs: listResult.rows as Array<Record<string, unknown>>,
      total,
      hasMore: offset + limit < total,
    };
  }

  private resolveNextRunAt(payload: {
    scheduleName: string;
    engineType: string;
    scheduleType: TestScheduleInput['scheduleType'];
    cronExpression?: string;
    timezone?: string;
    nextRunAt?: Date | string;
  }): Date | null {
    const baseTime = payload.nextRunAt ? new Date(payload.nextRunAt) : new Date();
    if (
      payload.scheduleType === 'cron' ||
      payload.scheduleType === 'daily' ||
      payload.scheduleType === 'weekly' ||
      payload.scheduleType === 'monthly'
    ) {
      if (!payload.cronExpression) {
        if (payload.scheduleType === 'daily') {
          return new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
        }
        if (payload.scheduleType === 'weekly') {
          return new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        if (payload.scheduleType === 'monthly') {
          const next = new Date(baseTime);
          next.setMonth(next.getMonth() + 1);
          return next;
        }
        return payload.nextRunAt ? new Date(payload.nextRunAt) : null;
      }
      try {
        const interval = cronParser.parseExpression(payload.cronExpression, {
          tz: payload.timezone || 'UTC',
        });
        return interval.next().toDate();
      } catch {
        return payload.nextRunAt ? new Date(payload.nextRunAt) : null;
      }
    }

    return payload.nextRunAt ? new Date(payload.nextRunAt) : null;
  }

  private async findSchedule(
    userId: string,
    scheduleId: number
  ): Promise<TestScheduleRecord | null> {
    const result = await query('SELECT * FROM test_schedules WHERE id = $1 AND user_id = $2', [
      scheduleId,
      userId,
    ]);
    return (result.rows[0] as TestScheduleRecord) || null;
  }

  private async runDueSchedules(): Promise<void> {
    const now = new Date();
    const dueResult = await query(
      `SELECT * FROM test_schedules
       WHERE is_active = true AND next_run_at IS NOT NULL AND next_run_at <= $1
       ORDER BY next_run_at ASC
       LIMIT 50`,
      [now]
    );

    for (const row of dueResult.rows as TestScheduleRecord[]) {
      if (this.runningSchedules.has(row.id)) {
        continue;
      }
      this.runningSchedules.add(row.id);
      try {
        await this.executeSchedule(String(row.user_id), row.id, 'system');
      } catch (error) {
        console.error('调度任务执行失败', {
          scheduleId: row.id,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this.runningSchedules.delete(row.id);
      }
    }
  }

  private formatSchedule(record: TestScheduleRecord): TestScheduleSummary {
    const parsedConfig = this.parseJsonValue<Record<string, unknown> | null>(
      record.test_config,
      null
    );
    return {
      id: record.id,
      scheduleName: record.schedule_name,
      engineType: record.engine_type,
      testUrl: record.test_url || undefined,
      scheduleType: record.schedule_type,
      cronExpression: record.cron_expression || null,
      timezone: record.timezone || 'UTC',
      isActive: record.is_active,
      lastRunAt: record.last_run_at || undefined,
      nextRunAt: record.next_run_at || undefined,
      runCount: record.run_count || 0,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      templateId: record.template_id ?? null,
      testConfig: this.normalizeScheduleConfig(parsedConfig || {}),
    };
  }
}

export default new TestScheduleService();
