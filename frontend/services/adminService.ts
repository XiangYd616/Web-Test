// 后台管理服务 - 真实API实现

import Logger from '@/utils/logger';
import type {
  ActivityFilter,
  ActivityLog,
  AdminApiResponse,
  AdminUser,
  BackupInfo,
  PermissionGroup,
  SystemConfig,
  SystemMonitor,
  SystemStats,
  TestFilter,
  TestManagement,
  UserBulkAction,
  UserFilter,
} from '../types/admin.types';
import { apiClient } from './api/client';

/**

 * AdminService类 - 负责处理相关功能

 */
import type { CreateUserData, UpdateUserData, User } from '../types/user.types';

class AdminService {
  private static instance: AdminService;
  private baseURL = '/api/admin';

  private constructor() {}

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  // 获取认证令牌
  private getAuthToken(): string {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      throw new Error('未找到认证令牌，请重新登录');
    }
    return token;
  }

  // 通用API请求方法
  private async apiRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: unknown;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getAuthToken()}`,
    };

    try {
      const response = await apiClient.getInstance().request({
        url,
        method: options.method || 'GET',
        data: options.data,
        params: options.params,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      const result = response.data as {
        success?: boolean;
        data?: T;
        error?: string;
        message?: string;
      };
      if (!result?.success) {
        throw new Error(result?.error || result?.message || '请求失败');
      }

      return result.data as T;
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error(`API请求失败 [${endpoint}]:`, error);
      throw error;
    }
  }

  private handleAuthFailure(error: unknown): void {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      window.location.href = '/login';
      throw new Error('认证失败，请重新登录');
    }
  }

  // ==================== 系统统计 ====================

  async getSystemStats(): Promise<SystemStats> {
    return this.apiRequest<SystemStats>('/stats');
  }

  async getSystemMonitor(): Promise<SystemMonitor> {
    return this.apiRequest<SystemMonitor>('/monitor');
  }

  async getTestHistory(): Promise<unknown[]> {
    return this.apiRequest<unknown[]>('/test-history');
  }

  // ==================== 用户管理 ====================

  async getUsers(
    filter: UserFilter = {},
    page = 1,
    limit = 20
  ): Promise<AdminApiResponse<AdminUser[]>> {
    try {
      const params: Record<string, string | number | boolean> = {
        page,
        limit,
      };

      if (filter.role) params.role = filter.role;
      if (filter.status) params.status = filter.status;
      if (filter.search) params.search = filter.search;
      if (filter.emailVerified !== undefined) params.email_verified = filter.emailVerified;

      const response = await apiClient.getInstance().get(`${this.baseURL}/users`, {
        params,
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      const result = response.data as {
        success?: boolean;
        data?: AdminUser[];
        pagination?: AdminApiResponse<AdminUser[]>['pagination'];
        meta?: { pagination?: AdminApiResponse<AdminUser[]>['pagination'] };
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || '获取用户列表失败');
      }

      return {
        success: true,
        data: result.data,
        pagination: result.pagination || result.meta?.pagination,
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('获取用户列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取用户列表失败',
      };
    }
  }

  async createUser(userData: CreateUserData): Promise<AdminApiResponse<User>> {
    try {
      const response = await apiClient.getInstance().post(`${this.baseURL}/users`, userData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as {
        success?: boolean;
        data?: User;
        message?: string;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || '创建用户失败');
      }

      return {
        success: true,
        data: result.data,
        message: result.message || '用户创建成功',
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('创建用户失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建用户失败',
      };
    }
  }

  async updateUser(userId: string, updateData: UpdateUserData): Promise<AdminApiResponse<User>> {
    try {
      const response = await apiClient
        .getInstance()
        .put(`${this.baseURL}/users/${userId}`, updateData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.getAuthToken()}`,
          },
        });
      const result = response.data as {
        success?: boolean;
        data?: User;
        message?: string;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || '更新用户失败');
      }

      return {
        success: true,
        data: result.data,
        message: result.message || '用户更新成功',
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('更新用户失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新用户失败',
      };
    }
  }

  async deleteUser(userId: string): Promise<AdminApiResponse> {
    try {
      const response = await apiClient.getInstance().delete(`${this.baseURL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as { success?: boolean; message?: string; error?: string };

      if (!result.success) {
        throw new Error(result.error || '删除用户失败');
      }

      return {
        success: true,
        message: result.message || '用户删除成功',
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('删除用户失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除用户失败',
      };
    }
  }

  async bulkUserAction(action: UserBulkAction): Promise<AdminApiResponse> {
    try {
      const response = await apiClient.getInstance().post(`${this.baseURL}/users/bulk`, action, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as { success?: boolean; message?: string; error?: string };

      if (!result.success) {
        throw new Error(result.error || '批量操作失败');
      }

      return {
        success: true,
        message: result.message || '批量操作完成',
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('批量用户操作失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量操作失败',
      };
    }
  }

  // ==================== 测试管理 ====================

  async getTests(
    filter: TestFilter = {},
    page = 1,
    limit = 20
  ): Promise<AdminApiResponse<TestManagement[]>> {
    try {
      const params: Record<string, string | number> = {
        page,
        limit,
      };

      if (filter.userId) params.userId = filter.userId;
      if (filter.type) params.type = filter.type;
      if (filter.status) params.status = filter.status;
      if (filter.priority) params.priority = filter.priority;
      if (filter.search) params.search = filter.search;

      const response = await apiClient.getInstance().get(`${this.baseURL}/tests`, {
        params,
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as {
        success?: boolean;
        data?: TestManagement[];
        pagination?: AdminApiResponse<TestManagement[]>['pagination'];
        meta?: { pagination?: AdminApiResponse<TestManagement[]>['pagination'] };
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || '获取测试列表失败');
      }

      return {
        success: true,
        data: result.data,
        pagination: result.pagination || result.meta?.pagination,
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('获取测试列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取测试列表失败',
      };
    }
  }

  async cancelTest(testId: string): Promise<AdminApiResponse> {
    try {
      const response = await apiClient.getInstance().post(
        `${this.baseURL}/tests/${testId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.getAuthToken()}`,
          },
        }
      );
      const result = response.data as { success?: boolean; message?: string; error?: string };

      if (!result.success) {
        throw new Error(result.error || '取消测试失败');
      }

      return {
        success: true,
        message: result.message || '测试已取消',
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('取消测试失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '取消测试失败',
      };
    }
  }

  // ==================== 活动日志 ====================

  async getActivityLogs(
    filter: ActivityFilter = {},
    page = 1,
    limit = 20
  ): Promise<AdminApiResponse<ActivityLog[]>> {
    try {
      const params: Record<string, string | number | boolean> = {
        page,
        limit,
      };

      if (filter.userId) params.userId = filter.userId;
      if (filter.action) params.action = filter.action;
      if (filter.resource) params.resource = filter.resource;
      if (filter.severity) params.severity = filter.severity;
      if (filter.success !== undefined) params.success = filter.success;
      if (filter.search) params.search = filter.search;

      const response = await apiClient.getInstance().get(`${this.baseURL}/logs`, {
        params,
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      const result = response.data as {
        success?: boolean;
        data?: ActivityLog[];
        pagination?: AdminApiResponse<ActivityLog[]>['pagination'];
        meta?: { pagination?: AdminApiResponse<ActivityLog[]>['pagination'] };
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || '获取活动日志失败');
      }

      return {
        success: true,
        data: result.data,
        pagination: result.pagination || result.meta?.pagination,
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('获取活动日志失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取活动日志失败',
      };
    }
  }

  // ==================== 系统配置 ====================

  async getSystemConfig(): Promise<AdminApiResponse<SystemConfig>> {
    try {
      const response = await apiClient.getInstance().get(`${this.baseURL}/config`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as { success?: boolean; data?: SystemConfig; error?: string };

      if (!result.success) {
        throw new Error(result.error || '获取系统配置失败');
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('获取系统配置失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取系统配置失败',
      };
    }
  }

  async updateSystemConfig(config: SystemConfig): Promise<AdminApiResponse> {
    try {
      const response = await apiClient.getInstance().put(`${this.baseURL}/config`, config, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as { success?: boolean; message?: string; error?: string };

      if (!result.success) {
        throw new Error(result.error || '更新系统配置失败');
      }

      return {
        success: true,
        message: result.message || '系统配置更新成功',
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('更新系统配置失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新系统配置失败',
      };
    }
  }

  // ==================== 备份管理 ====================

  async getBackups(): Promise<AdminApiResponse<BackupInfo[]>> {
    try {
      const response = await apiClient.getInstance().get(`${this.baseURL}/backups`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as { success?: boolean; data?: BackupInfo[]; error?: string };

      if (!result.success) {
        throw new Error(result.error || '获取备份列表失败');
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('获取备份列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取备份列表失败',
      };
    }
  }

  async createBackup(options: {
    includeDatabase: boolean;
    includeFiles: boolean;
    includeConfigs: boolean;
  }): Promise<AdminApiResponse> {
    try {
      const response = await apiClient.getInstance().post(`${this.baseURL}/backups`, options, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as { success?: boolean; message?: string; error?: string };

      if (!result.success) {
        throw new Error(result.error || '创建备份失败');
      }

      return {
        success: true,
        message: result.message || '备份创建成功',
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('创建备份失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建备份失败',
      };
    }
  }

  async deleteBackup(backupId: string): Promise<AdminApiResponse> {
    try {
      const response = await apiClient.getInstance().delete(`${this.baseURL}/backups/${backupId}`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as { success?: boolean; message?: string; error?: string };

      if (!result.success) {
        throw new Error(result.error || '删除备份失败');
      }

      return {
        success: true,
        message: result.message || '备份删除成功',
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('删除备份失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除备份失败',
      };
    }
  }

  async restoreBackup(backupId: string): Promise<AdminApiResponse> {
    try {
      const response = await apiClient.getInstance().post(
        `${this.baseURL}/backups/${backupId}/restore`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.getAuthToken()}`,
          },
        }
      );
      const result = response.data as { success?: boolean; message?: string; error?: string };

      if (!result.success) {
        throw new Error(result.error || '恢复备份失败');
      }

      return {
        success: true,
        message: result.message || '备份恢复成功',
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('恢复备份失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '恢复备份失败',
      };
    }
  }

  // ==================== 权限管理 ====================

  async getPermissionGroups(): Promise<AdminApiResponse<PermissionGroup[]>> {
    try {
      const response = await apiClient.getInstance().get(`${this.baseURL}/permissions/groups`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as {
        success?: boolean;
        data?: PermissionGroup[];
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || '获取权限组失败');
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('获取权限组失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取权限组失败',
      };
    }
  }

  // ==================== 数据库健康检查 ====================

  async getDatabaseHealth(): Promise<AdminApiResponse<unknown>> {
    try {
      const response = await apiClient.getInstance().get(`${this.baseURL}/health`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });
      const result = response.data as { success?: boolean; data?: unknown; error?: string };

      if (!result.success) {
        throw new Error(result.error || '获取数据库健康状态失败');
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      this.handleAuthFailure(error);
      Logger.error('获取数据库健康状态失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取数据库健康状态失败',
      };
    }
  }
}

export const adminService = AdminService.getInstance();
export const _adminService = adminService; // Alias for backward compatibility
