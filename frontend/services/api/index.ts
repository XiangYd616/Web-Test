/**
 * API服务统一导出
 * 版本: v3.0.0
 *
 * 统一使用新的client.ts作为唯一API客户端
 */

// 主要API客户端导出
export { ApiClient, apiClient } from './client';
export type { ApiClientConfig, ApiResponse, PaginatedResponse } from './client';

// Repository层导出
export { AuthRepository, TestRepository, authRepository, testRepository } from './repositories';

export type {
  AuthTokens,
  LoginCredentials,
  RegisterData,
  TestConfig,
  TestExecution,
  TestHistory,
  User,
} from './repositories';

// 拦截器相关导出
export { getAuthToken, removeAuthToken, setupInterceptors } from './interceptors';

// 向后兼容 - 保留旧的导出名称
export { apiClient as apiService, apiClient as baseApiService } from './client';

// 错误处理相关导出（保持现有功能）
export * from './errorHandler';

// 默认导出
export { apiClient as default } from './client';
