/**
 * 数据管理流程管理器
 * 管理数据的CRUD操作流程
 */

import apiClient from '../utils/apiClient';

export interface DataItem {
  id: number;
  type: string;
  name: string;
  data: any;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface DataQuery {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class DataFlowManager {
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

      const response = await apiClient.get(`/data/list?${params.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || '查询数据失败');
      }
    } catch (error) {
      console.error('查询数据失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据
   */
  async createData(data: Omit<DataItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataItem> {
    try {
      const response = await apiClient.post('/data/create', data);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || '创建数据失败');
      }
    } catch (error) {
      console.error('创建数据失败:', error);
      throw error;
    }
  }

  /**
   * 更新数据
   */
  async updateData(id: number, data: Partial<DataItem>): Promise<DataItem> {
    try {
      const response = await apiClient.put(`/data/update/${id}`, data);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || '更新数据失败');
      }
    } catch (error) {
      console.error('更新数据失败:', error);
      throw error;
    }
  }

  /**
   * 删除数据
   */
  async deleteData(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(`/data/delete/${id}`);
      
      if (!response.success) {
        throw new Error(response.error?.message || '删除数据失败');
      }
    } catch (error) {
      console.error('删除数据失败:', error);
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
      console.error('批量删除数据失败:', error);
      throw error;
    }
  }

  /**
   * 导出数据
   */
  async exportData(query: DataQuery = {}, format: 'csv' | 'json' | 'excel' = 'csv'): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
      params.append('format', format);

      const response = await fetch(`/api/data/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('导出数据失败');
      }

      return await response.blob();
    } catch (error) {
      console.error('导出数据失败:', error);
      throw error;
    }
  }
}

export const dataFlowManager = new DataFlowManager();
export default dataFlowManager;