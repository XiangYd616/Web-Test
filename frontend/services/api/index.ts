import { TestProgress } from '../../services/api/testProgressService';
/**
 * API服务统一导出 - 重构版本
 * 版本: v2.0.0
 *
 * 统一导出所有API服务，解决重复文件问题
 */

// 主要API服务导出
export {
    UnifiedApiService, unifiedApiService as apiService, default as defaultApiService
} from './unifiedApiService';

// 类型导出
export type {
    ApiConfig, AuthConfig, RequestConfig, TestConfig, TestProgress, TestSession
} from './unifiedApiService';

// 向后兼容的导出
export { unifiedApiService as baseApiService, unifiedApiService as enhancedApiService } from './unifiedApiService';

// 错误处理相关导出（保持现有功能）
export * from './errorHandler';

// 默认导出
export default unifiedApiService;

