import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from '../../pages/Login';
import Register from '../../pages/Register';
import { AdminGuard, ProtectedRoute } from '../auth';
import ModernLayout from '../modern/ModernLayout';
import { EnhancedErrorBoundary, LoadingSpinner } from '../ui';

// 懒加载页面组件
const ModernDashboard = lazy(() => import('../../pages/ModernDashboard'));
const WebsiteTest = lazy(() => import('../../pages/WebsiteTest'));
const SecurityTest = lazy(() => import('../../pages/SecurityTest'));
const PerformanceTest = lazy(() => import('../../pages/Performance'));
const SEOTest = lazy(() => import('../../pages/SEOTest'));
const ContentTest = lazy(() => import('../../pages/ContentTest'));
const APITest = lazy(() => import('../../pages/APITest'));
const NetworkTest = lazy(() => import('../../pages/NetworkTest'));
const DatabaseTest = lazy(() => import('../../pages/DatabaseTest'));
const StressTest = lazy(() => import('../../pages/StressTest'));
const CompatibilityTest = lazy(() => import('../../pages/CompatibilityTest'));
const UXTest = lazy(() => import('../../pages/UXTest'));

// 数据管理相关页面
const DataStorage = lazy(() => import('../../pages/DataStorage'));
const DataManagement = lazy(() => import('../../pages/DataManagement'));
const Analytics = lazy(() => import('../../pages/Analytics'));
const MonitoringDashboard = lazy(() => import('../../pages/MonitoringDashboard'));

// 报告和历史
const TestHistory = lazy(() => import('../../pages/TestHistory'));
const EnhancedTestHistory = lazy(() => import('../../pages/EnhancedTestHistory'));
const Reports = lazy(() => import('../../pages/Reports'));
const TestResultDetail = lazy(() => import('../../pages/TestResultDetail'));
const StressTestReport = lazy(() => import('../../pages/StressTestReport'));
const SecurityReport = lazy(() => import('../../pages/SecurityReport'));

// 系统管理
const Admin = lazy(() => import('../../pages/Admin'));
const SystemStatus = lazy(() => import('../../pages/SystemStatus'));
const SystemLogs = lazy(() => import('../../pages/SystemLogs'));
const BackupManagement = lazy(() => import('../../pages/BackupManagement'));

// 用户相关
const UserProfile = lazy(() => import('../../pages/UserProfile'));
const UserBookmarks = lazy(() => import('../../pages/UserBookmarks'));
const Notifications = lazy(() => import('../../pages/Notifications'));

// 集成和配置
const Integrations = lazy(() => import('../../pages/Integrations'));
const CICDIntegration = lazy(() => import('../../pages/CICDIntegration'));
const Webhooks = lazy(() => import('../../pages/Webhooks'));
const APIKeys = lazy(() => import('../../pages/APIKeys'));
const APIDocs = lazy(() => import('../../pages/APIDocs'));

// 调度和任务
const TestSchedule = lazy(() => import('../../pages/TestSchedule'));
const ScheduledTasks = lazy(() => import('../../pages/ScheduledTasks'));

// 其他功能
const UnifiedSettings = lazy(() => import('../../pages/UnifiedSettings'));
const Help = lazy(() => import('../../pages/Help'));
const ThemeShowcase = lazy(() => import('../../pages/ThemeShowcase'));
const Subscription = lazy(() => import('../../pages/Subscription'));
const DownloadDesktop = lazy(() => import('../../pages/DownloadDesktop'));

// 演示页面
const LoginDemo = lazy(() => import('../../pages/LoginDemo'));
const BackgroundTestDemo = lazy(() => import('../../pages/BackgroundTestDemo'));

interface LazyPageWrapperProps {
  children: React.ReactNode;
}

