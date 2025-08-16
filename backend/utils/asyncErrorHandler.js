/**
 * 后端统一异步错误处理工具
 * 版本: v2.0.0
 */

const { createErrorResponse, StandardErrorCode } = require('../../shared/utils/apiResponseBuilder.js');

/**
 * 包装异步操作，提供统一的错误处理
 */
async function handleAsyncError(operation, options = {}) {
  const {
    context = 'Unknown operation',
    logError = true,
    throwError = true
  } = options;

  try {
    return await operation();
  } catch (error) {
    if (logError) {
      console.error(`[${context}] Error:`, error);
    }

    // 记录错误到日志系统
    // TODO: 集成日志系统

    if (throwError) {
      throw error;
    }

    return null;
  }
}

/**
 * Express路由错误处理包装器
 */
function asyncRouteHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error('Route handler error:', error);

      // 使用统一的错误响应格式
      if (!res.headersSent) {
        return res.error(
          StandardErrorCode.INTERNAL_SERVER_ERROR,
          error.message,
          { stack: error.stack }
        );
      }

      next(error);
    }
  };
}

/**
 * 数据库操作错误处理包装器
 */
async function handleDatabaseError(operation, context = 'Database operation') {
  try {
    return await operation();
  } catch (error) {
    console.error(`[${context}] Database error:`, error);

    // 根据错误类型返回不同的错误代码
    if (error.code === '23505') {
      throw new Error('Duplicate entry');
    } else if (error.code === '23503') {
      throw new Error('Foreign key constraint violation');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Database connection failed');
    }

    throw error;
  }
}

/**
 * 创建异步中间件包装器
 */
function createAsyncMiddleware(middleware) {
  return (req, res, next) => {
    Promise.resolve(middleware(req, res, next)).catch(next);
  };
}

/**
 * 批量包装路由处理器
 */
function wrapRoutes(routes) {
  const wrappedRoutes = {};

  for (const [path, handler] of Object.entries(routes)) {
    if (typeof handler === 'function') {
      wrappedRoutes[path] = asyncRouteHandler(handler);
    } else if (typeof handler === 'object') {
      wrappedRoutes[path] = {};
      for (const [method, methodHandler] of Object.entries(handler)) {
        wrappedRoutes[path][method] = asyncRouteHandler(methodHandler);
      }
    }
  }

  return wrappedRoutes;
}

/**
 * 服务层错误处理包装器
 */
function createServiceWrapper(service) {
  const wrappedService = {};

  for (const [methodName, method] of Object.entries(service)) {
    if (typeof method === 'function') {
      wrappedService[methodName] = async (...args) => {
        return handleAsyncError(
          () => method.apply(service, args),
          { context: `${service.constructor.name}.${methodName}` }
        );
      };
    } else {
      wrappedService[methodName] = method;
    }
  }

  return wrappedService;
}

module.exports = {
  handleAsyncError,
  asyncRouteHandler,
  handleDatabaseError,
  createAsyncMiddleware,
  wrapRoutes,
  createServiceWrapper
};
