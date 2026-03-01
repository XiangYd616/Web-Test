import type { StandardResponse } from '../types/api.types';
import {
  DEFAULT_USER_ID,
  DEFAULT_WORKSPACE_ID,
  generateLocalId,
  localQuery,
} from '../utils/localDb';
import { apiClient, unwrapResponse } from './apiClient';
import { routeByMode } from './serviceAdapter';

export type CollectionItem = {
  id: string;
  name: string;
  description?: string;
  defaultEnvironmentId?: string | null;
  metadata?: Record<string, unknown>;
  requestCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CollectionDetail = CollectionItem & {
  requests?: Array<Record<string, unknown>>;
  variables?: Record<string, string>;
  auth?: Record<string, unknown> | null;
  folders?: Array<Record<string, unknown>>;
};

type PaginatedResponse = {
  collections: CollectionItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const unwrap = <T>(payload: StandardResponse<T>) => unwrapResponse(payload);

const parseJson = <T>(raw: unknown, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as T);
  } catch {
    return fallback;
  }
};

// ─── 桌面模式辅助：从独立表读取 requests/folders ───

const localGetRequests = async (collectionId: string): Promise<Array<Record<string, unknown>>> => {
  const { rows } = await localQuery(
    'SELECT * FROM collection_requests WHERE collection_id = ? ORDER BY sort_order ASC, created_at ASC',
    [collectionId]
  );
  return rows.map(r => ({
    id: String(r.id),
    name: String(r.name || ''),
    description: String(r.description || ''),
    method: String(r.method || 'GET'),
    url: String(r.url || ''),
    headers: parseJson<Record<string, string>>(r.headers, {}),
    params: parseJson<Record<string, string>>(r.params, {}),
    body: r.body ? parseJson<unknown>(r.body, {}) : null,
    auth: r.auth ? parseJson<Record<string, unknown>>(r.auth, {}) : null,
    tests: parseJson<string[]>(r.tests, []),
    timeout: r.timeout ? Number(r.timeout) : undefined,
    metadata: parseJson<Record<string, unknown>>(r.metadata, {}),
    folderId: r.folder_id ? String(r.folder_id) : undefined,
  }));
};

const localGetFolders = async (collectionId: string): Promise<Array<Record<string, unknown>>> => {
  const { rows } = await localQuery(
    'SELECT * FROM collection_folders WHERE collection_id = ? ORDER BY sort_order ASC, created_at ASC',
    [collectionId]
  );
  return rows.map(f => ({
    id: String(f.id),
    name: String(f.name || ''),
    description: String(f.description || ''),
    parentId: f.parent_id ? String(f.parent_id) : undefined,
  }));
};

