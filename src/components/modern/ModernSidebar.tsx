import {
  Activity,
  BarChart3,
  ChevronRight,
  Code,
  Crown,
  Database,
  FileText,
  GitBranch,
  Globe,
  Home,
  Key,
  Link2,
  Monitor,
  Package,
  Search,
  Settings,
  Shield,
  TestTube,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import AuthStatusIndicator from '../auth/AuthStatusIndicator';

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
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

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
          name: 'SEO分析',
          icon: Search,
          href: '/content-test'
        },
        {
          id: 'security-test',
          name: '安全检测',
          icon: Shield,
          href: '/security-test'
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
          id: 'data-storage',
          name: '测试数据',
          icon: Database,
          href: '/data-storage',
          badge: 'ALL'
        },
        {
          id: 'import-export',
          name: '导入导出',
          icon: FileText,
          href: '/data-management'
        },
        {
          id: 'analytics-overview',
          name: '分析概览',
          icon: BarChart3,
          href: '/analytics'
        },
        {
          id: 'monitoring',
          name: '实时监控',
          icon: Activity,
          href: '/monitoring',
          badge: 'NEW'
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

  // 管理员菜单项
  const adminItems: SidebarItem[] = isAdmin ? [
    {
      id: 'admin',
      name: '后台管理',
      icon: Crown,
      href: '/admin'
    }
  ] : [];

  // 合并所有菜单项
  const allSidebarItems = [...sidebarItems, ...adminItems];

  const toggleGroup = (groupId: string) => {
    if (collapsed) {
      // 收起状态下点击图标：展开侧边栏并展开该组
      onToggle?.();
      setExpandedGroups(prev =>
        prev.includes(groupId)
          ? prev
          : [...prev, groupId]
      );
      return;
    }

    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // 精确匹配路径，避免多个菜单项同时激活
  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const isGroupExpanded = (groupId: string) => {
    return expandedGroups.includes(groupId);
  };

  // 检查组是否包含活跃的子项（但组本身不直接活跃）
  const isGroupActive = (item: SidebarItem) => {
    // 如果组本身有href且匹配，则直接活跃
    if (item.href && isActive(item.href)) return true;
    // 如果有子项且子项中有活跃的，则组活跃
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return false;
  };

  // 检查组是否仅因为包含活跃子项而活跃（用于不同的样式）
  const isGroupActiveByChild = (item: SidebarItem) => {
    // 组本身不直接活跃，但包含活跃子项
    if (item.href && isActive(item.href)) return false;
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return false;
  };

  // 悬浮菜单状态管理
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = React.useState<{
    top: number;
    left: number;
  } | null>(null);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // 点击状态管理
  const [clickedItem, setClickedItem] = React.useState<string | null>(null);
  const clickTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // 处理按钮点击效果
  const handleButtonClick = (itemId: string) => {
    // 清除之前的点击效果
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // 设置点击状态
    setClickedItem(itemId);

    // 300ms后清除点击状态
    clickTimeoutRef.current = setTimeout(() => {
      setClickedItem(null);
    }, 300);
  };

  // 处理按钮悬停
  const handleButtonHover = (itemId: string, event: React.MouseEvent) => {
    if (!collapsed) return; // 只在收起状态下显示悬浮菜单

    // 清除之前的延时
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    // 设置悬浮菜单位置：按钮右侧，垂直居中对齐
    setHoverPosition({
      top: rect.top + rect.height / 2,
      left: rect.right + 8, // 8px间距
    });
    setHoveredItem(itemId);
  };

  // 处理按钮离开
  const handleButtonLeave = () => {
    // 延时隐藏，给用户时间移动到菜单
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

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // 智能展开包含活跃子项的组（仅在侧边栏展开时）
  React.useEffect(() => {
    if (!collapsed) {
      // 只在侧边栏展开时才自动展开包含活跃子项的组
      const activeGroupId = allSidebarItems.find(item =>
        item.children && item.children.some(child => isActive(child.href))
      )?.id;

      if (activeGroupId && !expandedGroups.includes(activeGroupId)) {
        setExpandedGroups(prev => [...prev, activeGroupId]);
      }
    }
  }, [location.pathname, collapsed, allSidebarItems, expandedGroups]);

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = isGroupExpanded(item.id);
    const active = isActive(item.href);

    if (hasChildren) {
      const groupActive = isGroupActive(item);
      const groupActiveByChild = isGroupActiveByChild(item);
      const directlyActive = item.href && isActive(item.href);

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
            className={`w-full sidebar-button-hover transition-all duration-200 ${collapsed
              ? 'flex items-center justify-center p-3 rounded-lg'
              : 'flex items-center justify-between px-3 py-2.5 rounded-lg text-left'
              } ${clickedItem === item.id
                ? 'scale-95 bg-blue-600/30 text-blue-300 sidebar-button-clicked'
                : directlyActive
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg'
                  : groupActiveByChild
                    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:scale-[1.02]'
              }`}
            title={collapsed ? item.name : undefined}
          >
            {collapsed ? (
              // 收起状态：图标居中，选中框以图标为中心
              <div className="relative flex items-center justify-center">
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${groupActive ? 'scale-110' : ''
                  }`} />
                {/* 收起状态下的活跃指示器 */}
                {directlyActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                )}
                {/* 收起状态下的子项活跃指示器 */}
                {groupActiveByChild && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-300 rounded-full"></div>
                )}
              </div>
            ) : (
              // 展开状态：正常布局
              <>
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
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

          {/* 展开状态下的子菜单 */}
          {!collapsed && isExpanded && (
            <div className="mt-1 ml-0 space-y-1 border-l border-gray-700/30 pl-3">
              {item.children?.map(child => renderSidebarItem(child, level + 1))}
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
          className={`sidebar-button-hover relative transition-all duration-200 ${collapsed
            ? 'flex items-center justify-center p-3 rounded-lg'
            : level > 0
              ? 'flex items-center gap-3 px-3 py-2 rounded-md text-sm'
              : 'flex items-center gap-3 px-3 py-2.5 rounded-lg'
            } ${clickedItem === item.id
              ? 'scale-95 bg-blue-600/30 text-blue-300 sidebar-button-clicked'
              : active
                ? level > 0
                  ? 'bg-blue-600/30 text-blue-200 border-l-2 border-blue-400 shadow-md'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg'
                : level > 0
                  ? 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-200 hover:border-l-2 hover:border-gray-500 hover:scale-[1.02]'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:scale-[1.02]'
            }`}
          title={collapsed ? item.name : undefined}
        >
          {collapsed ? (
            // 收起状态：图标居中，选中框以图标为中心
            <div className="relative flex items-center justify-center">
              <item.icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${active ? 'scale-110' : ''
                }`} />
              {/* 收起状态下的活跃指示器 */}
              {active && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              )}
              {/* 收起状态下的badge指示器 */}
              {item.badge && !active && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          ) : (
            // 展开状态：正常布局
            <>
              <item.icon className={`flex-shrink-0 ${level > 0 ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <span className={`${level > 0 ? 'font-normal' : 'font-medium'}`}>{item.name}</span>
              {item.badge && (
                <span className={`px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full ml-auto ${level > 0 ? 'text-xs' : ''
                  }`}>
                  {item.badge}
                </span>
              )}
              {/* 子菜单项的活跃指示器 */}
              {active && level > 0 && (
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse ml-auto"></div>
              )}
            </>
          )}
        </Link>

        {/* 收起状态下的悬浮tooltip */}
        {collapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-gray-900/95 backdrop-blur-md border border-gray-600/50 rounded-lg text-sm text-white whitespace-nowrap z-[9999] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-out pointer-events-none transform translate-x-2 group-hover:translate-x-0">
            <div className="flex items-center gap-2">
              <item.icon className="w-4 h-4" />
              {item.name}
              {item.badge && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            {/* tooltip箭头 */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 border-l border-t border-gray-700/50 rotate-45"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`sidebar-container themed-sidebar transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'
      } flex flex-col h-full overflow-visible`}>
      {/* 导航菜单滚动区域 */}
      <div className="flex-1 min-h-0">
        <div className="h-full px-4 py-4 overflow-y-auto overflow-x-visible sidebar-scrollbar">
          <nav className="space-y-1 overflow-visible sidebar-nav-container">
            {allSidebarItems.map(item => renderSidebarItem(item))}
          </nav>

          {/* 登录状态指示器 */}
          <div className="mt-6 pt-4 border-t border-gray-700/50">
            <AuthStatusIndicator
              showInSidebar={true}
              className="mb-4"
            />

            {/* 版本信息 */}
            {!collapsed && (
              <div className="text-xs text-gray-400 text-center">
                <p>© 2025 Test Web App</p>
                <p>v1.0.0</p>
              </div>
            )}
          </div>

          {/* 底部间距，确保最后一项可以完全显示 */}
          <div className="h-4"></div>
        </div>
      </div>

      {/* 悬浮子菜单 */}
      {collapsed && hoveredItem && hoverPosition && (
        <div
          className="fixed z-[9999] bg-gray-900/95 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl w-48 py-2 max-h-96 overflow-y-auto"
          style={{
            top: `${hoverPosition.top}px`,
            left: `${hoverPosition.left}px`,
            transform: 'translateY(-50%)', // 垂直居中
          }}
          onMouseEnter={handleMenuHover}
          onMouseLeave={handleMenuLeave}
        >
          {(() => {
            const item = allSidebarItems.find(i => i.id === hoveredItem);
            if (!item?.children) return null;

            return (
              <>
                {/* 菜单标题 */}
                <div className="px-3 py-2 border-b border-gray-700/50 mb-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <item.icon className="w-4 h-4 text-blue-400" />
                    <span>{item.name}</span>
                  </div>
                </div>

                {/* 子菜单项 */}
                <div className="space-y-1 px-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.id}
                      to={child.href}
                      onClick={() => {
                        handleButtonClick(child.id);
                        setHoveredItem(null);
                        setHoverPosition(null);
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm sidebar-button-hover transition-all duration-200 ${clickedItem === child.id
                        ? 'scale-95 bg-blue-600/30 text-blue-300 sidebar-button-clicked'
                        : isActive(child.href)
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:scale-[1.02]'
                        }`}
                    >
                      <child.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{child.name}</span>
                      {child.badge && (
                        <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                          {child.badge}
                        </span>
                      )}
                      {isActive(child.href) && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
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
