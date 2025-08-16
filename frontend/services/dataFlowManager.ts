/**
 * 数据管理流程管理器
 * 管理数据的CRUD操作流程
 */

import apiClient from '../utils/apiClient';export interface DataItem     {'
  id: number;
  type: string;
  name: string;
  data: any;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface DataQuery     {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class DataFlowManager {
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
  // 缓存机制
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private getCacheKey(url: string, options: RequestInit): string {
    return `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`;'`
  }
  
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private setCache(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
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
  /**
   * 查询数据列表
   */
  async queryData(query: DataQuery = {}): Promise<{ data: DataItem[]; total: number; page: number; limit: number }> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });

      const response = await apiClient.get(`/data/list?${params.toString()}`);`
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || "查询数据失败');'`
      }
    } catch (error) {
      console.error('查询数据失败:', error);'
      throw error;
    }
  }

  /**
   * 创建数据
   */
  async createData(data: Omit<DataItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataItem> {'
    try {
      const response = await apiClient.post('/data/create', data);'
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || '创建数据失败');'
      }
    } catch (error) {
      console.error('创建数据失败:', error);'
      throw error;
    }
  }

  /**
   * 更新数据
   */
  async updateData(id: number, data: Partial<DataItem>): Promise<DataItem> {
    try {
      const response = await apiClient.put(`/data/update/${id}`, data);`
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || "更新数据失败');'`
      }
    } catch (error) {
      console.error("更新数据失败:', error);'
      throw error;
    }
  }

  /**
   * 删除数据
   */
  async deleteData(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(`/data/delete/${id}`);`
      
      if (!response.success) {
        throw new Error(response.error?.message || "删除数据失败');'`
      }
    } catch (error) {
      console.error('删除数据失败:', error);'
      throw error;
    }
  }

  /**
   * 批量删除数据
   */
  async batchDeleteData(ids: number[]): Promise<void> {
    try {
      const promises = ids.map(id => this.deleteData(id));
      await Promise.all(promises);
    } catch (error) {
      console.error('批量删除数据失败:', error);'
      throw error;
    }
  }

  /**
   * 导出数据
   */
  async exportData(query: DataQuery = {}, format: 'csv' | 'json' | 'excel' = 'csv'): Promise<Blob> {'
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
      params.append('format', format);'
      const response = await fetch(`/api/data/export?${params.toString()}`, {`
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token')}`'`
        }
      });

      if (!response.ok) {
        throw new Error("导出数据失败');'`
      }

      return await response.blob();
    } catch (error) {
      console.error('导出数据失败:', error);'
      throw error;
    }
  }
}

export const dataFlowManager = new DataFlowManager();
export default dataFlowManager;