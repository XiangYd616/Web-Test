import { apiClient } from './apiClient';

const BASE = '/system/reports';

export type ReportTemplate = {
  id: string;
  name: string;
  type: string;
  description: string;
  template: string;
  variables: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    defaultValue?: string;
  }>;
  created_at: string;
  updated_at: string;
};

export type ReportInstance = {
  id: string;
  name: string;
  type: string;
  format: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
  file_size?: number;
  download_count: number;
  error?: string;
  duration?: number;
};

export type ReportStatistics = {
  total: number;
  byType: Record<string, number>;
  byFormat: Record<string, number>;
  byStatus: Record<string, number>;
  averageGenerationTime: number;
  totalFileSize: number;
  popularReports: Array<{
    id: string;
    name: string;
    type: string;
    downloadCount: number;
  }>;
};

export type ShareEmail = {
  id: string;
  report_id: string;
  recipient: string;
  status: string;
  sent_at?: string;
  error?: string;
};

export type CreateTemplatePayload = {
  name: string;
  type: string;
  description?: string;
  template?: string;
  variables?: ReportTemplate['variables'];
};

export type CreateSharePayload = {
  recipients?: string[];
  expiresIn?: number;
  format?: string;
};

const unwrap = <T>(resp: { data: { data?: T; [k: string]: unknown } }): T =>
  (resp.data.data ?? resp.data) as T;

export const reportsApi = {
  // 模板
  async getTemplates() {
    const resp = await apiClient.get(`${BASE}/templates`);
    return unwrap<ReportTemplate[]>(resp);
  },

  async createTemplate(payload: CreateTemplatePayload) {
    const resp = await apiClient.post(`${BASE}/templates`, payload);
    return unwrap<ReportTemplate>(resp);
  },

  async updateTemplate(templateId: string, payload: Partial<CreateTemplatePayload>) {
    const resp = await apiClient.put(`${BASE}/templates/${templateId}`, payload);
    return unwrap<ReportTemplate>(resp);
  },

  async deleteTemplate(templateId: string) {
    await apiClient.delete(`${BASE}/templates/${templateId}`);
  },

  async getTemplateVersions(templateId: string) {
    const resp = await apiClient.get(`${BASE}/templates/${templateId}/versions`);
    return unwrap<{ templateId: string; versions: Record<string, unknown>[] }>(resp);
  },

  async previewTemplate(templateId: string, data?: Record<string, unknown>) {
    const resp = await apiClient.post(`${BASE}/templates/${templateId}/preview`, data);
    return unwrap<Record<string, unknown>>(resp);
  },

  // 实例
  async getInstances(params?: { page?: number; limit?: number; type?: string; status?: string }) {
    const resp = await apiClient.get(`${BASE}/instances`, { params });
    return unwrap<ReportInstance[]>(resp);
  },

  // 统计
  async getStatistics() {
    const resp = await apiClient.get(`${BASE}/statistics`);
    return unwrap<ReportStatistics>(resp);
  },

  // 分享
  async createShare(reportId: string, payload?: CreateSharePayload) {
    const resp = await apiClient.post(`${BASE}/${reportId}/share`, payload);
    return unwrap<{ token: string; url: string }>(resp);
  },

  async getShareDetail(token: string) {
    const resp = await apiClient.get(`${BASE}/share/${token}`);
    return unwrap<Record<string, unknown>>(resp);
  },

  // 分享邮件
  async getShareEmails(params?: {
    page?: number;
    limit?: number;
    reportId?: string;
    shareId?: string;
    status?: string;
  }) {
    const resp = await apiClient.get(`${BASE}/share-emails`, { params });
    return unwrap<{ data: ShareEmail[]; pagination: Record<string, unknown> }>(resp);
  },

  async deleteShareEmail(id: string) {
    await apiClient.delete(`${BASE}/share-emails/${id}`);
  },

  async retryShareEmail(id: string) {
    const resp = await apiClient.post(`${BASE}/share-emails/${id}/retry`);
    return unwrap<Record<string, unknown>>(resp);
  },

  // 报告 CRUD
  async createReport(payload: {
    type: string;
    format: string;
    templateId?: string;
    data?: Record<string, unknown>;
  }) {
    const resp = await apiClient.post(BASE, payload);
    return unwrap<ReportInstance>(resp);
  },

  async getReportById(id: string) {
    const resp = await apiClient.get(`${BASE}/${id}`);
    return unwrap<ReportInstance>(resp);
  },

  async deleteReport(id: string) {
    await apiClient.delete(`${BASE}/${id}`);
  },

  // 导出
  async exportReports(params?: { type?: string; format?: string }) {
    const resp = await apiClient.get(`${BASE}/export`, { params });
    return unwrap<Record<string, unknown>>(resp);
  },

  // 访问日志
  async getAccessLogs(params?: {
    page?: number;
    limit?: number;
    reportId?: string;
    shareId?: string;
  }) {
    const resp = await apiClient.get(`${BASE}/access-logs`, { params });
    return unwrap<{ data: Record<string, unknown>[]; pagination: Record<string, unknown> }>(resp);
  },

  // 定时生成
  async scheduleReport(
    reportId: string,
    schedule: { enabled: boolean; frequency: string; recipients: string[] }
  ) {
    const resp = await apiClient.post(`${BASE}/${reportId}/schedule`, schedule);
    return unwrap<Record<string, unknown>>(resp);
  },
};
