/**
 * userService.ts - 业务服务层
 *
 * 文件路径: frontend\services\user\userService.ts
 * 创建时间: 2025-09-25
 */

import Logger from '@/utils/logger';
import { apiClient } from '../api/client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  website?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  preferences?: Record<string, any>;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserStats {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageScore: number;
  totalTime: number;
  favoriteTestType: string;
  testsToday: number;
  testsThisWeek: number;
  testsThisMonth: number;
  favoriteTests: number;
  testsByType: Record<string, number>;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  lastVisited?: string;
  visitCount: number;
  favicon?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    testCompletion: boolean;
    systemUpdates: boolean;
    securityAlerts: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showEmail: boolean;
    showActivity: boolean;
  };
  testing: {
    defaultTimeout: number;
    autoSaveResults: boolean;
    showDetailedLogs: boolean;
  };
}

export interface UpdateProfileData {
  fullName?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

class UserService {
  // 获取用户个人资料
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await apiClient.get<{ user: UserProfile }>('/users/profile');
      return response.user;
    } catch (error) {
      Logger.error('获取用户资料失败:', error);
      throw error;
    }
  }

  // 更新用户个人资料
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    try {
      const response = await apiClient.put<{ user: UserProfile }>('/users/profile', data);
      return response.user;
    } catch (error) {
      Logger.error('更新用户资料失败:', error);
      throw error;
    }
  }

  // 获取用户统计信息
  async getUserStats(): Promise<UserStats> {
    try {
      return await apiClient.get<UserStats>('/users/stats');
    } catch (error) {
      Logger.error('获取用户统计失败:', error);
      throw error;
    }
  }

  // 获取用户设置
  async getSettings(): Promise<UserSettings> {
    try {
      const response = await apiClient.get<{ settings: UserSettings }>('/users/settings');
      return response.settings;
    } catch (error) {
      Logger.error('获取用户设置失败:', error);
      throw error;
    }
  }

  // 更新用户设置
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const response = await apiClient.put<{ settings: UserSettings }>('/users/settings', {
        settings,
      });
      return response.settings;
    } catch (error) {
      Logger.error('更新用户设置失败:', error);
      throw error;
    }
  }

  // 上传用户头像
  async uploadAvatar(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await apiClient.post<{ avatarUrl: string }>('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.avatarUrl;
    } catch (error) {
      Logger.error('上传头像失败:', error);
      throw error;
    }
  }

  // 删除用户头像
  async deleteAvatar(): Promise<void> {
    try {
      await apiClient.delete('/users/avatar');
    } catch (error) {
      Logger.error('删除头像失败:', error);
      throw error;
    }
  }

  // 修改密码
  async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      await apiClient.put('/users/password', data);
    } catch (error) {
      Logger.error('修改密码失败:', error);
      throw error;
    }
  }

  // 获取用户收藏夹
  async getBookmarks(): Promise<BookmarkItem[]> {
    try {
      const response = await apiClient.get<{ bookmarks: BookmarkItem[] }>('/users/bookmarks');
      return response.bookmarks;
    } catch (error) {
      Logger.error('获取收藏夹失败:', error);
      throw error;
    }
  }

  // 添加收藏
  async addBookmark(
    bookmark: Omit<BookmarkItem, 'id' | 'createdAt' | 'visitCount'>
  ): Promise<BookmarkItem> {
    try {
      const response = await apiClient.post<{ bookmark: BookmarkItem }>(
        '/users/bookmarks',
        bookmark
      );
      return response.bookmark;
    } catch (error) {
      Logger.error('添加收藏失败:', error);
      throw error;
    }
  }

  // 更新收藏
  async updateBookmark(id: string, updates: Partial<BookmarkItem>): Promise<BookmarkItem> {
    try {
      const response = await apiClient.put<{ bookmark: BookmarkItem }>(
        `/users/bookmarks/${id}`,
        updates
      );
      return response.bookmark;
    } catch (error) {
      Logger.error('更新收藏失败:', error);
      throw error;
    }
  }

  // 删除收藏
  async deleteBookmark(id: string): Promise<void> {
    try {
      await apiClient.delete(`/users/bookmarks/${id}`);
    } catch (error) {
      Logger.error('删除收藏失败:', error);
      throw error;
    }
  }

  // 获取用户测试历史
  async getTestHistory(
    page = 1,
    limit = 20
  ): Promise<{ tests: unknown[]; total: number; page: number; totalPages: number }> {
    try {
      return await apiClient.get(`/users/tests?page=${page}&limit=${limit}`);
    } catch (error) {
      Logger.error('获取测试历史失败:', error);
      throw error;
    }
  }

  // 删除测试记录
  async deleteTestResult(id: string): Promise<void> {
    try {
      await apiClient.delete(`/users/tests/${id}`);
    } catch (error) {
      Logger.error('删除测试记录失败:', error);
      throw error;
    }
  }

  // 获取用户通知
  async getNotifications(
    page = 1,
    limit = 20
  ): Promise<{ notifications: unknown[]; total: number; unreadCount: number }> {
    try {
      return await apiClient.get(`/users/notifications?page=${page}&limit=${limit}`);
    } catch (error) {
      Logger.error('获取通知失败:', error);
      throw error;
    }
  }

  // 标记通知为已读
  async markNotificationAsRead(id: string): Promise<void> {
    try {
      await apiClient.put(`/users/notifications/${id}/read`);
    } catch (error) {
      Logger.error('标记通知失败:', error);
      throw error;
    }
  }

  // 删除通知
  async deleteNotification(id: string): Promise<void> {
    try {
      await apiClient.delete(`/users/notifications/${id}`);
    } catch (error) {
      Logger.error('删除通知失败:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
