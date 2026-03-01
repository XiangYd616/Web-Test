/**
 * 🔍 统一测试引擎验证中间件
 * 基于Joi的最佳实践，为测试配置提供严格的验证
 */

import type { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import { TEST_TYPES } from '../constants/testTypes';

const respondInvalidInput = (res: Response, message: string, details?: unknown) =>
  res.error(StandardErrorCode.INVALID_INPUT, message, details, 400);

const respondInternalError = (res: Response, message: string, details?: unknown) =>
  res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, message, details, 500);

/**
 * 验证测试类型
 */
const validateTestType = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.string().valid(...TEST_TYPES);
  const { error } = schema.validate(req.query.testType);

  if (error) {
    return respondInvalidInput(res, `无效的测试类型。支持的类型: ${TEST_TYPES.join(', ')}`);
  }

  return next();
};

/**
 * 使用 Joi 验证请求体/查询参数
 */
const validateRequest = (schema: Joi.Schema, target: 'body' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return respondInvalidInput(res, error.details.map(detail => detail.message).join(', '));
    }

    (req as Request & { [key: string]: unknown })[target] = value;
    return next();
  };
};

const validateQuery = (schema: Joi.Schema) => validateRequest(schema, 'query');

/**
 * 验证分页参数
 */
const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { page, limit } = req.query;

  // 验证页码
  if (page !== undefined) {
    const pageNum = parseInt(String(page));
    if (isNaN(pageNum) || pageNum < 1) {
      return respondInvalidInput(res, '页码必须是大于0的整数');
    }
    (req.query as Record<string, unknown>).page = pageNum;
  }

  // 验证每页数量
  if (limit !== undefined) {
    const limitNum = parseInt(String(limit));
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return respondInvalidInput(res, '每页数量必须是1-100之间的整数');
    }
    (req.query as Record<string, unknown>).limit = limitNum;
  }

  return next();
};

/**
 * 验证排序参数
 */
const validateSorting = (req: Request, res: Response, next: NextFunction) => {
  const { sortBy, sortOrder } = req.query;

  const validSortFields = [
    'created_at',
    'updated_at',
    'start_time',
    'end_time',
    'duration',
    'overall_score',
    'test_name',
  ];

  const validSortOrders = ['ASC', 'DESC', 'asc', 'desc'];

  if (sortBy && !validSortFields.includes(String(sortBy))) {
    return respondInvalidInput(res, `无效的排序字段。支持的字段: ${validSortFields.join(', ')}`);
  }

  if (sortOrder && !validSortOrders.includes(String(sortOrder))) {
    return respondInvalidInput(res, '无效的排序方向。支持: ASC, DESC');
  }

  return next();
};

/**
 * 验证UUID格式
 */
const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(String(value))) {
      return respondInvalidInput(res, `无效的${paramName}格式`);
    }

    return next();
  };
};

/**
 * 验证邮箱格式
 */
const validateEmail = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(String(email))) {
    return respondInvalidInput(res, '无效的邮箱格式');
  }

  return next();
};

/**
 * 验证密码强度
 */
const validatePassword = (req: Request, res: Response, next: NextFunction) => {
  const { password } = req.body;

  if (!password) {
    return respondInvalidInput(res, '密码是必需的');
  }

  if (typeof password !== 'string') {
    return respondInvalidInput(res, '密码必须是字符串');
  }

  if (password.length < 8) {
    return respondInvalidInput(res, '密码长度至少8位');
  }

  // 检查密码强度
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return respondInvalidInput(res, '密码必须包含大写字母、小写字母、数字和特殊字符');
  }

  return next();
};

/**
 * 验证手机号格式
 */
const validatePhoneNumber = (req: Request, res: Response, next: NextFunction) => {
  const { phoneNumber } = req.body;
  const phoneRegex = /^1[3-9]\d{9}$/;

  if (!phoneNumber || !phoneRegex.test(String(phoneNumber))) {
    return respondInvalidInput(res, '无效的手机号格式');
  }

  return next();
};

/**
 * 验证日期范围
 */
const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.query;

  if (startDate) {
    const start = new Date(String(startDate));
    if (isNaN(start.getTime())) {
      return respondInvalidInput(res, '无效的开始日期格式');
    }
  }

  if (endDate) {
    const end = new Date(String(endDate));
    if (isNaN(end.getTime())) {
      return respondInvalidInput(res, '无效的结束日期格式');
    }
  }

  if (startDate && endDate) {
    const start = new Date(String(startDate));
    const end = new Date(String(endDate));

    if (start > end) {
      return respondInvalidInput(res, '开始日期不能晚于结束日期');
    }

    // 检查日期范围是否超过一年
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > oneYear) {
      return respondInvalidInput(res, '日期范围不能超过一年');
    }
  }

  return next();
};

