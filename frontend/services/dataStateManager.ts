/**
 * 统一数据状态管理
 * 提供loading、error、success状态的统一管理
 * 版本: v1.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError } from '../types/api.types';
import type { ApiResponse } from '@shared/types';

// ==================== 状态类型定义 ====================

export type DataState = 'idle' | 'loading' | 'success' | 'error';

export interface DataStateInfo<T = any> {
  state: DataState;
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  success: boolean;
  hasError: boolean;
  lastUpdated: string | null;
  retryCount: number;
}

export interface DataStateOptions {
  initialData?: any;
  retryLimit?: number;
  autoRetry?: boolean;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  onStateChange?: (state: DataState) => void;
}

export interface AsyncOperation<T = any> {
  (): Promise<ApiResponse<T>>;
}

// ==================== 数据状态管理Hook ====================

export function useDataState<T = any>(
  options: DataStateOptions = {}
): [
    DataStateInfo<T>,
    {
      execute: (operation: AsyncOperation<T>) => Promise<T | null>;
      retry: () => Promise<T | null>;
      reset: () => void;
      setData: (data: T) => void;
      setError: (error: ApiError) => void;
    }
  ] {
  const {
    initialData = null,
    retryLimit = 3,
    autoRetry = false,
    retryDelay = 1000,
    onSuccess,
    onError,
    onStateChange
  } = options;

  const [state, setState] = useState<DataState>('idle');
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const lastOperationRef = useRef<AsyncOperation<T> | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 计算派生状态
  const stateInfo: DataStateInfo<T> = {
    state,
    data,
    error,
    loading: state === 'loading',
    success: state === 'success',
    hasError: state === 'error',
    lastUpdated,
    retryCount
  };

  // 状态变化回调
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // 执行异步操作
  const execute = useCallback(async (operation: AsyncOperation<T>): Promise<T | null> => {
    lastOperationRef.current = operation;
    setState('loading');
    setError(null);

    try {
      const response = await operation();

      if (response.success && response.data !== undefined) {
        const responseData = response.data;
        setData(responseData);
        setState('success');
        setLastUpdated(new Date().toISOString());
        setRetryCount(0);
        onSuccess?.(responseData);
        return responseData;
      } else {
        const apiError: ApiError = (typeof response.error === 'string'
          ? { code: 'UNKNOWN_ERROR' as any, message: response.error, timestamp: new Date().toISOString() }
          : response.error) || {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred',
          timestamp: new Date().toISOString()
        };
        throw apiError;
      }
    } catch (err) {
      const apiError: ApiError = err instanceof Error ? {
        code: 'EXECUTION_ERROR',
        message: err.message,
        timestamp: new Date().toISOString()
      } : err as ApiError;

      setError(apiError);
      setState('error');
      onError?.(apiError);

      // 自动重试逻辑
      if (autoRetry && retryCount < retryLimit && apiError.retryable !== false) {
        setRetryCount(prev => prev + 1);
        retryTimeoutRef.current = setTimeout(() => {
          execute(operation);
        }, retryDelay * Math.pow(2, retryCount)); // 指数退避
      }

      return null;
    }
  }, [autoRetry, retryCount, retryLimit, retryDelay, onSuccess, onError]);

  // 重试操作
  const retry = useCallback(async (): Promise<T | null> => {
    if (lastOperationRef.current) {
      setRetryCount(prev => prev + 1);
      return execute(lastOperationRef.current);
    }
    return null;
  }, [execute]);

  // 重置状态
  const reset = useCallback(() => {
    setState('idle');
    setData(initialData);
    setError(null);
    setLastUpdated(null);
    setRetryCount(0);
    lastOperationRef.current = null;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [initialData]);

  // 手动设置数据
  const setDataManually = useCallback((newData: T) => {
    setData(newData);
    setState('success');
    setLastUpdated(new Date().toISOString());
    setError(null);
  }, []);

  // 手动设置错误
  const setErrorManually = useCallback((newError: ApiError) => {
    setError(newError);
    setState('error');
    setData(null);
  }, []);

  return [
    stateInfo,
    {
      execute,
      retry,
      reset,
      setData: setDataManually,
      setError: setErrorManually
    }
  ];
}

// ==================== 批量数据状态管理 ====================

export interface BatchDataStateInfo {
  states: Record<string, DataStateInfo>;
  globalState: DataState;
  allLoading: boolean;
  allSuccess: boolean;
  hasAnyError: boolean;
  completedCount: number;
  totalCount: number;
  progress: number;
}

export function useBatchDataState(
  keys: string[],
  options: DataStateOptions = {}
): [
    BatchDataStateInfo,
    {
      execute: (key: string, operation: AsyncOperation) => Promise<any>;
      executeAll: (operations: Record<string, AsyncOperation>) => Promise<Record<string, any>>;
      retry: (key: string) => Promise<any>;
      retryAll: () => Promise<Record<string, any>>;
      reset: (key?: string) => void;
    }
  ] {
  const stateHooks = keys.reduce((acc, key) => {
    acc[key] = useDataState(options);
    return acc;
  }, {} as Record<string, ReturnType<typeof useDataState>>);

  // 计算批量状态信息
  const batchInfo: BatchDataStateInfo = {
    states: Object.fromEntries(
      Object.entries(stateHooks).map(([key, [stateInfo]]) => [key, stateInfo])
    ),
    globalState: 'idle',
    allLoading: false,
    allSuccess: false,
    hasAnyError: false,
    completedCount: 0,
    totalCount: keys.length,
    progress: 0
  };

  // 计算全局状态
  const states = Object.values(batchInfo.states);
  batchInfo.allLoading = states.some(s => s?.loading);
  batchInfo.allSuccess = states.every(s => s?.success);
  batchInfo.hasAnyError = states.some(s => s?.hasError);
  batchInfo.completedCount = states.filter(s => s?.success || s?.hasError).length;

  /**

   * if功能函数

   * @param {Object} params - 参数对象

   * @returns {Promise<Object>} 返回结果

   */
  batchInfo.progress = batchInfo.completedCount / batchInfo.totalCount;

  if (batchInfo.allLoading) {
    batchInfo.globalState = 'loading';
  } else if (batchInfo.allSuccess) {
    batchInfo.globalState = 'success';
  } else if (batchInfo.hasAnyError) {
    batchInfo.globalState = 'error';
  } else {
    batchInfo.globalState = 'idle';
  }

  // 执行单个操作
  const execute = useCallback(async (key: string, operation: AsyncOperation) => {
    const stateHook = stateHooks[key];
    if (stateHook) {
      return stateHook[1].execute(operation);
    }
    return null;
  }, [stateHooks]);

  // 执行所有操作
  const executeAll = useCallback(async (operations: Record<string, AsyncOperation>) => {
    const results: Record<string, any> = {};

    await Promise.allSettled(
      Object.entries(operations).map(async ([key, operation]) => {
        const result = await execute(key, operation);
        results[key] = result;
      })
    );

    return results;
  }, [execute]);

  // 重试单个操作
  const retry = useCallback(async (key: string) => {
    const stateHook = stateHooks[key];
    if (stateHook) {
      return stateHook[1].retry();
    }
    return null;
  }, [stateHooks]);

  // 重试所有失败的操作
  const retryAll = useCallback(async () => {
    const results: Record<string, any> = {};

    await Promise.allSettled(
      Object.entries(stateHooks).map(async ([key, [stateInfo, actions]]) => {
        if (stateInfo.hasError) {
          const result = await actions.retry();
          results[key] = result;
        }
      })
    );

    return results;
  }, [stateHooks]);

  // 重置状态
  const reset = useCallback((key?: string) => {
    if (key) {
      const stateHook = stateHooks[key];
      if (stateHook) {
        stateHook[1].reset();
      }
    } else {
      Object.values(stateHooks).forEach(([, actions]) => {
        actions.reset();
      });
    }
  }, [stateHooks]);

  return [
    batchInfo,
    {
      execute,
      executeAll,
      retry,
      retryAll,
      reset
    }
  ];
}

