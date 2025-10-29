import Logger from '@/utils/logger';

﻿/**
 * 历史管理服务
 * 提供测试历史的管理、查询、分析功能
 */

export interface HistoryRecord {
  id: string;
  testId: string;
  userId: string;
  testType: string;
  url: string;
  status: 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime: string;
  duration: number;
  results: any;
  metrics: any;
  tags: string[];
  notes: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryFilter {
  testType?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  archived?: boolean;
  search?: string;
}

export interface HistoryAnalytics {
  totalTests: number;
  successRate: number;
  averageDuration: number;
  testsByType: Record<string, number>;
  testsByStatus: Record<string, number>;
  trendsData: Array<{
    date: string;
    count: number;
    successRate: number;
  }>;
  topUrls: Array<{
    url: string;
    count: number;
    successRate: number;
  }>;
}

class HistoryManagementService {
  private baseUrl = '/api/test/history';
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取测试历史列表
   */
  async getHistory(
    filter: HistoryFilter = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{
    records: HistoryRecord[];
    total: number;
    pagination: any;
  }> {
    try {
      const params = new URLSearchParams();
      
      if (filter.testType) params.append('type', filter.testType);
      if (filter.status) params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);
      if (filter.archived !== undefined) params.append('archived', filter.archived.toString());
      
      params.append('page', pagination?.page.toString());
      params.append('limit', pagination?.limit.toString());

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '获取历史记录失败');
      }

      return {
        records: data.data.tests || [],
        total: data.data.pagination?.total || 0,
        pagination: data.data.pagination
      };
    } catch (error) {
      Logger.error('获取历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个历史记录详情
   */
  async getHistoryDetail(id: string): Promise<HistoryRecord> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '获取历史记录详情失败');
      }

      return data.data;
    } catch (error) {
      Logger.error('获取历史记录详情失败:', error);
      throw error;
    }
  }

  /**
   * 删除历史记录
   */
  async deleteHistory(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '删除历史记录失败');
      }

      // 清除相关缓存
      this.clearCache();
    } catch (error) {
      Logger.error('删除历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除历史记录
   */
  async batchDeleteHistory(ids: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/batch`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '批量删除历史记录失败');
      }

      // 清除相关缓存
      this.clearCache();
    } catch (error) {
      Logger.error('批量删除历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 归档历史记录
   */
  async archiveHistory(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/archive`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '归档历史记录失败');
      }

      // 清除相关缓存
      this.clearCache();
    } catch (error) {
      Logger.error('归档历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 更新历史记录备注
   */
  async updateNotes(id: string, notes: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '更新备注失败');
      }

      // 清除相关缓存
      this.clearCache();
    } catch (error) {
      Logger.error('更新备注失败:', error);
      throw error;
    }
  }

  /**
   * 添加标签
   */
  async addTag(id: string, tag: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tag })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '添加标签失败');
      }

      // 清除相关缓存
      this.clearCache();
    } catch (error) {
      Logger.error('添加标签失败:', error);
      throw error;
    }
  }

  /**
   * 移除标签
   */
  async removeTag(id: string, tag: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '移除标签失败');
      }

      // 清除相关缓存
      this.clearCache();
    } catch (error) {
      Logger.error('移除标签失败:', error);
      throw error;
    }
  }

  /**
   * 获取历史分析数据
   */
  async getAnalytics(
    filter: HistoryFilter = {},
    timeRange: number = 30
  ): Promise<HistoryAnalytics> {
    const cacheKey = `analytics-${JSON.stringify(filter)}-${timeRange}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange.toString());
      
      if (filter.testType) params.append('testType', filter.testType);

      const response = await fetch(`${this.baseUrl}/analytics?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '获取分析数据失败');
      }

      const analytics = data.data;

      // 缓存结果
      this.cache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      return analytics;
    } catch (error) {
      Logger.error('获取分析数据失败:', error);
      throw error;
    }
  }

  /**
   * 导出历史记录
   */
  async exportHistory(
    filter: HistoryFilter = {},
    format: 'json' | 'csv' | 'excel' = 'json'
  ): Promise<string> {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      
      if (filter.testType) params.append('testType', filter.testType);
      if (filter.status) params.append('status', filter.status);

      
      /**
      
       * if功能函数
      
       * @param {Object} params - 参数对象
      
       * @returns {Promise<Object>} 返回结果
      
       */
      const response = await fetch(`${this.baseUrl}/export?${params}`);
      
      if (format === 'json') {
        const data = await response.json();
        return data.success ? data.downloadUrl : '';
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return url;
      }
    } catch (error) {
      Logger.error('导出历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取常用标签
   */
  async getPopularTags(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags/popular`);
      const data = await response.json();

      if (!data.success) {
        return [];
      }

      return data.data || [];
    } catch (error) {
      Logger.error('获取常用标签失败:', error);
      return [];
    }
  }
}

export const historyManagementService = new HistoryManagementService();
export default historyManagementService;
