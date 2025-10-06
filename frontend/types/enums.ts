// Common enumerations

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  MODERATOR = 'moderator',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
  PENDING = 'pending',
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

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export {};


// Test Type as both enum and type
export enum TestType {
  STRESS = 'stress',
  PERFORMANCE = 'performance',
  API = 'api',
  SECURITY = 'security',
  SEO = 'seo',
  ACCESSIBILITY = 'accessibility',
  CONTENT = 'content',
  INFRASTRUCTURE = 'infrastructure',
  DOCUMENTATION = 'documentation',
  UX = 'ux',
  INTEGRATION = 'integration',
  NETWORK = 'network',
  COMPATIBILITY = 'compatibility',
  DATABASE = 'database',
  WEBSITE = 'website',
}

// Export as type alias as well for compatibility
export type TestTypeValue = 
  | 'stress'
  | 'performance'
  | 'api'
  | 'security'
  | 'seo'
  | 'accessibility'
  | 'content'
  | 'infrastructure'
  | 'documentation'
  | 'ux'
  | 'integration'
  | 'network'
  | 'compatibility'
  | 'database'
  | 'website';

export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TestStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}