// ==================== 分页数据状态管理 ====================

export interface PaginatedDataState<T = any> extends DataStateInfo<T[]> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  isLoadingMore: boolean;
}

export function usePaginatedDataState<T = any>(
  options: DataStateOptions & {
    initialPage?: number;
    initialLimit?: number;
  } = {}
): [
    PaginatedDataState<T>,
    {
      loadPage: (operation: AsyncOperation<T[]>, page: number, limit?: number) => Promise<T[] | null>;
      loadMore: (operation: AsyncOperation<T[]>) => Promise<T[] | null>;
      refresh: () => Promise<T[] | null>;
      reset: () => void;
    }
  ] {
  const { initialPage = 1, initialLimit = 20, ...dataStateOptions } = options;

  const [dataState, dataActions] = useDataState<T[]>({ ...dataStateOptions, initialData: [] });
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const lastOperationRef = useRef<AsyncOperation<T[]> | null>(null);

  // 计算分页信息
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const paginatedState: PaginatedDataState<T> = {
    ...dataState,
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    isLoadingMore
  };

  // 加载指定页面
  const loadPage = useCallback(async (
    operation: AsyncOperation<T[]>,
    targetPage: number,
    targetLimit?: number
  ): Promise<T[] | null> => {
    lastOperationRef.current = operation;
    setPage(targetPage);
    if (targetLimit) {
      setLimit(targetLimit);
    }

    const result = await dataActions.execute(operation);

    // 假设API响应包含分页信息
    // 实际实现中需要根据API响应格式调整
    if (result && Array.isArray(result)) {
      // 这里应该从API响应的meta信息中获取total
      // setTotal(response.meta.pagination.total);
    }

    return result;
  }, [dataActions]);

  // 加载更多数据
  const loadMore = useCallback(async (operation: AsyncOperation<T[]>): Promise<T[] | null> => {
    if (!hasNext || isLoadingMore) {
      return null;
    }

    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const result = await loadPage(operation, nextPage);

      if (result && dataState.data) {
        // 合并数据
        const mergedData = [...dataState.data, ...result];
        dataActions.setData(mergedData);
      }

      return result;
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasNext, isLoadingMore, page, loadPage, dataState.data, dataActions]);

  // 刷新当前页
  const refresh = useCallback(async (): Promise<T[] | null> => {
    if (lastOperationRef.current) {
      return loadPage(lastOperationRef.current, page, limit);
    }
    return null;
  }, [loadPage, page, limit]);

  // 重置状态
  const reset = useCallback(() => {
    dataActions.reset();
    setPage(initialPage);
    setLimit(initialLimit);
    setTotal(0);
    setIsLoadingMore(false);
    lastOperationRef.current = null;
  }, [dataActions, initialPage, initialLimit]);

  return [
    paginatedState,
    {
      loadPage,
      loadMore,
      refresh,
      reset
    }
  ];
}

