import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from '../../pages/Login';
import Register from '../../pages/Register';
import { AdminGuard, ProtectedRoute } from '../auth';
import { Layout } from '../layout';
import { ErrorBoundary, LoadingSpinner } from '../ui';

// 懒加载页面组件
const Dashboard = lazy(() => import('../../pages/dashboard/Dashboard'));
const WebsiteTest = lazy(() => import('../../pages/WebsiteTest'));
const SecurityTest = lazy(() => import('../../pages/SecurityTest'));
const PerformanceTest = lazy(() => import('../../pages/PerformanceTest'));
const SEOTest = lazy(() => import('../../pages/SeoTest'));

// MFA认证相关页面
const MFASetup = lazy(() => import('../../pages/auth/MFASetup'));
const MFAVerification = lazy(() => import('../../pages/auth/MFAVerification'));

const ApiTest = lazy(() => import('../../pages/ApiTest'));
const NetworkTest = lazy(() => import('../../pages/NetworkTest'));
const DatabaseTest = lazy(() => import('../../pages/DatabaseTest'));
const CompatibilityTest = lazy(() => import('../../pages/CompatibilityTest'));
const AccessibilityTest = lazy(() => import('../../pages/AccessibilityTest'));
const UXTest = lazy(() => import('../../pages/UxTest'));
const UnifiedTestPage = lazy(() => import('../../pages/UnifiedTestPage'));

// 数据管理相关页面
const DataStorage = lazy(() => import('../../pages/admin/DataStorage'));
const DataManagement = lazy(() => import('../../pages/DataManagement'));
const DataCenter = lazy(() => import('../../pages/DataCenter'));
const Statistics = lazy(() => import('../../pages/Statistics'));
const Analytics = lazy(() => import('../../pages/analytics'));
const MonitoringDashboard = lazy(() => import('../../pages/dashboard/MonitoringDashboard'));
// 报告和历史
// const TestHistory = lazy(() => import('../../pages/TestHistory'));
const Reports = lazy(() => import('../../pages/Reports'));
const TestResultDetail = lazy(() => import('../../pages/TestResultDetail'));
const SecurityReport = lazy(() => import('../../pages/SecurityReport'));

// 系统管理 - 只保留Admin页面，其他管理功能都在Admin内部
const Admin = lazy(() => import('../../pages/admin'));

// 用户相关
const UserProfile = lazy(() => import('../../pages/UserProfile'));
const UserBookmarks = lazy(() => import('../../pages/UserBookmarks'));

// 测试和优化
// const TestOptimizations = lazy(() => import('../../pages/TestOptimizations'));
const Notifications = lazy(() => import('../../pages/Notifications'));

// 集成和配置
// const Integrations = lazy(() => import('../../pages/Integrations'));
const CICDIntegration = lazy(() => import('../../pages/CicdIntegration'));
const Webhooks = lazy(() => import('../../pages/Webhooks'));
// const ApiKeys = lazy(() => import('../../pages/ApiKeys'));
// const ApiDocs = lazy(() => import('../../pages/ApiDocs'));
// 调度和任务
// const TestSchedule = lazy(() => import('../../pages/TestSchedule'));
const ScheduledTasks = lazy(() => import('../../pages/ScheduledTasks'));

// 其他功能
const Settings = lazy(() => import('../../pages/admin/Settings'));
const Help = lazy(() => import('../../pages/Help'));
const Subscription = lazy(() => import('../../pages/Subscription'));
const DownloadDesktop = lazy(() => import('../../pages/DownloadDesktop'));

interface LazyPageWrapperProps {
  children: React.ReactNode;
}

