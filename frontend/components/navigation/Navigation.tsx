/**
 * Navigation.tsx - React Component
 * 
 * File path: frontend/components/navigation/Navigation.tsx
 * Created: 2025-09-25
 */

import { BarChart3, Bell, Calendar, ChevronDown, Code, Database, Eye, FileText, Gauge, Globe, HelpCircle, LogOut, Menu, Monitor, Search, Settings, Shield, User, Wifi, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
  badge?: string;
}

interface NavigationProps {
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ sidebarCollapsed = false, onSidebarToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTestMenuOpen, setIsTestMenuOpen] = useState(false);
  const [notifications] = useState(3);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const testingTools: NavigationItem[] = [
    {
      name: '网站测试',
      href: '/website-test',
      icon: Zap,
      description: '全面的网站测试平台'
    },
    {
      name: 'SEO测试',
      href: '/seo-test',
      icon: Search,
      description: '搜索引擎优化分析'
    },
    {
      name: '安全测试',
      href: '/security-test',
      icon: Shield,
      description: '安全漏洞扫描'
    },
    {
      name: '性能测试',
      href: '/performance-test',
      icon: Gauge,
      description: '网站性能分析'
    },
    {
      name: '兼容性测试',
      href: '/compatibility-test',
      icon: Globe,
      description: '跨浏览器兼容性测试'
    },
    {
      name: 'API测试',
      href: '/api-test',
      icon: Code,
      description: 'RESTful API 接口测试'
    },
    {
      name: '用户体验测试',
      href: '/ux-test',
      icon: Eye,
      description: '核心网站指标分析'
    },
    {
      name: '数据库测试',
      href: '/database-test',
      icon: Database,
      description: '数据库性能和完整性测试'
    },
    {
      name: '网络测试',
      href: '/network-test',
      icon: Wifi,
      description: '网络延迟和带宽测试'
    },
    {
      name: '实时监控',
      href: '/dashboard',
      icon: Monitor,
      description: '24/7 网站监控'
    },
    {
      name: '测试调度',
      href: '/test-schedule',
      icon: Calendar,
      description: '计划和批量测试管理'
    }
  ];

  const mainNavigation: NavigationItem[] = [
    {
      name: '仪表盘',
      href: '/',
      icon: Monitor
    },
    {
      name: '经典仪表盘',
      href: '/dashboard',
      icon: BarChart3
    },
    {
      name: '测试历史',
      href: '/history',
      icon: FileText
    },
    {
      name: '帮助中心',
      href: '/help',
      icon: HelpCircle
    }
  ];

  const handleLogout = () => {
    try {
      logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Close menus when route changes
  useEffect(() => {
    setIsOpen(false);
    setIsUserMenuOpen(false);
    setIsTestMenuOpen(false);
  }, [location]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-menu')) {
        setIsUserMenuOpen(false);
        setIsTestMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-gray-900 shadow-lg border-b border-gray-800 sticky top-0 z-50 backdrop-blur-sm">
      <div className="flex items-center h-16">
        {/* Logo - 动态宽度与侧边栏对齐 */}
        <div className={`flex-shrink-0 border-r border-gray-800 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          <div className="flex items-center justify-between h-16 px-4">
            {sidebarCollapsed ? (
              <button
                onClick={onSidebarToggle}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                title="展开侧边栏"
              >
                <Zap className="w-6 h-6 text-white" />
              </button>
            ) : (
              <>
                <Link to="/" className="flex items-center space-x-3 group">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white whitespace-nowrap">TestWeb</span>
                </Link>
                <button
                  onClick={onSidebarToggle}
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors duration-200"
                  title="收起侧边栏"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Container */}
        <div className="flex-1 flex justify-between items-center px-6">

          {/* Desktop Navigation - 左侧主导航 */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Main navigation */}
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActivePath(item.href)
                  ? 'text-blue-400 bg-blue-600/20 border border-blue-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
                {item.badge && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}

            {/* Testing Tools Dropdown */}
            <div className="dropdown-menu relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTestMenuOpen(!isTestMenuOpen);
                }}
                className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
              >
                <Zap className="w-4 h-4" />
                <span>测试工具</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isTestMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTestMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 py-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {testingTools.map((tool) => (
                    <Link
                      key={tool.name}
                      to={tool.href}
                      className="flex items-start px-4 py-3 hover:bg-gray-700 transition-colors"
                    >
                      <tool.icon className="w-5 h-5 text-blue-400 mr-3 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{tool.name}</div>
                        {tool.description && (
                          <div className="text-xs text-gray-400 mt-0.5">{tool.description}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="dropdown-menu relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUserMenuOpen(!isUserMenuOpen);
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
              >
                <User className="w-5 h-5" />
                <span>{user?.username || 'User'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 py-2">
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    设置
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    退出登录
                  </button>
                </div>
              )}
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden pr-4">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden py-4 border-t border-gray-800 px-4">
          <div className="space-y-1">
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-2 px-4 py-2 text-base font-medium rounded-lg transition-colors ${
                  isActivePath(item.href)
                    ? 'text-blue-400 bg-blue-600/20 border-l-2 border-blue-500'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
