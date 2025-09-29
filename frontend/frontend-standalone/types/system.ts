/**
 * 系统相关类型定义
 * 版本: v2.0.0
 */

import type { ApiResponse } from './unified/apiResponse.types';

// 系统状态枚举
export enum SystemStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

// 系统信息
export interface SystemInfo {
  version: string;
  buildDate: string;
  environment: string;
  status: SystemStatus;
  uptime: number;
  lastRestart: string;
}

// 系统配置
export interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  category: string;
  isPublic: boolean;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

// 系统资源使用情况
export interface SystemResources {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    usage: number;
    available: number;
  };
  disk: {
    usage: number;
    available: number;
  };
  network: {
    activeConnections: number;
    bandwidth: {
      upload: number;
      download: number;
    };
  };
}

// 系统健康检查
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastCheck: string;
  details?: Record<string, any>;
}

// 系统监控指标
export interface SystemMetrics {
  timestamp: string;
  resources: SystemResources;
  healthChecks: HealthCheck[];
  activeUsers: number;
  activeTests: number;
  requestsPerMinute: number;
  errorRate: number;
}

// 系统日志级别
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// 系统日志条目
export interface SystemLog {
  id: string;
  level: LogLevel;
  message: string;
  service: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// 系统通知
export interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  isGlobal: boolean;
  targetUsers?: string[];
  expiresAt?: string;
  createdAt: string;
}

// 系统维护信息
export interface MaintenanceInfo {
  id: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  affectedServices: string[];
}

// API响应类型
export type SystemInfoResponse = ApiResponse<SystemInfo>;
export type SystemConfigResponse = ApiResponse<SystemConfig[]>;
export type SystemMetricsResponse = ApiResponse<SystemMetrics>;
export type SystemLogsResponse = ApiResponse<SystemLog[]>;

// 基于Context7最佳实践：移除重复导出语句
// 所有类型已通过 export interface/type 关键字直接导出
// 避免TS2484导出声明冲突错误
