import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminGuard, ProtectedRoute } from '../auth';
import { Layout } from '../layout';
import { ErrorBoundary, LoadingSpinner } from '../ui';

// 认证页面 - 直接导入
import Login from '../../pages/auth/Login';
import Register from '../../pages/auth/Register';

// 懒加载页面组件 - 按功能模块组织
// 测试页面
const WebsiteTest = lazy(() => import('../../pages/testing/WebsiteTest'));
const StressTest = lazy(() => import('../../pages/testing/StressTest'));
const ContentTest = lazy(() => import('../../pages/testing/ContentTest'));
const CompatibilityTest = lazy(() => import('../../pages/testing/CompatibilityTest'));
const SecurityTest = lazy(() => import('../../pages/testing/SecurityTest'));
const APITest = lazy(() => import('../../pages/testing/APITest'));
const UXTest = lazy(() => import('../../pages/testing/UXTest'));
const DatabaseTest = lazy(() => import('../../pages/testing/DatabaseTest'));
const NetworkTest = lazy(() => import('../../pages/testing/NetworkTest'));
const SEOTest = lazy(() => import('../../pages/testing/SEOTest'));
const BackgroundTestDemo = lazy(() => import('../../pages/testing/BackgroundTestDemo'));

// 分析页面
const Analytics = lazy(() => import('../../pages/analytics/Analytics'));
const TestHistory = lazy(() => import('../../pages/analytics/TestHistory'));
const StressTestReport = lazy(() => import('../../pages/analytics/StressTestReport'));
const SecurityReport = lazy(() => import('../../pages/analytics/SecurityReport'));
const Reports = lazy(() => import('../../pages/analytics/Reports'));

// 集成页面
const Integrations = lazy(() => import('../../pages/integration/Integrations'));
const APIKeys = lazy(() => import('../../pages/integration/APIKeys'));
const Webhooks = lazy(() => import('../../pages/integration/Webhooks'));
const CICDIntegration = lazy(() => import('../../pages/integration/CICDIntegration'));
const APIDocs = lazy(() => import('../../pages/integration/APIDocs'));
const CICDDemo = lazy(() => import('../integration/CICDDemo'));

// 调度页面
const TestSchedule = lazy(() => import('../../pages/scheduling/TestSchedule'));
const TestResultDetail = lazy(() => import('../../pages/scheduling/TestResultDetail'));
const ScheduledTasks = lazy(() => import('../../pages/scheduling/ScheduledTasks'));

// 管理页面
const Settings = lazy(() => import('../../pages/admin/Settings'));
const UserProfile = lazy(() => import('../../pages/UserProfile'));
const SystemLogs = lazy(() => import('../../pages/SystemLogs'));
const BackupManagement = lazy(() => import('../../pages/admin/BackupManagement'));
const SystemStatus = lazy(() => import('../../pages/admin/SystemStatus'));
const DataManagement = lazy(() => import('../../pages/admin/DataManagement'));
const DataStorage = lazy(() => import('../../pages/admin/DataStorage'));
const Admin = lazy(() => import('../../pages/Admin'));

// 仪表板页面
const ModernDashboard = lazy(() => import('../../pages/dashboard/ModernDashboard'));
const MonitoringDashboard = lazy(() => import('../../pages/dashboard/MonitoringDashboard'));

// 用户页面
const Help = lazy(() => import('../../pages/user/Help'));
const Notifications = lazy(() => import('../../pages/user/Notifications'));
const UserBookmarks = lazy(() => import('../../pages/user/UserBookmarks'));
const Subscription = lazy(() => import('../../pages/user/Subscription'));

// 其他页面
const DownloadDesktop = lazy(() => import('../../pages/misc/DownloadDesktop'));
const ThemeShowcase = lazy(() => import('../../pages/misc/ThemeShowcase'));
const LoginDemo = lazy(() => import('../../pages/auth/LoginDemo'));

