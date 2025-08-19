export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTests: number;
  testsToday: number;
  systemUptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkTraffic: {
    incoming: number;
    outgoing: number;
  };
  errorRate: number;
  responseTime: number;
  
  tests: {
    total: number;
    today: number;
    todayCount: number;
    thisWeek: number;
    thisMonth: number;
    successRate: number;
    averageResponseTime: number;
    popularTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };
  
  users: {
    total: number;
    active: number;
    new: number;
    online: number;
    byRole: Record<string, number>;
  };
  
  performance: {
    avgCpuUsage: number;
    avgMemoryUsage: number;
    avgResponseTime: number;
    uptime: number;
    lastRestart: string;
  };
}

export interface SystemConfig {
  maintenance: {
    enabled: boolean;
    message: string;
    startTime?: string;
    endTime?: string;
  };
  
  features: {
    registration: boolean;
    testCreation: boolean;
    apiAccess: boolean;
    reporting: boolean;
  };
  
  limits: {
    maxUsersPerTest: number;
    maxTestDuration: number;
    maxConcurrentTests: number;
    maxFileSize: number;
  };
  
  monitoring: {
    enabled: boolean;
    interval: number;
    retentionDays: number;
    alertThresholds: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      errorRate: number;
    };
    screenshotQuality: "low" | "medium" | "high";
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
  };
  
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
    frequency: "hourly" | "daily" | "weekly" | "monthly";
    retention: number;
    location: "local" | "cloud" | "s3";
  };
}

export interface SystemUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user" | "viewer";
  status: "active" | "inactive" | "suspended";
  lastLogin?: string;
  createdAt: string;
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
    company?: string;
    department?: string;
  };
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warning" | "error" | "critical";
  category: "auth" | "test" | "system" | "admin" | "api" | "security";
  message: string;
  details?: Record<string, any>;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SystemLogQuery {
  level?: string[];
  category?: string[];
  startDate?: string;
  endDate?: string;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SystemHealth {
  status: "healthy" | "warning" | "critical";
  services: Array<{
    name: string;
    status: "up" | "down" | "degraded";
    responseTime?: number;
    lastCheck: string;
    uptime: number;
  }>;
  
  metrics: {
    cpu: { current: number; average: number; max: number };
    memory: { current: number; average: number; max: number };
    disk: { current: number; available: number; total: number };
    network: { incoming: number; outgoing: number };
  };
  
  alerts: Array<{
    id: string;
    type: "warning" | "error" | "critical";
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

export interface ServiceStatus {
  name: string;
  status: "healthy" | "warning" | "critical";
  uptime: number;
  responseTime: number;
  lastCheck: string;
  version?: string;
  dependencies?: Array<{
    name: string;
    status: "up" | "down";
    version?: string;
  }>;
}

export interface SystemBackup {
  id: string;
  name: string;
  type: "full" | "incremental" | "config";
  status: "pending" | "running" | "completed" | "failed";
  size?: number;
  location: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface SystemMaintenance {
  id: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  affectedServices: string[];
  maintenanceHistory: MaintenanceRecord[];
}

export interface SystemUpdate {
  id: string;
  version: string;
  type: "major" | "minor" | "patch";
  description: string;
  releaseNotes: string;
  critical?: boolean;
}

export interface MaintenanceRecord {
  id: string;
  type: "scheduled" | "emergency" | "update";
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  affectedServices: string[];
  impact: "low" | "medium" | "high";
  status: "completed" | "failed" | "cancelled";
  notes?: string;
}

export interface SystemNotification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  userId?: string;
  global: boolean;
  priority: "low" | "medium" | "high";
  expiresAt?: string;
  actions?: Array<{
    label: string;
    action: string;
    style?: "primary" | "secondary" | "danger";
  }>;
}

export interface SystemTask {
  id: string;
  name: string;
  type: "backup" | "cleanup" | "maintenance" | "update";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  startTime?: string;
  endTime?: string;
  error?: string;
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
  source: string;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: {
    incoming: number;
    outgoing: number;
  };
  activeUsers: number;
  activeTests: number;
  errorRate: number;
  responseTime: number;
}

export interface SystemDashboard {
  stats: SystemStats;
  health: SystemHealth;
  recentLogs: SystemLog[];
  activeAlerts: SystemAlert[];
  systemTasks: SystemTask[];
  upcomingMaintenance: SystemMaintenance[];
}

// 类型不需要默认导出