/**
 * 验证文件上传
 */
const validateFileUpload = (
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    maxFiles?: number;
  } = {}
) => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], maxFiles = 1 } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const files = (req as { files?: Array<{ size: number; mimetype: string }> }).files;

    if (!files || files.length === 0) {
      return respondInvalidInput(res, '请选择要上传的文件');
    }

    if (files.length > maxFiles) {
      return respondInvalidInput(res, `最多只能上传${maxFiles}个文件`);
    }

    for (const file of files) {
      // 检查文件大小
      if (file.size > maxSize) {
        return respondInvalidInput(res, `文件大小不能超过${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      // 检查文件类型
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return respondInvalidInput(res, `不支持的文件类型。支持的类型: ${allowedTypes.join(', ')}`);
      }
    }

    return next();
  };
};

/**
 * 验证JSON格式
 */
const validateJSON = (req: Request, res: Response, next: NextFunction) => {
  const { data } = req.body;

  if (data && typeof data === 'string') {
    try {
      JSON.parse(data);
    } catch {
      return respondInvalidInput(res, '无效的JSON格式');
    }
  }

  return next();
};

/**
 * 验证数组字段
 */
const validateArray = (
  fieldName: string,
  options: {
    minLength?: number;
    maxLength?: number;
    itemSchema?: Joi.Schema;
  } = {}
) => {
  const { minLength = 0, maxLength = 100, itemSchema } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[fieldName];

    if (value === undefined) {
      return next();
    }

    if (!Array.isArray(value)) {
      return respondInvalidInput(res, `${fieldName}必须是数组`);
    }

    if (value.length < minLength) {
      return respondInvalidInput(res, `${fieldName}至少需要${minLength}个元素`);
    }

    if (value.length > maxLength) {
      return respondInvalidInput(res, `${fieldName}最多允许${maxLength}个元素`);
    }

    // 如果提供了itemSchema，验证每个元素
    if (itemSchema) {
      for (let i = 0; i < value.length; i++) {
        const { error } = itemSchema.validate(value[i]);
        if (error) {
          return respondInvalidInput(res, `${fieldName}[${i}]验证失败: ${error.message}`);
        }
      }
    }

    return next();
  };
};

/**
 * 验证对象字段
 */
const validateObject = (fieldName: string, schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[fieldName];

    if (value === undefined) {
      return next();
    }

    if (typeof value !== 'object' || value === null) {
      return respondInvalidInput(res, `${fieldName}必须是对象`);
    }

    const { error } = schema.validate(value);
    if (error) {
      return respondInvalidInput(res, `${fieldName}验证失败: ${error.message}`);
    }

    return next();
  };
};

/**
 * 自定义验证中间件
 */
const customValidation = (validator: (req: Request) => { isValid: boolean; message?: string }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validator(req);

    if (!result.isValid) {
      return respondInvalidInput(res, result.message || '验证失败');
    }

    return next();
  };
};

/**
 * 条件验证中间件
 */
const conditionalValidation = (
  condition: (req: Request) => boolean,
  validator: (req: Request, res: Response, next: NextFunction) => void
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return validator(req, res, next);
    }
    return next();
  };
};

/**
 * 组合验证中间件
 */
const combineValidations = (
  ...validators: Array<(req: Request, res: Response, next: NextFunction) => void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let index = 0;

    const runNext = () => {
      if (index >= validators.length) {
        return next();
      }

      const validator = validators[index++];
      validator(req, res, runNext);
    };

    return runNext();
  };
};

/**
 * 异步验证中间件
 */
const asyncValidation = (
  validator: (req: Request) => Promise<{ isValid: boolean; message?: string }>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await validator(req);

      if (!result.isValid) {
        return respondInvalidInput(res, result.message || '验证失败');
      }

      return next();
    } catch {
      return respondInternalError(res, '验证过程中发生错误');
    }
  };
};

export {
  asyncValidation,
  combineValidations,
  conditionalValidation,
  customValidation,
  TEST_TYPES,
  validateArray,
  validateDateRange,
  validateEmail,
  validateFileUpload,
  validateJSON,
  validateObject,
  validatePagination,
  validatePassword,
  validatePhoneNumber,
  validateQuery,
  validateRequest,
  validateSorting,
  validateTestType,
  validateUUID,
};
