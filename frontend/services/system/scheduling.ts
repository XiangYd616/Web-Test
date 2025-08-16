/**
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
  // 监控和指标收集
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: new Map<string, number>()
  };
  
  private logSuccess(info: any): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    // 更新平均响应时间
    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
      this.metrics.successfulRequests;
  }
  
  private logError(error: Error, context: any): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    
    const errorType = error.name || 'UnknownError';
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics:', {
      url: info.url,
      method: info.method,
      status: info.status,
      responseTime: info.responseTime
    });
  }
  
  getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }
  private baseUrl = '/api/scheduling';
  private cache = new Map<string, any>();
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

      const response = await fetch(`${this.baseUrl}/tasks?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '获取调度任务失败');
      }

      return {
        tasks: data.data.tasks || [],
        total: data.data.total || 0,
        pagination: data.data.pagination
      };
    } catch (error) {
      console.error('获取调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 创建调度任务
   */
  async createTask(task: Omit<ScheduledTask, 'id' | 'status' | 'runCount' | 'createdAt' | 'updatedAt'>): Promise<ScheduledTask> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(task)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '创建调度任务失败');
      }

      this.clearCache();
      return data.data;
    } catch (error) {
      console.error('创建调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新调度任务
   */
  async updateTask(id: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '更新调度任务失败');
      }

      this.clearCache();
      return data.data;
    } catch (error) {
      console.error('更新调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 删除调度任务
   */
  async deleteTask(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '删除调度任务失败');
      }

      this.clearCache();
    } catch (error) {
      console.error('删除调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 启动调度任务
   */
  async startTask(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}/start`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '启动调度任务失败');
      }

      this.clearCache();
    } catch (error) {
      console.error('启动调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 暂停调度任务
   */
  async pauseTask(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}/pause`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '暂停调度任务失败');
      }

      this.clearCache();
    } catch (error) {
      console.error('暂停调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 手动执行调度任务
   */
  async executeTask(id: string): Promise<TaskExecution> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}/execute`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '执行调度任务失败');
      }

      return data.data;
    } catch (error) {
      console.error('执行调度任务失败:', error);
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

      const response = await fetch(`${this.baseUrl}/executions?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '获取执行历史失败');
      }

      return {
        executions: data.data.executions || [],
        total: data.data.total || 0,
        pagination: data.data.pagination
      };
    } catch (error) {
      console.error('获取执行历史失败:', error);
      throw error;
    }
  }

  /**
   * 取消执行中的任务
   */
  async cancelExecution(executionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/executions/${executionId}/cancel`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '取消执行失败');
      }
    } catch (error) {
      console.error('取消执行失败:', error);
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
      const response = await fetch(`${this.baseUrl}/statistics`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '获取统计信息失败');
      }

      const statistics = data.data;
      this.cache.set(cacheKey, {
        data: statistics,
        timestamp: Date.now()
      });

      return statistics;
    } catch (error) {
      console.error('获取统计信息失败:', error);
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
      const response = await fetch(`${this.baseUrl}/validate-cron`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expression })
      });

      const data = await response.json();
      return data.success ? data.data : { valid: false, error: data.message };
    } catch (error) {
      console.error('验证Cron表达式失败:', error);
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
