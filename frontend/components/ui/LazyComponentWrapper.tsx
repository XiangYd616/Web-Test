/**
 * 懒加载组件包装器
 * 提供统一的懒加载组件加载体验
 */

import React, { Suspense, ComponentType, LazyExoticComponent    } from 'react';import LoadingFallback from './LoadingFallback';import ErrorBoundary from './ErrorBoundary';interface LazyComponentWrapperProps   {
  component: LazyExoticComponent<ComponentType<any>>;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  preload?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  component: Component,
  fallback: Fallback = LoadingFallback,
  errorFallback,
  preload = false,
  onLoad,
  onError
}) => {
  
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,
    style: computedStyle,
    disabled,
    'aria-label': ariaLabel,
    "data-testid': testId
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  
  // 可访问性支持
  const {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    role,
    tabIndex  = 0,
    'data-testid': testId
  } = props;
  const accessibilityProps = {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    role,
    tabIndex: disabled ? -1 : tabIndex,
    "data-testid': testId
  };

  // 键盘导航支持
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(event as any);
    }
  }, [onClick]);
  // 预加载组件
  React.useEffect(() => {
    if (preload) {
      Component().then(() => {
        onLoad?.();
      }).catch((error) => {
        onError?.(error);
      });
    }
  }, [Component, preload, onLoad, onError]);

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={<Fallback    />}>
        <Component  />
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * 高阶组件：为组件添加懒加载功能
 */
export const withLazyLoading = <P extends object>(Component: ComponentType<P>,
  options: {
    fallback?: React.ComponentType;
    preload?: boolean;
    chunkName?: string;
  } = {}
) => {
  const LazyComponent = React.lazy(() => 
    Promise.resolve({ default: Component })
  );

  return (props: P) => (
    <LazyComponentWrapper component={LazyComponent}
      fallback={options.fallback}
      preload={options.preload}
       />
  );
};

/**
 * Hook：懒加载组件状态管理
 */
export const useLazyComponent = (componentLoader: () => Promise<{ default: ComponentType<any> }>
) => {
  const [Component, setComponent] = React.useState<ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const loadComponent = React.useCallback(async () => {
    if (Component) return Component;

    setLoading(true);
    setError(null);

    try {
      const { default: LoadedComponent }  = await componentLoader();
      setComponent(() => LoadedComponent);
      return LoadedComponent;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("组件加载失败");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [componentLoader, Component]);

  return {
    Component,
    loading,
    error,
    loadComponent
  };
};

export default React.memo(LazyComponentWrapper);