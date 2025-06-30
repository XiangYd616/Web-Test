import { useEffect } from 'react'
import AppRoutes from './components/routing/AppRoutes'
import BackgroundTestNotifications from './components/system/BackgroundTestNotifications'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { TestDataGenerator } from './utils/testDataGenerator'
// import { NotificationProvider } from './components/NotificationSystem'

// 导入主题样式
import './styles/dark-theme.css'
import './styles/light-theme.css'
import './styles/theme.css'

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
