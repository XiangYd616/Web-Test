/**
 * 统一测试历史服务 - 前端重构版
 * 基于主从表设计，提供统一的测试历史管理功能
 */

import type {
  BatchOperationResult,
  TestHistoryQuery,
  TestHistoryResponse,
  TestSession,
  TestStatistics,
  TestType
} from '../types/testHistory';

export interface TestHistoryFilters {
  testType?: TestType | TestType[];
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  tags?: string[];
  environment?: string;
  scoreRange?: {
    min: number;
    max: number;
  };
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'xlsx';
  includeDetails: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  testTypes?: TestType[];
}

class UnifiedTestHistoryService {
  private baseUrl = '/api/test-history';
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取认证头
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * 缓存管理
   */
  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}_${JSON.stringify(params || {})}`;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取所有测试历史（主表数据）
   */
  async getAllTestHistory(query: TestHistoryQuery = {}): Promise<TestHistoryResponse> {
    const cacheKey = this.getCacheKey('all-history', query);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();

    // 基础查询参数
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);

    // 过滤参数
    if (query.testType) {
      if (Array.isArray(query.testType)) {
        query.testType.forEach((type: any) => params.append('testType', type));
      } else {
        params.append('testType', query.testType);
      }
    }

    if (query.status) params.append('status', query.status);
    if (query.search) params.append('search', query.search);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);

    try {
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`获取测试历史失败: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;

    } catch (error) {
      console.error('获取测试历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取特定类型的测试历史（带详细数据）
   */
  async getTestHistoryByType(testType: TestType, query: TestHistoryQuery = {}): Promise<TestHistoryResponse> {
    const cacheKey = this.getCacheKey(`${testType}-history`, query);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);

    try {
      const response = await fetch(`${this.baseUrl}/${testType}?${params}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`获取${testType}测试历史失败: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;

    } catch (error) {
      console.error(`获取${testType}测试历史失败:`, error);
      throw error;
    }
  }

  /**
   * 获取测试详情（主表+从表数据）
   */
  async getTestDetail(sessionId: string): Promise<TestSession> {
    const cacheKey = this.getCacheKey('test-detail', { sessionId });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/${sessionId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`获取测试详情失败: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;

    } catch (error) {
      console.error('获取测试详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建测试会话
   */
  async createTestSession(sessionData: {
    testName: string;
    testType: TestType;
    url?: string;
    config?: any;
    environment?: string;
    tags?: string[];
  }): Promise<TestSession> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        throw new Error(`创建测试会话失败: ${response.statusText}`);
      }

      const data = await response.json();
      this.clearCache(); // 清除缓存以确保数据一致性
      return data;

    } catch (error) {
      console.error('创建测试会话失败:', error);
      throw error;
    }
  }

  /**
   * 更新测试状态
   */
  async updateTestStatus(sessionId: string, status: string, additionalData?: any): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${sessionId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status, ...additionalData })
      });

      if (!response.ok) {
        throw new Error(`更新测试状态失败: ${response.statusText}`);
      }

      this.clearCache();

    } catch (error) {
      console.error('更新测试状态失败:', error);
      throw error;
    }
  }

  /**
   * 完成测试并保存结果
   */
  async completeTest(sessionId: string, results: any): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${sessionId}/complete`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(results)
      });

      if (!response.ok) {
        throw new Error(`完成测试失败: ${response.statusText}`);
      }

      this.clearCache();

    } catch (error) {
      console.error('完成测试失败:', error);
      throw error;
    }
  }

  /**
   * 删除测试记录（软删除）
   */
  async deleteTest(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${sessionId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`删除测试失败: ${response.statusText}`);
      }

      this.clearCache();

    } catch (error) {
      console.error('删除测试失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除测试记录
   */
  async batchDeleteTests(sessionIds: string[]): Promise<BatchOperationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/delete`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ sessionIds })
      });

      if (!response.ok) {
        throw new Error(`批量删除失败: ${response.statusText}`);
      }

      const result = await response.json();
      this.clearCache();
      return result;

    } catch (error) {
      console.error('批量删除失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试统计信息
   */
  async getTestStatistics(): Promise<TestStatistics> {
    const cacheKey = this.getCacheKey('statistics');
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/statistics`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`获取统计信息失败: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;

    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 导出测试历史
   */
  async exportTestHistory(options: ExportOptions): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error(`导出失败: ${response.statusText}`);
      }

      return await response.blob();

    } catch (error) {
      console.error('导出测试历史失败:', error);
      throw error;
    }
  }

  /**
   * 搜索测试历史
   */
  async searchTests(searchQuery: string, filters?: TestHistoryFilters): Promise<TestHistoryResponse> {
    const params = new URLSearchParams();
    params.append('search', searchQuery);

    if (filters) {
        /**
         * if功能函数
         * @param {Object} params - 参数对象
         * @returns {Promise<Object>} 返回结果
         */
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    try {
      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`搜索失败: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('搜索测试历史失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const unifiedTestHistoryService = new UnifiedTestHistoryService();
export default unifiedTestHistoryService;
