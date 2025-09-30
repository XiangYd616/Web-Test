/**
 * Sidebar.tsx - React Component
 * 
 * File path: frontend/components/layout/Sidebar.tsx
 * Created: 2025-09-25
 */

import { BarChart3, ChevronRight, Code, Database, Eye, GitBranch, Globe, Home, Key, Link2, Monitor, Package, Search, Settings, Shield, TestTube, Wifi, Zap } from 'lucide-react';
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

const Sidebar: React.FC<ModernSidebarProps> = ({
  collapsed = false,
  onToggle
}) => {
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

  const _isAdmin = user.role === 'admin';

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: Home,
      href: '/'
    },
    {
      id: 'testing',
      name: 'Testing Tools',
      icon: TestTube,
      href: '#',
      children: [
        {
          id: 'website-test',
          name: 'Website Test',
          icon: Globe,
          href: '/website-test'
        },
        {
          id: 'stress-test',
          name: 'Stress Test',
          icon: Zap,
          href: '/stress-test'
        },
        {
          id: 'seo-test',
          name: 'SEO Test',
          icon: Search,
          href: '/seo-test'
        },
        {
          id: 'security-test',
          name: 'Security Test',
          icon: Shield,
          href: '/security-test',
          badge: 'NEW'
        },
        {
          id: 'performance-test',
          name: 'Performance Test',
          icon: Monitor,
          href: '/performance-test',
          badge: 'NEW'
        },
        {
          id: 'compatibility-test',
          name: 'Compatibility Test',
          icon: Monitor,
          href: '/compatibility-test'
        },
        {
          id: 'accessibility-test',
          name: 'Accessibility Test',
          icon: Eye,
          href: '/accessibility-test',
          badge: 'NEW'
        },
        {
          id: 'api-test',
          name: 'API Test',
          icon: Code,
          href: '/api-test'
        },
        {
          id: 'network-test',
          name: 'Network Test',
          icon: Wifi,
          href: '/network-test'
        },
        {
          id: 'database-test',
          name: 'Database Test',
          icon: Database,
          href: '/database-test'
        },
        {
          id: 'ux-test',
          name: 'UX Test',
          icon: Eye,
          href: '/ux-test'
        },
        {
          id: 'unified-test',
          name: 'Unified Test Engine',
          icon: TestTube,
          href: '/unified-test',
          badge: 'NEW'
        }
      ]
    },
    {
      id: 'data',
      name: 'Data Management',
      icon: Database,
      href: '#',
      children: [
        {
          id: 'test-history',
          name: 'Test History',
          icon: TestTube,
          href: '/test-history',
          badge: 'v2.0'
        },
        {
          id: 'statistics',
          name: 'Statistics & Analytics',
          icon: BarChart3,
          href: '/statistics'
        },
        {
          id: 'data-center',
          name: 'Data Center',
          icon: Database,
          href: '/data-center'
        }
      ]
    },
    {
      id: 'integration',
      name: 'Integration Settings',
      icon: Package,
      href: '#',
      children: [
        {
          id: 'cicd',
          name: 'CI/CD Integration',
          icon: GitBranch,
          href: '/cicd'
        },
        {
          id: 'api-keys',
          name: 'API Keys',
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
          name: 'Third-party Integrations',
          icon: Package,
          href: '/integrations'
        }
      ]
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      href: '/settings'
    }
  ];

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
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

  return (
    <div className={`sidebar bg-white border-r border-gray-200 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="p-4">
        <nav className="space-y-1">
          {sidebarItems.map(item => (
            <div key={item.id}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
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
                            isActivePath(child.href)
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <child.icon className="w-4 h-4 mr-3" />
                          <span>{child.name}</span>
                          {child.badge && (
                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
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
                    isActivePath(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
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
