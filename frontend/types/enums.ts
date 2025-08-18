/**
 * 统一枚举定义
 * 确保前后端枚举值完全一致，解决数据模型差异问题
 * 版本: v2.0.0 - 基于差异分析报告的修复版本
 * 创建时间: 2024-08-08
 * 更新时间: 2024-08-08
 */

// ==================== 用户相关枚举 ====================

/**
 * 用户角色枚举 - 与数据库约束保持一致
 * 
 * 修复问题：解决前端定义5个角色但数据库只支持3个角色的不匹配问题
 * 
 * 数据库约束需要更新为：
 * CHECK (role IN ('user', 'admin', 'moderator', 'tester', 'manager'))
 * 
 * 注意：如果需要添加新角色，必须同时更新：
 * 1. 此枚举定义
 * 2. 数据库约束
 * 3. 后端模型验证
 * 4. 权限系统配置
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  TESTER = 'tester',        // 需要添加到数据库约束
  MANAGER = 'manager'       // 需要添加到数据库约束
}

/**
 * 用户状态枚举 - 与数据库约束保持一致
 * 状态：✅ 已统一
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

/**
 * 用户计划枚举 - 与数据库约束保持一致
 * 状态：✅ 已统一
 */
export enum UserPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

// ==================== 测试相关枚举 ====================

/**
 * 测试类型枚举 - 统一定义，解决多版本不一致问题
 * 
 * 修复问题：解决存在3个不同TestType定义的混乱状况
 * 
 * 此定义替代以下文件中的定义：
 * - src/types/test.ts (旧版本，将被废弃)
 * - src/types/modernTest.ts (现代化版本，将被整合)
 * - 其他分散的定义
 * 
 * 数据库约束：
 * CHECK (test_type IN ('seo', 'performance', 'security', 'api', 'compatibility', 'accessibility', 'stress'))
 */
export enum TestType {
  API = 'api',
  COMPATIBILITY = 'compatibility',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  SEO = 'seo',
  STRESS = 'stress',
  UX = 'ux',
  WEBSITE = 'website'
}

/**
 * 测试状态枚举 - 与数据库约束保持一致
 * 
 * 修复问题：统一多个不同的状态定义版本
 * 
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
 * 测试等级枚举 - 基于评分的等级划分
 */
export enum TestGrade {
  A_PLUS = 'A+',    // 95-100分
  A = 'A',          // 90-94分
  B_PLUS = 'B+',    // 85-89分
  B = 'B',          // 80-84分
  C_PLUS = 'C+',    // 75-79分
  C = 'C',          // 70-74分
  D = 'D',          // 60-69分
  F = 'F'           // 0-59分
}

/**
 * 测试优先级枚举
 */
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
export function isValidUserRole(role: string): role is UserRole   {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * 验证用户状态是否有效
 */
export function isValidUserStatus(status: string): status is UserStatus   {
  return Object.values(UserStatus).includes(status as UserStatus);
}

/**
 * 验证用户计划是否有效
 */
export function isValidUserPlan(plan: string): plan is UserPlan   {
  return Object.values(UserPlan).includes(plan as UserPlan);
}

/**
 * 验证测试类型是否有效
 */
export function isValidTestType(type: string): type is TestType   {
  return Object.values(TestType).includes(type as TestType);
}

/**
 * 验证测试状态是否有效
 */
export function isValidTestStatus(status: string): status is TestStatus   {
  return Object.values(TestStatus).includes(status as TestStatus);
}

/**
 * 验证测试等级是否有效
 */
export function isValidTestGrade(grade: string): grade is TestGrade   {
  return Object.values(TestGrade).includes(grade as TestGrade);
}

/**
 * 验证测试优先级是否有效
 */
export function isValidTestPriority(priority: string): priority is TestPriority   {
  return Object.values(TestPriority).includes(priority as TestPriority);
}

// ==================== 枚举转换函数 ====================

/**
 * 根据分数计算测试等级
 */
export function scoreToGrade(score: number): TestGrade   {
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
 * 获取角色的显示名称（中文）
 */
export function getUserRoleDisplayName(role: UserRole): string   {
  const roleNames = {
    [UserRole.USER]: '普通用户',
    [UserRole.ADMIN]: '管理员',
    [UserRole.MODERATOR]: '版主',
    [UserRole.TESTER]: '测试员',
    [UserRole.MANAGER]: '经理'
  };
  return roleNames[role] || role;
}

/**
 * 获取测试类型的显示名称（中文）
 */
export function getTestTypeDisplayName(type: TestType): string   {
  const typeNames = {
    [TestType.SEO]: 'SEO优化',
    [TestType.PERFORMANCE]: '性能测试',
    [TestType.SECURITY]: '安全测试',
    [TestType.API]: 'API测试',
    [TestType.COMPATIBILITY]: '兼容性测试',
    [TestType.ACCESSIBILITY]: '可访问性测试',
    [TestType.STRESS]: '压力测试'
  };
  return typeNames[type] || type;
}

/**
 * 获取测试状态的显示名称（中文）
 */
export function getTestStatusDisplayName(status: TestStatus): string   {
  const statusNames = {
    [TestStatus.PENDING]: '等待中',
    [TestStatus.RUNNING]: '运行中',
    [TestStatus.COMPLETED]: '已完成',
    [TestStatus.FAILED]: '失败',
    [TestStatus.CANCELLED]: '已取消'
  };
  return statusNames[status] || status;
}

// ==================== 导出所有枚举 ====================
// 注释掉重复导出，枚举已经通过 export enum 直接导出

// export {
//   UserRole,
//   UserStatus,
//   UserPlan,
//   TestType,
//   TestStatus,
//   TestGrade,
//   TestPriority,
//   ThemeMode,
//   Language,
//   Timezone
// };

// ==================== API 错误代码枚举 ====================

/**
 * API 错误代码枚举
 */
export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  // 业务错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  // 服务器错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  BAD_GATEWAY = 'BAD_GATEWAY'
}
