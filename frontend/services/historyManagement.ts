import Logger from '@/utils/logger';
import { apiClient } from './api/client';
/**
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
  results: unknown;
  metrics: unknown;
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
  private baseUrl = '/test/history';
  private cache = new Map<string, { data: HistoryAnalytics; timestamp: number }>();
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
    pagination: unknown;
  }> {
    try {
      const params: Record<string, string | number | boolean> = {
        page: pagination?.page,
        limit: pagination?.limit,
      };

      if (filter.testType) params.type = filter.testType;
      if (filter.status) params.status = filter.status;
      if (filter.search) params.search = filter.search;
      if (filter.archived !== undefined) params.archived = filter.archived;

      const response = await apiClient.getInstance().get(this.baseUrl, { params });
      const data = response.data as {
        success?: boolean;
        data?: { tests?: HistoryRecord[]; pagination?: { total?: number } };
        message?: string;
      };

      if (!data.success || !data.data) {
        throw new Error(data.message || '获取历史记录失败');
      }

      return {
        records: data.data.tests || [],
        total: data.data.pagination?.total || 0,
        pagination: data.data.pagination,
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
      const response = await apiClient.getInstance().get(`${this.baseUrl}/${id}`);
      const data = response.data as { success?: boolean; data?: HistoryRecord; message?: string };

      if (!data.success || !data.data) {
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
      const response = await apiClient.getInstance().delete(`${this.baseUrl}/${id}`);
      const data = response.data as { success?: boolean; message?: string };

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
      const response = await apiClient.getInstance().post(
        '/test/batch-delete',
        { ids },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data = response.data as { success?: boolean; message?: string };

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
      const response = await apiClient.getInstance().post(`${this.baseUrl}/${id}/archive`, {});
      const data = response.data as { success?: boolean; message?: string };

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
      const response = await apiClient.getInstance().put(
        `${this.baseUrl}/${id}/notes`,
        { notes },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data = response.data as { success?: boolean; message?: string };

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
      const response = await apiClient.getInstance().post(
        `${this.baseUrl}/${id}/tags`,
        { tag },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data = response.data as { success?: boolean; message?: string };

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
      const response = await apiClient
        .getInstance()
        .delete(`${this.baseUrl}/${id}/tags/${encodeURIComponent(tag)}`);
      const data = response.data as { success?: boolean; message?: string };

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
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const params: Record<string, string | number> = {
        timeRange,
      };

      if (filter.testType) params.testType = filter.testType;

      const response = await apiClient.getInstance().get(`${this.baseUrl}/analytics`, { params });
      const data = response.data as {
        success?: boolean;
        data?: HistoryAnalytics;
        message?: string;
      };

      if (!data.success || !data.data) {
        throw new Error(data.message || '获取分析数据失败');
      }

      const analytics = data.data;

      // 缓存结果
      this.cache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now(),
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
      const params: Record<string, string> = {
        format,
      };

      if (filter.testType) params.testType = filter.testType;
      if (filter.status) params.status = filter.status;

      /**
      
       * if功能函数
      
       * @param {Object} params - 参数对象
      
       * @returns {Promise<Object>} 返回结果
      
       */
      if (format === 'json') {
        const response = await apiClient.getInstance().get(`${this.baseUrl}/export`, { params });
        const data = response.data as { success?: boolean; downloadUrl?: string };
        return data.success ? data.downloadUrl || '' : '';
      }

      const response = await apiClient.getInstance().get(`${this.baseUrl}/export`, {
        params,
        responseType: 'blob',
      });
      const blob = response.data as Blob;
      return URL.createObjectURL(blob);
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
      const response = await apiClient.getInstance().get(`${this.baseUrl}/tags/popular`);
      const data = response.data as { success?: boolean; data?: string[] };

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
