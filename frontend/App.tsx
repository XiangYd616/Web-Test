/**
 * 应用程序主组件
 * 负责应用的整体结构、路由配置和全局状态管理
 */

// React相关导入
import { useEffect } from 'react';

// 路由和组件导入
import AppRoutes from './components\tools\AppRoutes.tsx';
import BackgroundTestNotifications from './components/system/BackgroundTestNotifications';
import PerformanceMonitor from './components/system/PerformanceMonitor';
import ErrorBoundary from './components/ui/ErrorBoundary';

// 上下文提供者导入
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// 服务和错误处理导入
import './services/apiErrorInterceptor';
import './services/errorService';

// 性能优化工具导入
import { initializePreloading } from './utils/routePreloader';

/**
 * 应用程序根组件
 * 提供全局的错误边界、主题和认证上下文
 */
function App() {
  useEffect(() => {
    // 初始化路由预加载
    initializePreloading();

    // 在生产环境中注册Service Worker
    if ('serviceWorker' in navigator && import.meta.env.MODE === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker 注册成功:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }

    // 添加浏览器检测类到body
    const userAgent = navigator.userAgent;
    const isChrome = /Chrome/.test(userAgent) && !(/Edg/.test(userAgent));
    const isEdge = /Edg/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !(/Chrome/.test(userAgent));

    if (isChrome) {
      document.body.classList.add('chrome-browser');
    } else if (isEdge) {
      document.body.classList.add('edge-browser');
    } else if (isSafari) {
      document.body.classList.add('safari-browser');
    }
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <ThemeProvider>
          {/* <NotificationProvider> */}
          <AuthProvider>
            <AppRoutes />
            <BackgroundTestNotifications />
            <PerformanceMonitor showDetails={import.meta.env.MODE === 'development'} />
          </AuthProvider>
          {/* </NotificationProvider> */}
        </ThemeProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App