const localToItem = async (row: Record<string, unknown>): Promise<CollectionItem> => {
  const collectionId = String(row.id);
  const { rows: reqRows } = await localQuery(
    'SELECT COUNT(*) as cnt FROM collection_requests WHERE collection_id = ?',
    [collectionId]
  );
  return {
    id: collectionId,
    name: String(row.name || ''),
    description: row.description ? String(row.description) : undefined,
    defaultEnvironmentId: row.default_environment_id ? String(row.default_environment_id) : null,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    requestCount: Number(reqRows[0]?.cnt || 0),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
};

const localToDetail = async (row: Record<string, unknown>): Promise<CollectionDetail> => {
  const collectionId = String(row.id);
  const meta = parseJson<Record<string, unknown>>(row.metadata, {});
  const requests = await localGetRequests(collectionId);
  const folders = await localGetFolders(collectionId);
  return {
    id: collectionId,
    name: String(row.name || ''),
    description: row.description ? String(row.description) : undefined,
    defaultEnvironmentId: row.default_environment_id ? String(row.default_environment_id) : null,
    metadata: meta,
    requestCount: requests.length,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    requests,
    variables: (meta.variables as Record<string, string>) || {},
    auth: (meta.auth as Record<string, unknown>) || null,
    folders,
  };
};

export const listCollections = routeByMode(
  async (params?: { page?: number; limit?: number; workspaceId?: string }) => {
    const { rows } = await localQuery(
      'SELECT * FROM collections WHERE workspace_id = ? ORDER BY created_at DESC',
      [params?.workspaceId || DEFAULT_WORKSPACE_ID]
    );
    const items: CollectionItem[] = [];
    for (const row of rows) {
      items.push(await localToItem(row));
    }
    return items;
  },
  async (params?: { page?: number; limit?: number; workspaceId?: string }) => {
    const { data } = await apiClient.get<StandardResponse<PaginatedResponse>>('/collections', {
      params,
    });
    const result = unwrap(data);
    return (result?.collections || []).map((c: Record<string, unknown>) => ({
      ...c,
      requestCount: Array.isArray((c as { requests?: unknown[] }).requests)
        ? (c as { requests: unknown[] }).requests.length
        : 0,
    })) as CollectionItem[];
  }
);

export const getCollection = routeByMode(
  async (collectionId: string) => {
    const { rows } = await localQuery('SELECT * FROM collections WHERE id = ?', [collectionId]);
    if (rows.length === 0) return null;
    return await localToDetail(rows[0]);
  },
  async (collectionId: string) => {
    const { data } = await apiClient.get<StandardResponse<CollectionDetail>>(
      `/collections/${collectionId}`
    );
    return unwrap(data);
  }
);

type CreateCollectionPayload = {
  name: string;
  description?: string;
  workspaceId?: string;
  requests?: Array<Record<string, unknown>>;
  variables?: Record<string, string>;
  auth?: Record<string, unknown> | null;
  folders?: Array<Record<string, unknown>>;
};

export const createCollection = routeByMode(
  async (payload: CreateCollectionPayload) => {
    const id = generateLocalId();
    const now = new Date().toISOString();
    const metadata = JSON.stringify({
      variables: payload.variables || {},
      auth: payload.auth || null,
    });
    await localQuery(
      'INSERT INTO collections (id, workspace_id, name, description, metadata, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        payload.workspaceId || DEFAULT_WORKSPACE_ID,
        payload.name,
        payload.description || '',
        metadata,
        DEFAULT_USER_ID,
        now,
        now,
      ]
    );
    // Insert requests into collection_requests table
    for (const req of payload.requests || []) {
      const reqId = (req.id as string) || generateLocalId();
      await localQuery(
        'INSERT INTO collection_requests (id, collection_id, name, description, method, url, headers, params, body, auth, tests, timeout, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          reqId,
          id,
          String(req.name || ''),
          String(req.description || ''),
          String(req.method || 'GET'),
          String(req.url || ''),
          JSON.stringify(req.headers || {}),
          JSON.stringify(req.params || {}),
          JSON.stringify(req.body || null),
          req.auth ? JSON.stringify(req.auth) : null,
          JSON.stringify(req.tests || []),
          req.timeout || null,
          JSON.stringify(req.metadata || {}),
          now,
          now,
        ]
      );
    }
    // Insert folders into collection_folders table
    for (const folder of payload.folders || []) {
      const folderId = (folder.id as string) || generateLocalId();
      await localQuery(
        'INSERT INTO collection_folders (id, collection_id, parent_id, name, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          folderId,
          id,
          folder.parentId || null,
          String(folder.name || ''),
          String(folder.description || ''),
          DEFAULT_USER_ID,
          now,
        ]
      );
    }
    return (await getCollection(id)) as CollectionDetail;
  },
  async (payload: CreateCollectionPayload) => {
    const { data } = await apiClient.post<StandardResponse<CollectionDetail>>(
      '/collections',
      payload
    );
    return unwrap(data);
  }
);

export const updateCollection = routeByMode(
  async (
    collectionId: string,
    payload: { name?: string; description?: string; defaultEnvironmentId?: string | null }
  ) => {
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
    if (payload.defaultEnvironmentId !== undefined) {
      sets.push('default_environment_id = ?');
      params.push(payload.defaultEnvironmentId);
    }
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(collectionId);
    await localQuery(`UPDATE collections SET ${sets.join(', ')} WHERE id = ?`, params);
    return await getCollection(collectionId);
  },
  async (
    collectionId: string,
    payload: { name?: string; description?: string; defaultEnvironmentId?: string | null }
  ) => {
    const { data } = await apiClient.put<StandardResponse<CollectionDetail>>(
      `/collections/${collectionId}`,
      payload
    );
    return unwrap(data);
  }
);

