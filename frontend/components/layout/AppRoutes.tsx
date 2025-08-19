/**
 * 优化后的路由配置
 * 
 * 重新组织的路由结构，提供清晰的页面层次和导航关系
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

// 布局组件
import AppLayout from '../../layouts/AppLayout';
import AuthLayout from '../../layouts/AuthLayout';
import EmptyLayout from '../../layouts/EmptyLayout';

// 仪表板页面
import Dashboard from '../../pages/dashboard/Overview';

// 测试页面
import APITest from '../../pages/testing/APITest';
import ContentDetection from '../../pages/testing/ContentDetection';
import PerformanceTest from '../../pages/testing/PerformanceTest';
import SecurityTest from '../../pages/testing/SecurityTest';
import SEOTest from '../../pages/testing/SEOTest';
import StressTest from '../../pages/testing/StressTest';
import TestDashboard from '../../pages/testing/TestDashboard';
import WebsiteTest from '../../pages/testing/WebsiteTest';

// 数据管理页面
import DataCenter from '../../pages/data/DataCenter';
import Export from '../../pages/data/Export';

// 用户页面
import Preferences from '../../pages/user/Preferences';
import Profile from '../../pages/user/Profile';
import Settings from '../../pages/user/Settings';

// 认证页面
import Login from '../../pages/auth/Login';

// 帮助页面
import Documentation from '../../pages/help/Documentation';
import FAQ from '../../pages/help/FAQ';
import Support from '../../pages/help/Support';

// 系统页面
import Home from '../../pages/system/Home';
import NotFound from '../../pages/system/NotFound';

const OptimizedRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* 公开页面 - 空白布局 */}
        <Route path="/" element={<EmptyLayout />}>
          <Route index element={<Home />} />
        </Route>

        {/* 认证页面 - 认证布局 */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<div>注册页面开发中...</div>} />
          <Route path="forgot-password" element={<div>忘记密码页面开发中...</div>} />
        </Route>

        {/* 主应用页面 - 应用布局 */}
        <Route path="/app" element={<AppLayout />}>
          {/* 重定向到仪表板 */}
          <Route index element={<Navigate to="/app/dashboard" replace />} />

          {/* 仪表板模块 */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* 测试模块 */}
          <Route path="testing">
            <Route index element={<TestDashboard />} />
            <Route path="stress" element={<StressTest />} />
            <Route path="performance" element={<PerformanceTest />} />
            <Route path="security" element={<SecurityTest />} />
            <Route path="seo" element={<SEOTest />} />
            <Route path="api" element={<APITest />} />
            <Route path="website" element={<WebsiteTest />} />
            <Route path="content" element={<ContentDetection />} />
          </Route>

          {/* 数据管理模块 */}
          <Route path="data">
            <Route index element={<Navigate to="/app/data/center" replace />} />
            <Route path="center" element={<DataCenter />} />
            <Route path="reports" element={<div>测试报告页面开发中...</div>} />
            <Route path="export" element={<Export />} />
          </Route>

          {/* 用户管理模块 */}
          <Route path="user">
            <Route index element={<Navigate to="/app/user/profile" replace />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="preferences" element={<Preferences />} />
          </Route>

          {/* 帮助支持模块 */}
          <Route path="help">
            <Route index element={<Navigate to="/app/help/docs" replace />} />
            <Route path="docs" element={<Documentation />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="support" element={<Support />} />
          </Route>
        </Route>

        {/* 兼容性路由 - 重定向到新结构 */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/testing" element={<Navigate to="/app/testing" replace />} />
        <Route path="/stress-test" element={<Navigate to="/app/testing/stress" replace />} />
        <Route path="/performance-test" element={<Navigate to="/app/testing/performance" replace />} />
        <Route path="/security-test" element={<Navigate to="/app/testing/security" replace />} />
        <Route path="/seo-test" element={<Navigate to="/app/testing/seo" replace />} />
        <Route path="/api-test" element={<Navigate to="/app/testing/api" replace />} />
        <Route path="/website-test" element={<Navigate to="/app/testing/website" replace />} />
        <Route path="/content-detection" element={<Navigate to="/app/testing/content" replace />} />
        <Route path="/data-center" element={<Navigate to="/app/data/center" replace />} />
        <Route path="/profile" element={<Navigate to="/app/user/profile" replace />} />
        <Route path="/settings" element={<Navigate to="/app/user/settings" replace />} />
        <Route path="/help" element={<Navigate to="/app/help/docs" replace />} />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />

        {/* 404页面 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default OptimizedRoutes;
