import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React, { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
// 导入页面组件
import CompatibilityTest from './pages/core/compatibility/CompatibilityTest';
import Dashboard from './pages/core/Dashboard';
import ContentDetection from './pages/core/detection/ContentDetection';
import Settings from './pages/core/Settings';
import StressTest from './pages/core/testing/StressTest';
import Help from './pages/user/docs/Help';
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stress-test" element={<StressTest />} />
            <Route path="/content-detection" element={<ContentDetection />} />
            <Route path="/compatibility-test" element={<CompatibilityTest />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </div>
    </ConfigProvider >
  );
};
export default App;