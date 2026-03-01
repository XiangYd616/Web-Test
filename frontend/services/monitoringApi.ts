import { apiClient } from './apiClient';

const BASE = '/system/monitoring';

export type MonitoringSite = {
  id: string;
  name: string;
  url: string;
  status: string;
  monitoring_type: string;
  check_interval: number;
  timeout: number;
  config: Record<string, unknown>;
  notification_settings: Record<string, unknown>;
  last_check: string | null;
  last_status: string | null;
  last_response_time: number | null;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
};

export type MonitoringSummary = {
  total: number;
  active: number;
  inactive: number;
  paused: number;
  byType: Record<string, number>;
};

export type MonitoringAlert = {
  id: string;
  site_id: string;
  site_name?: string;
  alert_type: string;
  severity: string;
  status: string;
  message?: string;
  created_at: string;
};

export type MonitoringStats = Record<string, unknown>;

export type AddSitePayload = {
  name: string;
  url: string;
  monitoringType?: string;
  workspaceId?: string;
  checkInterval?: number;
  timeout?: number;
  config?: Record<string, unknown>;
  notificationSettings?: {
    email?: boolean;
    webhook?: boolean;
    threshold?: { responseTime?: number; uptime?: number; errorRate?: number };
  };
};

export type UpdateSitePayload = Partial<Omit<AddSitePayload, 'url'>>;

const unwrap = <T>(resp: { data: { data?: T; [k: string]: unknown } }): T =>
  (resp.data.data ?? resp.data) as T;

export const monitoringApi = {
  async getSites(params?: {
    page?: number;
    limit?: number;
    status?: string;
    monitoringType?: string;
    search?: string;
    workspaceId?: string;
  }) {
    const resp = await apiClient.get(`${BASE}/sites`, { params });
    return unwrap<{
      sites: MonitoringSite[];
      pagination: Record<string, unknown>;
      summary?: Record<string, unknown>;
    }>(resp);
  },

  async getSiteById(id: string) {
    const resp = await apiClient.get(`${BASE}/sites/${id}`);
    return unwrap<MonitoringSite>(resp);
  },

  async addSite(payload: AddSitePayload) {
    const resp = await apiClient.post(`${BASE}/sites`, payload);
    return unwrap<MonitoringSite>(resp);
  },

  async updateSite(id: string, payload: UpdateSitePayload) {
    const resp = await apiClient.put(`${BASE}/sites/${id}`, payload);
    return unwrap<MonitoringSite>(resp);
  },

  async deleteSite(id: string) {
    await apiClient.delete(`${BASE}/sites/${id}`);
  },

  async checkSite(id: string) {
    const resp = await apiClient.post(`${BASE}/sites/${id}/check`);
    return unwrap<Record<string, unknown>>(resp);
  },

  async pauseSite(id: string) {
    const resp = await apiClient.post(`${BASE}/sites/${id}/pause`);
    return unwrap<MonitoringSite>(resp);
  },

  async resumeSite(id: string) {
    const resp = await apiClient.post(`${BASE}/sites/${id}/resume`);
    return unwrap<MonitoringSite>(resp);
  },

  async getAlerts(params?: { page?: number; limit?: number }) {
    const resp = await apiClient.get(`${BASE}/alerts`, { params });
    return unwrap<{ alerts: MonitoringAlert[]; pagination: Record<string, unknown> }>(resp);
  },

  async getStatistics(params?: { workspaceId?: string }) {
    const resp = await apiClient.get(`${BASE}/statistics`, { params });
    return unwrap<MonitoringStats>(resp);
  },

  async getSummary(params?: { workspaceId?: string }) {
    const resp = await apiClient.get(`${BASE}/statistics`, { params });
    return unwrap<MonitoringSummary>(resp);
  },

  async healthCheck() {
    const resp = await apiClient.get(`${BASE}/health`);
    return unwrap<Record<string, unknown>>(resp);
  },
};
