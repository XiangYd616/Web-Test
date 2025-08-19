export interface RouteConfig {
    path: string;
    component: string;
    title: string;
    protected: boolean;
    roles?: string[];
    exact?: boolean;
    children?: RouteConfig[];
}

export const routeConfig: RouteConfig[] = [
    {
        path: '/',
        component: 'Home',
        title: '首页',
        protected: false,
        exact: true
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
        path: '/testing',
        component: 'TestingLayout',
        title: '测试管理',
        protected: true,
        children: [
            {
                path: '/testing/api',
                component: 'APITest',
                title: 'API测试',
                protected: true
            },
            {
                path: '/testing/security',
                component: 'SecurityTest',
                title: '安全测试',
                protected: true
            },
            {
                path: '/testing/stress',
                component: 'StressTest',
                title: '压力测试',
                protected: true
            },
            {
                path: '/testing/performance',
                component: 'PerformanceTest',
                title: '性能测试',
                protected: true
            }
        ]
    },
    {
        path: '/results',
        component: 'TestResults',
        title: '测试结果',
        protected: true
    },
    {
        path: '/users',
        component: 'UserManagement',
        title: '用户管理',
        protected: true,
        roles: ['admin']
    },
    {
        path: '/settings',
        component: 'Settings',
        title: '系统设置',
        protected: true,
        roles: ['admin', 'user']
    },
    {
        path: '/profile',
        component: 'UserProfile',
        title: '个人资料',
        protected: true
    },
    {
        path: '/about',
        component: 'About',
        title: '关于',
        protected: false
    },
    {
        path: '*',
        component: 'NotFound',
        title: '页面未找到',
        protected: false
    }
];

// 路由工具函数
export const getRouteByPath = (path: string): RouteConfig | undefined => {
    const findRoute = (routes: RouteConfig[], targetPath: string): RouteConfig | undefined => {
        for (const route of routes) {
            if (route.path === targetPath) {
                return route;
            }
            if (route.children) {
                const childRoute = findRoute(route.children, targetPath);
                if (childRoute) {
                    return childRoute;
                }
            }
        }
        return undefined;
    };

    return findRoute(routeConfig, path);
};

export const getProtectedRoutes = (): RouteConfig[] => {
    const collectProtectedRoutes = (routes: RouteConfig[]): RouteConfig[] => {
        const protectedRoutes: RouteConfig[] = [];

        for (const route of routes) {
            if (route.protected) {
                protectedRoutes.push(route);
            }
            if (route.children) {
                protectedRoutes.push(...collectProtectedRoutes(route.children));
            }
        }

        return protectedRoutes;
    };

    return collectProtectedRoutes(routeConfig);
};

export const getRoutesByRole = (userRoles: string[]): RouteConfig[] => {
    const filterByRole = (routes: RouteConfig[]): RouteConfig[] => {
        return routes.filter(route => {
            if (!route.roles) {
                return true; // 没有角色限制的路由对所有人开放
            }
            return route.roles.some(role => userRoles.includes(role));
        });
    };

    return filterByRole(routeConfig);
};

export const generateBreadcrumbs = (currentPath: string): Array<{ path: string; title: string }> => {
    const breadcrumbs: Array<{ path: string; title: string }> = [];
    const pathSegments = currentPath.split('/').filter(Boolean);

    let currentRoute = '';
    for (const segment of pathSegments) {
        currentRoute += `/${segment}`;
        const route = getRouteByPath(currentRoute);
        if (route) {
            breadcrumbs.push({
                path: currentRoute,
                title: route.title
            });
        }
    }

    return breadcrumbs;
};

export default routeConfig;