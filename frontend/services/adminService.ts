// 后台管理服务 - 真实API实现

import type { ActivityFilter,;
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
  // UserFilter
 } from '../types/admin';// 已修复
import type { CreateUserData, UpdateUserData, User  } from '../types/user';class AdminService {
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {>
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);`
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  private static instance: AdminService;
  private baseURL = "/api/admin";``
  private constructor() { }

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  // 获取认证令牌
  private getAuthToken(): string {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken");"
    if (!token) {
      throw new Error('未找到认证令牌，请重新登录");"
    }
    return token;
  }

  // 通用API请求方法
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders = {
      "Content-Type': 'application/json','`"`
      'Authorization': `Bearer ${this.getAuthToken()}`'`
    };

    const config: RequestInit  = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };
    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          // 认证失败，清除令牌并重定向到登录页
          localStorage.removeItem("authToken");``
          sessionStorage.removeItem('authToken");"
          window.location.href = '/login'
          throw new Error('认证失败，请重新登录");"
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "请求失败");``
      }

      return result.data;
    } catch (error) {
      console.error(`API请求失败 [${endpoint}]:`, error);`
      throw error;
    }
  }

  // ==================== 系统统计 ====================

  async getSystemStats(): Promise<SystemStats> {
    return this.apiRequest<SystemStats>("/stats");``
  }

  async getSystemMonitor(): Promise<SystemMonitor> {
    return this.apiRequest<SystemMonitor>('/monitor");"
  }

  async getTestHistory(): Promise<any[]> {
    return this.apiRequest<any[]>('/test-history");"
  }

  // ==================== 用户管理 ====================

  async getUsers(filter: UserFilter = {}, page = 1, limit = 20): Promise<AdminApiResponse<AdminUser[]>> {
    try {
      const queryParams = new URLSearchParams();

      if (filter.role) queryParams.append('role', filter.role);
      if (filter.status) queryParams.append('status', filter.status);
      if (filter.search) queryParams.append('search', filter.search);
      if (filter.emailVerified !== undefined) queryParams.append('email_verified', filter.emailVerified.toString());
      queryParams.append('page', page.toString());
      queryParams.append("limit', limit.toString());"
      const endpoint = `/users?${queryParams.toString()}`;
      const response = await fetch(`${this.baseURL}${endpoint}`, {`
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "获取用户列表失败");``
      }

      return {
        success: true,
        data: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "获取用户列表失败"
      };
    }
  }

  async createUser(userData: CreateUserData): Promise<AdminApiResponse<User>> {
    try {
      const response = await fetch(`${this.baseURL}/users`, {`
        method: "POST','`"`
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "创建用户失败");``
      }

      return {
        success: true,
        data: result.data,
        message: result.message || '用户创建成功'
      };
    } catch (error) {
      console.error('创建用户失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建用户失败'
      };
    }
  }

  async updateUser(userId: string, updateData: UpdateUserData): Promise<AdminApiResponse<User>> {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`, {`
        method: "PUT','`"`
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "更新用户失败");``
      }

      return {
        success: true,
        data: result.data,
        message: result.message || '用户更新成功'
      };
    } catch (error) {
      console.error('更新用户失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "更新用户失败"
      };
    }
  }

  async deleteUser(userId: string): Promise<AdminApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`, {`
        method: "DELETE','`"`
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "删除用户失败");``
      }

      return {
        success: true,
        message: result.message || '用户删除成功'
      };
    } catch (error) {
      console.error('删除用户失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除用户失败'
      };
    }
  }

  async bulkUserAction(action: UserBulkAction): Promise<AdminApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/users/bulk`, {`
        method: "POST','`"`
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        },
        body: JSON.stringify(action)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "批量操作失败");``
      }

      return {
        success: true,
        message: result.message || '批量操作完成'
      };
    } catch (error) {
      console.error('批量用户操作失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量操作失败'
      };
    }
  }

  // ==================== 测试管理 ====================

  async getTests(filter: TestFilter = {}, page = 1, limit = 20): Promise<AdminApiResponse<TestManagement[]>> {
    try {
      const queryParams = new URLSearchParams();

      if (filter.userId) queryParams.append('userId', filter.userId);
      if (filter.type) queryParams.append('type', filter.type);
      if (filter.status) queryParams.append('status', filter.status);
      if (filter.priority) queryParams.append('priority', filter.priority);
      if (filter.search) queryParams.append('search', filter.search);
      queryParams.append('page', page.toString());
      queryParams.append("limit', limit.toString());"
      const endpoint = `/tests?${queryParams.toString()}`;
      const response = await fetch(`${this.baseURL}${endpoint}`, {`
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "获取测试列表失败");``
      }

      return {
        success: true,
        data: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('获取测试列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "获取测试列表失败"
      };
    }
  }

  async cancelTest(testId: string): Promise<AdminApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/tests/${testId}/cancel`, {`
        method: "POST','`"`
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "取消测试失败");``
      }

      return {
        success: true,
        message: result.message || '测试已取消'
      };
    } catch (error) {
      console.error('取消测试失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '取消测试失败'
      };
    }
  }

  // ==================== 活动日志 ====================

  async getActivityLogs(filter: ActivityFilter = {}, page = 1, limit = 20): Promise<AdminApiResponse<ActivityLog[]>> {
    try {
      const queryParams = new URLSearchParams();

      if (filter.userId) queryParams.append('userId', filter.userId);
      if (filter.action) queryParams.append('action', filter.action);
      if (filter.resource) queryParams.append('resource', filter.resource);
      if (filter.severity) queryParams.append('severity', filter.severity);
      if (filter.success !== undefined) queryParams.append('success', filter.success.toString());
      if (filter.search) queryParams.append('search', filter.search);
      queryParams.append('page', page.toString());
      queryParams.append("limit', limit.toString());"
      const endpoint = `/logs?${queryParams.toString()}`;
      const response = await fetch(`${this.baseURL}${endpoint}`, {`
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "获取活动日志失败");``
      }

      return {
        success: true,
        data: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('获取活动日志失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "获取活动日志失败"
      };
    }
  }

  // ==================== 系统配置 ====================

  async getSystemConfig(): Promise<AdminApiResponse<SystemConfig>> {
    try {
      const response = await fetch(`${this.baseURL}/config`, {`
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "获取系统配置失败");``
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('获取系统配置失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取系统配置失败'
      };
    }
  }

  async updateSystemConfig(config: SystemConfig): Promise<AdminApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/config`, {`
        method: "PUT','`"`
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "更新系统配置失败");``
      }

      return {
        success: true,
        message: result.message || '系统配置更新成功'
      };
    } catch (error) {
      console.error('更新系统配置失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "更新系统配置失败"
      };
    }
  }

  // ==================== 备份管理 ====================

  async getBackups(): Promise<AdminApiResponse<BackupInfo[]>> {
    try {
      const response = await fetch(`${this.baseURL}/backups`, {`
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "获取备份列表失败");``
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('获取备份列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取备份列表失败'
      };
    }
  }

  async createBackup(options: { includeDatabase: boolean; includeFiles: boolean; includeConfigs: boolean }): Promise<AdminApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/backups`, {`
        method: "POST','`"`
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "创建备份失败");``
      }

      return {
        success: true,
        message: result.message || '备份创建成功'
      };
    } catch (error) {
      console.error('创建备份失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "创建备份失败"
      };
    }
  }

  async deleteBackup(backupId: string): Promise<AdminApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/backups/${backupId}`, {`
        method: "DELETE','`"`
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "删除备份失败");``
      }

      return {
        success: true,
        message: result.message || '备份删除成功'
      };
    } catch (error) {
      console.error('删除备份失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除备份失败'
      };
    }
  }

  async restoreBackup(backupId: string): Promise<AdminApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/backups/${backupId}/restore`, {`
        method: "POST','`"`
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "恢复备份失败");``
      }

      return {
        success: true,
        message: result.message || '备份恢复成功'
      };
    } catch (error) {
      console.error('恢复备份失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "恢复备份失败"
      };
    }
  }

  // ==================== 权限管理 ====================

  async getPermissionGroups(): Promise<AdminApiResponse<PermissionGroup[]>> {
    try {
      const response = await fetch(`${this.baseURL}/permissions/groups`, {`
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`'`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "获取权限组失败");``
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('获取权限组失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取权限组失败'
      };
    }
  }

  // ==================== 数据库健康检查 ====================

  async getDatabaseHealth(): Promise<AdminApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {`
        headers: {
          "Authorization': `Bearer ${this.getAuthToken()}`'`"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "获取数据库健康状态失败");``
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('获取数据库健康状态失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取数据库健康状态失败'
      };
    }
  }
}

export const adminService = AdminService.getInstance();
