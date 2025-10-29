/**
 * 输入验证中间件模块
 * 提供统一的请求参数验证
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * 验证结果处理中间件
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

/**
 * 时间范围验证规则 (1-365天)
 */
const validateTimeRange = [
  query('timeRange')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('timeRange must be between 1 and 365 days'),
  handleValidationErrors
];

/**
 * 域名验证规则
 */
const validateDomain = [
  body('domain')
    .trim()
    .notEmpty()
    .withMessage('Domain is required')
    .isLength({ max: 255 })
    .withMessage('Domain must not exceed 255 characters')
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/)
    .withMessage('Invalid domain format'),
  handleValidationErrors
];

/**
 * URL验证规则
 */
const validateUrl = [
  body('url')
    .trim()
    .notEmpty()
    .withMessage('URL is required')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Invalid URL format')
    .isLength({ max: 2048 })
    .withMessage('URL must not exceed 2048 characters'),
  handleValidationErrors
];

/**
 * 测试ID验证规则
 */
const validateTestId = [
  param('testId')
    .isInt({ min: 1 })
    .withMessage('Test ID must be a positive integer'),
  handleValidationErrors
];

/**
 * 用户ID验证规则
 */
const validateUserId = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  handleValidationErrors
];

/**
 * 分页参数验证规则
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

/**
 * 日期范围验证规则
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format (ISO 8601 required)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format (ISO 8601 required)'),
  handleValidationErrors
];

/**
 * 搜索查询验证规则
 */
const validateSearchQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  handleValidationErrors
];

/**
 * 测试类型验证规则
 */
const validateTestType = [
  query('type')
    .optional()
    .isIn(['performance', 'security', 'seo', 'accessibility'])
    .withMessage('Invalid test type'),
  handleValidationErrors
];

/**
 * 通用ID参数验证
 */
const validateId = (paramName = 'id') => [
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} must be a positive integer`),
  handleValidationErrors
];

/**
 * 邮箱验证规则
 */
const validateEmail = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  handleValidationErrors
];

/**
 * 组合验证器 - 用于测试端点
 */
const validateTestEndpoint = [
  ...validateUrl,
  ...validateTimeRange,
  ...validateTestType
];

module.exports = {
  handleValidationErrors,
  validateTimeRange,
  validateDomain,
  validateUrl,
  validateTestId,
  validateUserId,
  validatePagination,
  validateDateRange,
  validateSearchQuery,
  validateTestType,
  validateId,
  validateEmail,
  validateTestEndpoint
};

