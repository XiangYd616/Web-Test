import { Notification as ElectronNotification } from 'electron';
import { query as localQuery } from '../modules/localDbAdapter';
import localTestExecutionService from '../modules/testing/localTestExecutionService';
import { windowManager } from './WindowManager';

// ── 类型定义 ──

export interface ScheduledTask {
  id: string;
  url: string;
  testType: string;
  cronExpression: string; // 简化 cron: 'daily-HH:mm' | 'hourly' | 'interval-<minutes>'
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

/**
 * 定时测试调度服务
 * 负责：任务管理、定时执行、持久化到 SQLite
 */
class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  get taskCount(): number {
    return this.tasks.size;
  }

  /** 解析 cron 表达式为毫秒延迟 */
  private parseNextRunMs(cron: string): number {
    if (cron === 'hourly') return 60 * 60 * 1000;
    if (cron.startsWith('interval-')) {
      const mins = parseInt(cron.replace('interval-', ''), 10);
      return (mins > 0 ? mins : 60) * 60 * 1000;
    }
    if (cron.startsWith('daily-')) {
      const [hh, mm] = cron.replace('daily-', '').split(':').map(Number);
      const now = new Date();
      const target = new Date(now);
      target.setHours(hh || 0, mm || 0, 0, 0);
      if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
      return target.getTime() - now.getTime();
    }
    return 24 * 60 * 60 * 1000; // default daily
  }

  /** 调度单个任务 */
  private scheduleTask(task: ScheduledTask): void {
    // 清除旧定时器
    const existing = this.timers.get(task.id);
    if (existing) clearTimeout(existing);

    if (!task.enabled) return;

    const delayMs = this.parseNextRunMs(task.cronExpression);
    task.nextRun = new Date(Date.now() + delayMs).toISOString();

    const timer = setTimeout(async () => {
      task.lastRun = new Date().toISOString();
      console.log(`[Scheduler] 执行定时任务: ${task.id} → ${task.testType} ${task.url}`);

      try {
        const result = await localTestExecutionService.startTest({
          testType: task.testType,
          url: task.url,
          config: { url: task.url, testType: task.testType },
        });

        // 发送桌面通知
        if (ElectronNotification.isSupported()) {
          new ElectronNotification({
            title: '定时测试完成',
            body: `${task.testType} 测试完成 · 评分 ${(result as { score?: number })?.score ?? '-'}`,
          }).show();
        }

        // 通知前端
        windowManager.send('scheduled-test-completed', {
          taskId: task.id,
          testType: task.testType,
          url: task.url,
          score: (result as { score?: number })?.score,
          timestamp: task.lastRun,
        });
      } catch (err) {
        console.error(`[Scheduler] 定时任务失败: ${task.id}`, err);
      }

      // 重新调度
      if (task.enabled) this.scheduleTask(task);
    }, delayMs);

    this.timers.set(task.id, timer);
  }

  /** 停止所有定时任务 */
  stopAll(): void {
    for (const [id, timer] of this.timers) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /** 持久化任务到 SQLite */
  private async persistTask(task: ScheduledTask): Promise<void> {
    try {
      await localQuery(
        `INSERT OR REPLACE INTO system_configs (key, value, description, updated_at)
         VALUES (?, ?, '定时任务', CURRENT_TIMESTAMP)`,
        [`scheduler:${task.id}`, JSON.stringify(task)]
      );
    } catch (e) {
      console.warn('[Scheduler] 持久化任务失败:', e);
    }
  }

  /** 从 SQLite 删除持久化任务 */
  private async removePersistedTask(taskId: string): Promise<void> {
    try {
      await localQuery('DELETE FROM system_configs WHERE key = ?', [`scheduler:${taskId}`]);
    } catch (e) {
      console.warn('[Scheduler] 删除持久化任务失败:', e);
    }
  }

  /** 启动时从 SQLite 恢复持久化任务 */
  async loadPersistedTasks(): Promise<void> {
    try {
      const result = await localQuery(
        "SELECT key, value FROM system_configs WHERE key LIKE 'scheduler:%'"
      );
      const rows = result.rows as Array<{ key: string; value: string }>;
      for (const row of rows) {
        try {
          const task = JSON.parse(row.value) as ScheduledTask;
          this.tasks.set(task.id, task);
          this.scheduleTask(task);
        } catch {
          /* skip corrupted entries */
        }
      }
      if (rows.length > 0) {
        console.log(`✅ 已恢复 ${rows.length} 个持久化定时任务`);
      }
    } catch (e) {
      console.warn('[Scheduler] 加载持久化任务失败:', e);
    }
  }

  // ── 公共 API（供 IPC handler 调用） ──

  async addTask(task: ScheduledTask): Promise<{ success: boolean; task: ScheduledTask }> {
    task.id = task.id || `task-${Date.now()}`;
    task.enabled = task.enabled !== false;
    this.tasks.set(task.id, task);
    this.scheduleTask(task);
    await this.persistTask(task);
    return { success: true, task };
  }

  async removeTask(taskId: string): Promise<{ success: boolean }> {
    const timer = this.timers.get(taskId);
    if (timer) clearTimeout(timer);
    this.timers.delete(taskId);
    this.tasks.delete(taskId);
    await this.removePersistedTask(taskId);
    return { success: true };
  }

  async toggleTask(
    taskId: string,
    enabled: boolean
  ): Promise<{ success: boolean; task?: ScheduledTask; error?: string }> {
    const task = this.tasks.get(taskId);
    if (!task) return { success: false, error: 'Task not found' };
    task.enabled = enabled;
    this.scheduleTask(task);
    await this.persistTask(task);
    return { success: true, task };
  }

  listTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /** 是否有活跃的定时任务（用于关闭守卫） */
  hasActiveTasks(): boolean {
    return this.tasks.size > 0;
  }
}

export const schedulerService = new SchedulerService();
