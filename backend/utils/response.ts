/**
 * 统一响应工具
 * 提供标准化的API响应格式
 */

import type { Response } from 'express';

type ApiErrorDetail = Record<string, unknown> | Array<Record<string, unknown>> | string | null;

type ApiErrorPayload = {
  message: string;
  details?: ApiErrorDetail;
};

type ApiSuccessPayload<T = unknown> = {
  success: true;
  data: T;
  message: string;
  timestamp: string;
};

type ApiErrorResponse = {
  success: false;
  error: ApiErrorPayload;
  timestamp: string;
};

/**
 * 成功响应
 */
function successResponse<T = unknown>(res: Response, data: T, message = 'Success') {
  const payload: ApiSuccessPayload<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  return res.status(200).json(payload);
}

/**
 * 创建成功响应
 */
function createdResponse<T = unknown>(res: Response, data: T, message = 'Created') {
  const payload: ApiSuccessPayload<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  return res.status(201).json(payload);
}

/**
 * 错误响应
 */
function errorResponse(
  res: Response,
  message: string,
  statusCode = 500,
  details: ApiErrorDetail = null
) {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
}

/**
 * 验证错误响应
 */
function validationErrorResponse(res: Response, errors: ApiErrorDetail) {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      message: 'Validation failed',
      details: errors,
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(400).json(payload);
}

/**
 * 未授权响应
 */
function unauthorizedResponse(res: Response, message = 'Unauthorized') {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      message,
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(401).json(payload);
}

/**
 * 禁止访问响应
 */
function forbiddenResponse(res: Response, message = 'Forbidden') {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      message,
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(403).json(payload);
}

/**
 * 未找到响应
 */
function notFoundResponse(res: Response, message = 'Not found') {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      message,
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(404).json(payload);
}

export {
  createdResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
};

module.exports = {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
};
