/**
 * 性能优化工具集
 * 提供防抖、节流、缓存等性能优化功能
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 内存缓存类
export class MemoryCache<T = any> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private defaultTTL: number;

  constructor(defaultTTL = 5 * 60 * 1000) { // 默认5分钟
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // 清理过期项
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

// 全局缓存实例
export const globalCache = new MemoryCache();

// React Hooks for performance

/**
 * 防抖Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流Hook
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttledCallback = useCallback(
    throttle(callback, delay),
    [callback, delay]
  );

  return throttledCallback as T;
}

/**
 * 防抖回调Hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const debouncedCallback = useCallback(
    debounce(callback, delay),
    [delay, ...deps]
  );

  return debouncedCallback as T;
}

/**
 * 缓存Hook
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T> | T,
  ttl?: number
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    // 先检查缓存
    const cached = globalCache.get(key);
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      globalCache.set(key, result, ttl);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    globalCache.delete(key);
    fetchData();
  }, [key, fetchData]);

  return { data, loading, error, refresh };
}

/**
 * 虚拟滚动Hook
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex
  };
}

/**
 * 懒加载Hook
 */
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, options]);

  return isVisible;
}

/**
 * 性能监控Hook
 */
export function usePerformanceMonitor(name: string) {
  const startTimeRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = performance.now();
    
    return () => {
      if (startTimeRef.current) {
        const duration = performance.now() - startTimeRef.current;
        console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`);
        
        // 可以发送到分析服务
        if (duration > 100) {
          console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
        }
      }
    };
  }, [name]);
}

/**
 * 批处理更新Hook
 */
export function useBatchedUpdates<T>(
  initialValue: T[],
  batchSize = 10,
  delay = 100
): {
  items: T[];
  addItem: (item: T) => void;
  addItems: (items: T[]) => void;
  clear: () => void;
} {
  const [items, setItems] = useState<T[]>(initialValue);
  const pendingUpdatesRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length > 0) {
      setItems(prev => [...prev, ...pendingUpdatesRef.current]);
      pendingUpdatesRef.current = [];
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(flushUpdates, delay);
  }, [flushUpdates, delay]);

  const addItem = useCallback((item: T) => {
    pendingUpdatesRef.current.push(item);
    
    if (pendingUpdatesRef.current.length >= batchSize) {
      flushUpdates();
    } else {
      scheduleFlush();
    }
  }, [batchSize, flushUpdates, scheduleFlush]);

  const addItems = useCallback((newItems: T[]) => {
    pendingUpdatesRef.current.push(...newItems);
    
    if (pendingUpdatesRef.current.length >= batchSize) {
      flushUpdates();
    } else {
      scheduleFlush();
    }
  }, [batchSize, flushUpdates, scheduleFlush]);

  const clear = useCallback(() => {
    pendingUpdatesRef.current = [];
    setItems([]);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { items, addItem, addItems, clear };
}
