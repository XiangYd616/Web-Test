/**
 * CI/CD 集成 API 服务
 */

import type { StandardResponse } from '../types/api.types';
import { apiClient, unwrapResponse } from './apiClient';

const unwrap = <T>(payload: StandardResponse<T>) => unwrapResponse(payload);

// ==================== 类型定义 ====================

export interface CiApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
}

export interface CiApiKeyCreateResult extends CiApiKey {
  key: string;
  message: string;
}

export interface CiWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
}

export interface CiTriggerResult {
  testId: string;
  status: string;
  message: string;
  pollUrl: string;
  resultUrl: string;
}

export interface CiTestStatus {
  testId: string;
  status: string;
  progress: number;
  engineType: string;
  url: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  executionTime: number | null;
  error: string | null;
}

export interface CiTestResult {
  testId: string;
  status: string;
  engineType?: string;
  score: number | null;
  grade: string | null;
  passed: boolean | null;
  summary: Record<string, unknown>;
  result?: null;
  message?: string;
}

// ==================== API Key 管理 ====================

export const listApiKeys = async (workspaceId?: string): Promise<CiApiKey[]> => {
  const { data } = await apiClient.get<StandardResponse<CiApiKey[]>>('/ci/api-keys', {
    params: workspaceId ? { workspaceId } : undefined,
  });
  return unwrap(data);
};

export const createApiKey = async (params: {
  name: string;
  scopes?: string[];
  workspaceId?: string;
  expiresAt?: string;
}): Promise<CiApiKeyCreateResult> => {
  const { data } = await apiClient.post<StandardResponse<CiApiKeyCreateResult>>(
    '/ci/api-keys',
    params
  );
  return unwrap(data);
};

export const revokeApiKey = async (keyId: string): Promise<void> => {
  const { data } = await apiClient.post<StandardResponse<null>>(`/ci/api-keys/${keyId}/revoke`);
  unwrap(data);
};

// ==================== Webhook 管理 ====================

export const listWebhooks = async (workspaceId?: string): Promise<CiWebhook[]> => {
  const { data } = await apiClient.get<StandardResponse<CiWebhook[]>>('/ci/webhooks', {
    params: workspaceId ? { workspaceId } : undefined,
  });
  return unwrap(data);
};

export const createWebhook = async (params: {
  name: string;
  url: string;
  secret?: string;
  events?: string[];
  workspaceId?: string;
}): Promise<CiWebhook> => {
  const { data } = await apiClient.post<StandardResponse<CiWebhook>>('/ci/webhooks', params);
  return unwrap(data);
};

export const updateWebhook = async (
  webhookId: string,
  params: { name?: string; url?: string; secret?: string; events?: string[]; active?: boolean }
): Promise<void> => {
  const { data } = await apiClient.put<StandardResponse<null>>(`/ci/webhooks/${webhookId}`, params);
  unwrap(data);
};

export const deleteWebhook = async (webhookId: string): Promise<void> => {
  const { data } = await apiClient.delete<StandardResponse<null>>(`/ci/webhooks/${webhookId}`);
  unwrap(data);
};

// ==================== CI 测试操作 ====================

export const triggerTest = async (params: {
  url: string;
  testType?: string;
  options?: Record<string, unknown>;
  workspaceId?: string;
  callbackUrl?: string;
}): Promise<CiTriggerResult> => {
  const { data } = await apiClient.post<StandardResponse<CiTriggerResult>>('/ci/trigger', params);
  return unwrap(data);
};

export const getCiTestStatus = async (testId: string): Promise<CiTestStatus> => {
  const { data } = await apiClient.get<StandardResponse<CiTestStatus>>(`/ci/status/${testId}`);
  return unwrap(data);
};

export const getCiTestResult = async (testId: string): Promise<CiTestResult> => {
  const { data } = await apiClient.get<StandardResponse<CiTestResult>>(`/ci/result/${testId}`);
  return unwrap(data);
};
