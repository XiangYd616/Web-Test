/**
 * 类型对齐工具
 * 确保后端数据类型与前端类型定义完全一致
 */

const Logger = require('../middleware/logger');

/**
 * 类型转换配置
 */
const TYPE_CONVERSIONS = {
  // ID字段转换 - 确保为字符串
  id: (value) => value ? String(value) : null,
  user_id: (value) => value ? String(value) : null,
  test_id: (value) => value ? String(value) : null,
  target_id: (value) => value ? String(value) : null,
  role_id: (value) => value ? String(value) : null,
  permission_id: (value) => value ? String(value) : null,
  parent_id: (value) => value ? String(value) : null,
  acknowledged_by: (value) => value ? String(value) : null,
  resolved_by: (value) => value ? String(value) : null,
  
  // 时间字段转换 - 确保为ISO字符串
  created_at: (value) => value ? new Date(value).toISOString() : null,
  updated_at: (value) => value ? new Date(value).toISOString() : null,
  started_at: (value) => value ? new Date(value).toISOString() : null,
  completed_at: (value) => value ? new Date(value).toISOString() : null,
  cancelled_at: (value) => value ? new Date(value).toISOString() : null,
  last_login_at: (value) => value ? new Date(value).toISOString() : null,
  acknowledged_at: (value) => value ? new Date(value).toISOString() : null,
  resolved_at: (value) => value ? new Date(value).toISOString() : null,
  checked_at: (value) => value ? new Date(value).toISOString() : null,
  last_heartbeat: (value) => value ? new Date(value).toISOString() : null,
  
  // 数字字段转换 - 确保为数字类型
  duration: (value) => value !== null && value !== undefined ? Number(value) : null,
  response_time: (value) => value !== null && value !== undefined ? Number(value) : null,
  active_tests: (value) => value !== null && value !== undefined ? Number(value) : 0,
  total_tests_today: (value) => value !== null && value !== undefined ? Number(value) : 0,
  
  // 布尔字段转换 - 确保为布尔类型
  enabled: (value) => Boolean(value),
  
  // JSON字段转换 - 确保为对象
  config: (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.warn('JSON解析失败:', { value, error: error.message });
        return null;
      }
    }
    return value;
  },
  results: (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.warn('JSON解析失败:', { value, error: error.message });
        return null;
      }
    }
    return value;
  },
  profile_data: (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.warn('JSON解析失败:', { value, error: error.message });
        return null;
      }
    }
    return value;
  },
  conditions: (value) => {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.warn('JSON解析失败:', { value, error: error.message });
        return {};
      }
    }
    return value;
  },
  actions: (value) => {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.warn('JSON解析失败:', { value, error: error.message });
        return {};
      }
    }
    return value;
  }
};

/**
 * 应用类型转换到单个记录
 */
const applyTypeConversions = (record) => {
  if (!record || typeof record !== 'object') {
    return record;
  }
  
  const converted = { ...record };
  
  for (const [field, value] of Object.entries(record)) {
    if (TYPE_CONVERSIONS[field]) {
      try {
        converted[field] = TYPE_CONVERSIONS[field](value);
      } catch (error) {
        Logger.warn(`类型转换失败: ${field}`, { value, error: error.message });
        converted[field] = value; // 保持原值
      }
    }
  }
  
  return converted;
};

/**
 * 批量应用类型转换
 */
const applyTypeConversionsToArray = (records) => {
  if (!Array.isArray(records)) {
    return records;
  }
  
  return records.map(record => applyTypeConversions(record));
};

/**
 * 验证数据类型一致性
 */
