/**
 * 字段命名转换中间件
 * 统一前后端字段命名的转换逻辑
 */

import type { NextFunction, Request, Response } from 'express';

/**
 * 字段映射配置
 */
const FIELD_MAPPINGS: Record<string, string> = {
  // 用户相关字段
  userName: 'user_name',
  userId: 'user_id',
  lastLoginAt: 'last_login_at',

  // 测试相关字段
  testId: 'test_id',
  testType: 'test_type',
  targetUrl: 'target_url',
  startedAt: 'started_at',
  completedAt: 'completed_at',
  cancelledAt: 'cancelled_at',
  errorMessage: 'error_message',

  // 时间字段
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // 监控相关字段
  targetId: 'target_id',
  responseTime: 'response_time',
  lastHeartbeat: 'last_heartbeat',
  activeTests: 'active_tests',
  totalTestsToday: 'total_tests_today',

  // 告警相关字段
  acknowledgedAt: 'acknowledged_at',
  acknowledgedBy: 'acknowledged_by',
  acknowledgmentMessage: 'acknowledgment_message',
  resolvedAt: 'resolved_at',
  resolvedBy: 'resolved_by',

  // 权限相关字段
  roleId: 'role_id',
  permissionId: 'permission_id',

  // 其他常用字段
  parentId: 'parent_id',
  filePath: 'file_path',
  profileData: 'profile_data',
};

/**
 * 驼峰命名转下划线命名
 */
const camelToSnakeCase = (str: string): string => {
  // 优先使用映射表
  if (FIELD_MAPPINGS[str]) {
    return FIELD_MAPPINGS[str];
  }

  // 通用转换规则
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * 下划线命名转驼峰命名
 */
const snakeToCamelCase = (str: string): string => {
  // 查找反向映射
  const reverseMapping = Object.entries(FIELD_MAPPINGS).find(([, value]) => value === str);
  if (reverseMapping) {
    return reverseMapping[0];
  }

  // 通用转换规则
  return str.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
};

/**
 * 将数据库记录转换为前端格式
 */
const mapDatabaseToFrontend = (dbRecord: unknown): unknown => {
  if (!dbRecord || typeof dbRecord !== 'object') {
    return dbRecord;
  }

  if (Array.isArray(dbRecord)) {
    return dbRecord.map(item => mapDatabaseToFrontend(item));
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(dbRecord as Record<string, unknown>)) {
    const camelKey = snakeToCamelCase(key);

    // 处理嵌套对象
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[camelKey] = mapDatabaseToFrontend(value);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item =>
        typeof item === 'object' ? mapDatabaseToFrontend(item) : item
      );
    } else {
      // 特殊处理：确保ID字段为字符串
      if (key === 'id' || key.endsWith('_id')) {
        result[camelKey] = value?.toString();
      } else {
        result[camelKey] = value;
      }
    }
  }

  return result;
};

/**
 * 将前端数据转换为数据库格式
 */
const mapFrontendToDatabase = (frontendData: unknown): unknown => {
  if (!frontendData || typeof frontendData !== 'object') {
    return frontendData;
  }

  if (Array.isArray(frontendData)) {
    return frontendData.map(item => mapFrontendToDatabase(item));
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(frontendData as Record<string, unknown>)) {
    const snakeKey = camelToSnakeCase(key);

    // 处理嵌套对象
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[snakeKey] = mapFrontendToDatabase(value);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item =>
        typeof item === 'object' ? mapFrontendToDatabase(item) : item
      );
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
};

/**
 * 字段映射中间件 - 自动转换请求和响应数据
 */
function fieldMappingMiddleware(
  options: {
    request?: boolean;
    response?: boolean;
    excludePaths?: string[];
  } = {}
) {
  const { request = true, response = true, excludePaths = [] } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // 检查是否需要跳过此路径
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // 处理请求数据转换
    if (request && req.body) {
      req.body = mapFrontendToDatabase(req.body);
    }

    // 处理查询参数转换
    if (request && req.query) {
      req.query = mapFrontendToDatabase(req.query) as Record<string, string>;
    }

    // 处理响应数据转换
    if (response) {
      const originalJson = res.json;
      res.json = function (data: unknown) {
        const convertedData = mapDatabaseToFrontend(data);
        return originalJson.call(this, convertedData);
      };

      const originalSend = res.send;
      res.send = function (data: unknown) {
        if (typeof data === 'object') {
          const convertedData = mapDatabaseToFrontend(data);
          return originalSend.call(this, convertedData);
        }
        return originalSend.call(this, data);
      };
    }

    next();
  };
}

/**
 * 请求体字段映射中间件
 */
function requestBodyMapping() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
      req.body = mapFrontendToDatabase(req.body);
    }
    next();
  };
}

/**
 * 响应体字段映射中间件
 */
function responseBodyMapping() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    res.json = function (data: unknown) {
      const convertedData = mapDatabaseToFrontend(data);
      return originalJson.call(this, convertedData);
    };

    next();
  };
}

/**
 * 查询参数映射中间件
 */
function queryParamMapping() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.query) {
      req.query = mapFrontendToDatabase(req.query) as Record<string, string>;
    }
    next();
  };
}

/**
 * 批量字段映射中间件
 */
function batchFieldMapping(
  mappings: Array<{
    source: string;
    target: string;
    transform?: (value: unknown) => unknown;
  }>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
      const transformed = { ...req.body };

      mappings.forEach(({ source, target, transform }) => {
        if (source in transformed) {
          const value = transformed[source];
          transformed[target] = transform ? transform(value) : value;
          delete transformed[source];
        }
      });

      req.body = transformed;
    }

    next();
  };
}

/**
 * 条件字段映射中间件
 */
function conditionalFieldMapping(
  condition: (req: Request) => boolean,
  mappings: Record<string, string>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req) && req.body) {
      const transformed = { ...req.body };

      Object.entries(mappings).forEach(([source, target]) => {
        if (source in transformed) {
          transformed[target] = transformed[source];
          delete transformed[source];
        }
      });

      req.body = transformed;
    }

    next();
  };
}

/**
 * 深度字段映射中间件 - 支持嵌套对象路径
 */
function deepFieldMapping(mappings: Record<string, string>) {
  const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown) => {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  };

  const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key] as Record<string, unknown>;
      } else {
        return undefined;
      }
    }

    return current;
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
      const transformed = { ...req.body };

      Object.entries(mappings).forEach(([source, target]) => {
        const value = getNestedValue(transformed, source);
        if (value !== undefined) {
          // 删除源路径（简化处理，只处理顶级）
          const sourceKey = source.split('.')[0];
          if (sourceKey in transformed) {
            delete transformed[sourceKey];
          }
          setNestedValue(transformed, target, value);
        }
      });

      req.body = transformed;
    }

    next();
  };
}

export {
  batchFieldMapping,
  camelToSnakeCase,
  conditionalFieldMapping,
  deepFieldMapping,
  FIELD_MAPPINGS,
  fieldMappingMiddleware,
  mapDatabaseToFrontend,
  mapFrontendToDatabase,
  queryParamMapping,
  requestBodyMapping,
  responseBodyMapping,
  snakeToCamelCase,
};

module.exports = {
  FIELD_MAPPINGS,
  camelToSnakeCase,
  snakeToCamelCase,
  mapDatabaseToFrontend,
  mapFrontendToDatabase,
  fieldMappingMiddleware,
  requestBodyMapping,
  responseBodyMapping,
  queryParamMapping,
  batchFieldMapping,
  conditionalFieldMapping,
  deepFieldMapping,
};
