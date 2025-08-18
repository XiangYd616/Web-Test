/**
 * 错误处理器
 */

const errorHandler = {
  handle: (error, req, res, next) => {
    console.error('Error:', error);

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  },

  log: (error) => {
    console.error('Error logged:', error);
  }
};

/**
 * 初始化错误处理系统
 */
async function initializeErrorHandlingSystem() {
  console.log('✅ 错误处理系统初始化完成');
  return Promise.resolve();
}

/**
 * 统一错误处理器
 */
const unifiedErrorHandler = {
  expressMiddleware: () => {
    return errorHandler.handle;
  }
};

module.exports = {
  errorHandler,
  initializeErrorHandlingSystem,
  unifiedErrorHandler
};
