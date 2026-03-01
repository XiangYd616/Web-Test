import type { StandardResponse } from '../types/api.types';
import { DEFAULT_USER_ID, localQuery } from '../utils/localDb';
import { apiClient, unwrapResponse } from './apiClient';
import { routeByMode } from './serviceAdapter';

type ProfileResponse = Record<string, unknown>;

type UpdateProfilePayload = {
  username?: string;
  email?: string;
  avatar?: string;
  avatarUrl?: string;
  timezone?: string;
  language?: string;
};

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
};

const unwrap = <T>(payload: StandardResponse<T>) => unwrapResponse(payload);

const normalizeProfile = (payload: ProfileResponse) => ({
  ...payload,
  avatarUrl: String(payload.avatarUrl || payload.avatar_url || ''),
  createdAt: payload.createdAt || payload.created_at || null,
  lastLogin: payload.lastLogin || payload.last_login || null,
});

export const getProfile = routeByMode(
  async () => {
    const { rows } = await localQuery('SELECT * FROM users WHERE id = ?', [DEFAULT_USER_ID]);
    if (rows.length === 0) {
      return normalizeProfile({
        id: 'guest',
        username: 'Scratch Pad',
        email: '',
        full_name: 'Scratch Pad',
        role: 'admin',
        status: 'active',
      });
    }
    return normalizeProfile(rows[0]);
  },
  async () => {
    const { data } = await apiClient.get<StandardResponse<ProfileResponse>>('/users/profile');
    return normalizeProfile(unwrap(data));
  }
);

export const updateProfile = routeByMode(
  async (payload: UpdateProfilePayload) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (payload.username !== undefined) {
      sets.push('username = ?');
      params.push(payload.username);
    }
    if (payload.email !== undefined) {
      sets.push('email = ?');
      params.push(payload.email);
    }
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(DEFAULT_USER_ID);
    if (sets.length > 1) {
      await localQuery(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    }
    return await getProfile();
  },
  async (payload: UpdateProfilePayload) => {
    const { data } = await apiClient.put<StandardResponse<Record<string, unknown>>>(
      '/users/profile',
      payload
    );
    return unwrap(data);
  }
);

export const changePassword = routeByMode(
  async (payload: ChangePasswordPayload) => {
    const { rows } = await localQuery('SELECT password_hash FROM users WHERE id = ?', [
      DEFAULT_USER_ID,
    ]);
    if (rows.length === 0) throw new Error('用户不存在');
    const now = new Date().toISOString();
    await localQuery(
      'UPDATE users SET password_hash = ?, password_changed_at = ?, updated_at = ? WHERE id = ?',
      [payload.newPassword, now, now, DEFAULT_USER_ID]
    );
    return { message: '密码已更新' };
  },
  async (payload: ChangePasswordPayload) => {
    const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
      '/users/change-password',
      payload
    );
    return unwrap(data);
  }
);

export const uploadAvatar = routeByMode(
  async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
    const now = new Date().toISOString();
    await localQuery('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [
      dataUrl,
      now,
      DEFAULT_USER_ID,
    ]);
    return { avatarUrl: dataUrl, fileId: 'local' };
  },
  async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await apiClient.post<StandardResponse<{ avatarUrl: string; fileId: string }>>(
      '/users/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return unwrap(data);
  }
);

export const getAvatarBlob = routeByMode(
  async (_fileId: string) => {
    const { rows } = await localQuery('SELECT avatar_url FROM users WHERE id = ?', [
      DEFAULT_USER_ID,
    ]);
    const avatarUrl = rows[0]?.avatar_url as string | undefined;
    if (avatarUrl && avatarUrl.startsWith('data:')) {
      const [, base64] = avatarUrl.split(',');
      const binary = atob(base64 || '');
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes]);
    }
    return new Blob();
  },
  async (fileId: string) => {
    const { data } = await apiClient.get<Blob>(`/users/avatar/${fileId}`, {
      responseType: 'blob',
    });
    return data;
  }
);

export const deleteAccount = routeByMode(
  async (_password: string) => {
    await localQuery('DELETE FROM test_executions WHERE user_id = ?', [DEFAULT_USER_ID]);
    await localQuery('DELETE FROM test_templates WHERE user_id = ?', [DEFAULT_USER_ID]);
    await localQuery('UPDATE users SET status = ?, is_active = 0, updated_at = ? WHERE id = ?', [
      'deleted',
      new Date().toISOString(),
      DEFAULT_USER_ID,
    ]);
    return { message: '账户已删除' };
  },
  async (password: string) => {
    const { data } = await apiClient.delete<StandardResponse<Record<string, unknown>>>(
      '/users/account',
      { data: { password } }
    );
    return unwrap(data);
  }
);
