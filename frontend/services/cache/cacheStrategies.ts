import { handleAsyncError } from '../utils/errorHandler';
/**
 * 缓存策略配置
 * 为不同类型的数据定义最优的缓存策略
 * 版本: v1.0.0
 */

import { CacheStrategy } from './cacheManager';

// 数据类型枚举
export enum DataType {
  USER_PROFILE = 'user_profile',
  USER_PREFERENCES = 'user_preferences',
  TEST_RESULTS = 'test_results',
  TEST_HISTORY = 'test_history',
  API_RESPONSES = 'api_responses',
  STATIC_CONFIG = 'static_config',
  TEMPORARY_DATA = 'temporary_data',
  LARGE_DATASETS = 'large_datasets',
  REAL_TIME_DATA = 'real_time_data',
  AUTHENTICATION = 'authentication'
}

// 缓存策略配置接口
export interface CacheStrategyConfig {
  strategy: CacheStrategy;
  ttl: number; // 过期时间（秒）
  priority: 'low' | 'medium' | 'high' | 'critical';
  enableCompression: boolean;
  maxSize?: number; // 最大大小（字节）
  description: string;
}

// 预定义的缓存策略配置
export const CACHE_STRATEGIES: Record<DataType, CacheStrategyConfig> = {
  [DataType.USER_PROFILE]: {
    strategy: CacheStrategy.WRITE_THROUGH,
    ttl: 3600, // 1小时
    priority: 'high',
    enableCompression: false,
    description: '用户资料信息，需要高可用性和一致性'
  },

  [DataType.USER_PREFERENCES]: {
    strategy: CacheStrategy.WRITE_THROUGH,
    ttl: 7200, // 2小时
    priority: 'high',
    enableCompression: false,
    description: '用户偏好设置，频繁访问且需要持久化'
  },

  [DataType.TEST_RESULTS]: {
    strategy: CacheStrategy.STORAGE_FIRST,
    ttl: 86400, // 24小时
    priority: 'medium',
    enableCompression: true,
    maxSize: 1024 * 1024, // 1MB
    description: '测试结果数据，大容量且需要长期保存'
  },

  [DataType.TEST_HISTORY]: {
    strategy: CacheStrategy.MEMORY_FIRST,
    ttl: 1800, // 30分钟
    priority: 'medium',
    enableCompression: true,
    description: '测试历史记录，频繁访问但可以重新获取'
  },

  [DataType.API_RESPONSES]: {
    strategy: CacheStrategy.MEMORY_ONLY,
    ttl: 300, // 5分钟
    priority: 'low',
    enableCompression: false,
    description: '一般API响应，短期缓存减少网络请求'
  },

  [DataType.STATIC_CONFIG]: {
    strategy: CacheStrategy.WRITE_THROUGH,
    ttl: 43200, // 12小时
    priority: 'critical',
    enableCompression: false,
    description: '静态配置数据，关键且变化较少'
  },

  [DataType.TEMPORARY_DATA]: {
    strategy: CacheStrategy.MEMORY_ONLY,
    ttl: 60, // 1分钟
    priority: 'low',
    enableCompression: false,
    description: '临时数据，短期使用后即可丢弃'
  },

  [DataType.LARGE_DATASETS]: {
    strategy: CacheStrategy.STORAGE_ONLY,
    ttl: 3600, // 1小时
    priority: 'low',
    enableCompression: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    description: '大型数据集，只存储在本地存储中'
  },

  [DataType.REAL_TIME_DATA]: {
    strategy: CacheStrategy.MEMORY_ONLY,
    ttl: 30, // 30秒
    priority: 'medium',
    enableCompression: false,
    description: '实时数据，快速访问但很快过期'
  },

  [DataType.AUTHENTICATION]: {
    strategy: CacheStrategy.MEMORY_FIRST,
    ttl: 1800, // 30分钟
    priority: 'critical',
    enableCompression: false,
    description: '认证信息，需要快速访问和安全性'
  }
};

// 缓存键生成器
export class CacheKeyGenerator {
  /**
   * 生成用户相关的缓存键
   */
  static user(userId: string, type: 'profile' | 'preferences' | 'settings'): string {
    return `user:${userId}:${type}`;
  }

  /**
   * 生成测试相关的缓存键
   */
  static test(testId: string, type: 'result' | 'config' | 'history'): string {
    return `test:${testId}:${type}`;
  }

  /**
   * 生成API响应缓存键
   */
  static api(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    const hash = this.simpleHash(paramString);
    return `api:${endpoint}:${hash}`;
  }

  /**
   * 生成配置缓存键
   */
  static config(configType: string, version?: string): string {
    return `config:${configType}${version ? `:${version}` : ''}`;
  }

  /**
   * 生成临时数据缓存键
   */
  static temp(identifier: string): string {
    return `temp:${identifier}:${Date.now()}`;
  }

  /**
   * 生成分页数据缓存键
   */
  static paginated(resource: string, page: number, limit: number, filters?: Record<string, any>): string {
    const filterString = filters ? JSON.stringify(filters) : '';
    const hash = this.simpleHash(filterString);
    return `paginated:${resource}:${page}:${limit}:${hash}`;
  }

