// Enhanced common type definitions
// Final version with maximum flexibility

// ============================================
// Flexible Base Types
// ============================================

// Index signature type for maximum flexibility
export interface FlexibleObject {
  [key: string]: any;
  [key: number]: any;
}

// ============================================
// Test Records and Progress Types
// ============================================

export interface StressTestRecord extends FlexibleObject {
  id: string;
  name?: string;
  type?: string;
  status?: string;
  timestamp?: string | number;
  duration?: number;
  config?: any;
  metrics?: TestMetrics;
  results?: TestResults;
  result?: any;
  summary?: TestSummary;
  error?: string;
  errors?: string[];
  message?: string;
  responseTime?: number;
  errorRate?: number;
  url?: string;
  method?: string;
  testResults?: any[];
  errorDiagnosis?: string;
  severity?: string;
  recommendations?: string[];
  overallScore?: number;
  score?: number;
  data?: any;
  engine?: string;
  endpoint?: string;
  realTimeData?: any;
  testConfig?: any;
}

export interface TestProgress extends FlexibleObject {
  current: number;
  total: number;
  percentage?: number;
  status?: string;
  message?: string;
  timestamp?: number;
  errors?: string[];
  warnings?: string[];
}

export interface SecurityTestProgress extends TestProgress {
  securityScore?: number;
  vulnerabilities?: any[];
  threatLevel?: string;
  phase?: 'initializing' | 'scanning' | 'analyzing' | 'reporting' | string;
  currentModule?: string;
  currentCheck?: string;
  progress?: number;
  estimatedTimeRemaining?: number;
  statistics?: {
    totalChecks?: number;
    passedChecks?: number;
    failedChecks?: number;
    warningChecks?: number;
  };
}

export interface TestMetrics extends FlexibleObject {
  responseTime?: number;
  errorRate?: number;
  throughput?: number;
  successRate?: number;
  averageResponseTime?: number;
  maxResponseTime?: number;
  minResponseTime?: number;
  requestsPerSecond?: number;
  concurrentUsers?: number;
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  loadTime?: number;
  domContentLoaded?: number;
  ttfb?: number;
  tti?: number;
  speedIndex?: number;
}

export interface TestResults extends FlexibleObject {
  passed?: number;
  failed?: number;
  total?: number;
  items?: any[];
  testResults?: any[];
  summary?: TestSummary;
  metrics?: TestMetrics;
  details?: any;
  resources?: any[];
}

export interface TestSummary extends FlexibleObject {
  total?: number;
  passed?: number;
  failed?: number;
  duration?: number;
  status?: string;
  startTime?: number;
  endTime?: number;
  message?: string;
}

export interface TestRecordQuery extends FlexibleObject {
  id?: string;
  type?: string;
  status?: string;
  from?: string | number;
  to?: string | number;
  limit?: number;
  offset?: number;
}

