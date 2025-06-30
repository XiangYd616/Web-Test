import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

const BackgroundTestNotifications: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, deleteNotification } = useNotifications();

  const getNotificationColor = (type: string) => {
    const colors = {
      success: 'bg-green-600/90 border-green-500/50',
      error: 'bg-red-600/90 border-red-500/50',
      warning: 'bg-yellow-600/90 border-yellow-500/50',
      info: 'bg-blue-600/90 border-blue-500/50'
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-30 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`max-w-xs p-3 rounded-lg border shadow-lg text-white transform transition-all duration-300 ${getNotificationColor(notification.type)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{notification.title}</h4>
              <p className="text-xs mt-1 opacity-90 line-clamp-2">{notification.message}</p>

              {notification.actionUrl && notification.actionText && (
                <button
                  type="button"
                  onClick={() => {
                    if (notification.actionUrl?.includes('/stress-test')) {
                      navigate('/stress-test');
                    } else if (notification.actionUrl?.includes('/security-test')) {
                      navigate('/security-test');
                    } else if (notification.actionUrl?.includes('/api-test')) {
                      navigate('/api-test');
                    } else if (notification.actionUrl?.includes('/content-test')) {
                      navigate('/content-test');
                    } else if (notification.actionUrl?.includes('/compatibility-test')) {
                      navigate('/compatibility-test');
                    }
                    deleteNotification(notification.id);
                  }}
                  className="mt-2 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs flex items-center space-x-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{notification.actionText}</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => deleteNotification(notification.id)}
              className="ml-2 text-white/70 hover:text-white transition-colors flex-shrink-0"
              title="关闭通知"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BackgroundTestNotifications;