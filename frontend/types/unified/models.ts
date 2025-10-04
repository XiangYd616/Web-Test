// Unified Models - All shared types
import { FlexibleObject } from '../common';

// ============================================
// API Response Models
// ============================================

export interface ApiResponse<T = any> extends FlexibleObject {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface ApiSuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
  message: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================
// User and Auth Models
// ============================================

export interface User extends FlexibleObject {
  id: string;
  username: string;
  email: string;
  role?: string;
  status?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  profile?: UserProfile;
  preferences?: UserPreferences;
}

export interface UserProfile extends FlexibleObject {
  displayName?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
}

export interface UserPreferences extends FlexibleObject {
  theme?: string;
  language?: string;
  timezone?: string;
  notifications?: any;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface AuthResponse extends FlexibleObject {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
}

export interface MFASetupResponse extends FlexibleObject {
  success: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
}

export interface MFAVerificationResponse extends FlexibleObject {
  success: boolean;
  message?: string;
  token?: string;
}

// ============================================
// Project Models
// ============================================

export interface Project extends FlexibleObject {
  id: string;
  name: string;
  description?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export type ProjectType = 'web' | 'api' | 'mobile' | 'desktop';
export type ProjectStatus = 'active' | 'inactive' | 'archived';

export interface CreateProjectRequest {
  name: string;
  description?: string;
  type?: ProjectType;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  type?: ProjectType;
  status?: ProjectStatus;
}

export interface ProjectResponse extends FlexibleObject {
  project: Project;
}

export interface ProjectListResponse extends FlexibleObject {
  projects: Project[];
  total: number;
  pagination?: PaginationInfo;
}

export interface ProjectStatsResponse extends FlexibleObject {
  total: number;
  active: number;
  inactive: number;
  archived: number;
}

// ============================================
// System Models
// ============================================

export interface SystemStatus {
  status: 'online' | 'offline' | 'maintenance';
  version: string;
  uptime?: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface SystemLog {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: any;
}

export interface MaintenanceInfo {
  enabled: boolean;
  message?: string;
  startTime?: string | number;
  endTime?: string | number;
}
