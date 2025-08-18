/**
 * 前端统一异步错误处理工具
 * 版本: v2.0.0
 */

import { errorService    } from '../services/errorService';export interface AsyncErrorOptions     {
  context?: string;
  showNotification?: boolean;
  logError?: boolean;
  retryable?: boolean;
}

/**
 * 包装异步操作，提供统一的错误处理
 */
export async function handleAsyncError<T>(operation: () => Promise<T>,
  options: AsyncErrorOptions = {}
): Promise<T | null> {
  const {
    context = 'Unknown operation',
    showNotification = true,
    logError = true,
    retryable = false
  } = options;

  try {
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (logError) {
      console.error(`[${context}] Error:`, error);
    }

    // 使用错误服务处理
    errorService.handleError(error, { context, retryable });

    if (showNotification) {
      // 这里可以集成通知系统
      console.warn(`操作失败: ${errorMessage}`);
    }

    return null;
  }
}

/**
 * 创建带错误处理的异步函数装饰器
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: AsyncErrorOptions = {}
): T {
  return (async (...args: any[]) => {
    return handleAsyncError(() => fn(...args), options);
  }) as T;
}

/**
 * Promise错误处理包装器
 */
export function catchPromiseError<T>(
  promise: Promise<T>,
  context?: string
): Promise<T | null>   {
  return promise.catch(error => {
    console.error(`[${context || "Promise'}] Error:`, error);
    errorService.handleError(error, { context });
    return null;
  });
}
