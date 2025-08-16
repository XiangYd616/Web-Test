/**
 * 应用程序主组件
 * 负责应用的整体结构、路由配置和全局状态管理
 */

// React相关导入
import {useEffect} from 'react';

// 路由和组件导入
import BackgroundTestNotifications from './components/system/BackgroundTestNotifications';
import AppRoutes from './components/tools/AppRoutes.tsx';

// 增强的系统组件导入

// 上下文提供者导入
import {AppProvider} from './contexts/AppContext';
import {AuthProvider} from './contexts/AuthContext';
import {ThemeProvider} from './contexts/ThemeContext';

// 服务和错误处理导入
import './services/apiErrorInterceptor';
import './services/errorService';

// 增强的系统服务导入
import {enhancedConfigManager} from './config/ConfigManager';
import {lazyLoadManager} from './utils/LazyLoadManager';
import {performanceMonitor} from './utils/performanceMonitor';

// 性能优化工具导入
import {initializePreloading} from './utils/routePreloader';

/**
 * 应用程序根组件
 * 提供全局的错误边界、主题和认证上下文
 */
function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 初始化前端架构系统...');

        // 1. 初始化配置管理器
        await enhancedConfigManager.initialize();

        // 2. 初始化性能监控
        await performanceMonitor.initialize();

        // 3. 初始化路由预加载
        initializePreloading();

        // 4. 设置配置变更监听
        enhancedConfigManager.on('configChanged', (event) => {
          console.log('配置已更新:', event.key, event.newValue);
        });

        // 5. 设置主题变更监听
        enhancedConfigManager.on('themeChanged', (theme) => {
          document.documentElement.setAttribute('data-theme', theme);
        });

        console.log('✅ 前端架构系统初始化完成');

      } catch (error) {
        console.error('❌ 前端架构系统初始化失败:', error);
      }
    };

    initializeApp();

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

    // 清理函数
    return () => {
      performanceMonitor.destroy();
      enhancedConfigManager.destroy();
      lazyLoadManager.clearCache();
    };
  }, []);

  return (
    <ErrorBoundary level="page">
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <div className="app">
              {/* 后台测试通知 */}
              <BackgroundTestNotifications />

              {/* 主要路由内容 */}
              <AppRoutes />
            </div>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
