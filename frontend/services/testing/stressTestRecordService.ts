
// 取消原因枚举
export enum CancelReason {
  USER_CANCELLED = 'user_cancelled',
  TIMEOUT = 'timeout',
  SYSTEM_ERROR = 'system_error',
  RESOURCE_LIMIT = 'resource_limit',
  NETWORK_ERROR = 'network_error',
  INVALID_CONFIG = 'invalid_config',
  EXTERNAL_INTERRUPT = 'external_interrupt'
}

// 失败原因枚举
export enum FailureReason {
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  SERVER_ERROR = 'server_error',
  INVALID_RESPONSE = 'invalid_response',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
  CONFIGURATION_ERROR = 'configuration_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface StressTestRecord {
  id: string;
  testName: string;
  url: string;
  testType?: 'stress' | 'website' | 'seo' | 'security' | 'performance' | 'api';
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';

  // 时间信息
  startTime: string;
  endTime?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  savedAt?: string;

  // 状态相关
  error?: string;
  waitingReason?: string;
  progress?: number;
  currentPhase?: string;
  cancelReason?: CancelReason;
  failureReason?: FailureReason;
  interruptedAt?: string;
  interruptReason?: string;
  resumedAt?: string;

  // 队列相关信息
  queuedAt?: string;
  queuePosition?: number;
  estimatedWaitTime?: number;

  config: {
    users: number;
    duration: number;
    rampUpTime: number;
    testType: 'gradual' | 'spike' | 'constant' | 'step';
    method: string;
    timeout: number;
    thinkTime: number;
    warmupDuration?: number;
    cooldownDuration?: number;
    headers?: Record<string, string>;
    body?: string;
    proxy?: {
      enabled: boolean;
      type?: string;
      host?: string;
      port?: number;
      username?: string;
      password?: string;
    };
  };

  results?: {
    metrics: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
      p50ResponseTime?: number;
      p90ResponseTime?: number;
      p95ResponseTime?: number;
      p99ResponseTime?: number;
      throughput: number;
      requestsPerSecond: number;
      rps: number;
      errorRate: number;
      currentTPS?: number;
      peakTPS?: number;
      dataReceived?: number;
      dataSent?: number;
      connectionTime?: number;
      dnsTime?: number;
    };
    realTimeData?: Array<{
      timestamp: number;
      responseTime: number;
      throughput: number;
      activeUsers: number;
      errors: number;
      errorRate: number;
      phase: string;
      connectionTime?: number;
      dnsTime?: number;
    }>;
    errorBreakdown?: Record<string, number>;
    phases?: Array<{
      name: string;
      startTime: number;
      endTime: number;
      users: number;
      duration: number;
    }>;
  };

  // 评分和建议
  overallScore?: number;
  performanceGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations?: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  }>;

  // 元数据
  testId?: string;
  userId?: string;
  actualDuration?: number;

  // 标签和分类
  tags?: string[];
  category?: string;
  environment?: 'development' | 'staging' | 'production';

  // 警告信息
  warnings?: string[];
}

export interface TestRecordQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  testType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'startTime' | 'endTime' | 'duration' | 'overallScore';
  sortOrder?: 'asc' | 'desc';
  userId?: string;
}

export interface TestRecordResponse {
  success: boolean;
  data: {
    tests: StressTestRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message?: string;
  error?: string;
}

class StressTestRecordService {
  private baseUrl = '/api/test';
  private maxRetries = 3;
  private retryDelay = 1000; // 1秒

