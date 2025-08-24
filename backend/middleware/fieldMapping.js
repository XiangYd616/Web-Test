/**
 * 字段命名转换中间件
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
  profileData: 'profile_data'
};

/**
 * 驼峰命名转下划线命名
 */
const camelToSnakeCase = (str) => {
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
const snakeToCamelCase = (str) => {
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
const mapDatabaseToFrontend = (dbRecord) => {
  if (!dbRecord || typeof dbRecord !== 'object') {
    return dbRecord;
  }
  
  if (Array.isArray(dbRecord)) {
    return dbRecord.map(item => mapDatabaseToFrontend(item));
  }
  
  const result = {};
  
  for (const [key, value] of Object.entries(dbRecord)) {
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
const mapFrontendToDatabase = (frontendData) => {
  if (!frontendData || typeof frontendData !== 'object') {
    return frontendData;
  }
  
  if (Array.isArray(frontendData)) {
    return frontendData.map(item => mapFrontendToDatabase(item));
  }
  
  const result = {};
  
  for (const [key, value] of Object.entries(frontendData)) {
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
 * 请求体字段转换中间件
 * 将前端的camelCase字段转换为数据库的snake_case
 */
const transformRequestFields = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = mapFrontendToDatabase(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      req.query = mapFrontendToDatabase(req.query);
    }
    
    next();
  } catch (error) {
    console.error('请求字段转换失败:', error);
    res.status(500).json({
      success: false,
      message: '请求数据格式错误',
      error: error.message
    });
  }
};

/**
 * 响应体字段转换中间件
 * 将数据库的snake_case字段转换为前端的camelCase
 */
const transformResponseFields = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    try {
      // 转换响应数据
      const transformedData = mapDatabaseToFrontend(data);
      return originalJson.call(this, transformedData);
    } catch (error) {
      console.error('响应字段转换失败:', error);
      return originalJson.call(this, data);
    }
  };
  
  next();
};

/**
 * 组合字段转换中间件
 */
const fieldMappingMiddleware = (options = {}) => {
  const {
    transformRequest = true,
    transformResponse = true,
    skipPaths = [],
    onlyPaths = []
  } = options;
  
  return (req, res, next) => {
    const path = req.path;
    
    // 检查是否跳过此路径
    if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
      return next();
    }
    
    // 检查是否只处理特定路径
    if (onlyPaths.length > 0 && !onlyPaths.some(onlyPath => path.startsWith(onlyPath))) {
      return next();
    }
    
    // 应用请求转换
    if (transformRequest) {
      transformRequestFields(req, res, () => {});
    }
    
    // 应用响应转换
    if (transformResponse) {
      transformResponseFields(req, res, () => {});
    }
    
    next();
  };
};

/**
 * 数据库查询结果转换工具
 */
const transformQueryResult = (result) => {
  if (!result) return result;
  
  if (result.rows) {
    // PostgreSQL查询结果
    return {
      ...result,
      rows: result.rows.map(row => mapDatabaseToFrontend(row))
    };
  }
  
  if (Array.isArray(result)) {
    return result.map(item => mapDatabaseToFrontend(item));
  }
  
  return mapDatabaseToFrontend(result);
};

/**
 * 数据库插入/更新数据转换工具
 */
const transformQueryData = (data) => {
  return mapFrontendToDatabase(data);
};

/**
 * 验证字段命名规范
 */
const validateFieldNaming = (obj, context = 'frontend') => {
  const errors = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: true, errors: [] };
  }
  
  const validateKey = (key, path = '') => {
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
  
  const traverse = (current, currentPath = '') => {
    if (Array.isArray(current)) {
      current.forEach((item, index) => {
        if (typeof item === 'object') {
          traverse(item, `${currentPath}[${index}]`);
        }
      });
    } else if (current && typeof current === 'object') {
      Object.keys(current).forEach(key => {
        validateKey(key, currentPath);
        
        if (typeof current[key] === 'object') {
          traverse(current[key], currentPath ? `${currentPath}.${key}` : key);
        }
      });
    }
  };
  
  traverse(obj);
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * 创建标准化的API响应
 */
const createStandardResponse = (data, message = '', success = true) => {
  const response = {
    success,
    message,
    data: mapDatabaseToFrontend(data),
    timestamp: new Date().toISOString()
  };
  
  return response;
};

/**
 * 错误响应标准化
 */
const createErrorResponse = (message, error = null, statusCode = 500) => {
  return {
    success: false,
    message,
    error: error?.message || error,
    statusCode,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  // 核心转换函数
  camelToSnakeCase,
  snakeToCamelCase,
  mapDatabaseToFrontend,
  mapFrontendToDatabase,
  
  // 中间件
  transformRequestFields,
  transformResponseFields,
  fieldMappingMiddleware,
  
  // 数据库工具
  transformQueryResult,
  transformQueryData,
  
  // 验证工具
  validateFieldNaming,
  
  // 响应工具
  createStandardResponse,
  createErrorResponse,
  
  // 配置
  FIELD_MAPPINGS
};
