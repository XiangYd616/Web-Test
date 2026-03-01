import type { StandardResponse } from '../types/api.types';
import {
  DEFAULT_USER_ID,
  DEFAULT_WORKSPACE_ID,
  generateLocalId,
  localQuery,
} from '../utils/localDb';
import { apiClient, unwrapResponse } from './apiClient';
import { routeByMode } from './serviceAdapter';

export type EnvironmentItem = {
  id: string;
  name: string;
  description?: string;
  variableCount: number;
  isActive: boolean;
  color?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type EnvironmentVariable = {
  key: string;
  value: string;
  type?: string;
  description?: string;
  enabled?: boolean;
  secret?: boolean;
  encrypted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EnvironmentDetail = {
  id: string;
  name: string;
  description: string;
  variables: EnvironmentVariable[];
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const unwrap = <T>(payload: StandardResponse<T>) => unwrapResponse(payload);

const parseVars = (raw: unknown): EnvironmentVariable[] => {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const toItem = (row: Record<string, unknown>): EnvironmentItem => {
  const vars = parseVars(row.variables);
  return {
    id: String(row.id),
    name: String(row.name || ''),
    description: row.description ? String(row.description) : undefined,
    variableCount: vars.length,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
};

const toDetail = (row: Record<string, unknown>): EnvironmentDetail => ({
  id: String(row.id),
  name: String(row.name || ''),
  description: String(row.description || ''),
  variables: parseVars(row.variables),
  config: {},
  metadata: {},
  isActive: Boolean(row.is_active),
  createdAt: row.created_at ? String(row.created_at) : undefined,
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
});

export const listEnvironments = routeByMode(
  async (workspaceId: string) => {
    const wsId = workspaceId || DEFAULT_WORKSPACE_ID;
    const { rows } = await localQuery(
      'SELECT * FROM environments WHERE workspace_id = ? ORDER BY created_at DESC',
      [wsId]
    );
    return rows.map(toItem);
  },
  async (workspaceId: string) => {
    // Backend uses res.paginated() → { success, data: [...], meta: { pagination } }
    const { data } = await apiClient.get<StandardResponse<EnvironmentItem[]>>('/environments', {
      params: { workspaceId },
    });
    const result = unwrap(data);
    return Array.isArray(result) ? result : [];
  }
);

export const getEnvironment = routeByMode(
  async (environmentId: string) => {
    const { rows } = await localQuery('SELECT * FROM environments WHERE id = ?', [environmentId]);
    if (rows.length === 0) return null;
    return toDetail(rows[0]);
  },
  async (environmentId: string) => {
    const { data } = await apiClient.get<StandardResponse<Record<string, unknown>>>(
      `/environments/${environmentId}`
    );
    const raw = unwrap(data);
    if (!raw) return null;
    const meta = (raw.metadata || {}) as Record<string, unknown>;
    return {
      id: String(raw.id),
      name: String(raw.name || ''),
      description: String(raw.description || ''),
      variables: Array.isArray(raw.variables) ? (raw.variables as EnvironmentVariable[]) : [],
      config: (raw.config || {}) as Record<string, unknown>,
      metadata: meta,
      isActive: Boolean(meta.isActive),
      createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
      updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    } as EnvironmentDetail;
  }
);

export const createEnvironment = routeByMode(
  async (payload: {
    workspaceId: string;
    name: string;
    description?: string;
    variables?: Array<{ key: string; value: string; type?: string; secret?: boolean }>;
  }) => {
    const id = generateLocalId();
    const now = new Date().toISOString();
    const vars = JSON.stringify(payload.variables || []);
    await localQuery(
      'INSERT INTO environments (id, workspace_id, name, description, variables, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        payload.workspaceId || DEFAULT_WORKSPACE_ID,
        payload.name,
        payload.description || '',
        vars,
        DEFAULT_USER_ID,
        DEFAULT_USER_ID,
        now,
        now,
      ]
    );
    return toDetail({
      id,
      name: payload.name,
      description: payload.description || '',
      variables: vars,
      created_at: now,
      updated_at: now,
    });
  },
  async (payload: {
    workspaceId: string;
    name: string;
    description?: string;
    variables?: Array<{ key: string; value: string; type?: string; secret?: boolean }>;
  }) => {
    const { data } = await apiClient.post<StandardResponse<EnvironmentDetail>>(
      '/environments',
      payload
    );
    return unwrap(data);
  }
);

export const updateEnvironment = routeByMode(
  async (environmentId: string, payload: { name?: string; description?: string }) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (payload.name !== undefined) {
      sets.push('name = ?');
      params.push(payload.name);
    }
    if (payload.description !== undefined) {
      sets.push('description = ?');
      params.push(payload.description);
    }
    if (sets.length === 0) return await getEnvironment(environmentId);
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(environmentId);
    await localQuery(`UPDATE environments SET ${sets.join(', ')} WHERE id = ?`, params);
    return await getEnvironment(environmentId);
  },
  async (environmentId: string, payload: { name?: string; description?: string }) => {
    const { data } = await apiClient.put<StandardResponse<EnvironmentDetail>>(
      `/environments/${environmentId}`,
      payload
    );
    return unwrap(data);
  }
);

export const deleteEnvironment = routeByMode(
  async (environmentId: string) => {
    await localQuery('DELETE FROM environments WHERE id = ?', [environmentId]);
    return null;
  },
  async (environmentId: string) => {
    const { data } = await apiClient.delete<StandardResponse<null>>(
      `/environments/${environmentId}`
    );
    return unwrap(data);
  }
);

export const setVariable = routeByMode(
  async (
    environmentId: string,
    payload: { key: string; value: string; type?: string; secret?: boolean; description?: string }
  ) => {
    const { rows } = await localQuery('SELECT variables FROM environments WHERE id = ?', [
      environmentId,
    ]);
    if (rows.length === 0) throw new Error('环境不存在');
    const vars = parseVars(rows[0].variables);
    const idx = vars.findIndex(v => v.key === payload.key);
    if (idx >= 0) {
      vars[idx] = { ...vars[idx], ...payload };
    } else {
      vars.push({
        key: payload.key,
        value: payload.value,
        type: payload.type,
        secret: payload.secret,
        description: payload.description,
      });
    }
    await localQuery('UPDATE environments SET variables = ?, updated_at = ? WHERE id = ?', [
      JSON.stringify(vars),
      new Date().toISOString(),
      environmentId,
    ]);
    return null;
  },
  async (
    environmentId: string,
    payload: { key: string; value: string; type?: string; secret?: boolean; description?: string }
  ) => {
    const { data } = await apiClient.post<StandardResponse<null>>(
      `/environments/${environmentId}/variables`,
      payload
    );
    return unwrap(data);
  }
);

export const activateEnvironment = routeByMode(
  async (environmentId: string) => {
    const { rows } = await localQuery('SELECT workspace_id FROM environments WHERE id = ?', [
      environmentId,
    ]);
    if (rows.length === 0) throw new Error('环境不存在');
    const wsId = String(rows[0].workspace_id);
    await localQuery('UPDATE environments SET is_active = 0 WHERE workspace_id = ?', [wsId]);
    await localQuery('UPDATE environments SET is_active = 1, updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      environmentId,
    ]);
    return await getEnvironment(environmentId);
  },
  async (environmentId: string) => {
    const { data } = await apiClient.post<StandardResponse<EnvironmentDetail>>(
      `/environments/${environmentId}/activate`
    );
    return unwrap(data);
  }
);

// ─── 通过后端导出环境（支持 includeSecrets） ───

export const exportEnvironmentFromServer = routeByMode(
  async (environmentId: string, _options?: { format?: string; includeSecrets?: boolean }) => {
    return await getEnvironment(environmentId);
  },
  async (environmentId: string, options?: { format?: string; includeSecrets?: boolean }) => {
    const { data } = await apiClient.get<StandardResponse<Record<string, unknown>>>(
      `/environments/${environmentId}/export`,
      {
        params: {
          format: options?.format || 'testweb',
          includeSecrets: options?.includeSecrets || false,
        },
      }
    );
    return unwrap(data);
  }
);

// ─── 通过后端导入环境 ───

export const importEnvironmentToServer = routeByMode(
  async (payload: {
    workspaceId: string;
    name: string;
    description?: string;
    variables?: Array<{ key: string; value: string; type?: string; secret?: boolean }>;
  }) => {
    return await createEnvironment(payload);
  },
  async (payload: {
    workspaceId: string;
    name: string;
    description?: string;
    variables?: Array<{ key: string; value: string; type?: string; secret?: boolean }>;
  }) => {
    const { data } = await apiClient.post<StandardResponse<EnvironmentDetail>>(
      '/environments/import',
      payload
    );
    return unwrap(data);
  }
);

// ─── 获取全局变量 ───

export const getGlobalVariables = routeByMode(
  async (_workspaceId: string) => {
    // 桌面模式暂不支持全局变量
    return [] as EnvironmentVariable[];
  },
  async (workspaceId: string) => {
    const { data } = await apiClient.get<StandardResponse<EnvironmentVariable[]>>(
      '/environments/global/variables',
      { params: { workspaceId } }
    );
    const result = unwrap(data);
    return Array.isArray(result) ? result : [];
  }
);

export const deleteVariable = routeByMode(
  async (environmentId: string, key: string) => {
    const { rows } = await localQuery('SELECT variables FROM environments WHERE id = ?', [
      environmentId,
    ]);
    if (rows.length === 0) throw new Error('环境不存在');
    const vars = parseVars(rows[0].variables);
    const filtered = vars.filter(v => v.key !== key);
    await localQuery('UPDATE environments SET variables = ?, updated_at = ? WHERE id = ?', [
      JSON.stringify(filtered),
      new Date().toISOString(),
      environmentId,
    ]);
    return null;
  },
  async (environmentId: string, key: string) => {
    const { data } = await apiClient.delete<StandardResponse<null>>(
      `/environments/${environmentId}/variables/${encodeURIComponent(key)}`
    );
    return unwrap(data);
  }
);
