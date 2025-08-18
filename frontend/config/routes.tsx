/**
 * 主路由配置
 * 定义应用的完整路由结构
 */

import React, { Suspense    } from 'react';import { Routes, Route, Navigate    } from 'react-router-dom';import { AuthGuard    } from '../components/auth/AuthGuard';import { RoleGuard    } from '../components/auth/RoleGuard';import { Loading    } from '../components/ui/Loading';import { lazyRoutes    } from './lazyRoutes';// 懒加载页面组件
const Home = React.lazy(() => import('../pages/Home'));
const Login = React.lazy(() => import('../pages/core/auth/Login'));
const Register = React.lazy(() => import('../pages/core/auth/Register'));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Profile = React.lazy(() => import('../pages/core/user/Profile'));
const Settings = React.lazy(() => import("../pages/core/settings/Settings'));'
// 测试页面
const PerformanceTest = React.lazy(() => import('../pages/core/testing/PerformanceTest'));
const StressTest = React.lazy(() => import('../pages/core/testing/StressTest'));
const ApiTest = React.lazy(() => import('../pages/core/testing/ApiTest'));
const SeoTest = React.lazy(() => import('../pages/core/testing/SeoTest'));
const SecurityTest = React.lazy(() => import("../pages/core/testing/SecurityTest'));'
// 管理页面
const TestManagement = React.lazy(() => import('../pages/core/management/TestManagement'));
const DataManagement = React.lazy(() => import('../pages/core/management/DataManagement'));
const UserManagement = React.lazy(() => import("../pages/core/management/UserManagement'));'
// 结果页面
const TestResults = React.lazy(() => import('../pages/core/results/TestResults'));
const Analytics = React.lazy(() => import('../pages/core/analytics/Analytics'));
const Reports = React.lazy(() => import("../pages/core/reports/Reports'));'
// 错误页面
const NotFound = React.lazy(() => import('../pages/errors/NotFound'));
const Unauthorized = React.lazy(() => import("../pages/errors/Unauthorized'));'
export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<Loading    />}>
      <Routes>
        {/* 公共路由 */}
        <Route path= '/' element={<Home    />} />
        <Route path= '/login' element={<Login    />} />
        <Route path= '/register' element={<Register    />} />
        
        {/* 受保护的路由 */}
        <Route path= '/dashboard' element={
          <AuthGuard>
            <Dashboard  />
          </AuthGuard>
        } />
        
        <Route path= '/profile' element={
          <AuthGuard>
            <Profile  />
          </AuthGuard>
        } />
        
        <Route path= '/settings' element={
          <AuthGuard>
            <Settings  />
          </AuthGuard>
        } />
        
        {/* 测试路由 */}
        <Route path= '/test/performance' element={
          <AuthGuard>
            <PerformanceTest  />
          </AuthGuard>
        } />
        
        <Route path= '/test/stress' element={
          <AuthGuard>
            <StressTest  />
          </AuthGuard>
        } />
        
        <Route path= '/test/api' element={
          <AuthGuard>
            <ApiTest  />
          </AuthGuard>
        } />
        
        <Route path= '/test/seo' element={
          <AuthGuard>
            <SeoTest  />
          </AuthGuard>
        } />
        
        <Route path= '/test/security' element={
          <AuthGuard>
            <SecurityTest  />
          </AuthGuard>
        } />
        
        {/* 管理路由 - 需要管理员权限 */}
        <Route path= '/management/tests' element={
          <AuthGuard>
            <RoleGuard requiredRoles={['admin']}>
              <TestManagement  />
            </RoleGuard>
          </AuthGuard>
        } />
        
        <Route path= '/management/data' element={
          <AuthGuard>
            <RoleGuard requiredRoles={['admin']}>
              <DataManagement  />
            </RoleGuard>
          </AuthGuard>
        } />
        
        <Route path= '/management/users' element={
          <AuthGuard>
            <RoleGuard requiredRoles={['admin']}>
              <UserManagement  />
            </RoleGuard>
          </AuthGuard>
        } />
        
        {/* 结果路由 */}
        <Route path= '/results' element={
          <AuthGuard>
            <TestResults  />
          </AuthGuard>
        } />
        
        <Route path= '/analytics' element={
          <AuthGuard>
            <Analytics  />
          </AuthGuard>
        } />
        
        <Route path= '/reports' element={
          <AuthGuard>
            <Reports  />
          </AuthGuard>
        } />
        
        {/* 错误路由 */}
        <Route path= '/unauthorized' element={<Unauthorized    />} />
        <Route path= '/404' element={<NotFound    />} />
        
        {/* 重定向和通配符路由 */}
        <Route path= '/test' element={<Navigate to= '/test/performance' replace    />} />
        <Route path= '/management' element={<Navigate to= '/management/tests' replace    />} />
        <Route path= '*' element={<Navigate to= '/404' replace    />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;