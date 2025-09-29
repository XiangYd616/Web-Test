/**
 * errorHandler 兼容性文件
 * 重新导出统一错误处理中的错误处理功能
 * 保持向后兼容性
 */

const { 
  ErrorHandler, 
  ErrorCode, 
  ErrorSeverity,
  handleError,
  errorMiddleware
} = require('../middleware/errorHandler');

// 重新导出，保持完全兼容
module.exports = {
  // 错误类型枚举
  ErrorTypes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',  
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED_ERROR: 'UNAUTHORIZED_ERROR',
    FORBIDDEN_ERROR: 'FORBIDDEN_ERROR',
    CONFLICT_ERROR: 'CONFLICT_ERROR',
    BAD_REQUEST_ERROR: 'BAD_REQUEST_ERROR'
  },

  // 服务错误类（简化版）
  ServiceError: class ServiceError extends Error {
    constructor(message, type = 'INTERNAL_ERROR', details = null) {
      super(message);
      this.name = 'ServiceError';
      this.type = type;
      this.details = details;
      this.timestamp = new Date().toISOString();
    }
  },

  // 初始化函数
  initializeErrorHandlingSystem: () => {
    console.log('✅ 错误处理系统已初始化');
    return true;
  },

  // 统一错误处理中间件
  unifiedErrorHandler: errorMiddleware,

  // 其他导出
  ErrorHandler,
  ErrorCode,
  ErrorSeverity,
  handleError
};
