/**
 * 性能优化相关的React Hook
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { frontendCache, lazyImageLoader, performanceMonitor, // performanceUtils } from '../utils/performanceUtils'; // 已修复
/**
 * 图片懒加载Hook
 */
export function useLazyImage() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => setLoaded(true);
    const handleError = () => setError(true);

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    // 开始观察图片
    lazyImageLoader.observe(img);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      lazyImageLoader.unobserve(img);
    };
  }, []);

  return { imgRef, loaded, error };
}

/**
 * 性能监控Hook
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [coreVitals, setCoreVitals] = useState<{ LCP?: number; FID?: number; CLS?: number }>({});

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
      setCoreVitals(performanceMonitor.getCoreWebVitals());
    };

    // 初始更新
    updateMetrics();

    // 定期更新指标
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  const sendMetrics = useCallback(() => {
    performanceMonitor.sendMetrics();
  }, []);

  return { metrics, coreVitals, sendMetrics };
}

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
  const throttledCallback = useRef(
    performanceUtils.throttle(callback, delay)
  );

  useEffect(() => {
    throttledCallback.current = performanceUtils.throttle(callback, delay);
  }, [callback, delay]);

  return throttledCallback.current as T;
}

/**
 * 空闲时执行Hook
 */
export function useIdleCallback(callback: () => void, deps: React.DependencyList) {
  useEffect(() => {
    performanceUtils.runWhenIdle(callback);
  }, deps);
}

/**
 * 前端缓存Hook
 */
export function useFrontendCache<T>(key: string, fetcher: () => Promise<T>, ttl?: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    // 先尝试从缓存获取
    const cached = frontendCache.get(key);
    if (cached) {
      
        setData(cached);
      return;
      }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      frontendCache.set(key, result, ttl);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const invalidate = useCallback(() => {
    frontendCache.delete(key);
    fetchData();
  }, [key, fetchData]);

  return { data, loading, error, refetch: fetchData, invalidate };
}

/**
 * 网络状态Hook
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const [networkType, setNetworkType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 检查网络连接类型
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setNetworkType(connection.effectiveType || 'unknown');
      setIsSlowNetwork(performanceUtils.isSlowNetwork());

      const handleConnectionChange = () => {
        setNetworkType(connection.effectiveType || 'unknown');
        setIsSlowNetwork(performanceUtils.isSlowNetwork());
      };

      connection.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSlowNetwork, networkType };
}

/**
 * 设备性能Hook
 */
export function useDevicePerformance() {
  const [performanceLevel, setPerformanceLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [deviceInfo, setDeviceInfo] = useState({
    cores: navigator.hardwareConcurrency || 4,
    memory: (navigator as any).deviceMemory || 4,
    platform: navigator.platform
  });

  useEffect(() => {
    setPerformanceLevel(performanceUtils.getDevicePerformanceLevel());
  }, []);

  return { performanceLevel, deviceInfo };
}

/**
 * 可见性Hook（用于暂停不可见组件的更新）
 */
export function useVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * 内存使用监控Hook
 */
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          used: memory.usedJSHeapSize,
          total: memory.jsHeapSizeLimit,
          percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 10000); // 每10秒更新

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

/**
 * 组件渲染性能监控Hook
 */
export function useRenderPerformance(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const totalRenderTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    totalRenderTime.current += renderTime;

    // 如果渲染时间过长，发出警告
    if (renderTime > 16) { // 超过一帧的时间
      console.warn(`Component ${componentName} render took ${renderTime.toFixed(2)}ms`);
    }

    // 每100次渲染报告一次平均性能
    if (renderCount.current % 100 === 0) {
      const avgRenderTime = totalRenderTime.current / renderCount.current;
      console.log(`Component ${componentName} average render time: ${avgRenderTime.toFixed(2)}ms over ${renderCount.current} renders`);
    }
  });

  return {
    renderCount: renderCount.current,
    averageRenderTime: renderCount.current > 0 ? totalRenderTime.current / renderCount.current : 0
  };
}

/**
 * 虚拟滚动Hook
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

  const visibleItems = items.slice(startIndex, endIndex + 1);

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
 * 主要的性能优化Hook
 * 整合所有性能相关功能
 */
export function usePerformanceOptimization() {
  const { metrics: performanceMetrics } = usePerformanceMonitor();
  const { performanceLevel } = useDevicePerformance();
  const { isSlowNetwork } = useNetworkStatus();
  const memoryInfo = useMemoryMonitor();

  // 综合性能指标
  const metrics = useMemo(() => ({
    loadTime: performanceMetrics.loadTime || 0,
    renderTime: performanceMetrics.renderTime || 0,
    memoryUsage: memoryInfo ? memoryInfo.used / (1024 * 1024) : 0, // 转换为MB
    bundleSize: performanceMetrics.bundleSize || 0,
    ...performanceMetrics
  }), [performanceMetrics, memoryInfo]);

  // 渲染时间测量
  const measureRenderTime = useCallback((componentName: string) => {
    let startTime: number;

    return {
      start: () => {
        startTime = performance.now();
      },
      end: () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
        return renderTime;
      }
    };
  }, []);

  // 获取优化建议
  const getOptimizationSuggestions = useCallback(() => {
    const suggestions: string[] = [];

    if (metrics.loadTime > 3000) {
      suggestions.push('页面加载时间过长，建议优化资源加载');
    }

    if (metrics.renderTime > 1000) {
      suggestions.push('组件渲染时间过长，建议使用React.memo或useMemo优化');
    }

    if (metrics.memoryUsage > 50) {
      suggestions.push('内存使用过高，建议检查内存泄漏');
    }

    if (metrics.bundleSize > 1000) {
      suggestions.push('包体积过大，建议启用代码分割');
    }

    if (isSlowNetwork) {
      suggestions.push('检测到慢速网络，建议启用资源压缩和缓存');
    }

    if (performanceLevel === 'low') {
      suggestions.push('检测到低性能设备，建议降低动画复杂度');
    }

    return suggestions;
  }, [metrics, isSlowNetwork, performanceLevel]);

  // 应用优化
  const applyOptimizations = useCallback(() => {
    // 根据设备性能调整设置
    if (performanceLevel === 'low') {
      // 禁用复杂动画
      document.documentElement.style.setProperty('--animation-duration', '0s');
    }

    // 根据网络状况调整
    if (isSlowNetwork) {
      // 启用数据压缩
      localStorage.setItem('enableCompression', 'true');
    }

    // 清理缓存
    if (metrics.memoryUsage > 50) {
      frontendCache.clear();
    }

    console.log('Performance optimizations applied');
  }, [performanceLevel, isSlowNetwork, metrics.memoryUsage]);

  return {
    metrics,
    measureRenderTime,
    getOptimizationSuggestions,
    applyOptimizations,
    performanceLevel,
    isSlowNetwork
  };
}