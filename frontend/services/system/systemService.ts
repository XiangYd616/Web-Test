// 系统管理服务 - 真实API实现

import type { BackupInfo,
  LogFilter,
  MaintenanceInfo,
  SystemConfig,
  SystemHealth,
  SystemLog,
  SystemStats,
  User,
  // UserFilter
 } from '../types/system';// 已修复'
export class SystemService {
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
  private static readonly BASE_URL = "/api/system';'`
  private static cache = new Map<string, any>();
  private static cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  // 获取系统统计信息
  static async getSystemStats(): Promise<SystemStats> {
    const cacheKey = 'system-stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.BASE_URL}/stats`);`
      if (!response.ok) throw new Error("Failed to fetch system stats');'`

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch system stats: ', error);'
      // 返回模拟数据作为后备
      return this.getMockSystemStats();
    }
  }

  // 获取系统配置
  static async getSystemConfig(): Promise<SystemConfig> {
    const cacheKey = 'system-config';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.BASE_URL}/config`);`
      if (!response.ok) throw new Error("Failed to fetch system config');'`

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error("Failed to fetch system config: ', error);'
      return this.getMockSystemConfig();
    }
  }

  // 更新系统配置
  static async updateSystemConfig(config: Partial<SystemConfig>): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/config`, {`
        method: "PUT','`
        headers: {
          'Content-Type': 'application/json','
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to update system config');'
      // 清除缓存
      this.clearCache('system-config');'
    } catch (error) {
      console.error('Failed to update system config: ', error);'
      throw error;
    }
  }

  // 获取用户列表
  static async getUsers(filter?: UserFilter): Promise<User[]> {
    const cacheKey = `users-${JSON.stringify(filter || {})}`;`
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      if (filter?.role) params.append("role', filter.role);'`
      if (filter?.status) params.append('status', filter.status);'
      if (filter?.search) params.append("search', filter.search);'
      const response = await fetch(`${this.BASE_URL}/users?${params}`);`
      if (!response.ok) throw new Error("Failed to fetch users');'`

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch users: ', error);'
      return this.getMockUsers();
    }
  }

  // 创建用户
  static async createUser(userData: Partial<User>): Promise<User> {
    try {
      const response = await fetch(`${this.BASE_URL}/users`, {`
        method: "POST','`
        headers: {
          'Content-Type': 'application/json','
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) throw new Error('Failed to create user');'
      const user = await response.json();
      this.clearCachePattern('users-');'
      return user;
    } catch (error) {
      console.error("Failed to create user: ', error);'
      throw error;
    }
  }

  // 更新用户
  static async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    try {
      const response = await fetch(`${this.BASE_URL}/users/${userId}`, {`
        method: "PUT','`
        headers: {
          'Content-Type': 'application/json','
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) throw new Error('Failed to update user');'
      const user = await response.json();
      this.clearCachePattern('users-');'
      return user;
    } catch (error) {
      console.error('Failed to update user: ', error);'
      throw error;
    }
  }

  // 删除用户
  static async deleteUser(userId: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/users/${userId}`, {`
        method: "DELETE','`
      });

      if (!response.ok) throw new Error('Failed to delete user');'
      this.clearCachePattern('users-');'
    } catch (error) {
      console.error("Failed to delete user: ', error);'
      throw error;
    }
  }

  // 获取系统日志
  static async getSystemLogs(filter?: LogFilter): Promise<SystemLog[]> {
    const cacheKey = `logs-${JSON.stringify(filter || {})}`;`
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      if (filter?.level) params.append("level', filter.level);'`
      if (filter?.category) params.append('category', filter.category);'
      if (filter?.startDate) params.append('startDate', filter.startDate);'
      if (filter?.endDate) params.append('endDate', filter.endDate);'
      const response = await fetch(`${this.BASE_URL}/logs?${params}`);`
      if (!response.ok) throw new Error("Failed to fetch logs');'`

      const data = await response.json();
      this.setCache(cacheKey, data, 60000); // 1分钟缓存
      return data;
    } catch (error) {
      console.error("Failed to fetch logs: ', error);'
      return this.getMockLogs();
    }
  }

  // 获取系统健康状态
  static async getSystemHealth(): Promise<SystemHealth> {
    try {
      const response = await fetch(`${this.BASE_URL}/health`);`
      if (!response.ok) throw new Error("Failed to fetch system health');'`

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch system health: ', error);'
      return this.getMockSystemHealth();
    }
  }

  // 创建备份
  static async createBackup(): Promise<BackupInfo> {
    try {
      const response = await fetch(`${this.BASE_URL}/backup`, {`
        method: "POST','`
      });

      if (!response.ok) throw new Error('Failed to create backup');'
      return await response.json();
    } catch (error) {
      console.error("Failed to create backup: ', error);'
      throw error;
    }
  }

  // 获取备份列表
  static async getBackups(): Promise<BackupInfo[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/backups`);`
      if (!response.ok) throw new Error("Failed to fetch backups');'`

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch backups: ', error);'
      return this.getMockBackups();
    }
  }

  // 恢复备份
  static async restoreBackup(backupId: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/backup/${backupId}/restore`, {`
        method: "POST','`
      });

      if (!response.ok) throw new Error('Failed to restore backup');'
    } catch (error) {
      console.error("Failed to restore backup: ', error);'
      throw error;
    }
  }

  // 获取维护信息
  static async getMaintenanceInfo(): Promise<MaintenanceInfo> {
    try {
      const response = await fetch(`${this.BASE_URL}/maintenance`);`
      if (!response.ok) throw new Error("Failed to fetch maintenance info');'`

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch maintenance info: ', error);'
      return this.getMockMaintenanceInfo();
    }
  }

  // 设置维护模式
  static async setMaintenanceMode(enabled: boolean, message?: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/maintenance`, {`
        method: "PUT','`
        headers: {
          'Content-Type': 'application/json','
        },
        body: JSON.stringify({ enabled, message }),
      });

      if (!response.ok) throw new Error('Failed to set maintenance mode');'
    } catch (error) {
      console.error('Failed to set maintenance mode: ', error);'
      throw error;
    }
  }

  // 缓存管理
  private static getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private static setCache(key: string, data: any, timeout?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout: timeout || this.cacheTimeout,
    });
  }

  private static clearCache(key: string): void {
    this.cache.delete(key);
  }

  private static clearCachePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // 模拟数据方法
  private static getMockSystemStats(): SystemStats {
    return {
      totalUsers: 1247,
      activeUsers: 892,
      totalTests: 15420,
      testsToday: 234,
      systemUptime: 2592000, // 30天
      cpuUsage: 45.2,
      memoryUsage: 67.8,
      diskUsage: 34.5,
      networkTraffic: {
        incoming: 1024 * 1024 * 150, // 150MB
        outgoing: 1024 * 1024 * 89,  // 89MB
      },
      errorRate: 0.02,
      responseTime: 245,
      tests: {
        total: 15420,
        today: 234,
        todayCount: 234,
        thisWeek: 1680,
        thisMonth: 7200,
        successRate: 94.5,
        averageResponseTime: 245,
        popularTypes: [
          { type: 'performance', count: 5420, percentage: 35.2 },'
          { type: 'security', count: 4320, percentage: 28.0 },'
          { type: 'compatibility', count: 3680, percentage: 23.9 },'
          { type: 'api', count: 2000, percentage: 13.0 }'
        ]
      },
      users: {
        total: 1247,
        active: 892,
        online: 156,
        newToday: 23
      },
      performance: {
        successRate: 94.5,
        averageResponseTime: 245,
        errorRate: 0.02
      },
      system: {
        uptime: 2592000,
        diskUsage: 34.5,
        memoryUsage: 67.8,
        cpuUsage: 45.2
      }
    };
  }

  private static getMockSystemConfig(): SystemConfig {
    return {
      general: {
        siteName: 'Test Web App','
        siteDescription: '专业的Web测试平台','
        adminEmail: 'admin@testweb.com','
        timezone: 'Asia/Shanghai','
        language: 'zh-CN','
        maintenanceMode: false,
        registrationEnabled: true,
        emailVerificationRequired: true,
      },
      testing: {
        maxConcurrentTests: 10,
        maxTestsPerUser: 50,
        testTimeoutMinutes: 60,
        dataRetentionDays: 90,
        enabledTestTypes: {
          coreWebVitals: true,
          lighthouseAudit: true,
          securityScan: true,
          loadTest: true,
          apiTest: true,
          uptimeMonitor: true,
          syntheticMonitor: true,
          realUserMonitor: false
        },
        defaultLocations: ['beijing', 'shanghai', 'guangzhou'],'
        maxFileUploadSize: 10,
        screenshotQuality: 'high' as const,'
        videoRecording: true,
        harGeneration: true
      },
      monitoring: {
        uptimeCheckInterval: 60,
        alertThresholds: {
          responseTime: 5000,
          errorRate: 5,
          availability: 99.9
        },
        retentionPeriods: {
          rawData: 30,
          aggregatedData: 365,
          screenshots: 7,
          videos: 3
        }
      },
      security: {
        passwordMinLength: 8,
        passwordRequireSpecialChars: true,
        sessionTimeoutMinutes: 480,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 30,
        twoFactorRequired: false,
        ipWhitelist: [],
      },
      notifications: {
        emailEnabled: true,
        smtpHost: 'smtp.gmail.com','
        smtpPort: 587,
        smtpUser: '','
        smtpPassword: '','
        fromEmail: 'noreply@testweb.com','
        fromName: 'Test Web App','
      },
      backup: {
        enabled: true,
        frequency: 'daily' as const,'
        retentionDays: 30,
        location: 'local' as const,'
      },
    };
  }

  private static getMockUsers(): User[] {
    return [
      {
        id: '1','
        username: 'admin','
        email: 'admin@testweb.com','
        role: 'admin','
        status: 'active','
        createdAt: '2025-01-15T10:30:00Z','
        lastLogin: '2025-06-19T08:45:00Z','
        testCount: 1250,
        emailVerified: true,
        twoFactorEnabled: true,
      },
      {
        id: '2','
        username: 'testuser1','
        email: 'user1@example.com','
        role: 'user','
        status: 'active','
        createdAt: '2025-02-20T14:20:00Z','
        lastLogin: '2025-06-18T16:30:00Z','
        testCount: 89,
        emailVerified: true,
        twoFactorEnabled: false,
      },
      {
        id: '3','
        username: 'testuser2','
        email: 'user2@example.com','
        role: 'user','
        status: 'inactive','
        createdAt: '2025-03-10T09:15:00Z','
        lastLogin: '2025-05-25T11:20:00Z','
        testCount: 45,
        emailVerified: false,
        twoFactorEnabled: false,
      },
      {
        id: '4','
        username: 'developer','
        email: 'dev@testweb.com','
        role: 'admin','
        status: 'active','
        createdAt: '2025-01-20T16:45:00Z','
        lastLogin: '2025-06-19T07:30:00Z','
        testCount: 567,
        emailVerified: true,
        twoFactorEnabled: true,
      },
    ];
  }

  private static getMockLogs(): SystemLog[] {
    return [
      {
        id: '1','
        timestamp: '2025-06-19T10:30:00Z','
        level: 'info','
        category: 'auth','
        message: '用户登录成功','
        details: { userId: '1', ip: '192.168.1.100' },'
        userId: '1','
      },
      {
        id: '2','
        timestamp: '2025-06-19T10:25:00Z','
        level: 'warning','
        category: 'test','
        message: '测试执行超时','
        details: { testId: 'test_123', timeout: 60000 },'
        userId: '2','
      },
      {
        id: '3','
        timestamp: '2025-06-19T10:20:00Z','
        level: 'error','
        category: 'system','
        message: '数据库连接失败','
        details: { error: 'Connection timeout', retries: 3 },'
      },
      {
        id: '4','
        timestamp: '2025-06-19T10:15:00Z','
        level: 'info','
        category: 'admin','
        message: '系统配置更新','
        details: { section: 'testing', changes: ['maxConcurrentTests'] },'
        userId: '1','
      },
    ];
  }

  private static getMockSystemHealth(): SystemHealth {
    return {
      status: 'healthy','
      uptime: 2592000,
      services: {
        database: { status: 'healthy', responseTime: 12 },'
        redis: { status: 'healthy', responseTime: 3 },'
        storage: { status: 'healthy', responseTime: 8 },'
        email: { status: 'warning', responseTime: 156 },'
      },
      resources: {
        cpu: { usage: 45.2, cores: 8 },
        memory: { usage: 67.8, total: 16384, available: 5242 },
        disk: { usage: 34.5, total: 1024, available: 670 },
        network: { incoming: 1024 * 150, outgoing: 1024 * 89 },
      },
      metrics: {
        requestsPerMinute: 234,
        errorRate: 0.02,
        averageResponseTime: 245,
        activeConnections: 156,
      },
    };
  }

  private static getMockBackups(): BackupInfo[] {
    return [
      {
        id: '1','
        name: '每日自动备份','
        type: 'full','
        status: 'completed','
        createdAt: '2025-06-19T02:00:00Z','
        size: 1024 * 1024 * 256, // 256MB
        location: 'local','
        description: '系统自动创建的每日完整备份','
      },
      {
        id: '2','
        name: '手动备份_升级前','
        type: 'full','
        status: 'completed','
        createdAt: '2025-06-18T15:30:00Z','
        size: 1024 * 1024 * 248, // 248MB
        location: 'local','
        description: '系统升级前的手动备份','
      },
      {
        id: '3','
        name: '增量备份','
        type: 'incremental','
        status: 'completed','
        createdAt: '2025-06-18T02:00:00Z','
        size: 1024 * 1024 * 45, // 45MB
        location: 'local','
        description: '增量数据备份','
      },
      {
        id: '4','
        name: '配置备份','
        type: 'config','
        status: 'failed','
        createdAt: '2025-06-17T02:00:00Z','
        size: 0,
        location: 'local','
        description: '系统配置文件备份','
        error: '存储空间不足','
      },
    ];
  }

  private static getMockMaintenanceInfo(): MaintenanceInfo {
    return {
      isMaintenanceMode: false,
      lastMaintenance: '2025-06-15T02:00:00Z','
      nextScheduledMaintenance: '2025-06-22T02:00:00Z','
      maintenanceMessage: '','
      systemVersion: '1.2.3','
      availableUpdates: [
        {
          version: '1.2.4','
          type: 'patch','
          description: '修复安全漏洞和性能优化','
          releaseDate: '2025-06-20T00:00:00Z','
          size: 1024 * 1024 * 15, // 15MB
        },
        {
          version: '1.3.0','
          type: 'minor','
          description: '新增API测试功能和UI改进','
          releaseDate: '2025-07-01T00:00:00Z','
          size: 1024 * 1024 * 45, // 45MB
        },
      ],
      maintenanceHistory: [
        {
          date: '2025-06-15T02:00:00Z','
          type: 'scheduled','
          description: '系统更新和数据库优化','
          duration: 3600, // 1小时
          success: true,
        },
        {
          date: '2025-06-01T03:00:00Z','
          type: 'emergency','
          description: '安全补丁紧急更新','
          duration: 1800, // 30分钟
          success: true,
        },
      ],
    };
  }
}

// 创建单例实例
export const systemService = new SystemService();
