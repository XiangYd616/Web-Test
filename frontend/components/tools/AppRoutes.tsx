import React, { Suspense, lazy    } from 'react';import { Navigate, Route, Routes    } from 'react-router-dom';import { AdminGuard, ProtectedRoute    } from '../auth/index';import { Layout    } from '../layout/index';import { ErrorBoundary, LoadingSpinner    } from '../ui/index';// 认证页面 - 也使用懒加载以减少初始包大小'
const Login = lazy(() => import('../../pages/core/auth/Login'));'
const Register = lazy(() => import("../../pages/core/auth/Register'));'
// 懒加载页面组件
const Dashboard = lazy(() => import('../../pages/core/dashboard/Dashboard'));'
const TestingDashboard = lazy(() => import('../../pages/core/testing/TestingDashboard'));'
const TestPage = lazy(() => import('../../pages/testing/TestPage'));'
const WebsiteTest = lazy(() => import("../../pages/core/testing/WebsiteTest'));'
// 分析页面（推荐使用）
const PerformanceAnalysis = lazy(() => import('../../pages/data/reports/PerformanceAnalysis'));'
// APIAnalysis已合并到APITest

// 传统测试页面（保持兼容性）
const SecurityTest = lazy(() => import('../../pages/core/testing/SecurityTest'));'
// PerformanceTest已合并到WebsiteTest
const SEOTest = lazy(() => import('../../pages/core/testing/SEOTest'));'
const APITest = lazy(() => import('../../pages/core/testing/APITest'));'
const InfrastructureTest = lazy(() => import('../../pages/core/testing/InfrastructureTest'));'
const StressTest = lazy(() => import('../../pages/core/testing/StressTest'));'
const CompatibilityTest = lazy(() => import('../../pages/core/testing/CompatibilityTest'));'
const UXTest = lazy(() => import("../../pages/core/testing/UXTest'));'
// NetworkTest和DatabaseTest已合并到InfrastructureTest中

// 演示和测试页面
// URLInputDemo 已删除
// LocalStressTestDemo 已删除

// 数据管理相关页面
const DataStorage = lazy(() => import('../../pages/management/admin/DataStorage'));'
const DataManagement = lazy(() => import('../../pages/management/admin/DataManagement'));'
const Statistics = lazy(() => import('../../pages/data/reports/Statistics'));'
const Analytics = lazy(() => import('../../pages/analytics/AnalyticsPage'));'
const MonitoringDashboard = lazy(() => import("../../pages/data/reports/MonitoringDashboard'));'
// 报告和历史
const TestHistory = lazy(() => import('../../pages/data/results/TestHistory'));'
const Reports = lazy(() => import('../../pages/data/reports/Reports'));'
const TestResultDetail = lazy(() => import('../../pages/data/results/TestResultDetail'));'
const StressTestDetail = lazy(() => import('../../pages/data/results/StressTestDetail'));'
const StressTestReport = lazy(() => import('../../pages/data/results/StressTestReport'));'
const SecurityReport = lazy(() => import("../../pages/data/results/SecurityReport'));'
// 系统管理 - 只保留Admin页面，其他管理功能都在Admin内部
const Admin = lazy(() => import('../../pages/management/admin/Admin'));'
// 用户相关
const UserProfile = lazy(() => import('../../pages/user/profile/UserProfile'));'
const UserBookmarks = lazy(() => import("../../pages/user/profile/UserBookmarks'));'
// 测试和优化
const TestOptimizations = lazy(() => import('../../pages/management/scheduling/TestOptimizations'));'
const Notifications = lazy(() => import("../../pages/management/integration/Notifications'));'
// 集成和配置
const Integrations = lazy(() => import('../../pages/management/integration/Integrations'));'
const CICDIntegration = lazy(() => import('../../pages/management/integration/CICDIntegration'));'
const Webhooks = lazy(() => import('../../pages/management/integration/Webhooks'));'
const APIKeys = lazy(() => import('../../pages/management/integration/APIKeys'));'
const APIDocs = lazy(() => import("../../pages/user/docs/APIDocs'));'
// 调度和任务
const TestSchedule = lazy(() => import('../../pages/management/scheduling/TestSchedule'));'
const ScheduledTasks = lazy(() => import("../../pages/management/scheduling/ScheduledTasks'));'
// 其他功能
const Settings = lazy(() => import('../../pages/management/settings/Settings'));'
const Help = lazy(() => import("../../pages/user/docs/Help'));'
// ThemeShowcase 已删除
const Subscription = lazy(() => import('../../pages/user/misc/Subscription'));'
const DownloadDesktop = lazy(() => import("../../pages/user/misc/DownloadDesktop'));'
// 演示页面

interface LazyPageWrapperProps   {
  children: React.ReactNode;
}

const LazyPageWrapper: React.FC<LazyPageWrapperProps>  = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={
      <div className= 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
        <LoadingSpinner size= 'lg' text= '加载页面...'    />
      </div>
    }>
      {children}
    </Suspense>
  </ErrorBoundary>
);
const AppRoutes: React.FC  = () => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;`
  const descriptionId = `${componentId}-description`;`
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`
    'aria-labelledby': ariaLabelledBy,'
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,'
    'aria-invalid': !!error,'
    'aria-disabled': disabled,'
    'aria-busy': loading,'
    'aria-expanded': expanded,'
    'aria-selected': selected,'
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    
    try {
      onClick?.(event);
    } catch (error) {
      console.error('Click handler error: ', error);'
      setError('操作失败，请重试');'
    }
  }, [disabled, loading, onClick]);
  
  const handleChange = useCallback((newValue: any) => {
    updateState({ value: newValue, touched: true, error: null });
    
    try {
      onChange?.(newValue);
    } catch (error) {
      console.error('Change handler error: ', error);'
      updateState({ error: '值更新失败' });'
    }
  }, [onChange, updateState]);
  
  const handleFocus = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: true });
    onFocus?.(event);
  }, [onFocus, updateState]);
  
  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: false });
    onBlur?.(event);
  }, [onBlur, updateState]);
  
  const [state, setState] = useState({
    value: defaultValue,
    loading: false,
    error: null,
    touched: false,
    focused: false
  });
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  return (
    <Routes>
      {/* 公开路由 - 使用懒加载包装器 */}
      <Route path= '/login' element={'
        <LazyPageWrapper>
          <Login  />
        </LazyPageWrapper>
      } />
      <Route path= '/register' element={'
        <LazyPageWrapper>
          <Register  />
        </LazyPageWrapper>
      } />
      {/* LoginDemo 路由已移除，因为文件不存在 */}
      {/* background-test-demo 路由已移除 */}

      {/* 公开路由 - 测试工具页面 */}
      <Route path= '/' element={<Layout    />}>
        {/* 测试工具仪表板 */}
        <Route path= 'testing' element={'
          <LazyPageWrapper>
            <TestingDashboard  />
          </LazyPageWrapper>
        } />

        {/* 统一测试页面 */}
        <Route path= 'testing/:testType' element={'
          <LazyPageWrapper>
            <TestPage  />
          </LazyPageWrapper>
        } />

        {/* 测试工具 - 公开访问，但功能需要登录 */}
        <Route path= 'test' element={<Navigate to= '/testing' replace    />} />
        <Route path= 'website-test' element={'
          <LazyPageWrapper>
            <WebsiteTest  />
          </LazyPageWrapper>
        } />
        <Route path= 'security-test' element={'
          <LazyPageWrapper>
            <SecurityTest  />
          </LazyPageWrapper>
        } />
        {/* 性能分析（推荐） */}
        <Route path= 'performance-analysis' element={'
          <LazyPageWrapper>
            <PerformanceAnalysis  />
          </LazyPageWrapper>
        } />

        {/* 性能测试重定向到网站测试 */}
        <Route path= 'performance-test' element={<Navigate to= '/website-test' replace    />} />
        <Route path= 'performance-test-legacy' element={<Navigate to= '/website-test' replace    />} />

        {/* SEO测试 */}
        <Route path= 'seo-test' element={'
          <LazyPageWrapper>
            <SEOTest  />
          </LazyPageWrapper>
        } />

        {/* API测试 */}
        <Route path= 'api-test' element={'
          <LazyPageWrapper>
            <APITest  />
          </LazyPageWrapper>
        } />
        <Route path= 'infrastructure-test' element={'
          <LazyPageWrapper>
            <InfrastructureTest  />
          </LazyPageWrapper>
        } />

        {/* 向后兼容路由 - 重定向到新的合并页面 */}
        <Route path= 'network-test' element={<Navigate to= '/infrastructure-test' replace    />} />
        <Route path= 'database-test' element={<Navigate to= '/infrastructure-test' replace    />} />
        <Route path= 'stress-test' element={'
          <LazyPageWrapper>
            <StressTest  />
          </LazyPageWrapper>
        } />
        <Route path= 'compatibility-test' element={'
          <LazyPageWrapper>
            <CompatibilityTest  />
          </LazyPageWrapper>
        } />

        {/* Chrome 兼容性测试重定向到兼容性测试 */}
        <Route path= 'chrome-compatibility-test' element={<Navigate to= '/compatibility-test' replace    />} />
        <Route path= 'ux-test' element={'
          <LazyPageWrapper>
            <UXTest  />
          </LazyPageWrapper>
        } />

        {/* 测试优化页面 */}
        <Route path= 'test-optimizations' element={'
          <LazyPageWrapper>
            <TestOptimizations  />
          </LazyPageWrapper>
        } />

        {/* URLInputDemo 已删除 */}

        {/* 公开的测试历史查看 */}
        <Route path= 'test-history' element={'
          <LazyPageWrapper>
            <TestHistory  />
          </LazyPageWrapper>
        } />

        <Route path= 'test-result/:id' element={'
          <LazyPageWrapper>
            <TestResultDetail  />
          </LazyPageWrapper>
        } />
        <Route path= 'stress-test/:testId' element={'
          <LazyPageWrapper>
            <StressTestDetail  />
          </LazyPageWrapper>
        } />

        <Route path= 'stress-test-report' element={'
          <LazyPageWrapper>
            <StressTestReport  />
          </LazyPageWrapper>
        } />
        <Route path= 'security-report' element={'
          <LazyPageWrapper>
            <SecurityReport  />
          </LazyPageWrapper>
        } />

        {/* 公开的帮助和文档 */}
        <Route path= 'help' element={'
          <LazyPageWrapper>
            <Help  />
          </LazyPageWrapper>
        } />
        <Route path= 'api-docs' element={'
          <LazyPageWrapper>
            <APIDocs  />
          </LazyPageWrapper>
        } />
        {/* ThemeShowcase 已删除 */}
        <Route path= 'download-desktop' element={'
          <LazyPageWrapper>
            <DownloadDesktop  />
          </LazyPageWrapper>
        } />


      </Route>

      {/* 首页重定向到网站测试 */}
      <Route index element={<Navigate to= '/website-test' replace    />} />

      {/* 仪表板 - 需要登录 */}
      <Route path= 'dashboard' element={'
        <ProtectedRoute>
          <LazyPageWrapper>
            <Dashboard  />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      {/* 数据管理 - 需要登录 */}
      <Route path= 'data-storage' element={'
        <ProtectedRoute>
          <LazyPageWrapper>
            <DataStorage  />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path= 'data-management' element={'
        <ProtectedRoute>
          <LazyPageWrapper>
            <DataManagement  />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />

      <Route path= 'statistics' element={'
        <ProtectedRoute>
          <LazyPageWrapper>
            <Statistics  />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path= 'analytics' element={'
        <ProtectedRoute>
          <LazyPageWrapper>
            <Analytics  />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      <Route path= 'advanced-analytics' element={'
        <ProtectedRoute>
          <LazyPageWrapper>
            <Analytics  />
          </LazyPageWrapper>
        </ProtectedRoute>
      } />
      {/* 暂时注释掉监控面板路由，等待修复 */}
      {/* <Route path= 'monitoring' element={'
        <ProtectedRoute>
          <LazyPageWrapper>
            <MonitoringDashboard  />
          </LazyPageWrapper>
        </ProtectedRoute>
      } /> */}

      {/* 报告管理 - 需要登录 */}
      <Route path= 'reports' element={'
        <LazyPageWrapper>
          <Reports  />
        </LazyPageWrapper>
      } />

      {/* 用户相关 - 需要登录 */}
      <Route path= 'profile' element={'
        <LazyPageWrapper>
          <UserProfile  />
        </LazyPageWrapper>
      } />
      <Route path= 'bookmarks' element={'
        <LazyPageWrapper>
          <UserBookmarks  />
        </LazyPageWrapper>
      } />
      <Route path= 'notifications' element={'
        <LazyPageWrapper>
          <Notifications  />
        </LazyPageWrapper>
      } />

      {/* 集成和配置 - 需要登录 */}
      <Route path= 'cicd' element={<Navigate to= '/cicd-integration' replace    />} />
      <Route path= 'integrations' element={'
        <LazyPageWrapper>
          <Integrations  />
        </LazyPageWrapper>
      } />
      <Route path= 'cicd-integration' element={'
        <LazyPageWrapper>
          <CICDIntegration  />
        </LazyPageWrapper>
      } />
      <Route path= 'webhooks' element={'
        <LazyPageWrapper>
          <Webhooks  />
        </LazyPageWrapper>
      } />
      <Route path= 'api-keys' element={'
        <LazyPageWrapper>
          <APIKeys  />
        </LazyPageWrapper>
      } />

      {/* 调度和任务 - 需要登录 */}
      <Route path= 'test-schedule' element={'
        <LazyPageWrapper>
          <TestSchedule  />
        </LazyPageWrapper>
      } />
      <Route path= 'scheduled-tasks' element={'
        <LazyPageWrapper>
          <ScheduledTasks  />
        </LazyPageWrapper>
      } />

      {/* 用户设置 - 需要登录 */}
      <Route path= 'settings' element={'
        <LazyPageWrapper>
          <Settings  />
        </LazyPageWrapper>
      } />
      <Route path= 'subscription' element={'
        <LazyPageWrapper>
          <Subscription  />
        </LazyPageWrapper>
      } />

      {/* 系统管理 - 只保留Admin页面，所有管理功能都在Admin内部 */}
      <Route path= 'admin' element={'
        <AdminGuard>
          <LazyPageWrapper>
            <Admin  />
          </LazyPageWrapper>
        </AdminGuard>
      } />

      {/* 重定向旧的管理员页面到Admin页面 */}
      <Route path= 'system-status' element={<Navigate to= '/admin' replace    />} />
      <Route path= 'system-logs' element={<Navigate to= '/admin' replace    />} />
      <Route path= 'backup-management' element={<Navigate to= '/admin' replace    />} />
    </Routes>
  );
};

export default AppRoutes;
