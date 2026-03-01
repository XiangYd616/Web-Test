import { apiClient } from './apiClient';

const BASE = '/uat';

export type UatFeedback = {
  id: string;
  session_id: string;
  user_id: string | null;
  workspace_id: string | null;
  test_type: string;
  actions: Record<string, unknown>[];
  ratings: Record<string, number>;
  issues: string[];
  comments: string | null;
  completed: boolean;
  started_at: string | null;
  submitted_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CreateFeedbackPayload = {
  sessionId: string;
  testType: string;
  actions?: Record<string, unknown>[];
  ratings?: Record<string, number>;
  issues?: string[];
  comments?: string;
  completed?: boolean;
  startedAt?: string;
  submittedAt?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
};

const unwrap = <T>(resp: { data: { data?: T; [k: string]: unknown } }): T =>
  (resp.data.data ?? resp.data) as T;

export const uatApi = {
  async createFeedback(payload: CreateFeedbackPayload) {
    const resp = await apiClient.post(`${BASE}/feedbacks`, payload);
    return unwrap<UatFeedback>(resp);
  },

  async getFeedback(sessionId: string) {
    const resp = await apiClient.get(`${BASE}/feedbacks/${sessionId}`);
    return unwrap<UatFeedback>(resp);
  },

  async listFeedbacks(params?: { workspaceId?: string; limit?: number; offset?: number }) {
    const resp = await apiClient.get(`${BASE}/feedbacks`, { params });
    return unwrap<{ items: UatFeedback[]; total: number }>(resp);
  },

  async deleteFeedback(id: string) {
    await apiClient.delete(`${BASE}/feedbacks/${id}`);
  },
};
