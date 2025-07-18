import { useState, useEffect, useCallback } from 'react';

export interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
  category?: 'system' | 'test' | 'security' | 'performance' | 'general';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    success: number;
    warning: number;
    error: number;
    info: number;
  };
  byCategory: {
    system: number;
    test: number;
    security: number;
    performance: number;
    general: number;
  };
}

const STORAGE_KEY = 'testweb_notifications';

// 模拟通知数据
const generateMockNotifications = (): NotificationItem[] => {
  const now = new Date();
  return [
    {
      id: '1',
      type: 'success',
      title: '压力测试完成',
      message: '网站压力测试已成功完成，平均响应时间 245ms，性能评分 85分',
      time: '2分钟前',
      read: false,
      category: 'test',
      priority: 'medium',
      actionUrl: '/stress-test/results/1',
      actionText: '查看报告',
      createdAt: new Date(now.getTime() - 2 * 60 * 1000)
    },
    {
      id: '2',
      type: 'warning',
      title: '安全扫描发现问题',
      message: '检测到 3 个中等风险安全漏洞，建议及时修复',
      time: '15分钟前',
      read: false,
      category: 'security',
      priority: 'high',
      actionUrl: '/security-test/results/2',
      actionText: '查看详情',
      createdAt: new Date(now.getTime() - 15 * 60 * 1000)
    },
    {
      id: '3',
      type: 'error',
      title: 'API测试失败',
      message: '用户登录接口测试失败，返回状态码 500',
      time: '30分钟前',
      read: true,
      category: 'test',
      priority: 'urgent',
      actionUrl: '/api-test/results/3',
      actionText: '重新测试',
      createdAt: new Date(now.getTime() - 30 * 60 * 1000)
    },
    {
      id: '4',
      type: 'info',
      title: '系统维护通知',
      message: '系统将于今晚 23:00-01:00 进行例行维护，期间服务可能中断',
      time: '1小时前',
      read: true,
      category: 'system',
      priority: 'medium',
      createdAt: new Date(now.getTime() - 60 * 60 * 1000)
    },
    {
      id: '5',
      type: 'success',
      title: 'SEO分析完成',
      message: '网站SEO分析已完成，整体评分 92分，表现优秀',
      time: '2小时前',
      read: false,
      category: 'test',
      priority: 'low',
      actionUrl: '/content-test/results/5',
      actionText: '查看报告',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    },
    {
      id: '6',
      type: 'warning',
      title: '性能监控警告',
      message: '网站响应时间超过阈值，平均响应时间 2.5秒',
      time: '3小时前',
      read: true,
      category: 'performance',
      priority: 'high',
      actionUrl: '/monitoring/performance',
      actionText: '查看监控',
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000)
    },
    {
      id: '7',
      type: 'info',
      title: '新功能上线',
      message: '批量测试功能已上线，支持同时测试多个URL',
      time: '1天前',
      read: false,
      category: 'general',
      priority: 'low',
      actionUrl: '/batch-test',
      actionText: '立即体验',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
    },
    {
      id: '8',
      type: 'error',
      title: '备份失败',
      message: '数据库自动备份失败，请检查存储空间',
      time: '1天前',
      read: true,
      category: 'system',
      priority: 'urgent',
      actionUrl: '/backup-management',
      actionText: '查看备份',
      createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000)
    }
  ];
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 初始化通知数据
  useEffect(() => {
    const loadNotifications = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setNotifications(parsed.map((n: any) => ({
            ...n,
            createdAt: new Date(n.createdAt)
          })));
        } else {
          // 首次加载，使用模拟数据
          const mockData = generateMockNotifications();
          setNotifications(mockData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mockData));
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
        const mockData = generateMockNotifications();
        setNotifications(mockData);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // 保存通知到本地存储
  const saveNotifications = useCallback((newNotifications: NotificationItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }, []);

  // 标记通知为已读
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      );
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // 标记所有通知为已读
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(notification => ({ ...notification, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // 删除通知
  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(notification => notification.id !== id);
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // 清空所有通知
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, [saveNotifications]);

  // 添加新通知
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'createdAt'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return updated;
    });
    
    return newNotification.id;
  }, [saveNotifications]);

  // 获取通知统计
  const getStats = useCallback((): NotificationStats => {
    const stats: NotificationStats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: {
        success: notifications.filter(n => n.type === 'success').length,
        warning: notifications.filter(n => n.type === 'warning').length,
        error: notifications.filter(n => n.type === 'error').length,
        info: notifications.filter(n => n.type === 'info').length
      },
      byCategory: {
        system: notifications.filter(n => n.category === 'system').length,
        test: notifications.filter(n => n.category === 'test').length,
        security: notifications.filter(n => n.category === 'security').length,
        performance: notifications.filter(n => n.category === 'performance').length,
        general: notifications.filter(n => n.category === 'general').length
      }
    };
    return stats;
  }, [notifications]);

  // 按类型筛选通知
  const getNotificationsByType = useCallback((type: NotificationItem['type']) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // 按类别筛选通知
  const getNotificationsByCategory = useCallback((category: NotificationItem['category']) => {
    return notifications.filter(n => n.category === category);
  }, [notifications]);

  // 获取未读通知
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  // 获取最近的通知
  const getRecentNotifications = useCallback((limit: number = 5) => {
    return notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }, [notifications]);

  return {
    notifications,
    loading,
    stats: getStats(),
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    addNotification,
    getNotificationsByType,
    getNotificationsByCategory,
    getUnreadNotifications,
    getRecentNotifications
  };
};
