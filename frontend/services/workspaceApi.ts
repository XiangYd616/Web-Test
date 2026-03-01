import i18n from '../i18n';
import type { StandardResponse } from '../types/api.types';
import {
  DEFAULT_USER_ID,
  DEFAULT_WORKSPACE_ID,
  generateLocalId,
  localQuery,
} from '../utils/localDb';
import { apiClient, unwrapResponse } from './apiClient';
import { routeByMode } from './serviceAdapter';

type WorkspaceItem = {
  id: string;
  name: string;
  description?: string;
  visibility?: string;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  metadata?: Record<string, unknown>;
};

type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  email?: string;
  username?: string;
};

const unwrap = <T>(payload: StandardResponse<T>) => unwrapResponse(payload);

const unwrapPaginated = <T>(payload: StandardResponse<T[]>) => {
  if (!payload.success) {
    throw new Error(payload.message || i18n.t('common.requestFailed'));
  }
  return payload.data || [];
};

const normalizeWorkspace = (item: WorkspaceItem & Record<string, unknown>) => ({
  ...item,
  createdAt: (item.createdAt || item.created_at) as string | undefined,
  updatedAt: (item.updatedAt || item.updated_at) as string | undefined,
  role: (item.role || item.workspace_role) as string | undefined,
  metadata: (item.metadata || item.workspace_metadata) as Record<string, unknown> | undefined,
});

const rowToWorkspace = (row: Record<string, unknown>): WorkspaceItem & Record<string, unknown> => ({
  id: String(row.id),
  name: String(row.name || ''),
  description: row.description ? String(row.description) : undefined,
  createdAt: row.created_at ? String(row.created_at) : undefined,
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  role: 'owner',
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const listWorkspaces = routeByMode(
  async (_params?: { page?: number; limit?: number }) => {
    const { rows } = await localQuery(
      'SELECT w.* FROM workspaces w INNER JOIN workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = ? AND wm.status = ? ORDER BY w.created_at DESC',
      [DEFAULT_USER_ID, 'active']
    );
    if (rows.length === 0) {
      const now = new Date().toISOString();
      await localQuery(
        'INSERT OR IGNORE INTO workspaces (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [DEFAULT_WORKSPACE_ID, '默认工作空间', '本地默认工作空间', DEFAULT_USER_ID, now, now]
      );
      await localQuery(
        'INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [generateLocalId(), DEFAULT_WORKSPACE_ID, DEFAULT_USER_ID, 'owner', 'active', now, now]
      );
      return [
        normalizeWorkspace(
          rowToWorkspace({
            id: DEFAULT_WORKSPACE_ID,
            name: '默认工作空间',
            description: '本地默认工作空间',
            created_at: now,
            updated_at: now,
          })
        ),
      ];
    }
    return rows.map(r => normalizeWorkspace(rowToWorkspace(r)));
  },
  async (params?: { page?: number; limit?: number }) => {
    const { data } = await apiClient.get<StandardResponse<WorkspaceItem[]>>('/workspaces', {
      params,
    });
    return unwrapPaginated(data).map(normalizeWorkspace);
  }
);

export const getWorkspaceDetail = routeByMode(
  async (workspaceId: string) => {
    const { rows } = await localQuery('SELECT * FROM workspaces WHERE id = ?', [workspaceId]);
    if (rows.length === 0) return null;
    return normalizeWorkspace(rowToWorkspace(rows[0]));
  },
  async (workspaceId: string) => {
    const { data } = await apiClient.get<StandardResponse<Record<string, unknown>>>(
      `/workspaces/${workspaceId}`
    );
    return unwrap(data);
  }
);

type CreateWorkspacePayload = {
  name: string;
  description?: string;
  visibility?: 'private' | 'team' | 'public';
};

export const createWorkspace = routeByMode(
  async (payload: CreateWorkspacePayload) => {
    const id = generateLocalId();
    const now = new Date().toISOString();
    await localQuery(
      'INSERT INTO workspaces (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, payload.name, payload.description || '', DEFAULT_USER_ID, now, now]
    );
    await localQuery(
      'INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [generateLocalId(), id, DEFAULT_USER_ID, 'owner', 'active', now, now]
    );
    return normalizeWorkspace(
      rowToWorkspace({
        id,
        name: payload.name,
        description: payload.description || '',
        created_at: now,
        updated_at: now,
      })
    );
  },
  async (payload: CreateWorkspacePayload) => {
    const { data } = await apiClient.post<StandardResponse<WorkspaceItem>>('/workspaces', payload);
    return normalizeWorkspace(unwrap(data));
  }
);

export const deleteWorkspace = routeByMode(
  async (workspaceId: string) => {
    await localQuery('DELETE FROM workspace_members WHERE workspace_id = ?', [workspaceId]);
    await localQuery('DELETE FROM collections WHERE workspace_id = ?', [workspaceId]);
    await localQuery('DELETE FROM environments WHERE workspace_id = ?', [workspaceId]);
    await localQuery('DELETE FROM workspaces WHERE id = ?', [workspaceId]);
    return null;
  },
  async (workspaceId: string) => {
    const { data } = await apiClient.delete<StandardResponse<null>>(`/workspaces/${workspaceId}`);
    return unwrap(data);
  }
);

export const updateWorkspace = routeByMode(
  async (
    workspaceId: string,
    payload: { name?: string; description?: string; visibility?: 'private' | 'team' | 'public' }
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
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(workspaceId);
    await localQuery(`UPDATE workspaces SET ${sets.join(', ')} WHERE id = ?`, params);
    const detail = await getWorkspaceDetail(workspaceId);
    return detail as ReturnType<typeof normalizeWorkspace>;
  },
  async (
    workspaceId: string,
    payload: { name?: string; description?: string; visibility?: 'private' | 'team' | 'public' }
  ) => {
    const { data } = await apiClient.put<StandardResponse<WorkspaceItem>>(
      `/workspaces/${workspaceId}`,
      payload
    );
    return normalizeWorkspace(unwrap(data));
  }
);

export const inviteWorkspaceMember = routeByMode(
  async (_workspaceId: string, _payload: { email: string; role?: string }): Promise<never> => {
    throw new Error('桌面版暂不支持邀请成员');
  },
  async (workspaceId: string, payload: { email: string; role?: string }) => {
    const { data } = await apiClient.post<StandardResponse<WorkspaceMember>>(
      `/workspaces/${workspaceId}/invitations`,
      payload
    );
    return unwrap(data);
  }
);

export const updateWorkspaceMemberRole = routeByMode(
  async (_workspaceId: string, _memberId: string, _payload: { role: string }): Promise<never> => {
    throw new Error('桌面版暂不支持修改成员角色');
  },
  async (workspaceId: string, memberId: string, payload: { role: string }) => {
    const { data } = await apiClient.put<StandardResponse<WorkspaceMember>>(
      `/workspaces/${workspaceId}/members/${memberId}`,
      payload
    );
    return unwrap(data);
  }
);

export const removeWorkspaceMember = routeByMode(
  async (_workspaceId: string, _memberId: string): Promise<never> => {
    throw new Error('桌面版暂不支持移除成员');
  },
  async (workspaceId: string, memberId: string) => {
    const { data } = await apiClient.delete<StandardResponse<Record<string, unknown>>>(
      `/workspaces/${workspaceId}/members/${memberId}`
    );
    return unwrap(data);
  }
);