  /**
   * 带重试机制的fetch请求
   */
  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = this.maxRetries): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {}),
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error: any) {
      if (retries > 0 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.warn(`请求失败，${this.retryDelay}ms后重试... (剩余重试次数: ${retries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  /**
   * 创建新的测试记录
   */
  async createTestRecord(testData: Partial<StressTestRecord>): Promise<StressTestRecord> {
    try {
      // 准备后端API期望的数据格式
      const apiData = {
        testName: testData.testName || `压力测试 - ${this.getHostnameFromUrl(testData.url!) || '未知'}`,
        testType: 'stress',
        url: testData.url!,
        status: testData.status || 'pending',
        config: testData.config || {},
        environment: testData.environment || 'production',
        tags: testData.tags || [],
        description: `压力测试 - ${this.getHostnameFromUrl(testData.url!) || '未知'}`
      };

      // 保存到后端
      const response = await fetch(`${this.baseUrl}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        },
        body: JSON.stringify(apiData)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || '创建测试记录失败');
      }

      // 将后端返回的数据转换为前端期望的格式
      const backendRecord = data.data;
      const record: StressTestRecord = {
        id: backendRecord.id,
        testName: backendRecord.testName,
        url: backendRecord.url || testData.url!,
        status: backendRecord.status,
        startTime: backendRecord.startTime || backendRecord.createdAt,
        createdAt: backendRecord.createdAt,
        config: backendRecord.config || testData.config!,
        testId: testData.testId,
        userId: backendRecord.userId,
        tags: backendRecord.tags || [],
        environment: backendRecord.environment || 'production'
      };

      return record;
    } catch (error) {
      console.error('创建测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 更新测试记录 - 增强版本，包含重试机制和数据验证
   */
  async updateTestRecord(id: string, updates: Partial<StressTestRecord>): Promise<StressTestRecord> {
    try {
      // 数据验证
      if (!id || typeof id !== 'string') {
        throw new Error('无效的测试记录ID');
      }

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // 使用带重试机制的fetch
      const response = await this.fetchWithRetry(`${this.baseUrl}/history/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || '更新测试记录失败');
      }

      return data.data;
    } catch (error: any) {
      console.error('更新测试记录失败:', error);
      throw new Error(`更新测试记录失败: ${error.message}`);
    }
  }

  /**
   * 完成测试记录
   */
  async completeTestRecord(id: string, results: StressTestRecord['results'], overallScore?: number): Promise<StressTestRecord> {
    try {
      const updates: Partial<StressTestRecord> = {
        status: 'completed',
        endTime: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        results,
        overallScore,
        performanceGrade: this.calculateGrade(overallScore)
      };

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('完成测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 标记测试失败（增强版）
   */
  async failTestRecord(
    id: string,
    error: string,
    failureReason: FailureReason = FailureReason.UNKNOWN_ERROR,
    errorDetails?: any,
    preserveData: boolean = true
  ): Promise<StressTestRecord> {
    try {
      // 获取当前记录以保存部分数据
      let currentRecord: StressTestRecord | null = null;
      if (preserveData) {
        try {
          currentRecord = await this.getTestRecord(id);
        } catch (err) {
          console.warn('获取当前记录失败，继续失败操作:', err);
        }
      }

      const updates: Partial<StressTestRecord> = {
        status: 'failed',
        endTime: new Date().toISOString(),
        error,
        failureReason,
        updatedAt: new Date().toISOString()
      };

      // 如果有部分数据且需要保存，计算实际持续时间
      if (currentRecord && preserveData) {
        const startTime = new Date(currentRecord.startTime).getTime();
        const endTime = new Date().getTime();
        updates.actualDuration = Math.round((endTime - startTime) / 1000);
      }

      // 调用后端失败API
      const response = await fetch(`${this.baseUrl}/history/${id}/fail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        },
        body: JSON.stringify({
          error,
          failureReason,
          errorDetails,
          preserveData
        })
      });

      const data = await response.json();
      if (!data.success) {
        // 如果后端API不存在，回退到通用更新
        return await this.updateTestRecord(id, updates);
      }

      return data.data;
    } catch (error) {
      console.error('标记测试失败失败:', error);
      throw error;
    }
  }

  /**
   * 取消测试记录（增强版）
   */
  async cancelTestRecord(
    id: string,
    reason?: string,
    cancelReason: CancelReason = CancelReason.USER_CANCELLED,
    preserveData: boolean = true
  ): Promise<StressTestRecord> {
    try {
      // 获取当前记录以保存部分数据
      let currentRecord: StressTestRecord | null = null;
      if (preserveData) {
        try {
          currentRecord = await this.getTestRecord(id);
        } catch (error) {
          console.warn('获取当前记录失败，继续取消操作:', error);
        }
      }

      const updates: Partial<StressTestRecord> = {
        status: 'cancelled',
        endTime: new Date().toISOString(),
        error: reason || this.getCancelReasonMessage(cancelReason),
        cancelReason,
        updatedAt: new Date().toISOString()
      };

      // 如果有部分数据且需要保存，计算实际持续时间
      if (currentRecord && preserveData) {
        const startTime = new Date(currentRecord.startTime).getTime();
        const endTime = new Date().getTime();
        updates.actualDuration = Math.round((endTime - startTime) / 1000);
      }

      // 如果是本地记录，直接更新本地存储
      if (id.startsWith('local_')) {
        if (!currentRecord) {
          throw new Error('本地记录不存在');
        }

        const updatedRecord: StressTestRecord = {
          ...currentRecord,
          ...updates
        };

        // 更新本地存储
        const localRecords = this.getLocalRecords();
        const index = localRecords.findIndex(r => r.id === id);
        if (index !== -1) {
          localRecords[index] = updatedRecord;
          this.saveLocalRecords(localRecords);
        }

        return updatedRecord;
      }

      // 服务器记录，调用后端取消API
      const response = await fetch(`${this.baseUrl}/history/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        },
        body: JSON.stringify({
          reason: reason || this.getCancelReasonMessage(cancelReason),
          cancelReason,
          preserveData
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || '取消测试记录失败');
      }

      return data.data;
    } catch (error) {
      console.error('取消测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 设置测试为准备状态（带等待原因）
   */
  async setTestPending(id: string, reason?: string): Promise<StressTestRecord> {
    try {
      const updates: Partial<StressTestRecord> = {
        status: 'idle', // 🔧 简化：使用idle作为等待状态
        updatedAt: new Date().toISOString(),
        waitingReason: reason
      };

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('设置测试准备状态失败:', error);
      throw error;
    }
  }

  /**
   * 从准备状态开始测试
   */
  async startFromPending(id: string): Promise<StressTestRecord> {
    try {
      const updates: Partial<StressTestRecord> = {
        status: 'running',
        startTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        waitingReason: undefined // 清除等待原因
      };

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('从准备状态开始测试失败:', error);
      throw error;
    }
  }

  /**
   * 标记测试超时
   */
  async timeoutTestRecord(
    id: string,
    timeoutReason: string = '测试执行超时',
    preserveData: boolean = true
  ): Promise<StressTestRecord> {
    try {
      // 获取当前记录以保存部分数据
      let currentRecord: StressTestRecord | null = null;
      if (preserveData) {
        try {
          currentRecord = await this.getTestRecord(id);
        } catch (err) {
          console.warn('获取当前记录失败，继续超时操作:', err);
        }
      }

      const updates: Partial<StressTestRecord> = {
        status: 'failed',
        endTime: new Date().toISOString(),
        error: `测试超时失败: ${timeoutReason}`,
        failureReason: FailureReason.TIMEOUT,
        updatedAt: new Date().toISOString()
      };

      // 计算实际持续时间
      if (currentRecord && preserveData) {
        const startTime = new Date(currentRecord.startTime).getTime();
        const endTime = new Date().getTime();
        updates.actualDuration = Math.round((endTime - startTime) / 1000);
      }

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('标记测试超时失败:', error);
      throw error;
    }
  }

  /**
   * 中断测试（可恢复）
   */
  async interruptTestRecord(
    id: string,
    interruptReason: string,
    preserveState: boolean = true
  ): Promise<StressTestRecord> {
    try {
      const updates: Partial<StressTestRecord> = {
        status: 'idle', // 🔧 简化：使用idle作为中断状态
        interruptedAt: new Date().toISOString(),
        interruptReason,
        waitingReason: `测试已中断: ${interruptReason}`,
        updatedAt: new Date().toISOString()
      };

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('中断测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 恢复中断的测试
   */
  async resumeTestRecord(id: string): Promise<StressTestRecord> {
    try {
      const updates: Partial<StressTestRecord> = {
        status: 'running',
        resumedAt: new Date().toISOString(),
        waitingReason: undefined,
        updatedAt: new Date().toISOString()
      };

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('恢复测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 查询测试记录
   */
  async getTestRecords(query: TestRecordQuery = {}): Promise<TestRecordResponse> {
    try {
      const params = new URLSearchParams();

      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${this.baseUrl}/history?type=stress&${params.toString()}`, {
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || '查询测试记录失败');
      }

      return data;
    } catch (error) {
      console.error('查询测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个测试记录
   */
  async getTestRecord(id: string): Promise<StressTestRecord> {
    try {
      // 如果是本地记录，从本地存储获取
      if (id.startsWith('local_')) {
        const localRecords = this.getLocalRecords();
        const record = localRecords.find(r => r.id === id);
        if (!record) {
          throw new Error('本地记录不存在');
        }
        return record;
      }

      // 服务器记录，调用API
      const response = await fetch(`${this.baseUrl}/history/${id}`, {
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || '获取测试记录失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 删除测试记录
   */
  async deleteTestRecord(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/history/${id}`, {
        method: 'DELETE',
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('删除测试记录失败:', error);
      return false;
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `stress_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 安全地从URL获取主机名
   */
  private getHostnameFromUrl(url: string): string {
    if (!url || url.trim() === '') {
      return '';
    }
    try {
      return new URL(url).hostname;
    } catch {
      return url; // 如果URL无效，返回原始字符串
    }
  }

  /**
   * 计算性能等级
   */
  private calculateGrade(score?: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (!score) return 'F';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取取消原因的友好消息
   */
  private getCancelReasonMessage(reason: CancelReason): string {
    const messages = {
      [CancelReason.USER_CANCELLED]: '用户手动取消测试',
      [CancelReason.TIMEOUT]: '测试执行超时',
      [CancelReason.SYSTEM_ERROR]: '系统错误导致测试取消',
      [CancelReason.RESOURCE_LIMIT]: '资源限制导致测试取消',
      [CancelReason.NETWORK_ERROR]: '网络错误导致测试取消',
      [CancelReason.INVALID_CONFIG]: '配置无效导致测试取消',
      [CancelReason.EXTERNAL_INTERRUPT]: '外部中断导致测试取消'
    };
    return messages[reason] || '测试已取消';
  }

  /**
   * 获取失败原因的友好消息
   */
  private getFailureReasonMessage(reason: FailureReason): string {
    const messages = {
      [FailureReason.NETWORK_ERROR]: '网络连接错误',
      [FailureReason.TIMEOUT]: '请求超时',
      [FailureReason.SERVER_ERROR]: '服务器错误',
      [FailureReason.INVALID_RESPONSE]: '无效响应',
      [FailureReason.RESOURCE_EXHAUSTED]: '资源耗尽',
      [FailureReason.CONFIGURATION_ERROR]: '配置错误',
      [FailureReason.AUTHENTICATION_ERROR]: '认证错误',
      [FailureReason.RATE_LIMIT_EXCEEDED]: '请求频率超限',
      [FailureReason.UNKNOWN_ERROR]: '未知错误'
    };
    return messages[reason] || '测试失败';
  }

  /**
   * 验证状态转换是否有效 - 公共方法
   */
  public isValidStatusTransition(
    fromStatus: StressTestRecord['status'],
    toStatus: StressTestRecord['status']
  ): boolean {
    const validTransitions: Record<string, string[]> = {
      'pending': ['running', 'cancelled'],
      'running': ['completed', 'failed', 'cancelled'],
      'completed': [], // 完成状态不能转换
      'failed': [], // 失败状态不能转换
      'cancelled': [] // 取消状态不能转换
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * 更新测试记录（带状态验证）
   */
  async updateTestRecordWithValidation(
    id: string,
    updates: Partial<StressTestRecord>
  ): Promise<StressTestRecord> {
    try {
      // 如果更新包含状态变更，验证转换是否有效
      if (updates.status) {
        const currentRecord = await this.getTestRecord(id);
        if (!this.isValidStatusTransition(currentRecord.status, updates.status)) {
          throw new Error(
            `无效的状态转换: ${currentRecord.status} -> ${updates.status}`
          );
        }
      }

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('更新测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 批量取消测试记录
   */
  async batchCancelTestRecords(
    ids: string[],
    reason: string = '批量取消',
    cancelReason: CancelReason = CancelReason.USER_CANCELLED
  ): Promise<{ success: string[], failed: string[] }> {
    const results: { success: string[], failed: string[] } = { success: [], failed: [] };

    for (const id of ids) {
      try {
        await this.cancelTestRecord(id, reason, cancelReason);
        results.success.push(id);
      } catch (error) {
        console.error(`取消测试记录 ${id} 失败:`, error);
        results.failed.push(id);
      }
    }

    return results;
  }

  /**
   * 清理过期的等待状态记录
   */
  async cleanupExpiredWaitingRecords(maxWaitingMinutes: number = 30): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/history/cleanup/waiting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        },
        body: JSON.stringify({ maxWaitingMinutes })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || '清理过期记录失败');
      }

      return data.data.cleanedCount || 0;
    } catch (error) {
      console.error('清理过期等待记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试记录统计信息
   */
  async getTestRecordStatistics(
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byFailureReason: Record<string, number>;
    byCancelReason: Record<string, number>;
    averageDuration: number;
    successRate: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`${this.baseUrl}/history/statistics?${params.toString()}`, {
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || '获取统计信息失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取测试记录统计失败:', error);
      throw error;
    }
  }

  /**
   * 导出测试记录
   */
  async exportTestRecords(
    query: TestRecordQuery = {},
    format: 'csv' | 'json' | 'excel' = 'csv'
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
      params.append('format', format);

      const response = await fetch(`${this.baseUrl}/history/export?${params.toString()}`, {
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      return await response.blob();
    } catch (error) {
      console.error('导出测试记录失败:', error);
      throw error;
    }
  }
}

export const stressTestRecordService = new StressTestRecordService();
export default stressTestRecordService;
