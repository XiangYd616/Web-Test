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

export enum TestType {
  API = "api",
  COMPATIBILITY = "compatibility",
  INFRASTRUCTURE = "infrastructure",
  SECURITY = "security",
  SEO = "seo",
  STRESS = "stress",
  UX = "ux",
  WEBSITE = "website"
}

export enum TestStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

export enum TestGrade {
  A_PLUS = "A+",
  A = "A",
  B_PLUS = "B+",
  B = "B",
  C_PLUS = "C+",
  C = "C",
  D_PLUS = "D+",
  D = "D",
  F = "F"
}

export enum TestPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

export enum ThemeMode {
  LIGHT = "light",
  DARK = "dark",
  AUTO = "auto"
}

export enum Language {
  ZH_CN = "zh-CN",
  EN_US = "en-US",
  JA_JP = "ja-JP"
}

export enum Timezone {
  ASIA_SHANGHAI = "Asia/Shanghai",
  ASIA_TOKYO = "Asia/Tokyo",
  AMERICA_NEW_YORK = "America/New_York",
  AMERICA_LOS_ANGELES = "America/Los_Angeles",
  EUROPE_LONDON = "Europe/London",
  EUROPE_PARIS = "Europe/Paris",
  EUROPE_BERLIN = "Europe/Berlin",
  AUSTRALIA_SYDNEY = "Australia/Sydney",
  UTC = "UTC"
}

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
}

export function getUserRoleDisplayName(role: UserRole): string {
  const roleNames = {
    [UserRole.USER]: "普通用户",
    [UserRole.ADMIN]: "管理员",
    [UserRole.MODERATOR]: "版主",
    [UserRole.TESTER]: "测试员",
    [UserRole.MANAGER]: "经理"
  };
  return roleNames[role] || role;
}

export function getTestTypeDisplayName(type: TestType): string {
  const typeNames = {
    [TestType.SEO]: "SEO优化",
    [TestType.API]: "API测试",
    [TestType.COMPATIBILITY]: "兼容性测试",
    [TestType.INFRASTRUCTURE]: "基础设施测试",
    [TestType.SECURITY]: "安全测试",
    [TestType.STRESS]: "压力测试",
    [TestType.UX]: "用户体验测试",
    [TestType.WEBSITE]: "网站测试"
  };
  return typeNames[type] || type;
}

export function getTestStatusDisplayName(status: TestStatus): string {
  const statusNames = {
    [TestStatus.PENDING]: "等待中",
    [TestStatus.RUNNING]: "运行中",
    [TestStatus.COMPLETED]: "已完成",
    [TestStatus.FAILED]: "失败",
    [TestStatus.CANCELLED]: "已取消"
  };
  return statusNames[status] || status;
}

export function getUserStatusDisplayName(status: UserStatus): string {
  const statusNames = {
    [UserStatus.ACTIVE]: "活跃",
    [UserStatus.INACTIVE]: "非活跃",
    [UserStatus.SUSPENDED]: "已暂停",
    [UserStatus.PENDING]: "待审核"
  };
  return statusNames[status] || status;
}

export function getTestPriorityDisplayName(priority: TestPriority): string {
  const priorityNames = {
    [TestPriority.LOW]: "低",
    [TestPriority.MEDIUM]: "中",
    [TestPriority.HIGH]: "高",
    [TestPriority.CRITICAL]: "紧急"
  };
  return priorityNames[priority] || priority;
}

export function getLanguageDisplayName(language: Language): string {
  const languageNames = {
    [Language.ZH_CN]: "简体中文",
    [Language.EN_US]: "English",
    [Language.JA_JP]: "日本語"
  };
  return languageNames[language] || language;
}

export function getTimezoneDisplayName(timezone: Timezone): string {
  const timezoneNames = {
    [Timezone.ASIA_SHANGHAI]: "上海 (UTC+8)",
    [Timezone.ASIA_TOKYO]: "东京 (UTC+9)",
    [Timezone.AMERICA_NEW_YORK]: "纽约 (UTC-5)",
    [Timezone.AMERICA_LOS_ANGELES]: "洛杉矶 (UTC-8)",
    [Timezone.EUROPE_LONDON]: "伦敦 (UTC+0)",
    [Timezone.EUROPE_PARIS]: "巴黎 (UTC+1)",
    [Timezone.EUROPE_BERLIN]: "柏林 (UTC+1)",
    [Timezone.AUSTRALIA_SYDNEY]: "悉尼 (UTC+10)",
    [Timezone.UTC]: "UTC (UTC+0)"
  };
  return timezoneNames[timezone] || timezone;
}

export function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function isValidTestType(type: string): type is TestType {
  return Object.values(TestType).includes(type as TestType);
}

export function isValidTestStatus(status: string): status is TestStatus {
  return Object.values(TestStatus).includes(status as TestStatus);
}

export function isValidUserStatus(status: string): status is UserStatus {
  return Object.values(UserStatus).includes(status as UserStatus);
}

export function isValidTestPriority(priority: string): priority is TestPriority {
  return Object.values(TestPriority).includes(priority as TestPriority);
}

export function isValidLanguage(language: string): language is Language {
  return Object.values(Language).includes(language as Language);
}

export function isValidTimezone(timezone: string): timezone is Timezone {
  return Object.values(Timezone).includes(timezone as Timezone);
}

// 类型不需要默认导出
