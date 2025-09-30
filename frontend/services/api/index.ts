/**
 * API服务统一导出 - 重构版本
 * 版本: v2.0.0
 *
 * 统一导出所有API服务，解决重复文件问题
 */

// 主要API服务导出
export { apiService as apiService, default as defaultApiService, apiService } from './apiService';

// 类型导出
export type {
    ApiConfig, AuthConfig, RequestConfig, TestConfig, TestProgress, TestSession
} from './apiService';

// 向后兼容的导出
export { apiService as baseApiService, apiService as enhancedApiService } from './apiService';

// 错误处理相关导出（保持现有功能）
export * from './errorHandler';

// 默认导出
// 创建默认实例
import { apiService } from './apiService';
const apiService = new apiService();
export default apiService;