export interface TestHistory extends FlexibleObject {
  records: StressTestRecord[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export interface TestOptimizations extends FlexibleObject {
  enabled: boolean;
  options?: any;
  strategies?: string[];
}

// ============================================
// API Response Types
// ============================================

export interface APIResponse<T = any> extends FlexibleObject {
  status: number;
  message?: string;
  error?: string;
  data?: T;
  success?: boolean;
  timestamp?: number;
  errors?: string[];
}

export interface APIError extends FlexibleObject {
  error: string;
  message: string;
  status: number;
  code?: string;
  details?: any;
}

// Alias for compatibility
export type ApiError = APIError;

// ============================================
// Progress and Queue Types
// ============================================

export interface ProgressListener extends FlexibleObject {
  onProgress: (progress: TestProgress) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  onUpdate?: (data: any) => void;
}

export interface QueueStats extends FlexibleObject {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total?: number;
  avgWaitTime?: number;
  totalQueued?: number;
  totalRunning?: number;
  totalCompleted?: number;
  totalFailed?: number;
  averageExecutionTime?: number;
  nextInQueue?: any;
  runningTests?: any[];
}

export interface RealTimeMetrics extends FlexibleObject {
  timestamp: number;
  cpu?: number;
  memory?: number;
  network?: number;
  activeConnections?: number;
  throughput?: number;
  activeUsers?: number;
  requests?: number;
  successCount?: number;
  errorCount?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  queueLength?: number;
}

// ============================================
// Configuration and Settings Types
// ============================================

export interface APIKeys extends FlexibleObject {
  [service: string]: string;
}

export interface Settings extends FlexibleObject {
  theme?: string;
  language?: string;
  notifications?: boolean;
}

export interface TestConfig extends FlexibleObject {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  config?: any;
  options?: any;
}

// ============================================
// Utility Types
// ============================================

export interface ClassValue {
  [key: string]: boolean;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// ============================================
// Test System Types
// ============================================

export interface Zap extends FlexibleObject {
  scan: (config: any) => Promise<any>;
  spider: (config: any) => Promise<any>;
  alert: (options: any) => Promise<any>;
}

// ============================================
// Analysis and Optimization
// ============================================

export interface SEOAnalysisEngine extends FlexibleObject {
  analyze: (url: string) => Promise<any>;
  getRecommendations: (analysis: any) => string[];
  calculateScore: (metrics: any) => number;
}

export const dataVisualizationOptimizer = {
  optimize: (data: any) => data,
  format: (data: any, options?: any) => data,
  transform: (data: any) => data,
};

export const advancedResults = {
  process: (results: any) => results,
  aggregate: (results: any[]) => ({}),
  analyze: (results: any) => ({}),
};

// ============================================
// Event and Callback Types
// ============================================

export type EventHandler = (event: any) => void;
export type AsyncEventHandler = (event: any) => Promise<void>;
export type ErrorHandler = (error: Error) => void;

// ============================================
// Additional exports for compatibility
// ============================================

export interface TestEngine extends FlexibleObject {
  run: (config: TestConfig) => Promise<TestResults>;
  stop: () => void;
}

export interface TestRunner extends FlexibleObject {
  execute: (test: any) => Promise<any>;
}

export interface TestValidator extends FlexibleObject {
  validate: (data: any) => boolean;
}

export interface PerformanceMetrics extends TestMetrics {
  fps?: number;
  loadTime?: number;
  renderTime?: number;
}

// ============================================
// Vitest globals (for test files)
// ============================================

declare global {
  const vi: any;
  const describe: any;
  const it: any;
  const expect: any;
  const test: any;
  const beforeEach: any;
  const afterEach: any;
  const beforeAll: any;
  const afterAll: any;
}

// ============================================
// Icon Types (Lucide React)
// ============================================

export type LucideIcon = any;
export const Play: LucideIcon;
export const Info: LucideIcon;
export const Check: LucideIcon;
export const X: LucideIcon;
export const AlertCircle: LucideIcon;

export {};


// ============================================
// Additional Type Aliases and Basic Types
// ============================================

export type Email = string;
export type Timestamp = number | string | Date;
export type URL = string;
export type UUID = string;

// ============================================
// User Types
// ============================================

export interface User extends FlexibleObject {
  id: string;
  username: string;
  email: Email;
  role?: string;
  status?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  profile?: UserProfile;
  preferences?: UserPreferences;
}

export interface UserProfile extends FlexibleObject {
  displayName?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending';

export interface UserPreferences extends FlexibleObject {
  theme?: string;
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'light',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
};

export interface UserSession extends FlexibleObject {
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

// ============================================
// Authentication Types
// ============================================

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: Email;
  password: string;
  confirmPassword?: string;
  agreeTerm?: boolean;
}

export interface AuthResponse extends FlexibleObject {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
  error?: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface CreateUserData {
  username: string;
  email: Email;
  password: string;
  role?: string;
  profile?: Partial<UserProfile>;
}

export interface UpdateUserData {
  username?: string;
  email?: Email;
  role?: string;
  status?: UserStatus;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}

// ============================================
// Enums and Constants
// ============================================

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  MODERATOR = 'moderator',
}

export enum UserPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum TestGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export enum Language {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US',
  JA_JP = 'ja-JP',
}

export enum Timezone {
  ASIA_SHANGHAI = 'Asia/Shanghai',
  UTC = 'UTC',
  AMERICA_NEW_YORK = 'America/New_York',
}