import {
  Activity,
  BarChart3,
  Bug,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Globe,
  HelpCircle,
  Home,
  Monitor,
  Search,
  Settings,
  Shield,
  Users,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  collapsed: boolean;
}

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path?: string;
  category?: string;
  children?: MenuItem[];
  isNew?: boolean;
  badge?: string;
}

const ModernSidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>(['testing-tools']);

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: <Home size={20} />,
      label: '仪表板',
      path: '/dashboard',
      category: '概览'
    },
    {
      key: 'testing-tools',
      icon: <Bug size={20} />,
      label: '测试工具',
      category: '测试工具',
      children: [
        {
          key: 'testing',
          icon: <Globe size={16} />,
          label: '网站测试',
          path: '/testing'
        },
        {
          key: 'stress-test',
          icon: <Zap size={16} />,
          label: '压力测试',
          path: '/stress-test'
        },
        {
          key: 'seo-test',
          icon: <Search size={16} />,
          label: 'SEO测试',
          path: '/seo-test'
        },
        {
          key: 'security-test',
          icon: <Shield size={16} />,
          label: '安全测试',
          path: '/security-test',
          isNew: true
        },
        {
          key: 'performance-test',
          icon: <Activity size={16} />,
          label: '性能测试',
          path: '/performance-test',
          isNew: true
        },
        {
          key: 'api-test',
          icon: <Monitor size={16} />,
          label: 'API测试',
          path: '/api-test'
        }
      ]
    },
    {
      key: 'data-center',
      icon: <Database size={20} />,
      label: '数据中心',
      path: '/data-center',
      category: '数据管理'
    },
    {
      key: 'reports',
      icon: <BarChart3 size={20} />,
      label: '测试报告',
      path: '/reports',
      category: '数据管理'
    },
    {
      key: 'import-export',
      icon: <Download size={20} />,
      label: '导入/导出',
      path: '/import-export',
      category: '数据管理'
    },
    {
      key: 'team',
      icon: <Users size={20} />,
      label: '团队管理',
      path: '/team',
      category: '系统管理'
    },
    {
      key: 'settings',
      icon: <Settings size={20} />,
      label: '设置',
      path: '/settings',
      category: '系统管理'
    },
    {
      key: 'help',
      icon: <HelpCircle size={20} />,
      label: '帮助',
      path: '/help',
      category: '系统管理'
    }
  ];

  const handleItemClick = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  const toggleExpanded = (key: string) => {
    setExpandedItems(prev =>
      prev.includes(key)
        ? prev.filter(item => item !== key)
        : [...prev, key]
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
