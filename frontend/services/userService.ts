import { apiClient } from './api

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'admin' | 'user' | 'viewer'
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  preferences?: {
    theme: 'light' | 'dark' | 'auto'
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      testResults: boolean;
      systemAlerts: boolean;
    };
  };
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user' | 'viewer'
  permissions?: string[];
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user' | 'viewer'
  permissions?: string[];
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    testResults: boolean;
    systemAlerts: boolean;
  };
}

class UserService {
  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw new Error('获取用户信息失败');
    }
  }

  // 更新当前用户信息
  async updateCurrentUser(data: Partial<UpdateUserRequest>): Promise<User> {
    try {
      const response = await apiClient.put('/users/me', data);
      return response.data;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw new Error('更新用户信息失败');
    }
  }

  // 修改密码
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    try {
      await apiClient.post('/users/me/password', data);
    } catch (error) {
      console.error('修改密码失败:', error);
      throw new Error('修改密码失败');
    }
  }

  // 更新用户偏好设置
  async updatePreferences(preferences: UserPreferences): Promise<UserPreferences> {
    try {
      const response = await apiClient.put('/users/me/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('更新偏好设置失败:', error);
      throw new Error('更新偏好设置失败');
    }
  }

  // 上传头像
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await apiClient.post('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('上传头像失败:', error);
      throw new Error('上传头像失败');
    }
  }

  // 删除头像
  async deleteAvatar(): Promise<void> {
    try {
      await apiClient.delete('/users/me/avatar');
    } catch (error) {
      console.error('删除头像失败:', error);
      throw new Error('删除头像失败');
    }
  }

  // 获取用户列表（管理员功能）
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get('/users', { params });
      return response.data;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw new Error('获取用户列表失败');
    }
  }

  // 创建用户（管理员功能）
  async createUser(data: CreateUserRequest): Promise<User> {
    try {
      const response = await apiClient.post('/users', data);
      return response.data;
    } catch (error) {
      console.error('创建用户失败:', error);
      throw new Error('创建用户失败');
    }
  }

  // 更新用户（管理员功能）
  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    try {
      const response = await apiClient.put(`/users/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('更新用户失败:', error);
      throw new Error('更新用户失败');
    }
  }

  // 删除用户（管理员功能）
  async deleteUser(id: string): Promise<void> {
    try {
      await apiClient.delete(`/users/${id}`);
    } catch (error) {
      console.error('删除用户失败:', error);
      throw new Error('删除用户失败');
    }
  }

  // 重置用户密码（管理员功能）
  async resetUserPassword(id: string): Promise<{ temporaryPassword: string }> {
    try {
      const response = await apiClient.post(`/users/${id}/reset-password`);
      return response.data;
    } catch (error) {
      console.error('重置密码失败:', error);
      throw new Error('重置密码失败');
    }
  }

  // 启用/禁用用户（管理员功能）
  async toggleUserStatus(id: string, isActive: boolean): Promise<User> {
    try {
      const response = await apiClient.patch(`/users/${id}/status`, { isActive });
      return response.data;
    } catch (error) {
      console.error('更新用户状态失败:', error);
      throw new Error('更新用户状态失败');
    }
  }

  // 获取用户活动日志
  async getUserActivityLog(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    activities: Array<{
      id: string;
      action: string;
      details: any;
      timestamp: string;
      ipAddress?: string;
      userAgent?: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get('/users/me/activity', { params });
      return response.data;
    } catch (error) {
      console.error('获取活动日志失败:', error);
      throw new Error('获取活动日志失败');
    }
  }

  // 获取用户统计信息
  async getUserStats(): Promise<{
    testsCreated: number;
    testsRun: number;
    totalTestTime: number;
    lastActivity: string;
    favoriteTestTypes: string[];
  }> {
    try {
      const response = await apiClient.get('/users/me/stats');
      return response.data;
    } catch (error) {
      console.error('获取用户统计失败:', error);
      throw new Error('获取用户统计失败');
    }
  }
}

export const userService = new UserService();
