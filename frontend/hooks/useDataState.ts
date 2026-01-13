/**
 * 数据加载状态管理Hook
 * 标准化数据加载状态管理（loading、error、success、empty状态）
 * 版本: v2.0.0
 */

import Logger from '@/utils/logger';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorHandler } from '../services/api/errorHandler';

// 数据状态枚举
export enum DataStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  EMPTY = 'empty',
}

// 数据状态接口
export interface DataState<T = any> {
  data: T | null;
  status: DataStatus;
  loading: boolean;
  error: any | null;
  isEmpty: boolean;
  isSuccess: boolean;
  isError: boolean;
  lastUpdated: Date | null;
  retryCount: number;
}

// 数据操作配置
export interface DataOperationConfig {
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  onRetry?: (retryCount: number) => void;
  validateData?: (data: any) => boolean;
  transformData?: (data: any) => any;
}

// 分页数据状态
export interface PaginatedDataState<T = any> extends DataState<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  loadingMore: boolean;
}

// 默认配置
const DEFAULT_CONFIG: Required<DataOperationConfig> = {
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableCache: false,
  cacheKey: '',
  cacheTTL: 300,
  onSuccess: () => {},
  onError: () => {},
  onRetry: () => {},
  validateData: () => true,
  transformData: data => data,
};

/**
 * 基础数据状态管理Hook
 */
export function useDataState<T = any>(
  config: DataOperationConfig = {}
): [
  DataState<T>,
  {
    execute: (fetcher: () => Promise<T>) => Promise<T | null>;
    retry: () => Promise<T | null>;
    reset: () => void;
    setData: (data: T | null) => void;
    setError: (error: any | null) => void;
    setLoading: (loading: boolean) => void;
  },
] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // 状态管理
  const [state, setState] = useState<DataState<T>>({
    data: null,
    status: DataStatus.IDLE,
    loading: false,
    error: null,
    isEmpty: false,
    isSuccess: false,
    isError: false,
    lastUpdated: null,
    retryCount: 0,
  });

  // 保存最后的fetcher函数用于重试
  const lastFetcherRef = useRef<(() => Promise<T>) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 更新状态的辅助函数
  const updateState = useCallback((updates: Partial<DataState<T>>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };

      // 自动计算派生状态
      newState.loading = newState.status === DataStatus.LOADING;
      newState.isSuccess = newState.status === DataStatus.SUCCESS;
      newState.isError = newState.status === DataStatus.ERROR;
      newState.isEmpty = newState.status === DataStatus.EMPTY;

      return newState;
    });
  }, []);

  // 执行数据获取
  const execute = useCallback(
    async (fetcher: () => Promise<T>): Promise<T | null> => {
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 创建新的AbortController
      abortControllerRef.current = new AbortController();

      // 保存fetcher用于重试
      lastFetcherRef.current = fetcher;

      // 设置加载状态
      updateState({
        status: DataStatus.LOADING,
        error: null,
      });

      try {
        // 执行数据获取
        const result = await apiErrorHandler.executeWithRetry(
          fetcher,
          {
            requestId: finalConfig.cacheKey || `data_${Date.now()}`,
            operation: 'data_fetch',
          },
          {
            maxRetries: finalConfig.maxRetries,
            baseDelay: finalConfig.retryDelay,
            exponentialBackoff: true,
          }
        );

        // 验证数据
        if (!finalConfig.validateData(result)) {
          throw new Error('Data validation failed');
        }

        // 转换数据
        const transformedData = finalConfig.transformData(result);

        // 检查是否为空
        const isEmpty =
          transformedData == null ||
          (Array.isArray(transformedData) && transformedData.length === 0) ||
          (typeof transformedData === 'object' && Object.keys(transformedData).length === 0);

        // 更新状态
        updateState({
          data: transformedData,
          status: isEmpty ? DataStatus.EMPTY : DataStatus.SUCCESS,
          lastUpdated: new Date(),
          retryCount: 0,
        });

        // 调用成功回调
        finalConfig.onSuccess(transformedData);

        return transformedData;
      } catch (error) {
        // 处理错误
        const { error: apiError } = await apiErrorHandler.handleError(error, {
          requestId: finalConfig.cacheKey || `data_${Date.now()}`,
          operation: 'data_fetch',
        });

        updateState({
          status: DataStatus.ERROR,
          error: apiError,
          retryCount: state.retryCount + 1,
        });

        // 调用错误回调
        finalConfig.onError(apiError);

        return null;
      }
    },
    [finalConfig, updateState, state.retryCount]
  );

  // 重试函数
  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastFetcherRef.current) {
      Logger.warn('No fetcher available for retry');
      return null;
    }

    if (state.retryCount >= finalConfig.maxRetries) {
      Logger.warn('Maximum retry attempts reached');
      return null;
    }

    // 调用重试回调
    finalConfig.onRetry(state.retryCount + 1);

    return execute(lastFetcherRef.current);
  }, [execute, state.retryCount, finalConfig]);

  // 重置状态
  const reset = useCallback(() => {
    // 取消正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    updateState({
      data: null,
      status: DataStatus.IDLE,
      error: null,
      lastUpdated: null,
      retryCount: 0,
    });

    lastFetcherRef.current = null;
  }, [updateState]);

  // 手动设置数据
  const setData = useCallback(
    (data: T | null) => {
      const isEmpty =
        data == null ||
        (Array.isArray(data) && data.length === 0) ||
        (typeof data === 'object' && Object.keys(data).length === 0);

      updateState({
        data,
        status: isEmpty ? DataStatus.EMPTY : DataStatus.SUCCESS,
        error: null,
        lastUpdated: new Date(),
      });
    },
    [updateState]
  );

  // 手动设置错误
  const setError = useCallback(
    (error: any | null) => {
      updateState({
        status: error ? DataStatus.ERROR : DataStatus.IDLE,
        error,
      });
    },
    [updateState]
  );

  // 手动设置加载状态
  const setLoading = useCallback(
    (loading: boolean) => {
      updateState({
        status: loading ? DataStatus.LOADING : DataStatus.IDLE,
      });
    },
    [updateState]
  );

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return [
    state,
    {
      execute,
      retry,
      reset,
      setData,
      setError,
      setLoading,
    },
  ];
}

