import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from '../../pages/Login';
import Register from '../../pages/Register';
import { AdminGuard, ProtectedRoute } from '../auth';
import ModernLayout from '../modern/ModernLayout';
import { EnhancedErrorBoundary, LoadingSpinner } from '../ui';

// 懒加载页面组件
const ModernDashboard = lazy(() => import('../../pages/dashboard/ModernDashboard'));
const WebsiteTest = lazy(() => import('../../pages/WebsiteTest'));
const SecurityTest = lazy(() => import('../../pages/SecurityTest'));
const PerformanceTest = lazy(() => import('../../pages/PerformanceTest'));
const SEOTest = lazy(() => import('../../pages/SEOTest'));

const APITest = lazy(() => import('../../pages/APITest'));
const NetworkTest = lazy(() => import('../../pages/NetworkTest'));
const DatabaseTest = lazy(() => import('../../pages/DatabaseTest'));
const StressTest = lazy(() => import('../../pages/StressTest'));
const CompatibilityTest = lazy(() => import('../../pages/CompatibilityTest'));
const ChromeCompatibilityTest = lazy(() => import('../../pages/ChromeCompatibilityTest'));
const UXTest = lazy(() => import('../../pages/UXTest'));

// 演示和测试页面
// URLInputDemo 已删除
// LocalStressTestDemo 已删除

// 数据管理相关页面
const DataStorage = lazy(() => import('../../pages/admin/DataStorage'));
const DataManagement = lazy(() => import('../../pages/DataManagement'));
const Statistics = lazy(() => import('../../pages/Statistics'));
const Analytics = lazy(() => import('../../pages/Analytics'));
const MonitoringDashboard = lazy(() => import('../../pages/MonitoringDashboard'));

// 报告和历史
const TestHistory = lazy(() => import('../../pages/TestHistory'));
const EnhancedTestHistory = lazy(() => import('../../pages/EnhancedTestHistory'));
const Reports = lazy(() => import('../../pages/Reports'));
const TestResultDetail = lazy(() => import('../../pages/TestResultDetail'));
const StressTestDetail = lazy(() => import('../../pages/StressTestDetail'));

const StressTestReport = lazy(() => import('../../pages/StressTestReport'));
const SecurityReport = lazy(() => import('../../pages/SecurityReport'));

// 系统管理 - 只保留Admin页面，其他管理功能都在Admin内部
const Admin = lazy(() => import('../../pages/Admin'));

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
// ThemeShowcase 已删除
const Subscription = lazy(() => import('../../pages/Subscription'));
const DownloadDesktop = lazy(() => import('../../pages/DownloadDesktop'));

// 演示页面

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
      {/* LoginDemo 路由已移除，因为文件不存在 */}
      {/* background-test-demo 路由已移除 */}

      {/* 公开路由 - 测试工具页面 */}
      <Route path="/" element={<ModernLayout />}>
        {/* 测试工具 - 公开访问，但功能需要登录 */}
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
        <Route path="chrome-compatibility-test" element={
          <LazyPageWrapper>
            <ChromeCompatibilityTest />
          </LazyPageWrapper>
        } />
        <Route path="ux-test" element={
          <LazyPageWrapper>
            <UXTest />
          </LazyPageWrapper>
        } />

        {/* URLInputDemo 已删除 */}

        {/* 公开的测试历史查看 */}
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
        <Route path="test-result/:id" element={
          <LazyPageWrapper>
            <TestResultDetail />
          </LazyPageWrapper>
        } />
        <Route path="stress-test/:testId" element={
          <LazyPageWrapper>
            <StressTestDetail />
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

        {/* 公开的帮助和文档 */}
        <Route path="help" element={
          <LazyPageWrapper>
            <Help />
          </LazyPageWrapper>
        } />
        <Route path="api-docs" element={
          <LazyPageWrapper>
            <APIDocs />
          </LazyPageWrapper>
        } />
        {/* ThemeShowcase 已删除 */}
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
            <ModernDashboard />
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
      <Route path="analytics" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Analytics />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      {/* 暂时注释掉监控面板路由，等待修复 */}
      {/* <Route path="monitoring" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <MonitoringDashboard />
          </LazyPageWrapper>
        </ProtectedRoute>
      } /> */}

      {/* 报告管理 - 需要登录 */}
      <Route path="reports" element={
        <LazyPageWrapper>
          <Reports />
        </LazyPageWrapper>
      } />

      {/* 用户相关 - 需要登录 */}
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

      {/* 集成和配置 - 需要登录 */}
      <Route path="cicd" element={<Navigate to="/cicd-integration" replace />} />
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

      {/* 调度和任务 - 需要登录 */}
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

      {/* 用户设置 - 需要登录 */}
      <Route path="settings" element={
        <LazyPageWrapper>
          <UnifiedSettings />
        </LazyPageWrapper>
      } />
      <Route path="subscription" element={
        <LazyPageWrapper>
          <Subscription />
        </LazyPageWrapper>
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
