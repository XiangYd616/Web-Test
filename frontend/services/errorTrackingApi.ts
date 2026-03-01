import { apiClient } from './apiClient';

const BASE = '/system/errors';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorStatus = 'active' | 'resolved';

export type ErrorRecord = {
  id: string;
  type: string;
  message: string;
  stack?: string;
  source?: string;
  severity: ErrorSeverity;
  timestamp: string;
  details?: Record<string, unknown>;
  context?: Record<string, unknown>;
  code?: string;
  line?: number;
  column?: number;
};

export type ErrorGroup = {
  key: string;
  count: number;
};

export type ErrorStatistics = {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  byHour?: Array<{ hour: string; count: number }>;
  trends?: { direction: string; change: number; changePercent: number };
  topErrors?: Array<{ message: string; count: number; severity: string }>;
};

export type ErrorTrend = {
  timestamp: string;
  count: number;
};

const unwrap = <T>(resp: { data: { data?: T; [k: string]: unknown } }): T =>
  (resp.data.data ?? resp.data) as T;

export const errorTrackingApi = {
  async getErrors(params?: {
    page?: number;
    limit?: number;
    severity?: ErrorSeverity;
    type?: string;
    timeRange?: string;
    search?: string;
  }) {
    const resp = await apiClient.get(BASE, { params });
    return unwrap<{ errors: ErrorRecord[]; pagination: Record<string, unknown> }>(resp);
  },

  async getError(id: string) {
    const resp = await apiClient.get(`${BASE}/${id}`);
    return unwrap<ErrorRecord>(resp);
  },

  async resolveError(id: string) {
    const resp = await apiClient.post(`${BASE}/${id}/resolve`);
    return unwrap<ErrorRecord>(resp);
  },

  async deleteError(id: string) {
    const resp = await apiClient.delete(`${BASE}/${id}`);
    return unwrap<void>(resp);
  },

  async batchResolve(errorIds: string[], comment?: string) {
    const resp = await apiClient.post(`${BASE}/batch/resolve`, { errorIds, comment });
    return unwrap<{
      results: Array<{ errorId: string; success: boolean; error?: string }>;
      summary: { total: number; successful: number; failed: number };
    }>(resp);
  },

  async getStatistics() {
    const resp = await apiClient.get(`${BASE}/statistics`);
    return unwrap<ErrorStatistics>(resp);
  },

  async getTrends(params?: { timeRange?: string; groupBy?: string }) {
    const resp = await apiClient.get(`${BASE}/trends`, { params });
    return unwrap<{
      timeRange: string;
      interval: string;
      series: ErrorTrend[];
      grouped: Record<string, ErrorTrend[]>;
    }>(resp);
  },

  async getGroups(params?: { timeRange?: string; groupBy?: string }) {
    const resp = await apiClient.get(`${BASE}/groups`, { params });
    return unwrap<{ groupBy: string; timeRange: string; items: ErrorGroup[] }>(resp);
  },

  async getTypes() {
    const resp = await apiClient.get(`${BASE}/types`);
    return unwrap<string[]>(resp);
  },

  async getHealth() {
    const resp = await apiClient.get(`${BASE}/health`);
    return unwrap<Record<string, unknown>>(resp);
  },

  async submitReport(payload: {
    type: string;
    message: string;
    severity?: ErrorSeverity;
    timestamp: string;
    stack?: string;
    source?: string;
    details?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }) {
    const resp = await apiClient.post(`${BASE}/report`, payload);
    return unwrap<{ id: string }>(resp);
  },
};