export const deleteCollection = routeByMode(
  async (collectionId: string) => {
    await localQuery('DELETE FROM collections WHERE id = ?', [collectionId]);
    return null;
  },
  async (collectionId: string) => {
    const { data } = await apiClient.delete<StandardResponse<null>>(`/collections/${collectionId}`);
    return unwrap(data);
  }
);

// ─── 请求管理（桌面模式操作 collection_requests 表） ───

export const addRequest = routeByMode(
  async (collectionId: string, request: Record<string, unknown>) => {
    const reqId = (request.id as string) || generateLocalId();
    const now = new Date().toISOString();
    await localQuery(
      'INSERT INTO collection_requests (id, collection_id, name, description, method, url, headers, params, body, auth, tests, timeout, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        reqId,
        collectionId,
        String(request.name || ''),
        String(request.description || ''),
        String(request.method || 'GET'),
        String(request.url || ''),
        JSON.stringify(request.headers || {}),
        JSON.stringify(request.params || {}),
        JSON.stringify(request.body || null),
        request.auth ? JSON.stringify(request.auth) : null,
        JSON.stringify(request.tests || []),
        request.timeout || null,
        JSON.stringify(request.metadata || {}),
        now,
        now,
      ]
    );
    await localQuery('UPDATE collections SET updated_at = ? WHERE id = ?', [now, collectionId]);
    return { ...request, id: reqId };
  },
  async (collectionId: string, request: Record<string, unknown>) => {
    const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
      `/collections/${collectionId}/requests`,
      request
    );
    return unwrap(data);
  }
);

export const updateRequest = routeByMode(
  async (collectionId: string, requestId: string, updates: Record<string, unknown>) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      method: 'method',
      url: 'url',
      timeout: 'timeout',
    };
    const jsonFieldMap: Record<string, string> = {
      headers: 'headers',
      params: 'params',
      body: 'body',
      auth: 'auth',
      tests: 'tests',
      metadata: 'metadata',
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (updates[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(updates[key]);
      }
    }
    for (const [key, col] of Object.entries(jsonFieldMap)) {
      if (updates[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(JSON.stringify(updates[key]));
      }
    }
    if (sets.length === 0) return updates;
    const now = new Date().toISOString();
    sets.push('updated_at = ?');
    params.push(now);
    params.push(requestId);
    params.push(collectionId);
    await localQuery(
      `UPDATE collection_requests SET ${sets.join(', ')} WHERE id = ? AND collection_id = ?`,
      params
    );
    await localQuery('UPDATE collections SET updated_at = ? WHERE id = ?', [now, collectionId]);
    return { id: requestId, ...updates };
  },
  async (collectionId: string, requestId: string, updates: Record<string, unknown>) => {
    const { data } = await apiClient.put<StandardResponse<Record<string, unknown>>>(
      `/collections/${collectionId}/requests/${requestId}`,
      updates
    );
    return unwrap(data);
  }
);

export const deleteRequest = routeByMode(
  async (collectionId: string, requestId: string) => {
    await localQuery('DELETE FROM collection_requests WHERE id = ? AND collection_id = ?', [
      requestId,
      collectionId,
    ]);
    await localQuery('UPDATE collections SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      collectionId,
    ]);
    return null;
  },
  async (collectionId: string, requestId: string) => {
    const { data } = await apiClient.delete<StandardResponse<null>>(
      `/collections/${collectionId}/requests/${requestId}`
    );
    return unwrap(data);
  }
);

export const addFolder = routeByMode(
  async (
    collectionId: string,
    folder: { name: string; description?: string; parentId?: string }
  ) => {
    const folderId = generateLocalId();
    const now = new Date().toISOString();
    await localQuery(
      'INSERT INTO collection_folders (id, collection_id, parent_id, name, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        folderId,
        collectionId,
        folder.parentId || null,
        folder.name,
        folder.description || '',
        DEFAULT_USER_ID,
        now,
      ]
    );
    await localQuery('UPDATE collections SET updated_at = ? WHERE id = ?', [now, collectionId]);
    return { ...folder, id: folderId };
  },
  async (
    collectionId: string,
    folder: { name: string; description?: string; parentId?: string }
  ) => {
    const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
      `/collections/${collectionId}/folders`,
      folder
    );
    return unwrap(data);
  }
);