const validateTypeConsistency = (data, expectedTypes = {}) => {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: true, errors: [] };
  }
  
  // 默认的类型期望
  const defaultExpectedTypes = {
    id: 'string',
    user_id: 'string',
    test_id: 'string',
    target_id: 'string',
    created_at: 'string',
    updated_at: 'string',
    started_at: 'string',
    completed_at: 'string',
    duration: 'number',
    response_time: 'number',
    active_tests: 'number',
    total_tests_today: 'number',
    enabled: 'boolean',
    config: 'object',
    results: 'object',
    profile_data: 'object'
  };
  
  const types = { ...defaultExpectedTypes, ...expectedTypes };
  
  for (const [field, expectedType] of Object.entries(types)) {
    if (data.hasOwnProperty(field)) {
      const value = data[field];
      const actualType = value === null ? 'null' : typeof value;
      
      if (value !== null && value !== undefined && actualType !== expectedType) {
        errors.push({
          field,
          expectedType,
          actualType,
          value
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * 数据库查询结果类型对齐
 */
const alignDatabaseResult = (result) => {
  if (!result) return result;
  
  // PostgreSQL查询结果
  if (result.rows) {
    return {
      ...result,
      rows: applyTypeConversionsToArray(result.rows)
    };
  }
  
  // 单个记录
  if (typeof result === 'object' && !Array.isArray(result)) {
    return applyTypeConversions(result);
  }
  
  // 记录数组
  if (Array.isArray(result)) {
    return applyTypeConversionsToArray(result);
  }
  
  return result;
};

/**
 * API响应数据类型对齐
 */
const alignApiResponse = (data) => {
  if (!data) return data;
  
  // 分页响应
  if (data.data && data.data.items && Array.isArray(data.data.items)) {
    return {
      ...data,
      data: {
        ...data.data,
        items: applyTypeConversionsToArray(data.data.items),
        pagination: {
          ...data.data.pagination,
          page: Number(data.data.pagination.page),
          limit: Number(data.data.pagination.limit),
          total: Number(data.data.pagination.total),
          pages: Number(data.data.pagination.pages)
        }
      }
    };
  }
  
  // 单个数据响应
  if (data.data) {
    return {
      ...data,
      data: Array.isArray(data.data) 
        ? applyTypeConversionsToArray(data.data)
        : applyTypeConversions(data.data)
    };
  }
  
  // 直接数据
  return Array.isArray(data) 
    ? applyTypeConversionsToArray(data)
    : applyTypeConversions(data);
};

/**
 * 创建类型安全的数据库查询包装器
 */
const createTypeSafeQuery = (pool) => {
  return {
    async query(text, params = []) {
      try {
        const result = await pool.query(text, params);
        return alignDatabaseResult(result);
      } catch (error) {
        Logger.error('数据库查询失败:', { text, params, error: error.message });
        throw error;
      }
    },
    
    async findById(table, id, fields = '*') {
      const query = `SELECT ${fields} FROM ${table} WHERE id = $1`;
      const result = await this.query(query, [id]);
      return result.rows[0] || null;
    },
    
    async findMany(table, conditions = {}, options = {}) {
      const { limit = 20, offset = 0, orderBy = 'created_at DESC' } = options;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      for (const [field, value] of Object.entries(conditions)) {
        whereClause += ` AND ${field} = $${params.length + 1}`;
        params.push(value);
      }
      
      const query = `
        SELECT * FROM ${table} 
        ${whereClause} 
        ORDER BY ${orderBy} 
        LIMIT $${params.length + 1} 
        OFFSET $${params.length + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await this.query(query, params);
      return result.rows;
    },
    
    async create(table, data) {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${table} (${fields.join(', ')}) 
        VALUES (${placeholders}) 
        RETURNING *
      `;
      
      const result = await this.query(query, values);
      return result.rows[0];
    },
    
    async update(table, id, data) {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      
      const query = `
        UPDATE ${table} 
        SET ${setClause}, updated_at = NOW() 
        WHERE id = $1 
        RETURNING *
      `;
      
      const result = await this.query(query, [id, ...values]);
      return result.rows[0];
    },
    
    async delete(table, id) {
      const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
      const result = await this.query(query, [id]);
      return result.rows[0];
    }
  };
};

/**
 * 类型对齐中间件
 */
const typeAlignmentMiddleware = (req, res, next) => {
  // 重写res.json方法以应用类型对齐
  const originalJson = res.json;
  
  res.json = function(data) {
    try {
      const alignedData = alignApiResponse(data);
      return originalJson.call(this, alignedData);
    } catch (error) {
      Logger.error('响应类型对齐失败:', error);
      return originalJson.call(this, data);
    }
  };
  
  next();
};

/**
 * 验证请求数据类型
 */
const validateRequestTypes = (expectedTypes) => {
  return (req, res, next) => {
    try {
      const validation = validateTypeConsistency(req.body, expectedTypes);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: '请求数据类型不正确',
          errors: validation.errors,
          timestamp: new Date().toISOString()
        });
      }
      
      next();
    } catch (error) {
      Logger.error('请求类型验证失败:', error);
      res.status(500).json({
        success: false,
        message: '请求验证失败',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * 生成类型对齐报告
 */
const generateTypeAlignmentReport = (data) => {
  const report = {
    timestamp: new Date().toISOString(),
    totalRecords: Array.isArray(data) ? data.length : 1,
    typeConversions: {},
    validationErrors: []
  };
  
  const records = Array.isArray(data) ? data : [data];
  
  for (const record of records) {
    if (record && typeof record === 'object') {
      for (const [field, value] of Object.entries(record)) {
        if (TYPE_CONVERSIONS[field]) {
          const originalType = value === null ? 'null' : typeof value;
          const convertedValue = TYPE_CONVERSIONS[field](value);
          const convertedType = convertedValue === null ? 'null' : typeof convertedValue;
          
          if (!report.typeConversions[field]) {
            report.typeConversions[field] = {
              originalType,
              convertedType,
              count: 0
            };
          }
          
          report.typeConversions[field].count++;
        }
      }
      
      const validation = validateTypeConsistency(record);
      if (!validation.valid) {
        report.validationErrors.push(...validation.errors);
      }
    }
  }
  
  return report;
};

module.exports = {
  // 核心转换函数
  applyTypeConversions,
  applyTypeConversionsToArray,
  alignDatabaseResult,
  alignApiResponse,
  
  // 验证函数
  validateTypeConsistency,
  
  // 数据库工具
  createTypeSafeQuery,
  
  // 中间件
  typeAlignmentMiddleware,
  validateRequestTypes,
  
  // 报告工具
  generateTypeAlignmentReport,
  
  // 配置
  TYPE_CONVERSIONS
};