// 创建一个包装组件来处理懒加载和错误边界
const LazyPageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    }>
      {children}
    </Suspense>
  </ErrorBoundary>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login-demo" element={<LazyPageWrapper><LoginDemo /></LazyPageWrapper>} />

      {/* 受保护的路由 */}
      <Route path="/" element={<Layout />}>
        {/* 仪表板 */}
        <Route index element={<ProtectedRoute><LazyPageWrapper><ModernDashboard /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="dashboard" element={<ProtectedRoute><LazyPageWrapper><ModernDashboard /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="monitoring" element={<ProtectedRoute><LazyPageWrapper><MonitoringDashboard /></LazyPageWrapper></ProtectedRoute>} />

        {/* 测试功能 */}
        <Route path="stress-test" element={<ProtectedRoute><LazyPageWrapper><StressTest /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="api-test" element={<ProtectedRoute><LazyPageWrapper><APITest /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="security-test" element={<ProtectedRoute><LazyPageWrapper><SecurityTest /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="compatibility-test" element={<ProtectedRoute><LazyPageWrapper><CompatibilityTest /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="seo-test" element={<ProtectedRoute><LazyPageWrapper><SEOTest /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="network-test" element={<ProtectedRoute><LazyPageWrapper><NetworkTest /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="database-test" element={<ProtectedRoute><LazyPageWrapper><DatabaseTest /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="ux-test" element={<ProtectedRoute><LazyPageWrapper><UXTest /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="content-test" element={<ProtectedRoute><LazyPageWrapper><ContentTest /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="website-test" element={<ProtectedRoute><LazyPageWrapper><WebsiteTest /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="background-test-demo" element={<ProtectedRoute><LazyPageWrapper><BackgroundTestDemo /></LazyPageWrapper></ProtectedRoute>} />

        {/* 分析和报告 */}
        <Route path="analytics" element={<ProtectedRoute><LazyPageWrapper><Analytics /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute><LazyPageWrapper><Reports /></LazyPageWrapper></ProtectedRoute>} />

        <Route path="test-history" element={<ProtectedRoute><LazyPageWrapper><TestHistory /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="stress-test-report" element={<ProtectedRoute><LazyPageWrapper><StressTestReport /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="security-report" element={<ProtectedRoute><LazyPageWrapper><SecurityReport /></LazyPageWrapper></ProtectedRoute>} />

        {/* 集成功能 */}
        <Route path="integrations" element={<ProtectedRoute><LazyPageWrapper><Integrations /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="api-keys" element={<ProtectedRoute><LazyPageWrapper><APIKeys /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="webhooks" element={<ProtectedRoute><LazyPageWrapper><Webhooks /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="cicd-integration" element={<ProtectedRoute><LazyPageWrapper><CICDIntegration /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="api-docs" element={<ProtectedRoute><LazyPageWrapper><APIDocs /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="cicd-demo" element={<ProtectedRoute><LazyPageWrapper><CICDDemo /></LazyPageWrapper></ProtectedRoute>} />

        {/* 调度功能 */}
        <Route path="test-schedule" element={<ProtectedRoute><LazyPageWrapper><TestSchedule /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="test-result/:id" element={<ProtectedRoute><LazyPageWrapper><TestResultDetail /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="scheduled-tasks" element={<ProtectedRoute><LazyPageWrapper><ScheduledTasks /></LazyPageWrapper></ProtectedRoute>} />

        {/* 用户功能 */}
        <Route path="profile" element={<ProtectedRoute><LazyPageWrapper><UserProfile /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><LazyPageWrapper><Settings /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><LazyPageWrapper><Notifications /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="bookmarks" element={<ProtectedRoute><LazyPageWrapper><UserBookmarks /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="subscription" element={<ProtectedRoute><LazyPageWrapper><Subscription /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="help" element={<ProtectedRoute><LazyPageWrapper><Help /></LazyPageWrapper></ProtectedRoute>} />

        {/* 管理功能 */}
        <Route path="admin" element={<AdminGuard><LazyPageWrapper><Admin /></LazyPageWrapper></AdminGuard>} />
        <Route path="system-logs" element={<AdminGuard><LazyPageWrapper><SystemLogs /></LazyPageWrapper></AdminGuard>} />
        <Route path="system-status" element={<AdminGuard><LazyPageWrapper><SystemStatus /></LazyPageWrapper></AdminGuard>} />
        <Route path="data-management" element={<AdminGuard><LazyPageWrapper><DataManagement /></LazyPageWrapper></AdminGuard>} />
        <Route path="data-storage" element={<AdminGuard><LazyPageWrapper><DataStorage /></LazyPageWrapper></AdminGuard>} />
        <Route path="backup-management" element={<AdminGuard><LazyPageWrapper><BackupManagement /></LazyPageWrapper></AdminGuard>} />

        {/* 其他功能 */}
        <Route path="theme-showcase" element={<ProtectedRoute><LazyPageWrapper><ThemeShowcase /></LazyPageWrapper></ProtectedRoute>} />
        <Route path="download-desktop" element={<ProtectedRoute><LazyPageWrapper><DownloadDesktop /></LazyPageWrapper></ProtectedRoute>} />
      </Route>
    </Routes>
  );
};
