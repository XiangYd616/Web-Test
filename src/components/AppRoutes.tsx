import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ModernLayout from './modern/ModernLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminGuard from './AdminGuard';
import EnhancedErrorBoundary from './EnhancedErrorBoundary';
import EnhancedLoadingSpinner from './EnhancedLoadingSpinner';
import Login from '../pages/Login';
import Register from '../pages/Register';

// 懒加载页面组件 - 统一使用懒加载以提高性能
const WebsiteTest = lazy(() => import('../pages/WebsiteTest'));
// Dashboard已移除，使用ModernDashboard
const StressTest = lazy(() => import('../pages/StressTest'));
const ContentTest = lazy(() => import('../pages/ContentTest'));
const CompatibilityTest = lazy(() => import('../pages/CompatibilityTest'));
const SecurityTest = lazy(() => import('../pages/SecurityTest'));
const APITest = lazy(() => import('../pages/APITest'));
const UXTest = lazy(() => import('../pages/UXTest'));
const Performance = lazy(() => import('../pages/Performance'));
const Integrations = lazy(() => import('../pages/Integrations'));
const APIKeys = lazy(() => import('../pages/APIKeys'));
const Webhooks = lazy(() => import('../pages/Webhooks'));
const DatabaseTest = lazy(() => import('../pages/DatabaseTest'));
const NetworkTest = lazy(() => import('../pages/NetworkTest'));
const TestSchedule = lazy(() => import('../pages/TestSchedule'));
const Analytics = lazy(() => import('../pages/Analytics'));
const CICDIntegration = lazy(() => import('../pages/CICDIntegration'));
const CICDDemo = lazy(() => import('../components/CICDDemo'));
// TestHistory已移除，使用EnhancedTestHistory
const EnhancedTestHistory = lazy(() => import('../pages/EnhancedTestHistory'));
const TestResultDetail = lazy(() => import('../pages/TestResultDetail'));
const UnifiedSettings = lazy(() => import('../pages/UnifiedSettings'));
const UserProfile = lazy(() => import('../pages/UserProfile'));
const Help = lazy(() => import('../pages/Help'));
const DownloadDesktop = lazy(() => import('../pages/DownloadDesktop'));
const MonitoringDashboard = lazy(() => import('../pages/MonitoringDashboard'));
// 系统管理页面
const ScheduledTasks = lazy(() => import('../pages/ScheduledTasks'));
const SystemLogs = lazy(() => import('../pages/SystemLogs'));
const BackupManagement = lazy(() => import('../pages/BackupManagement'));
const Notifications = lazy(() => import('../pages/Notifications'));
const SystemStatus = lazy(() => import('../pages/SystemStatus'));
const DataManagement = lazy(() => import('../pages/DataManagement'));
const DataStorage = lazy(() => import('../pages/DataStorage'));

const Admin = lazy(() => import('../pages/Admin'));
const ModernDashboard = lazy(() => import('../pages/ModernDashboard'));
const StressTestReport = lazy(() => import('../pages/StressTestReport'));
const UserBookmarks = lazy(() => import('../pages/UserBookmarks'));
const ThemeShowcase = lazy(() => import('../pages/ThemeShowcase'));
const LoginDemo = lazy(() => import('../pages/LoginDemo'));


