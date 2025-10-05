/**
 * TopNavbar.tsx - React组件
 * 
 * 文件路径: frontend\components\modern\TopNavbar.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import { Activity, AlertTriangle, ArrowRight, BarChart3, Bell, Book, Check, CheckCircle, ChevronDown, Clock, Code, Crown, Download, ExternalLink, FileText, Globe, HelpCircle, Home, Info, Key, Lock, Menu, Monitor, MoreVertical, Package, Play, Search, Settings, Shield, TestTube, Trash2, TrendingUp, Upload, User, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ComponentType, FC } from 'react';;
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { NotificationItem, useNotifications } from '../../hooks/useNotifications';
import { globalSearchService, SearchResult } from '../../services/globalSearchService';
import { ThemeToggle } from '../ui';
import UserDropdownMenu from './UserDropdownMenu';

interface TopNavbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

interface QuickAction {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  href: string;
  color: string;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ sidebarCollapsed, onToggleSidebar }) => {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { actualTheme } = useTheme();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getRecentNotifications
  } = useNotifications();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const _isAdmin = user?.role === 'admin';

  // 快捷操作
  const quickActions: QuickAction[] = [
    { id: 'stress-test', name: '压力测试', icon: Activity, href: '/stress-test', color: 'blue' },
    { id: 'security-test', name: '安全检测', icon: AlertTriangle, href: '/security-test', color: 'red' },
    { id: 'seo-analysis', name: 'SEO分析', icon: Search, href: '/content-test', color: 'green' },
    { id: 'api-test', name: 'API测试', icon: Package, href: '/api-test', color: 'purple' },
    { id: 'monitoring', name: '实时监控', icon: Monitor, href: '/monitoring', color: 'yellow' },
    {
      id: 'system-status', name: '系统状态', icon: Settings, href: '/system-status', color: 'gray'
    },
    { id: 'reports', name: '测试报告', icon: FileText, href: '/reports', color: 'indigo' }
  ];

  // 获取要显示的通知列表
  const displayNotifications = notificationFilter === 'unread'
    ? notifications.filter(n => !n.read)
    : getRecentNotifications(10);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K 或 Cmd+K 打开搜索
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          setShowSearchDropdown(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 初始化搜索历史
  useEffect(() => {
    setSearchHistory(globalSearchService.getSearchHistory());
  }, []);

  // 搜索功能
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSelectedSearchIndex(-1);
        return;
      }

      setIsSearching(true);

      try {
        const results = await globalSearchService.search(searchQuery, { limit: 6 });
        setSearchResults(results);
        setSelectedSearchIndex(-1);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);


    /**

     * switch功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error': return <X className="w-4 h-4 text-red-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };


    /**

     * switch功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const formatTime = (time: string) => {
    // 这里可以添加更复杂的时间格式化逻辑
    return time;
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      setShowNotifications(false);
      // 跳转到相应页面
      window.location.href = notification.actionUrl;
    }
  };

  const handleDeleteNotification = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  const handleMarkAsRead = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notificationId);
  };

  const handleMoreActions = (notification: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // 可以在这里添加更多操作菜单
    const _actions = [
      {
        label: '标记为已读', action: () => markAsRead(notification.id)
      },
      { label: '删除通知', action: () => deleteNotification(notification.id) },
      { label: '查看详情', action: () => notification.actionUrl && (window.location.href = notification.actionUrl) }
    ];

    // 简单的确认对话框实现
    const actionText = notification.read ? '删除此通知' : '标记为已读并删除';
    if (confirm("确认执行此操作？")) {
      deleteNotification(notification.id);
    }
  };

  const getActionColor = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-400 bg-blue-500/20 hover:bg-blue-500/30';
      case 'red': return 'text-red-400 bg-red-500/20 hover:bg-red-500/30';
      case 'green': return 'text-green-400 bg-green-500/20 hover:bg-green-500/30';
      case 'purple': return 'text-purple-400 bg-purple-500/20 hover:bg-purple-500/30';
      case 'yellow': return 'text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30';
      case 'indigo': return 'text-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/30';
      default: return 'text-gray-400 bg-gray-500/20 hover:bg-gray-500/30';
    }
  };

  // 搜索相关函数
  const handleSearchResultClick = (result: SearchResult) => {
    globalSearchService.recordSearch(searchQuery);
    setSearchHistory(globalSearchService.getSearchHistory());
    setShowSearchDropdown(false);
    setSearchQuery('');
    // 这里可以添加路由跳转逻辑
    window.location.href = result.url;
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      globalSearchService.recordSearch(query);
      setSearchHistory(globalSearchService.getSearchHistory());
      setShowSearchDropdown(false);
      // 如果没有精确匹配的结果，导航到帮助页面进行搜索
      if (searchResults.length === 0) {
        window.location.href = `/help?search=${encodeURIComponent(query)}`;
      } else {
        // 导航到第一个结果
        handleSearchResultClick(searchResults[0]);
      }
    }
  };

  const clearSearchHistory = () => {
    globalSearchService.clearSearchHistory();
    setSearchHistory([]);
  };

  // 渲染搜索图标
  const renderSearchIcon = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      Home, Globe, Zap, Shield, Search, BarChart3, Settings, HelpCircle,
      Code, Monitor, Activity, Upload, Download, User, Bell, Key, Play,
      Book, Lock, TestTube, Clock
    };
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="w-3 h-3" /> : <Search className="w-3 h-3" />;
  };

  // 高亮搜索结果
  const highlightSearchText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-blue-500/30 text-blue-300 font-medium">
          {part}
        </span>
      ) : part
    );
  };

  return (
    <header className={`px-6 py-4 relative z-[1000] transition-all duration-300 ${actualTheme === 'light'
      ? 'bg-white/95 border-b border-gray-200 backdrop-blur-sm'
      : 'bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50'
      }`}>
      <div className="flex items-center justify-between">
        {/* 左侧：Logo和导航控制 */}
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`p-2 rounded-lg transition-colors ${actualTheme === 'light'
              ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            <Menu className="w-5 h-5" />
          </button>

          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <div>
                <h1 className={`text-lg font-bold ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>Test Web App</h1>
                <p className={`text-xs ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                  }`}>专业测试平台</p>
              </div>
            </div>
          )}
        </div>

        {/* 中间：搜索框 */}
        <div className="flex-1 max-w-xl mx-8 relative" ref={searchRef}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedSearchIndex(prev =>
                    prev < searchResults.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedSearchIndex(prev => prev > -1 ? prev - 1 : prev);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (selectedSearchIndex >= 0 && searchResults[selectedSearchIndex]) {
                    handleSearchResultClick(searchResults[selectedSearchIndex]);
                  } else if (searchQuery.trim()) {
                    // 执行搜索
                    handleSearch(searchQuery);
                  }
                } else if (e.key === 'Escape') {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="搜索测试、报告、设置..."
              className={`w-full pl-10 pr-4 py-2 text-sm transition-all duration-200 ${actualTheme === 'light'
                ? `bg-gray-50 border text-gray-900 placeholder-gray-500 ${showSearchDropdown
                  ? 'border-blue-500 ring-2 ring-blue-500/20 rounded-t-lg rounded-b-none bg-white'
                  : 'border-gray-300 rounded-lg hover:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                }`
                : `bg-gray-700/50 border text-white placeholder-gray-400 ${showSearchDropdown
                  ? 'border-blue-500 ring-2 ring-blue-500/20 rounded-t-lg rounded-b-none bg-gray-700/80'
                  : 'border-gray-600 rounded-lg hover:bg-gray-600/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                }`
                }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
                title="清除搜索"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 搜索下拉框 */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 bg-gray-700/95 backdrop-blur-xl border border-blue-500 border-t-0 rounded-b-lg shadow-2xl z-[9999] max-h-96 overflow-hidden">
              {searchQuery.trim() ? (
                // 搜索结果
                <div className="max-h-80 overflow-y-auto dark-scrollbar">
                  {isSearching ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-400">搜索中...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result, index) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleSearchResultClick(result)}
                          className={`w-full text-left px-4 py-3 transition-all duration-150 ${selectedSearchIndex === index
                            ? 'bg-blue-500/20 border-l-2 border-blue-500'
                            : 'hover:bg-gray-600/50'
                            }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${result.type === 'page' ? 'bg-blue-500/20 text-blue-400' :
                              result.type === 'test' ? 'bg-green-500/20 text-green-400' :
                                result.type === 'setting' ? 'bg-purple-500/20 text-purple-400' :
                                  result.type === 'help' ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-gray-500/20 text-gray-400'
                              }`}>
                              {renderSearchIcon(result.icon || 'Search')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-white truncate text-sm">
                                  {highlightSearchText(result.title, searchQuery)}
                                </h3>
                                <ArrowRight className="w-3 h-3 text-gray-400 ml-2 flex-shrink-0" />
                              </div>
                              <p className="text-xs text-gray-400 truncate mt-1">
                                {highlightSearchText(result.description, searchQuery)}
                              </p>
                              <span className="text-xs px-2 py-0.5 bg-gray-600/50 text-gray-300 rounded mt-1 inline-block">
                                {result.category}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <Search className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">没有找到相关结果</p>
                      <p className="text-xs text-gray-500 mt-1">
                        尝试使用不同的关键词
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // 搜索历史和建议
                <div className="py-2">
                  {
                    searchHistory.length > 0 && (
                      <div className="px-4 py-2 border-b border-gray-600/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center text-gray-400">
                            <Clock className="w-3 h-3 mr-2" />
                            <span className="text-xs font-medium">最近搜索</span>
                          </div>
                          <button
                            type="button"
                            onClick={clearSearchHistory}
                            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            清除
                          </button>
                        </div>
                        <div className="space-y-1">
                          {searchHistory.slice(0, 3).map((historyItem, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setSearchQuery(historyItem);
                                setShowSearchDropdown(false);
                              }}
                              className="w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-600/50 rounded transition-colors"
                            >
                              {historyItem}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  {/* 快捷搜索建议 */}
                  <div className="px-4 py-2">
                    <div className="flex items-center text-gray-400 mb-2">
                      <TrendingUp className="w-3 h-3 mr-2" />
                      <span className="text-xs font-medium">快捷搜索</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {['网站测试', '安全检测', 'API测试', '实时监控', '系统设置', '帮助文档'].map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setSearchQuery(suggestion);
                            setShowSearchDropdown(false);
                          }}
                          className="text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-600/50 rounded transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 搜索提示 */}
              <div className="border-t border-gray-600/50 px-4 py-2 bg-gray-800/50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-3">
                    <span>↑↓ 导航</span>
                    <span>↵ 选择</span>
                    <span>ESC 关闭</span>
                  </div>
                  <span>Ctrl+K 快速搜索</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：快捷操作和用户菜单 */}
        <div className="flex items-center space-x-3">
          {/* 快捷操作 */}
          <div className="relative" ref={quickActionsRef}>
            <button
              type="button"
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              title="快捷操作"
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            {showQuickActions && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[9999]">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">快捷操作</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action) => (
                      <Link
                        key={action.id}
                        to={action.href}
                        onClick={() => setShowQuickActions(false)}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${getActionColor(action.color)}`}
                      >
                        <action.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{action.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 通知中心 */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              title="通知中心"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-[420px] bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl z-[9999]">
                {/* 通知中心头部 */}
                <div className="p-4 border-b border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">通知中心</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">{unreadCount} 条未读</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          全部已读
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 筛选按钮 */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('all')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${notificationFilter === 'all'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-400 hover:text-gray-300 border border-gray-600/50'
                        }`}
                    >
                      全部
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('unread')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${notificationFilter === 'unread'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-400 hover:text-gray-300 border border-gray-600/50'
                        }`}
                    >
                      未读 ({unreadCount})
                    </button>
                  </div>
                </div>

                {/* 通知列表 */}
                <div className="max-h-80 overflow-y-auto dark-scrollbar">
                  {displayNotifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        {notificationFilter === 'unread' ? '没有未读通知' : '暂无通知'}
                      </p>
                    </div>
                  ) : (
                    displayNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`relative border-l-2 ${getPriorityColor(notification.priority)} ${!notification.read ? 'bg-blue-500/5' : ''
                          }`}
                      >
                        <div
                          className="p-4 border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className={`text-sm font-medium truncate ${!notification.read ? 'text-white' : 'text-gray-300'
                                  }`}>
                                  {notification.title}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-400">
                                    {formatTime(notification.time)}
                                  </span>
                                  <div className="relative">
                                    <button
                                      type="button"
                                      className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
                                      title="更多操作"
                                      onClick={(e) => handleMoreActions(notification, e)}
                                    >
                                      <MoreVertical className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                                {notification.message}
                              </p>

                              {/* 通知类别和优先级 */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {notification.category && (
                                    <span className="px-2 py-0.5 text-xs bg-gray-700/50 text-gray-400 rounded">
                                      {notification.category}
                                    </span>
                                  )}
                                  {notification.priority && notification.priority !== 'low' && (
                                    <span className={`px-2 py-0.5 text-xs rounded ${notification.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                      notification.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-yellow-500/20 text-yellow-400'
                                      }`}>
                                      {notification.priority === 'urgent' ? '紧急' :
                                        notification.priority === 'high' ? '高' : '低'}
                                    </span>
                                  )}
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex items-center space-x-1">
                                  {notification.actionUrl && (
                                    <button
                                      type="button"
                                      className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                      title={notification.actionText || '查看详情'}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNotificationClick(notification);
                                      }}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  )}
                                  {!notification.read && (
                                    <button
                                      type="button"
                                      className="p-1 text-green-400 hover:text-green-300 transition-colors"
                                      title="标记为已读"
                                      onClick={(e) => handleMarkAsRead(notification.id, e)}
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                    title="删除通知"
                                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 通知中心底部 */}
                <div className="p-3 border-t border-gray-700/50 bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <Link
                      to="/notifications"
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={() => setShowNotifications(false)}
                    >
                      查看全部通知
                    </Link>
                    <button
                      type="button"
                      className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                      onClick={() => setShowNotifications(false)}
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 主题切换 */}
          <ThemeToggle size="md" className="flex-shrink-0" />

          {/* 帮助中心 */}
          <Link
            to="/help"
            className={`p-2 rounded-lg transition-colors ${actualTheme === 'light'
              ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            title="帮助中心"
          >
            <HelpCircle className="w-5 h-5" />
          </Link>

          {/* 用户菜单或登录按钮 */}
          {
            isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                  title="用户菜单"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    {user.role === 'admin' ? (
                      <Crown className="w-4 h-4 text-white" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showUserMenu && (
                  <UserDropdownMenu onClose={() => setShowUserMenu(false)} />
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${actualTheme === 'light'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                title="登录"
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">登录</span>
              </Link>
            )
          }
        </div >
      </div >

    </header>
  );
};

export default TopNavbar;
