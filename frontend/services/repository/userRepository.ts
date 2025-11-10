/**
 * 用户数据访问层
 * 封装所有用户相关的API调用
 */

import { apiClient } from '../api/client';

/**
 * 用户接口
 */
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
    settings?: Record<string, any>;
  };
}

/**
 * 用户查询参数
 */
export interface UserQueryParams {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  search?: string;
}

/**
 * 创建用户数据
 */
export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user' | 'viewer';
}

/**
 * 更新用户数据
 */
export interface UpdateUserDto {
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  profile?: Partial<User['profile']>;
}

/**
 * 用户Repository类
 */
export class UserRepository {
  private readonly basePath = '/users';

  /**
   * 获取用户列表
   */
  async getAll(params?: UserQueryParams): Promise<User[]> {
    return apiClient.get<User[]>(this.basePath, { params });
  }

  /**
   * 获取单个用户
   */
  async getById(id: string): Promise<User> {
    return apiClient.get<User>(`${this.basePath}/${id}`);
  }

  /**
   * 创建用户
   */
  async create(data: CreateUserDto): Promise<User> {
    return apiClient.post<User>(this.basePath, data);
  }

  /**
   * 更新用户
   */
  async update(id: string, data: UpdateUserDto): Promise<User> {
    return apiClient.put<User>(`${this.basePath}/${id}`, data);
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  /**
   * 获取当前登录用户
   */
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>(`${this.basePath}/me`);
  }

  /**
   * 更新当前用户信息
   */
  async updateCurrentUser(data: UpdateUserDto): Promise<User> {
    return apiClient.put<User>(`${this.basePath}/me`, data);
  }

  /**
   * 修改密码
   */
  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    return apiClient.post<void>(`${this.basePath}/me/password`, data);
  }

  /**
   * 上传头像
   */
  async uploadAvatar(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.getInstance().post<{ url: string }>(
      `${this.basePath}/me/avatar`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response.data;
  }

  /**
   * 获取用户统计
   */
  async getStats(): Promise<any> {
    return apiClient.get<any>(`${this.basePath}/stats`);
  }
}

/**
 * 导出单例
 */
export const userRepository = new UserRepository();

/**
 * 默认导出
 */
export default userRepository;
