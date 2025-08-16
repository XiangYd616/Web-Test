export interface RouteInfo {
  path: string;
  name: string;
  icon?: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

export const routes: RouteInfo[] = [
  { path: '/', name: '首页', icon: 'Home', requiresAuth: false },
  { path: '/dashboard', name: '仪表板', icon: 'BarChart3', requiresAuth: true },

  { path: '/website-test', name: '网站测试', icon: 'Globe', requiresAuth: false },
  { path: '/security-test', name: '安全测试', icon: 'Shield', requiresAuth: false },
  { path: '/performance-test', name: '性能测试', icon: 'Gauge', requiresAuth: false },
  { path: '/seo-test', name: 'SEO测试', icon: 'Search', requiresAuth: false },
  { path: '/api-test', name: 'API测试', icon: 'Code', requiresAuth: false },
  { path: '/network-test', name: '网络测试', icon: 'Network', requiresAuth: false },
  { path: '/database-test', name: '数据库测试', icon: 'Database', requiresAuth: false },
  { path: '/stress-test', name: '压力测试', icon: 'Zap', requiresAuth: false },
  { path: '/compatibility-test', name: '兼容性测试', icon: 'Monitor', requiresAuth: false },
  { path: '/chrome-compatibility-test', name: 'Chrome兼容性测试', icon: 'Chrome', requiresAuth: false },
  { path: '/ux-test', name: 'UX测试', icon: 'Users', requiresAuth: false },

  // 数据和分析 - 需要登录
  { path: '/data-storage', name: '数据存储', icon: 'Database', requiresAuth: true },
  { path: '/data-management', name: '数据管理', icon: 'FolderOpen', requiresAuth: true },
  { path: '/statistics', name: '统计分析', icon: 'BarChart', requiresAuth: true },
  { path: '/analytics', name: '高级分析', icon: 'TrendingUp', requiresAuth: true },
  { path: '/advanced-analytics', name: '深度分析', icon: 'BarChart3', requiresAuth: true },
  { path: '/test-history', name: '测试历史', icon: 'History', requiresAuth: false },
  { path: '/reports', name: '测试报告', icon: 'FileText', requiresAuth: true },

  // 集成和配置 - 需要登录
  { path: '/integrations', name: '集成管理', icon: 'Link', requiresAuth: true },
  { path: '/cicd-integration', name: 'CI/CD集成', icon: 'GitBranch', requiresAuth: true },
  { path: '/webhooks', name: 'Webhooks', icon: 'Webhook', requiresAuth: true },
  { path: '/api-keys', name: 'API密钥', icon: 'Key', requiresAuth: true },

  // 调度和任务 - 需要登录
  { path: '/test-schedule', name: '测试调度', icon: 'Calendar', requiresAuth: true },
  { path: '/scheduled-tasks', name: '定时任务', icon: 'Clock', requiresAuth: true },

  // 用户相关 - 需要登录
  { path: '/profile', name: '个人资料', icon: 'User', requiresAuth: true },
  { path: '/bookmarks', name: '我的收藏', icon: 'Bookmark', requiresAuth: true },
  { path: '/notifications', name: '通知中心', icon: 'Bell', requiresAuth: true },
  { path: '/settings', name: '设置', icon: 'Settings', requiresAuth: true },
  { path: '/subscription', name: '订阅管理', icon: 'CreditCard', requiresAuth: true },

  // 系统管理 - 只保留Admin页面，所有管理功能都在Admin内部
  { path: '/admin', name: '管理后台', icon: 'Shield', requiresAuth: true, requiresAdmin: true },

  // 帮助和文档 - 公开访问
  { path: '/help', name: '帮助中心', icon: 'HelpCircle', requiresAuth: false },
  { path: '/api-docs', name: 'API文档', icon: 'Book', requiresAuth: false },
  { path: '/theme-showcase', name: '主题展示', icon: 'Palette', requiresAuth: false },
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
