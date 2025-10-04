/**
 * 批量测试服务
 * 提供批量测试创建、执行、监控功�? */

export interface BatchTest {
  id: string;
  name: string;
  description?: string;
  tests: TestConfig[];
  config: BatchConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: BatchProgress;
  results: TestResult[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  error?: string;
}

export interface TestConfig {
  id?: string;
  url: string;
  type: string;
  config: unknown;
  name?: string;
  description?: string;
}

export interface BatchConfig {
  execution: {
    mode: 'sequential' | 'parallel';
    concurrency?: number;
  };
  timeout: number;
  retries: number;
  stopOnFailure: boolean;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  running: number;
}

export interface TestResult {
  testId: string;
  testType: string;
  url: string;
  success: boolean;
  results?: unknown;
  error?: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export interface BatchSummary {
  total: number;
  completed: number;
  failed: number;
  successRate: number;
  duration?: number;
  averageTestTime: number;
}

class BatchTestingService {
  private baseUrl = '/api/batch-testing';
  private cache = new Map<string, any>();
  private cacheTimeout = 2 * 60 * 1000; // 2分钟缓存

  /**
   * 创建批量测试
   */
  async createBatchTest(batchData: {
    name: string;
    description?: string;
    tests: TestConfig[];
    config: BatchConfig;
  }): Promise<BatchTest> {
    try {
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '创建批量测试失败');
      }

      this.clearCache();
      return data.data;
    } catch (error) {
      console.error('创建批量测试失败:', error);
      throw error;
    }
  }

  /**
   * 执行批量测试
   */
  async executeBatchTest(batchId: string): Promise<BatchTest> {
    try {
      const response = await fetch(`${this.baseUrl}/${batchId}/execute`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '执行批量测试失败');
      }

      this.clearCache();
      return data.data;
    } catch (error) {
      console.error('执行批量测试失败:', error);
      throw error;
    }
  }

  /**
   * 获取批量测试状�?   */
  async getBatchStatus(batchId: string): Promise<{
    id: string;
    name: string;
    status: string;
    progress: BatchProgress;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    duration?: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${batchId}/status`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取批量测试状态失�?);
      }

      return data.data;
    } catch (error) {
      console.error('获取批量测试状态失�?', error);
      throw error;
    }
  }

  /**
   * 获取批量测试结果
   */
  async getBatchResults(batchId: string): Promise<{
    batch: {
      id: string;
      name: string;
      status: string;
      progress: BatchProgress;
    };
    results: TestResult[];
    summary: BatchSummary;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${batchId}/results`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取批量测试结果失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取批量测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 取消批量测试
   */
  async cancelBatchTest(batchId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${batchId}/cancel`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '取消批量测试失败');
      }

      this.clearCache();
    } catch (error) {
      console.error('取消批量测试失败:', error);
      throw error;
    }
  }

  /**
   * 获取批量测试列表
   */
  async getBatchList(
    status?: string,
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{
    batches: Array<{
      id: string;
      name: string;
      status: string;
      progress: BatchProgress;
      createdAt: string;
      startedAt?: string;
      completedAt?: string;
      createdBy: string;
    }>;
    total: number;
    pagination: unknown;
  }> {
    try {
      const params = new URLSearchParams();
      
      if (status) params.append('status', status);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`${this.baseUrl}/list?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取批量测试列表失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取批量测试列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除批量测试
   */
  async deleteBatchTest(batchId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${batchId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '删除批量测试失败');
      }

      this.clearCache();
    } catch (error) {
      console.error('删除批量测试失败:', error);
      throw error;
    }
  }

  /**
   * 复制批量测试
   */
  async cloneBatchTest(batchId: string, newName?: string): Promise<BatchTest> {
    try {
      const response = await fetch(`${this.baseUrl}/${batchId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newName })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '复制批量测试失败');
      }

      this.clearCache();
      return data.data;
    } catch (error) {
      console.error('复制批量测试失败:', error);
      throw error;
    }
  }

  /**
   * 导出批量测试结果
   */
  async exportBatchResults(
    batchId: string,
    format: 'json' | 'csv' | 'excel' = 'json'
  ): Promise<string> {
    try {
      const params = new URLSearchParams({ format });

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const response = await fetch(`${this.baseUrl}/${batchId}/export?${params}`);

      if (format === 'json') {
        const data = await response.json();
        return data.success ? data.downloadUrl : '';
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return url;
      }
    } catch (error) {
      console.error('导出批量测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取批量测试统计信息
   */
  async getBatchStatistics(): Promise<{
    totalBatches: number;
    runningBatches: number;
    completedBatches: number;
    failedBatches: number;
    averageSuccessRate: number;
    averageDuration: number;
    recentActivity: Array<{
      date: string;
      count: number;
      successRate: number;
    }>;
  }> {
    const cacheKey = 'batch-statistics';
    
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
        throw new Error(data.error || '获取统计信息失败');
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
   * 实时监控批量测试进度
   */
  monitorBatchProgress(
    batchId: string,
    onProgress: (progress: BatchProgress) => void,
    onComplete: (results: unknown) => void,
    onError: (error: string) => void
  ): () => void {
    let isMonitoring = true;
    
    const checkProgress = async () => {
      if (!isMonitoring) return;

      try {
        const status = await this.getBatchStatus(batchId);
        onProgress(status?.progress);

        if (status.status === 'completed' || status.status === 'failed') {
          isMonitoring = false;
          const results = await this.getBatchResults(batchId);
          onComplete(results);
        } else if (status.status === 'running') {
          // 继续监控
          setTimeout(checkProgress, 2000); // �?秒检查一�?        }
      } catch (error) {
        isMonitoring = false;
        onError(error instanceof Error ? error?.message : '监控失败');
      }
    };

    checkProgress();

    // 返回停止监控的函�?    return () => {
      isMonitoring = false;
    };
  }

  /**
   * 验证批量测试配置
   */
  validateBatchConfig(batchData: {
    name: string;
    tests: TestConfig[];
    config: BatchConfig;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!batchData.name || batchData.name.trim().length === 0) {
      errors.push('批量测试名称不能为空');
    }

    if (!batchData.tests || batchData.tests.length === 0) {
      errors.push('测试列表不能为空');
    }

    if (batchData.tests) {
      batchData.tests.forEach((test, index) => {
        if (!test.url) {
          errors.push(`测试 ${index + 1} 缺少URL`);
        }
        if (!test.type) {
          errors.push(`测试 ${index + 1} 缺少测试类型`);
        }
      });
    }

      /**
       * if功能函数
       * @param {Object} params - 参数对象
       * @returns {Promise<Object>} 返回结果
       */
    if (batchData.config.execution.mode === 'parallel') {
      if (!batchData.config.execution.concurrency || batchData.config.execution.concurrency < 1) {
        errors.push('并行模式需要指定有效的并发�?);
      }
    }

    if (batchData.config.timeout < 1000) {
      errors.push('超时时间不能少于1�?);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成默认批量测试配置
   */
  getDefaultBatchConfig(): BatchConfig {
    return {
      execution: {
        mode: 'sequential',
        concurrency: 3
      },
      timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 300000, // 5分钟
      retries: 0,
      stopOnFailure: false
    };
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * 计算成功�?   */
  calculateSuccessRate(completed: number, failed: number): number {
    const total = completed + failed;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  /**
   * 格式化持续时�?   */
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 获取状态显示文�?   */
  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '等待�?,
      running: '运行�?,
      completed: '已完�?,
      failed: '失败',
      cancelled: '已取�?
    };

    return statusMap[status] || status;
  }
}

export const batchTestingService = new BatchTestingService();
export default batchTestingService;
