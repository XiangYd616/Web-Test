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
      name: 'Website Test',
      href: '/website-test',
      icon: Zap,
      description: 'Comprehensive website testing platform'
    },
    {
      name: 'SEO Test',
      href: '/seo-test',
      icon: Search,
      description: 'Search engine optimization analysis'
    },
    {
      name: 'Security Test',
      href: '/security-test',
      icon: Shield,
      description: 'Security vulnerability scanning'
    },
    {
      name: 'Performance Test',
      href: '/performance-test',
      icon: Gauge,
      description: 'Website performance analysis'
    },
    {
      name: 'Compatibility Test',
      href: '/compatibility-test',
      icon: Globe,
      description: 'Cross-browser compatibility testing'
    },
    {
      name: 'API Test',
      href: '/api-test',
      icon: Code,
      description: 'RESTful API endpoint testing'
    },
    {
      name: 'User Experience Test',
      href: '/ux-test',
      icon: Eye,
      description: 'Core Web Vitals analysis'
    },
    {
      name: 'Database Test',
      href: '/database-test',
      icon: Database,
      description: 'Database performance and integrity testing'
    },
    {
      name: 'Network Test',
      href: '/network-test',
      icon: Wifi,
      description: 'Network latency and bandwidth testing'
    },
    {
      name: 'Real-time Monitoring',
      href: '/dashboard',
      icon: Monitor,
      description: '24/7 website monitoring'
    },
    {
      name: 'Test Scheduler',
      href: '/test-schedule',
      icon: Calendar,
      description: 'Scheduled and batch test management'
    },
    {
      name: 'Unified Test Engine',
      href: '/unified-test',
      icon: Zap,
      description: 'Integrated multi-tool testing platform'
    }
  ];

  const mainNavigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Monitor
    },
    {
      name: 'Classic Dashboard',
      href: '/dashboard',
      icon: BarChart3
    },
    {
      name: 'Test History',
      href: '/history',
      icon: FileText
    },
    {
      name: 'Help Center',
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
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 page-optimized responsive-nav">
      <div className="responsive-container">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TestWeb</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Main navigation */}
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActivePath(item.href)
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

            {/* Testing Tools Dropdown */}
            <div className="dropdown-menu relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTestMenuOpen(!isTestMenuOpen);
                }}
                className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
              >
                <Zap className="w-4 h-4" />
                <span>Testing Tools</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isTestMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTestMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 max-h-96 overflow-y-auto">
                  {testingTools.map((tool) => (
                    <Link
                      key={tool.name}
                      to={tool.href}
                      className="flex items-start px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <tool.icon className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                        {tool.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{tool.description}</div>
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
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <User className="w-5 h-5" />
                <span>{user?.username || 'User'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-1">
              {mainNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 text-base font-medium rounded-lg ${
                    isActivePath(item.href)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
