import Logger from '@/utils/logger';
import { apiClient } from './api/client';

type RequestConfig = Record<string, unknown>;
type DataPayload = Record<string, unknown>;

const api = apiClient.getInstance();

const withAuth = (config: RequestConfig = {}) => {
  const token = localStorage.getItem('auth_token');
  if (!token) return config;

  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
};

const handleAuthError = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = '/login';
  }
  throw error;
};

const request = {
  get: (url: string, config?: RequestConfig) =>
    api.get(url, withAuth(config)).catch(handleAuthError),
  post: (url: string, data?: unknown, config?: RequestConfig) =>
    api.post(url, data, withAuth(config)).catch(handleAuthError),
  put: (url: string, data?: unknown, config?: RequestConfig) =>
    api.put(url, data, withAuth(config)).catch(handleAuthError),
  delete: (url: string, config?: RequestConfig) =>
    api.delete(url, withAuth(config)).catch(handleAuthError),
};

// 系统设置相关接口
export const systemSettingsAPI = {
  // 获取所有系统设置
  getAllSettings: async () => {
    const response = await request.get('/admin/settings');
    return response?.data;
  },

  // 获取特定分类的系统设置
  getSettingsByCategory: async (category: string) => {
    const response = await request.get(`/admin/settings/${category}`);
    return response?.data;
  },

  // 更新特定分类的系统设置
  updateSettingsByCategory: async (category: string, settings: DataPayload) => {
    const response = await request.put(`/admin/settings/${category}`, { settings });
    return response?.data;
  },

  // 获取单个系统设置
  getSetting: async (category: string, key: string) => {
    const response = await request.get(`/admin/settings/${category}/${key}`);
    return response?.data;
  },

  // 更新单个系统设置
  updateSetting: async (category: string, key: string, value: unknown) => {
    const response = await request.put(`/admin/settings/${category}/${key}`, { value });
    return response?.data;
  },
};

// 用户偏好设置相关接口
export const userPreferencesAPI = {
  // 获取所有用户偏好
  getAllPreferences: async () => {
    const response = await request.get('/preferences');
    return response?.data;
  },

  // 获取特定分类的用户偏好
  getPreferencesByCategory: async (category: string) => {
    const response = await request.get(`/preferences/${category}`);
    return response?.data;
  },

  // 更新特定分类的用户偏好
  updatePreferencesByCategory: async (category: string, preferences: DataPayload) => {
    const response = await request.put(`/preferences/${category}`, { preferences });
    return response?.data;
  },

  // 获取单个用户偏好
  getPreference: async (category: string, key: string) => {
    const response = await request.get(`/preferences/${category}/${key}`);
    return response?.data;
  },

  // 更新单个用户偏好
  updatePreference: async (category: string, key: string, value: unknown) => {
    const response = await request.put(`/preferences/${category}/${key}`, { value });
    return response?.data;
  },

  // 重置用户偏好到默认值
  resetPreferences: async (category?: string) => {
    const url = category ? `/preferences/reset/${category}` : '/preferences/reset';
    const response = await request.post(url);
    return response?.data;
  },

  // 导出用户偏好
  exportPreferences: async () => {
    const response = await request.get('/preferences/export/all');
    return response?.data;
  },

  // 导入用户偏好
  importPreferences: async (preferences: DataPayload) => {
    const response = await request.post('/preferences/import', { preferences });
    return response?.data;
  },
};

// 设置服务类
export class SettingsService {
  // 系统设置缓存
  private static systemSettingsCache: Record<string, unknown> = {};
  private static userPreferencesCache: Record<string, unknown> = {};
  private static cacheTimestamp = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  // 检查缓存是否有效
  private static isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  // 获取系统设置（带缓存）
  static async getSystemSettings(category?: string, useCache = true): Promise<unknown> {
    if (useCache && this.isCacheValid() && this.systemSettingsCache[category || 'all']) {
      return this.systemSettingsCache[category || 'all'];
    }

    try {
      const result = category
        ? await systemSettingsAPI.getSettingsByCategory(category)
        : await systemSettingsAPI.getAllSettings();

      // 更新缓存
      this.systemSettingsCache[category || 'all'] = result.data;
      this.cacheTimestamp = Date.now();

      return result.data;
    } catch (error) {
      Logger.error('Failed to get system settings:', error);
      throw error;
    }
  }

  // 更新系统设置
  static async updateSystemSettings(category: string, settings: DataPayload): Promise<unknown> {
    try {
      const result = await systemSettingsAPI.updateSettingsByCategory(category, settings);

      // 清除缓存
      this.systemSettingsCache = {};

      return result.data;
    } catch (error) {
      Logger.error('Failed to update system settings:', error);
      throw error;
    }
  }

  // 获取用户偏好（带缓存）
  static async getUserPreferences(category?: string, useCache = true): Promise<unknown> {
    if (useCache && this.isCacheValid() && this.userPreferencesCache[category || 'all']) {
      return this.userPreferencesCache[category || 'all'];
    }

    try {
      const result = category
        ? await userPreferencesAPI.getPreferencesByCategory(category)
        : await userPreferencesAPI.getAllPreferences();

      // 更新缓存
      this.userPreferencesCache[category || 'all'] = result.data;
      this.cacheTimestamp = Date.now();

      return result.data;
    } catch (error) {
      Logger.error('Failed to get user preferences:', error);
      throw error;
    }
  }

