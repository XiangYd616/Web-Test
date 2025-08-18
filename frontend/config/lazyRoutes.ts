/**
 * 懒加载路由配置
 * 实现页面级别的代码分割和懒加载
 */

import { lazy    } from 'react';// 懒加载页面组件
const LazyHome = lazy(() => import('../pages/Home'));
const LazyDashboard = lazy(() => import('../pages/Dashboard'));
const LazyLogin = lazy(() => import('../pages/core/auth/Login'));
const LazyRegister = lazy(() => import('../pages/core/auth/Register'));
const LazyProfile = lazy(() => import('../pages/core/user/Profile'));
const LazySettings = lazy(() => import('../pages/core/settings/Settings'));
// 测试相关页面
const LazyPerformanceTest = lazy(() => import('../pages/core/testing/PerformanceTest'));
const LazyStressTest = lazy(() => import('../pages/core/testing/StressTest'));
const LazyApiTest = lazy(() => import('../pages/core/testing/ApiTest'));
const LazySeoTest = lazy(() => import('../pages/core/testing/SeoTest'));
const LazySecurityTest = lazy(() => import('../pages/core/testing/SecurityTest'));
// 管理页面
const LazyTestManagement = lazy(() => import('../pages/core/management/TestManagement'));
const LazyDataManagement = lazy(() => import('../pages/core/management/DataManagement'));
const LazyUserManagement = lazy(() => import('../pages/core/management/UserManagement'));
// 报告页面
const LazyTestResults = lazy(() => import('../pages/core/results/TestResults'));
const LazyAnalytics = lazy(() => import('../pages/core/analytics/Analytics'));
const LazyReports = lazy(() => import('../pages/core/reports/Reports'));
export interface LazyRouteConfig     {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  preload?: boolean;
  chunkName?: string;
  priority?: 'high' | 'medium' | 'low
}

export const lazyRoutes: LazyRouteConfig[] = [
  // 核心页面 - 高优先级
  {
    path: '/',
    component: LazyHome,
    preload: true,
    chunkName: 'home',
    priority: 'high
  },
  {
    path: '/dashboard',
    component: LazyDashboard,
    preload: true,
    chunkName: 'dashboard',
    priority: 'high
  },
  
  // 认证页面 - 中优先级
  {
    path: '/login',
    component: LazyLogin,
    preload: false,
    chunkName: 'auth',
    priority: 'medium
  },
  {
    path: '/register',
    component: LazyRegister,
    preload: false,
    chunkName: 'auth',
    priority: 'medium
  },
  
  // 测试页面 - 中优先级
  {
    path: '/test/performance',
    component: LazyPerformanceTest,
    preload: false,
    chunkName: 'testing',
    priority: 'medium
  },
  {
    path: '/test/stress',
    component: LazyStressTest,
    preload: false,
    chunkName: 'testing',
    priority: 'medium
  },
  {
    path: '/test/api',
    component: LazyApiTest,
    preload: false,
    chunkName: 'testing',
    priority: 'medium
  },
  {
    path: '/test/seo',
    component: LazySeoTest,
    preload: false,
    chunkName: 'testing',
    priority: 'medium
  },
  {
    path: '/test/security',
    component: LazySecurityTest,
    preload: false,
    chunkName: 'testing',
    priority: 'medium
  },
  
  // 管理页面 - 低优先级
  {
    path: '/management/tests',
    component: LazyTestManagement,
    preload: false,
    chunkName: 'management',
    priority: 'low
  },
  {
    path: '/management/data',
    component: LazyDataManagement,
    preload: false,
    chunkName: 'management',
    priority: 'low
  },
  {
    path: '/management/users',
    component: LazyUserManagement,
    preload: false,
    chunkName: 'management',
    priority: 'low
  },
  
  // 结果和报告页面 - 低优先级
  {
    path: '/results',
    component: LazyTestResults,
    preload: false,
    chunkName: 'results',
    priority: 'low
  },
  {
    path: '/analytics',
    component: LazyAnalytics,
    preload: false,
    chunkName: 'analytics',
    priority: 'low
  },
  {
    path: '/reports',
    component: LazyReports,
    preload: false,
    chunkName: 'reports',
    priority: 'low
  },
  
  // 用户页面 - 低优先级
  {
    path: '/profile',
    component: LazyProfile,
    preload: false,
    chunkName: 'user',
    priority: 'low
  },
  {
    path: '/settings',
    component: LazySettings,
    preload: false,
    chunkName: 'user',
    priority: 'low
  }
];

/**
 * 预加载高优先级路由
 */
export const preloadHighPriorityRoutes = () => {
  lazyRoutes
    .filter(route => route.preload && route.priority === 'high')
    .forEach(route => {
      // 预加载组件
      route.component();
    });
};

/**
 * 根据用户行为预加载路由
 */
export const preloadRouteOnHover = (path: string) => {
  const route = lazyRoutes.find(r => r.path === path);
  if (route && !route.preload) {
    route.component();
  }
};

/**
 * 获取路由的chunk名称
 */
export const getChunkName = (path: string): string  => {
  const route = lazyRoutes.find(r => r.path === path);
  return route?.chunkName || 'default
};

export default lazyRoutes;