/**
 * ͳһ����״̬����
 * �ṩloading��error��success״̬��ͳһ����
 * �汾: v1.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError } from '../types/api.types';
import type { ApiResponse } from '../types/api';

// ==================== ״̬���Ͷ��� ====================

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

// ==================== ����״̬����Hook ====================

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

  // ��������״̬
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

  // ״̬�仯�ص�
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // ����ʱ��
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // ִ���첽����
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

      // �Զ������߼�
      if (autoRetry && retryCount < retryLimit && apiError.retryable !== false) {
        setRetryCount(prev => prev + 1);
        retryTimeoutRef.current = setTimeout(() => {
          execute(operation);
        }, retryDelay * Math.pow(2, retryCount)); // ָ���˱�
      }

      return null;
    }
  }, [autoRetry, retryCount, retryLimit, retryDelay, onSuccess, onError]);

  // ���Բ���
  const retry = useCallback(async (): Promise<T | null> => {
    if (lastOperationRef.current) {
      setRetryCount(prev => prev + 1);
      return execute(lastOperationRef.current);
    }
    return null;
  }, [execute]);

  // ����״̬
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

  // �ֶ���������
  const setDataManually = useCallback((newData: T) => {
    setData(newData);
    setState('success');
    setLastUpdated(new Date().toISOString());
    setError(null);
  }, []);

  // �ֶ����ô���
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

// ==================== ��������״̬���� ====================

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

  // ��������״̬��Ϣ
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

  // ����ȫ��״̬
  const states = Object.values(batchInfo.states);
  batchInfo.allLoading = states.some(s => s?.loading);
  batchInfo.allSuccess = states.every(s => s?.success);
  batchInfo.hasAnyError = states.some(s => s?.hasError);
  batchInfo.completedCount = states.filter(s => s?.success || s?.hasError).length;

  /**

   * if���ܺ���

   * @param {Object} params - ��������

   * @returns {Promise<Object>} ���ؽ��

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

  // ִ�е�������
  const execute = useCallback(async (key: string, operation: AsyncOperation) => {
    const stateHook = stateHooks[key];
    if (stateHook) {
      return stateHook[1].execute(operation);
    }
    return null;
  }, [stateHooks]);

  // ִ�����в���
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

  // ���Ե�������
  const retry = useCallback(async (key: string) => {
    const stateHook = stateHooks[key];
    if (stateHook) {
      return stateHook[1].retry();
    }
    return null;
  }, [stateHooks]);

  // ��������ʧ�ܵĲ���
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

  // ����״̬
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

// ==================== ��ҳ����״̬���� ====================

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

  // �����ҳ��Ϣ
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

  // ����ָ��ҳ��
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

    // ����API��Ӧ������ҳ��Ϣ
    // ʵ��ʵ������Ҫ����API��Ӧ��ʽ����
    if (result && Array.isArray(result)) {
      // ����Ӧ�ô�API��Ӧ��meta��Ϣ�л�ȡtotal
      // setTotal(response.meta.pagination.total);
    }

    return result;
  }, [dataActions]);

  // ���ظ�������
  const loadMore = useCallback(async (operation: AsyncOperation<T[]>): Promise<T[] | null> => {
    if (!hasNext || isLoadingMore) {
      return null;
    }

    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;

      /**

       * if���ܺ���

       * @param {Object} params - ��������

       * @returns {Promise<Object>} ���ؽ��

       */
      const result = await loadPage(operation, nextPage);

      if (result && dataState.data) {
        // �ϲ�����
        const mergedData = [...dataState.data, ...result];
        dataActions.setData(mergedData);
      }

      return result;
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasNext, isLoadingMore, page, loadPage, dataState.data, dataActions]);

  // ˢ�µ�ǰҳ
  const refresh = useCallback(async (): Promise<T[] | null> => {
    if (lastOperationRef.current) {
      return loadPage(lastOperationRef.current, page, limit);
    }
    return null;
  }, [loadPage, page, limit]);

  // ����״̬
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

// ==================== ʵʱ����״̬���� ====================

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

  // ͬ������
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

  // ��ʼͬ��
  const startSync = useCallback((operation: AsyncOperation<T>) => {
    currentOperationRef.current = operation;
    setIsConnected(true);

    // ����ִ��һ��
    if (autoSync) {
      sync();
    }

    // ���ö�ʱͬ��
    syncIntervalRef.current = setInterval(sync, syncInterval);
  }, [sync, syncInterval, autoSync]);

  // ֹͣͬ��
  const stopSync = useCallback(() => {
    setIsConnected(false);
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  // ����״̬
  const reset = useCallback(() => {
    stopSync();
    dataActions.reset();
    setLastSync(null);
    currentOperationRef.current = null;
  }, [stopSync, dataActions]);

  // ����
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

// ==================== ����Ĭ������ ====================

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
