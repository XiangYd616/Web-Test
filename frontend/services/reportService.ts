import { apiClient } from './api

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'security' | 'seo' | 'accessibility' | 'comprehensive
  format: 'pdf' | 'html' | 'json' | 'csv' | 'xlsx
  sections: Array<{
    id: string;
    name: string;
    type: 'chart' | 'table' | 'text' | 'metrics' | 'recommendations
    config: any;
    order: number;
  }>;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  templateId?: string;
  type: 'performance' | 'security' | 'seo' | 'accessibility' | 'comprehensive
  format: 'pdf' | 'html' | 'json' | 'csv' | 'xlsx
  status: 'generating' | 'completed' | 'failed
  progress: number;
  data: any;
  downloadUrl?: string;
  expiresAt?: string;
  generatedAt: string;
  generatedBy: string;
  metadata: {
    testIds?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    filters?: Record<string, any>;
    size?: number;
    pages?: number;
  };
}

export interface ReportSchedule {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  recipients: Array<{
    type: 'email' | 'webhook' | 'slack
    address: string;
    format?: string;
  }>;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportMetrics {
  totalReports: number;
  reportsToday: number;
  reportsThisWeek: number;
  reportsThisMonth: number;
  averageGenerationTime: number;
  popularFormats: Array<{
    format: string;
    count: number;
    percentage: number;
  }>;
  popularTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

class ReportService {
  // 报告模板管理
  async getTemplates(params?: {
    type?: string;
    format?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    templates: ReportTemplate[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get('/reports/templates', { params });
      return response.data;
    } catch (error) {
      console.error('获取报告模板失败:', error);
      throw new Error('获取报告模板失败');
    }
  }

  async getTemplate(id: string): Promise<ReportTemplate> {
    try {
      const response = await apiClient.get(`/reports/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取报告模板详情失败:', error);
      throw new Error('获取报告模板详情失败');
    }
  }

  async createTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> {
    try {
      const response = await apiClient.post('/reports/templates', template);
      return response.data;
    } catch (error) {
      console.error('创建报告模板失败:', error);
      throw new Error('创建报告模板失败');
    }
  }

  async updateTemplate(id: string, template: Partial<ReportTemplate>): Promise<ReportTemplate> {
    try {
      const response = await apiClient.put(`/reports/templates/${id}`, template);
      return response.data;
    } catch (error) {
      console.error('更新报告模板失败:', error);
      throw new Error('更新报告模板失败');
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      await apiClient.delete(`/reports/templates/${id}`);
    } catch (error) {
      console.error('删除报告模板失败:', error);
      throw new Error('删除报告模板失败');
    }
  }

  // 报告生成
  async generateReport(config: {
    name: string;
    description?: string;
    templateId?: string;
    type: 'performance' | 'security' | 'seo' | 'accessibility' | 'comprehensive
    format: 'pdf' | 'html' | 'json' | 'csv' | 'xlsx
    data?: any;
    testIds?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    filters?: Record<string, any>;
  }): Promise<Report> {
    try {
      const response = await apiClient.post('/reports/generate', config);
      return response.data;
    } catch (error) {
      console.error('生成报告失败:', error);
      throw new Error('生成报告失败');
    }
  }

  async getReport(id: string): Promise<Report> {
    try {
      const response = await apiClient.get(`/reports/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取报告详情失败:', error);
      throw new Error('获取报告详情失败');
    }
  }

  async getReports(params?: {
    type?: string;
    format?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    reports: Report[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get('/reports', { params });
      return response.data;
    } catch (error) {
      console.error('获取报告列表失败:', error);
      throw new Error('获取报告列表失败');
    }
  }

  async downloadReport(id: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/reports/${id}/download`, {
        responseType: 'blob
      });
      return response.data;
    } catch (error) {
      console.error('下载报告失败:', error);
      throw new Error('下载报告失败');
    }
  }

  async deleteReport(id: string): Promise<void> {
    try {
      await apiClient.delete(`/reports/${id}`);
    } catch (error) {
      console.error('删除报告失败:', error);
      throw new Error('删除报告失败');
    }
  }

  // 报告调度
  async createSchedule(schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportSchedule> {
    try {
      const response = await apiClient.post('/reports/schedules', schedule);
      return response.data;
    } catch (error) {
      console.error('创建报告调度失败:', error);
      throw new Error('创建报告调度失败');
    }
  }

  async updateSchedule(id: string, schedule: Partial<ReportSchedule>): Promise<ReportSchedule> {
    try {
      const response = await apiClient.put(`/reports/schedules/${id}`, schedule);
      return response.data;
    } catch (error) {
      console.error('更新报告调度失败:', error);
      throw new Error('更新报告调度失败');
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    try {
      await apiClient.delete(`/reports/schedules/${id}`);
    } catch (error) {
      console.error('删除报告调度失败:', error);
      throw new Error('删除报告调度失败');
    }
  }

  async getSchedules(params?: {
    isActive?: boolean;
    templateId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    schedules: ReportSchedule[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get('/reports/schedules', { params });
      return response.data;
    } catch (error) {
      console.error('获取报告调度列表失败:', error);
      throw new Error('获取报告调度列表失败');
    }
  }

  // 报告分享
  async shareReport(id: string, config: {
    type: 'public' | 'private
    expiresIn?: number; // 小时
    password?: string;
    allowDownload?: boolean;
  }): Promise<{
    shareUrl: string;
    shareId: string;
    expiresAt?: string;
  }> {
    try {
      const response = await apiClient.post(`/reports/${id}/share`, config);
      return response.data;
    } catch (error) {
      console.error('分享报告失败:', error);
      throw new Error('分享报告失败');
    }
  }

  async getSharedReport(shareId: string, password?: string): Promise<Report> {
    try {
      const response = await apiClient.get(`/reports/shared/${shareId}`, {
        params: { password }
      });
      return response.data;
    } catch (error) {
      console.error('获取分享报告失败:', error);
      throw new Error('获取分享报告失败');
    }
  }

  // 报告统计
  async getMetrics(timeRange?: '24h' | '7d' | '30d' | '90d'): Promise<ReportMetrics> {
    try {
      const response = await apiClient.get('/reports/metrics', {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('获取报告统计失败:', error);
      throw new Error('获取报告统计失败');
    }
  }

  // 批量操作
  async batchGenerate(configs: Array<{
    name: string;
    templateId: string;
    testIds?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  }>): Promise<Report[]> {
    try {
      const response = await apiClient.post('/reports/batch-generate', { configs });
      return response.data;
    } catch (error) {
      console.error('批量生成报告失败:', error);
      throw new Error('批量生成报告失败');
    }
  }

  async batchDelete(reportIds: string[]): Promise<void> {
    try {
      await apiClient.post('/reports/batch-delete', { reportIds });
    } catch (error) {
      console.error('批量删除报告失败:', error);
      throw new Error('批量删除报告失败');
    }
  }
}

export const reportService = new ReportService();
