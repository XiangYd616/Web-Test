/**
 * 组件设计模式工具
 * 提供常用的React设计模式和高阶组件
 */

import React, { 
  ComponentType, 
  ReactNode, 
  createContext, 
  useContext, 
  useState, 
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  memo
} from 'react';

// 通用Props类型
export interface BaseProps {
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

// 加载状态类型
export interface LoadingState {
  loading: boolean;
  error?: Error | null;
}

// 1. 高阶组件：withLoading
export function withLoading<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  const WithLoadingComponent = (props: P & LoadingState) => {
    const { loading, error, ...restProps } = props;

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-8 text-red-500">
          <span>错误: {error.message}</span>
        </div>
      );
    }

    return <WrappedComponent {...(restProps as P)} />;
  };

  WithLoadingComponent.displayName = `withLoading(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithLoadingComponent;
}

// 2. 高阶组件：withErrorBoundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  fallback?: ComponentType<{ error: Error; resetError: () => void }>
) {
  class ErrorBoundaryWrapper extends React.Component<
    P,
    { hasError: boolean; error?: Error }
  > {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Component Error:', error, errorInfo);
    }

    resetError = () => {
      this.setState({ hasError: false, error: undefined });
    };

    render() {
      if (this.state.hasError) {
        const FallbackComponent = fallback || DefaultErrorFallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            resetError={this.resetError} 
          />
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  }

  ErrorBoundaryWrapper.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ErrorBoundaryWrapper;
}

// 默认错误回退组件
const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <div className="flex flex-col items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50">
    <h3 className="text-lg font-semibold text-red-800 mb-2">组件错误</h3>
    <p className="text-red-600 mb-4">{error.message}</p>
    <button
      onClick={resetError}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
    >
      重试
    </button>
  </div>
);

// 3. Render Props模式：DataFetcher
interface DataFetcherProps<T> {
  url: string;
  children: (data: T | null, loading: boolean, error: Error | null, refetch: () => void) => ReactNode;
  dependencies?: any[];
}

export function DataFetcher<T>({ url, children, dependencies = [] }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return <>{children(data, loading, error, fetchData)}</>;
}

// 4. Compound Component模式：Modal
interface ModalContextType {
  isOpen: boolean;
  onClose: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const Modal = {
  Root: ({ children, isOpen, onClose }: { 
    children: ReactNode; 
    isOpen: boolean; 
    onClose: () => void; 
  }) => {
    const contextValue = useMemo(() => ({ isOpen, onClose }), [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <ModalContext.Provider value={contextValue}>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={onClose}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {children}
          </div>
        </div>
      </ModalContext.Provider>
    );
  },

  Header: ({ children }: { children: ReactNode }) => {
    const context = useContext(ModalContext);
    if (!context) throw new Error('Modal.Header must be used within Modal.Root');

    return (
      <div className="flex items-center justify-between p-6 border-b">
        <div className="text-lg font-semibold">{children}</div>
        <button
          onClick={context.onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    );
  },

  Body: ({ children }: { children: ReactNode }) => (
    <div className="p-6">{children}</div>
  ),

  Footer: ({ children }: { children: ReactNode }) => (
    <div className="flex justify-end space-x-2 p-6 border-t bg-gray-50">
      {children}
    </div>
  )
};

// 5. Hook模式：useToggle
export function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => setValue(prev => !prev), []);
  const setToggle = useCallback((newValue: boolean) => setValue(newValue), []);
  
  return [value, toggle, setToggle];
}

// 6. Hook模式：useLocalStorage
export function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// 7. 组合模式：useComposedRefs
export function useComposedRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return useCallback((node: T) => {
    refs.forEach(ref => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<T>).current = node;
      }
    });
  }, refs);
}

// 8. 优化组件：OptimizedList
interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
}

export const OptimizedList = memo(<T,>({ 
  items, 
  renderItem, 
  keyExtractor, 
  className 
}: OptimizedListProps<T>) => {
  const memoizedItems = useMemo(() => 
    items.map((item, index) => ({
      key: keyExtractor(item, index),
      element: renderItem(item, index)
    })), 
    [items, renderItem, keyExtractor]
  );

  return (
    <div className={className}>
      {memoizedItems.map(({ key, element }) => (
        <div key={key}>{element}</div>
      ))}
    </div>
  );
}) as <T>(props: OptimizedListProps<T>) => JSX.Element;

// 9. 条件渲染组件
export const ConditionalRender: React.FC<{
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ condition, children, fallback = null }) => {
  return condition ? <>{children}</> : <>{fallback}</>;
};

// 10. 延迟渲染组件
export const LazyRender: React.FC<{
  delay?: number;
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ delay = 0, children, fallback = null }) => {
  const [shouldRender, setShouldRender] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShouldRender(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  return shouldRender ? <>{children}</> : <>{fallback}</>;
};

// 11. 可控/非可控组件模式
export function useControllableState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
): [T, (value: T) => void] {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const setValue = useCallback((newValue: T) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  }, [isControlled, onChange]);

  return [value, setValue];
}
