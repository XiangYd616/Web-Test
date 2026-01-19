/**
 * 类型对齐工具
 * 确保后端数据类型与前端类型定义完全一致
 */

const Logger = require('../middleware/logger');

type ConversionMap = Record<string, (value: unknown) => unknown>;

type TypeConsistencyError = {
  field: string;
  expectedType: string;
  actualType: string;
  value: unknown;
};

type TypeConsistencyResult = {
  valid: boolean;
  errors: TypeConsistencyError[];
};

type QueryPool = {
  query: (
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: Record<string, unknown>[] } & Record<string, unknown>>;
};

/**
 * 类型转换配置
 */
const TYPE_CONVERSIONS: ConversionMap = {
  // ID字段转换 - 确保为字符串
  id: value => (value ? String(value) : null),
  user_id: value => (value ? String(value) : null),
  test_id: value => (value ? String(value) : null),
  target_id: value => (value ? String(value) : null),
  role_id: value => (value ? String(value) : null),
  permission_id: value => (value ? String(value) : null),
  parent_id: value => (value ? String(value) : null),
  acknowledged_by: value => (value ? String(value) : null),
  resolved_by: value => (value ? String(value) : null),

  // 时间字段转换 - 确保为ISO字符串
  created_at: value => (value ? new Date(value as string | number | Date).toISOString() : null),
  updated_at: value => (value ? new Date(value as string | number | Date).toISOString() : null),
  started_at: value => (value ? new Date(value as string | number | Date).toISOString() : null),
  completed_at: value => (value ? new Date(value as string | number | Date).toISOString() : null),
  cancelled_at: value => (value ? new Date(value as string | number | Date).toISOString() : null),
  last_login_at: value => (value ? new Date(value as string | number | Date).toISOString() : null),
  acknowledged_at: value =>
    value ? new Date(value as string | number | Date).toISOString() : null,
  resolved_at: value => (value ? new Date(value as string | number | Date).toISOString() : null),
  checked_at: value => (value ? new Date(value as string | number | Date).toISOString() : null),
  last_heartbeat: value => (value ? new Date(value as string | number | Date).toISOString() : null),

  // 数字字段转换 - 确保为数字类型
  duration: value => (value !== null && value !== undefined ? Number(value) : null),
  response_time: value => (value !== null && value !== undefined ? Number(value) : null),
  active_tests: value => (value !== null && value !== undefined ? Number(value) : 0),
  total_tests_today: value => (value !== null && value !== undefined ? Number(value) : 0),

  // 布尔字段转换 - 确保为布尔类型
  enabled: value => Boolean(value),

  // JSON字段转换 - 确保为对象
  config: value => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.warn('JSON解析失败:', { value, error: (error as Error).message });
        return null;
      }
    }
    return value;
  },
  results: value => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.warn('JSON解析失败:', { value, error: (error as Error).message });
        return null;
      }
    }
    return value;
  },
  profile_data: value => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.warn('JSON解析失败:', { value, error: (error as Error).message });
        return null;
      }
    }
    return value;
  },
  conditions: value => {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.warn('JSON解析失败:', { value, error: (error as Error).message });
        return {};
      }
    }
    return value;
  },
  actions: value => {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.warn('JSON解析失败:', { value, error: (error as Error).message });
        return {};
      }
    }
    return value;
  },
};

/**
 * 应用类型转换到单个记录
 */
const applyTypeConversions = (record: Record<string, unknown>) => {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const converted: Record<string, unknown> = { ...record };

  for (const [field, value] of Object.entries(record)) {
    if (TYPE_CONVERSIONS[field]) {
      try {
        converted[field] = TYPE_CONVERSIONS[field](value);
      } catch (error) {
        Logger.warn(`类型转换失败: ${field}`, { value, error: (error as Error).message });
        converted[field] = value;
      }
    }
  }

  return converted;
};

/**
 * 批量应用类型转换
 */
const applyTypeConversionsToArray = (records: Record<string, unknown>[]) => {
  if (!Array.isArray(records)) {
    return records;
  }

  return records.map(record => applyTypeConversions(record));
};

/**
 * 验证数据类型一致性
 */
