/**
 * 异步处理中间件
 * 用于包装异步路由处理器，自动捕获错误
 */

/**
 * 异步处理器包装函数
 * @param {Function} fn - 异步函数
 * @returns {Function} Express中间件函数
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    // 确保fn是一个函数
    if (typeof fn !== 'function') {
      return next(new Error('asyncHandler expects a function'));
    }

    // 执行异步函数并捕获错误
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