const LazyPageWrapper: React.FC<LazyPageWrapperProps> = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingSpinner size="lg" text="加载页面..." />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* MFA认证路由 */}
      <Route path="/auth/mfa/setup" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <MFASetup />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path="/auth/mfa/verify" element={
        <LazyPageWrapper>
          <MFAVerification />
        </LazyPageWrapper>
      } />

      {/* 公开路由 - 测试工具页面 */}
      <Route path="/" element={<Layout />}>
        {/* 测试工具 - 公开访问,但功能需要登录 */}
        <Route path="test" element={<Navigate to="/website-test" replace />} />
        <Route path="website-test" element={
          <LazyPageWrapper>
            <WebsiteTest />
          </LazyPageWrapper>
        } />
        <Route path="security-test" element={
          <LazyPageWrapper>
            <SecurityTest />
          </LazyPageWrapper>
        } />
        <Route path="performance-test" element={
          <LazyPageWrapper>
            <PerformanceTest />
          </LazyPageWrapper>
        } />

        <Route path="seo-test" element={
          <LazyPageWrapper>
            <SEOTest />
          </LazyPageWrapper>
        } />

        <Route path="api-test" element={
          <LazyPageWrapper>
            <ApiTest />
          </LazyPageWrapper>
        } />
        <Route path="network-test" element={
          <LazyPageWrapper>
            <NetworkTest />
          </LazyPageWrapper>
        } />
        <Route path="database-test" element={
          <LazyPageWrapper>
            <DatabaseTest />
          </LazyPageWrapper>
        } />
        <Route path="stress-test" element={
          <LazyPageWrapper>
            <PerformanceTest />
          </LazyPageWrapper>
        } />
        <Route path="compatibility-test" element={
          <LazyPageWrapper>
            <CompatibilityTest />
          </LazyPageWrapper>
        } />
        <Route path="accessibility-test" element={
          <LazyPageWrapper>
            <AccessibilityTest />
          </LazyPageWrapper>
        } />
        <Route path="chrome-compatibility-test" element={
          <Navigate to="/compatibility-test" replace />
        } />
        <Route path="ux-test" element={
          <LazyPageWrapper>
            <UXTest />
          </LazyPageWrapper>
        } />

        {/* 统一测试引擎 */}
        <Route path="unified-test" element={
          <LazyPageWrapper>
            <UnifiedTestPage />
          </LazyPageWrapper>
        } />

        {/* 测试优化页面 */}
        <Route path="test-optimizations" element={
          <LazyPageWrapper>
            <UnifiedTestPage />
          </LazyPageWrapper>
        } />
        {/* 公开的测试历史查看 */}
        <Route path="test-history" element={
          <LazyPageWrapper>
            <DataCenter />
          </LazyPageWrapper>
        } />

        <Route path="test-result/:id" element={
          <LazyPageWrapper>
            <TestResultDetail />
          </LazyPageWrapper>
        } />
        <Route path="security-report" element={
          <LazyPageWrapper>
            <SecurityReport />
          </LazyPageWrapper>
        } />

        {/* 公开的帮助和文档 */}
        <Route path="help" element={
          <LazyPageWrapper>
            <Help />
          </LazyPageWrapper>
        } />
        <Route path="api-docs" element={
          <LazyPageWrapper>
            <Help />
          </LazyPageWrapper>
        } />
        <Route path="download-desktop" element={
          <LazyPageWrapper>
            <DownloadDesktop />
          </LazyPageWrapper>
        } />
      </Route>

      {/* 首页重定向到网站测试 */}
      <Route index element={<Navigate to="/website-test" replace />} />

      {/* 仪表板 - 需要登录 */}
      <Route path="dashboard" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <MonitoringDashboard />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 数据管理 - 需要登录 */}
      <Route path="data-storage" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <DataStorage />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path="data-management" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <DataManagement />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      <Route path="statistics" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Statistics />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      <Route path="data-center" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <DataCenter />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path="analytics" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Analytics />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      {/* 监控面板 - 管理员可访问 */}
      <Route path="monitoring" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <MonitoringDashboard />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 报告管理 - 需要登录 */}
      <Route path="reports" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Reports />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 用户相关 - 需要登录 */}
      <Route path="profile" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <UserProfile />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path="bookmarks" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <UserBookmarks />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path="notifications" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Notifications />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 集成和配置 - 需要登录 */}
      <Route path="cicd" element={<Navigate to="/cicd-integration" replace />} />
      <Route path="integrations" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <CICDIntegration />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path="cicd-integration" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <CICDIntegration />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path="webhooks" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Webhooks />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path="api-keys" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Settings />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 调度和任务 - 需要登录 */}
      <Route path="test-schedule" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <ScheduledTasks />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path="scheduled-tasks" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <ScheduledTasks />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 用户设置 - 需要登录 */}
      <Route path="settings" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Settings />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path="subscription" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Subscription />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 系统管理 - 只保留Admin页面，所有管理功能都在Admin内部 */}
      <Route path="admin" element={
        <AdminGuard>
          <LazyPageWrapper>
            <Admin />
          </LazyPageWrapper>
        </AdminGuard>
      } />

      {/* 重定向旧的管理员页面到Admin页面 */}
      <Route path="system-status" element={<Navigate to="/admin" replace />} />
      <Route path="system-logs" element={<Navigate to="/admin" replace />} />
      <Route path="backup-management" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AppRoutes;
