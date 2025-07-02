export interface RouteInfo {
  path: string;
  name: string;
  icon?: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

export const routes: RouteInfo[] = [
  { path: '/', name: '仪表板', icon: 'BarChart3', requiresAuth: true },
  { path: '/stress-test', name: '压力测试', icon: 'Zap', requiresAuth: true },
  { path: '/seo-test', name: 'SEO测试', icon: 'Search', requiresAuth: true },
  { path: '/compatibility-test', name: '兼容性测试', icon: 'Monitor', requiresAuth: true },
  { path: '/api-test', name: 'API测试', icon: 'Code', requiresAuth: true },
  { path: '/analytics', name: '高级分析', icon: 'TrendingUp', requiresAuth: true },
  { path: '/history', name: '测试历史', icon: 'History', requiresAuth: true },
  { path: '/cicd-integration', name: 'CI/CD集成', icon: 'GitBranch', requiresAuth: true },
  { path: '/settings', name: '设置', icon: 'Settings', requiresAuth: true },
  { path: '/profile', name: '个人资料', icon: 'User', requiresAuth: true },
  { path: '/admin', name: '管理后台', icon: 'Shield', requiresAuth: true, requiresAdmin: true },
];

export const publicRoutes: RouteInfo[] = [
  { path: '/login', name: '登录', icon: 'LogIn' },
  { path: '/register', name: '注册', icon: 'UserPlus' },
  { path: '/download-desktop', name: '下载桌面版', icon: 'Download' },
];

export const getRouteByPath = (path: string): RouteInfo | undefined => {
  return [...routes, ...publicRoutes].find(route => route.path === path);
};

export const getRouteName = (path: string): string => {
  const route = getRouteByPath(path);
  return route?.name || '未知页面';
};

export const isProtectedRoute = (path: string): boolean => {
  const route = getRouteByPath(path);
  return route?.requiresAuth === true;
};

export const isAdminRoute = (path: string): boolean => {
  const route = getRouteByPath(path);
  return route?.requiresAdmin === true;
};

export const getNavigationRoutes = (isAuthenticated: boolean, isAdmin: boolean): RouteInfo[] => {
  if (!isAuthenticated) {
    return publicRoutes;
  }

  return routes.filter(route => {
    if (route.requiresAdmin && !isAdmin) {
      return false;
    }
    return true;
  });
};

export const getBreadcrumbs = (path: string): RouteInfo[] => {
  const breadcrumbs: RouteInfo[] = [];

  // 总是包含首页
  if (path !== '/') {
    breadcrumbs.push({ path: '/', name: '首页', icon: 'Home' });
  }

  // 添加当前页面
  const currentRoute = getRouteByPath(path);
  if (currentRoute && path !== '/') {
    breadcrumbs.push(currentRoute);
  }

  return breadcrumbs;
};
