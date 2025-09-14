import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Activity, 
  Globe, 
  Shield, 
  Zap, 
  Monitor, 
  Database,
  Network,
  UserCheck,
  BarChart3,
  FileText,
  HelpCircle,
  Settings,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';

// 导航菜单配置
const navigationItems = [
  {
    title: '测试中心',
    icon: Activity,
    children: [
      { title: '性能测试(增强版)', href: '/EnhancedPerformanceTest', icon: Zap },
      { title: '性能测试', href: '/PerformanceTest', icon: Activity },
      { title: 'SEO测试', href: '/SEOTest', icon: Globe },
      { title: '安全测试', href: '/SecurityTest', icon: Shield },
      { title: '兼容性测试', href: '/CompatibilityTest', icon: Monitor },
      { title: 'API测试', href: '/APITest', icon: Network },
      { title: '数据库测试', href: '/DatabaseTest', icon: Database },
      { title: 'UX测试', href: '/UXTest', icon: UserCheck },
      { title: '压力测试', href: '/UnifiedStressTest', icon: BarChart3 },
      { title: '网站测试', href: '/WebsiteTest', icon: Globe },
    ]
  },
  {
    title: '数据管理',
    icon: Database,
    children: [
      { title: '数据中心', href: '/DataCenter', icon: Database },
      { title: '测试历史', href: '/TestHistory', icon: FileText },
      { title: '报告管理', href: '/Reports', icon: FileText },
      { title: '监控仪表板', href: '/MonitoringDashboard', icon: BarChart3 },
    ]
  },
  {
    title: '系统管理',
    icon: Settings,
    children: [
      { title: '用户资料', href: '/UserProfile', icon: UserCheck },
      { title: '集成管理', href: '/Integrations', icon: Network },
      { title: '计划任务', href: '/ScheduledTasks', icon: Activity },
      { title: '帮助中心', href: '/Help', icon: HelpCircle },
    ]
  }
];

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (title: string) => {
    setOpenDropdown(openDropdown === title ? null : title);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <Zap className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">TestWeb</span>
              </Link>
            </div>

            {/* 导航菜单 */}
            <div className="flex items-center space-x-1">
              {navigationItems.map((item) => (
                <div key={item.title} className="relative group">
                  <button
                    onClick={() => toggleDropdown(item.title)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors duration-200 flex items-center space-x-1"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  
                  {/* 下拉菜单 */}
                  {openDropdown === item.title && (
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`
                              flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-200
                              ${router.pathname === child.href 
                                ? 'text-blue-600 bg-blue-50' 
                                : 'text-gray-700'
                              }
                            `}
                            onClick={() => setOpenDropdown(null)}
                          >
                            <child.icon className="h-4 w-4 mr-3" />
                            <span>{child.title}</span>
                            {child.title === '性能测试(增强版)' && (
                              <span className="ml-auto bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                新
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 用户菜单 */}
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                <Settings className="h-5 w-5" />
              </button>
              <button className="text-gray-500 hover:text-gray-700">
                <HelpCircle className="h-5 w-5" />
              </button>
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">U</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 页面内容 */}
      <main className="flex-1">
        <Component {...pageProps} />
      </main>

      {/* Toast通知容器 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '8px',
          },
          success: {
            style: {
              background: '#10B981',
            },
          },
          error: {
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
    </div>
  );
}

export default MyApp;
