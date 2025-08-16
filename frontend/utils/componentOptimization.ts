/**
 * 组件优化工具
 * 提供组件级性能优化策略
 */

import React, { memo, forwardRef, ComponentType } from 'react';

/**
 * 高阶组件：性能优化包装器
 */
export const withPerformanceOptimization = <P extends object>(
  Component: ComponentType<P>,
  options: {
    memoize?: boolean;
    displayName?: string;
    areEqual?: (prevProps: P, nextProps: P) => boolean;
  } = {}
) => {
  const {
    memoize = true,
    displayName,
    areEqual
  } = options;

  let OptimizedComponent = Component;

  // 应用React.memo
  if (memoize) {
    OptimizedComponent = memo(Component, areEqual);
  }

  // 设置显示名称
  if (displayName) {
    OptimizedComponent.displayName = displayName;
  }

  return OptimizedComponent;
};

/**
 * 深度比较函数
 */
export const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) return false;

  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 !== 'object') return obj1 === obj2;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
};

/**
 * 浅比较函数
 */
export const shallowEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
};

/**
 * 组件性能分析器
 */
export const withProfiler = <P extends object>(
  Component: ComponentType<P>,
  id: string
) => {
  return forwardRef<any, P>((props, ref) => {
    const onRender = (
      id: string,
      phase: 'mount' | 'update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number
    ) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Profiler [${id}] ${phase}:`, {
          actualDuration,
          baseDuration,
          startTime,
          commitTime
        });
      }
    };

    return (
      <React.Profiler id={id} onRender={onRender}>
        <Component {...props} ref={ref} />
      </React.Profiler>
    );
  });
};

/**
 * 条件渲染优化
 */
export const ConditionalRender: React.FC<{
  condition: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  keepMounted?: boolean;
}> = ({ condition, children, fallback = null, keepMounted = false }) => {
  if (keepMounted) {
    return (
      <div style={{ display: condition ? 'block' : 'none' }}>
        {children}
      </div>
    );
  }

  return condition ? <>{children}</> : <>{fallback}</>;
};

/**
 * 延迟渲染组件
 */
export const DeferredRender: React.FC<{
  children: React.ReactNode;
  delay?: number;
  fallback?: React.ReactNode;
}> = ({ children, delay = 100, fallback = null }) => {
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return shouldRender ? <>{children}</> : <>{fallback}</>;
};

export default {
  withPerformanceOptimization,
  deepEqual,
  shallowEqual,
  withProfiler,
  ConditionalRender,
  DeferredRender
};