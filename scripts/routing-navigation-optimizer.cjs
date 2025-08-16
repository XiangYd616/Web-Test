#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class RoutingNavigationOptimizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.optimizations = [];
    this.fixes = [];

    // 路由优化配置
    this.routingConfig = {
      // 路由结构定义
      routeStructure: {
        public: [
          { path: '/', component: 'Home', exact: true },
          { path: '/login', component: 'Login' },
          { path: '/register', component: 'Register' },
          { path: '/about', component: 'About' },
          { path: '/contact', component: 'Contact' }
        ],
        protected: [
          { path: '/dashboard', component: 'Dashboard', roles: ['user', 'admin'] },
          { path: '/profile', component: 'Profile', roles: ['user', 'admin'] },
          { path: '/settings', component: 'Settings', roles: ['user', 'admin'] }
        ],
        testing: [
          { path: '/test/performance', component: 'PerformanceTest', roles: ['user', 'admin'] },
          { path: '/test/stress', component: 'StressTest', roles: ['user', 'admin'] },
          { path: '/test/api', component: 'ApiTest', roles: ['user', 'admin'] },
          { path: '/test/seo', component: 'SeoTest', roles: ['user', 'admin'] },
          { path: '/test/security', component: 'SecurityTest', roles: ['user', 'admin'] }
        ],
        management: [
          { path: '/management/tests', component: 'TestManagement', roles: ['admin'] },
          { path: '/management/data', component: 'DataManagement', roles: ['admin'] },
          { path: '/management/users', component: 'UserManagement', roles: ['admin'] }
        ],
        results: [
          { path: '/results', component: 'TestResults', roles: ['user', 'admin'] },
          { path: '/analytics', component: 'Analytics', roles: ['user', 'admin'] },
          { path: '/reports', component: 'Reports', roles: ['user', 'admin'] }
        ]
      },

      // 导航配置
      navigationConfig: {
        mainNavigation: [
          { label: '首页', path: '/', icon: 'home', public: true },
          { label: '仪表板', path: '/dashboard', icon: 'dashboard', roles: ['user', 'admin'] },
          {
            label: '测试', path: '/test', icon: 'test', roles: ['user', 'admin'], children: [
              { label: '性能测试', path: '/test/performance', icon: 'performance' },
              { label: '压力测试', path: '/test/stress', icon: 'stress' },
              { label: 'API测试', path: '/test/api', icon: 'api' },
              { label: 'SEO测试', path: '/test/seo', icon: 'seo' },
              { label: '安全测试', path: '/test/security', icon: 'security' }
            ]
          },
          {
            label: '结果', path: '/results', icon: 'results', roles: ['user', 'admin'], children: [
              { label: '测试结果', path: '/results', icon: 'test-results' },
              { label: '分析报告', path: '/analytics', icon: 'analytics' },
              { label: '报告中心', path: '/reports', icon: 'reports' }
            ]
          },
          {
            label: '管理', path: '/management', icon: 'management', roles: ['admin'], children: [
              { label: '测试管理', path: '/management/tests', icon: 'test-management' },
              { label: '数据管理', path: '/management/data', icon: 'data-management' },
              { label: '用户管理', path: '/management/users', icon: 'user-management' }
            ]
          }
        ],
        userNavigation: [
          { label: '个人资料', path: '/profile', icon: 'profile' },
          { label: '设置', path: '/settings', icon: 'settings' },
          { label: '退出登录', action: 'logout', icon: 'logout' }
        ]
      }
    };
  }

  /**
   * 执行路由和导航优化
   */
  async execute() {
    console.log('🧭 开始路由和导航优化...\n');

    try {
      // 1. 创建路由配置系统
      await this.createRouteConfiguration();

      // 2. 实现路由守卫和权限控制
      await this.implementRouteGuards();

      // 3. 创建导航组件系统
      await this.createNavigationSystem();

      // 4. 实现面包屑导航
      await this.implementBreadcrumbNavigation();

      // 5. 创建页面标题管理
      await this.createPageTitleManager();

      // 6. 集成懒加载路由
      await this.integrateLazyRoutes();

      // 7. 生成优化报告
      this.generateOptimizationReport();

    } catch (error) {
      console.error('❌ 路由和导航优化过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 创建路由配置系统
   */
  async createRouteConfiguration() {
    console.log('🛣️ 创建路由配置系统...');

    // 1. 创建主路由配置
    await this.createMainRouteConfig();

    // 2. 创建路由类型定义
    await this.createRouteTypes();

    // 3. 创建路由工具函数
    await this.createRouteUtils();

    console.log('   ✅ 路由配置系统创建完成\n');
  }

  /**
   * 创建主路由配置
   */
  async createMainRouteConfig() {
    const routeConfigPath = path.join(this.projectRoot, 'frontend/config/routes.tsx');

    // 确保目录存在
    const configDir = path.dirname(routeConfigPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (!fs.existsSync(routeConfigPath)) {
      const routeConfigContent = `/**
 * 主路由配置
 * 定义应用的完整路由结构
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '../components/auth/AuthGuard';
import { RoleGuard } from '../components/auth/RoleGuard';
import { Loading } from '../components/ui/Loading';
import { lazyRoutes } from './lazyRoutes';

// 懒加载页面组件
const Home = React.lazy(() => import('../pages/Home'));
const Login = React.lazy(() => import('../pages/core/auth/Login'));
const Register = React.lazy(() => import('../pages/core/auth/Register'));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Profile = React.lazy(() => import('../pages/core/user/Profile'));
const Settings = React.lazy(() => import('../pages/core/settings/Settings'));

// 测试页面
const PerformanceTest = React.lazy(() => import('../pages/core/testing/PerformanceTest'));
const StressTest = React.lazy(() => import('../pages/core/testing/StressTest'));
const ApiTest = React.lazy(() => import('../pages/core/testing/ApiTest'));
const SeoTest = React.lazy(() => import('../pages/core/testing/SeoTest'));
const SecurityTest = React.lazy(() => import('../pages/core/testing/SecurityTest'));

// 管理页面
const TestManagement = React.lazy(() => import('../pages/core/management/TestManagement'));
const DataManagement = React.lazy(() => import('../pages/core/management/DataManagement'));
const UserManagement = React.lazy(() => import('../pages/core/management/UserManagement'));

// 结果页面
const TestResults = React.lazy(() => import('../pages/core/results/TestResults'));
const Analytics = React.lazy(() => import('../pages/core/analytics/Analytics'));
const Reports = React.lazy(() => import('../pages/core/reports/Reports'));

// 错误页面
const NotFound = React.lazy(() => import('../pages/errors/NotFound'));
const Unauthorized = React.lazy(() => import('../pages/errors/Unauthorized'));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* 公共路由 */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* 受保护的路由 */}
        <Route path="/dashboard" element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        } />
        
        <Route path="/profile" element={
          <AuthGuard>
            <Profile />
          </AuthGuard>
        } />
        
        <Route path="/settings" element={
          <AuthGuard>
            <Settings />
          </AuthGuard>
        } />
        
        {/* 测试路由 */}
        <Route path="/test/performance" element={
          <AuthGuard>
            <PerformanceTest />
          </AuthGuard>
        } />
        
        <Route path="/test/stress" element={
          <AuthGuard>
            <StressTest />
          </AuthGuard>
        } />
        
        <Route path="/test/api" element={
          <AuthGuard>
            <ApiTest />
          </AuthGuard>
        } />
        
        <Route path="/test/seo" element={
          <AuthGuard>
            <SeoTest />
          </AuthGuard>
        } />
        
        <Route path="/test/security" element={
          <AuthGuard>
            <SecurityTest />
          </AuthGuard>
        } />
        
        {/* 管理路由 - 需要管理员权限 */}
        <Route path="/management/tests" element={
          <AuthGuard>
            <RoleGuard requiredRoles={['admin']}>
              <TestManagement />
            </RoleGuard>
          </AuthGuard>
        } />
        
        <Route path="/management/data" element={
          <AuthGuard>
            <RoleGuard requiredRoles={['admin']}>
              <DataManagement />
            </RoleGuard>
          </AuthGuard>
        } />
        
        <Route path="/management/users" element={
          <AuthGuard>
            <RoleGuard requiredRoles={['admin']}>
              <UserManagement />
            </RoleGuard>
          </AuthGuard>
        } />
        
        {/* 结果路由 */}
        <Route path="/results" element={
          <AuthGuard>
            <TestResults />
          </AuthGuard>
        } />
        
        <Route path="/analytics" element={
          <AuthGuard>
            <Analytics />
          </AuthGuard>
        } />
        
        <Route path="/reports" element={
          <AuthGuard>
            <Reports />
          </AuthGuard>
        } />
        
        {/* 错误路由 */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/404" element={<NotFound />} />
        
        {/* 重定向和通配符路由 */}
        <Route path="/test" element={<Navigate to="/test/performance" replace />} />
        <Route path="/management" element={<Navigate to="/management/tests" replace />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;`;

      fs.writeFileSync(routeConfigPath, routeConfigContent);
      this.addFix('routing', routeConfigPath, '创建主路由配置');
    }
  }

  /**
   * 创建路由类型定义
   */
  async createRouteTypes() {
    const routeTypesPath = path.join(this.projectRoot, 'frontend/types/routes.ts');

    // 确保目录存在
    const typesDir = path.dirname(routeTypesPath);
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }

    if (!fs.existsSync(routeTypesPath)) {
      const routeTypesContent = `/**
 * 路由相关的类型定义
 */

export interface RouteConfig {
  path: string;
  component: string;
  exact?: boolean;
  roles?: string[];
  public?: boolean;
  children?: RouteConfig[];
  meta?: RouteMeta;
}

export interface RouteMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  requiresAuth?: boolean;
  requiredRoles?: string[];
  breadcrumb?: BreadcrumbItem[];
  layout?: string;
  cache?: boolean;
  preload?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
  active?: boolean;
}

export interface NavigationItem {
  label: string;
  path?: string;
  icon?: string;
  action?: string;
  roles?: string[];
  public?: boolean;
  children?: NavigationItem[];
  badge?: {
    text: string;
    variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
  external?: boolean;
  target?: '_blank' | '_self';
}

export interface RouteGuardContext {
  user: any;
  isAuthenticated: boolean;
  userRoles: string[];
  permissions: string[];
}

export interface RouteTransition {
  enter: string;
  exit: string;
  duration: number;
}

export type RouteChangeHandler = (to: string, from: string) => void | Promise<void>;

export interface RouterState {
  currentPath: string;
  previousPath: string;
  params: Record<string, string>;
  query: Record<string, string>;
  meta: RouteMeta;
  isLoading: boolean;
  error: string | null;
}

export interface RouteGuardResult {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
}

export default RouteConfig;`;

      fs.writeFileSync(routeTypesPath, routeTypesContent);
      this.addFix('routing', routeTypesPath, '创建路由类型定义');
    }
  }

  /**
   * 创建路由工具函数
   */
  async createRouteUtils() {
    const routeUtilsPath = path.join(this.projectRoot, 'frontend/utils/routeUtils.ts');

    if (!fs.existsSync(routeUtilsPath)) {
      const routeUtilsContent = `/**
 * 路由工具函数
 * 提供路由相关的实用功能
 */

import { RouteConfig, BreadcrumbItem, NavigationItem } from '../types/routes';

/**
 * 生成面包屑导航
 */
export const generateBreadcrumbs = (
  currentPath: string,
  routes: RouteConfig[]
): BreadcrumbItem[] => {
  const breadcrumbs: BreadcrumbItem[] = [];
  const pathSegments = currentPath.split('/').filter(Boolean);
  
  let currentRoute = '';
  
  for (const segment of pathSegments) {
    currentRoute += '/' + segment;
    const route = findRouteByPath(currentRoute, routes);
    
    if (route && route.meta?.title) {
      breadcrumbs.push({
        label: route.meta.title,
        path: currentRoute,
        active: currentRoute === currentPath
      });
    }
  }
  
  return breadcrumbs;
};

/**
 * 根据路径查找路由配置
 */
export const findRouteByPath = (
  path: string,
  routes: RouteConfig[]
): RouteConfig | null => {
  for (const route of routes) {
    if (route.path === path) {
      return route;
    }
    
    if (route.children) {
      const childRoute = findRouteByPath(path, route.children);
      if (childRoute) {
        return childRoute;
      }
    }
  }
  
  return null;
};

/**
 * 检查用户是否有访问路由的权限
 */
export const hasRoutePermission = (
  route: RouteConfig,
  userRoles: string[]
): boolean => {
  if (!route.roles || route.roles.length === 0) {
    return true;
  }
  
  return route.roles.some(role => userRoles.includes(role));
};

/**
 * 过滤导航项目基于用户权限
 */
export const filterNavigationByPermissions = (
  navigation: NavigationItem[],
  userRoles: string[],
  isAuthenticated: boolean
): NavigationItem[] => {
  return navigation.filter(item => {
    // 检查公共访问
    if (item.public) {
      return true;
    }
    
    // 检查认证要求
    if (!isAuthenticated) {
      return false;
    }
    
    // 检查角色权限
    if (item.roles && item.roles.length > 0) {
      return item.roles.some(role => userRoles.includes(role));
    }
    
    return true;
  }).map(item => ({
    ...item,
    children: item.children 
      ? filterNavigationByPermissions(item.children, userRoles, isAuthenticated)
      : undefined
  }));
};

/**
 * 获取路由的页面标题
 */
export const getPageTitle = (
  path: string,
  routes: RouteConfig[],
  defaultTitle: string = 'Test Web'
): string => {
  const route = findRouteByPath(path, routes);
  return route?.meta?.title ? \`\${route.meta.title} - \${defaultTitle}\` : defaultTitle;
};

/**
 * 解析查询参数
 */
export const parseQueryParams = (search: string): Record<string, string> => {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
};

/**
 * 构建查询字符串
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? '?' + queryString : '';
};

/**
 * 检查路径是否匹配
 */
export const isPathMatch = (
  currentPath: string,
  targetPath: string,
  exact: boolean = false
): boolean => {
  if (exact) {
    return currentPath === targetPath;
  }
  
  return currentPath.startsWith(targetPath);
};

/**
 * 获取活动导航项
 */
export const getActiveNavigationItem = (
  currentPath: string,
  navigation: NavigationItem[]
): NavigationItem | null => {
  for (const item of navigation) {
    if (item.path && isPathMatch(currentPath, item.path)) {
      return item;
    }
    
    if (item.children) {
      const activeChild = getActiveNavigationItem(currentPath, item.children);
      if (activeChild) {
        return item;
      }
    }
  }
  
  return null;
};

/**
 * 生成路由元数据
 */
export const generateRouteMeta = (
  path: string,
  routes: RouteConfig[]
) => {
  const route = findRouteByPath(path, routes);
  
  if (!route?.meta) {
    return {
      title: 'Test Web',
      description: 'Web应用测试平台',
      keywords: ['测试', 'Web', '性能', '安全']
    };
  }
  
  return route.meta;
};

export default {
  generateBreadcrumbs,
  findRouteByPath,
  hasRoutePermission,
  filterNavigationByPermissions,
  getPageTitle,
  parseQueryParams,
  buildQueryString,
  isPathMatch,
  getActiveNavigationItem,
  generateRouteMeta
};`;

      fs.writeFileSync(routeUtilsPath, routeUtilsContent);
      this.addFix('routing', routeUtilsPath, '创建路由工具函数');
    }
  }

  /**
   * 实现路由守卫和权限控制
   */
  async implementRouteGuards() {
    console.log('🛡️ 实现路由守卫和权限控制...');

    // 1. 创建认证守卫
    await this.createAuthGuard();

    // 2. 创建角色守卫
    await this.createRoleGuard();

    // 3. 创建权限Hook
    await this.createPermissionHooks();

    console.log('   ✅ 路由守卫和权限控制实现完成\n');
  }

  /**
   * 创建认证守卫
   */
  async createAuthGuard() {
    const authGuardPath = path.join(this.projectRoot, 'frontend/components/auth/AuthGuard.tsx');

    // 确保目录存在
    const authDir = path.dirname(authGuardPath);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    if (!fs.existsSync(authGuardPath)) {
      const authGuardContent = `/**
 * 认证守卫组件
 * 保护需要认证的路由
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loading } from '../ui/Loading';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback: Fallback,
  redirectTo = '/login'
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 显示加载状态
  if (isLoading) {
    return Fallback ? <Fallback /> : <Loading />;
  }

  // 未认证用户重定向到登录页
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // 已认证用户可以访问
  return <>{children}</>;
};

/**
 * 受保护的路由组件
 */
export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}> = ({ children, requiredRoles, requiredPermissions }) => {
  return (
    <AuthGuard>
      <RoleGuard
        requiredRoles={requiredRoles}
        requiredPermissions={requiredPermissions}
      >
        {children}
      </RoleGuard>
    </AuthGuard>
  );
};

export default AuthGuard;`;

      fs.writeFileSync(authGuardPath, authGuardContent);
      this.addFix('guards', authGuardPath, '创建认证守卫');
    }
  }

  /**
   * 创建角色守卫
   */
  async createRoleGuard() {
    const roleGuardPath = path.join(this.projectRoot, 'frontend/components/auth/RoleGuard.tsx');

    if (!fs.existsSync(roleGuardPath)) {
      const roleGuardContent = `/**
 * 角色守卫组件
 * 基于用户角色和权限控制访问
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallback?: React.ComponentType;
  redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  requireAll = false,
  fallback: Fallback,
  redirectTo = '/unauthorized'
}) => {
  const { user } = useAuth();
  const { hasRole, hasPermission, hasAnyRole, hasAnyPermission } = usePermissions();

  // 检查角色权限
  const hasRequiredRoles = () => {
    if (requiredRoles.length === 0) return true;

    return requireAll
      ? requiredRoles.every(role => hasRole(role))
      : hasAnyRole(requiredRoles);
  };

  // 检查操作权限
  const hasRequiredPermissions = () => {
    if (requiredPermissions.length === 0) return true;

    return requireAll
      ? requiredPermissions.every(permission => hasPermission(permission))
      : hasAnyPermission(requiredPermissions);
  };

  // 检查是否有访问权限
  const hasAccess = hasRequiredRoles() && hasRequiredPermissions();

  if (!hasAccess) {
    if (Fallback) {
      return <Fallback />;
    }

    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

/**
 * 条件渲染组件 - 基于权限显示/隐藏内容
 */
export const ConditionalRender: React.FC<{
  children: React.ReactNode;
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}> = ({ children, roles, permissions, requireAll = false, fallback = null }) => {
  const { hasRole, hasPermission, hasAnyRole, hasAnyPermission } = usePermissions();

  const hasRequiredRoles = () => {
    if (!roles || roles.length === 0) return true;

    return requireAll
      ? roles.every(role => hasRole(role))
      : hasAnyRole(roles);
  };

  const hasRequiredPermissions = () => {
    if (!permissions || permissions.length === 0) return true;

    return requireAll
      ? permissions.every(permission => hasPermission(permission))
      : hasAnyPermission(permissions);
  };

  const hasAccess = hasRequiredRoles() && hasRequiredPermissions();

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default RoleGuard;`;

      fs.writeFileSync(roleGuardPath, roleGuardContent);
      this.addFix('guards', roleGuardPath, '创建角色守卫');
    }
  }

  /**
   * 创建权限Hook
   */
  async createPermissionHooks() {
    const permissionHooksPath = path.join(this.projectRoot, 'frontend/hooks/usePermissions.ts');

    // 确保目录存在
    const hooksDir = path.dirname(permissionHooksPath);
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    if (!fs.existsSync(permissionHooksPath)) {
      const permissionHooksContent = `/**
 * 权限管理Hook
 * 提供权限检查和角色验证功能
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  level: number;
}

export const usePermissions = () => {
  const { user } = useAuth();

  // 用户角色
  const userRoles = useMemo(() => {
    return user?.roles || [];
  }, [user?.roles]);

  // 用户权限
  const userPermissions = useMemo(() => {
    return user?.permissions || [];
  }, [user?.permissions]);

  // 检查是否有特定角色
  const hasRole = (role: string): boolean => {
    return userRoles.includes(role);
  };

  // 检查是否有任一角色
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  // 检查是否有所有角色
  const hasAllRoles = (roles: string[]): boolean => {
    return roles.every(role => hasRole(role));
  };

  // 检查是否有特定权限
  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes(permission);
  };

  // 检查是否有任一权限
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  // 检查是否有所有权限
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  // 检查资源操作权限
  const canAccess = (resource: string, action: string): boolean => {
    const permissionKey = \`\${resource}:\${action}\`;
    return hasPermission(permissionKey);
  };

  // 检查是否为管理员
  const isAdmin = (): boolean => {
    return hasRole('admin') || hasRole('super_admin');
  };

  // 检查是否为超级管理员
  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin');
  };

  // 获取用户级别
  const getUserLevel = (): number => {
    if (isSuperAdmin()) return 100;
    if (isAdmin()) return 80;
    if (hasRole('moderator')) return 60;
    if (hasRole('user')) return 40;
    return 0;
  };

  // 检查是否可以管理用户
  const canManageUser = (targetUser: any): boolean => {
    if (isSuperAdmin()) return true;
    if (!isAdmin()) return false;

    // 管理员不能管理其他管理员
    const targetUserLevel = targetUser?.level || 0;
    const currentUserLevel = getUserLevel();

    return currentUserLevel > targetUserLevel;
  };

  // 获取可访问的菜单项
  const getAccessibleMenuItems = (menuItems: any[]): any[] => {
    return menuItems.filter(item => {
      if (item.public) return true;
      if (!user) return false;

      if (item.roles && item.roles.length > 0) {
        return hasAnyRole(item.roles);
      }

      if (item.permissions && item.permissions.length > 0) {
        return hasAnyPermission(item.permissions);
      }

      return true;
    });
  };

  return {
    userRoles,
    userPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    isAdmin,
    isSuperAdmin,
    getUserLevel,
    canManageUser,
    getAccessibleMenuItems
  };
};

/**
 * 路由权限Hook
 */
export const useRoutePermissions = () => {
  const { hasRole, hasPermission, hasAnyRole, hasAnyPermission } = usePermissions();

  const canAccessRoute = (routeConfig: {
    roles?: string[];
    permissions?: string[];
    requireAll?: boolean;
  }): boolean => {
    const { roles = [], permissions = [], requireAll = false } = routeConfig;

    if (roles.length === 0 && permissions.length === 0) {
      return true;
    }

    const hasRequiredRoles = roles.length === 0 || (
      requireAll ? roles.every(role => hasRole(role)) : hasAnyRole(roles)
    );

    const hasRequiredPermissions = permissions.length === 0 || (
      requireAll ? permissions.every(permission => hasPermission(permission)) : hasAnyPermission(permissions)
    );

    return hasRequiredRoles && hasRequiredPermissions;
  };

  return {
    canAccessRoute
  };
};

export default usePermissions;`;

      fs.writeFileSync(permissionHooksPath, permissionHooksContent);
      this.addFix('guards', permissionHooksPath, '创建权限管理Hook');
    }
  }

  /**
   * 创建导航组件系统
   */
  async createNavigationSystem() {
    console.log('🧭 创建导航组件系统...');

    // 1. 创建主导航组件
    await this.createMainNavigation();

    // 2. 创建侧边栏导航
    await this.createSidebarNavigation();

    // 3. 创建用户导航菜单
    await this.createUserNavigation();

    console.log('   ✅ 导航组件系统创建完成\n');
  }

  /**
   * 创建主导航组件
   */
  async createMainNavigation() {
    const mainNavPath = path.join(this.projectRoot, 'frontend/components/navigation/MainNavigation.tsx');

    // 确保目录存在
    const navDir = path.dirname(mainNavPath);
    if (!fs.existsSync(navDir)) {
      fs.mkdirSync(navDir, { recursive: true });
    }

    if (!fs.existsSync(mainNavPath)) {
      const mainNavContent = `/**
 * 主导航组件
 * 应用的顶部导航栏
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { NavigationItem } from '../../types/routes';

interface MainNavigationProps {
  className?: string;
  items: NavigationItem[];
  logo?: React.ReactNode;
  onMenuToggle?: () => void;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  className = '',
  items,
  logo,
  onMenuToggle
}) => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { getAccessibleMenuItems } = usePermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 过滤可访问的导航项
  const accessibleItems = getAccessibleMenuItems(items);

  const isActiveItem = (item: NavigationItem): boolean => {
    if (!item.path) return false;

    if (item.children && item.children.length > 0) {
      return item.children.some(child =>
        child.path && location.pathname.startsWith(child.path)
      );
    }

    return location.pathname === item.path ||
           location.pathname.startsWith(item.path + '/');
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    onMenuToggle?.();
  };

  const renderNavigationItem = (item: NavigationItem, index: number) => {
    const isActive = isActiveItem(item);
    const hasChildren = item.children && item.children.length > 0;

    if (item.action) {
      return (
        <button
          key={index}
          onClick={() => {
            // 处理特殊操作，如登出
            if (item.action === 'logout') {
              // 调用登出逻辑
            }
          }}
          className={\`nav-item nav-button \${isActive ? 'active' : ''}\`}
        >
          {item.icon && <span className="nav-icon">{item.icon}</span>}
          <span className="nav-label">{item.label}</span>
          {item.badge && (
            <span className={\`nav-badge nav-badge--\${item.badge.variant}\`}>
              {item.badge.text}
            </span>
          )}
        </button>
      );
    }

    if (hasChildren) {
      return (
        <div key={index} className={\`nav-item nav-dropdown \${isActive ? 'active' : ''}\`}>
          <button className="nav-dropdown-toggle">
            {item.icon && <span className="nav-icon">{item.icon}</span>}
            <span className="nav-label">{item.label}</span>
            <span className="nav-arrow">▼</span>
          </button>
          <div className="nav-dropdown-menu">
            {item.children?.map((child, childIndex) => (
              <Link
                key={childIndex}
                to={child.path || '#'}
                className={\`nav-dropdown-item \${
                  location.pathname === child.path ? 'active' : ''
                }\`}
                target={child.external ? child.target : undefined}
              >
                {child.icon && <span className="nav-icon">{child.icon}</span>}
                <span className="nav-label">{child.label}</span>
                {child.badge && (
                  <span className={\`nav-badge nav-badge--\${child.badge.variant}\`}>
                    {child.badge.text}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    return (
      <Link
        key={index}
        to={item.path || '#'}
        className={\`nav-item nav-link \${isActive ? 'active' : ''}\`}
        target={item.external ? item.target : undefined}
      >
        {item.icon && <span className="nav-icon">{item.icon}</span>}
        <span className="nav-label">{item.label}</span>
        {item.badge && (
          <span className={\`nav-badge nav-badge--\${item.badge.variant}\`}>
            {item.badge.text}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className={\`main-navigation \${className}\`}>
      <div className="nav-container">
        {/* Logo */}
        <div className="nav-brand">
          {logo || (
            <Link to="/" className="nav-logo">
              <span className="nav-logo-text">Test Web</span>
            </Link>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="nav-menu">
          {accessibleItems.map(renderNavigationItem)}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="nav-mobile-toggle"
          onClick={handleMobileMenuToggle}
          aria-label="Toggle mobile menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="nav-mobile-menu">
          {accessibleItems.map(renderNavigationItem)}
        </div>
      )}
    </nav>
  );
};

export default MainNavigation;`;

      fs.writeFileSync(mainNavPath, mainNavContent);
      this.addFix('navigation', mainNavPath, '创建主导航组件');
    }
  }

  /**
   * 创建侧边栏导航
   */
  async createSidebarNavigation() {
    const sidebarNavPath = path.join(this.projectRoot, 'frontend/components/navigation/SidebarNavigation.tsx');

    if (!fs.existsSync(sidebarNavPath)) {
      const sidebarNavContent = `/**
 * 侧边栏导航组件
 * 应用的侧边栏导航菜单
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { NavigationItem } from '../../types/routes';

interface SidebarNavigationProps {
  className?: string;
  items: NavigationItem[];
  collapsed?: boolean;
  onToggle?: () => void;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  className = '',
  items,
  collapsed = false,
  onToggle
}) => {
  const location = useLocation();
  const { getAccessibleMenuItems } = usePermissions();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 过滤可访问的导航项
  const accessibleItems = getAccessibleMenuItems(items);

  const isActiveItem = (item: NavigationItem): boolean => {
    if (!item.path) return false;

    if (item.children && item.children.length > 0) {
      return item.children.some(child =>
        child.path && location.pathname.startsWith(child.path)
      );
    }

    return location.pathname === item.path ||
           location.pathname.startsWith(item.path + '/');
  };

  const toggleExpanded = (itemLabel: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemLabel)) {
      newExpanded.delete(itemLabel);
    } else {
      newExpanded.add(itemLabel);
    }
    setExpandedItems(newExpanded);
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isActive = isActiveItem(item);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.label);

    if (hasChildren) {
      return (
        <div key={item.label} className={\`sidebar-item sidebar-group level-\${level}\`}>
          <button
            className={\`sidebar-group-toggle \${isActive ? 'active' : ''}\`}
            onClick={() => toggleExpanded(item.label)}
            aria-expanded={isExpanded}
          >
            {item.icon && <span className="sidebar-icon">{item.icon}</span>}
            {!collapsed && (
              <>
                <span className="sidebar-label">{item.label}</span>
                <span className={\`sidebar-arrow \${isExpanded ? 'expanded' : ''}\`}>
                  ▼
                </span>
              </>
            )}
          </button>

          {isExpanded && !collapsed && (
            <div className="sidebar-submenu">
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        to={item.path || '#'}
        className={\`sidebar-item sidebar-link level-\${level} \${isActive ? 'active' : ''}\`}
        title={collapsed ? item.label : undefined}
      >
        {item.icon && <span className="sidebar-icon">{item.icon}</span>}
        {!collapsed && (
          <>
            <span className="sidebar-label">{item.label}</span>
            {item.badge && (
              <span className={\`sidebar-badge sidebar-badge--\${item.badge.variant}\`}>
                {item.badge.text}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <aside className={\`sidebar-navigation \${collapsed ? 'collapsed' : ''} \${className}\`}>
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="sidebar-menu">
        {accessibleItems.map(item => renderNavigationItem(item))}
      </nav>
    </aside>
  );
};

export default SidebarNavigation;`;

      fs.writeFileSync(sidebarNavPath, sidebarNavContent);
      this.addFix('navigation', sidebarNavPath, '创建侧边栏导航组件');
    }
  }

  /**
   * 创建用户导航菜单
   */
  async createUserNavigation() {
    const userNavPath = path.join(this.projectRoot, 'frontend/components/navigation/UserNavigation.tsx');

    if (!fs.existsSync(userNavPath)) {
      const userNavContent = `/**
 * 用户导航菜单组件
 * 用户相关的导航和操作菜单
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NavigationItem } from '../../types/routes';

interface UserNavigationProps {
  className?: string;
  items?: NavigationItem[];
  showAvatar?: boolean;
  avatarSize?: 'small' | 'medium' | 'large';
}

export const UserNavigation: React.FC<UserNavigationProps> = ({
  className = '',
  items = [],
  showAvatar = true,
  avatarSize = 'medium'
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 默认用户菜单项
  const defaultItems: NavigationItem[] = [
    { label: '个人资料', path: '/profile', icon: '👤' },
    { label: '设置', path: '/settings', icon: '⚙️' },
    { label: '帮助', path: '/help', icon: '❓' },
    { label: '退出登录', action: 'logout', icon: '🚪' }
  ];

  const menuItems = items.length > 0 ? items : defaultItems;

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleItemClick = (item: NavigationItem) => {
    if (item.action === 'logout') {
      logout();
      navigate('/login');
    }
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const getAvatarSizeClass = () => {
    switch (avatarSize) {
      case 'small': return 'w-8 h-8';
      case 'large': return 'w-12 h-12';
      default: return 'w-10 h-10';
    }
  };

  if (!user) {
    return (
      <div className={\`user-navigation guest \${className}\`}>
        <Link to="/login" className="login-button">
          登录
        </Link>
        <Link to="/register" className="register-button">
          注册
        </Link>
      </div>
    );
  }

  return (
    <div className={\`user-navigation \${className}\`} ref={dropdownRef}>
      <button
        className="user-menu-trigger"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {showAvatar && (
          <div className={\`user-avatar \${getAvatarSizeClass()}\`}>
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || '用户头像'}
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className="user-info">
          <span className="user-name">{user.name || user.email}</span>
          {user.role && (
            <span className="user-role">{user.role}</span>
          )}
        </div>

        <span className={\`dropdown-arrow \${isOpen ? 'open' : ''}\`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-details">
              <div className="user-name">{user.name || user.email}</div>
              {user.email && user.name && (
                <div className="user-email">{user.email}</div>
              )}
              {user.role && (
                <div className="user-role-badge">{user.role}</div>
              )}
            </div>
          </div>

          <div className="user-menu-divider"></div>

          <div className="user-menu-items">
            {menuItems.map((item, index) => (
              <div key={index} className="user-menu-item">
                {item.action ? (
                  <button
                    className="user-menu-button"
                    onClick={() => handleItemClick(item)}
                  >
                    {item.icon && <span className="menu-icon">{item.icon}</span>}
                    <span className="menu-label">{item.label}</span>
                  </button>
                ) : (
                  <Link
                    to={item.path || '#'}
                    className="user-menu-link"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon && <span className="menu-icon">{item.icon}</span>}
                    <span className="menu-label">{item.label}</span>
                    {item.badge && (
                      <span className={\`menu-badge menu-badge--\${item.badge.variant}\`}>
                        {item.badge.text}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserNavigation;`;

      fs.writeFileSync(userNavPath, userNavContent);
      this.addFix('navigation', userNavPath, '创建用户导航菜单组件');
    }
  }

  /**
   * 实现面包屑导航
   */
  async implementBreadcrumbNavigation() {
    console.log('🍞 实现面包屑导航...');

    const breadcrumbPath = path.join(this.projectRoot, 'frontend/components/navigation/Breadcrumb.tsx');

    if (!fs.existsSync(breadcrumbPath)) {
      const breadcrumbContent = `/**
 * 面包屑导航组件
 * 显示当前页面的导航路径
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BreadcrumbItem } from '../../types/routes';
import { generateBreadcrumbs } from '../../utils/routeUtils';

interface BreadcrumbProps {
  className?: string;
  separator?: React.ReactNode;
  maxItems?: number;
  showHome?: boolean;
  homeLabel?: string;
  homePath?: string;
  items?: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  className = '',
  separator = '/',
  maxItems = 5,
  showHome = true,
  homeLabel = '首页',
  homePath = '/',
  items: customItems
}) => {
  const location = useLocation();

  // 生成面包屑项目
  const breadcrumbItems = customItems || generateBreadcrumbs(location.pathname, []);

  // 添加首页项目
  const allItems = showHome
    ? [{ label: homeLabel, path: homePath }, ...breadcrumbItems]
    : breadcrumbItems;

  // 限制显示的项目数量
  const displayItems = allItems.length > maxItems
    ? [
        allItems[0],
        { label: '...', path: undefined },
        ...allItems.slice(-maxItems + 2)
      ]
    : allItems;

  if (displayItems.length <= 1) {
    return null;
  }

  return (
    <nav className={\`breadcrumb \${className}\`} aria-label="面包屑导航">
      <ol className="breadcrumb-list">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';

          return (
            <li
              key={index}
              className={\`breadcrumb-item \${isLast ? 'active' : ''} \${isEllipsis ? 'ellipsis' : ''}\`}
            >
              {!isLast && !isEllipsis && item.path ? (
                <Link
                  to={item.path}
                  className="breadcrumb-link"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  <span className="breadcrumb-text">{item.label}</span>
                </Link>
              ) : (
                <span className="breadcrumb-text">
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * 面包屑Hook
 */
export const useBreadcrumb = () => {
  const location = useLocation();

  const setBreadcrumb = (items: BreadcrumbItem[]) => {
    // 可以通过Context或状态管理来设置自定义面包屑
  };

  const addBreadcrumbItem = (item: BreadcrumbItem) => {
    // 添加面包屑项目
  };

  return {
    currentPath: location.pathname,
    setBreadcrumb,
    addBreadcrumbItem
  };
};

export default Breadcrumb;`;

      fs.writeFileSync(breadcrumbPath, breadcrumbContent);
      this.addFix('breadcrumbs', breadcrumbPath, '创建面包屑导航组件');
    }
  }

  /**
   * 创建页面标题管理
   */
  async createPageTitleManager() {
    console.log('📄 创建页面标题管理...');

    const pageTitlePath = path.join(this.projectRoot, 'frontend/hooks/usePageTitle.ts');

    if (!fs.existsSync(pageTitlePath)) {
      const pageTitleContent = `/**
 * 页面标题管理Hook
 * 动态设置和管理页面标题
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTitleOptions {
  suffix?: string;
  separator?: string;
  template?: string;
}

export const usePageTitle = (
  title?: string,
  options: PageTitleOptions = {}
) => {
  const location = useLocation();
  const previousTitle = useRef<string>('');

  const {
    suffix = 'Test Web',
    separator = ' - ',
    template = '{title}{separator}{suffix}'
  } = options;

  useEffect(() => {
    if (title) {
      // 保存之前的标题
      previousTitle.current = document.title;

      // 设置新标题
      const newTitle = template
        .replace('{title}', title)
        .replace('{separator}', separator)
        .replace('{suffix}', suffix);

      document.title = newTitle;
    }

    // 清理函数：恢复之前的标题
    return () => {
      if (previousTitle.current) {
        document.title = previousTitle.current;
      }
    };
  }, [title, suffix, separator, template]);

  // 动态设置标题的函数
  const setTitle = (newTitle: string) => {
    const formattedTitle = template
      .replace('{title}', newTitle)
      .replace('{separator}', separator)
      .replace('{suffix}', suffix);

    document.title = formattedTitle;
  };

  // 重置为默认标题
  const resetTitle = () => {
    document.title = suffix;
  };

  return {
    setTitle,
    resetTitle,
    currentTitle: document.title
  };
};

/**
 * 页面元数据管理Hook
 */
export const usePageMeta = () => {
  const setMetaTag = (name: string, content: string) => {
    let metaTag = document.querySelector(\`meta[name="\${name}"]\`) as HTMLMetaElement;

    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = name;
      document.head.appendChild(metaTag);
    }

    metaTag.content = content;
  };

  const setDescription = (description: string) => {
    setMetaTag('description', description);
  };

  const setKeywords = (keywords: string[]) => {
    setMetaTag('keywords', keywords.join(', '));
  };

  const setOGTitle = (title: string) => {
    setMetaTag('og:title', title);
  };

  const setOGDescription = (description: string) => {
    setMetaTag('og:description', description);
  };

  const setOGImage = (imageUrl: string) => {
    setMetaTag('og:image', imageUrl);
  };

  return {
    setMetaTag,
    setDescription,
    setKeywords,
    setOGTitle,
    setOGDescription,
    setOGImage
  };
};

export default usePageTitle;`;

      fs.writeFileSync(pageTitlePath, pageTitleContent);
      this.addFix('pageTitle', pageTitlePath, '创建页面标题管理Hook');
    }
  }

  /**
   * 集成懒加载路由
   */
  async integrateLazyRoutes() {
    console.log('⚡ 集成懒加载路由...');

    const routeIntegrationPath = path.join(this.projectRoot, 'frontend/components/routing/RouteManager.tsx');

    // 确保目录存在
    const routingDir = path.dirname(routeIntegrationPath);
    if (!fs.existsSync(routingDir)) {
      fs.mkdirSync(routingDir, { recursive: true });
    }

    if (!fs.existsSync(routeIntegrationPath)) {
      const routeIntegrationContent = `/**
 * 路由管理器
 * 集成懒加载路由和性能优化
 */

import React, { Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Loading } from '../ui/Loading';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { usePageTitle } from '../../hooks/usePageTitle';
import { preloadHighPriorityRoutes, preloadRouteOnHover } from '../../config/lazyRoutes';

interface RouteManagerProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  enablePreloading?: boolean;
}

export const RouteManager: React.FC<RouteManagerProps> = ({
  children,
  fallback: Fallback = Loading,
  enablePreloading = true
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
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const pageTitle = pathSegments.length > 0
      ? pathSegments[pathSegments.length - 1].replace(/[-_]/g, ' ')
      : '首页';

    setTitle(pageTitle);
  }, [location.pathname, setTitle]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<Fallback />}>
        <div
          className="route-container"
          onMouseEnter={(e) => {
            // 预加载悬停的路由
            const target = e.target as HTMLElement;
            const link = target.closest('a[href]') as HTMLAnchorElement;
            if (link && enablePreloading) {
              preloadRouteOnHover(link.pathname);
            }
          }}
        >
          {children}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

export default RouteManager;`;

      fs.writeFileSync(routeIntegrationPath, routeIntegrationContent);
      this.addFix('routing', routeIntegrationPath, '创建路由管理器');
    }

    console.log('   ✅ 懒加载路由集成完成\n');
  }

  /**
   * 工具方法
   */
  addFix(category, filePath, description) {
    this.fixes.push({
      category,
      file: path.relative(this.projectRoot, filePath),
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成优化报告
   */
  generateOptimizationReport() {
    const reportPath = path.join(this.projectRoot, 'routing-navigation-optimization-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOptimizations: this.fixes.length,
        categories: {
          routing: this.fixes.filter(f => f.category === 'routing').length,
          navigation: this.fixes.filter(f => f.category === 'navigation').length,
          guards: this.fixes.filter(f => f.category === 'guards').length,
          breadcrumbs: this.fixes.filter(f => f.category === 'breadcrumbs').length,
          pageTitle: this.fixes.filter(f => f.category === 'pageTitle').length
        }
      },
      optimizations: this.fixes,
      routeStructure: this.routingConfig.routeStructure,
      navigationConfig: this.routingConfig.navigationConfig,
      nextSteps: [
        '测试路由配置和导航',
        '验证权限控制',
        '检查懒加载效果',
        '优化路由性能',
        '添加路由分析'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 路由和导航优化报告:');
    console.log(`   总优化项: ${report.summary.totalOptimizations}`);
    console.log(`   优化分类:`);
    console.log(`   - 路由配置: ${report.summary.categories.routing}`);
    console.log(`   - 导航系统: ${report.summary.categories.navigation}`);
    console.log(`   - 路由守卫: ${report.summary.categories.guards}`);
    console.log(`   - 面包屑: ${report.summary.categories.breadcrumbs}`);
    console.log(`   - 页面标题: ${report.summary.categories.pageTitle}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    console.log('🎯 下一步操作:');
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
  }
}

// 执行脚本
if (require.main === module) {
  const optimizer = new RoutingNavigationOptimizer();
  optimizer.execute().catch(error => {
    console.error('❌ 路由和导航优化失败:', error);
    process.exit(1);
  });
}

module.exports = RoutingNavigationOptimizer;
