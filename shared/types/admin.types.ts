/**
 * admin.types.ts - 管理员类型定义
 */

import { User } from './user.types';

export interface AdminSettings {
  maintenance: boolean;
  maintenanceMessage?: string;
  allowRegistration: boolean;
  allowPasswordReset: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
}

export interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  target?: string;
  details?: any;
  timestamp: number;
}

export interface AdminDashboard {
  users: {
    total: number;
    active: number;
    new: number;
  };
  tests: {
    total: number;
    today: number;
    failed: number;
  };
  system: {
    uptime: number;
    health: 'healthy' | 'warning' | 'critical';
  };
}

