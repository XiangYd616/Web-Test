/**
 * 后端类型定义主入口文件
 * 版本: v2.0.0
 * 创建时间: 2025-08-16
 * 
 * 此文件统一导出所有后端类型定义
 * 提供一个统一的导入入口
 */

// ==================== 导出共享类型 ====================

export {
  UUID,
  Timestamp,
  HttpStatusCode,
  StandardErrorCode as ErrorCode,
  StandardApiError as ApiError,
  StandardApiMeta as ApiMeta,
  StandardApiResponse as ApiResponse,
  StandardApiSuccessResponse as ApiSuccessResponse,
  StandardApiErrorResponse as ApiErrorResponse,
  StandardPaginatedResponse as PaginatedResponse,
  StandardCreatedResponse as CreatedResponse,
  StandardNoContentResponse as NoContentResponse,
  PaginationMeta,
  ValidationError as SharedValidationError,
  StandardStatusCodeMap as StatusCodeMap,
  StandardErrorMessages as ErrorMessages,
  isStandardApiSuccessResponse as isApiSuccessResponse,
  isStandardApiErrorResponse as isApiErrorResponse
} from '../../shared/types/standardApiResponse';

// ==================== 导出数据模型类型 ====================

export {
  // 基础类型
  DatabaseId,
  JsonObject,
  DatabaseTimestamp,
  
  // 用户相关模型
  User,
  UserProfile,
  UserSession,
  CreateUserData,
  UpdateUserData,
  
  // 测试相关模型
  TestConfiguration,
  TestExecution,
  TestResult,
  CreateTestConfigData,
  UpdateTestConfigData,
  CreateTestExecutionData,
  UpdateTestExecutionData,
  
  // 详细测试结果模型
  PerformanceTestResult,
  AccessibilityTestResult,
  SeoTestResult,
  SecurityTestResult,
  CompatibilityTestResult,
  LoadTestResult,
  StressTestResult,
  
  // 报告相关模型
  TestReport,
  
  // 系统相关模型
  SystemConfiguration,
  AuditLog,
  
  // 查询结果类型
  QueryResult,
  PaginatedQueryResult,
  
  // 请求上下文
  RequestContext
} from './models';

// ==================== 导出API类型 ====================

export {
  // 认证相关API类型
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ChangePasswordRequest,
  ResetPasswordRequest,
  ResetPasswordConfirmRequest,
  
  // 用户相关API类型
  GetUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  GetUsersQuery,
  GetUsersResponse,
  
  // 测试配置相关API类型
  CreateTestConfigRequest,
  CreateTestConfigResponse,
  UpdateTestConfigRequest,
  UpdateTestConfigResponse,
  GetTestConfigsQuery,
  GetTestConfigsResponse,
  
  // 测试执行相关API类型
  StartTestRequest,
  StartTestResponse,
  GetTestExecutionsQuery,
  GetTestExecutionsResponse,
  GetTestExecutionResponse,
  CancelTestRequest,
  
  // 测试结果相关API类型
  GetTestResultsQuery,
  GetTestResultsResponse,
  GetTestResultResponse,
  
  // 报告相关API类型
  CreateReportRequest,
  CreateReportResponse,
  GetReportsQuery,
  GetReportsResponse,
  GenerateReportRequest,
  GenerateReportResponse,
  
  // 系统相关API类型
  GetSystemStatsResponse,
  GetSystemConfigResponse,
  UpdateSystemConfigRequest,
  
  // 文件上传相关API类型
  UploadFileResponse,
  DeleteFileRequest,
  
  // WebSocket相关类型
  WebSocketMessage,
  TestProgressMessage,
  SystemNotificationMessage,
  
  // 错误处理类型
  ValidationErrorDetail,
  BusinessLogicError
} from './api';

// ==================== 导出服务类型 ====================

export {
  // 数据库服务
  DatabaseService,
  
  // 用户相关服务
  UserService,
  SessionService,
  
  // 测试相关服务
  TestConfigService,
  TestExecutionService,
  TestResultService,
  
  // 报告服务
  ReportService,
  CreateReportData,
  ReportFile,
  ReportTemplate,
  
  // 文件服务
  FileService,
  FileUpload,
  FileRecord,
  FileStream,
  StorageStats,
  
  // 通知服务
  NotificationService,
  EmailTemplate,
  
  // 缓存服务
  CacheService,
  CacheStats,
  
  // 验证和工具
  ValidationResult,
  ValidationError,
  TestEngine,
  EngineStatus,
  
  // 服务容器
  ServiceContainer
} from './services';

// ==================== 导出响应构建工具 ====================

export {
  createSuccessResponse,
  createCreatedResponse,
  createNoContentResponse,
  createPaginatedResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createConflictResponse,
  createRateLimitResponse,
  createInternalErrorResponse,
  generateRequestId,
  createStandardMeta,
  createPaginationMeta,
  getHttpStatusCode,
  wrapAsyncOperation,
  ApiResponseBuilder
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
