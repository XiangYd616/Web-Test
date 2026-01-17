import Logger from '@/utils/logger';
import { apiClient } from './api/client'; /**
 * 调度管理服务
 * 提供测试任务调度、定时执行、批量管理功能
 */

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  testType: string;
  url: string;
  config: any;
  schedule: {
    type: 'once' | 'recurring';
    startTime: string;
    endTime?: string;
    interval?: {
      value: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks';
    };
    cron?: string;
  };
  status: 'active' | 'paused' | 'completed' | 'failed';
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  maxRuns?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    email?: string;
    webhook?: string;
  };
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  results?: any;
  error?: string;
  triggeredBy: 'schedule' | 'manual';
  retryCount: number;
  maxRetries: number;
}

export interface ScheduleFilter {
  status?: string;
  testType?: string;
  tags?: string[];
  search?: string;
  createdBy?: string;
}

class SchedulingService {
  private baseUrl = '/api/scheduling';
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private cacheTimeout = 2 * 60 * 1000; // 2分钟缓存

  /**
   * 获取调度任务列表
   */
  async getTasks(
    filter: ScheduleFilter = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{
    tasks: ScheduledTask[];
    total: number;
    pagination: any;
  }> {
    try {
      const params = new URLSearchParams();

      if (filter.status) params.append('status', filter.status);
      if (filter.testType) params.append('testType', filter.testType);
      if (filter.search) params.append('search', filter.search);
      if (filter.createdBy) params.append('createdBy', filter.createdBy);

      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await apiClient.getInstance().get(`${this.baseUrl}/tasks?${params}`);
      const data = response.data as {
        success: boolean;
        data?: Record<string, unknown>;
        message?: string;
      };

      if (!data.success) {
        throw new Error(data.message || '获取调度任务失败');
      }

      return {
        tasks: (data.data?.tasks as ScheduledTask[]) || [],
        total: (data.data?.total as number) || 0,
        pagination: data.data?.pagination,
      };
    } catch (error) {
      Logger.error('获取调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 创建调度任务
   */
  async createTask(
    task: Omit<ScheduledTask, 'id' | 'status' | 'runCount' | 'createdAt' | 'updatedAt'>
  ): Promise<ScheduledTask> {
    try {
      const response = await apiClient.getInstance().post(`${this.baseUrl}/tasks`, task);
      const data = response.data as { success: boolean; data?: ScheduledTask; message?: string };

      if (!data.success) {
        throw new Error(data.message || '创建调度任务失败');
      }

      this.clearCache();
      return data.data as ScheduledTask;
    } catch (error) {
      Logger.error('创建调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新调度任务
   */
  async updateTask(id: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask> {
    try {
      const response = await apiClient.getInstance().put(`${this.baseUrl}/tasks/${id}`, updates);
      const data = response.data as { success: boolean; data?: ScheduledTask; message?: string };

      if (!data.success) {
        throw new Error(data.message || '更新调度任务失败');
      }

      this.clearCache();
      return data.data;
    } catch (error) {
      Logger.error('更新调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 删除调度任务
   */
  async deleteTask(id: string): Promise<void> {
    try {
      const response = await apiClient.getInstance().delete(`${this.baseUrl}/tasks/${id}`);
      const data = response.data as { success: boolean; message?: string };

      if (!data.success) {
        throw new Error(data.message || '删除调度任务失败');
      }

      this.clearCache();
    } catch (error) {
      Logger.error('删除调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 启动调度任务
   */
  async startTask(id: string): Promise<void> {
    try {
      const response = await apiClient.getInstance().post(`${this.baseUrl}/tasks/${id}/start`);
      const data = response.data as { success: boolean; message?: string };

      if (!data.success) {
        throw new Error(data.message || '启动调度任务失败');
      }

      this.clearCache();
    } catch (error) {
      Logger.error('启动调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 暂停调度任务
   */
  async pauseTask(id: string): Promise<void> {
    try {
      const response = await apiClient.getInstance().post(`${this.baseUrl}/tasks/${id}/pause`);
      const data = response.data as { success: boolean; message?: string };

      if (!data.success) {
        throw new Error(data.message || '暂停调度任务失败');
      }

      this.clearCache();
    } catch (error) {
      Logger.error('暂停调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 手动执行调度任务
   */
  async executeTask(id: string): Promise<TaskExecution> {
    try {
      const response = await apiClient.getInstance().post(`${this.baseUrl}/tasks/${id}/execute`);
      const data = response.data as { success: boolean; data?: TaskExecution; message?: string };

      if (!data.success) {
        throw new Error(data.message || '执行调度任务失败');
      }

      return data.data;
    } catch (error) {
      Logger.error('执行调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务执行历史
   */
  async getExecutionHistory(
    taskId?: string,
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{
    executions: TaskExecution[];
    total: number;
    pagination: any;
  }> {
    try {
      const params = new URLSearchParams();

      if (taskId) params.append('taskId', taskId);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await apiClient.getInstance().get(`${this.baseUrl}/executions?${params}`);
      const data = response.data as {
        success: boolean;
        data?: Record<string, unknown>;
        message?: string;
      };

      if (!data.success) {
        throw new Error(data.message || '获取执行历史失败');
      }

      return {
        executions: (data.data?.executions as TaskExecution[]) || [],
        total: (data.data?.total as number) || 0,
        pagination: data.data?.pagination,
      };
    } catch (error) {
      Logger.error('获取执行历史失败:', error);
      throw error;
    }
  }

  /**
   * 取消执行中的任务
   */
  async cancelExecution(executionId: string): Promise<void> {
    try {
      const response = await apiClient
        .getInstance()
        .post(`${this.baseUrl}/executions/${executionId}/cancel`);
      const data = response.data as { success: boolean; message?: string };

      if (!data.success) {
        throw new Error(data.message || '取消执行失败');
      }
    } catch (error) {
      Logger.error('取消执行失败:', error);
      throw error;
    }
  }

  /**
   * 获取调度统计信息
   */
  async getStatistics(): Promise<{
    totalTasks: number;
    activeTasks: number;
    completedRuns: number;
    failedRuns: number;
    nextRuns: Array<{
      taskId: string;
      taskName: string;
      nextRun: string;
    }>;
  }> {
    const cacheKey = 'statistics';

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await apiClient.getInstance().get(`${this.baseUrl}/statistics`);
      const data = response.data as {
        success: boolean;
        data?: Record<string, unknown>;
        message?: string;
      };

      if (!data.success) {
        throw new Error(data.message || '获取统计信息失败');
      }

      const statistics = data.data as {
        totalTasks: number;
        activeTasks: number;
        completedRuns: number;
        failedRuns: number;
        nextRuns: Array<{ taskId: string; taskName: string; nextRun: string }>;
      };
      this.cache.set(cacheKey, {
        data: statistics,
        timestamp: Date.now(),
      });

      return statistics;
    } catch (error) {
      Logger.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 验证Cron表达式
   */
  async validateCron(expression: string): Promise<{
    valid: boolean;
    nextRuns?: string[];
    error?: string;
  }> {
    try {
      const response = await apiClient.getInstance().post(`${this.baseUrl}/validate-cron`, {
        expression,
      });
      const data = response.data as {
        success: boolean;
        data?: { valid: boolean; nextRuns?: string[] };
        message?: string;
      };
      return data.success ? data.data : { valid: false, error: data.message };
    } catch (error) {
      Logger.error('验证Cron表达式失败:', error);
      return { valid: false, error: '验证失败' };
    }
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.cache.clear();
  }
}

export const schedulingService = new SchedulingService();
export default schedulingService;