/**
 * 分页数据状态管理Hook
 */
export function usePaginatedDataState<T = any>(
  config: DataOperationConfig = {}
): [
  PaginatedDataState<T>,
  {
    execute: (
      fetcher: (page: number, limit: number) => Promise<{ data: T[]; total: number }>
    ) => Promise<T[] | null>;
    loadMore: () => Promise<T[] | null>;
    refresh: () => Promise<T[] | null>;
    reset: () => void;
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;
  },
] {
  const [baseState, baseActions] = useDataState<T[]>(config);

  const [paginationState, setPaginationState] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [loadingMore, setLoadingMore] = useState(false);
  const lastFetcherRef = useRef<
    ((page: number, limit: number) => Promise<{ data: T[]; total: number }>) | null
  >(null);

  // 更新分页信息
  const updatePagination = useCallback((total: number, page: number, limit: number) => {
    const totalPages = Math.ceil(total / limit);
    setPaginationState({
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  }, []);

  // 执行分页数据获取
  const execute = useCallback(
    async (
      fetcher: (page: number, limit: number) => Promise<{ data: T[]; total: number }>
    ): Promise<T[] | null> => {
      lastFetcherRef.current = fetcher;

      const result = await baseActions.execute(async () => {
        const response = await fetcher(paginationState.page, paginationState.limit);
        updatePagination(response.total, paginationState.page, paginationState.limit);
        return response.data;
      });

      return result;
    },
    [baseActions, paginationState.page, paginationState.limit, updatePagination]
  );

  // 加载更多数据
  const loadMore = useCallback(async (): Promise<T[] | null> => {
    if (!lastFetcherRef.current || !paginationState.hasNext || loadingMore) {
      return null;
    }

    setLoadingMore(true);

    try {
      const nextPage = paginationState.page + 1;
      const response = await lastFetcherRef.current(nextPage, paginationState.limit);

      // 合并数据
      const currentData = baseState.data || [];
      const newData = [...currentData, ...response.data];

      updatePagination(response.total, nextPage, paginationState.limit);
      baseActions.setData(newData);

      return newData;
    } catch (error) {
      Logger.error('Load more failed:', error);
      return null;
    } finally {
      setLoadingMore(false);
    }
  }, [lastFetcherRef, paginationState, loadingMore, baseState.data, baseActions, updatePagination]);

  // 刷新数据
  const refresh = useCallback(async (): Promise<T[] | null> => {
    if (!lastFetcherRef.current) {
      return null;
    }

    // 重置到第一页
    setPaginationState(prev => ({ ...prev, page: 1 }));

    return execute(lastFetcherRef.current);
  }, [execute]);

  // 重置状态
  const reset = useCallback(() => {
    baseActions.reset();
    setPaginationState({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
    setLoadingMore(false);
    lastFetcherRef.current = null;
  }, [baseActions]);

  // 设置页码
  const setPage = useCallback((page: number) => {
    setPaginationState(prev => ({ ...prev, page }));
  }, []);

  // 设置每页数量
  const setLimit = useCallback((limit: number) => {
    setPaginationState(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  // 组合状态
  const combinedState: PaginatedDataState<T> = {
    ...baseState,
    pagination: paginationState,
    loadingMore,
  };

  return [
    combinedState,
    {
      execute,
      loadMore,
      refresh,
      reset,
      setPage,
      setLimit,
    },
  ];
}

/**
 * 简化的数据获取Hook
 */
export function useAsyncData<T = any>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  config: DataOperationConfig = {}
) {
  const [state, actions] = useDataState<T>(config);

  // 自动执行数据获取
  useEffect(() => {
    actions.execute(fetcher);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    retry: actions.retry,
    refresh: () => actions.execute(fetcher),
  };
}

export default useDataState;
