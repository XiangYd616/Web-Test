import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import RouteFallback from '../components/RouteFallback';
import { TestProvider } from '../context/TestProvider';
import AppLayout from '../layouts/AppLayout';
import { isDesktop } from '../utils/environment';

const AdminPage = lazy(() => import('../pages/AdminPage'));
const CollectionsPage = lazy(() => import('../pages/CollectionsPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const EnvironmentsPage = lazy(() => import('../pages/EnvironmentsPage'));
const HistoryDetailPage = lazy(() => import('../pages/HistoryDetailPage'));
const HistoryPage = lazy(() => import('../pages/HistoryPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const TemplatesPage = lazy(() => import('../pages/TemplatesPage'));
const WorkspacesPage = lazy(() => import('../pages/WorkspacesPage'));
const MonitoringPage = lazy(() => import('../pages/MonitoringPage'));
const UatFeedbackPage = lazy(() => import('../pages/UatFeedbackPage'));
const TestPlansPage = lazy(() => import('../pages/TestPlansPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage'));

/**
 * 清除本地存储的认证凭据
 */
const clearAuthTokens = () => {
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('refreshToken');
  window.localStorage.removeItem('current_user');
};

/**
 * 验证现有 token 是否仍然有效
 * 通过调用 /api/auth/me 来检查，超时 3 秒避免阻塞
 */
const validateExistingToken = async (_token: string): Promise<boolean> => {
  // 桌面端：仅对真实云端 token 进行验证
  if (isDesktop()) return true;
  try {
    const { apiClient } = await import('../services/apiClient');
    const resp = await apiClient.get('/auth/me', { timeout: 3000 });
    return resp.status === 200;
  } catch {
    return false;
  }
};

/** 重定向时保留当前 URL 的 query string（如 ?workspaceId=...） */
const RedirectKeepSearch = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

const AppRouter = () => {
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const authCheckedRef = useRef(false);
  const isPublicRoute = ['/login', '/register', '/verify-email'].includes(location.pathname);

  const syncTokenState = useCallback(() => {
    const token = window.localStorage.getItem('accessToken');
    setHasToken(!!token);
    return !!token;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      const existingToken = window.localStorage.getItem('accessToken');

      if (isDesktop()) {
        // 桌面端：Scratch Pad 模式，无需登录即可使用
        // 仅当已有 token 时验证其有效性（用户之前登录过云端）
        if (existingToken && existingToken !== 'desktop-local-token') {
          const valid = await validateExistingToken(existingToken);
          if (cancelled) return;
          if (valid) {
            setHasToken(true);
            setAuthChecked(true);
            authCheckedRef.current = true;
            return;
          }
          clearAuthTokens();
        } else if (existingToken === 'desktop-local-token') {
          // 清除旧的自动创建的本地 token
          clearAuthTokens();
        }
        // 无 token 也标记为已检查完毕，允许进入应用
        if (!cancelled) {
          setAuthChecked(true);
          authCheckedRef.current = true;
        }
        return;
      } else {
        // Web 端：检查已有 token
        if (existingToken) {
          // 路由变化时快速同步（跳过异步验证避免闪烁）
          if (authCheckedRef.current) {
            setHasToken(true);
            return;
          }
          const valid = await validateExistingToken(existingToken);
          if (cancelled) return;
          if (valid) {
            setHasToken(true);
            setAuthChecked(true);
            authCheckedRef.current = true;
            return;
          }
          clearAuthTokens();
        } else {
          setHasToken(false);
        }
      }

      if (!cancelled) {
        setAuthChecked(true);
        authCheckedRef.current = true;
      }
    };

    // 路由变化时先同步检查 token（即时响应登录/登出）
    if (authCheckedRef.current) {
      syncTokenState();
    }

    void initAuth();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, syncTokenState]);

  // 等待自动登录检查完成
  if (!authChecked && !isPublicRoute) {
    return <RouteFallback />;
  }

  if (!hasToken && !isPublicRoute) {
    // 桌面端：无需登录，直接以 Scratch Pad 模式进入应用
    if (isDesktop()) {
      // 继续渲染主应用（下方 return）
    } else {
      // Web 端：强制跳转登录页
      const next = encodeURIComponent(`${location.pathname}${location.search}`);
      return <Navigate to={`/login?next=${next}`} replace />;
    }
  }
  if (isPublicRoute) {
    // 已登录用户访问公共路由时，自动跳转到目标页面
    if (hasToken) {
      const params = new URLSearchParams(location.search);
      const next = params.get('next');
      const defaultRoute = isDesktop() ? '/dashboard' : '/history';
      return <Navigate to={next ? decodeURIComponent(next) : defaultRoute} replace />;
    }
    // 桌面端也可以主动访问登录/注册页面（从顶栏 Sign In 按钮进入）
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/verify-email' element={<VerifyEmailPage />} />
          <Route
            path='*'
            element={
              isDesktop() ? <Navigate to='/dashboard' replace /> : <Navigate to='/login' replace />
            }
          />
        </Routes>
      </Suspense>
    );
  }
  return (
    <TestProvider>
      <Suspense fallback={<RouteFallback />}>
        <AppLayout>
          <Routes>
            <Route
              path='/'
              element={<RedirectKeepSearch to={isDesktop() ? '/dashboard' : '/history'} />}
            />
            <Route path='/dashboard' element={<DashboardPage />} />
            <Route path='/history' element={<HistoryPage />} />
            <Route path='/history/:id' element={<HistoryDetailPage />} />
            <Route path='/environments' element={<EnvironmentsPage />} />
            <Route path='/collections' element={<CollectionsPage />} />
            <Route path='/templates' element={<TemplatesPage />} />
            <Route path='/settings' element={<SettingsPage />} />
            <Route path='/workspaces' element={<WorkspacesPage />} />
            <Route path='/monitoring' element={<MonitoringPage />} />
            <Route path='/uat' element={<UatFeedbackPage />} />
            <Route
              path='/test-plans'
              element={isDesktop() ? <TestPlansPage /> : <RedirectKeepSearch to='/history' />}
            />
            {/* 旧路由重定向到整合后的页面 */}
            <Route path='/preferences' element={<RedirectKeepSearch to='/settings' />} />
            <Route path='/profile' element={<RedirectKeepSearch to='/settings' />} />
            <Route
              path='/schedules'
              element={<RedirectKeepSearch to={isDesktop() ? '/test-plans' : '/history'} />}
            />
            <Route path='/reports' element={<RedirectKeepSearch to='/history' />} />
            <Route path='/errors' element={<RedirectKeepSearch to='/monitoring' />} />
            <Route path='/admin' element={<AdminPage />} />
            <Route path='*' element={<NotFoundPage />} />
          </Routes>
        </AppLayout>
      </Suspense>
    </TestProvider>
  );
};

export default AppRouter;
