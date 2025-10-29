/**
 * 后端类型定义主入口文件 - 重构版本
 * 版本: v2.0.0
 * 创建时间: 2025-08-24
 *
 * 此文件统一导出所有后端类型定义
 * 使用统一类型定义，解决前后端不一致问题
 */

// ==================== 导出统一类型 ====================

// 重新导出统一类型
export * from '../../shared/types/sharedTypes';

// ==================== 导出共享类型（向后兼容） ====================

export {
  StandardApiError as ApiError, StandardApiErrorResponse as ApiErrorResponse, StandardApiMeta as ApiMeta,
  StandardApiResponse as ApiResponse,
  StandardApiSuccessResponse as ApiSuccessResponse, StandardCreatedResponse as CreatedResponse, StandardErrorCode as ErrorCode, StandardErrorMessages as ErrorMessages, HttpStatusCode, StandardNoContentResponse as NoContentResponse, StandardPaginatedResponse as PaginatedResponse, PaginationMeta,
  ValidationError as SharedValidationError,
  StandardStatusCodeMap as StatusCodeMap, Timestamp, UUID, isStandardApiErrorResponse as isApiErrorResponse, isStandardApiSuccessResponse as isApiSuccessResponse
} from '../../shared/types/standardApiResponse';

// ==================== 导出数据模型类型 ====================

export {
  AccessibilityTestResult, AuditLog, CompatibilityTestResult, CreateTestConfigData, CreateTestExecutionData, CreateUserData,
  // 基础类型
  DatabaseId, DatabaseTimestamp, JsonObject, LoadTestResult, PaginatedQueryResult,
  // 详细测试结果模型
  PerformanceTestResult,
  // 查询结果类型
  QueryResult,
  // 请求上下文
  RequestContext, SecurityTestResult, SeoTestResult, StressTestResult,
  // 系统相关模型
  SystemConfiguration,
  // 测试相关模型
  TestConfiguration,
  TestExecution,
  // 报告相关模型
  TestReport, TestResult, UpdateTestConfigData, UpdateTestExecutionData, UpdateUserData,
  // 用户相关模型
  User,
  UserProfile,
  UserSession
} from './models';

// ==================== 导出API类型 ====================

export {
  BusinessLogicError, CancelTestRequest, ChangePasswordRequest,
  // 报告相关API类型
  CreateReportRequest,
  CreateReportResponse,
  // 测试配置相关API类型
  CreateTestConfigRequest,
  CreateTestConfigResponse, DeleteFileRequest, GenerateReportRequest,
  GenerateReportResponse, GetReportsQuery,
  GetReportsResponse, GetSystemConfigResponse,
  // 系统相关API类型
  GetSystemStatsResponse, GetTestConfigsQuery,
  GetTestConfigsResponse, GetTestExecutionResponse, GetTestExecutionsQuery,
  GetTestExecutionsResponse, GetTestResultResponse,
  // 测试结果相关API类型
  GetTestResultsQuery,
  GetTestResultsResponse,
  // 用户相关API类型
  GetUserResponse, GetUsersQuery,
  GetUsersResponse,
  // 认证相关API类型
  LoginRequest,
  LoginResponse, RefreshTokenRequest,
  RefreshTokenResponse, RegisterRequest,
  RegisterResponse, ResetPasswordConfirmRequest, ResetPasswordRequest,
  // 测试执行相关API类型
  StartTestRequest,
  StartTestResponse, SystemNotificationMessage, TestProgressMessage, UpdateSystemConfigRequest, UpdateTestConfigRequest,
  UpdateTestConfigResponse, UpdateUserRequest,
  UpdateUserResponse,
  // 文件上传相关API类型
  UploadFileResponse,
  // 错误处理类型
  ValidationErrorDetail,
  // WebSocket相关类型
  WebSocketMessage
} from './api';

// ==================== 导出服务类型 ====================

export {

  // 缓存服务
  CacheService,
  CacheStats, CreateReportData,
  // 数据库服务
  DatabaseService, EmailTemplate, EngineStatus, FileRecord,
  // 文件服务
  FileService, FileStream, FileUpload,
  // 通知服务
  NotificationService, ReportFile,
  // 报告服务
  ReportService, ReportTemplate,
  // 服务容器
  ServiceContainer, SessionService, StorageStats,
  // 测试相关服务
  TestConfigService, TestEngine, TestExecutionService,
  TestResultService,
  // 用户相关服务
  UserService, ValidationError,
  // 验证和工具
  ValidationResult
} from './services';

// ==================== 导出响应构建工具 ====================

export {
  ApiResponseBuilder, createConflictResponse, createCreatedResponse, createErrorResponse, createForbiddenResponse, createInternalErrorResponse, createNoContentResponse, createNotFoundResponse, createPaginatedResponse, createPaginationMeta, createRateLimitResponse, createStandardMeta, createSuccessResponse, createUnauthorizedResponse, createValidationErrorResponse, generateRequestId, getHttpStatusCode,
  wrapAsyncOperation
} from '../../shared/utils/apiResponseBuilder';

// ==================== 类型别名和兼容性 ====================

// 为了向后兼容，提供一些常用的类型别名
export type BackendUser = User;
export type BackendTestConfig = TestConfiguration;
export type BackendTestExecution = TestExecution;
export type BackendTestResult = TestResult;

// Express相关类型扩展
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: UserSession;
      context?: RequestContext;
      startTime?: number;
    }

    interface Response {
      success: (data?: any, message?: string, statusCode?: number, meta?: any) => Response;
      error: (code: string, message?: string, details?: any, statusCode?: number, meta?: any) => Response;
      paginated: (data: any[], page: number, limit: number, total: number, message?: string, meta?: any) => Response;
      created: (data: any, message?: string, meta?: any) => Response;
      noContent: (message?: string, meta?: any) => Response;
      unauthorized: (message?: string) => Response;
      forbidden: (message?: string) => Response;
      notFound: (resource?: string) => Response;
      conflict: (resource?: string, message?: string) => Response;
      rateLimit: (message?: string, retryAfter?: number) => Response;
      serverError: (message?: string, details?: any) => Response;
      validationError: (errors: any[], message?: string) => Response;
    }
  }
}

// ==================== 默认导出 ====================

export default {
  // 共享类型
  ErrorCode,
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  PaginatedResponse,

  // 数据模型
  User,
  TestConfiguration,
  TestExecution,
  TestResult,

  // 服务接口
  UserService,
  TestConfigService,
  TestExecutionService,
  TestResultService,

  // 响应构建工具
  ApiResponseBuilder
};
