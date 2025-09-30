import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from '../../pages/Login';
import Register from '../../pages/Register';
import { AdminGuard, ProtectedRoute } from '../auth';
import { Layout } from '../layout';
import { ErrorBoundary, LoadingSpinner } from '../ui';

// 鎳掑姞杞介〉闈㈢粍浠?const Dashboard = lazy(() => import('../../pages/dashboard/Dashboard'));
const WebsiteTest = lazy(() => import('../../pages/WebsiteTest'));
const SecurityTest = lazy(() => import('../../pages/SecurityTest'));
const PerformanceTest = lazy(() => import('../../pages/PerformanceTest'));
const SeoTest = lazy(() => import('../../pages/SeoTest'));

// MFA璁よ瘉鐩稿叧椤甸潰
const MFASetup = lazy(() => import('../../pages/auth/MFASetup'));
const MFAVerification = lazy(() => import('../../pages/auth/MFAVerification'));

const ApiTest = lazy(() => import('../../pages/ApiTest'));
const NetworkTest = lazy(() => import('../../pages/NetworkTest'));
const DatabaseTest = lazy(() => import('../../pages/DatabaseTest'));
const CompatibilityTest = lazy(() => import('../../pages/CompatibilityTest'));
const AccessibilityTest = lazy(() => import('../../pages/AccessibilityTest'));
const UxTest = lazy(() => import('../../pages/UxTest'));
const UnifiedTestPage = lazy(() => import('../../pages/UnifiedTestPage'));

// 鏁版嵁绠＄悊鐩稿叧椤甸潰
const DataStorage = lazy(() => import('../../pages/admin/DataStorage'));
const DataManagement = lazy(() => import('../../pages/DataManagement'));
const DataCenter = lazy(() => import('../../pages/DataCenter'));
const Statistics = lazy(() => import('../../pages/Statistics'));
const Analytics = lazy(() => import('../../pages/analytics'));
const MonitoringDashboard = lazy(() => import('../../pages/MonitoringDashboard'));

// 鎶ュ憡鍜屽巻鍙?const TestHistory = lazy(() => import('../../pages/TestHistory'));

const Reports = lazy(() => import('../../pages/Reports'));
const TestResultDetail = lazy(() => import('../../pages/TestResultDetail'));
const SecurityReport = lazy(() => import('../../pages/SecurityReport'));

// 绯荤粺绠＄悊 - 鍙繚鐣橝dmin椤甸潰锛屽叾浠栫鐞嗗姛鑳介兘鍦ˋdmin鍐呴儴
const Admin = lazy(() => import('../../pages/admin'));

// 鐢ㄦ埛鐩稿叧
const UserProfile = lazy(() => import('../../pages/UserProfile'));
const UserBookmarks = lazy(() => import('../../pages/UserBookmarks'));

// 娴嬭瘯鍜屼紭鍖?const TestOptimizations = lazy(() => import('../../pages/TestOptimizations'));
const Notifications = lazy(() => import('../../pages/Notifications'));

// 闆嗘垚鍜岄厤缃?const Integrations = lazy(() => import('../../pages/Integrations'));
const CicdIntegration = lazy(() => import('../../pages/CicdIntegration'));
const Webhooks = lazy(() => import('../../pages/Webhooks'));
const ApiKeys = lazy(() => import('../../pages/ApiKeys'));
const ApiDocs = lazy(() => import('../../pages/ApiDocs'));

// 璋冨害鍜屼换鍔?const TestSchedule = lazy(() => import('../../pages/TestSchedule'));
const ScheduledTasks = lazy(() => import('../../pages/ScheduledTasks'));

// 鍏朵粬鍔熻兘
const Settings = lazy(() => import('../../pages/admin/Settings'));
const Help = lazy(() => import('../../pages/Help'));
const Subscription = lazy(() => import('../../pages/Subscription'));
const DownloadDesktop = lazy(() => import('../../pages/DownloadDesktop'));

interface LazyPageWrapperProps {
  children: React.ReactNode;
}

const LazyPageWrapper: React.FC<LazyPageWrapperProps> = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingSpinner size="lg" text="鍔犺浇椤甸潰..." />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 鍏紑璺敱 */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* MFA璁よ瘉璺敱 */}
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

      {/* 鍏紑璺敱 - 娴嬭瘯宸ュ叿椤甸潰 */}
      <Route path="/" element={<Layout />}>
        {/* 娴嬭瘯宸ュ叿 - 鍏紑璁块棶锛屼絾鍔熻兘闇€瑕佺櫥褰?*/}
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
            <SeoTest />
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
            <UxTest />
          </LazyPageWrapper>
        } />

        {/* 缁熶竴娴嬭瘯寮曟搸 */}
        <Route path="unified-test" element={
          <LazyPageWrapper>
            <UnifiedTestPage />
          </LazyPageWrapper>
        } />

        {/* 娴嬭瘯浼樺寲椤甸潰 */}
        <Route path="test-optimizations" element={
          <LazyPageWrapper>
            <TestOptimizations />
          </LazyPageWrapper>
        } />

        {/* 鍏紑鐨勬祴璇曞巻鍙叉煡鐪?*/}
        <Route path="test-history" element={
          <LazyPageWrapper>
            <TestHistory />
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

        {/* 鍏紑鐨勫府鍔╁拰鏂囨。 */}
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
        <Route path="download-desktop" element={
          <LazyPageWrapper>
            <DownloadDesktop />
          </LazyPageWrapper>
        } />
      </Route>

      {/* 棣栭〉閲嶅畾鍚戝埌缃戠珯娴嬭瘯 */}
      <Route index element={<Navigate to="/website-test" replace />} />

      {/* 浠〃鏉?- 闇€瑕佺櫥褰?*/}
      <Route path="dashboard" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Dashboard />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 鏁版嵁绠＄悊 - 闇€瑕佺櫥褰?*/}
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
      {/* 鐩戞帶闈㈡澘 - 绠＄悊鍛樺彲璁块棶 */}
      <Route path="monitoring" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <MonitoringDashboard />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 鎶ュ憡绠＄悊 - 闇€瑕佺櫥褰?*/}
      <Route path="reports" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Reports />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 鐢ㄦ埛鐩稿叧 - 闇€瑕佺櫥褰?*/}
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

      {/* 闆嗘垚鍜岄厤缃?- 闇€瑕佺櫥褰?*/}
      <Route path="cicd" element={<Navigate to="/cicd-integration" replace />} />
      <Route path="integrations" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <Integrations />
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
            <APIKeys />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 璋冨害鍜屼换鍔?- 闇€瑕佺櫥褰?*/}
      <Route path="test-schedule" element={
        <ProtectedRoute>
          <LazyPageWrapper>
            <TestSchedule />
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

      {/* 鐢ㄦ埛璁剧疆 - 闇€瑕佺櫥褰?*/}
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

      {/* 绯荤粺绠＄悊 - 鍙繚鐣橝dmin椤甸潰锛屾墍鏈夌鐞嗗姛鑳介兘鍦ˋdmin鍐呴儴 */}
      <Route path="admin" element={
        <AdminGuard>
          <LazyPageWrapper>
            <Admin />
          </LazyPageWrapper>
        </AdminGuard>
      } />

      {/* 閲嶅畾鍚戞棫鐨勭鐞嗗憳椤甸潰鍒癆dmin椤甸潰 */}
      <Route path="system-status" element={<Navigate to="/admin" replace />} />
      <Route path="system-logs" element={<Navigate to="/admin" replace />} />
      <Route path="backup-management" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AppRoutes;
