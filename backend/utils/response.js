/**
 * 统一响应工具
 * 提供标准化的API响应格式
 */

/**
 * 成功响应
 */
function successResponse(res, data, message = 'Success') {
  return res.status(200).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 创建成功响应
 */
function createdResponse(res, data, message = 'Created') {
  return res.status(201).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 错误响应
 */
function errorResponse(res, message, statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * 验证错误响应
 */
function validationErrorResponse(res, errors) {
  return res.status(400).json({
    success: false,
    error: {
      message: 'Validation failed',
      details: errors,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * 未授权响应
 */
function unauthorizedResponse(res, message = 'Unauthorized') {
  return res.status(401).json({
    success: false,
    error: {
      message,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * 禁止访问响应
 */
function forbiddenResponse(res, message = 'Forbidden') {
  return res.status(403).json({
    success: false,
    error: {
      message,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * 未找到响应
 */
function notFoundResponse(res, message = 'Not found') {
  return res.status(404).json({
    success: false,
    error: {
      message,
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
};
