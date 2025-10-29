// System-related types
export type { SystemStatus, LogLevel, SystemLog, MaintenanceInfo } from './unified/models';

export interface SystemConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  features?: Record<string, boolean>;
  limits?: {
    maxConcurrentTests?: number;
    maxTestDuration?: number;
    maxFileSize?: number;
  };
  [key: string]: any;
}
