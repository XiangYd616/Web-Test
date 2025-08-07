/**
 * 前端性能优化Hook
 * 提供组件懒加载、代码分割、性能监控等功能
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { errorService } from '../services/errorService';

// 性能指标接口
interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  bundleSize: number;
}

// 懒加载配置
interface LazyLoadConfig {
  threshold: number;
  rootMargin: string;
  triggerOnce: boolean;
}

// 性能优化Hook
export const usePerformanceOptimization = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
    memoryUsage: 0,
    bundleSize: 0
  });

  const [isOptimized, setIsOptimized] = useState(false);
  const performanceObserver = useRef<PerformanceObserver | null>(null);

  /**
   * 初始化性能监控
   */
  useEffect(() => {
    initPerformanceMonitoring();
    measureInitialMetrics();
    
    return () => {
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
    };
  }, []);

  /**
   * 初始化性能监控
   */
  const initPerformanceMonitoring = useCallback(() => {
    if ('PerformanceObserver' in window) {
      try {
        performanceObserver.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          processPerformanceEntries(entries);
        });

        // 监控导航、资源加载、用户交互等
        performanceObserver.current.observe({ 
          entryTypes: ['navigation', 'resource', 'measure', 'paint'] 
        });
      } catch (error) {
        console.warn('Performance monitoring not supported:', error);
      }
    }
  }, []);

  /**
   * 处理性能条目
   */
  const processPerformanceEntries = useCallback((entries: PerformanceEntry[]) => {
    entries.forEach((entry) => {
      switch (entry.entryType) {
        case 'navigation':
          const navEntry = entry as PerformanceNavigationTiming;
          updateMetrics({
            loadTime: navEntry.loadEventEnd - navEntry.navigationStart,
            renderTime: navEntry.domContentLoadedEventEnd - navEntry.navigationStart
          });
          break;
          
        case 'paint':
          if (entry.name === 'first-contentful-paint') {
            updateMetrics({
              renderTime: entry.startTime
            });
          }
          break;
          
        case 'measure':
          if (entry.name.includes('interaction')) {
            updateMetrics({
              interactionTime: entry.duration
            });
          }
          break;
      }
    });
  }, []);

  /**
   * 测量初始指标
   */
  const measureInitialMetrics = useCallback(() => {
    // 测量内存使用（如果支持）
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      updateMetrics({
        memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
      });
    }

    // 测量包大小（估算）
    const scripts = document.querySelectorAll('script[src]');
    let estimatedBundleSize = 0;
    scripts.forEach((script) => {
      // 这是一个粗略估算
      estimatedBundleSize += 100; // KB per script
    });
    
    updateMetrics({
      bundleSize: estimatedBundleSize
    });
  }, []);

  /**
   * 更新性能指标
   */
  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }));
  }, []);

  /**
   * 测量组件渲染时间
   */
  const measureRenderTime = useCallback((componentName: string) => {
    const startMark = `${componentName}-render-start`;
    const endMark = `${componentName}-render-end`;
    const measureName = `${componentName}-render-time`;

    return {
      start: () => {
        performance.mark(startMark);
      },
      end: () => {
        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);
        
        const measure = performance.getEntriesByName(measureName)[0];
        if (measure) {
          console.log(`${componentName} render time:`, measure.duration.toFixed(2), 'ms');
          return measure.duration;
        }
        return 0;
      }
    };
  }, []);

  /**
   * 预加载资源
   */
  const preloadResource = useCallback((url: string, type: 'script' | 'style' | 'image' = 'script') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    
    switch (type) {
      case 'script':
        link.as = 'script';
        break;
      case 'style':
        link.as = 'style';
        break;
      case 'image':
        link.as = 'image';
        break;
    }
    
    document.head.appendChild(link);
  }, []);

  /**
   * 懒加载图片
   */
  const useLazyImage = (src: string, config: Partial<LazyLoadConfig> = {}) => {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    const defaultConfig: LazyLoadConfig = {
      threshold: 0.1,
      rootMargin: '50px',
      triggerOnce: true,
      ...config
    };

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (defaultConfig.triggerOnce) {
              observer.disconnect();
            }
          } else if (!defaultConfig.triggerOnce) {
            setIsInView(false);
          }
        },
        {
          threshold: defaultConfig.threshold,
          rootMargin: defaultConfig.rootMargin
        }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (isInView && src && !imageSrc) {
        setImageSrc(src);
      }
    }, [isInView, src, imageSrc]);

    const handleLoad = useCallback(() => {
      setIsLoaded(true);
    }, []);

    return {
      ref: imgRef,
      src: imageSrc,
      isLoaded,
      isInView,
      onLoad: handleLoad
    };
  };

  /**
   * 防抖Hook
   */
  const useDebounce = <T>(value: T, delay: number): T => {
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
  };

  /**
   * 节流Hook
   */
  const useThrottle = <T extends (...args: any[]) => any>(
    callback: T,
    delay: number
  ): T => {
    const lastRun = useRef(Date.now());

    return useCallback(
      ((...args) => {
        if (Date.now() - lastRun.current >= delay) {
          callback(...args);
          lastRun.current = Date.now();
        }
      }) as T,
      [callback, delay]
    );
  };

  /**
   * 虚拟滚动Hook
   */
  const useVirtualScroll = <T>(
    items: T[],
    itemHeight: number,
    containerHeight: number
  ) => {
    const [scrollTop, setScrollTop] = useState(0);

    const visibleItems = useMemo(() => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + 1,
        items.length
      );

      return {
        startIndex,
        endIndex,
        items: items.slice(startIndex, endIndex),
        totalHeight: items.length * itemHeight,
        offsetY: startIndex * itemHeight
      };
    }, [items, itemHeight, containerHeight, scrollTop]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }, []);

    return {
      visibleItems,
      handleScroll,
      totalHeight: visibleItems.totalHeight
    };
  };

  /**
   * 代码分割动态导入
   */
  const useDynamicImport = <T>(importFunc: () => Promise<{ default: T }>) => {
    const [component, setComponent] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const loadComponent = useCallback(async () => {
      if (component) return component;

      setLoading(true);
      setError(null);

      try {
        const module = await importFunc();
        setComponent(module.default);
        return module.default;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load component');
        setError(error);
        errorService.handleError(error, { context: 'dynamic_import' });
        throw error;
      } finally {
        setLoading(false);
      }
    }, [importFunc, component]);

    return {
      component,
      loading,
      error,
      loadComponent
    };
  };

  /**
   * 性能优化建议
   */
  const getOptimizationSuggestions = useCallback(() => {
    const suggestions: string[] = [];

    if (metrics.loadTime > 3000) {
      suggestions.push('页面加载时间过长，考虑代码分割和懒加载');
    }

    if (metrics.renderTime > 1000) {
      suggestions.push('首次渲染时间过长，优化关键渲染路径');
    }

    if (metrics.memoryUsage > 50) {
      suggestions.push('内存使用过高，检查内存泄漏');
    }

    if (metrics.bundleSize > 1000) {
      suggestions.push('包体积过大，考虑代码分割和Tree Shaking');
    }

    return suggestions;
  }, [metrics]);

  /**
   * 应用性能优化
   */
  const applyOptimizations = useCallback(() => {
    // 预连接到重要域名
    const preconnectDomains = ['fonts.googleapis.com', 'fonts.gstatic.com'];
    preconnectDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = `https://${domain}`;
      document.head.appendChild(link);
    });

    // 设置资源提示
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = '//api.example.com';
    document.head.appendChild(link);

    setIsOptimized(true);
  }, []);

  return {
    metrics,
    isOptimized,
    measureRenderTime,
    preloadResource,
    useLazyImage,
    useDebounce,
    useThrottle,
    useVirtualScroll,
    useDynamicImport,
    getOptimizationSuggestions,
    applyOptimizations
  };
};

export default usePerformanceOptimization;
