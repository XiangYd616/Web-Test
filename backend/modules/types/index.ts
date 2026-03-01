/**
 * 后端类型定义主入口文件 - 重构版本
 * 版本: v2.0.0
 * 创建时间: 2025-08-24
 *
 * 此文件统一导出所有后端类型定义
 * 使用统一类型定义，解决前后端不一致问题
 */

import type {
  RequestContext,
  TestConfiguration,
  TestExecution,
  TestResult,
  User,
  UserSession,
} from './models';

// ==================== 导出共享类型 ====================

// 重新导出共享类型
export * from '../../../shared/types/shared.types';

// ==================== 导出共享类型（向后兼容） ====================

export {
  StandardApiError as ApiError,
  StandardApiErrorResponse as ApiErrorResponse,
  StandardApiMeta as ApiMeta,
  StandardApiSuccessResponse as ApiSuccessResponse,
  StandardCreatedResponse as CreatedResponse,
  StandardErrorCode as ErrorCode,
  StandardErrorMessages as ErrorMessages,
  HttpStatusCode,
  isStandardApiErrorResponse as isApiErrorResponse,
  isStandardApiSuccessResponse as isApiSuccessResponse,
  StandardNoContentResponse as NoContentResponse,
  StandardPaginatedResponse as PaginatedResponse,
  PaginationMeta,
  ValidationError as SharedValidationError,
  StandardApiResponse,
  StandardStatusCodeMap as StatusCodeMap,
  Timestamp,
  UUID,
} from '../../../shared/types/standardApiResponse';

// ==================== 导出数据模型类型 ====================

export {
  AccessibilityTestResult,
  AuditLog,
  CreateTestConfigData,
  CreateTestExecutionData,
  CreateUserData,
  // 基础类型
  DatabaseId,
  DatabaseTimestamp,
  JsonObject,
  PaginatedQueryResult,
  // 详细测试结果模型
  PerformanceTestResult,
  // 查询结果类型
  QueryResult,
  // 请求上下文
  RequestContext,
  SecurityTestResult,
  SeoTestResult,
  StressTestResult,
  // 系统相关模型
  SystemConfiguration,
  // 测试相关模型
  TestConfiguration,
  TestExecution,
  TestMetricRecord,
  // 报告相关模型
  TestReport,
  TestResult,
  TestResultRecord,
  UpdateTestConfigData,
  UpdateTestExecutionData,
  UpdateUserData,
  // 用户相关模型
  User,
  UserProfile,
  UserSession,
} from './models';

// ==================== 导出API类型 ====================

export {
  BusinessLogicError,
  CancelTestRequest,
  ChangePasswordRequest,
  // 报告相关API类型
  CreateReportRequest,
  CreateReportResponse,
  // 测试配置相关API类型
  CreateTestConfigRequest,
  CreateTestConfigResponse,
  DeleteFileRequest,
  GenerateReportRequest,
  GenerateReportResponse,
  GetReportsQuery,
  GetReportsResponse,
  GetSystemConfigResponse,
  // 系统相关API类型
  GetSystemStatsResponse,
  GetTestConfigsQuery,
  GetTestConfigsResponse,
  GetTestExecutionResponse,
  GetTestExecutionsQuery,
  GetTestExecutionsResponse,
  GetTestResultResponse,
  // 测试结果相关API类型
  GetTestResultsQuery,
  GetTestResultsResponse,
  // 用户相关API类型
  GetUserResponse,
  GetUsersQuery,
  GetUsersResponse,
  // 认证相关API类型
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordConfirmRequest,
  ResetPasswordRequest,
  // 测试执行相关API类型
  StartTestRequest,
  StartTestResponse,
  SystemNotificationMessage,
  TestProgressMessage,
  UpdateSystemConfigRequest,
  UpdateTestConfigRequest,
  UpdateTestConfigResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  // 文件上传相关API类型
  UploadFileResponse,
  // 错误处理类型
  ValidationErrorDetail,
  // WebSocket相关类型
  WebSocketMessage,
} from './api';

// ==================== 导出服务类型 ====================

export {
  CreateReportData,
  // 数据库服务
  DatabaseService,
  EmailTemplate,
  FileRecord,
  FileStream,
  FileUpload,
  // 通知服务
  NotificationService,
  ReportFile,
  // 报告服务
  ReportService,
  ReportTemplate,
  SessionService,
  StorageStats,
  // 测试相关服务
  TestConfigService,
  TestExecutionService,
  TestResultService,
  // 用户相关服务
  UserService,
  ValidationError,
  // 验证和工具
  ValidationResult,
} from './services';

