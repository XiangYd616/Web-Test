/**
 * 路由管理器
 * 集成懒加载路由和性能优化
 */

import React, { Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteManagerProps {
    children: React.ReactNode;
    fallback?: React.ComponentType;
    enablePreloading?: boolean;
}

// 简单的加载组件
const DefaultLoading: React.FC = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
    </div>
);

// 简单的错误边界组件
class ErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ComponentType },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode; fallback?: React.ComponentType }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Route Error:', error, errorInfo);
    }

    override render() {
        if (this.state.hasError) {
            const FallbackComponent = this.props.fallback;
            if (FallbackComponent) {
                return <FallbackComponent />;
            }

            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-red-600 mb-2">页面加载失败</h2>
                        <p className="text-gray-600 mb-4">请刷新页面重试</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            刷新页面
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export const RouteManager: React.FC<RouteManagerProps> = ({
    children,
    fallback,
    enablePreloading = true
}) => {
    const location = useLocation();

    // 设置页面标题
    useEffect(() => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const pageTitle = pathSegments.length > 0
            ? pathSegments[pathSegments.length - 1].replace(/[-_]/g, ' ')
            : '首页';

        document.title = `${pageTitle} - Test Web`;
    }, [location.pathname]);

    // 预加载高优先级路由
    useEffect(() => {
        if (enablePreloading) {
            // 预加载常用路由
            const highPriorityRoutes = ['/dashboard', '/testing', '/results'];
            highPriorityRoutes.forEach(route => {
                // 这里可以添加路由预加载逻辑
                console.log(`Preloading route: ${route}`);
            });
        }
    }, [enablePreloading]);

    return (
        <ErrorBoundary fallback={fallback}>
            <Suspense fallback={<DefaultLoading />}>
                {children}
            </Suspense>
        </ErrorBoundary>
    );
};

export default RouteManager;