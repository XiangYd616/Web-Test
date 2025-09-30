/**
 * 统一API服务配置
 * 提供企业级功能的配置开关和参数设置
 * 版本: v1.0.0
 */

export interface ApiCacheConfig {
  enabled: boolean;
  maxSize: number; // 最大缓存条目数
  defaultTtl: number; // 默认缓存时间（毫秒）
  strategy: 'lru' | 'fifo' | 'ttl'; // 缓存策略
  storage: 'memory' | 'localStorage' | 'sessionStorage';
}

export interface ApiRetryConfig {
  enabled: boolean;
  maxAttempts: number; // 最大重试次数
  baseDelay: number; // 基础延迟（毫秒）
  exponentialBackoff: boolean; // 是否使用指数退避
  jitterEnabled: boolean; // 是否启用抖动
  retryableStatusCodes: number[]; // 可重试的状态码
}

export interface ApiMetricsConfig {
  enabled: boolean;
  trackTiming: boolean; // 是否跟踪请求时间
  trackErrors: boolean; // 是否跟踪错误
  trackCacheHit: boolean; // 是否跟踪缓存命中率
  batchSize: number; // 批量发送指标的大小
  flushInterval: number; // 指标刷新间隔（毫秒）
}

export interface ApiSecurityConfig {
  rateLimiting: {
    enabled: boolean;
    maxRequests: number; // 每个时间窗口的最大请求数
    windowSize: number; // 时间窗口大小（毫秒）
    whitelistEndpoints: string[]; // 白名单端点
  };
  requestSigning: {
    enabled: boolean;
    algorithm: 'HMAC-SHA256' | 'RSA-SHA256';
    includeTimestamp: boolean;
  };
}

export interface ApiInterceptorConfig {
  request: {
    enableLogging: boolean;
    enableMetrics: boolean;
    enableSigning: boolean;
    enableRateLimiting: boolean;
  };
  response: {
    enableLogging: boolean;
    enableMetrics: boolean;
    enableErrorHandling: boolean;
    enableCaching: boolean;
  };
}

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  version: string;
  
  // 企业级功能配置
  cache: ApiCacheConfig;
  retry: ApiRetryConfig;
  metrics: ApiMetricsConfig;
  security: ApiSecurityConfig;
  interceptors: ApiInterceptorConfig;
  
  // 环境相关配置
  isDevelopment: boolean;
  isProduction: boolean;
  enableDebugLogging: boolean;
}

// ==================== 默认配置 ====================

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: process.env.REQUEST_TIMEOUT || 30000,
  version: 'v3.0',
  
  cache: {
    enabled: true,
    maxSize: 1000,
    defaultTtl: 300000, // 5分钟
    strategy: 'lru',
    storage: 'memory'
  },
  
  retry: {
    enabled: true,
    maxAttempts: 3,
    baseDelay: 1000,
    exponentialBackoff: true,
    jitterEnabled: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
  },
  
  metrics: {
    enabled: true,
    trackTiming: true,
    trackErrors: true,
    trackCacheHit: true,
    batchSize: 100,
    flushInterval: 30000 // 30秒
  },
  
  security: {
    rateLimiting: {
      enabled: false, // 客户端限流通常在开发时启用
      maxRequests: 100,
      windowSize: 60000, // 1分钟
      whitelistEndpoints: ['/health', '/ping']
    },
    requestSigning: {
      enabled: false, // 生产环境可以启用
      algorithm: 'HMAC-SHA256',
      includeTimestamp: true
    }
  },
  
  interceptors: {
    request: {
      enableLogging: process.env.NODE_ENV === 'development',
      enableMetrics: true,
      enableSigning: false,
      enableRateLimiting: false
    },
    response: {
      enableLogging: process.env.NODE_ENV === 'development',
      enableMetrics: true,
      enableErrorHandling: true,
      enableCaching: true
    }
  },
  
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  enableDebugLogging: process.env.NODE_ENV === 'development'
};

// ==================== 环境特定配置 ====================

