/**
 * 通知系统Hook
 * 提供统一的通知消息管理功能
 */

import { useCallback, useState } from 'react';

// 通知类型
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 通知项接口
export interface NotificationItem {
    id: string;
    type: NotificationType;
    title?: string;
    message: string;
    duration?: number;
    closable?: boolean;
    timestamp: number;
}

// 通知配置接口
export interface NotificationConfig {
    type?: NotificationType;
    title?: string;
    duration?: number;
    closable?: boolean;
}

// 通知上下文接口
export interface NotificationContextValue {
    notifications: NotificationItem[];
    showNotification: (message: string, type?: NotificationType, config?: NotificationConfig) => string;
    hideNotification: (id: string) => void;
    clearNotifications: () => void;
}

// 默认配置
const DEFAULT_DURATION = 4000;
const DEFAULT_TYPE: NotificationType = 'info';

// 生成唯一ID
const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 通知Hook
export const useNotification = () => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    // 显示通知
    const showNotification = useCallback((
        message: string,
        type: NotificationType = DEFAULT_TYPE,
        config: NotificationConfig = {}
    ): string => {
        const id = generateId();
        const notification: NotificationItem = {
            id,
            type: config?.type || type,
            title: config?.title,
            message,
            duration: config?.duration ?? DEFAULT_DURATION,
            closable: config?.closable ?? true,
            timestamp: Date.now()
        };

        setNotifications(prev => [notification, ...prev]);

        // 自动隐藏
        if (notification.duration > 0) {
            setTimeout(() => {
                hideNotification(id);
            }, notification.duration);
        }

        return id;
    }, []);

    // 隐藏通知
    const hideNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);

    // 清空所有通知
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // 成功通知的快捷方法
    const success = useCallback((message: string, config?: Omit<NotificationConfig, 'type'>) => {
        return showNotification(message, 'success', config);
    }, [showNotification]);

    // 错误通知的快捷方法
    const error = useCallback((message: string, config?: Omit<NotificationConfig, 'type'>) => {
        return showNotification(message, 'error', { duration: 6000, ...config });
    }, [showNotification]);

    // 警告通知的快捷方法
    const warning = useCallback((message: string, config?: Omit<NotificationConfig, 'type'>) => {
        return showNotification(message, 'warning', config);
    }, [showNotification]);

    // 信息通知的快捷方法
    const info = useCallback((message: string, config?: Omit<NotificationConfig, 'type'>) => {
        return showNotification(message, 'info', config);
    }, [showNotification]);

    return {
        notifications,
        showNotification,
        hideNotification,
        clearNotifications,
        success,
        error,
        warning,
        info
    };
};

export default useNotification;