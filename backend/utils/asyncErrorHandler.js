/**
 * asyncErrorHandler 兼容性文件
 * 重新导出统一错误处理中的异步错误处理器
 * 保持向后兼容性
 */

const { asyncErrorHandler, asyncHandler } = require('../middleware/errorHandler');

// 重新导出，保持完全兼容
module.exports = {
  asyncErrorHandler,
  asyncHandler,
  // 默认导出为异步错误处理函数
  default: asyncErrorHandler
};
