/**
 * 错误处理服务 - 已弃用
 * 请使用 frontend/services/api/unifiedErrorHandler.ts 中的统一错误处理器
 *
 * 此文件将被删除，所有功能已迁移到统一错误处理器
 */

console.warn('⚠️ 警告: errorService.ts 已弃用，请使用 unifiedErrorHandler');

// 重新导出统一错误处理器
import {
  frontendErrorHandler,
  handleApiError,
  handleAxiosError,
  handleComponentError,
  handleError
} from './api/unifiedErrorHandler';

// 向后兼容的导出
export { frontendErrorHandler as errorService, handleApiError, handleAxiosError, handleComponentError, handleError };
export default frontendErrorHandler;


