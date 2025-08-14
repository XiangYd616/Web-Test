/**
 * 路由预加载工具
 * 智能预加载用户可能访问的页面，提升用户体验
 */

import { ComponentType, lazy } from 'react';

// 预加载状态管理
interface PreloadState {
  loading: Set<string>;
  loaded: Set<string>;
  failed: Set<string>;
}

class RoutePreloader {
  private state: PreloadState = {
    loading: new Set(),
    loaded: new Set(),
    failed: new Set()
  };

  private preloadPromises: Map<string, Promise<any>> = new Map();
  private preloadTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 预加载单个路由
   */
  async preloadRoute(routePath: string, importFn: () => Promise<any>): Promise<void> {
    // 如果已经加载或正在加载，直接返回
    if (this.state.loaded.has(routePath) || this.state.loading.has(routePath)) {
      return this.preloadPromises.get(routePath) || Promise.resolve();
    }

    this.state.loading.add(routePath);

    const promise = importFn()
      .then((module) => {
        this.state.loading.delete(routePath);
        this.state.loaded.add(routePath);
        this.state.failed.delete(routePath);
        console.log(`✅ 预加载成功: ${routePath}`);
        return module;
      })
      .catch((error) => {
        this.state.loading.delete(routePath);
        this.state.failed.add(routePath);
        console.warn(`❌ 预加载失败: ${routePath}`, error);
        throw error;
      });

    this.preloadPromises.set(routePath, promise);
    return promise;
  }

  /**
   * 批量预加载路由
   */
  async preloadRoutes(routes: Array<{ path: string; importFn: () => Promise<any> }>): Promise<void> {
    const promises = routes.map(({ path, importFn }) =>
      this.preloadRoute(path, importFn).catch(() => { }) // 忽略单个路由的错误
    );

    await Promise.allSettled(promises);
  }

  /**
   * 延迟预加载（在空闲时间执行）
   */
  preloadOnIdle(routePath: string, importFn: () => Promise<any>, delay = 2000): void {
    if (this.state.loaded.has(routePath) || this.state.loading.has(routePath)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          this.preloadRoute(routePath, importFn);
        });
      } else {
        // 降级处理
        setTimeout(() => {
          this.preloadRoute(routePath, importFn);
        }, 0);
      }
    }, delay);

    this.preloadTimeouts.set(routePath, timeoutId);
  }

  /**
   * 基于用户行为的智能预加载
   */
  preloadOnHover(element: HTMLElement, routePath: string, importFn: () => Promise<any>): void {
    let hoverTimeout: NodeJS.Timeout;

    const handleMouseEnter = () => {
      hoverTimeout = setTimeout(() => {
        this.preloadRoute(routePath, importFn);
      }, 100); // 100ms 延迟，避免误触
    };

    const handleMouseLeave = () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    // 返回清理函数
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }

  /**
   * 获取预加载状态
   */
  getPreloadState(routePath: string): 'idle' | 'loading' | 'loaded' | 'failed' {
    if (this.state.loaded.has(routePath)) return 'loaded';
    if (this.state.loading.has(routePath)) return 'loading';
    if (this.state.failed.has(routePath)) return 'failed';
    return 'idle';
  }

  /**
   * 清理预加载状态
   */
  cleanup(): void {
    // 清理所有超时
    this.preloadTimeouts.forEach(timeout => clearTimeout(timeout));
    this.preloadTimeouts.clear();

    // 清理状态
    this.state.loading.clear();
    this.preloadPromises.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      loaded: this.state.loaded.size,
      loading: this.state.loading.size,
      failed: this.state.failed.size,
      total: this.state.loaded.size + this.state.loading.size + this.state.failed.size
    };
  }
}

// 全局预加载器实例
export const routePreloader = new RoutePreloader();

// 路由定义映射
export const routeImports = {
  // 测试页面
  '/website-test': () => import('../pages/core/testing/WebsiteTest'),
  '/security-test': () => import('../pages/core/testing/SecurityTest'),
  '/performance-test': () => import('../pages/core/testing/WebsiteTest'), // 重定向到WebsiteTest
  '/seo-test': () => import('../pages/core/testing/SEOTest'),
  '/api-test': () => import('../pages/core/testing/APITest'),
  '/infrastructure-test': () => import('../pages/core/testing/InfrastructureTest'),
  '/stress-test': () => import('../pages/core/testing/StressTest'),
  '/compatibility-test': () => import('../pages/core/testing/CompatibilityTest'),
  '/ux-test': () => import('../pages/core/testing/UXTest'),

  // 仪表板和数据
  '/dashboard': () => import('../pages/core/dashboard/ModernDashboard'),
  '/data-management': () => import('../pages/management/admin/DataManagement'),
  '/statistics': () => import('../pages/data/reports/Statistics'),
  '/analytics': () => import('../pages/data/reports/Analytics'),

  // 报告和历史
  '/test-history': () => import('../pages/data/results/TestHistory'),
  '/reports': () => import('../pages/data/reports/Reports'),

  // 用户相关
  '/profile': () => import('../pages/user/profile/UserProfile'),
  '/settings': () => import('../pages/management/settings/Settings'),
  '/notifications': () => import('../pages/management/integration/Notifications'),

  // 管理
  '/admin': () => import('../pages/management/admin/Admin'),

  // 集成
  '/integrations': () => import('../pages/management/integration/Integrations'),
  '/api-docs': () => import('../pages/user/docs/APIDocs'),

  // 认证
  '/login': () => import('../pages/core/auth/Login'),
  '/register': () => import('../pages/core/auth/Register')
};

/**
 * 预加载策略配置
 */
export const preloadStrategies = {
  // 关键路径 - 立即预加载
  critical: ['/dashboard', '/website-test', '/test-history'],

  // 高优先级 - 空闲时预加载
  high: ['/security-test', '/performance-test', '/seo-test', '/api-test'],

  // 中优先级 - 用户交互时预加载
  medium: ['/network-test', '/database-test', '/stress-test', '/compatibility-test'],

  // 低优先级 - 按需预加载
  low: ['/settings', '/profile', '/admin', '/integrations']
};

/**
 * 初始化预加载策略
 */
export const initializePreloading = () => {
  // 立即预加载关键路径
  const criticalRoutes = preloadStrategies.critical.map(path => ({
    path,
    importFn: routeImports[path as keyof typeof routeImports]
  })).filter(route => route.importFn);

  routePreloader.preloadRoutes(criticalRoutes);

  // 空闲时预加载高优先级路由
  preloadStrategies.high.forEach(path => {
    const importFn = routeImports[path as keyof typeof routeImports];
    if (importFn) {
      routePreloader.preloadOnIdle(path, importFn, 3000);
    }
  });
};

/**
 * 创建带预加载的懒加载组件
 */
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  routePath?: string
) => {
  const LazyComponent = lazy(importFn);

  // 如果提供了路由路径，注册到预加载器
  if (routePath) {
    routePreloader.preloadRoute(routePath, importFn);
  }

  return LazyComponent;
};

/**
 * React Hook: 使用路由预加载
 */
export const useRoutePreloader = () => {
  return {
    preloadRoute: routePreloader.preloadRoute.bind(routePreloader),
    preloadOnHover: routePreloader.preloadOnHover.bind(routePreloader),
    getPreloadState: routePreloader.getPreloadState.bind(routePreloader),
    getStats: routePreloader.getStats.bind(routePreloader)
  };
};

// 在应用启动时初始化预加载
if (typeof window !== 'undefined') {
  // 等待初始渲染完成后再开始预加载
  setTimeout(initializePreloading, 1000);
}