// ==================== 实时数据状态管理 ====================

export interface RealtimeDataState<T = any> extends DataStateInfo<T> {
  isConnected: boolean;
  lastSync: string | null;
  syncInterval: number;
}

export function useStreamingDataState<T = any>(
  options: DataStateOptions & {
    syncInterval?: number;
    autoSync?: boolean;
  } = {}
): [
    RealtimeDataState<T>,
    {
      startSync: (operation: AsyncOperation<T>) => void;
      stopSync: () => void;
      sync: () => Promise<T | null>;
      reset: () => void;
    }
  ] {
  const { syncInterval = 30000, autoSync = false, ...dataStateOptions } = options;

  const [dataState, dataActions] = useDataState<T>(dataStateOptions);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentOperationRef = useRef<AsyncOperation<T> | null>(null);

  const realtimeState: RealtimeDataState<T> = {
    ...dataState,
    isConnected,
    lastSync,
    syncInterval
  };

  // 同步数据
  const sync = useCallback(async (): Promise<T | null> => {
    if (currentOperationRef.current) {
      const result = await dataActions.execute(currentOperationRef.current);
      if (result) {
        setLastSync(new Date().toISOString());
      }
      return result;
    }
    return null;
  }, [dataActions]);

  // 开始同步
  const startSync = useCallback((operation: AsyncOperation<T>) => {
    currentOperationRef.current = operation;
    setIsConnected(true);

    // 立即执行一次
    if (autoSync) {
      sync();
    }

    // 设置定时同步
    syncIntervalRef.current = setInterval(sync, syncInterval);
  }, [sync, syncInterval, autoSync]);

  // 停止同步
  const stopSync = useCallback(() => {
    setIsConnected(false);
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    stopSync();
    dataActions.reset();
    setLastSync(null);
    currentOperationRef.current = null;
  }, [stopSync, dataActions]);

  // 清理
  useEffect(() => {
    return () => {
      stopSync();
    };
  }, [stopSync]);

  return [
    realtimeState,
    {
      startSync,
      stopSync,
      sync,
      reset
    }
  ];
}

// ==================== 导出默认配置 ====================

export const DEFAULT_DATA_STATE_OPTIONS: DataStateOptions = {
  retryLimit: 3,
  autoRetry: false,
  retryDelay: 1000
};

export const DEFAULT_PAGINATION_OPTIONS = {
  initialPage: 1,
  initialLimit: 20
};

export const DEFAULT_REALTIME_OPTIONS = {
  syncInterval: 30000,
  autoSync: true
};