const LazyPageWrapper: React.FC<LazyPageWrapperProps> = ({ children }) => (
  <EnhancedErrorBoundary>
    <Suspense fallback={<LoadingSpinner size="lg" text="加载页面..." />}>
      {children}
    </Suspense>
  </EnhancedErrorBoundary>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login-demo" element={
        <LazyPageWrapper>
          <LoginDemo />
        </LazyPageWrapper>
      } />
      <Route path="/background-test-demo" element={
        <LazyPageWrapper>
          <BackgroundTestDemo />
        </LazyPageWrapper>
      } />

      {/* 受保护的路由 */}
      <Route path="/" element={
        <ProtectedRoute>
          <ModernLayout />
        </ProtectedRoute>
      }>
        {/* 仪表板 */}
        <Route index element={
          <LazyPageWrapper>
            <ModernDashboard />
          </LazyPageWrapper>
        } />

        {/* 测试工具 */}
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
        <Route path="performance" element={
          <LazyPageWrapper>
            <WebsiteTest />
          </LazyPageWrapper>
        } />
        <Route path="seo-test" element={
          <LazyPageWrapper>
            <SEOTest />
          </LazyPageWrapper>
        } />
        <Route path="content-test" element={
          <LazyPageWrapper>
            <ContentTest />
          </LazyPageWrapper>
        } />
        <Route path="api-test" element={
          <LazyPageWrapper>
            <APITest />
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
            <StressTest />
          </LazyPageWrapper>
        } />
        <Route path="compatibility-test" element={
          <LazyPageWrapper>
            <CompatibilityTest />
          </LazyPageWrapper>
        } />
        <Route path="ux-test" element={
          <LazyPageWrapper>
            <UXTest />
          </LazyPageWrapper>
        } />

        {/* 数据管理 */}
        <Route path="data-storage" element={
          <LazyPageWrapper>
            <DataStorage />
          </LazyPageWrapper>
        } />
        <Route path="data-management" element={
          <LazyPageWrapper>
            <DataManagement />
          </LazyPageWrapper>
        } />
        <Route path="analytics" element={
          <LazyPageWrapper>
            <Analytics />
          </LazyPageWrapper>
        } />
        <Route path="monitoring" element={
          <LazyPageWrapper>
            <MonitoringDashboard />
          </LazyPageWrapper>
        } />

        {/* 报告和历史 */}
        <Route path="test-history" element={
          <LazyPageWrapper>
            <TestHistory />
          </LazyPageWrapper>
        } />
        <Route path="enhanced-test-history" element={
          <LazyPageWrapper>
            <EnhancedTestHistory />
          </LazyPageWrapper>
        } />
        <Route path="reports" element={
          <LazyPageWrapper>
            <Reports />
          </LazyPageWrapper>
        } />
        <Route path="test-result/:id" element={
          <LazyPageWrapper>
            <TestResultDetail />
          </LazyPageWrapper>
        } />
        <Route path="stress-test-report" element={
          <LazyPageWrapper>
            <StressTestReport />
          </LazyPageWrapper>
        } />
        <Route path="security-report" element={
          <LazyPageWrapper>
            <SecurityReport />
          </LazyPageWrapper>
        } />

        {/* 用户相关 */}
        <Route path="profile" element={
          <LazyPageWrapper>
            <UserProfile />
          </LazyPageWrapper>
        } />
        <Route path="bookmarks" element={
          <LazyPageWrapper>
            <UserBookmarks />
          </LazyPageWrapper>
        } />
        <Route path="notifications" element={
          <LazyPageWrapper>
            <Notifications />
          </LazyPageWrapper>
        } />

        {/* 集成和配置 */}
        <Route path="integrations" element={
          <LazyPageWrapper>
            <Integrations />
          </LazyPageWrapper>
        } />
        <Route path="cicd-integration" element={
          <LazyPageWrapper>
            <CICDIntegration />
          </LazyPageWrapper>
        } />
        <Route path="webhooks" element={
          <LazyPageWrapper>
            <Webhooks />
          </LazyPageWrapper>
        } />
        <Route path="api-keys" element={
          <LazyPageWrapper>
            <APIKeys />
          </LazyPageWrapper>
        } />
        <Route path="api-docs" element={
          <LazyPageWrapper>
            <APIDocs />
          </LazyPageWrapper>
        } />

        {/* 调度和任务 */}
        <Route path="test-schedule" element={
          <LazyPageWrapper>
            <TestSchedule />
          </LazyPageWrapper>
        } />
        <Route path="scheduled-tasks" element={
          <LazyPageWrapper>
            <ScheduledTasks />
          </LazyPageWrapper>
        } />

        {/* 系统管理 - 需要管理员权限 */}
        <Route path="admin" element={
          <AdminGuard>
            <LazyPageWrapper>
              <Admin />
            </LazyPageWrapper>
          </AdminGuard>
        } />
        <Route path="system-status" element={
          <AdminGuard>
            <LazyPageWrapper>
              <SystemStatus />
            </LazyPageWrapper>
          </AdminGuard>
        } />
        <Route path="system-logs" element={
          <AdminGuard>
            <LazyPageWrapper>
              <SystemLogs />
            </LazyPageWrapper>
          </AdminGuard>
        } />
        <Route path="backup-management" element={
          <AdminGuard>
            <LazyPageWrapper>
              <BackupManagement />
            </LazyPageWrapper>
          </AdminGuard>
        } />

        {/* 其他功能 */}
        <Route path="settings" element={
          <LazyPageWrapper>
            <UnifiedSettings />
          </LazyPageWrapper>
        } />
        <Route path="help" element={
          <LazyPageWrapper>
            <Help />
          </LazyPageWrapper>
        } />
        <Route path="theme-showcase" element={
          <LazyPageWrapper>
            <ThemeShowcase />
          </LazyPageWrapper>
        } />
        <Route path="subscription" element={
          <LazyPageWrapper>
            <Subscription />
          </LazyPageWrapper>
        } />
        <Route path="download-desktop" element={
          <LazyPageWrapper>
            <DownloadDesktop />
          </LazyPageWrapper>
        } />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
