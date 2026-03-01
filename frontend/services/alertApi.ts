import { apiClient } from './apiClient';

const BASE = '/system/alerts';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export type Alert = {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  alert_type: string;
  source?: string;
  site_name?: string;
  site_id?: string;
  details?: Record<string, unknown>;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
};

export type AlertRule = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  severity: AlertSeverity;
  created_at: string;
  updated_at: string;
};

export type AlertStatistics = {
  total: number;
  byStatus: {
    active: number;
    acknowledged: number;
    resolved: number;
  };
  bySeverity: Record<string, number>;
  bySource?: Record<string, number>;
  averageResolutionTime?: number;
  rules?: { total: number; enabled: number; disabled: number };
};

export type CreateRulePayload = {
  name: string;
  description?: string;
  enabled?: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  severity: AlertSeverity;
};

const unwrap = <T>(resp: { data: { data?: T; [k: string]: unknown } }): T =>
  (resp.data.data ?? resp.data) as T;

export const alertApi = {
  // 告警列表
  async getAlerts(params?: {
    page?: number;
    limit?: number;
    severity?: AlertSeverity;
    status?: AlertStatus;
    timeRange?: string;
    search?: string;
    workspaceId?: string;
  }) {
    const resp = await apiClient.get(BASE, { params });
    return unwrap<{
      alerts: Alert[];
      pagination: Record<string, unknown>;
      summary?: Record<string, unknown>;
    }>(resp);
  },

  // 告警详情
  async getAlert(id: string) {
    const resp = await apiClient.get(`${BASE}/${id}`);
    return unwrap<Alert>(resp);
  },

  // 确认告警
  async acknowledgeAlert(id: string) {
    const resp = await apiClient.post(`${BASE}/${id}/acknowledge`);
    return unwrap<Alert>(resp);
  },

  // 解决告警
  async resolveAlert(id: string) {
    const resp = await apiClient.post(`${BASE}/${id}/resolve`);
    return unwrap<Alert>(resp);
  },

  // 批量操作
  async batchAction(
    action: 'acknowledge' | 'resolve' | 'delete',
    alertIds: string[],
    comment?: string
  ) {
    const resp = await apiClient.post(`${BASE}/batch`, { action, alertIds, comment });
    return unwrap<{
      action: string;
      results: Array<{ alertId: string; success: boolean; error?: string }>;
      summary: { total: number; successful: number; failed: number };
    }>(resp);
  },

  // 统计
  async getStatistics() {
    const resp = await apiClient.get(`${BASE}/statistics`);
    return unwrap<AlertStatistics>(resp);
  },

  // 规则列表
  async getRules() {
    const resp = await apiClient.get(`${BASE}/rules`);
    return unwrap<AlertRule[]>(resp);
  },

  // 创建规则
  async createRule(payload: CreateRulePayload) {
    const resp = await apiClient.post(`${BASE}/rules`, payload);
    return unwrap<AlertRule>(resp);
  },

  // 更新规则
  async updateRule(id: string, payload: Partial<CreateRulePayload>) {
    const resp = await apiClient.put(`${BASE}/rules/${id}`, payload);
    return unwrap<AlertRule>(resp);
  },

  // 删除规则
  async deleteRule(id: string) {
    const resp = await apiClient.delete(`${BASE}/rules/${id}`);
    return unwrap<void>(resp);
  },
};
