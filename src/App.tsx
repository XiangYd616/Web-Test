import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AppRoutes from './components/AppRoutes'
import ErrorBoundary from './components/ErrorBoundary'
import { TestDataGenerator } from './utils/testDataGenerator'
import BackgroundTestNotifications from './components/BackgroundTestNotifications'
// import { NotificationProvider } from './components/NotificationSystem'

// 导入主题样式
import './styles/theme.css'
import './styles/light-theme.css'
import './styles/dark-theme.css'

function App() {
  // 初始化测试数据
  useEffect(() => {
    TestDataGenerator.initializeSampleData();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* <NotificationProvider> */}
          <AuthProvider>
            <AppRoutes />
            <BackgroundTestNotifications />
          </AuthProvider>
        {/* </NotificationProvider> */}
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
