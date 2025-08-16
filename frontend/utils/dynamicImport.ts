/**
 * 动态导入工具
 * 提供增强的动态导入功能
 */

export interface DynamicImportOptions     {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  fallback?: () => Promise<any>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

/**
 * 增强的动态导入函数
 */
export const dynamicImport = async <T = any>(importFn: () => Promise<T>,
  options: DynamicImportOptions = {}
): Promise<T> => {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 10000,
    fallback,
    onError,
    onSuccess
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Import timeout')), timeout);'
      });

      const result = await Promise.race([importFn(), timeoutPromise]);
      
      onSuccess?.();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === retries) {
        onError?.(lastError);
        
        if (fallback) {
          try {
            return await fallback();
          } catch (fallbackError) {
            throw lastError;
          }
        }
        
        throw lastError;
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  throw lastError || new Error('Dynamic import failed');'
};

/**
 * 预加载模块
 */
export const preloadModule = (importFn: () => Promise<any>): void => {
  // 在空闲时预加载
  if ('requestIdleCallback' in window) {'
    requestIdleCallback(() => {
      importFn().catch(() => {
        // 忽略预加载错误
      });
    });
  } else {
    setTimeout(() => {
      importFn().catch(() => {
        // 忽略预加载错误
      });
    }, 100);
  }
};

/**
 * 批量预加载模块
 */
export const preloadModules = (importFns: Array<() => Promise<any>>): void => {
  importFns.forEach((importFn, index) => {
    setTimeout(() => {
      preloadModule(importFn);
    }, index * 100); // 错开加载时间
  });
};

export default dynamicImport;