// 创建一个包装组件来处理懒加载和错误边界
const LazyPageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EnhancedErrorBoundary>
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <EnhancedLoadingSpinner size="lg" text="页面加载中..." />
      </div>
    }>
      {children}
    </Suspense>
  </EnhancedErrorBoundary>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 默认首页 - 现代化仪表板 */}
      <Route path="/" element={
        <LazyPageWrapper>
          <ModernDashboard />
        </LazyPageWrapper>
      } />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/download-desktop" element={
        <LazyPageWrapper>
          <DownloadDesktop />
        </LazyPageWrapper>
      } />

      {/* 登录机制演示页面 */}
      <Route path="/login-demo" element={
        <LazyPageWrapper>
          <LoginDemo />
        </LazyPageWrapper>
      } />

      {/* 现代化仪表板 */}
      <Route path="/modern-dashboard" element={
        <LazyPageWrapper>
          <ModernDashboard />
        </LazyPageWrapper>
      } />

      {/* 测试页面 - 可访问但功能需要登录 */}
      <Route path="/test" element={
        <ModernLayout>
          <LazyPageWrapper>
            <WebsiteTest />
          </LazyPageWrapper>
        </ModernLayout>
      } />

      <Route path="/stress-test" element={
        <ModernLayout>
          <LazyPageWrapper>
            <StressTest />
          </LazyPageWrapper>
        </ModernLayout>
      } />

      <Route path="/security-test" element={
        <ModernLayout>
          <LazyPageWrapper>
            <SecurityTest />
          </LazyPageWrapper>
        </ModernLayout>
      } />

      <Route path="/compatibility-test" element={
        <ModernLayout>
          <LazyPageWrapper>
            <CompatibilityTest />
          </LazyPageWrapper>
        </ModernLayout>
      } />

      <Route path="/api-test" element={
        <ModernLayout>
          <LazyPageWrapper>
            <APITest />
          </LazyPageWrapper>
        </ModernLayout>
      } />

      <Route path="/ux-test" element={
        <ModernLayout>
          <LazyPageWrapper>
            <UXTest />
          </LazyPageWrapper>
        </ModernLayout>
      } />

      {/* 受保护的路由 - 仪表板 */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <ModernDashboard />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/stress-test/results/:id" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <StressTestReport />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      <Route path="/content-test" element={
        <ModernLayout>
          <LazyPageWrapper>
            <ContentTest />
          </LazyPageWrapper>
        </ModernLayout>
      } />

      <Route path="/performance" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <Performance />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/integrations" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <Integrations />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/api-keys" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <APIKeys />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/webhooks" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <Webhooks />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/database-test" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <DatabaseTest />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/network-test" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <NetworkTest />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/test-schedule" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <TestSchedule />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/test-history" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <DataStorage />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/analytics" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <Analytics />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/cicd" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <CICDIntegration />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/cicd-demo" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <CICDDemo />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/history" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <EnhancedTestHistory />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/history/legacy" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <EnhancedTestHistory />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/test-result/:id" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <TestResultDetail />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <UnifiedSettings />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <UserProfile />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/bookmarks" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <UserBookmarks />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/help" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <Help />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/theme-showcase" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <ThemeShowcase />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/notifications" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <Notifications />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/monitoring" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <MonitoringDashboard />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      {/* 系统管理路由 */}
      <Route path="/scheduled-tasks" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <ScheduledTasks />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/system-logs" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <SystemLogs />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/backup-management" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <BackupManagement />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/system-status" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <SystemStatus />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <DataStorage />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/data-management" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <DataManagement />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/data-storage" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <DataStorage />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />



      {/* 兼容旧的导入导出路由 */}
      <Route path="/import" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <DataManagement />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      <Route path="/export" element={
        <ProtectedRoute>
          <ModernLayout>
            <LazyPageWrapper>
              <DataManagement />
            </LazyPageWrapper>
          </ModernLayout>
        </ProtectedRoute>
      } />

      {/* 后台管理路由 */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminGuard>
            <ModernLayout>
              <LazyPageWrapper>
                <Admin />
              </LazyPageWrapper>
            </ModernLayout>
          </AdminGuard>
        </ProtectedRoute>
      } />

      {/* 管理员子路由 */}
      <Route path="/admin/*" element={
        <ProtectedRoute>
          <AdminGuard>
            <ModernLayout>
              <LazyPageWrapper>
                <Admin />
              </LazyPageWrapper>
            </ModernLayout>
          </AdminGuard>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

export default AppRoutes;
