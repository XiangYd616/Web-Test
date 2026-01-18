/**
 * 🔍 统一测试引擎验证中间件
 * 基于Joi的最佳实践，为测试配置提供严格的验证
 */

const Joi = require('joi');

// 测试类型枚举
const TEST_TYPES = [
  'performance',
  'security',
  'api',
  'stress',
  'seo',
  'website',
  'accessibility'
];

/**
 * 验证测试类型
 */
const validateTestType = (req, res, next) => {
  const schema = Joi.string().valid(...TEST_TYPES);
  const { error } = schema.validate(req.query.testType);

  if (error) {
    return res.status(400).json({
      success: false,
      error: `无效的测试类型。支持的类型: ${TEST_TYPES.join(', ')}`
    });
  }

  next();
};

/**
 * 验证分页参数
 */
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  // 验证页码
  if (page !== undefined) {

    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: '页码必须是大于0的整数'
      });
    }
    req.query.page = pageNum;
  }

  // 验证每页数量
  if (limit !== undefined) {

    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: '每页数量必须是1-100之间的整数'
      });
    }
    req.query.limit = limitNum;
  }

  next();
};

/**
 * 验证排序参数
 */
const validateSorting = (req, res, next) => {
  const { sortBy, sortOrder } = req.query;

  const validSortFields = [
    'created_at',
    'updated_at',
    'start_time',
    'end_time',
    'duration',
    'overall_score',
    'test_name'
  ];

  const validSortOrders = ['ASC', 'DESC', 'asc', 'desc'];

  if (sortBy && !validSortFields.includes(sortBy)) {
    return res.status(400).json({
      success: false,
      error: `无效的排序字段。支持的字段: ${validSortFields.join(', ')}`
    });
  }

  if (sortOrder && !validSortOrders.includes(sortOrder)) {
    return res.status(400).json({
      success: false,
      error: `无效的排序方向。支持: ASC, DESC`
    });
  }

  next();
};

/**
 * 验证UUID格式
 */
const validateUUID = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(value)) {
      return res.status(400).json({
        success: false,
        error: `无效的${paramName}格式`
      });
    }

    next();
  };
};

/**
 * 验证日期范围
 */
const validateDateRange = (req, res, next) => {
  const { dateFrom, dateTo } = req.query;

  if (dateFrom) {

    const fromDate = new Date(dateFrom);
    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: '开始日期格式无效'
      });
    }
    req.query.dateFrom = fromDate;
  }

  if (dateTo) {

    const toDate = new Date(dateTo);
    if (isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: '结束日期格式无效'
      });
    }
    req.query.dateTo = toDate;
  }

  // 验证日期范围逻辑
  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
    return res.status(400).json({
      success: false,
      error: '开始日期不能晚于结束日期'
    });
  }

  next();
};

/**
 * 验证搜索参数
 */
const validateSearch = (req, res, next) => {
  const { search } = req.query;

  if (search !== undefined) {

    // 清理搜索字符串
    const cleanSearch = search.trim();

    if (cleanSearch.length > 100) {
      return res.status(400).json({
        success: false,
        error: '搜索关键词不能超过100个字符'
      });
    }

    req.query.search = cleanSearch;
  }

  next();
};

/**
 * 验证状态参数
 */
const validateStatus = (req, res, next) => {
  const { status } = req.query;
  const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `无效的状态。支持的状态: ${validStatuses.join(', ')}`
    });
  }

  next();
};

/**
 * 验证时间范围参数
 */
const validateTimeRange = (req, res, next) => {
  const { timeRange } = req.query;

  if (timeRange !== undefined) {

    const timeRangeNum = parseInt(timeRange);
    if (isNaN(timeRangeNum) || timeRangeNum < 1 || timeRangeNum > 365) {
      return res.status(400).json({
        success: false,
        error: '时间范围必须是1-365之间的整数（天数）'
      });
    }
    req.query.timeRange = timeRangeNum;
  }

  next();
};

/**
 * 通用请求验证中间件
 * 使用Joi进行数据验证
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求数据验证失败',
          details: errors
        }
      });
    }

    // 将验证后的数据附加到请求对象
    req.validatedData = value;
    next();
  };
};

/**
 * 验证查询参数
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true // 查询参数允许未知字段
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '查询参数验证失败',
          details: errors
        }
      });
    }

    // 将验证后的查询参数合并到原查询对象
    Object.assign(req.query, value);
    next();
  };
};

/**
 * 验证路径参数
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '路径参数验证失败',
          details: errors
        }
      });
    }

    // 将验证后的参数合并到原参数对象
    Object.assign(req.params, value);
    next();
  };
};

/**
 * 组合验证中间件
 */
const validateTestHistoryQuery = [
  validateTestType,
  validatePagination,
  validateSorting,
  validateDateRange,
  validateSearch,
  validateStatus
];

module.exports = {
  validateTestType,
  validatePagination,
  validateSorting,
  validateUUID,
  validateDateRange,
  validateSearch,
  validateStatus,
  validateTimeRange,
  validateTestHistoryQuery,
  validateRequest,
  validateQuery,
  validateParams
};
