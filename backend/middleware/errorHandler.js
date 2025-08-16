/**
 * 错误处理中间件
 * 统一处理API错误和异常
 */

class ErrorHandler {
  /**
   * 全局错误处理中间件
   */
  static globalErrorHandler(err, req, res, next) {
    console.error('全局错误:', err);

    // 默认错误响应
    let statusCode = 500;
    let message = '服务器内部错误';
    let details = null;

    // 根据错误类型设置响应
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = '请求参数验证失败';
      details = err.details;
    } else if (err.name === 'UnauthorizedError') {
      statusCode = 401;
      message = '未授权访问';
    } else if (err.name === 'ForbiddenError') {
      statusCode = 403;
      message = '禁止访问';
    } else if (err.name === 'NotFoundError') {
      statusCode = 404;
      message = '资源未找到';
    } else if (err.name === 'ConflictError') {
      statusCode = 409;
      message = '资源冲突';
    } else if (err.code === 'ENOTFOUND') {
      statusCode = 400;
      message = 'URL无法访问';
    } else if (err.code === 'ECONNREFUSED') {
      statusCode = 400;
      message = '连接被拒绝';
    } else if (err.code === 'ETIMEDOUT') {
      statusCode = 408;
      message = '请求超时';
    }

    // 发送错误响应
    res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: err.code || 'INTERNAL_ERROR',
        details: details || (process.env.NODE_ENV === 'development' ? err.stack : undefined)
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 异步错误包装器
   */
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * 404错误处理
   */
  static notFoundHandler(req, res) {
    res.status(404).json({
      success: false,
      error: {
        message: '请求的资源未找到',
        code: 'NOT_FOUND',
        path: req.path
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 请求验证错误
   */
  static validationError(message, details = null) {
    const error = new Error(message);
    error.name = 'ValidationError';
    error.details = details;
    return error;
  }

  /**
   * 未授权错误
   */
  static unauthorizedError(message = '未授权访问') {
    const error = new Error(message);
    error.name = 'UnauthorizedError';
    return error;
  }

  /**
   * 禁止访问错误
   */
  static forbiddenError(message = '禁止访问') {
    const error = new Error(message);
    error.name = 'ForbiddenError';
    return error;
  }

  /**
   * 资源未找到错误
   */
  static notFoundError(message = '资源未找到') {
    const error = new Error(message);
    error.name = 'NotFoundError';
    return error;
  }

  /**
   * 资源冲突错误
   */
  static conflictError(message = '资源冲突') {
    const error = new Error(message);
    error.name = 'ConflictError';
    return error;
  }
}

module.exports = ErrorHandler;