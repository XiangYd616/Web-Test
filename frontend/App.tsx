import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React, { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
// 导入布局组件
import Layout from './components/layout/Layout';
// 导入页面组件
import Dashboard from './pages/core/Dashboard';
import Settings from './pages/core/Settings';
import Help from './pages/user/docs/Help';
// 测试工具页面
import APITest from './pages/core/testing/APITest';
import CompatibilityTest from './pages/core/testing/CompatibilityTest';
import SecurityTest from './pages/core/testing/SecurityTest';
import SEOTest from './pages/core/testing/SEOTest';
import StressTest from './pages/core/testing/StressTest';
import UXTest from './pages/core/testing/UXTest';
import WebsiteTest from './pages/core/testing/WebsiteTest';
// 数据管理页面
import AnalyticsPage from './pages/analytics/AnalyticsPage';
// 管理页面
// 导入样式
import './styles/global.css';
import './styles/themes.css';
const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    console.log('🚀 初始化前端架构系统...');
    // 初始化主题
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
    // 监听配置变化
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'theme') {
        setIsDarkMode(event.newValue === 'dark');
        console.log('配置已更新:', event.key, event.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // 完成初始化
    setIsLoading(false);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>正在加载...</p>
        </div>
      </div>
    );
  }
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <div className={`app ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* 测试工具路由 */}
              <Route path="testing/api" element={<APITest />} />
              <Route path="testing/performance" element={<div>性能测试页面开发中...</div>} />
              <Route path="testing/security" element={<SecurityTest />} />
              <Route path="testing/seo" element={<SEOTest />} />
              <Route path="testing/stress" element={<StressTest />} />
              <Route path="testing/compatibility" element={<CompatibilityTest />} />
              <Route path="testing/ux" element={<UXTest />} />
              <Route path="testing/website" element={<WebsiteTest />} />
              <Route path="testing/infrastructure" element={<div>基础设施测试页面开发中...</div>} />

              {/* 数据管理路由 */}
              <Route path="data/reports" element={<div>测试报告页面开发中...</div>} />
              <Route path="data/results" element={<div>测试结果页面开发中...</div>} />
              <Route path="data/analytics" element={<AnalyticsPage />} />

              {/* 系统管理路由 */}
              <Route path="management/admin" element={<div>管理员面板开发中...</div>} />
              <Route path="management/integration" element={<div>集成管理页面开发中...</div>} />
              <Route path="management/scheduling" element={<div>任务调度页面开发中...</div>} />

              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<Help />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </div>
    </ConfigProvider >
  );
};
export default App;