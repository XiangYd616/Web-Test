/**
 * 用户Repository
 * 统一的用户相关API调用
 */

import { apiClient } from '../client';

type UserProfileSettings = Record<string, unknown>;

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  profile?: {
    avatar?: string;
    bio?: string;
    settings?: UserProfileSettings;
  };
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  search?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user' | 'viewer';
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  profile?: Partial<User['profile']>;
}

export class UserRepository {
  private readonly basePath = '/users';

  async getAll(params?: UserQueryParams): Promise<User[]> {
    return apiClient.get<User[]>(this.basePath, { params });
  }

  async getById(id: string): Promise<User> {
    return apiClient.get<User>(`${this.basePath}/${id}`);
  }

  async create(data: CreateUserDto): Promise<User> {
    return apiClient.post<User>(this.basePath, data);
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return apiClient.put<User>(`${this.basePath}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>(`${this.basePath}/me`);
  }

  async updateCurrentUser(data: UpdateUserDto): Promise<User> {
    return apiClient.put<User>(`${this.basePath}/me`, data);
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    return apiClient.post<void>(`${this.basePath}/me/password`, data);
  }

  async uploadAvatar(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient
      .getInstance()
      .post<{ url: string }>(`${this.basePath}/me/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

    return response.data;
  }

  async getStats(): Promise<unknown> {
    return apiClient.get<unknown>(`${this.basePath}/stats`);
  }
}

export const userRepository = new UserRepository();
export default userRepository;
