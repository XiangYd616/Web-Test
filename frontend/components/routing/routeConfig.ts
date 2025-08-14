export interface RouteConfig {
  path: string;
  component: string;
  title: string;
  protected: boolean;
  roles?: string[];
}

export const routeConfig: RouteConfig[] = [
  {
    path: '/',
    component: 'Dashboard',
    title: '仪表板',
    protected: true
  },
  {
    path: '/dashboard',
    component: 'Dashboard',
    title: '仪表板',
    protected: true
  },
  {
    path: '/login',
    component: 'Login',
    title: '登录',
    protected: false
  },
  {
    path: '/register',
    component: 'Register',
    title: '注册',
    protected: false
  },
  {
    path: '/test/api',
    component: 'APITest',
    title: 'API测试',
    protected: true
  },
  {
    path: '/test/security',
    component: 'SecurityTest',
    title: '安全测试',
    protected: true
  },
  {
    path: '/test/stress',
    component: 'StressTest',
    title: '压力测试',
    protected: true
  },
  {
    path: '/settings',
    component: 'Settings',
    title: '设置',
    protected: true,
    roles: ['admin', 'user']
  },
  {
    path: '/profile',
    component: 'UserProfile',
    title: '用户资料',
    protected: true
  }
];

export default routeConfig;
