/**
 * userService.ts - 业务服务层
 * 
 * 文件路径: frontend\services\user\userService.ts
 * 创建时间: 2025-09-25
 */

import { unifiedApiService } from '../api/baseApiService';

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
      const response = await unifiedApiService.apiGet('/api/user/profile');
      if (response.success) {
        return response.data.user;
      }
      throw new Error(response.message || '获取用户资料失败');
    } catch (error) {
      console.error('获取用户资料失败:', error);
      throw error;
    }
  }

  // 更新用户个人资料
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    try {
      const response = await unifiedApiService.apiPut('/api/user/profile', data);
      if (response.success) {
        return response.data.user;
      }
      throw new Error(response.message || '更新用户资料失败');
    } catch (error) {
      console.error('更新用户资料失败:', error);
      throw error;
    }
  }

  // 获取用户统计信息
  async getUserStats(): Promise<UserStats> {
    try {
      const response = await unifiedApiService.apiGet('/api/user/stats');
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || '获取用户统计失败');
    } catch (error) {
      console.error('获取用户统计失败:', error);
      throw error;
    }
  }

  // 获取用户设置
  async getSettings(): Promise<UserSettings> {
    try {
      const response = await unifiedApiService.apiGet('/api/user/settings');
      if (response.success) {
        return response.data.settings;
      }
      throw new Error(response.message || '获取用户设置失败');
    } catch (error) {
      console.error('获取用户设置失败:', error);
      throw error;
    }
  }

  // 更新用户设置
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const response = await unifiedApiService.apiPut('/api/user/settings', { settings });
      if (response.success) {
        return response.data.settings;
      }
      throw new Error(response.message || '更新用户设置失败');
    } catch (error) {
      console.error('更新用户设置失败:', error);
      throw error;
    }
  }

  // 上传用户头像
  async uploadAvatar(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await unifiedApiService.apiPost('/api/user/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.success) {
        return response.data.avatarUrl;
      }
      throw new Error(response.message || '上传头像失败');
    } catch (error) {
      console.error('上传头像失败:', error);
      throw error;
    }
  }

  // 删除用户头像
  async deleteAvatar(): Promise<void> {
    try {
      const response = await unifiedApiService.apiDelete('/api/user/avatar');
      if (!response.success) {
        throw new Error(response.message || '删除头像失败');
      }
    } catch (error) {
      console.error('删除头像失败:', error);
      throw error;
    }
  }

  // 修改密码
  async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      const response = await unifiedApiService.apiPut('/api/user/password', data);
      if (!response.success) {
        throw new Error(response.message || '修改密码失败');
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  }

  // 获取用户收藏夹
  async getBookmarks(): Promise<BookmarkItem[]> {
    try {
      const response = await unifiedApiService.apiGet('/api/user/bookmarks');
      if (response.success) {
        return response.data.bookmarks;
      }
      throw new Error(response.message || '获取收藏夹失败');
    } catch (error) {
      console.error('获取收藏夹失败:', error);
      throw error;
    }
  }

  // 添加收藏
  async addBookmark(bookmark: Omit<BookmarkItem, 'id' | 'createdAt' | 'visitCount'>): Promise<BookmarkItem> {
    try {
      const response = await unifiedApiService.apiPost('/api/user/bookmarks', bookmark);
      if (response.success) {
        return response.data.bookmark;
      }
      throw new Error(response.message || '添加收藏失败');
    } catch (error) {
      console.error('添加收藏失败:', error);
      throw error;
    }
  }

  // 更新收藏
  async updateBookmark(id: string, updates: Partial<BookmarkItem>): Promise<BookmarkItem> {
    try {
      const response = await unifiedApiService.apiPut(`/api/user/bookmarks/${id}`, updates);
      if (response.success) {
        return response.data.bookmark;
      }
      throw new Error(response.message || '更新收藏失败');
    } catch (error) {
      console.error('更新收藏失败:', error);
      throw error;
    }
  }

  // 删除收藏
  async deleteBookmark(id: string): Promise<void> {
    try {
      const response = await unifiedApiService.delete(`/api/user/bookmarks/${id}`);
      if (!response.success) {
        throw new Error(response.message || '删除收藏失败');
      }
    } catch (error) {
      console.error('删除收藏失败:', error);
      throw error;
    }
  }

  // 获取用户测试历史
  async getTestHistory(page = 1, limit = 20): Promise<{ tests: any[], total: number, page: number, totalPages: number }> {
    try {
      const response = await unifiedApiService.get(`/api/user/tests?page=${page}&limit=${limit}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || '获取测试历史失败');
    } catch (error) {
      console.error('获取测试历史失败:', error);
      throw error;
    }
  }

  // 删除测试记录
  async deleteTestResult(id: string): Promise<void> {
    try {
      const response = await unifiedApiService.delete(`/api/user/tests/${id}`);
      if (!response.success) {
        throw new Error(response.message || '删除测试记录失败');
      }
    } catch (error) {
      console.error('删除测试记录失败:', error);
      throw error;
    }
  }

  // 获取用户通知
  async getNotifications(page = 1, limit = 20): Promise<{ notifications: any[], total: number, unreadCount: number }> {
    try {
      const response = await unifiedApiService.get(`/api/user/notifications?page=${page}&limit=${limit}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || '获取通知失败');
    } catch (error) {
      console.error('获取通知失败:', error);
      throw error;
    }
  }

  // 标记通知为已读
  async markNotificationAsRead(id: string): Promise<void> {
    try {
      const response = await unifiedApiService.put(`/api/user/notifications/${id}/read`);
      if (!response.success) {
        throw new Error(response.message || '标记通知失败');
      }
    } catch (error) {
      console.error('标记通知失败:', error);
      throw error;
    }
  }

  // 删除通知
  async deleteNotification(id: string): Promise<void> {
    try {
      const response = await unifiedApiService.delete(`/api/user/notifications/${id}`);
      if (!response.success) {
        throw new Error(response.message || '删除通知失败');
      }
    } catch (error) {
      console.error('删除通知失败:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
