import {AlertTriangle, Bell, Check, CheckCircle, ExternalLink, Info, RefreshCw, Search, Trash2, X} from 'lucide-react';
import React, { useState } from 'react';
import {Link} from 'react-router-dom';
import {NotificationItem, useNotifications} from '../../../hooks/useNotifications.ts';

const Notifications: React.FC = () => {
  const {
    notifications,
    loading,
    stats,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getNotificationsByType,
    getNotificationsByCategory
  } = useNotifications();

  const [filter, setFilter] = useState({
    type: 'all' as 'all' | 'success' | 'warning' | 'error' | 'info',
    category: 'all' as 'all' | 'system' | 'test' | 'security' | 'performance' | 'general',
    status: 'all' as 'all' | 'read' | 'unread',
    search: ''
  });

  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error': return <X className="w-5 h-5 text-red-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-500/5';
      case 'high': return 'border-l-orange-500 bg-orange-500/5';
      case 'medium': return 'border-l-yellow-500 bg-yellow-500/5';
      case 'low': return 'border-l-green-500 bg-green-500/5';
      default: return 'border-l-gray-500 bg-gray-500/5';
    }
  };

  // 筛选通知
  const filteredNotifications = notifications.filter(notification => {
    if (filter.type !== 'all' && notification.type !== filter.type) return false;
    if (filter.category !== 'all' && notification.category !== filter.category) return false;
    if (filter.status === 'read' && !notification.read) return false;
    if (filter.status === 'unread' && notification.read) return false;
    if (filter.search && !notification.title.toLowerCase().includes(filter.search.toLowerCase()) &&
      !notification.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  // 处理通知点击
  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  // 批量操作
  const handleBatchMarkAsRead = () => {
    selectedNotifications.forEach(id => markAsRead(id));
    setSelectedNotifications([]);
  };

  const handleBatchDelete = () => {
    selectedNotifications.forEach(id => deleteNotification(id));
    setSelectedNotifications([]);
  };

  // 切换选择
  const toggleSelection = (id: string) => {
    setSelectedNotifications(prev =>
      prev.includes(id) ? prev.filter(nId => nId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedNotifications(filteredNotifications.map(n => n.id));
  };

  const clearSelection = () => {
    setSelectedNotifications([]);
  };

  if (loading) {
    return (
      <div className="space-y-6 dark-page-scrollbar">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 dark-page-scrollbar">
      {/* 页面标题 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <Bell className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">通知中心</h1>
              <p className="text-gray-300 mt-1">管理和查看所有系统通知</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              全部已读
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-700/50 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-600/50 hover:text-white transition-all duration-200 shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-blue-500/30 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">总通知数</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <Bell className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-orange-500/30 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">未读通知</p>
              <p className="text-2xl font-bold text-orange-400">{stats.unread}</p>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-red-500/30 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">错误通知</p>
              <p className="text-2xl font-bold text-red-400">{stats.byType.error}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
              <X className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-green-500/30 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">成功通知</p>
              <p className="text-2xl font-bold text-green-400">{stats.byType.success}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="notification-type-select" className="block text-sm font-semibold text-gray-300 mb-2">类型</label>
            <select
              id="notification-type-select"
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value as any })}
              className="w-full px-3 py-2.5 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 transition-colors duration-150"
              aria-label="选择通知类型"
            >
              <option value="all">全部类型</option>
              <option value="success">成功</option>
              <option value="warning">警告</option>
              <option value="error">错误</option>
              <option value="info">信息</option>
            </select>
          </div>

          <div>
            <label htmlFor="notification-category-select" className="block text-sm font-semibold text-gray-300 mb-2">分类</label>
            <select
              id="notification-category-select"
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value as any })}
              className="w-full px-3 py-2.5 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 transition-colors duration-150"
              aria-label="选择通知分类"
            >
              <option value="all">全部分类</option>
              <option value="system">系统</option>
              <option value="test">测试</option>
              <option value="security">安全</option>
              <option value="performance">性能</option>
              <option value="general">通用</option>
            </select>
          </div>

          <div>
            <label htmlFor="notification-status-select" className="block text-sm font-semibold text-gray-300 mb-2">状态</label>
            <select
              id="notification-status-select"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value as any })}
              className="w-full px-3 py-2.5 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 transition-colors duration-150"
              aria-label="选择通知状态"
            >
              <option value="all">全部状态</option>
              <option value="unread">未读</option>
              <option value="read">已读</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索通知标题或内容..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 placeholder-gray-500 transition-colors duration-150"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 批量操作 */}
      {selectedNotifications.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-400">
              已选择 {selectedNotifications.length} 个通知
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchMarkAsRead}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                标记已读
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                删除
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通知列表 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50">
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              通知列表 ({filteredNotifications.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                全选
              </button>
              <span className="text-gray-500">|</span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                清除选择
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-700/50">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">没有找到通知</h3>
              <p className="text-gray-500">尝试调整筛选条件或清除搜索</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`relative border-l-4 ${getPriorityColor(notification.priority)} ${!notification.read ? 'bg-blue-500/5' : ''
                  }`}
              >
                <div className="p-6 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      id={`notification-${notification.id}`}
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => toggleSelection(notification.id)}
                      className="mt-1 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                      aria-label={`选择通知: ${notification.title}`}
                      title={`选择通知: ${notification.title}`}
                    />

                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-medium ${!notification.read ? 'text-white' : 'text-gray-300'
                          }`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">
                            {notification.time}
                          </span>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-400 mb-3">{notification.message}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {notification.category && (
                            <span className="px-2 py-1 text-xs bg-gray-700/50 text-gray-400 rounded">
                              {notification.category}
                            </span>
                          )}
                          {notification.priority && notification.priority !== 'low' && (
                            <span className={`px-2 py-1 text-xs rounded ${notification.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                              notification.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                              {notification.priority === 'urgent' ? '紧急' :
                                notification.priority === 'high' ? '高' : '中'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {notification.actionUrl && (
                            <Link
                              to={notification.actionUrl}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <ExternalLink className="w-3 h-3" />
                              {notification.actionText || '查看详情'}
                            </Link>
                          )}
                          {!notification.read && (
                            <button
                              type="button"
                              onClick={() => markAsRead(notification.id)}
                              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg transition-colors"
                              title="标记为已读"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteNotification(notification.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="删除通知"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