const validateTypeConsistency = (
  data: Record<string, unknown>,
  expectedTypes: Record<string, string> = {}
): TypeConsistencyResult => {
  const errors: TypeConsistencyError[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: true, errors: [] };
  }

  const defaultExpectedTypes: Record<string, string> = {
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
    profile_data: 'object',
  };

  const types = { ...defaultExpectedTypes, ...expectedTypes };

  for (const [field, expectedType] of Object.entries(types)) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      const value = data[field];
      const actualType = value === null ? 'null' : typeof value;

      if (value !== null && value !== undefined && actualType !== expectedType) {
        errors.push({
          field,
          expectedType,
          actualType,
          value,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * 数据库查询结果类型对齐
 */
const alignDatabaseResult = (
  result:
    | { rows?: Record<string, unknown>[] }
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null
) => {
  if (!result) return result;

  if ('rows' in result && Array.isArray(result.rows)) {
    return {
      ...(result as Record<string, unknown>),
      rows: applyTypeConversionsToArray(result.rows),
    };
  }

  if (typeof result === 'object' && !Array.isArray(result)) {
    return applyTypeConversions(result as Record<string, unknown>);
  }

  if (Array.isArray(result)) {
    return applyTypeConversionsToArray(result);
  }

  return result;
};

/**
 * API响应数据类型对齐
 */
const alignApiResponse = (data: Record<string, unknown> | Record<string, unknown>[]) => {
  if (!data) return data;

  if (
    typeof data === 'object' &&
    !Array.isArray(data) &&
    data.data &&
    (data.data as Record<string, unknown>).items &&
    Array.isArray((data.data as Record<string, unknown>).items)
  ) {
    const dataBlock = data.data as {
      items: Record<string, unknown>[];
      pagination?: Record<string, unknown>;
    };
    const pagination = dataBlock.pagination || {};
    return {
      ...data,
      data: {
        ...dataBlock,
        items: applyTypeConversionsToArray(dataBlock.items),
        pagination: {
          ...pagination,
          page: Number(pagination.page),
          limit: Number(pagination.limit),
          total: Number(pagination.total),
          pages: Number(pagination.pages),
        },
      },
    };
  }

  if (typeof data === 'object' && !Array.isArray(data) && data.data) {
    const inner = data.data as Record<string, unknown> | Record<string, unknown>[];
    return {
      ...data,
      data: Array.isArray(inner) ? applyTypeConversionsToArray(inner) : applyTypeConversions(inner),
    };
  }

  return Array.isArray(data) ? applyTypeConversionsToArray(data) : applyTypeConversions(data);
};

/**
 * 创建类型安全的数据库查询包装器
 */
const createTypeSafeQuery = (pool: QueryPool) => {
  return {
    async query(text: string, params: unknown[] = []) {
      try {
        const result = await pool.query(text, params);
        return alignDatabaseResult(result);
      } catch (error) {
        Logger.error('数据库查询失败:', { text, params, error: (error as Error).message });
        throw error;
      }
    },

    async findById(table: string, id: string, fields = '*') {
      const query = `SELECT ${fields} FROM ${table} WHERE id = $1`;
      const result = await this.query(query, [id]);
      return (result as { rows: Record<string, unknown>[] }).rows[0] || null;
    },

    async findMany(
      table: string,
      conditions: Record<string, unknown> = {},
      options: { limit?: number; offset?: number; orderBy?: string } = {}
    ) {
      const { limit = 20, offset = 0, orderBy = 'created_at DESC' } = options;

      let whereClause = 'WHERE 1=1';
      const params: unknown[] = [];

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
      return (result as { rows: Record<string, unknown>[] }).rows;
    },

    async create(table: string, data: Record<string, unknown>) {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const query = `
        INSERT INTO ${table} (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await this.query(query, values);
      return (result as { rows: Record<string, unknown>[] }).rows[0];
    },

    async update(table: string, id: string, data: Record<string, unknown>) {
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
      return (result as { rows: Record<string, unknown>[] }).rows[0];
    },

    async delete(table: string, id: string) {
      const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
      const result = await this.query(query, [id]);
      return (result as { rows: Record<string, unknown>[] }).rows[0];
    },
  };
};

/**
 * 类型对齐中间件
 */
const typeAlignmentMiddleware = (
  req: Record<string, unknown>,
  res: { json: (data: unknown) => unknown },
  next: () => void
) => {
  const originalJson = res.json;

  res.json = function (data: unknown) {
    try {
      const alignedData = alignApiResponse(data as Record<string, unknown>);
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
const validateRequestTypes = (expectedTypes: Record<string, string>) => {
  return (
    req: { body: Record<string, unknown> },
    res: { status: (code: number) => { json: (data: unknown) => unknown } },
    next: () => void
  ) => {
    try {
      const validation = validateTypeConsistency(req.body, expectedTypes);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: '请求数据类型不正确',
          errors: validation.errors,
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      Logger.error('请求类型验证失败:', error);
      res.status(500).json({
        success: false,
        message: '请求验证失败',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  };
};

/**
 * 生成类型对齐报告
 */
const generateTypeAlignmentReport = (data: Record<string, unknown> | Record<string, unknown>[]) => {
  const report: {
    timestamp: string;
    totalRecords: number;
    typeConversions: Record<string, { originalType: string; convertedType: string; count: number }>;
    validationErrors: TypeConsistencyError[];
  } = {
    timestamp: new Date().toISOString(),
    totalRecords: Array.isArray(data) ? data.length : 1,
    typeConversions: {},
    validationErrors: [],
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
              count: 0,
            };
          }

          report.typeConversions[field].count++;
        }
      }

      const validation = validateTypeConsistency(record as Record<string, unknown>);
      if (!validation.valid) {
        report.validationErrors.push(...validation.errors);
      }
    }
  }

  return report;
};

export {
  TYPE_CONVERSIONS,
  alignApiResponse,
  alignDatabaseResult,
  applyTypeConversions,
  applyTypeConversionsToArray,
  createTypeSafeQuery,
  generateTypeAlignmentReport,
  typeAlignmentMiddleware,
  validateRequestTypes,
  validateTypeConsistency,
};

module.exports = {
  applyTypeConversions,
  applyTypeConversionsToArray,
  alignDatabaseResult,
  alignApiResponse,
  validateTypeConsistency,
  createTypeSafeQuery,
  typeAlignmentMiddleware,
  validateRequestTypes,
  generateTypeAlignmentReport,
  TYPE_CONVERSIONS,
};