  /**
   * 简单哈希函数
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }
}

// 缓存策略管理器
export class CacheStrategyManager {
  /**
   * 获取数据类型的缓存策略
   */
  static getStrategy(dataType: DataType): CacheStrategyConfig {
    return CACHE_STRATEGIES[dataType];
  }

  /**
   * 根据数据特征推荐缓存策略
   */
  static recommendStrategy(characteristics: {
    size: number;
    accessFrequency: 'low' | 'medium' | 'high';
    updateFrequency: 'low' | 'medium' | 'high';
    importance: 'low' | 'medium' | 'high' | 'critical';
    durability: 'temporary' | 'session' | 'persistent';
  }): CacheStrategyConfig {
    const { size, accessFrequency, updateFrequency, importance, durability } = characteristics;

    // 大文件优先存储
    if (size > 1024 * 1024) { 
        // > 1MB
      return {
        strategy: CacheStrategy.STORAGE_ONLY,
        ttl: durability === 'temporary' ? 300 : 3600,
        priority: importance,
        enableCompression: true,
        maxSize: size,
        description: '大文件，存储优先策略'
      };
    }

    // 高频访问数据优先内存
    if (accessFrequency === 'high') {
      
        return {
        strategy: updateFrequency === 'high' ? CacheStrategy.WRITE_THROUGH : CacheStrategy.MEMORY_FIRST,
        ttl: durability === 'temporary' ? 300 : 1800,
        priority: importance,
        enableCompression: size > 10240, // > 10KB
        description: '高频访问数据，内存优先策略'
      };
    }

    // 关键数据双重保障
    if (importance === 'critical') {
      
        return {
        strategy: CacheStrategy.WRITE_THROUGH,
        ttl: durability === 'persistent' ? 43200 : 3600,
        priority: 'critical',
        enableCompression: false,
        description: '关键数据，双重保障策略'
      };
    }

    // 临时数据仅内存
    if (durability === 'temporary') {
      
        return {
        strategy: CacheStrategy.MEMORY_ONLY,
        ttl: 300,
        priority: 'low',
        enableCompression: false,
        description: '临时数据，仅内存策略'
      };
    }

    // 默认策略
    return {
      strategy: CacheStrategy.MEMORY_FIRST,
      ttl: 1800,
      priority: 'medium',
      enableCompression: size > 1024,
      description: '默认策略，内存优先'
    };
  }

  /**
   * 验证缓存策略配置
   */
  static validateStrategy(config: CacheStrategyConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.ttl <= 0) {
      errors.push('TTL必须大于0');
    }

    if (config.ttl > 86400 * 7) { // 7天
      errors.push('TTL不应超过7天');
    }

    if (config.maxSize && config.maxSize <= 0) {
      errors.push('maxSize必须大于0');
    }

    if (config.maxSize && config.maxSize > 100 * 1024 * 1024) { // 100MB
      errors.push('maxSize不应超过100MB');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取所有可用的数据类型
   */
  static getAvailableDataTypes(): DataType[] {
    return Object.values(DataType);
  }

  /**
   * 获取策略统计信息
   */
  static getStrategyStats(): Record<CacheStrategy, number> {
    const stats: Record<CacheStrategy, number> = {
      [CacheStrategy.MEMORY_ONLY]: 0,
      [CacheStrategy.STORAGE_ONLY]: 0,
      [CacheStrategy.MEMORY_FIRST]: 0,
      [CacheStrategy.STORAGE_FIRST]: 0,
      [CacheStrategy.WRITE_THROUGH]: 0,
      [CacheStrategy.WRITE_BACK]: 0
    };

    Object.values(CACHE_STRATEGIES).forEach(config => {
      stats[config.strategy]++;
    });

    return stats;
  }
}

// 缓存装饰器工厂
export function cached(
  dataType: DataType,
  keyGenerator?: (...args: any[]) => string,
  customConfig?: Partial<CacheStrategyConfig>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const strategy = CacheStrategyManager.getStrategy(dataType);
    const finalConfig = { ...strategy, ...customConfig };

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator ? keyGenerator(...args) : `${propertyName}:${JSON.stringify(args)}`;
      
      // 尝试从缓存获取
      const cached = try {
  await cacheManager.get(cacheKey, finalConfig.strategy);
} catch (error) {
  console.error('Await error:', error);
  throw error;
}
      if (cached !== null) {
        
        return cached;
      }

      // 执行原方法
      const result = try {
  await method.apply(this, args);
} catch (error) {
  console.error('Await error:', error);
  throw error;
}
      
      // 存储到缓存
      try {
  await cacheManager.set(cacheKey, result, finalConfig.ttl, finalConfig.strategy);
} catch (error) {
  console.error('Await error:', error);
  throw error;
}
      
      return result;
    };

    return descriptor;
  };
}

// 导出常用的缓存键生成器实例
export const CacheKeys = {
  user: CacheKeyGenerator.user,
  test: CacheKeyGenerator.test,
  api: CacheKeyGenerator.api,
  config: CacheKeyGenerator.config,
  temp: CacheKeyGenerator.temp,
  paginated: CacheKeyGenerator.paginated
};

// 导入缓存管理器（避免循环依赖）
import { cacheManager } from './cacheManager';
