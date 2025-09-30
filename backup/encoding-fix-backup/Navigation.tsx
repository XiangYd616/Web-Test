/**
 * Navigation.tsx - React缁勪欢
 * 
 * 鏂囦欢璺緞: frontend\components\modern\Navigation.tsx
 * 鍒涘缓鏃堕棿: 2025-09-25
 */

import { BarChart3, Bell, Calendar, ChevronDown, Code, Database, Eye, FileText, Gauge, Globe, HelpCircle, LogOut, Menu, Monitor, Search, Settings, Shield, User, Wifi, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
;

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
  badge?: string;
}

const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTestMenuOpen, setIsTestMenuOpen] = useState(false);
  const [notifications] = useState(3);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const testingTools: NavigationItem[] = [
    {
      name: '缃戠珯娴嬭瘯',
      href: '/website-test',
      icon: Zap,
      description: '缁煎悎缃戠珯娴嬭瘯骞冲彴'
    },

    {
      name: 'SEO娴嬭瘯',
      href: '/seo-test',
      icon: Search,
      description: '鎼滅储寮曟搸浼樺寲妫€娴?
    },
    {
      name: '瀹夊叏妫€娴?,
      href: '/security-test',
      icon: Shield,
      description: '瀹夊叏婕忔礊鎵弿'
    },
    {
      name: '鎬ц兘娴嬭瘯',
      href: '/performance-test',
      icon: Gauge,
      description: '缃戠珯鎬ц兘鍒嗘瀽'
    },
    {
      name: '鍏煎鎬ф祴璇?,
      href: '/compatibility-test',
      icon: Globe,
      description: '璺ㄦ祻瑙堝櫒鍏煎鎬ф娴?
    },
    {
      name: 'API娴嬭瘯',
      href: '/api-test',
      icon: Code,
      description: 'RESTful API鎺ュ彛娴嬭瘯'
    },
    {
      name: '鐢ㄦ埛浣撻獙娴嬭瘯',
      href: '/ux-test',
      icon: Eye,
      description: 'Core Web Vitals鍒嗘瀽'
    },
    {
      name: '鏁版嵁搴撴祴璇?,
      href: '/database-test',
      icon: Database,
      description: '鏁版嵁搴撴€ц兘鍜屽畬鏁存€ф娴?
    },
    {
      name: '缃戠粶娴嬭瘯',
      href: '/network-test',
      icon: Wifi,
      description: '缃戠粶寤惰繜鍜屽甫瀹芥祴璇?
    },
    {
      name: '瀹炴椂鐩戞帶',
      href: '/dashboard',
      icon: Monitor,
      description: '7x24灏忔椂缃戠珯鐩戞帶'
    },
    {
      name: '娴嬭瘯璋冨害',
      href: '/test-schedule',
      icon: Calendar,
      description: '瀹氭椂鍜屾壒閲忔祴璇曠鐞?
    },
    {
      name: '缁熶竴娴嬭瘯寮曟搸',
      href: '/unified-test',
      icon: Zap,
      description: '闆嗘垚澶氱娴嬭瘯宸ュ叿鐨勭粺涓€骞冲彴'
    }
  ];

  const mainNavigation: NavigationItem[] = [
    {
      name: '浠〃鏉?,
      href: '/',
      icon: Monitor
    },
    {
      name: '浼犵粺浠〃鏉?,
      href: '/dashboard',
      icon: BarChart3
    },
    {
      name: '娴嬭瘯鍘嗗彶',
      href: '/history',
      icon: FileText
    },
    {
      name: '甯姪涓績',
      href: '/help',
      icon: HelpCircle
    }
  ];

  const handleLogout = () => {
    try {
      logout();
      navigate('/');
    } catch (error) {
      console.error('鐧诲嚭澶辫触:', error);
    }
  };

  // 鍏抽棴鑿滃崟褰撹矾鐢辨敼鍙樻椂
  useEffect(() => {
    setIsOpen(false);
    setIsUserMenuOpen(false);
    setIsTestMenuOpen(false);
  }, [location]);

  // 鐐瑰嚮澶栭儴鍏抽棴鑿滃崟
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
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 page-optimized responsive-nav">
      <div className="responsive-container">
        <div className="flex justify-between items-center h-10">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">TestWeb</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {/* 涓诲锟?*/}
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActivePath(item.href)
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
                {item.badge && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}

            {/* 娴嬭瘯宸ュ叿涓嬫媺鑿滃崟 */}
            <div className="relative dropdown-menu">
              <button
                type="button"
                onClick={() => setIsTestMenuOpen(!isTestMenuOpen)}
                className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
              >
                <span>娴嬭瘯宸ュ叿</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isTestMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTestMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">娴嬭瘯宸ュ叿</h3>
                    <p className="text-xs text-gray-500">閫夋嫨閫傚悎鐨勬祴璇曠被鍨?/p>
                  </div>
                  <div className="py-2">
                    {testingTools.map((tool) => (
                      <Link
                        key={tool.name}
                        to={tool.href}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100">
                          <tool.icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{tool.name}</span>
                            {tool.badge && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                {tool.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{tool.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* 閫氱煡 */}
                <button type="button" className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <Bell className="w-5 h-5" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </button>

                {/* 鐢ㄦ埛鑿滃崟 */}
                <div className="relative dropdown-menu">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {user.username}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.username}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <div className="py-2">
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <User className="w-4 h-4 mr-3" />
                          涓汉璧勬枡
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          璁剧疆
                        </Link>
                        <hr className="my-2" />
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          閫€鍑虹櫥锟?                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  鐧诲綍
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  娉ㄥ唽
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-4 space-y-2">
            {/* 涓诲锟?*/}
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActivePath(item.href)
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
                {item.badge && (
                  <span className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}

            {/* 娴嬭瘯宸ュ叿 */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                娴嬭瘯宸ュ叿
              </h3>
              {testingTools.map((tool) => (
                <Link
                  key={tool.name}
                  to={tool.href}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                >
                  <tool.icon className="w-4 h-4" />
                  <span>{tool.name}</span>
                  {tool.badge && (
                    <span className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {tool.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
