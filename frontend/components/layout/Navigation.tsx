import { BarChart3, Bell, ChevronDown, Code, Database, Eye, FileText, Gauge, Globe, HelpCircle, LogOut, Menu, Monitor, Search, Settings, Shield, TestTube, User, X, Zap    } from 'lucide-react';import React, { useEffect, useState    } from 'react';import { Link, useLocation, useNavigate    } from 'react-router-dom';import { useAuth    } from '../../contexts/AuthContext';export interface NavigationProps     {'
  // 基础属性
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  
  // 事件处理
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onChange?: (value: any) => void;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  
  // 状态属性
  disabled?: boolean;
  loading?: boolean;
  error?: string | boolean;
  
  // 数据属性
  value?: any;
  defaultValue?: any;
  
  // 配置属性
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  // 可访问性
  'aria-label'?: string;'
  'aria-describedby'?: string;'
  role?: string;
  tabIndex?: number;
}


interface NavigationItem   {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
  badge?: string;
}

const Navigation: React.FC<NavigationProps>  = (props) => {
  
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,
    style: computedStyle,
    disabled,
    'aria-label': ariaLabel,'
    'data-testid': testId'
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;`
  const descriptionId = `${componentId}-description`;`
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`
    'aria-labelledby': ariaLabelledBy,'
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,'
    'aria-invalid': !!error,'
    'aria-disabled': disabled,'
    'aria-busy': loading,'
    'aria-expanded': expanded,'
    'aria-selected': selected,'
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTestMenuOpen, setIsTestMenuOpen] = useState(false);
  const [notifications] = useState(3);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const testingTools: NavigationItem[]  = [
    {
      name: 'API测试','
      href: '/testing/api','
      icon: Code,
      description: 'REST API端点测试和验证';
    },
    {
      name: '性能测试','
      href: '/testing/performance','
      icon: Gauge,
      description: 'Lighthouse性能分析';
    },
    {
      name: '安全测试','
      href: '/testing/security','
      icon: Shield,
      description: 'SSL证书和安全头部检查';
    },
    {
      name: 'SEO测试','
      href: '/testing/seo','
      icon: Search,
      description: 'Meta标签和SEO优化分析';
    },
    {
      name: '压力测试','
      href: '/testing/stress','
      icon: Zap,
      description: '负载和并发性能测试';
    },
    {
      name: '基础设施测试','
      href: '/testing/infrastructure','
      icon: Database,
      description: 'DNS解析和端口连接检查';
    },
    {
      name: 'UX测试','
      href: '/testing/ux','
      icon: Eye,
      description: '用户体验和可访问性测试';
    },
    {
      name: '兼容性测试','
      href: '/testing/compatibility','
      icon: Globe,
      description: '跨浏览器和设备兼容性';
    },
    {
      name: '网站综合测试','
      href: '/testing/website','
      icon: Monitor,
      description: '全面的网站质量评估';
    }
  ];
  const mainNavigation: NavigationItem[]  = [
    {
      name: '仪表板','
      href: '/','
      icon: Monitor
    },
    {
      name: '测试工具','
      href: '/testing','
      icon: TestTube
    },
    {
      name: '传统仪表板','
      href: '/dashboard','
      icon: BarChart3
    },
    {
      name: '测试历史','
      href: '/history','
      icon: FileText
    },
    {
      name: '帮助中心','
      href: '/help','
      icon: HelpCircle
    }
  ];
  const handleLogout = () => {
    try {
      logout();
      navigate('/');'
    } catch (error) {
      console.error('登出失败:', error);'
    }
  };

  // 关闭菜单当路由改变时
  useEffect(() => {
    setIsOpen(false);
    setIsUserMenuOpen(false);
    setIsTestMenuOpen(false);
  }, [location]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-menu')) {'
        setIsUserMenuOpen(false);
        setIsTestMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);'
    return () => document.removeEventListener('click', handleClickOutside);'
  }, []);

  const isActivePath = (path: string) => {
    if (path === '/') {'
        return location.pathname === '/';
      }
    return location.pathname.startsWith(path);
  };

  return (<nav className= 'bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 page-optimized responsive-nav'>
      <div className= 'responsive-container'>
        <div className= 'flex justify-between items-center h-10'>
          {/* Logo */}
          <div className= 'flex items-center'>
            <Link to= '/' className= 'flex items-center space-x-2'>
              <div className= 'w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center'>
                <Zap className= 'w-4 h-4 text-white'    />
              </div>
              <span className= 'text-lg font-bold text-gray-900'>TestWeb</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className= 'hidden md:flex items-center space-x-6'>
            {/* 主导�?*/}
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActivePath(item.href)`}
                  ? "text-blue-600 bg-blue-50';'`
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50';
                  }`}`
              >
                <item.icon className= "w-4 h-4' />`
                <span>{item.name}</span>
                {item.badge && (
                  <span className= 'ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full'>
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}

            {/* 测试工具下拉菜单 */}
            <div className= 'relative dropdown-menu'>
              <button
                type= 'button';
                onClick={() => setIsTestMenuOpen(!isTestMenuOpen)}
                className= 'flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors';
              >
                <span>测试工具</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isTestMenuOpen ? 'rotate-180' : "'}`}    />`
              </button>

              {isTestMenuOpen && (<div className= "absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50'>`
                  <div className= 'px-4 py-2 border-b border-gray-100'>
                    <h3 className= 'text-sm font-semibold text-gray-900'>测试工具</h3>
                    <p className= 'text-xs text-gray-500'>选择适合的测试类型</p>
                  </div>
                  <div className= 'py-2'>
                    {testingTools.map((tool) => (
                      <Link
                        key={tool.name}
                        to={tool.href}
                        className= 'flex items-center px-4 py-3 hover:bg-gray-50 transition-colors group';
                      >
                        <div className= 'w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100'>
                          <tool.icon className= 'w-5 h-5 text-gray-600 group-hover:text-blue-600' />
                        </div>
                        <div className= 'flex-1'>
                          <div className= 'flex items-center'>
                            <span className= 'text-sm font-medium text-gray-900'>{tool.name}</span>
                            {tool.badge && (
                              <span className= 'ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full'>
                                {tool.badge}
                              </span>
                            )}
                          </div>
                          <p className= 'text-xs text-gray-500'>{tool.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className= 'flex items-center space-x-4'>
            {user ? (
              <>
                {/* 通知 */}
                <button type= 'button' className= 'relative p-2 text-gray-600 hover:text-blue-600 transition-colors'>
                  <Bell className= 'w-5 h-5'    />
                  {notifications > 0 && (
                    <span className= 'absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center'>
                      {notifications}
                    </span>
                  )}
                </button>

                {/* 用户菜单 */}
                <div className= 'relative dropdown-menu'>
                  <button
                    type= 'button';
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className= 'flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors';
                  >
                    <div className= 'w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                      <User className= 'w-4 h-4 text-blue-600'    />
                    </div>
                    <span className= 'hidden sm:block text-sm font-medium text-gray-700'>
                      {user.username}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isUserMenuOpen ? "rotate-180' : ''}`}    />`
                  </button>

                  {isUserMenuOpen && (
                    <div className= "absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50'>`
                      <div className= 'px-4 py-3 border-b border-gray-100'>
                        <p className= 'text-sm font-medium text-gray-900'>{user.username}</p>
                        <p className= 'text-xs text-gray-500'>{user.email}</p>
                      </div>
                      <div className= 'py-2'>
                        <Link
                          to= '/profile';
                          className= 'flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50';
                        >
                          <User className= 'w-4 h-4 mr-3'    />
                          个人资料
                        </Link>
                        <Link
                          to= '/settings';
                          className= 'flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50';
                        >
                          <Settings className= 'w-4 h-4 mr-3'    />
                          设置
                        </Link>
                        <hr className= 'my-2' />
                        <button
                          type= 'button';
                          onClick={handleLogout}
                          className= 'flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50';
                        >
                          <LogOut className= 'w-4 h-4 mr-3'    />
                          退出登�?                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className= 'flex items-center space-x-3'>
                <Link
                  to= '/login';
                  className= 'text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors';
                >
                  登录
                </Link>
                <Link
                  to= '/register';
                  className= 'px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors';
                >
                  注册
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              type= 'button';
              onClick={() => setIsOpen(!isOpen)}
              className= 'md:hidden p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors';
            >
              {isOpen ? <X className= 'w-5 h-5'    /> : <Menu className= 'w-5 h-5'    />}'
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (<div className= 'md:hidden bg-white border-t border-gray-200'>
          <div className= 'px-4 py-4 space-y-2'>
            {/* 主导�?*/}
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActivePath(item.href)`}
                  ? "text-blue-600 bg-blue-50';'`
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50';
                  }`}`
              >
                <item.icon className= "w-4 h-4' />`
                <span>{item.name}</span>
                {item.badge && (
                  <span className= 'ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full'>
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}

            {/* 测试工具 */}
            <div className= 'pt-4 border-t border-gray-200'>
              <h3 className= 'px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'>
                测试工具
              </h3>
              {testingTools.map((tool) => (
                <Link
                  key={tool.name}
                  to={tool.href}
                  className= 'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors';
                >
                  <tool.icon className= 'w-4 h-4' />
                  <span>{tool.name}</span>
                  {tool.badge && (
                    <span className= 'ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full'>
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
