/**
 * 错误类型和分类定义
 * 为所有共享服务提供统一的错误分类系统
 */

// 错误严重级别
export const ErrorSeverity = {
  CRITICAL: 'critical',    // 关键错误，服务完全不可用
  HIGH: 'high',           // 高级错误，核心功能受影响
  MEDIUM: 'medium',       // 中级错误，部分功能受影响
  LOW: 'low',             // 低级错误，轻微影响
  INFO: 'info'            // 信息性错误，不影响功能
};

// 错误分类
export const ErrorCategory = {
  // 系统级错误
  SYSTEM: 'system',
  NETWORK: 'network',
  DEPENDENCY: 'dependency',
  INITIALIZATION: 'initialization',
  
  // 数据级错误
  VALIDATION: 'validation',
  PARSING: 'parsing',
  PROCESSING: 'processing',
  
  // 业务级错误
  CONFIGURATION: 'configuration',
  CONTENT: 'content',
  ANALYSIS: 'analysis',
  
  // 资源级错误
  MEMORY: 'memory',
  TIMEOUT: 'timeout',
  RESOURCE: 'resource'
};

// 错误代码定义
export const ErrorCode = {
  // 系统错误 (1000-1999)
  SYSTEM_FAILURE: 1000,
  SYSTEM_OVERLOAD: 1001,
  SYSTEM_MAINTENANCE: 1002,
  
  // 网络错误 (2000-2999)
  NETWORK_UNAVAILABLE: 2000,
  NETWORK_TIMEOUT: 2001,
  NETWORK_DNS_FAILURE: 2002,
  NETWORK_CONNECTION_REFUSED: 2003,
  NETWORK_SSL_ERROR: 2004,
  
  // 依赖错误 (3000-3999)
  DEPENDENCY_MISSING: 3000,
  DEPENDENCY_VERSION_MISMATCH: 3001,
  DEPENDENCY_INITIALIZATION_FAILED: 3002,
  DEPENDENCY_UNAVAILABLE: 3003,
  
  // 初始化错误 (4000-4999)
  INIT_FAILED: 4000,
  INIT_TIMEOUT: 4001,
  INIT_INVALID_CONFIG: 4002,
  INIT_RESOURCE_UNAVAILABLE: 4003,
  
  // 验证错误 (5000-5999)
  VALIDATION_FAILED: 5000,
  VALIDATION_REQUIRED_FIELD_MISSING: 5001,
  VALIDATION_INVALID_FORMAT: 5002,
  VALIDATION_OUT_OF_RANGE: 5003,
  VALIDATION_TYPE_MISMATCH: 5004,
  
  // 解析错误 (6000-6999)
  PARSING_FAILED: 6000,
  PARSING_INVALID_HTML: 6001,
  PARSING_INVALID_CSS: 6002,
  PARSING_INVALID_JSON: 6003,
  PARSING_ENCODING_ERROR: 6004,
  
  // 处理错误 (7000-7999)
  PROCESSING_FAILED: 7000,
  PROCESSING_TIMEOUT: 7001,
  PROCESSING_MEMORY_EXCEEDED: 7002,
  PROCESSING_INVALID_INPUT: 7003,
  PROCESSING_OUTPUT_ERROR: 7004,
  
  // 配置错误 (8000-8999)
  CONFIG_INVALID: 8000,
  CONFIG_MISSING: 8001,
  CONFIG_PARSE_ERROR: 8002,
  CONFIG_VALUE_INVALID: 8003,
  
  // 内容错误 (9000-9999)
  CONTENT_NOT_FOUND: 9000,
  CONTENT_ACCESS_DENIED: 9001,
  CONTENT_CORRUPTED: 9002,
  CONTENT_TOO_LARGE: 9003,
  CONTENT_INVALID_TYPE: 9004,
  
  // 分析错误 (10000-10999)
  ANALYSIS_FAILED: 10000,
  ANALYSIS_INSUFFICIENT_DATA: 10001,
  ANALYSIS_UNSUPPORTED_TYPE: 10002,
  ANALYSIS_ALGORITHM_ERROR: 10003,
  
  // 资源错误 (11000-11999)
  MEMORY_EXCEEDED: 11000,
  TIMEOUT_EXCEEDED: 11001,
  RESOURCE_EXHAUSTED: 11002,
  RESOURCE_LOCKED: 11003
};

// 恢复策略
export const RecoveryStrategy = {
  RETRY: 'retry',                    // 重试操作
  FALLBACK: 'fallback',             // 使用备用方案
  DEGRADE: 'degrade',               // 服务降级
  SKIP: 'skip',                     // 跳过当前操作
  FAIL_FAST: 'fail_fast',           // 快速失败
  WAIT_AND_RETRY: 'wait_and_retry', // 等待后重试
  RESET: 'reset',                   // 重置状态
  ESCALATE: 'escalate'              // 上报处理
};

// 错误恢复配置
export const RecoveryConfig = {
  [ErrorCode.NETWORK_TIMEOUT]: {
    strategy: RecoveryStrategy.RETRY,
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
  },
  [ErrorCode.NETWORK_UNAVAILABLE]: {
    strategy: RecoveryStrategy.WAIT_AND_RETRY,
    maxRetries: 5,
    retryDelay: 5000,
    backoffMultiplier: 1.5
  },
  [ErrorCode.DEPENDENCY_UNAVAILABLE]: {
    strategy: RecoveryStrategy.FALLBACK,
    fallbackMethod: 'useAlternativeService'
  },
  [ErrorCode.PARSING_FAILED]: {
    strategy: RecoveryStrategy.DEGRADE,
    degradedMethod: 'useBasicParsing'
  },
  [ErrorCode.PROCESSING_MEMORY_EXCEEDED]: {
    strategy: RecoveryStrategy.RESET,
    resetMethod: 'clearCache'
  },
  [ErrorCode.ANALYSIS_INSUFFICIENT_DATA]: {
    strategy: RecoveryStrategy.SKIP,
    skipMessage: '数据不足，跳过此分析'
  },
  [ErrorCode.SYSTEM_OVERLOAD]: {
    strategy: RecoveryStrategy.DEGRADE,
    degradedMethod: 'reduceFunctionality'
  }
};

// 错误信息模板
export const ErrorMessages = {
  [ErrorCode.SYSTEM_FAILURE]: '系统发生严重故障',
  [ErrorCode.NETWORK_TIMEOUT]: '网络请求超时',
  [ErrorCode.DEPENDENCY_MISSING]: '缺少必需的依赖项: {dependency}',
  [ErrorCode.VALIDATION_FAILED]: '数据验证失败: {details}',
  [ErrorCode.PARSING_INVALID_HTML]: 'HTML解析失败: {reason}',
  [ErrorCode.PROCESSING_TIMEOUT]: '处理超时，耗时: {duration}ms',
  [ErrorCode.CONFIG_INVALID]: '配置无效: {field}',
  [ErrorCode.CONTENT_NOT_FOUND]: '内容未找到: {url}',
  [ErrorCode.ANALYSIS_FAILED]: '分析失败: {type}',
  [ErrorCode.MEMORY_EXCEEDED]: '内存使用超限: {used}/{limit}'
};

export default {
  ErrorSeverity,
  ErrorCategory,
  ErrorCode,
  RecoveryStrategy,
  RecoveryConfig,
  ErrorMessages
};
