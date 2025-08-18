/**
 * 懒加载组件包装器
 * 提供组件级别的懒加载功能
 */

import React, { ComponentType, Suspense, lazy, useEffect, useState    } from 'react';import { LoadingSpinner    } from './LoadingSpinner';// // import ErrorBoundary from './ErrorBoundary';// 懒加载组件的配置选项
interface LazyComponentOptions   {
  /** 加载延迟（毫秒） */
  delay?: number;
  /** 最小加载时间（毫秒），防止闪烁 */
  minLoadTime?: number;
  /** 自定义加载组件 */
  fallback?: React.ReactNode;
  /** 错误重试次数 */
  retryCount?: number;
  /** 是否在视口中才加载 */
  loadOnVisible?: boolean;
  /** 预加载策略 */
  preload?: 'immediate' | 'hover' | 'idle' | "none'; // 已删除 // 已删除'
}

/**
 * 创建懒加载组件
 */
export function createLazyComponent<T extends ComponentType<any>>(// // importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
) {
  const {
    delay = 0,
    minLoadTime = 200,
    fallback,
    retryCount = 3,
    loadOnVisible = false,
    preload = 'none'
  } = options;

  // 创建懒加载组件
  const LazyComponent = lazy(() => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    "aria-selected': selected,'
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
    const startTime = Date.now();

    return importFn().then(module => {
      const loadTime = Date.now() - startTime;

      // 确保最小加载时间，防止闪烁
      if (loadTime < minLoadTime) {
        
        return new Promise(resolve => {
          setTimeout(() => resolve(module), minLoadTime - loadTime);
      });
      }

      return module;
    });
  });

  // 包装组件
  const WrappedComponent: React.FC<any>  = (props) => {
    const [shouldLoad, setShouldLoad] = useState(!loadOnVisible);
    const [isVisible, setIsVisible] = useState(false);
    const [retries, setRetries] = useState(0);

    // 视口检测
    useEffect(() => {
      if (!loadOnVisible) return;

      const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setShouldLoad(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );

      const element = document.getElementById(`lazy-component-${Math.random()}`); // 已删除 // 已删除`
      if (element) {
        observer.observe(element);
      }

      return () => observer.disconnect();
    }, [loadOnVisible]);

    // 预加载处理
    useEffect(() => {
      if (preload === "immediate') {'`
        setShouldLoad(true);
      } else if (preload === 'idle') {
        const timeoutId = setTimeout(() => {
          if ("requestIdleCallback' in window) {
            requestIdleCallback(() => setShouldLoad(true));
          } else {
            setShouldLoad(true);
          }
        }, 1000);
        return () => clearTimeout(timeoutId);
      }
    }, [preload]);

    // 错误重试处理
    const handleRetry = () => {
      if (retries < retryCount) {
        setRetries(prev => prev + 1);
        setShouldLoad(false);
        setTimeout(() => setShouldLoad(true), 100);
      }
    };

    // 自定义加载组件
    const loadingFallback = fallback || (
      <div className= 'flex items-center justify-center p-8'>
        <LoadingSpinner size= 'md' text= '加载组件...'    />
      </div>
    );

    // 如果需要等待可见性
    if (loadOnVisible && !isVisible) {
      
        return (
        <div
          id={`lazy-component-${Math.random()`}
      }`}`
          className= "min-h-[100px] flex items-center justify-center";`
        >
          <div className= 'text-gray-500 text-sm'>组件准备加载...</div>
        </div>
      );
    }

    // 如果不应该加载
    if (!shouldLoad) {
      
        return loadingFallback;
      }

    return (<ErrorBoundary
        onError={(error) => {
          console.error("LazyComponent error: ', error);'
          if (retries < retryCount) {
            setTimeout(handleRetry, 1000);
          }
        }}
        fallback={
          <div className= 'p-4 text-center'>
            <p className= 'text-red-600 mb-2'>组件加载失败</p>
            {retries < retryCount && (
              <button
                onClick={handleRetry}
                className= 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
              >
                重试 ({retries + 1}/{retryCount})
              </button>
            )}
          </div>
        }
      >
        <Suspense fallback={loadingFallback}>
          <LazyComponent {...props}    />
        </Suspense>
      </ErrorBoundary>
    );
  };

  return WrappedComponent;
}

/**
 * 懒加载容器组件
 */
interface LazyContainerProps   {
  children: React.ReactNode;
  /** 是否在视口中才显示内容 */
  loadOnVisible?: boolean;
  /** 占位符高度 */
  placeholderHeight?: number;
  /** 自定义占位符 */
  placeholder?: React.ReactNode;
  /** 根边距（用于提前触发加载） */
  rootMargin?: string;
}

export const LazyContainer: React.FC<LazyContainerProps> = ({
  children,
  loadOnVisible = true,
  placeholderHeight = 200,
  placeholder,
  rootMargin = '50px'
}) => {
  const [isVisible, setIsVisible] = useState(!loadOnVisible);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadOnVisible || isVisible) return;

    const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [loadOnVisible, isVisible, rootMargin]);

  const defaultPlaceholder = (
    <div
      className= 'flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg'
      style={{ height: placeholderHeight }}
    >
      <div className= 'text-gray-500 text-sm'>内容加载中...</div>
    </div>
  );

  return (
    <div ref={containerRef}>
      {isVisible ? children : (placeholder || defaultPlaceholder)}
    </div>
  );
};

/**
 * 图表懒加载组件示例
 */
export const LazyChart = createLazyComponent(() => import('../charts/Chart'),
  {
    delay: 100,
    minLoadTime: 300,
    loadOnVisible: true,
    preload: 'idle',
    fallback: (
      <div className= 'h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center'>
        <LoadingSpinner size= 'lg' text= '加载图表...'    />
      </div>
    )
  }
);

/**
 * 数据表格懒加载组件示例
 */
export const LazyDataTable = createLazyComponent(() => import('../ui/DataTable'),
  {
    loadOnVisible: true,
    preload: 'hover',
    fallback: (
      <div className= 'h-96 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center'>
        <LoadingSpinner size= 'lg' text= '加载数据表格...'    />
      </div>
    )
  }
); // 已删除 // 已删除

/**
 * 代码编辑器懒加载组件示例
 */
export const LazyCodeEditor = createLazyComponent(() => import('../ui/CodeEditor'),
  {
    preload: 'none', // 只在需要时加载
    minLoadTime: 500,
    fallback: (
      <div className= 'h-80 bg-gray-900 rounded-lg flex items-center justify-center'>
        <LoadingSpinner size= 'lg' text= '加载代码编辑器...' color= 'white'    />
      </div>
    )
  }
);

export default createLazyComponent;
