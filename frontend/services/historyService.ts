/**
 * 测试历史服务
 * 提供测试历史记录的获取、管理和操作功能
 */

import axios from 'axios';export interface TestHistoryQuery     {'
  testType?: string;
  status?: string;
  dateRange?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface TestHistoryResponse     {
  data: TestHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface TestHistoryItem     {
  id: string;
  testName: string;
  testType: string;
  url: string;
  status: 'completed' | 'failed' | 'running' | 'cancelled';
  score?: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
  config: any;
  results: any;
  summary?: {
    totalChecks?: number;
    passed?: number;
    failed?: number;
    warnings?: number;
  };
}

class HistoryService {
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
    console.debug('API Metrics: ', {'
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
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);`
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  private baseUrl: string;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || "http://localhost:3001/api';'`
  }

  /**
   * 获取测试历史列表
   */
  async getTestHistory(query: TestHistoryQuery = {}): Promise<TestHistoryResponse> {
    try {
      const params = new URLSearchParams();

      // 构建查询参数
      if (query.testType) params.append('type', query.testType);'
      if (query.status && query.status !== 'all') params.append('status', query.status);'
      if (query.search) params.append('search', query.search);'
      if (query.page) params.append('page', query.page.toString());'
      if (query.limit) params.append('limit', query.limit.toString());'
      if (query.sortBy) params.append('sortBy', query.sortBy);'
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);'
      // 处理日期范围
      if (query.dateRange) {
        const now = new Date();
        let startDate: Date;

        switch (query.dateRange) {
          case '1d': ''
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d': ''
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d': ''
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d': ''
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        params.append('startDate', startDate.toISOString());'
        params.append("endDate', now.toISOString());'
      }

      const response = await axios.get(`${this.baseUrl}/test/history?${params.toString()}`);`

      // 转换数据格式以匹配前端期望
      const data = response.data;
      return {
        data: this.transformHistoryItems(data.data?.tests || data.data || []),
        pagination: data.data?.pagination || {
          page: parseInt(query.page?.toString() || "1'),'`
          limit: parseInt(query.limit?.toString() || '20'),'
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };

    } catch (error) {
      console.error('获取测试历史失败:', error);'
      // 返回空数据而不是抛出错误，避免页面崩溃
      return {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }

  /**
   * 获取单个测试记录详情
   */
  async getTestDetail(testId: string): Promise<TestHistoryItem | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/test/history/${testId}`);`
      return this.transformHistoryItem(response.data.data);
    } catch (error) {
      console.error("获取测试详情失败:', error);'`
      return null;
    }
  }

  /**
   * 删除测试记录
   */
  async deleteTest(testId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/test/history/${testId}`);`
      this.clearCache();
    } catch (error) {
      console.error("删除测试记录失败:', error);'`
      throw new Error('删除测试记录失败');'
    }
  }

  /**
   * 批量删除测试记录
   */
  async deleteTests(testIds: string[]): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/test/history/batch-delete`, { testIds });`
      this.clearCache();
    } catch (error) {
      console.error("批量删除测试记录失败:', error);'`
      throw new Error('批量删除测试记录失败');'
    }
  }

  /**
   * 导出测试历史
   */
  async exportHistory(query: TestHistoryQuery = {}, format: 'json' | 'csv' | 'excel' = 'json'): Promise<Blob> {'
    try {
      const params = new URLSearchParams();
      
      if (query.testType) params.append('type', query.testType);'
      if (query.status && query.status !== 'all') params.append('status', query.status);'
      if (query.search) params.append('search', query.search);'
      params.append("format', format);'
      const response = await axios.get(`${this.baseUrl}/test/history/export?${params.toString()}`, {`
        responseType: "blob';'`
      });

      return response.data;
    } catch (error) {
      console.error('导出测试历史失败:', error);'
      throw new Error('导出测试历史失败');'
    }
  }

  /**
   * 重新运行测试
   */
  async rerunTest(testId: string): Promise<{ testId: string; status: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/test/history/${testId}/rerun`);`
      return response.data;
    } catch (error) {
      console.error("重新运行测试失败:', error);'`
      throw new Error('重新运行测试失败');'
    }
  }

  /**
   * 获取测试统计信息
   */
  async getTestStats(testType?: string, timeRange: number = 30): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (testType) params.append('type', testType);'
      params.append("timeRange', timeRange.toString());'
      const response = await axios.get(`${this.baseUrl}/test/history/stats?${params.toString()}`);`
      return response.data;
    } catch (error) {
      console.error("获取测试统计失败:', error);'`
      return null;
    }
  }

  /**
   * 转换历史记录项格式
   */
  private transformHistoryItems(items: any[]): TestHistoryItem[] {
    return items.map(item => this.transformHistoryItem(item));
  }

  /**
   * 转换单个历史记录项格式
   */
  private transformHistoryItem(item: any): TestHistoryItem {
    return {
      id: item.id || item.session_id,
      testName: item.test_name || item.testName || '未命名测试','
      testType: item.test_type || item.testType,
      url: item.url || item.target_url,
      status: item.status,
      score: item.overall_score || item.score,
      duration: item.duration || 0,
      createdAt: item.created_at || item.createdAt,
      updatedAt: item.updated_at || item.updatedAt,
      config: typeof item.config === 'string' ? JSON.parse(item.config) : item.config,'
      results: typeof item.results === 'string' ? JSON.parse(item.results) : item.results,'
      summary: {
        totalChecks: item.total_issues || item.totalChecks,
        passed: item.passed || 0,
        failed: item.critical_issues || item.major_issues || item.failed || 0,
        warnings: item.minor_issues || item.warnings || 0
      }
    };
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存
   */
  private getCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

// 导出单例实例
export const historyService = new HistoryService();
export default historyService;
