/**
 * JSON Schema验证器
 * 本地化程度：100%
 * 提供完整的JSON Schema验证功能
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class JSONSchemaValidator {
  constructor(options = {}) {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      ...options
    });
    
    // 添加格式支持
    addFormats(this.ajv);
    
    // 添加自定义关键字
    this.addCustomKeywords();
    
    // 缓存编译的schema
    this.compiledSchemas = new Map();
  }

  /**
   * 验证数据
   */
  validate(data, schema, options = {}) {
    try {
      const schemaKey = this.getSchemaKey(schema);
      let validator = this.compiledSchemas.get(schemaKey);
      
      if (!validator) {
        validator = this.ajv.compile(schema);
        this.compiledSchemas.set(schemaKey, validator);
      }
      
      const isValid = validator(data);
      
      return {
        valid: isValid,
        errors: isValid ? [] : this.formatErrors(validator.errors),
        data: data,
        schema: schema
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          type: 'schema_error',
          message: `Schema编译错误: ${error.message}`,
          path: '',
          value: null
        }],
        data: data,
        schema: schema
      };
    }
  }

  /**
   * 验证响应数据
   */
  validateResponse(response, expectedSchema) {
    const result = {
      valid: true,
      errors: [],
      details: {
        status: null,
        headers: null,
        body: null
      }
    };
    
    // 验证状态码
    if (expectedSchema.status) {
      result.details.status = this.validateStatus(response.status, expectedSchema.status);
      if (!result.details.status.valid) {
        result.valid = false;
        result.errors.push(...result.details.status.errors);
      }
    }
    
    // 验证响应头
    if (expectedSchema.headers) {
      result.details.headers = this.validateHeaders(response.headers, expectedSchema.headers);
      if (!result.details.headers.valid) {
        result.valid = false;
        result.errors.push(...result.details.headers.errors);
      }
    }
    
    // 验证响应体
    if (expectedSchema.body) {
      result.details.body = this.validate(response.data, expectedSchema.body);
      if (!result.details.body.valid) {
        result.valid = false;
        result.errors.push(...result.details.body.errors);
      }
    }
    
    return result;
  }

  /**
   * 验证状态码
   */
  validateStatus(actualStatus, expectedStatus) {
    const errors = [];
    let valid = true;
    
    if (typeof expectedStatus === 'number') {
      if (actualStatus !== expectedStatus) {
        valid = false;
        errors.push({
          type: 'status_mismatch',
          message: `期望状态码 ${expectedStatus}，实际收到 ${actualStatus}`,
          path: 'status',
          expected: expectedStatus,
          actual: actualStatus
        });
      }
    } else if (Array.isArray(expectedStatus)) {
      if (!expectedStatus.includes(actualStatus)) {
        valid = false;
        errors.push({
          type: 'status_not_in_list',
          message: `状态码 ${actualStatus} 不在期望列表 [${expectedStatus.join(', ')}] 中`,
          path: 'status',
          expected: expectedStatus,
          actual: actualStatus
        });
      }
    } else if (typeof expectedStatus === 'object') {
      // 支持范围验证
      if (expectedStatus.min !== undefined && actualStatus < expectedStatus.min) {
        valid = false;
        errors.push({
          type: 'status_below_min',
          message: `状态码 ${actualStatus} 小于最小值 ${expectedStatus.min}`,
          path: 'status',
          expected: `>= ${expectedStatus.min}`,
          actual: actualStatus
        });
      }
      
      if (expectedStatus.max !== undefined && actualStatus > expectedStatus.max) {
        valid = false;
        errors.push({
          type: 'status_above_max',
          message: `状态码 ${actualStatus} 大于最大值 ${expectedStatus.max}`,
          path: 'status',
          expected: `<= ${expectedStatus.max}`,
          actual: actualStatus
        });
      }
    }
    
    return { valid, errors };
  }

  /**
   * 验证响应头
   */
  validateHeaders(actualHeaders, expectedHeaders) {
    const errors = [];
    let valid = true;
    
    // 转换为小写以便比较
    const normalizedActual = this.normalizeHeaders(actualHeaders);
    
    for (const [headerName, expectedValue] of Object.entries(expectedHeaders)) {
      const normalizedName = headerName.toLowerCase();
      const actualValue = normalizedActual[normalizedName];
      
      if (actualValue === undefined) {
        valid = false;
        errors.push({
          type: 'missing_header',
          message: `缺少响应头: ${headerName}`,
          path: `headers.${headerName}`,
          expected: expectedValue,
          actual: undefined
        });
        continue;
      }
      
      // 验证头部值
      if (typeof expectedValue === 'string') {
        if (actualValue !== expectedValue) {
          valid = false;
          errors.push({
            type: 'header_value_mismatch',
            message: `响应头 ${headerName} 值不匹配`,
            path: `headers.${headerName}`,
            expected: expectedValue,
            actual: actualValue
          });
        }
      } else if (expectedValue instanceof RegExp) {
        if (!expectedValue.test(actualValue)) {
          valid = false;
          errors.push({
            type: 'header_pattern_mismatch',
            message: `响应头 ${headerName} 不匹配模式 ${expectedValue}`,
            path: `headers.${headerName}`,
            expected: expectedValue.toString(),
            actual: actualValue
          });
        }
      } else if (typeof expectedValue === 'object' && expectedValue.schema) {
        // 使用schema验证头部值
        const headerValidation = this.validate(actualValue, expectedValue.schema);
        if (!headerValidation.valid) {
          valid = false;
          errors.push(...headerValidation.errors.map(error => ({
            ...error,
            path: `headers.${headerName}.${error.path}`
          })));
        }
      }
    }
    
    return { valid, errors };
  }

  /**
   * 标准化响应头
   */
  normalizeHeaders(headers) {
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  /**
   * 格式化错误信息
   */
  formatErrors(ajvErrors) {
    return ajvErrors.map(error => ({
      type: 'validation_error',
      message: this.getErrorMessage(error),
      path: error.instancePath || error.dataPath || '',
      value: error.data,
      expected: error.schema,
      keyword: error.keyword,
      params: error.params
    }));
  }

  /**
   * 获取错误消息
   */
  getErrorMessage(error) {
    const path = error.instancePath || error.dataPath || '根';
    
    switch (error.keyword) {
      case 'required':
        return `${path} 缺少必需属性: ${error.params.missingProperty}`;
      case 'type':
        return `${path} 类型错误，期望 ${error.params.type}，实际 ${typeof error.data}`;
      case 'format':
        return `${path} 格式错误，期望 ${error.params.format} 格式`;
      case 'minimum':
        return `${path} 值 ${error.data} 小于最小值 ${error.params.limit}`;
      case 'maximum':
        return `${path} 值 ${error.data} 大于最大值 ${error.params.limit}`;
      case 'minLength':
        return `${path} 长度 ${error.data?.length || 0} 小于最小长度 ${error.params.limit}`;
      case 'maxLength':
        return `${path} 长度 ${error.data?.length || 0} 大于最大长度 ${error.params.limit}`;
      case 'pattern':
        return `${path} 不匹配模式 ${error.params.pattern}`;
      case 'enum':
        return `${path} 值 ${error.data} 不在允许的枚举值中: [${error.params.allowedValues.join(', ')}]`;
      case 'additionalProperties':
        return `${path} 包含不允许的额外属性: ${error.params.additionalProperty}`;
      default:
        return error.message || `${path} 验证失败`;
    }
  }

  /**
   * 生成Schema键
   */
  getSchemaKey(schema) {
    return JSON.stringify(schema);
  }

  /**
   * 添加自定义关键字
   */
  addCustomKeywords() {
    // 添加响应时间验证
    this.ajv.addKeyword({
      keyword: 'responseTime',
      type: 'number',
      schemaType: 'object',
      compile: (schemaVal) => {
        return function validate(data) {
          if (schemaVal.max !== undefined && data > schemaVal.max) {
            validate.errors = [{
              instancePath: '',
              schemaPath: '#/responseTime',
              keyword: 'responseTime',
              params: { limit: schemaVal.max },
              message: `响应时间 ${data}ms 超过最大值 ${schemaVal.max}ms`
            }];
            return false;
          }
          
          if (schemaVal.min !== undefined && data < schemaVal.min) {
            validate.errors = [{
              instancePath: '',
              schemaPath: '#/responseTime',
              keyword: 'responseTime',
              params: { limit: schemaVal.min },
              message: `响应时间 ${data}ms 低于最小值 ${schemaVal.min}ms`
            }];
            return false;
          }
          
          return true;
        };
      }
    });
    
    // 添加状态码验证
    this.ajv.addKeyword({
      keyword: 'statusCode',
      type: 'number',
      schemaType: ['number', 'array', 'object'],
      compile: (schemaVal) => {
        return function validate(data) {
          if (typeof schemaVal === 'number') {
            if (data !== schemaVal) {
              validate.errors = [{
                instancePath: '',
                schemaPath: '#/statusCode',
                keyword: 'statusCode',
                params: { expected: schemaVal },
                message: `期望状态码 ${schemaVal}，实际 ${data}`
              }];
              return false;
            }
          } else if (Array.isArray(schemaVal)) {
            if (!schemaVal.includes(data)) {
              validate.errors = [{
                instancePath: '',
                schemaPath: '#/statusCode',
                keyword: 'statusCode',
                params: { allowedValues: schemaVal },
                message: `状态码 ${data} 不在允许列表中`
              }];
              return false;
            }
          }
          
          return true;
        };
      }
    });
  }

  /**
   * 生成基础Schema模板
   */
  generateBaseSchema(type = 'object') {
    const schemas = {
      object: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false
      },
      array: {
        type: 'array',
        items: {},
        minItems: 0
      },
      string: {
        type: 'string',
        minLength: 0
      },
      number: {
        type: 'number'
      },
      boolean: {
        type: 'boolean'
      }
    };
    
    return schemas[type] || schemas.object;
  }

  /**
   * 从示例数据生成Schema
   */
  generateSchemaFromExample(example) {
    if (example === null) {
      return { type: 'null' };
    }
    
    if (Array.isArray(example)) {
      return {
        type: 'array',
        items: example.length > 0 ? this.generateSchemaFromExample(example[0]) : {}
      };
    }
    
    if (typeof example === 'object') {
      const properties = {};
      const required = [];
      
      for (const [key, value] of Object.entries(example)) {
        properties[key] = this.generateSchemaFromExample(value);
        required.push(key);
      }
      
      return {
        type: 'object',
        properties,
        required,
        additionalProperties: false
      };
    }
    
    return { type: typeof example };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.compiledSchemas.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.compiledSchemas.size,
      schemas: Array.from(this.compiledSchemas.keys()).map(key => 
        key.substring(0, 100) + (key.length > 100 ? '...' : '')
      )
    };
  }
}

module.exports = JSONSchemaValidator;
