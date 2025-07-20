// React相关导入
import { useEffect } from 'react'

// 本地组件导入
import AppRoutes from './components/routing/AppRoutes'
import BackgroundTestNotifications from './components/system/BackgroundTestNotifications'
import ErrorBoundary from './components/ui/ErrorBoundary'

// Context导入
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'



// 样式文件导入
import './styles/chrome-compatibility.css'
import './styles/dark-theme.css'
import './styles/light-theme.css'
import './styles/theme.css'

function App() {
  useEffect(() => {
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