  // 更新用户偏好
  static async updateUserPreferences(category: string, preferences: DataPayload): Promise<unknown> {
    try {
      const result = await userPreferencesAPI.updatePreferencesByCategory(category, preferences);

      // 清除缓存
      this.userPreferencesCache = {};

      return result.data;
    } catch (error) {
      Logger.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  // 清除缓存
  static clearCache(): void {
    this.systemSettingsCache = {};
    this.userPreferencesCache = {};
    this.cacheTimestamp = 0;
  }

  // 获取公开的系统设置（不需要认证）
  static async getPublicSettings(): Promise<Record<string, unknown>> {
    try {
      // 这里可以调用一个专门的公开设置接口
      const settings = (await this.getSystemSettings()) as Record<string, Record<string, unknown>>;

      // 过滤出公开设置
      const publicSettings: Record<string, Record<string, unknown>> = {};
      Object.keys(settings).forEach(category => {
        publicSettings[category] = {};
        // 这里需要根据实际的isPublic字段来过滤
        // 暂时返回一些基础的公开设置
        if (category === 'general') {
          publicSettings[category] = {
            siteName: settings[category]?.siteName || 'Test Web App',
            siteDescription: settings[category]?.siteDescription || '专业的Web测试平台',
            timezone: settings[category]?.timezone || 'Asia/Shanghai',
            language: settings[category]?.language || 'zh-CN',
            maintenanceMode: settings[category]?.maintenanceMode || false,
            registrationEnabled: settings[category]?.registrationEnabled || true,
          } as Record<string, unknown>;
        }
      });

      return publicSettings;
    } catch (error) {
      Logger.error('Failed to get public settings:', error);
      // 返回默认设置
      return {
        general: {
          siteName: 'Test Web App',
          siteDescription: '专业的Web测试平台',
          timezone: 'Asia/Shanghai',
          language: 'zh-CN',
          maintenanceMode: false,
          registrationEnabled: true,
        },
      };
    }
  }
}

// ==================== 账户设置API ====================
export const accountAPI = {
  // 更新用户个人信息
  updateProfile: async (profileData: DataPayload) => {
    const response = await request.put('/auth/profile', profileData);
    return response?.data;
  },

  // 修改密码
  changePassword: async (passwordData: DataPayload) => {
    const response = await request.put('/auth/change-password', passwordData);
    return response?.data;
  },
};

// ==================== 系统监控API ====================
export const monitoringAPI = {
  // 获取系统监控数据
  getSystemMonitoring: async () => {
    const response = await request.get('/monitoring/system');
    return response?.data;
  },

  // 获取系统健康状态
  getSystemHealth: async () => {
    const response = await request.get('/monitoring/health');
    return response?.data;
  },

  // 更新监控设置
  updateMonitoringSettings: async (settings: DataPayload) => {
    const response = await request.put('/monitoring/settings', { settings });
    return response?.data;
  },
};

// ==================== 定时任务API ====================
export const scheduledTasksAPI = {
  // 获取定时任务列表
  getTasks: async () => {
    const response = await request.get('/scheduled-tasks');
    return response?.data;
  },

  // 创建定时任务
  createTask: async (taskData: DataPayload) => {
    const response = await request.post('/scheduled-tasks', taskData);
    return response?.data;
  },

  // 更新定时任务
  updateTask: async (taskId: string, updates: DataPayload) => {
    const response = await request.put(`/scheduled-tasks/${taskId}`, updates);
    return response?.data;
  },

  // 删除定时任务
  deleteTask: async (taskId: string) => {
    const response = await request.delete(`/scheduled-tasks/${taskId}`);
    return response?.data;
  },

  // 手动执行定时任务
  runTask: async (taskId: string) => {
    const response = await request.post(`/scheduled-tasks/${taskId}/run`);
    return response?.data;
  },
};

// ==================== 系统日志API ====================
export const systemLogsAPI = {
  // 获取系统日志
  getLogs: async (params: RequestConfig = {}) => {
    const response = await request.get('/system-logs', { params });
    return response?.data;
  },

  // 清理系统日志
  cleanLogs: async (conditions: DataPayload) => {
    const response = await request.delete('/system-logs', { data: conditions });
    return response?.data as unknown;
  },

  // 导出系统日志
  exportLogs: async (params: RequestConfig = {}) => {
    const response = await request.get('/system-logs/export', {
      params,
      responseType: 'blob',
    });
    return response as unknown as Record<string, unknown>;
  },
};

export const backupAPI = {
  // 获取备份列表
  getBackups: async () => {
    const response = await request.get('/backups');
    return response?.data;
  },

  // 创建备份
  createBackup: async (backupData: DataPayload) => {
    const response = await request.post('/backups', backupData);
    return response?.data;
  },

  // 恢复备份
  restoreBackup: async (backupId: string, confirmRestore: boolean = false) => {
    const response = await request.post(`/backups/${backupId}/restore`, { confirmRestore });
    return response?.data;
  },
};

// ==================== 数据管理API ====================
export const dataManagementAPI = {
  // 获取导出任务列表
  getExportTasks: async () => {
    const response = await request.get('/data-management/exports');
    return response?.data;
  },

  // 获取导入任务列表
  getImportTasks: async () => {
    const response = await request.get('/data-management/imports');
    return response?.data;
  },

  // 创建导出任务
  createExportTask: async (exportData: DataPayload) => {
    const response = await request.post('/data-management/exports', exportData);
    return response?.data;
  },

  // 创建导入任务
  createImportTask: async (importData: DataPayload) => {
    const response = await request.post('/data-management/imports', importData);
    return response?.data;
  },

  // 获取数据管理统计
  getStats: async () => {
    const response = await request.get('/data-management/stats');
    return response?.data;
  },
};

// 创建单例实例
export const settingsService = new SettingsService();

export default SettingsService;
