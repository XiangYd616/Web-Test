import { BarChart3, ChevronRight, Code, Database, GitBranch, Globe, Home, Key, Link2, Monitor, Package, Search, Settings, Shield, TestTube, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

interface SidebarItem {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  href: string;
  badge?: string;
  children?: SidebarItem[];
}

interface ModernSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({
  collapsed = false,
  onToggle
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['testing']);

  // 悬浮菜单状态管理
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 点击状态管理
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = user?.role === 'admin';

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      name: '仪表板',
      icon: Home,
      href: '/'
    },
    {
      id: 'testing',
      name: '测试工具',
      icon: TestTube,
      href: '#',
      children: [
        {
          id: 'website-test',
          name: '网站测试',
          icon: Globe,
          href: '/website-test'
        },
        {
          id: 'stress-test',
          name: '压力测试',
          icon: Zap,
          href: '/stress-test'
        },
        {
          id: 'seo-test',
          name: 'SEO测试',
          icon: Search,
          href: '/seo-test'
        },
        {
          id: 'security-test',
          name: '安全测试',
          icon: Shield,
          href: '/security-test',
          badge: 'NEW'
        },
        {
          id: 'performance-test',
          name: '性能测试',
          icon: Monitor,
          href: '/performance-test',
          badge: 'NEW'
        },
        {
          id: 'compatibility-test',
          name: '兼容性测试',
          icon: Monitor,
          href: '/compatibility-test'
        },
        {
          id: 'api-test',
          name: 'API测试',
          icon: Code,
          href: '/api-test'
        }
      ]
    },
    {
      id: 'data',
      name: '数据管理',
      icon: Database,
      href: '#',
      children: [
        {
          id: 'test-history',
          name: '测试历史',
          icon: TestTube,
          href: '/test-history',
          badge: 'v2.0'
        },
        {
          id: 'statistics',
          name: '统计分析',
          icon: BarChart3,
          href: '/statistics'
        },
        {
          id: 'data-center',
          name: '数据中心',
          icon: Database,
          href: '/data-center'
        }
      ]
    },
    {
      id: 'integration',
      name: '集成配置',
      icon: Package,
      href: '#',
      children: [
        {
          id: 'cicd',
          name: 'CI/CD集成',
          icon: GitBranch,
          href: '/cicd'
        },
        {
          id: 'api-keys',
          name: 'API密钥',
          icon: Key,
          href: '/api-keys'
        },
        {
          id: 'webhooks',
          name: 'Webhooks',
          icon: Link2,
          href: '/webhooks'
        },
        {
          id: 'integrations',
          name: '第三方集成',
          icon: Package,
          href: '/integrations'
        }
      ]
    },
    {
      id: 'settings',
      name: '系统设置',
      icon: Settings,
      href: '/settings'
    }
  ];

  // 工具函数
  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const isGroupExpanded = (groupId: string) => {
    return expandedGroups.includes(groupId);
  };

  const isGroupActive = (item: SidebarItem) => {
    if (item.href && isActive(item.href)) return true;
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return false;
  };

  const isGroupActiveByChild = (item: SidebarItem) => {
    if (item.href && isActive(item.href)) return false;
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return false;
  };

  // 处理按钮点击效果
  const handleButtonClick = (itemId: string) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    setClickedItem(itemId);
    clickTimeoutRef.current = setTimeout(() => {
      setClickedItem(null);
    }, 300);
  };

  // 处理按钮悬停
  const handleButtonHover = (itemId: string, event: React.MouseEvent) => {
    if (!collapsed) return;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    setHoverPosition({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    });
    setHoveredItem(itemId);
  };

  // 处理按钮离开
  const handleButtonLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
      setHoverPosition(null);
    }, 150);
  };

  // 处理菜单悬停
  const handleMenuHover = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // 处理菜单离开
  const handleMenuLeave = () => {
    setHoveredItem(null);
    setHoverPosition(null);
  };

  // 切换组展开状态
  const toggleGroup = (groupId: string) => {
    if (collapsed) {
      onToggle?.();
      setExpandedGroups(prev =>
        prev.includes(groupId) ? prev : [...prev, groupId]
      );
      return;
    }
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // 智能展开包含活跃子项的组
  useEffect(() => {
    if (!collapsed) {
      const groupsToExpand: string[] = [];

      const findActiveGroups = (items: SidebarItem[]): void => {
        items.forEach(item => {
          if (item.children) {
            const hasActiveChild = item.children.some(child => isActive(child.href));
            if (hasActiveChild) {
              groupsToExpand.push(item.id);
            }
            findActiveGroups(item.children);
          }
        });
      };

      findActiveGroups(sidebarItems);

      groupsToExpand.forEach(groupId => {
        if (!expandedGroups.includes(groupId)) {
          setExpandedGroups(prev => [...prev, groupId]);
        }
      });
    }
  }, [location.pathname, collapsed, expandedGroups]);

  return (
    <div className={`sidebar-container themed-sidebar transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'
      } flex flex-col h-full bg-slate-900 border-r border-slate-700 shadow-xl`}>


      {/* 菜单区域 */}
      <div className="py-2 overflow-y-auto h-[calc(100vh-4rem)] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        <nav className="space-y-1 px-3">
          {sidebarItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = isGroupExpanded(item.id);
            const active = isActive(item.href);
            const groupActive = isGroupActive(item);
            const groupActiveByChild = isGroupActiveByChild(item);

            if (hasChildren) {
              return (
                <div key={item.id} className="mb-1 relative group">
                  <button
                    type="button"
                    onClick={() => {
                      handleButtonClick(item.id);
                      toggleGroup(item.id);
                    }}
                    onMouseEnter={(e) => handleButtonHover(item.id, e)}
                    onMouseLeave={handleButtonLeave}
                    className={`w-full transition-all duration-200 ${collapsed
                      ? 'flex items-center justify-center p-3 rounded-xl'
                      : 'flex items-center justify-between px-4 py-3 rounded-xl text-left'
                      } ${clickedItem === item.id
                        ? 'scale-95 bg-blue-600/30 text-blue-300'
                        : active
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg'
                          : groupActiveByChild
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-[1.02]'
                      }`}
                    title={collapsed ? item.name : undefined}
                  >
                    {collapsed ? (
                      <div className="relative flex items-center justify-center">
                        <item.icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${groupActive ? 'scale-110' : ''
                          }`} />
                        {active && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                        {groupActiveByChild && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-300 rounded-full"></div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium">{item.name}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full font-medium">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''
                            }`}
                        />
                      </>
                    )}
                  </button>

                  {/* 子菜单 */}
                  {!collapsed && isExpanded && (
                    <div className="mt-1 space-y-1 ml-6 border-l border-slate-700/30 pl-3">
                      {item.children?.map((child) => (
                        <Link
                          key={child.id}
                          to={child.href}
                          onClick={() => handleButtonClick(child.id)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${clickedItem === child.id
                            ? 'scale-95 bg-blue-600/30 text-blue-300'
                            : isActive(child.href)
                              ? 'bg-blue-600/30 text-blue-200 border-l-2 border-blue-400 shadow-md'
                              : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-200 hover:border-l-2 hover:border-slate-500 hover:scale-[1.02]'
                            }`}
                        >
                          <child.icon className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                          <span className="flex-1 min-w-0">{child.name}</span>
                          {child.badge && (
                            <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full font-medium">
                              {child.badge}
                            </span>
                          )}
                          {isActive(child.href) && (
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={item.id} className="mb-1 relative group">
                <Link
                  to={item.href}
                  onClick={() => handleButtonClick(item.id)}
                  className={`relative transition-all duration-200 ${collapsed
                    ? 'flex items-center justify-center p-3 rounded-xl'
                    : 'flex items-center gap-3 px-4 py-3 rounded-xl'
                    } ${clickedItem === item.id
                      ? 'scale-95 bg-blue-600/30 text-blue-300'
                      : active
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-[1.02]'
                    }`}
                  title={collapsed ? item.name : undefined}
                >
                  {collapsed ? (
                    <div className="relative flex items-center justify-center">
                      <item.icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${active ? 'scale-110' : ''
                        }`} />
                      {active && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      )}
                      {item.badge && !active && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium flex-1 min-w-0">{item.name}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full font-medium">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>

                {/* 收起状态下的悬浮tooltip */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/95 backdrop-blur-md border border-slate-600/50 rounded-lg text-sm text-white whitespace-nowrap z-[9999] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-out pointer-events-none transform translate-x-2 group-hover:translate-x-0">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.name}
                      {item.badge && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-700/50 rotate-45"></div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* 悬浮子菜单 */}
      {collapsed && hoveredItem && hoverPosition && (
        <div
          className="fixed z-[9999] bg-gray-900/95 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl w-48 py-2 max-h-96 overflow-y-auto"
          style={{
            top: `${hoverPosition.top}px`,
            left: `${hoverPosition.left}px`,
            transform: 'translateY(-50%)'
          }}
          onMouseEnter={handleMenuHover}
          onMouseLeave={handleMenuLeave}
        >
          {(() => {
            const hoveredMenuItem = sidebarItems.find(item => item.id === hoveredItem);
            if (!hoveredMenuItem?.children) return null;

            return (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700/50 mb-2">
                  {hoveredMenuItem.name}
                </div>

                <div className="space-y-1 px-2">
                  {hoveredMenuItem.children.map((child) => (
                    <Link
                      key={child.id}
                      to={child.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${isActive(child.href)
                        ? 'bg-blue-600/30 text-blue-200 border-l-2 border-blue-400'
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:border-l-2 hover:border-gray-500'
                        }`}
                    >
                      <child.icon className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                      <span className="flex-1 min-w-0">{child.name}</span>
                      {child.badge && (
                        <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full font-medium">
                          {child.badge}
                        </span>
                      )}
                      {isActive(child.href) && (
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                      )}
                    </Link>
                  ))}
                </div>

              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ModernSidebar;
