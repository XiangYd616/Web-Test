export type UUID = string;
export type Timestamp = string;
export type Email = string;

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  MODERATOR = "moderator",
  TESTER = "tester",
  MANAGER = "manager"
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending"
}

export enum UserPlan {
  FREE = "free",
  PRO = "pro",
  ENTERPRISE = "enterprise"
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
  timeFormat: "24h" | "12h";
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

export interface User {
  id: UUID;
  username: string;
  email: Email;
  role: UserRole;
  status: UserStatus;
  plan: UserPlan;
  profile: UserProfile;
  preferences: UserPreferences;
  metadata: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  
  byRole: Record<UserRole, number>;
  byStatus: Record<UserStatus, number>;
  byPlan: Record<UserPlan, number>;
  
  loginActivity: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  
  trends: {
    daily: Array<{
      date: string;
      newUsers: number;
      activeUsers: number;
      logins: number;
    }>;
    weekly: Array<{
      week: string;
      newUsers: number;
      activeUsers: number;
      logins: number;
    }>;
  };
}

export interface UserQuery {
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  plan?: UserPlan | UserPlan[];
  
  search?: string;
  email?: string;
  username?: string;
  company?: string;
  
  createdAfter?: Timestamp;
  createdBefore?: Timestamp;
  lastLoginAfter?: Timestamp;
  lastLoginBefore?: Timestamp;
  
  sortBy?: "createdAt" | "lastLoginAt" | "username" | "email";
  sortOrder?: "asc" | "desc";
  
  page?: number;
  limit?: number;
}

export interface UserListQuery {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: "createdAt" | "lastLoginAt" | "username" | "email";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface UserActivity {
  id: UUID;
  userId: UUID;
  type: "login" | "logout" | "test_created" | "test_completed" | "profile_updated" | "settings_changed";
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

export interface UserSecurityEvent {
  id: UUID;
  userId: UUID;
  type: "login_attempt" | "password_change" | "suspicious_activity" | "account_locked";
  severity: "low" | "medium" | "high";
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Timestamp;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  notifications: {
    email: true,
    push: true,
    sms: false,
    browser: true,
    testCompleted: true,
    testFailed: true,
    securityAlert: true
  },
  dashboard: {
    defaultView: "overview",
    layout: "grid",
    itemsPerPage: 20,
    autoRefresh: false,
    refreshInterval: 30,
    showWelcome: true,
    compactMode: false
  },
  privacy: {
    profileVisibility: "private",
    shareAnalytics: false,
    allowTracking: false,
    dataRetention: 365,
    trackingEnabled: false
  },
  ui: {
    theme: "auto",
    language: "zh-CN",
    fontSize: "medium",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    animations: true,
    soundEffects: false,
    highContrast: false
  }
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  timezone: "Asia/Shanghai"
};

export function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function isValidUserStatus(status: string): status is UserStatus {
  return Object.values(UserStatus).includes(status as UserStatus);
}

export function isValidUserPlan(plan: string): plan is UserPlan {
  return Object.values(UserPlan).includes(plan as UserPlan);
}

export interface UserDatabaseFields {
  id: string;
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
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export function fromDatabaseFields(dbData: UserDatabaseFields): User {
  return {
    id: dbData.id,
    username: dbData.username,
    email: dbData.email,
    role: dbData.role as UserRole,
    status: dbData.status as UserStatus,
    plan: dbData.plan as UserPlan,
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

export function toDatabaseFields(user: User, passwordHash?: string): UserDatabaseFields {
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
