/**
 * 管理配置 API
 * 仅保留实际使用的配置读写功能
 */

import type { StandardResponse } from '../types/api.types';
import { apiClient, unwrapResponse } from './apiClient';
import { routeByMode } from './serviceAdapter';

type AdminConfigResponse = Record<string, unknown>;

type AdminConfigPayload = {
  general?: Record<string, unknown>;
  testing?: Record<string, unknown>;
  monitoring?: Record<string, unknown>;
  security?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  backup?: Record<string, unknown>;
};

const unwrap = <T>(payload: StandardResponse<T>) => unwrapResponse(payload);

export const getAdminConfig = routeByMode(
  async () => {
    if (window.electronAPI?.config) {
      const config = await window.electronAPI.config.getAll();
      return (config || {}) as AdminConfigResponse;
    }
    return {} as AdminConfigResponse;
  },
  async () => {
    try {
      const { data } = await apiClient.get<StandardResponse<AdminConfigResponse>>('/admin/config');
      return unwrap(data);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 401) {
        return {} as AdminConfigResponse;
      }
      throw err;
    }
  }
);

export const updateAdminConfig = routeByMode(
  async (payload: AdminConfigPayload) => {
    if (window.electronAPI?.config) {
      const existing = (await window.electronAPI.config.getAll()) || {};
      const merged = { ...existing, ...payload };
      for (const [key, value] of Object.entries(payload)) {
        await window.electronAPI.config.set(key, value);
      }
      return merged as Record<string, unknown>;
    }
    return payload as Record<string, unknown>;
  },
  async (payload: AdminConfigPayload) => {
    const { data } = await apiClient.put<StandardResponse<Record<string, unknown>>>(
      '/admin/config',
      payload
    );
    return unwrap(data);
  }
);
