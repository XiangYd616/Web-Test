/**
 * 请求验证中间件
 * 提供统一的请求体和参数验证功能
 */

/**
 * 验证请求体是否存在且为有效的JSON对象
 * @param {Array<string>} requiredFields - 必填字段列表
 * @param {Object} options - 验证选项
 * @returns {Function} Express中间件函数
 */
const validateRequestBody = (requiredFields = [], options = {}) => {
  return (req, res, next) => {
    // 检查请求体是否存在
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.validationError([{
        field: 'body',
        message: '请求体不能为空且必须是JSON格式'
      }]);
    }

    // 验证必填字段
    const errors = [];
    
    requiredFields.forEach(field => {
      // 支持嵌套字段检查，如 'config.url'
      const fieldPath = field.split('.');
      let value = req.body;
      
      for (const key of fieldPath) {
        if (value === null || value === undefined || typeof value !== 'object') {
          value = undefined;
          break;
        }
        value = value[key];
      }
      
      // 检查字段是否存在且不为空
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: field,
          message: `缺少必填字段: ${field}`
        });
      }
    });

    // 如果启用了严格模式，检查未知字段
    if (options.strict && options.allowedFields) {
      const allowedSet = new Set([...requiredFields, ...options.allowedFields]);
      const bodyKeys = Object.keys(req.body);
      
      bodyKeys.forEach(key => {
        if (!allowedSet.has(key)) {
          errors.push({
            field: key,
            message: `不允许的字段: ${key}`
          });
        }
      });
    }

    if (errors.length > 0) {
      return res.validationError(errors);
    }

    next();
  };
};

/**
 * 验证URL格式
 * @param {string} fieldName - 要验证的字段名
 * @returns {Function} Express中间件函数
 */
const validateURL = (fieldName = 'url') => {
  return (req, res, next) => {
    const urlValue = req.body[fieldName];
    
    if (!urlValue) {
      return res.validationError([{
        field: fieldName,
        message: `${fieldName} 不能为空`
      }]);
    }

    try {
      const url = new URL(urlValue);
      
      // 只允许 http 和 https 协议
      if (!['http:', 'https:'].includes(url.protocol)) {
        return res.validationError([{
          field: fieldName,
          message: `${fieldName} 必须使用 http 或 https 协议`
        }]);
      }
      
      // 将验证后的URL存储到req对象中
      req.validatedURL = req.validatedURL || {};
      req.validatedURL[fieldName] = url;
      
      next();
    } catch (error) {
      return res.validationError([{
        field: fieldName,
        message: `${fieldName} 格式无效: ${error.message}`
      }]);
    }
  };
};

/**
 * 验证数字范围
 * @param {string} fieldName - 字段名
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {Function} Express中间件函数
 */
const validateNumberRange = (fieldName, min, max) => {
  return (req, res, next) => {
    const value = req.body[fieldName];
    
    if (value === undefined || value === null) {
      return next(); // 让 validateRequestBody 处理必填验证
    }

    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      return res.validationError([{
        field: fieldName,
        message: `${fieldName} 必须是数字`
      }]);
    }

    if (numValue < min || numValue > max) {
      return res.validationError([{
        field: fieldName,
        message: `${fieldName} 必须在 ${min} 到 ${max} 之间`
      }]);
    }

    next();
  };
};

/**
 * 验证枚举值
 * @param {string} fieldName - 字段名
 * @param {Array} allowedValues - 允许的值列表
 * @returns {Function} Express中间件函数
 */
const validateEnum = (fieldName, allowedValues) => {
  return (req, res, next) => {
    const value = req.body[fieldName];
    
    if (value === undefined || value === null) {
      return next(); // 让 validateRequestBody 处理必填验证
    }

    if (!allowedValues.includes(value)) {
      return res.validationError([{
        field: fieldName,
        message: `${fieldName} 必须是以下值之一: ${allowedValues.join(', ')}`
      }]);
    }

    next();
  };
};

/**
 * 验证数组
 * @param {string} fieldName - 字段名
 * @param {Object} options - 验证选项 { minLength, maxLength, itemType }
 * @returns {Function} Express中间件函数
 */
const validateArray = (fieldName, options = {}) => {
  return (req, res, next) => {
    const value = req.body[fieldName];
    
    if (value === undefined || value === null) {
      return next(); // 让 validateRequestBody 处理必填验证
    }

    if (!Array.isArray(value)) {
      return res.validationError([{
        field: fieldName,
        message: `${fieldName} 必须是数组`
      }]);
    }

    if (options.minLength !== undefined && value.length < options.minLength) {
      return res.validationError([{
        field: fieldName,
        message: `${fieldName} 至少需要 ${options.minLength} 个元素`
      }]);
    }

    if (options.maxLength !== undefined && value.length > options.maxLength) {
      return res.validationError([{
        field: fieldName,
        message: `${fieldName} 最多允许 ${options.maxLength} 个元素`
      }]);
    }

    if (options.itemType) {
      const invalidItems = value.filter(item => typeof item !== options.itemType);
      if (invalidItems.length > 0) {
        return res.validationError([{
          field: fieldName,
          message: `${fieldName} 的所有元素必须是 ${options.itemType} 类型`
        }]);
      }
    }

    next();
  };
};

/**
 * 自定义验证器
 * @param {Function} validator - 验证函数 (req) => { valid: boolean, errors: Array }
 * @returns {Function} Express中间件函数
 */
const customValidator = (validator) => {
  return (req, res, next) => {
    const result = validator(req);
    
    if (!result || !result.valid) {
      return res.validationError(result.errors || [{
        field: 'request',
        message: '请求验证失败'
      }]);
    }

    next();
  };
};

/**
 * 组合多个验证器
 * @param {...Function} validators - 验证器中间件列表
 * @returns {Function} Express中间件函数
 */
const combineValidators = (...validators) => {
  return (req, res, next) => {
    const runValidator = (index) => {
      if (index >= validators.length) {
        return next();
      }

      validators[index](req, res, (err) => {
        if (err) {
          return next(err);
        }
        runValidator(index + 1);
      });
    };

    runValidator(0);
  };
};

module.exports = {
  validateRequestBody,
  validateURL,
  validateNumberRange,
  validateEnum,
  validateArray,
  customValidator,
  combineValidators
};

