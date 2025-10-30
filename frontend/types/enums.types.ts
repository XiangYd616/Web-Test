/**
 * 统一枚举定义
 * 确保前后端枚举值完全一致，解决数据模型差异问题
 * 版本: v2.0.0 - 基于差异分析报告的修复版�? * 创建时间: 2024-08-08
 * 更新时间: 2024-08-08
 */

// ==================== 用户相关枚举 ====================

/**
 * 用户角色枚举 - 与数据库约束保持一�? * 
 * 修复问题：解决前端定�?个角色但数据库只支持3个角色的不匹配问�? * 
 * 数据库约束需要更新为�? * CHECK (role IN ('user', 'admin', 'moderator', 'tester', 'manager'))
 * 
 * 注意：如果需要添加新角色，必须同时更新：
 * 1. 此枚举定�? * 2. 数据库约�? * 3. 后端模型验证
 * 4. 权限系统配置
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  TESTER = 'tester',        // 需要添加到数据库约�?  MANAGER = 'manager'       // 需要添加到数据库约�?}

/**
 * 用户状态枚�?- 与数据库约束保持一�? * 状态：�?已统一
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

/**
 * 用户计划枚举 - 与数据库约束保持一�? * 状态：�?已统一
 */
export enum UserPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

// ==================== 测试相关枚举 ====================

/**
 * 测试类型枚举 - 导出仍enums.ts的枚举定�? */
export type { TestType, TestTypeValue } from './enums';

/**
 * 测试状态枚�?- 与数据库约束保持一�? * 
 * 修复问题：统一多个不同的状态定义版�? * 
 * 数据库约束：
 * CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
 */
export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 测试等级枚举 - 基于评分的等级划�? */
export enum TestGrade {
  A_PLUS = 'A+',    // 95-100�?  A = 'A',          // 90-94�?  B_PLUS = 'B+',    // 85-89�?  B = 'B',          // 80-84�?  C_PLUS = 'C+',    // 75-79�?  C = 'C',          // 70-74�?  D = 'D',          // 60-69�?  F = 'F'           // 0-59�?}

/**
 * 测试优先级枚�? */
export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ==================== 系统相关枚举 ====================

/**
 * 主题模式枚举
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

/**
 * 语言枚举
 */
export enum Language {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US',
  JA_JP = 'ja-JP',
  KO_KR = 'ko-KR'
}

/**
 * 时区枚举（常用时区）
 */
export enum Timezone {
  ASIA_SHANGHAI = 'Asia/Shanghai',
  UTC = 'UTC',
  AMERICA_NEW_YORK = 'America/New_York',
  EUROPE_LONDON = 'Europe/London',
  ASIA_TOKYO = 'Asia/Tokyo'
}

// ==================== 枚举验证函数 ====================

/**
 * 验证用户角色是否有效
 */
export function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * 验证用户状态是否有�? */
export function isValidUserStatus(status: string): status is UserStatus {
  return Object.values(UserStatus).includes(status as UserStatus);
}

/**
 * 验证用户计划是否有效
 */
export function isValidUserPlan(plan: string): plan is UserPlan {
  return Object.values(UserPlan).includes(plan as UserPlan);
}

/**
 * 验证测试类型是否有效
 */
export function isValidTestType(type: string): type is TestTypeValue {
  return Object.values(TestType).includes(type as any);
}

/**
 * 验证测试状态是否有�? */
export function isValidTestStatus(status: string): status is TestStatus {
  return Object.values(TestStatus).includes(status as TestStatus);
}

/**
 * 验证测试等级是否有效
 */
export function isValidTestGrade(grade: string): grade is TestGrade {
  return Object.values(TestGrade).includes(grade as TestGrade);
}

/**
 * 验证测试优先级是否有�? */
export function isValidTestPriority(priority: string): priority is TestPriority {
  return Object.values(TestPriority).includes(priority as TestPriority);
}

// ==================== 枚举转换函数 ====================

/**
 * 根据分数计算测试等级
 */
export function scoreToGrade(score: number): TestGrade {
  if (score >= 95) return TestGrade.A_PLUS;
  if (score >= 90) return TestGrade.A;
  if (score >= 85) return TestGrade.B_PLUS;
  if (score >= 80) return TestGrade.B;
  if (score >= 75) return TestGrade.C_PLUS;
  if (score >= 70) return TestGrade.C;
  if (score >= 60) return TestGrade.D;
  return TestGrade.F;
}

/**
 * 获取角色的显示名称（中文�? */
export function getUserRoleDisplayName(role: UserRole): string {
  const roleNames = {
    [UserRole.USER]: '普通用�?,
    [UserRole.ADMIN]: '管理�?,
    [UserRole.MODERATOR]: '版主',
    [UserRole.TESTER]: '测试�?,
    [UserRole.MANAGER]: '经理'
  };
  return roleNames[role] || role;
}

/**
 * 获取测试类型的显示名称（中文�? */
export function getTestTypeDisplayName(type: TestTypeValue): string {
  const typeNames: Record<string, string> = {
    'seo': 'SEO优化',
    'performance': '性能测试',
    'security': '安全测试',
    'api': 'API测试',
    'compatibility': '兼容性测�?,
    'accessibility': '可访问性测�?,
    'stress': '压力测试'
  };
  return typeNames[type] || type;
}

/**
 * 获取测试状态的显示名称（中文）
 */
export function getTestStatusDisplayName(status: TestStatus): string {
  const statusNames = {
    [TestStatus.PENDING]: '等待�?,
    [TestStatus.RUNNING]: '运行�?,
    [TestStatus.COMPLETED]: '已完�?,
    [TestStatus.FAILED]: '失败',
    [TestStatus.CANCELLED]: '已取�?
  };
  return statusNames[status] || status;
}

// ==================== 导出所有枚�?====================

// ==================== 枚举导出说明 ====================
// 基于Context7最佳实践：所有enum定义已通过export关键字导�?// 无需额外的导出语句，避免重复导出冲突

// 所有枚举已通过以下方式导出�?// - export enum TestType { ... }
// - export enum TestStatus { ... }
// - export enum UserRole { ... }
// - 等等...

