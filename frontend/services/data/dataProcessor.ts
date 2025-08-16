/**
 * 统一前端数据处理器
 * 整合API错误处理、数据缓存、分页和加载状态管理
 * 版本: v2.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
  // PaginationInfo
} from '../types/api'; // 已修复
// ==================== 数据处理配置 ====================

export interface DataProcessorConfig {
  // 缓存配置
  cache?: {
    enabled: boolean;
    ttl: number; // 毫秒
    maxSize: number;
    strategy: 'lru' | 'ttl' | 'fifo';
  };

  // 重试配置
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number; // 毫秒
    backoff: 'linear' | 'exponential';
  };

  // 分页配置
  pagination?: {
    defaultPageSize: number;
    pageSizeOptions: number[];
    showSizeChanger: boolean;
    showQuickJumper: boolean;
  };

  // 错误处理配置
  errorHandling?: {
    showNotification: boolean;
    autoRetry: boolean;
    fallbackData?: any;
  };
}

// 默认配置
const DEFAULT_CONFIG: DataProcessorConfig = {
  cache: {
    enabled: true,
    ttl: 300000, // 5分钟
    maxSize: 100,
    strategy: 'lru'
  },
  retry: {
    enabled: true,
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential'
  },
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    showSizeChanger: true,
    showQuickJumper: true
  },
  errorHandling: {
    showNotification: true,
    autoRetry: true,
    fallbackData: null
  }
};

// ==================== 数据状态类型 ====================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'refreshing';

export interface DataState<T = any> {
  // 数据状态
  state: LoadingState;
  data: T | null;
  error: string | null;

  // 状态标志
  loading: boolean;
  success: boolean;
  hasError: boolean;
  refreshing: boolean;

  // 元数据
  lastUpdated: string | null;
  retryCount: number;
  cacheHit: boolean;

  // 分页信息（如果适用）
  pagination?: PaginationInfo;
}

export interface DataActions<T = any> {
  // 数据操作
  load: (params?: any) => Promise<T | null>;
  refresh: () => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;

  // 分页操作
  loadPage: (page: number) => Promise<T | null>;
  changePageSize: (size: number) => Promise<T | null>;

  // 缓存操作
  clearCache: () => void;
  invalidateCache: (key?: string) => void;

  // 手动设置
  setData: (data: T) => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

// ==================== 缓存管理器 ====================

class DataCache {
  // 监控和指标收集
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: new Map<string, number>()
  };
  
  private logSuccess(info: any): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    // 更新平均响应时间
    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
      this.metrics.successfulRequests;
  }
  
  private logError(error: Error, context: any): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    
    const errorType = error.name || 'UnknownError';
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics:', {
      url: info.url,
      method: info.method,
      status: info.status,
      responseTime: info.responseTime
    });
  }
  
  getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize: number;
  private strategy: 'lru' | 'ttl' | 'fifo';
  private accessOrder = new Map<string, number>();

  constructor(maxSize = 100, strategy: 'lru' | 'ttl' | 'fifo' = 'lru') {
    this.maxSize = maxSize;
    this.strategy = strategy;
  }

  set(key: string, data: any, ttl = 300000): void {
    // 检查容量
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    if (this.strategy === 'lru') {
      this.accessOrder.set(key, Date.now());
    }
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查TTL
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // 更新访问时间（LRU）
    if (this.strategy === 'lru') {
      this.accessOrder.set(key, Date.now());
    }

    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
  }

  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string;

    switch (this.strategy) {
      case 'lru':
        // 移除最久未访问的
        keyToEvict = Array.from(this.accessOrder.entries())
          .sort(([, a], [, b]) => a - b)[0][0];
        break;

      case 'ttl':
        // 移除最早过期的
        keyToEvict = Array.from(this.cache.entries())
          .sort(([, a], [, b]) => (a.timestamp + a.ttl) - (b.timestamp + b.ttl))[0][0];
        break;

      case 'fifo':
      default:
        // 移除最早添加的
        keyToEvict = this.cache.keys().next().value;
        break;
    }

    this.delete(keyToEvict);
  }
}

// 全局缓存实例
const globalCache = new DataCache();

// ==================== 统一数据处理Hook ====================

export function useDataProcessor<T = any>(
  config: Partial<DataProcessorConfig> = {}
): [DataState<T>, DataActions<T>] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // 状态管理
  const [state, setState] = useState<DataState<T>>({
    state: 'idle',
    data: null,
    error: null,
    loading: false,
    success: false,
    hasError: false,
    refreshing: false,
    lastUpdated: null,
    retryCount: 0,
    cacheHit: false
  });

  // 引用
  const lastRequestRef = useRef<() => Promise<ApiResponse<T>> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 生成缓存键
  const generateCacheKey = useCallback((params?: any): string => {
    const baseKey = 'data-processor';
    if (!params) return baseKey;
    return `${baseKey}-${JSON.stringify(params)}`;
  }, []);

  // 更新状态
  const updateState = useCallback((updates: Partial<DataState<T>>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      loading: updates.state === 'loading',
      success: updates.state === 'success',
      hasError: updates.state === 'error',
      refreshing: updates.state === 'refreshing'
    }));
  }, []);

  // 处理API响应
  const processResponse = useCallback((response: ApiResponse<T>, cacheKey?: string): T | null => {
    if (response.success) {
      const successResponse = response as ApiSuccessResponse<T>;

      // 缓存数据
      if (finalConfig.cache?.enabled && cacheKey) {
        globalCache.set(cacheKey, successResponse.data, finalConfig.cache.ttl);
      }

      // 更新状态
      updateState({
        state: 'success',
        data: successResponse.data,
        error: null,
        lastUpdated: new Date().toISOString(),
        retryCount: 0,
        pagination: 'pagination' in successResponse.meta ? successResponse.meta.pagination : undefined
      });

      return successResponse.data;
    } else {
      const errorResponse = response as ApiErrorResponse;
      const errorMessage = errorResponse.error.message || '请求失败';

      updateState({
        state: 'error',
        error: errorMessage,
        data: finalConfig.errorHandling?.fallbackData || null
      });

      // 显示错误通知
      if (finalConfig.errorHandling?.showNotification) {
        console.error('API Error:', errorMessage);
        // 这里可以集成通知系统
      }

      return null;
    }
  }, [finalConfig, updateState]);

  // 执行请求
  const executeRequest = useCallback(async (
    requestFn: () => Promise<ApiResponse<T>>,
    params?: any,
    options: { useCache?: boolean; isRetry?: boolean } = {}
  ): Promise<T | null> => {
    const { useCache = true, isRetry = false } = options;
    const cacheKey = generateCacheKey(params);

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 检查缓存
    if (useCache && finalConfig.cache?.enabled) {
      const cachedData = globalCache.get(cacheKey);
      if (cachedData) {
        updateState({
          state: 'success',
          data: cachedData,
          error: null,
          cacheHit: true,
          lastUpdated: new Date().toISOString()
        });
        return cachedData;
      }
    }

    // 设置加载状态
    updateState({
      state: state.data ? 'refreshing' : 'loading',
      error: null,
      cacheHit: false,
      retryCount: isRetry ? state.retryCount + 1 : 0
    });

    try {
      // 创建新的AbortController
      abortControllerRef.current = new AbortController();

      // 保存请求函数用于重试
      lastRequestRef.current = requestFn;

      // 执行请求
      const response = await requestFn();

      return processResponse(response, cacheKey);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络请求失败';

      updateState({
        state: 'error',
        error: errorMessage,
        data: finalConfig.errorHandling?.fallbackData || state.data
      });

      // 自动重试
      if (finalConfig.retry?.enabled &&
        finalConfig.errorHandling?.autoRetry &&
        state.retryCount < (finalConfig.retry.maxAttempts - 1)) {

        const delay = finalConfig.retry.backoff === 'exponential'
          ? finalConfig.retry.delay * Math.pow(2, state.retryCount)
          : finalConfig.retry.delay;

        retryTimeoutRef.current = setTimeout(() => {
          executeRequest(requestFn, params, { useCache: false, isRetry: true });
        }, delay);
      }

      return null;
    }
  }, [state, finalConfig, generateCacheKey, updateState, processResponse]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // 操作函数
  const actions: DataActions<T> = {
    load: (params) => {
      if (!lastRequestRef.current) {
        throw new Error('No request function provided');
      }
      return executeRequest(lastRequestRef.current, params);
    },

    refresh: () => {
      if (!lastRequestRef.current) {
        throw new Error('No request function provided');
      }
      return executeRequest(lastRequestRef.current, undefined, { useCache: false });
    },

    retry: () => {
      if (!lastRequestRef.current) {
        throw new Error('No request function provided');
      }
      return executeRequest(lastRequestRef.current, undefined, { useCache: false, isRetry: true });
    },

    reset: () => {
      updateState({
        state: 'idle',
        data: null,
        error: null,
        lastUpdated: null,
        retryCount: 0,
        cacheHit: false
      });
    },

    loadPage: async (page: number) => {
      if (!lastRequestRef.current) return null;
      const params = { page, limit: state.pagination?.limit || finalConfig.pagination?.defaultPageSize };
      return executeRequest(lastRequestRef.current, params);
    },

    changePageSize: async (size: number) => {
      if (!lastRequestRef.current) return null;
      const params = { page: 1, limit: size };
      return executeRequest(lastRequestRef.current, params);
    },

    clearCache: () => {
      globalCache.clear();
    },

    invalidateCache: (key?: string) => {
      if (key) {
        globalCache.delete(key);
      } else {
        globalCache.clear();
      }
    },

    setData: (data: T) => {
      updateState({
        state: 'success',
        data,
        error: null,
        lastUpdated: new Date().toISOString()
      });
    },

    setError: (error: string) => {
      updateState({
        state: 'error',
        error,
        data: finalConfig.errorHandling?.fallbackData || state.data
      });
    },

    setLoading: (loading: boolean) => {
      updateState({
        state: loading ? 'loading' : 'idle'
      });
    }
  };

  return [state, actions];
}

// ==================== 导出 ====================

export { DataCache, globalCache };
export default useDataProcessor;
