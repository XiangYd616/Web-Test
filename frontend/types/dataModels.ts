export type UUID = string;
export type Timestamp = string;
export type URL = string;
export type Email = string;

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  department?: string;
  phone?: string;
  timezone?: string;
  avatar?: string;
  bio?: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  browser: boolean;
  testCompleted: boolean;
  testFailed: boolean;
  securityAlert: boolean;
}

export interface DashboardSettings {
  defaultView: "overview" | "tests" | "reports" | "analytics";
  layout: "grid" | "list" | "cards";
  itemsPerPage: number;
  autoRefresh: boolean;
  refreshInterval: number;
  showWelcome: boolean;
  compactMode: boolean;
}

export interface PrivacySettings {
  profileVisibility: "public" | "private" | "team";
  shareAnalytics: boolean;
  allowTracking: boolean;
  dataRetention: number;
  trackingEnabled: boolean;
}

export interface UISettings {
  theme: "light" | "dark" | "auto";
  language: "zh-CN" | "en-US" | "ja-JP";
  fontSize: "small" | "medium" | "large";
  dateFormat: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY";
  timeFormat: "12h" | "24h";
  animations: boolean;
  soundEffects: boolean;
  highContrast: boolean;
}

export interface UserPreferences {
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
  privacy: PrivacySettings;
  ui: UISettings;
}

export interface User {
  id: UUID;
  username: string;
  email: Email;
  role: "admin" | "user" | "viewer";
  status: "active" | "inactive" | "suspended" | "pending";
  plan: "free" | "pro" | "enterprise";
  profile: UserProfile;
  preferences: UserPreferences;
  metadata: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface BaseTestConfig {
  id?: UUID;
  name: string;
  description?: string;
  url: URL;
  priority?: "low" | "medium" | "high" | "critical";
  environment?: "development" | "staging" | "production";
  metadata?: Record<string, any>;
}

export interface PerformanceTestConfig extends BaseTestConfig {
  device?: "desktop" | "mobile" | "tablet";
  throttling?: "none" | "3g" | "4g" | "slow-3g";
  cacheDisabled?: boolean;
  metrics?: string[];
}

export interface SecurityTestConfig extends BaseTestConfig {
  scanDepth?: "shallow" | "medium" | "deep";
  includeSubdomains?: boolean;
  authRequired?: boolean;
  customPayloads?: string[];
}

export interface APITestConfig extends BaseTestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  expectedStatus?: number[];
  authentication?: {
    type: "none" | "basic" | "bearer" | "api-key";
    credentials?: Record<string, string>;
  };
}

export interface StressTestConfig extends BaseTestConfig {
  users: number;
  duration: number;
  rampUp: number;
  testType?: "load" | "stress" | "spike" | "volume";
}

export interface TestError {
  id: string;
  type: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  line?: number;
  column?: number;
  file?: string;
  stack?: string;
  timestamp: Timestamp;
}

export interface TestRecommendation {
  id: string;
  category: string;
  priority: "low" | "medium" | "high";
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  
  resources?: Array<{
    title: string;
    url: string;
    type: "documentation" | "tutorial" | "tool" | "article";
  }>;
}

export interface TestAttachment {
  id: string;
  name: string;
  type: "screenshot" | "video" | "report" | "log" | "trace";
  url: string;
  size: number;
  mimeType: string;
  description?: string;
  createdAt: Timestamp;
}

export interface TestResult {
  id: UUID;
  testId: UUID;
  testType: "api" | "compatibility" | "infrastructure" | "security" | "seo" | "stress" | "ux" | "website";
  testName: string;
  url: URL;
  
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number;
  
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F";
  
  config: BaseTestConfig;
  result: Record<string, any>;
  
  issues: TestError[];
  recommendations: TestRecommendation[];
  attachments: TestAttachment[];
  
  metadata: Record<string, any>;
  
  error?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestSession {
  id: UUID;
  name: string;
  description?: string;
  status: "active" | "completed" | "cancelled";
  startedAt: Timestamp;
  completedAt?: Timestamp;
  
  results: TestResult[];
  
  summary: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageScore: number;
    totalDuration: number;
  };
  
  metadata: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
  timestamp: Timestamp;
  requestId: string;
}

export interface DatabaseFields {
  id: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface UserDatabaseFields extends DatabaseFields {
  username: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  plan: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  department?: string;
  phone?: string;
  timezone?: string;
  avatar?: string;
  bio?: string;
  preferences: string;
  metadata: string;
  last_login_at?: string;
}

export interface TestResultDatabaseFields extends DatabaseFields {
  test_id: string;
  test_type: string;
  test_name: string;
  url: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration?: number;
  overall_score: number;
  grade: string;
  config: string;
  result: string;
  issues: string;
  recommendations: string;
  attachments: string;
  error?: string;
}

export function fromUserDatabaseFields(dbData: UserDatabaseFields): User {
  return {
    id: dbData.id,
    username: dbData.username,
    email: dbData.email,
    role: dbData.role as any,
    status: dbData.status as any,
    plan: dbData.plan as any,
    profile: {
      firstName: dbData.first_name,
      lastName: dbData.last_name,
      fullName: dbData.first_name && dbData.last_name
        ? `${dbData.first_name} ${dbData.last_name}`
        : undefined,
      company: dbData.company,
      department: dbData.department,
      phone: dbData.phone,
      timezone: dbData.timezone,
      avatar: dbData.avatar,
      bio: dbData.bio
    },
    preferences: JSON.parse(dbData.preferences),
    metadata: JSON.parse(dbData.metadata),
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
    lastLoginAt: dbData.last_login_at
  };
}

export function toUserDatabaseFields(user: User, passwordHash?: string): UserDatabaseFields {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password_hash: passwordHash || "",
    role: user.role,
    status: user.status,
    plan: user.plan,
    first_name: user.profile.firstName,
    last_name: user.profile.lastName,
    company: user.profile.company,
    department: user.profile.department,
    phone: user.profile.phone,
    timezone: user.profile.timezone,
    avatar: user.profile.avatar,
    bio: user.profile.bio,
    preferences: JSON.stringify(user.preferences),
    metadata: JSON.stringify(user.metadata),
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    last_login_at: user.lastLoginAt
  };
}

// 类型不需要默认导出
