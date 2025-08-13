import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

// 智能提示组件
export interface SmartTooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const SmartTooltip: React.FC<SmartTooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = useCallback(() => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  }, [timeoutId]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap ${getPositionClasses()}`}>
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45" 
               style={{
                 [position === 'top' ? 'top' : position === 'bottom' ? 'bottom' : position === 'left' ? 'left' : 'right']: '100%',
                 [position === 'top' || position === 'bottom' ? 'left' : 'top']: '50%',
                 transform: position === 'top' || position === 'bottom' ? 'translateX(-50%) rotate(45deg)' : 'translateY(-50%) rotate(45deg)'
               }}
          />
        </div>
      )}
    </div>
  );
};

// 智能通知系统
export interface NotificationOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  persistent?: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: number;
  persistent: boolean;
}

export const useSmartNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, options: NotificationOptions = {}) => {
    const {
      type = 'info',
      duration = 5000,
      persistent = false
    } = options;

    const notification: Notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now(),
      persistent
    };

    setNotifications(prev => [...prev, notification]);

    if (!persistent) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, duration);
    }

    return notification.id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success: (message: string, options?: Omit<NotificationOptions, 'type'>) => 
      addNotification(message, { ...options, type: 'success' }),
    error: (message: string, options?: Omit<NotificationOptions, 'type'>) => 
      addNotification(message, { ...options, type: 'error' }),
    warning: (message: string, options?: Omit<NotificationOptions, 'type'>) => 
      addNotification(message, { ...options, type: 'warning' }),
    info: (message: string, options?: Omit<NotificationOptions, 'type'>) => 
      addNotification(message, { ...options, type: 'info' })
  };
};

// 通知容器组件
export interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove,
  position = 'top-right'
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeClasses = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`fixed z-50 space-y-2 ${getPositionClasses()}`}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-sm ${getTypeClasses(notification.type)}`}
        >
          {getIcon(notification.type)}
          <div className="flex-1 text-sm">
            {notification.message}
          </div>
          <button
            onClick={() => onRemove(notification.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

// 全局通知提供者
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { notifications, removeNotification } = useSmartNotification();

  return (
    <>
      {children}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </>
  );
};
