/**
 * usePerformance - 性能优化Hooks
 *
 * 文件路径: frontend/components/common/TestHistory/hooks/usePerformance.ts
 * 创建时间: 2025-11-14
 *
 * 功能特性:
 * - 防抖 (Debounce)
 * - 节流 (Throttle)
 * - 懒加载
 * - Memoization
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * 防抖Hook
 * 延迟执行，在指定时间内只执行最后一次
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖函数Hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * 节流Hook
 * 在指定时间内最多执行一次
 */
export function useThrottle<T>(value: T, interval: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted.current;

    if (timeSinceLastExecution >= interval) {
      lastExecuted.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastExecution);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [value, interval]);

  return throttledValue;
}

/**
 * 节流函数Hook
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const lastRan = useRef(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      }
    },
    [callback, delay]
  );
}

/**
 * 懒加载图片Hook
 */
export function useLazyLoad<T extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit
) {
  const elementRef = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return { ref: elementRef, isVisible };
}

/**
 * Intersection Observer Hook
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit
) {
  const elementRef = useRef<T>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return { ref: elementRef, entry, isIntersecting: entry?.isIntersecting ?? false };
}

/**
 * 虚拟滚动Hook (简化版)
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const totalHeight = items.length * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, i) => ({
      item,
      index: startIndex + i,
      offsetTop: (startIndex + i) * itemHeight,
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    startIndex,
    endIndex,
    handleScroll,
  };
}

/**
 * 窗口滚动优化Hook
 */
export function useScrollOptimization() {
  const [scrollY, setScrollY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          setIsScrolling(true);
          ticking = false;

          // 清除之前的超时
          if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
          }

          // 设置新的超时
          scrollTimeout.current = setTimeout(() => {
            setIsScrolling(false);
          }, 150);
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  return { scrollY, isScrolling };
}

/**
 * 组件可见性Hook
 */
export function useVisibility<T extends HTMLElement = HTMLElement>() {
  const elementRef = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref: elementRef, isVisible };
}

/**
 * 请求去重Hook
 */
export function useRequestDeduplication() {
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map());

  const dedupedFetch = useCallback(
    async <T>(key: string, fetchFn: () => Promise<T>): Promise<T> => {
      // 如果已有相同请求在进行中，返回该请求
      if (pendingRequests.current.has(key)) {
        return pendingRequests.current.get(key)!;
      }

      // 创建新请求
      const promise = fetchFn().finally(() => {
        // 请求完成后清除
        pendingRequests.current.delete(key);
      });

      pendingRequests.current.set(key, promise);
      return promise;
    },
    []
  );

  const clear = useCallback((key?: string) => {
    if (key) {
      pendingRequests.current.delete(key);
    } else {
      pendingRequests.current.clear();
    }
  }, []);

  return { dedupedFetch, clear };
}

/**
 * 深度Memoization Hook
 */
export function useDeepMemo<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<{ deps: any[]; value: T }>();

  if (!ref.current || !areDeepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}

/**
 * 深度比较函数
 */
function areDeepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => areDeepEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => areDeepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * 批处理更新Hook
 */
export function useBatchUpdate<T>(initialValue: T[], batchSize: number = 50) {
  const [items, setItems] = useState<T[]>(initialValue);
  const [displayCount, setDisplayCount] = useState(batchSize);

  const displayedItems = useMemo(() => {
    return items.slice(0, displayCount);
  }, [items, displayCount]);

  const loadMore = useCallback(() => {
    setDisplayCount(prev => Math.min(prev + batchSize, items.length));
  }, [items.length, batchSize]);

  const hasMore = displayCount < items.length;

  return {
    displayedItems,
    hasMore,
    loadMore,
    setItems,
  };
}

export default {
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useThrottledCallback,
  useLazyLoad,
  useIntersectionObserver,
  useVirtualScroll,
  useScrollOptimization,
  useVisibility,
  useRequestDeduplication,
  useDeepMemo,
  useBatchUpdate,
};
