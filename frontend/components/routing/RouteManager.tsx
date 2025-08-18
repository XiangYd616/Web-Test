/**
 * 路由管理器;
 * 集成懒加载路由和性能优化;
 */

import React, { Suspense, useEffect    } from 'react';import { useLocation    } from 'react-router-dom';import { Loading    } from '../ui/Loading';import { ErrorBoundary    } from '../ui/ErrorBoundary';import { usePageTitle    } from '../../hooks/usePageTitle';import { preloadHighPriorityRoutes, preloadRouteOnHover    } from '../../config/lazyRoutes';interface RouteManagerProps   { 
  children: React.ReactNode;
  fallback?: React.ComponentType;
  enablePreloading?: boolean;
 }

export const RouteManager: React.FC<RouteManagerProps> = ({
  children,;
  fallback: Fallback = Loading,;
  enablePreloading = true;
}) => {
  const location = useLocation();
  const { setTitle } = usePageTitle();

  // 预加载高优先级路由
  useEffect(() => {
    if (enablePreloading) {
      preloadHighPriorityRoutes();
    }
  }, [enablePreloading]);

  // 路由变化时的处理
  useEffect(() => {
    // 滚动到顶部
    window.scrollTo(0, 0);

    // 设置页面标题（可以根据路由配置动态设置）
    const pathSegments = location.pathname.split("/').filter(Boolean);
    const pageTitle = pathSegments.length > 0;
      ? pathSegments[pathSegments.length - 1].replace(/[-_]/g, ' ')
      : '首页
    setTitle(pageTitle);
  }, [location.pathname, setTitle]);

  return (<ErrorBoundary>;
      <Suspense fallback={<Fallback    />}>
        <div;
          className= 'route-container
          onMouseEnter={(e) => {
            // 预加载悬停的路由
            const target = e.target as HTMLElement;
            const link = target.closest('a[href]') as HTMLAnchorElement;
            if (link && enablePreloading) {
              preloadRouteOnHover(link.pathname);
            }
          }}
        >;
          {children}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

export default RouteManager;