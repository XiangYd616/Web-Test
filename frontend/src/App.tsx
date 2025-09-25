import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import { Toaster } from 'react-hot-toast'

// 页面组件导入
import Dashboard from './pages/core/Dashboard'
import StressTest from './pages/core/StressTest'
import ContentDetection from './pages/core/ContentDetection'
import CompatibilityTest from './pages/core/CompatibilityTest'
import SEOAnalysis from './pages/core/SEOAnalysis'
import Login from './pages/auth/Login'
import Settings from './pages/admin/Settings'

// 布局组件
import Layout from './components/layout/Layout'

// 上下文提供者
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <div className="App">
            <Routes>
              {/* 认证路由 */}
              <Route path="/login" element={<Login />} />
              
              {/* 主应用路由 */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="stress-test" element={<StressTest />} />
                <Route path="content-detection" element={<ContentDetection />} />
                <Route path="compatibility-test" element={<CompatibilityTest />} />
                <Route path="seo-analysis" element={<SEOAnalysis />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
            
            {/* 全局提示组件 */}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </ConfigProvider>
  )
}

export default App
