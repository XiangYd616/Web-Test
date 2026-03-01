/**
 * system.types.ts - 系统类型定义
 */

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  memory: MemoryInfo;
  cpu: CPUInfo;
  disk: DiskInfo;
}

export interface MemoryInfo {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export interface CPUInfo {
  cores: number;
  usage: number;
  loadAverage: number[];
}

export interface DiskInfo {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export interface SystemMetrics {
  timestamp: number;
  health: SystemHealth;
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
}