// ==================== 导出响应构建工具 ====================

export {
  ApiResponseBuilder,
  createConflictResponse,
  createCreatedResponse,
  createErrorResponse,
  createForbiddenResponse,
  createInternalErrorResponse,
  createNoContentResponse,
  createNotFoundResponse,
  createPaginatedResponse,
  createPaginationMeta,
  createRateLimitResponse,
  createStandardMeta,
  createSuccessResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  generateRequestId,
  getHttpStatusCode,
  wrapAsyncOperation,
} from '../../../shared/utils/apiResponseBuilder';

// ==================== 类型别名和兼容性 ====================

// 为了向后兼容，提供一些常用的类型别名
export type BackendUser = User;
export type BackendTestConfig = TestConfiguration;
export type BackendTestExecution = TestExecution;
export type BackendTestResult = TestResult;

// ==================== Express 请求/响应类型 ====================

import type { Request, Response } from 'express';

/**
 * 统一的 API 响应类型
 * 与 responseFormatter.ts 中间件扩展的方法完全一致
 * 所有路由文件应导入此类型，而非自行定义
 */
export type ApiResponse = Response & {
  success: (data?: unknown, message?: string, statusCode?: number, meta?: unknown) => Response;
  error: (
    code: string,
    message?: string,
    details?: unknown,
    statusCode?: number,
    meta?: unknown
  ) => Response;
  downloadResponse: (
    payload: string | Buffer,
    filename: string,
    contentType?: string,
    statusCode?: number,
    meta?: unknown
  ) => Response;
  paginated: (
    data: unknown[],
    page: number,
    limit: number,
    total: number,
    message?: string,
    meta?: unknown
  ) => Response;
  validationError: (errors: unknown[] | Record<string, unknown>, message?: string) => Response;
  unauthorized: (message?: string) => Response;
  forbidden: (message?: string) => Response;
  notFound: (message?: string) => Response;
  conflict: (message?: string) => Response;
  rateLimit: (message?: string) => Response;
  internalError: (message?: string) => Response;
  created: (data?: unknown, message?: string, meta?: unknown) => Response;
  noContent: () => Response;
  custom: (statusCode: number, data?: unknown, message?: string, meta?: unknown) => Response;
  redirectResponse: (url: string, message?: string, statusCode?: number) => Response;
};

/**
 * 已认证请求类型（user 必选）
 * 用于经过 authMiddleware 处理后的路由
 */
export type AuthRequest = Request & {
  user: {
    id: string;
    role?: string;
    username?: string;
    email?: string;
  };
};

/**
 * 可选认证请求类型（user 可选）
 * 用于经过 optionalAuth 处理或未强制认证的路由
 */
export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role?: string;
    username?: string;
    email?: string;
  } | null;
};

// Express 全局类型扩展
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: UserSession;
      context?: RequestContext;
      requestId?: string;
      startTime?: number;
    }

    interface Response {
      success: (data?: unknown, message?: string, statusCode?: number, meta?: unknown) => Response;
      error: (
        code: string,
        message?: string,
        details?: unknown,
        statusCode?: number,
        meta?: unknown
      ) => Response;
      downloadResponse: (
        payload: string | Buffer,
        filename: string,
        contentType?: string,
        statusCode?: number,
        meta?: unknown
      ) => Response;
      paginated: (
        data: unknown[],
        page: number,
        limit: number,
        total: number,
        message?: string,
        meta?: unknown
      ) => Response;
      validationError: (errors: unknown[] | Record<string, unknown>, message?: string) => Response;
      unauthorized: (message?: string) => Response;
      forbidden: (message?: string) => Response;
      notFound: (message?: string) => Response;
      conflict: (message?: string) => Response;
      rateLimit: (message?: string) => Response;
      internalError: (message?: string) => Response;
      created: (data?: unknown, message?: string, meta?: unknown) => Response;
      noContent: () => Response;
      custom: (statusCode: number, data?: unknown, message?: string, meta?: unknown) => Response;
      redirectResponse: (url: string, message?: string, statusCode?: number) => Response;
    }
  }
}
