import { useEffect } from 'react'
import AppRoutes from './components/routing/AppRoutes'
import BackgroundTestNotifications from './components/system/BackgroundTestNotifications'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { TestDataGenerator } from './utils/testDataGenerator'
// import { NotificationProvider } from './components/NotificationSystem'

// 导入主题样式
import './styles/chrome-compatibility.css'
import './styles/dark-theme.css'
import './styles/light-theme.css'
import './styles/theme.css'

function App() {
  // 初始化测试数据
  useEffect(() => {
    TestDataGenerator.initializeSampleData();

    // 添加浏览器检测类到body
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);

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