export const DEVELOPMENT_API_CONFIG: Partial<ApiConfig> = {
  enableDebugLogging: true,
  timeout: 5000, // 开发环境更短的超时时间
  cache: {
    ...DEFAULT_API_CONFIG.cache,
    enabled: false // 开发时可以禁用缓存以便调试
  },
  security: {
    ...DEFAULT_API_CONFIG.security,
    rateLimiting: {
      ...DEFAULT_API_CONFIG.security.rateLimiting,
      enabled: true, // 开发时启用以便测试
      maxRequests: 1000 // 开发时更宽松的限制
    }
  }
};

export const PRODUCTION_API_CONFIG: Partial<ApiConfig> = {
  enableDebugLogging: false,
  timeout: process.env.REQUEST_TIMEOUT || 30000,
  cache: {
    ...DEFAULT_API_CONFIG.cache,
    enabled: true,
    maxSize: 5000, // 生产环境更大的缓存
    storage: 'localStorage'
  },
  metrics: {
    ...DEFAULT_API_CONFIG.metrics,
    enabled: true,
    batchSize: 500,
    flushInterval: 60000 // 1分钟
  },
  security: {
    ...DEFAULT_API_CONFIG.security,
    requestSigning: {
      ...DEFAULT_API_CONFIG.security.requestSigning,
      enabled: true // 生产环境启用请求签名
    }
  }
};

// ==================== 配置工具函数 ====================

/**
 * 合并配置对象
 */
export function mergeApiConfig(
  baseConfig: ApiConfig = DEFAULT_API_CONFIG,
  overrides: Partial<ApiConfig> = {}
): ApiConfig {
  return {
    ...baseConfig,
    ...overrides,
    cache: { ...baseConfig.cache, ...overrides.cache },
    retry: { ...baseConfig.retry, ...overrides.retry },
    metrics: { ...baseConfig.metrics, ...overrides.metrics },
    security: {
      rateLimiting: {
        ...baseConfig.security.rateLimiting,
        ...overrides.security?.rateLimiting
      },
      requestSigning: {
        ...baseConfig.security.requestSigning,
        ...overrides.security?.requestSigning
      }
    },
    interceptors: {
      request: {
        ...baseConfig.interceptors.request,
        ...overrides.interceptors?.request
      },
      response: {
        ...baseConfig.interceptors.response,
        ...overrides.interceptors?.response
      }
    }
  };
}

/**
 * 获取环境特定的API配置
 */
export function getEnvironmentApiConfig(): ApiConfig {
  const baseConfig = DEFAULT_API_CONFIG;
  
  if (process.env.NODE_ENV === 'development') {
    return mergeApiConfig(baseConfig, DEVELOPMENT_API_CONFIG);
  }
  
  if (process.env.NODE_ENV === 'production') {
    return mergeApiConfig(baseConfig, PRODUCTION_API_CONFIG);
  }
  
  return baseConfig;
}

/**
 * 创建自定义API配置
 */
export function createApiConfig(overrides: Partial<ApiConfig>): ApiConfig {
  const envConfig = getEnvironmentApiConfig();
  return mergeApiConfig(envConfig, overrides);
}

// ==================== 配置验证 ====================

/**
 * 验证API配置
 */
export function validateApiConfig(config: ApiConfig): string[] {
  const errors: string[] = [];
  
  if (!config.baseURL) {
    errors.push('baseURL 不能为空');
  }
  
  if (config.timeout <= 0) {
    errors.push('timeout 必须大于0');
  }
  
  if (config.cache.maxSize <= 0) {
    errors.push('cache.maxSize 必须大于0');
  }
  
  if (config.retry.maxAttempts < 0) {
    errors.push('retry.maxAttempts 不能为负数');
  }
  
  if (config.retry.baseDelay <= 0) {
    errors.push('retry.baseDelay 必须大于0');
  }
  
  if (config.metrics.batchSize <= 0) {
    errors.push('metrics.batchSize 必须大于0');
  }
  
  return errors;
}

// 默认导出环境配置
export default getEnvironmentApiConfig();
