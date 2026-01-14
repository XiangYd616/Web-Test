// System-related types
export type { LogLevel, MaintenanceInfo, SystemLog, SystemStatus } from './compat/models';

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
