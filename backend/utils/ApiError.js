/**
 * ApiError 兼容性文件
 * 重新导出统一错误处理中的ApiError类
 * 保持向后兼容性
 */

const { ApiError, ErrorCode, ErrorSeverity } = require('../middleware/errorHandler');

// 重新导出，保持完全兼容
module.exports = {
  ApiError,
  ErrorCode,
  ErrorSeverity,
  // 默认导出为ApiError类
  default: ApiError
};
