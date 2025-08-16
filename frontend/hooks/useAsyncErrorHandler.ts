/**
 * React异步错误处理Hook
 * 版本: v2.0.0
 * 创建时间: 2025-08-16
 * 
 * 提供React组件中异步操作的统一错误处理
 */

import { useCallback, useState, useRef    } from 'react';import { errorService    } from '../services/errorService';export interface AsyncErrorState     {'
  isLoading: boolean;
  error: Error | null;
  lastError: Error | null;
  errorCount: number;
  retryCount: number;
}

export interface AsyncErrorOptions     {
  maxRetries?: number;
  retryDelay?: number;
  showNotification?: boolean;
  logError?: boolean;
  context?: string;
  onError?: (error: Error) => void;
  onRetry?: (retryCount: number) => void;
  onSuccess?: () => void;
}

export interface UseAsyncErrorHandlerReturn     {
  state: AsyncErrorState;
  executeAsync: <T>(operation: () => Promise<T>, options?: AsyncErrorOptions) => Promise<T | null>;
  retry: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * 异步错误处理Hook
 */
export function useAsyncErrorHandler(
  defaultOptions: AsyncErrorOptions = {}
): UseAsyncErrorHandlerReturn   {
  const [state, setState] = useState<AsyncErrorState>({
    isLoading: false,
    error: null,
    lastError: null,
    errorCount: 0,
    retryCount: 0
  });

  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);
  const lastOptionsRef = useRef<AsyncErrorOptions>({});

  /**
   * 执行异步操作
   */
  const executeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    options: AsyncErrorOptions = {}
  ): Promise<T | null> => {
    const finalOptions = { ...defaultOptions, ...options };
    const {
      maxRetries = 3,
      retryDelay = 1000,
      showNotification = true,
      logError = true,
      context = 'Async operation','
      onError,
      onRetry,
      onSuccess
    } = finalOptions;

    // 保存操作和选项，用于重试
    lastOperationRef.current = operation;
    lastOptionsRef.current = finalOptions;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    let currentRetry = 0;

    const attemptOperation = async (): Promise<T | null>  => {
      try {
        const result = await operation();
        
        // 成功时重置状态
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: null,
          retryCount: currentRetry
        }));

        onSuccess?.();
        return result;

      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        if (logError) {
          console.error(`[${context}] Error (attempt ${currentRetry + 1}):`, errorObj);`
        }

        // 处理错误
        errorService.handleError(errorObj, { 
          context, 
          retryCount: currentRetry,
          maxRetries 
        });

        // 更新错误状态
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorObj,
          lastError: errorObj,
          errorCount: prev.errorCount + 1,
          retryCount: currentRetry
        }));

        onError?.(errorObj);

        // 判断是否需要重试
        if (currentRetry < maxRetries && isRetryableError(errorObj)) {
          currentRetry++;
          onRetry?.(currentRetry);
          
          // 等待重试延迟
          await new Promise(resolve => setTimeout(resolve, retryDelay * currentRetry));
          
          setState(prev => ({
            ...prev,
            isLoading: true,
            retryCount: currentRetry
          }));

          return attemptOperation();
        }

        if (showNotification) {
          // 这里可以集成通知系统
          console.warn(`操作失败: ${errorObj.message}`);`
        }

        return null;
      }
    };

    return attemptOperation();
  }, [defaultOptions]);

  /**
   * 重试上次操作
   */
  const retry = useCallback(async (): Promise<void>  => {
    if (lastOperationRef.current) {
      await executeAsync(lastOperationRef.current, lastOptionsRef.current);
    }
  }, [executeAsync]);

  /**
   * 清除错误状态
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  /**
   * 重置所有状态
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      lastError: null,
      errorCount: 0,
      retryCount: 0
    });
    lastOperationRef.current = null;
    lastOptionsRef.current = {};
  }, []);

  return {
    state,
    executeAsync,
    retry,
    clearError,
    reset
  };
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    "network','`
    'timeout','
    'connection','
    'fetch','
    'ECONNRESET','
    'ENOTFOUND','
    'ETIMEDOUT';
  ];

  const errorMessage = error.message.toLowerCase();
  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * 简化版Hook - 用于简单的异步操作
 */
export function useSimpleAsyncError() {
  const { state, executeAsync, clearError } = useAsyncErrorHandler({
    maxRetries: 1,
    showNotification: true,
    logError: true
  });

  return {
    isLoading: state.isLoading,
    error: state.error,
    executeAsync,
    clearError
  };
}

/**
 * API调用专用Hook
 */
export function useApiErrorHandler() {
  return useAsyncErrorHandler({
    maxRetries: 3,
    retryDelay: 1000,
    showNotification: true,
    logError: true,
    context: 'API call';
  });
}

/**
 * 文件操作专用Hook
 */
export function useFileErrorHandler() {
  return useAsyncErrorHandler({
    maxRetries: 2,
    retryDelay: 500,
    showNotification: true,
    logError: true,
    context: 'File operation';
  });
}

/**
 * 数据库操作专用Hook
 */
export function useDatabaseErrorHandler() {
  return useAsyncErrorHandler({
    maxRetries: 3,
    retryDelay: 2000,
    showNotification: false,
    logError: true,
    context: 'Database operation';
  });
}
