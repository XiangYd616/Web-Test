import { useState } from 'react';
/**
 * 字段命名转换工具
 * 统一前后端字段命名的转换逻辑
 */

/**
 * 字段映射配置
 */
const FIELD_MAPPINGS = {
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
export const camelToSnakeCase = (str: string): string => {
  // 优先使用映射表
  if (FIELD_MAPPINGS[str as keyof typeof FIELD_MAPPINGS]) {
    return FIELD_MAPPINGS[str as keyof typeof FIELD_MAPPINGS];
  }

  // 通用转换规则
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * 下划线命名转驼峰命名
 */
export const snakeToCamelCase = (str: string): string => {
  // 查找反向映射
  const reverseMapping = Object.entries(FIELD_MAPPINGS).find(([, value]) => value === str);
  if (reverseMapping) {
    return reverseMapping[0];
  }

  // 通用转换规则
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

/**
 * 将数据库记录转换为前端格式
 */
export const mapDatabaseToFrontend = <T = any>(dbRecord: any): T => {
  if (!dbRecord || typeof dbRecord !== 'object') {
    return dbRecord;
  }

  if (Array.isArray(dbRecord)) {
    return dbRecord.map(item => mapDatabaseToFrontend(item)) as T;
  }

  const result: any = {};

  for (const [key, value] of Object.entries(dbRecord)) {
    const camelKey = snakeToCamelCase(key);

    // 处理嵌套对象
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[camelKey] = mapDatabaseToFrontend(value);
    } else if (Array.isArray(value)) {
      result[camelKey] = value?.map(item =>
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

  return result as T;
};

/**
 * 将前端数据转换为数据库格式
 */
export const mapFrontendToDatabase = (frontendData: any): any => {
  if (!frontendData || typeof frontendData !== 'object') {
    return frontendData;
  }

  if (Array.isArray(frontendData)) {
    return frontendData.map(item => mapFrontendToDatabase(item));
  }

  const result: any = {};

  for (const [key, value] of Object.entries(frontendData)) {
    const snakeKey = camelToSnakeCase(key);

    // 处理嵌套对象
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[snakeKey] = mapFrontendToDatabase(value);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value?.map(item =>
        typeof item === 'object' ? mapFrontendToDatabase(item) : item
      );
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
};

/**
 * API响应数据转换
 */
export const _transformApiResponse = <T = any>(response: any): T => {
  if (response?.data) {
    return {
      ...response,
      data: mapDatabaseToFrontend<T>(response?.data),
    };
  }

  return mapDatabaseToFrontend<T>(response);
};

/**
 * API请求数据转换
 */
export const _transformApiRequest = (requestData: any): any => {
  return mapFrontendToDatabase(requestData);
};

/**
 * 批量字段转换
 */
export const _batchTransformFields = (
  data: unknown[],
  transformer: (item: any) => any
): unknown[] => {
  return data.map(transformer);
};

/**
 * 验证字段命名规范
 */
export const _validateFieldNaming = (
  obj: unknown,
  context: 'frontend' | 'database' = 'frontend'
): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!obj || typeof obj !== 'object') {
    return { valid: true, errors: [] };
  }

  const validateKey = (key: string, path: string = '') => {
    const [error, setError] = useState<string | null>(null);

    const fullPath = path ? `${path}.${key}` : key;

    if (context === 'frontend') {
      // 前端应该使用camelCase
      if (key.includes('_')) {
        errors.push(`字段 ${fullPath} 应该使用camelCase命名，而不是snake_case`);
      }
      if (key !== key.charAt(0).toLowerCase() + key.slice(1)) {
        errors.push(`字段 ${fullPath} 应该以小写字母开头`);
      }
    } else {
      // 数据库应该使用snake_case
      if (/[A-Z]/.test(key)) {
        errors.push(`字段 ${fullPath} 应该使用snake_case命名，而不是camelCase`);
      }
    }
  };

  const traverse = (current: unknown, currentPath: string = '') => {
    if (Array.isArray(current)) {
      current.forEach((item, index) => {
        if (typeof item === 'object') {
          traverse(item, `${currentPath}[${index}]`);
        }
      });
    } else if (current && typeof current === 'object') {
      Object.keys(current).forEach(key => {
        validateKey(key, currentPath);

        if (typeof (current as any)[key] === 'object') {
          traverse((current as any)[key], currentPath ? `${currentPath}.${key}` : key);
        }
      });
    }
  };

  traverse(obj);

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * 字段映射统计
 */
export const _getFieldMappingStats = () => {
  return {
    totalMappings: Object.keys(FIELD_MAPPINGS).length,
    mappings: FIELD_MAPPINGS,
    commonPatterns: {
      timeFields: Object.keys(FIELD_MAPPINGS).filter(key => key.endsWith('At')),
      idFields: Object.keys(FIELD_MAPPINGS).filter(key => key.endsWith('Id') || key === 'id'),
      userFields: Object.keys(FIELD_MAPPINGS).filter(key => key.startsWith('user')),
      testFields: Object.keys(FIELD_MAPPINGS).filter(key => key.startsWith('test')),
    },
  };
};

/**
 * 类型安全的字段转换
 */
export interface FieldTransformer<TInput, TOutput> {
  transform: (input: TInput) => TOutput;
  reverse: (output: TOutput) => TInput;
}

/**
 * 创建类型安全的字段转换器
 */
export const createFieldTransformer = <TInput, TOutput>(): FieldTransformer<TInput, TOutput> => {
  return {
    transform: (input: TInput) => mapDatabaseToFrontend<TOutput>(input),
    reverse: (output: TOutput) => mapFrontendToDatabase(output) as TInput,
  };
};

// 导出常用的转换器实例
export const _userTransformer = createFieldTransformer<any, any>();
export const _testTransformer = createFieldTransformer<any, any>();
export const _monitoringTransformer = createFieldTransformer<any, any>();
