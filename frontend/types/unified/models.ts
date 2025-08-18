// 统一模型类型定义 - 重新导出所有核心类型

// 用户相关类型
export type {

  AuthResponse, ChangePasswordData, CreateUserData, LoginCredentials,
  RegisterData, UpdateUserData, User, UserActivityLog, UserPreferences,
  UserProfile,
  // UserSession, UserStats
} from '../user; // 已修复
// 枚举类型
export {
  UserRole,
  // UserStatus'} from '../enums; // 已修复
// API 相关类型
export type {

  ApiError,
  ApiResponse,
  PaginatedResponse,
  // PaginationInfo'} from '../api; // 已修复
// 通用类型
export type {

  // TestConfig, TestPriority, TestResult, TestStatus, TestType, Timestamp, UUID'} from '../common; // 已修复
// 枚举类型
export type {

  Language, TestPriority as TestPriorityEnum, TestStatus as TestStatusEnum, TestType as TestTypeEnum, ThemeMode, Timezone, UserRole as UserRoleEnum,
  // UserStatus as UserStatusEnum'} from '../enums; // 已修复
// 测试引擎类型
export type {

  BaseTestConfig, BaseTestResult, PerformanceTestConfig,
  PerformanceTestResult,
  SecurityTestConfig,
  SecurityTestResult, SEOTestConfig,
  SEOTestResult, StressTestConfig,
  // StressTestResult, TestError, TestRecommendation, TestWarning'} from '../testEngines; // 已修复
// 测试历史类型
export type {

  TestHistoryQuery,
  TestHistoryResponse,
  // TestSession'} from '../testHistory; // 已修复
// API 响应类型
export type {

  ErrorCode,
  // ErrorSeverity, ApiError'} from './apiResponse; // 已修复
// API 响应工具函数
export {
  createApiError, extractData as extractApiData,
  extractError as extractApiError,
  extractPagination, isApiErrorResponse,
  isApiSuccessResponse,
  // isPaginatedResponse'} from './apiResponse; // 已修复
// 默认导出常用类型的联合
export type Models   = {
  User: User;AuthResponse: AuthResponse;
  ApiResponse: ApiResponse;
  TestResult: TestResult;
  TestConfig: TestConfig
} // 导入所需的类型;
import type { ApiResponse  } from '../api;import type { TestConfig, TestResult  } from '../common;import type { AuthResponse, User  } from '../user;';