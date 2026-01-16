/**
 * Sidebar.tsx - React Component
 *
 * File path: frontend/components/layout/Sidebar.tsx
 * Created: 2025-09-25
 */

import {
  BarChart3,
  ChevronRight,
  Code,
  Database,
  Eye,
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
  Wifi,
  Zap,
} from 'lucide-react';
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

const Sidebar: React.FC<ModernSidebarProps> = ({ collapsed = false, onToggle }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['testing']);

  // Hover menu state management
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Click state management
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const _isAdmin = user?.role === 'admin';

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      name: '仪表盘',
      icon: Home,
      href: '/',
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
          href: '/website-test',
        },
        {
          id: 'stress-test',
          name: '压力测试',
          icon: Zap,
          href: '/stress-test',
        },
        {
          id: 'seo-test',
          name: 'SEO测试',
          icon: Search,
          href: '/seo-test',
        },
        {
          id: 'security-test',
          name: '安全测试',
          icon: Shield,
          href: '/security-test',
          badge: 'NEW',
        },
        {
          id: 'performance-test',
          name: '性能测试',
          icon: Monitor,
          href: '/performance-test',
          badge: 'NEW',
        },
        {
          id: 'compatibility-test',
          name: '兼容性测试',
          icon: Monitor,
          href: '/compatibility-test',
        },
        {
          id: 'accessibility-test',
          name: '可访问性测试',
          icon: Eye,
          href: '/accessibility-test',
          badge: 'NEW',
        },
        {
          id: 'api-test',
          name: 'API测试',
          icon: Code,
          href: '/api-test',
        },
        {
          id: 'network-test',
          name: '网络测试',
          icon: Wifi,
          href: '/network-test',
        },
        {
          id: 'database-test',
          name: '数据库测试',
          icon: Database,
          href: '/database-test',
        },
        {
          id: 'ux-test',
          name: '体验测试',
          icon: Eye,
          href: '/ux-test',
        },
        {
          id: 'test-engine',
          name: '测试引擎',
          icon: TestTube,
          href: '/test-engine',
          badge: 'NEW',
        },
      ],
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
          badge: 'v2.0',
        },
        {
          id: 'statistics',
          name: '统计与分析',
          icon: BarChart3,
          href: '/statistics',
        },
        {
          id: 'data-center',
          name: '数据中心',
          icon: Database,
          href: '/data-center',
        },
      ],
    },
    {
      id: 'integration',
      name: '集成设置',
      icon: Package,
      href: '#',
      children: [
        {
          id: 'cicd',
          name: 'CI/CD集成',
          icon: GitBranch,
          href: '/cicd',
        },
        {
          id: 'api-keys',
          name: 'API密钥',
          icon: Key,
          href: '/api-keys',
        },
        {
          id: 'webhooks',
          name: '回调配置',
          icon: Link2,
          href: '/webhooks',
        },
        {
          id: 'integrations',
          name: '第三方集成',
          icon: Package,
          href: '/integrations',
        },
      ],
    },
    {
      id: 'settings',
      name: '设置',
      icon: Settings,
      href: '/settings',
    },
  ];

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  // Check if current path matches
  const isActivePath = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  // Cleanup hover timeout on unmount
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

  const isDark = actualTheme === 'dark';
  const sidebarClasses = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-200'
    : 'bg-white border-gray-200 text-gray-700';
  const groupButtonClasses = isDark
    ? 'text-slate-200 hover:bg-slate-800/70'
    : 'text-gray-700 hover:bg-gray-100';
  const linkBaseClasses = isDark
    ? 'text-slate-200 hover:bg-slate-800/70'
    : 'text-gray-700 hover:bg-gray-100';
  const linkActiveClasses = isDark
    ? 'bg-blue-500/15 text-blue-200 font-medium'
    : 'bg-blue-50 text-blue-600 font-medium';
  const badgeClasses = isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-600';

  return (
    <div
      className={`sidebar border-r transition-all duration-300 ${sidebarClasses} ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-screen">
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 sidebar-scrollbar">
          {sidebarItems.map(item => (
            <div key={item.id}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg ${groupButtonClasses}`}
                  >
                    <div className="flex items-center">
                      <item.icon className="w-5 h-5 mr-3" />
                      {!collapsed && <span>{item.name}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          expandedGroups.includes(item.id) ? 'rotate-90' : ''
                        }`}
                      />
                    )}
                  </button>
                  {expandedGroups.includes(item.id) && !collapsed && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map(child => (
                        <Link
                          key={child.id}
                          to={child.href}
                          className={`flex items-center px-3 py-2 text-sm rounded-lg ${
                            isActivePath(child.href) ? linkActiveClasses : linkBaseClasses
                          }`}
                        >
                          <child.icon className="w-4 h-4 mr-3" />
                          <span>{child.name}</span>
                          {child.badge && (
                            <span
                              className={`ml-auto text-xs px-2 py-0.5 rounded-full ${badgeClasses}`}
                            >
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                    isActivePath(item.href) ? linkActiveClasses : linkBaseClasses
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
