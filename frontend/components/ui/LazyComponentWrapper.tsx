/**
 * 懒加载组件包装器
 *
 * 用于动态导入组件，提供加载状态和错误处理
 *
 * @component
 * @example
 * ```tsx
 * // 使用懒加载包装器
 * <LazyComponentWrapper
 *   importFunc={() => import('./HeavyComponent')}
 *   fallback={<div>Loading...</div>}
 *   someProp="value"
 * />
 * ```
 *
 * @author Test-Web Team
 * @since 1.0.0
 */

import React, { ComponentType, ErrorInfo, Suspense, lazy } from 'react';

/**
 * 懒加载组件包装器的属性接口
 *
 * @interface LazyComponentWrapperProps
 */
interface LazyComponentWrapperProps {
    /** 动态导入函数，返回组件的Promise */
    importFunc: () => Promise<{ default: ComponentType<any> }>;
    /** 加载时的占位组件，可选 */
    fallback?: React.ReactNode;
    /** 错误时的占位组件，可选 */
    errorFallback?: ComponentType<{ error: Error; retry: () => void }>;
    /** 是否预加载组件 */
    preload?: boolean;
    /** 加载完成回调 */
    onLoad?: () => void;
    /** 错误回调 */
    onError?: (error: Error) => void;
    /** CSS类名 */
    className?: string;
    /** 传递给目标组件的其他属性 */
    [key: string]: any;
}

/**
 * 默认加载占位组件
 */
const DefaultFallback: React.FC = () => (
    <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
    </div>
);

/**
 * 默认错误占位组件
 */
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
    <div className="p-4 text-center text-red-600">
        <p>组件加载失败: {error.message}</p>
        <button
            type="button"
            onClick={retry}
            className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
            重试
        </button>
    </div>
);

/**
 * 错误边界组件
 */
class ErrorBoundary extends React.Component<
    {
        children: React.ReactNode;
        fallback?: ComponentType<{ error: Error; retry: () => void }>;
        onError?: (error: Error) => void;
    },
    { hasError: boolean; error?: Error }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('LazyComponent Error:', error, errorInfo);
        this.props.onError?.(error);
    }

    retry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            const FallbackComponent = this.props.fallback || DefaultErrorFallback;
            return <FallbackComponent error={this.state.error!} retry={this.retry} />;
        }

        return this.props.children;
    }
}

/**
 * 懒加载组件包装器实现
 *
 * 使用React.lazy和Suspense实现组件的懒加载，
 * 提供加载状态显示和错误边界处理
 *
 * @param props - 组件属性
 * @returns 渲染的懒加载组件
 */
const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
    importFunc,
    fallback,
    errorFallback,
    preload = false,
    onLoad,
    onError,
    className,
    ...props
}) => {
    // 创建懒加载组件
    const LazyComponent = React.useMemo(() => lazy(importFunc), [importFunc]);

    // 预加载功能
    React.useEffect(() => {
        if (preload) {
            importFunc()
                .then(() => {
                    onLoad?.();
                })
                .catch((error) => {
                    console.error('Preload failed:', error);
                    onError?.(error);
                });
        }
    }, [preload, importFunc, onLoad, onError]);

    const FallbackComponent = fallback || <DefaultFallback />;

    return (
        <ErrorBoundary fallback={errorFallback} onError={onError}>
            <div className={className}>
                <Suspense fallback={FallbackComponent}>
                    <LazyComponent {...props} />
                </Suspense>
            </div>
        </ErrorBoundary>
    );
};

export default LazyComponentWrapper;
