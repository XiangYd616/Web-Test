import type { User } from "./user";

export interface SystemStats {
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
    todayCount: number;
    popularTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };
  performance: {
    successRate: number;
    averageResponseTime: number;
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  system: {
    version: string;
    uptime: number;
    lastRestart: string;
    environment: "development" | "staging" | "production";
  };
}

export interface AdminDashboard {
  stats: SystemStats;
  recentUsers: User[];
  recentTests: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
  systemAlerts: Array<{
    id: string;
    type: "warning" | "error" | "info";
    message: string;
    timestamp: string;
  }>;
  performanceMetrics: Array<{
    timestamp: string;
    cpu: number;
    memory: number;
    requests: number;
  }>;
}

export interface UserManagement {
  users: User[];
  totalUsers: number;
  activeUsers: number;
  filters: {
    role?: string;
    status?: string;
    search?: string;
  };
  pagination: {
    page: number;
    limit: number;
  };
}

export interface UserBulkAction {
  action: "activate" | "deactivate" | "suspend" | "changeRole" | "delete";
  userIds: string[];
  options?: {
    role?: string;
    reason?: string;
  };
}

export interface SystemTask {
  id: string;
  name: string;
  type: "backup" | "cleanup" | "maintenance" | "update";
  status: "idle" | "starting" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  startTime?: string;
  endTime?: string;
  logs: string[];
  error?: string;
}

export interface SystemConfig {
  general: {
    siteName: string;
    siteUrl: string;
    adminEmail: string;
    timezone: string;
    language: string;
    maintenanceMode: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    twoFactorAuth: boolean;
    ipWhitelist: string[];
  };
  features: {
    userRegistration: boolean;
    emailVerification: boolean;
    socialLogin: boolean;
    apiAccess: boolean;
    fileUploads: boolean;
  };
  limits: {
    maxUsers: number;
    maxTestsPerUser: number;
    maxFileSize: number;
    apiRateLimit: number;
  };
  monitoring: {
    enabled: boolean;
    logLevel: "debug" | "info" | "warn" | "error";
    retentionDays: number;
    realUserMonitor: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    compressionEnabled: boolean;
    screenshotQuality: "low" | "medium" | "high";
  };
  notifications: {
    email: {
      enabled: boolean;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        username: string;
        password: string;
      };
      from: string;
      fromName: string;
    };
    backup: {
      enabled: boolean;
      frequency: "daily" | "weekly" | "monthly";
      retention: number;
      location: "local" | "s3" | "ftp";
    };
  };
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  category: "auth" | "api" | "system" | "test" | "admin";
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface SystemAlert {
  id: string;
  type: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  severity: "info" | "warning" | "error" | "critical";
  category: string;
  metadata?: Record<string, any>;
}

export interface BackupInfo {
  id: string;
  name: string;
  type: "manual" | "scheduled";
  status: "completed" | "failed" | "in_progress";
  size: number;
  location: string;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface AdminUser extends User {
  lastLoginIp?: string;
  loginCount: number;
  isOnline: boolean;
  permissions: string[];
}

// 类型不需要默认导出
