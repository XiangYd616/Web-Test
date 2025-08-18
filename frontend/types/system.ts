// 系统管理相关类型定义

export interface SystemStats     {
  totalUsers: number;
  activeUsers: number;
  totalTests: number;
  testsToday: number;
  systemUptime: number; // 秒
  cpuUsage: number; // 百分比
  memoryUsage: number; // 百分比
  diskUsage: number; // 百分比
  networkTraffic: {
    incoming: number; // 字节
    outgoing: number; // 字节
  };
  errorRate: number; // 百分比
  responseTime: number; // 毫秒
  // 扩展字段以支持更多统计信息
  tests: {
    total: number;
    today: number;
    todayCount: number; // 兼容字段
    thisWeek: number;
    thisMonth: number;
    successRate: number;
    averageResponseTime: number;
    popularTypes: {
      type: string;
      count: number;
      percentage: number;
    }[];
  };
  users: {
    total: number;
    active: number;
    online: number;
    newToday: number;
  };
  performance: {
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  system: {
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
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
    maxFileUploadSize: number; // MB
    screenshotQuality: 'low' | 'medium' | 'high
    videoRecording: boolean;
    harGeneration: boolean;
  };
  monitoring: {
    uptimeCheckInterval: number; // 秒
    alertThresholds: {
      responseTime: number; // 毫秒
      errorRate: number; // 百分比
      availability: number; // 百分比
    };
    retentionPeriods: {
      rawData: number; // 天
      aggregatedData: number; // 天
      screenshots: number; // 天
      videos: number; // 天
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
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly
    retentionDays: number;
    location: 'local' | 'cloud' | 's3
  };
}

export interface User     {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer
  status: 'active' | 'inactive' | 'suspended
  createdAt: string;
  lastLogin?: string;
  testCount: number;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  permissions?: string[];
}

export interface UserFilter     {
  role?: string;
  status?: string;
  search?: string;
  emailVerified?: boolean;
  department?: string;
}

export interface SystemLog     {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical
  category: 'auth' | 'test' | 'system' | 'admin' | 'api' | 'security
  message: string;
  details?: Record<string, any>;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export interface LogFilter     {
  level?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  search?: string;
}

export interface SystemHealth     {
  status: 'healthy' | 'warning' | 'critical
  uptime: number; // 秒
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    storage: ServiceStatus;
    email: ServiceStatus;
  };
  resources: {
    cpu: ResourceUsage;
    memory: MemoryUsage;
    disk: DiskUsage;
    network: NetworkUsage;
  };
  metrics: {
    requestsPerMinute: number;
    errorRate: number;
    averageResponseTime: number;
    activeConnections: number;
  };
}

export interface ServiceStatus     {
  status: 'healthy' | 'warning' | 'critical
  responseTime: number; // 毫秒
  lastCheck?: string;
  error?: string;
}

export interface ResourceUsage     {
  usage: number; // 百分比
  cores?: number;
}

export interface MemoryUsage     {
  usage: number; // 百分比
  total: number; // MB
  available: number; // MB
}

export interface DiskUsage     {
  usage: number; // 百分比
  total: number; // GB
  available: number; // GB
}

export interface NetworkUsage     {
  incoming: number; // KB/s
  outgoing: number; // KB/s
}

export interface BackupInfo     {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'config
  status: 'pending' | 'running' | 'completed' | 'failed
  createdAt: string;
  completedAt?: string;
  size: number; // 字节
  location: string;
  description?: string;
  error?: string;
}

export interface MaintenanceInfo     {
  isMaintenanceMode: boolean;
  lastMaintenance?: string;
  nextScheduledMaintenance?: string;
  maintenanceMessage?: string;
  systemVersion: string;
  availableUpdates: SystemUpdate[];
  maintenanceHistory: MaintenanceRecord[];
}

export interface SystemUpdate     {
  version: string;
  type: 'major' | 'minor' | 'patch
  description: string;
  releaseDate: string;
  size: number; // 字节
  critical?: boolean;
}

export interface MaintenanceRecord     {
  date: string;
  type: 'scheduled' | 'emergency' | 'update
  description: string;
  duration: number; // 秒
  success: boolean;
  notes?: string;
}

export interface Permission     {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role     {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

export interface AuditLog     {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ip: string;
  userAgent: string;
  success: boolean;
  error?: string;
}

export interface SystemAlert     {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  category: string;
  severity: number; // 1-10
}

export interface DatabaseInfo     {
  type: string;
  version: string;
  size: number; // MB
  connections: {
    active: number;
    max: number;
  };
  performance: {
    queryTime: number; // 毫秒
    slowQueries: number;
    lockWaits: number;
  };
  tables: {
    name: string;
    rows: number;
    size: number; // MB
  }[];
}

// 系统监控指标接口
export interface SystemMetrics     {
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
      usage: number;
      cores: number;
      temperature?: number;
    };
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
    cacheHitRate: number;
    size: number;
  };
  // 兼容旧版本的字段
  cpu?: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory?: {
    usage: number;
    used: number;
    total: number;
  };
  disk?: {
    usage: number;
    used: number;
    total: number;
  };
  network?: {
    connections: number;
    incoming: number;
    outgoing: number;
  };
}

export interface SystemMonitor     {
  id: string;
  timestamp: string;
  metrics: SystemMetrics;
  alerts: SystemAlert[];
  status: 'healthy' | 'warning' | 'critical
}
