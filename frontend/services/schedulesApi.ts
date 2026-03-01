import { apiClient } from './apiClient';

const BASE = '/schedules';

export type ScheduledRun = {
  id: string;
  workspace_id: string | null;
  collection_id: string;
  collection_name?: string;
  environment_id?: string | null;
  environment_name?: string | null;
  cron_expression: string;
  timezone?: string;
  status: 'active' | 'inactive' | 'paused';
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  created_by?: string;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ScheduledRunExecution = {
  id: string;
  taskId: string;
  status: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  totalRequests?: number;
  passedRequests?: number;
  failedRequests?: number;
  errorCount?: number;
  triggeredBy?: 'schedule' | 'manual';
  error?: string;
  retryCount: number;
  maxRetries: number;
  results?: Record<string, unknown>;
  logs?: string[];
  metadata?: Record<string, unknown>;
};

export type ScheduleStatistics = {
  totalSchedules: number;
  activeSchedules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
};

export type CreateSchedulePayload = {
  name: string;
  description?: string;
  collectionId: string;
  environmentId?: string;
  cronExpression: string;
  timezone?: string;
  status?: string;
  workspaceId?: string;
  config?: Record<string, unknown>;
};

export type UpdateSchedulePayload = Partial<CreateSchedulePayload>;

const unwrap = <T>(resp: { data: { data?: T; [k: string]: unknown } }): T =>
  (resp.data.data ?? resp.data) as T;

export const schedulesApi = {
  async list(params?: { workspaceId?: string }) {
    const resp = await apiClient.get(BASE, { params });
    return unwrap<ScheduledRun[]>(resp);
  },

  async getById(scheduleId: string) {
    const resp = await apiClient.get(`${BASE}/${scheduleId}`);
    return unwrap<ScheduledRun>(resp);
  },

  async create(payload: CreateSchedulePayload) {
    const resp = await apiClient.post(BASE, payload);
    return unwrap<{ id: string }>(resp);
  },

  async update(scheduleId: string, payload: UpdateSchedulePayload) {
    const resp = await apiClient.put(`${BASE}/${scheduleId}`, payload);
    return unwrap<ScheduledRun>(resp);
  },

  async delete(scheduleId: string) {
    await apiClient.delete(`${BASE}/${scheduleId}`);
  },

  async start(scheduleId: string) {
    const resp = await apiClient.post(`${BASE}/${scheduleId}/start`);
    return unwrap<Record<string, unknown>>(resp);
  },

  async pause(scheduleId: string) {
    const resp = await apiClient.post(`${BASE}/${scheduleId}/pause`);
    return unwrap<Record<string, unknown>>(resp);
  },

  async execute(scheduleId: string, workspaceId?: string) {
    const resp = await apiClient.post(`${BASE}/${scheduleId}/execute`, undefined, {
      params: workspaceId ? { workspaceId } : undefined,
    });
    return unwrap<{ executionId: string }>(resp);
  },

  async cancelExecution(executionId: string, workspaceId?: string) {
    const resp = await apiClient.post(`${BASE}/executions/${executionId}/cancel`, undefined, {
      params: workspaceId ? { workspaceId } : undefined,
    });
    return unwrap<Record<string, unknown>>(resp);
  },

  async getExecutionHistory(params?: {
    page?: number;
    limit?: number;
    workspaceId?: string;
    taskId?: string;
    status?: string;
    triggeredBy?: string;
  }) {
    const resp = await apiClient.get(`${BASE}/executions/history`, { params });
    return unwrap<{
      executions: ScheduledRunExecution[];
      total: number;
      pagination: Record<string, unknown>;
    }>(resp);
  },

  async getStatistics(params?: { workspaceId?: string }) {
    const resp = await apiClient.get(`${BASE}/statistics/summary`, { params });
    return unwrap<ScheduleStatistics>(resp);
  },

  async validateCron(expression: string) {
    const resp = await apiClient.post(`${BASE}/validate-cron`, { expression });
    return unwrap<{ valid: boolean; nextRuns?: string[] }>(resp);
  },
};
