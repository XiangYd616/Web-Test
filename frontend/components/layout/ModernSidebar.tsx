import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Code,
  Database,
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
import React, { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
}

interface MenuItem {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  href: string;
  badge?: string;
  children?: MenuItem[];
}

const ModernSidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>(['testing']);
  const [hoverPosition, setHoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      name: '仪表板',
      icon: Home,
      href: '/dashboard'
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
          href: '/testing'
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
          icon: Activity,
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

  const toggleExpanded = (groupId: string) => {
    if (collapsed) {
      onToggle?.();
      setExpandedItems(prev =>
        prev.includes(groupId) ? prev : [...prev, groupId]
      );
      return;
    }
    setExpandedItems(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isActive = (path?: string) => {
    return path && location.pathname === path;
  };

  const isParentActive = (children?: MenuItem[]) => {
    return children?.some(child => child.path && location.pathname === child.path);
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-700 transition-all duration-300 z-50 shadow-xl ${collapsed ? 'w-20' : 'w-72'
      }`}>
      {/* Logo区域 */}
      <div className="h-16 flex items-center justify-center border-b border-slate-700 bg-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          {!collapsed && (
            <div className="text-white font-bold text-lg">Test Web App</div>
          )}
        </div>
      </div>

      {/* 菜单区域 */}
      <div className="py-2 overflow-y-auto h-[calc(100vh-4rem)] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {menuItems.map((item) => (
          <div key={item.key} className="relative mb-1">
            {/* 主菜单项 */}
            <div
              className={`mx-3 rounded-xl cursor-pointer transition-all duration-200 group ${item.children
                ? (isParentActive(item.children) ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white')
                : (isActive(item.path) ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white')
                }`}
              onClick={() => {
                if (item.children) {
                  toggleExpanded(item.key);
                } else {
                  handleItemClick(item.path);
                }
              }}
              onMouseEnter={() => setHoveredItem(item.key)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className={`flex items-center ${collapsed ? 'justify-center py-3' : 'px-4 py-3'}`}>
                <div className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                  {item.icon}
                </div>
                {!collapsed && (
                  <>
                    <span className="ml-3 text-sm font-medium flex-1">
                      {item.label}
                    </span>
                    {item.isNew && (
                      <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full font-medium">
                        NEW
                      </span>
                    )}
                    {item.children && (
                      <div className="ml-2 transition-transform duration-200">
                        {expandedItems.includes(item.key) ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 悬停提示 */}
              {collapsed && hoveredItem === item.key && (
                <div className="absolute left-24 top-0 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl z-50 whitespace-nowrap border border-slate-600">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{item.category}</div>
                  {item.children && (
                    <div className="mt-3 space-y-2 border-t border-slate-600 pt-2">
                      {item.children.map(child => (
                        <div
                          key={child.key}
                          className="text-xs text-slate-300 hover:text-white cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-between"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(child.path);
                          }}
                        >
                          <span>{child.label}</span>
                          {child.isNew && (
                            <span className="ml-2 px-1.5 py-0.5 bg-emerald-500 text-white text-xs rounded-full">NEW</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 子菜单 */}
            {item.children && !collapsed && expandedItems.includes(item.key) && (
              <div className="ml-6 space-y-1 mt-1">
                {item.children.map((child) => (
                  <div
                    key={child.key}
                    className={`mx-2 rounded-lg cursor-pointer transition-all duration-200 group ${isActive(child.path)
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    onClick={() => handleItemClick(child.path)}
                  >
                    <div className="flex items-center px-3 py-2">
                      <div className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                        {child.icon}
                      </div>
                      <span className="ml-3 text-sm font-medium flex-1">
                        {child.label}
                      </span>
                      {child.isNew && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full font-medium">NEW</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModernSidebar;
