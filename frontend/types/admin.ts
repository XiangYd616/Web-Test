// 管理员相关类型定义

import type { User  } from './user';export interface SystemStats     {
  users: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    growthRate: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  tests: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    successRate: number;
    averageResponseTime: number;
    todayCount: number; // 添加缺失的属性
    popularTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };
  performance: {
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  system: {
    uptime: number;
    version: string;
    environment: string;
    lastBackup: string;
    diskUsage: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface SystemMonitor     {
  timestamp: string;
  metrics: {
    system: {
      uptime: number;
      loadAverage: number[];
      memoryUsage: {
        total: number;
        used: number;
        free: number;
        percentage: number;
      };
      diskUsage: {
        total: number;
        used: number;
        free: number;
        percentage: number;
      };
      cpuUsage: {
        percentage: number;
        cores: number;
      };
    };
    // 为了兼容组件中的使用，添加直接的cpu、memory、disk、network属性
    cpu: {
      usage: number;
      cores: number;
      temperature?: number;
    };
    memory: {
      usage: number;
      used: number;
      total: number;
    };
    disk: {
      usage: number;
      used: number;
      total: number;
    };
    network: {
      connections: number;
      incoming: number;
      outgoing: number;
    };
    application: {
      activeConnections: number;
      requestsPerMinute: number;
      averageResponseTime: number;
      errorRate: number;
      cacheHitRate: number;
      activeUsers: number;
      runningTests: number;
      queuedTests: number;
    };
    database: {
      connections: number;
      queryTime: number;
      slowQueries: number;
      size: number;
    };
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

export interface AdminUser extends User     {
  testCount: number;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
}

export interface UserFilter     {
  role?: string;
  status?: string;
  search?: string;
  emailVerified?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  page?: number;
  limit?: number;
}

export interface UserBulkAction     {
  action: 'activate' | 'deactivate' | 'suspend' | 'changeRole' | 'delete
  userIds: string[];
  newRole?: string;
  reason?: string;
}

export interface TestManagement     {
  id: string;
  type: string;
  url: string;
  userId: string;
  username: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled
  createdAt: string;
  completedAt?: string;
  duration?: number;
  result?: any;
  error?: string;
}

export interface TestFilter     {
  type?: string;
  status?: string;
  userId?: string;
  search?: string;
  priority?: string; // 添加缺失的priority属性
  createdAfter?: string;
  createdBefore?: string;
  page?: number;
  limit?: number;
}

export interface SystemConfig     {
  general: {
    siteName: string;
    siteDescription: string;
    adminEmail: string;
    timezone: string;
    language: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    emailVerificationRequired: boolean;
  };
  testing: {
    maxConcurrentTests: number;
    maxTestsPerUser: number;
    testTimeoutMinutes: number;
    dataRetentionDays: number;
    enabledTestTypes: {
      coreWebVitals: boolean;
      lighthouseAudit: boolean;
      securityScan: boolean;
      loadTest: boolean;
      apiTest: boolean;
      uptimeMonitor: boolean;
      syntheticMonitor: boolean;
      realUserMonitor: boolean;
    };
    defaultLocations: string[];
    maxFileUploadSize: number;
    screenshotQuality: 'low' | 'medium' | 'high
    videoRecording: boolean;
    harGeneration: boolean;
  };
  monitoring: {
    uptimeCheckInterval: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      availability: number;
    };
    retentionPeriods: {
      rawData: number;
      aggregatedData: number;
      screenshots: number;
      videos: number;
    };
  };
  security: {
    passwordMinLength: number;
    passwordRequireSpecialChars: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    twoFactorRequired: boolean;
    ipWhitelist: string[];
  };
  notifications: {
    emailEnabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly
    retentionDays: number;
    location: 'local' | 's3' | 'ftp
    s3Config?: {
      bucket: string;
      region: string;
      accessKey: string;
      secretKey: string;
    };
  };
}

export interface ActivityLog     {
  id: string;
  userId?: string;
  userName?: string;
  username?: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical
  category?: string;
  success: boolean;
  errorMessage?: string;
}

export interface ActivityFilter     {
  userId?: string;
  action?: string;
  resource?: string;
  severity?: string;
  category?: string;
  search?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface BackupInfo     {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  type: 'manual' | 'scheduled
  status: 'completed' | 'failed' | 'in_progress
  description?: string;
}

export interface PermissionGroup     {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
}

export interface AdminApiResponse<T = any>     {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
