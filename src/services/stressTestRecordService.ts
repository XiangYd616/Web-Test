/**
 * 压力测试记录服务
 * 负责压力测试记录的创建、更新、查询和管理
 */

export interface StressTestRecord {
  id: string;
  testName: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting';

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

  // 测试配置
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
  };

  // 测试结果
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
  currentPhase?: string;
  progress?: number;

  // 标签和分类
  tags?: string[];
  category?: string;
  environment?: 'development' | 'staging' | 'production';

  // 错误信息
  error?: string;
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

  /**
   * 创建新的测试记录
   */
  async createTestRecord(testData: Partial<StressTestRecord>): Promise<StressTestRecord> {
    try {
      const record: StressTestRecord = {
        id: testData.id || this.generateId(),
        testName: testData.testName || `压力测试 - ${new URL(testData.url!).hostname}`,
        url: testData.url!,
        status: testData.status || 'pending',
        startTime: testData.startTime || new Date().toISOString(),
        createdAt: testData.createdAt || new Date().toISOString(),
        config: testData.config!,
        testId: testData.testId,
        userId: testData.userId,
        tags: testData.tags || [],
        environment: testData.environment || 'development'
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
        body: JSON.stringify(record)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || '创建测试记录失败');
      }

      return data.data;
    } catch (error) {
      console.error('创建测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 更新测试记录
   */
  async updateTestRecord(id: string, updates: Partial<StressTestRecord>): Promise<StressTestRecord> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/history/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || '更新测试记录失败');
      }

      return data.data;
    } catch (error) {
      console.error('更新测试记录失败:', error);
      throw error;
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
   * 标记测试失败
   */
  async failTestRecord(id: string, error: string): Promise<StressTestRecord> {
    try {
      const updates: Partial<StressTestRecord> = {
        status: 'failed',
        endTime: new Date().toISOString(),
        error
      };

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('标记测试失败失败:', error);
      throw error;
    }
  }

  /**
   * 取消测试记录
   */
  async cancelTestRecord(id: string, reason?: string): Promise<StressTestRecord> {
    try {
      const updates: Partial<StressTestRecord> = {
        status: 'cancelled',
        endTime: new Date().toISOString(),
        error: reason || '测试已取消'
      };

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('取消测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 设置测试为等待状态
   */
  async setTestWaiting(id: string, reason?: string): Promise<StressTestRecord> {
    try {
      const updates: Partial<StressTestRecord> = {
        status: 'waiting',
        updatedAt: new Date().toISOString(),
        waitingReason: reason
      };

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('设置测试等待状态失败:', error);
      throw error;
    }
  }

  /**
   * 从等待状态开始测试
   */
  async startFromWaiting(id: string): Promise<StressTestRecord> {
    try {
      const updates: Partial<StressTestRecord> = {
        status: 'running',
        startTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return await this.updateTestRecord(id, updates);
    } catch (error) {
      console.error('从等待状态开始测试失败:', error);
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
    return `stress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
}

export const stressTestRecordService = new StressTestRecordService();
export default stressTestRecordService;