export const deleteFolder = routeByMode(
  async (collectionId: string, folderId: string) => {
    await localQuery('DELETE FROM collection_folders WHERE id = ? AND collection_id = ?', [
      folderId,
      collectionId,
    ]);
    await localQuery('UPDATE collections SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      collectionId,
    ]);
    return null;
  },
  async (collectionId: string, folderId: string) => {
    const { data } = await apiClient.delete<StandardResponse<null>>(
      `/collections/${collectionId}/folders/${folderId}`
    );
    return unwrap(data);
  }
);

// ─── 导出集合（通过后端，云端模式） ───

export const exportCollection = routeByMode(
  async (collectionId: string) => {
    // 桌面模式直接返回本地详情
    return await getCollection(collectionId);
  },
  async (collectionId: string) => {
    const { data } = await apiClient.get<StandardResponse<CollectionDetail>>(
      `/collections/${collectionId}/export`
    );
    return unwrap(data);
  }
);

// ─── 设置集合默认环境 ───

export const setDefaultEnvironment = routeByMode(
  async (collectionId: string, environmentId: string | null) => {
    await localQuery(
      'UPDATE collections SET default_environment_id = ?, updated_at = ? WHERE id = ?',
      [environmentId, new Date().toISOString(), collectionId]
    );
    return await getCollection(collectionId);
  },
  async (collectionId: string, environmentId: string | null) => {
    const { data } = await apiClient.post<StandardResponse<CollectionDetail>>(
      `/collections/${collectionId}/default-environment`,
      { environmentId }
    );
    return unwrap(data);
  }
);

// ─── 批量更新 definition（用于导入） ───

type CollectionDefinition = {
  requests?: Array<Record<string, unknown>>;
  variables?: Record<string, string>;
  auth?: Record<string, unknown> | null;
  folders?: Array<Record<string, unknown>>;
};

export const updateCollectionDefinition = routeByMode(
  async (collectionId: string, definition: CollectionDefinition) => {
    const now = new Date().toISOString();
    // Update variables/auth in metadata
    if (definition.variables !== undefined || definition.auth !== undefined) {
      const { rows } = await localQuery('SELECT metadata FROM collections WHERE id = ?', [
        collectionId,
      ]);
      const meta = parseJson<Record<string, unknown>>(rows[0]?.metadata, {});
      if (definition.variables !== undefined) meta.variables = definition.variables;
      if (definition.auth !== undefined) meta.auth = definition.auth;
      await localQuery('UPDATE collections SET metadata = ?, updated_at = ? WHERE id = ?', [
        JSON.stringify(meta),
        now,
        collectionId,
      ]);
    }
    // Replace requests
    if (definition.requests !== undefined) {
      await localQuery('DELETE FROM collection_requests WHERE collection_id = ?', [collectionId]);
      for (const req of definition.requests) {
        const reqId = (req.id as string) || generateLocalId();
        await localQuery(
          'INSERT INTO collection_requests (id, collection_id, name, description, method, url, headers, params, body, auth, tests, timeout, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            reqId,
            collectionId,
            String(req.name || ''),
            String(req.description || ''),
            String(req.method || 'GET'),
            String(req.url || ''),
            JSON.stringify(req.headers || {}),
            JSON.stringify(req.params || {}),
            JSON.stringify(req.body || null),
            req.auth ? JSON.stringify(req.auth) : null,
            JSON.stringify(req.tests || []),
            req.timeout || null,
            JSON.stringify(req.metadata || {}),
            now,
            now,
          ]
        );
      }
    }
    // Replace folders
    if (definition.folders !== undefined) {
      await localQuery('DELETE FROM collection_folders WHERE collection_id = ?', [collectionId]);
      for (const folder of definition.folders) {
        const folderId = (folder.id as string) || generateLocalId();
        await localQuery(
          'INSERT INTO collection_folders (id, collection_id, parent_id, name, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            folderId,
            collectionId,
            folder.parentId || null,
            String(folder.name || ''),
            String(folder.description || ''),
            DEFAULT_USER_ID,
            now,
          ]
        );
      }
    }
    return await getCollection(collectionId);
  },
  async (collectionId: string, definition: CollectionDefinition) => {
    // Backend updateCollection expects top-level fields (requests, variables, auth, folders)
    const { data } = await apiClient.put<StandardResponse<CollectionDetail>>(
      `/collections/${collectionId}`,
      definition
    );
    return unwrap(data);
  }
);
