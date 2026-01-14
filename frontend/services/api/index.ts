/**
 * API服务统一导出 - 新架构版本
 * 版本: v3.0.0
 *
 * 统一使用新的client.ts作为唯一API客户端
 */

// 主要API客户端导出
export { apiClient, ApiClient } from './client';
export type { ApiResponse, PaginatedResponse, ApiClientConfig } from './client';

// 拦截器相关导出
export { setupInterceptors, getAuthToken, removeAuthToken } from './interceptors';

// 向后兼容 - 保留旧的导出名称
export { apiClient as apiService } from './client';
export { apiClient as baseApiService } from './client';
export { apiClient as enhancedApiService } from './client';

// 错误处理相关导出（保持现有功能）
export * from './errorHandler';

// 默认导出
export { apiClient as default } from './client';

