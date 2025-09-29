// 本地ErrorInfo接口，避免与React.ErrorInfo冲突
interface LocalErrorInfo {
  type: string;
  message: string;
  code?: string;
  timestamp: string;
  stack?: string;
  suggestions?: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  title?: string;  // 添加title属性
  details?: string; // 添加details属性
}

import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle, Clock, Globe, Home, Info, RefreshCw, Server, Shield, WifiOff, XCircle } from 'lucide-react';
import React from 'react';
// 自定义错误信息接口
interface CustomErrorInfo {
  type: string;
  title: string;
  message: string;
  details?: string;
  code?: string;
  suggestions?: string[];
}


// 错误类型定义
export type ErrorType =
  | 'network'
  | 'timeout'
  | 'server'
  | 'validation'
  | 'permission'
  | 'not-found'
  | 'rate-limit'
  | 'unknown';

export interface SystemErrorInfo {
  type: ErrorType;
  title: string;
  message: string;
  details?: string;
  code?: string | number;
  timestamp?: string;
  suggestions?: string[];
}

// 基础错误组件
export const ErrorDisplay: React.FC<{
  error: LocalErrorInfo;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
  /**
   * 获取getErrorIcon数据
   * @param {string} id - 对象ID
   * @returns {Promise<Object|null>} 获取的数据
   */
}> = ({ error, onRetry, onGoBack, onGoHome, className = '' }) => {
  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case 'network':
        return WifiOff;
      case 'timeout':
        return Clock;
      case 'server':
        return Server;
      case 'permission':
        return Shield;
      case 'not-found':
        return Globe;
      case 'rate-limit':
        return AlertTriangle;
      default:
        return XCircle;
    }
  };

  const getErrorColor = (type: ErrorType) => {
    switch (type) {
      case 'network':
        return 'text-orange-600 bg-orange-100';
      case 'timeout':
        return 'text-yellow-600 bg-yellow-100';
      case 'server':
        return 'text-red-600 bg-red-100';
      case 'permission':
        return 'text-purple-600 bg-purple-100';
      case 'validation':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-red-600 bg-red-100';
    }
  };

  const Icon = getErrorIcon(error.type as ErrorType);
  const colorClass = getErrorColor(error.type as ErrorType);

  return (
    <div className={`text-center p-8 ${className}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${colorClass}`}>
        <Icon className="w-8 h-8" />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">{error.title}</h3>
      <p className="text-gray-600 mb-4 max-w-md mx-auto">{error.message}</p>

      {error.details && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
          <p className="text-sm text-gray-700">{error.details}</p>
          {error.code && (
            <p className="text-xs text-gray-500 mt-2">错误代码: {error.code}</p>
          )}
        </div>
      )}

      {error.suggestions && error.suggestions.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
          <h4 className="text-sm font-medium text-blue-900 mb-2">建议解决方案:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {error.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>重试</span>
          </button>
        )}
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回</span>
          </button>
        )}
        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>首页</span>
          </button>
        )}
      </div>
    </div>
  );
};

// 网络错误组件
export const NetworkError: React.FC<{
  onRetry: () => void;
  className?: string;
}> = ({ onRetry, className = '' }) => {
  const error: LocalErrorInfo = {
    type: 'network',
    title: '网络连接失败',
    message: '无法连接到服务器，请检查您的网络连接',
    timestamp: new Date().toISOString(),
    severity: 'high',
    suggestions: [
      '检查网络连接是否正常',
      '尝试刷新页面',
      '检查防火墙设置',
      '联系网络管理员'
    ]
  };

  return <ErrorDisplay error={error} onRetry={onRetry} className={className} />;
};

// 服务器错误组件
export const ServerError: React.FC<{
  statusCode?: number;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}> = ({ statusCode = 500, onRetry, onGoHome, className = '' }) => {
  const error: LocalErrorInfo = {
    type: 'server',
    title: '服务器错误',
    message: '服务器遇到了一个错误，无法完成您的请求',
    code: statusCode?.toString(),
    timestamp: new Date().toISOString(),
    severity: 'critical',
    suggestions: [
      '稍后再试',
      '刷新页面',
      '如果问题持续存在，请联系技术支持'
    ]
  };

  return <ErrorDisplay error={error} onRetry={onRetry} onGoHome={onGoHome} className={className} />;
};

// 权限错误组件
export const PermissionError: React.FC<{
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
}> = ({ onGoBack, onGoHome, className = '' }) => {
  const error: LocalErrorInfo = {
    type: 'permission',
    title: '访问被拒绝',
    message: '您没有权限访问此资源',
    timestamp: new Date().toISOString(),
    severity: 'medium',
    suggestions: [
      '检查您的登录状态',
      '联系管理员获取权限',
      '确认您有正确的访问级别'
    ]
  };

  return <ErrorDisplay error={error} onGoBack={onGoBack} onGoHome={onGoHome} className={className} />;
};

// 404错误组件
export const NotFoundError: React.FC<{
  resource?: string;
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
}> = ({ resource = '页面', onGoBack, onGoHome, className = '' }) => {
  const error: LocalErrorInfo = {
    type: 'not-found',
    title: `${resource}未找到`,
    message: `您访问的${resource}不存在或已被移除`,
    code: "404",
    timestamp: new Date().toISOString(),
    severity: 'medium',
    suggestions: [
      '检查URL是否正确',
      '返回上一页',
      '访问首页查找所需内容'
    ]
  };

  return <ErrorDisplay error={error} onGoBack={onGoBack} onGoHome={onGoHome} className={className} />;
};

// 验证错误组件
export const ValidationError: React.FC<{
  errors: string[];
  onClose?: () => void;
  className?: string;
}> = ({ errors, onClose, className = '' }) => {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-2">请修正以下错误:</h3>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-red-400 hover:text-red-600 ml-3"
            title="关闭错误提示"
            aria-label="关闭错误提示"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

// 通知组件
export const Notification: React.FC<{
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  className?: string;
}> = ({ type, title, message, onClose, autoClose = true, duration = 5000, className = '' }) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoClose, duration, onClose]);

    /**
     * switch功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600',
          titleColor: 'text-green-800',
          messageColor: 'text-green-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-800',
          messageColor: 'text-yellow-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: XCircle,
          iconColor: 'text-red-600',
          titleColor: 'text-red-800',
          messageColor: 'text-red-700'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: Info,
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-800',
          messageColor: 'text-blue-700'
        };
    }
  };

  const style = getNotificationStyle(type);
  const Icon = style.icon;

  if (!isVisible) return null;

  return (
    <div className={`${style.bg} border rounded-lg p-4 transition-all duration-300 ${className}`}>
      <div className="flex items-start">
        <Icon className={`w-5 h-5 ${style.iconColor} mt-0.5 mr-3 flex-shrink-0`} />
        <div className="flex-1">
          <h3 className={`text-sm font-medium ${style.titleColor} mb-1`}>{title}</h3>
          {message && <p className={`text-sm ${style.messageColor}`}>{message}</p>}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose(), 300);
            }}
            className={`${style.iconColor.replace('600', '400')} hover:${style.iconColor} ml-3`}
            title="关闭通知"
            aria-label="关闭通知"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

// 错误边界组件
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; resetError: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: unknown) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary', error, {
      component: 'ErrorBoundary',
      errorInfo: errorInfo.componentStack
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// 默认错误回退组件
const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ error, resetError }) => {
  const errorInfo: LocalErrorInfo = {
    type: 'unknown',
    title: '应用程序错误',
    message: '应用程序遇到了一个意外错误',
    details: error.message,
    timestamp: new Date().toISOString(),
    severity: 'critical',
    suggestions: [
      '刷新页面重试',
      '清除浏览器缓存',
      '如果问题持续存在，请联系技术支持'
    ]
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <ErrorDisplay
          error={errorInfo}
          onRetry={resetError}
          onGoHome={() => window.location.href = '/'}
        />
      </div>
    </div>
  );
};

// 错误处理Hook
export const useErrorHandler = () => {
  const [error, setError] = React.useState<LocalErrorInfo | null>(null);

  const handleError = (error: unknown, context?: string) => {
    let errorInfo: LocalErrorInfo;

    if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      errorInfo = {
        type: 'network',
        title: '网络错误',
        message: '网络连接失败，请检查您的网络连接',
        details: context ? `在${context}时发生错误` : undefined,
        timestamp: new Date().toISOString(),
        severity: 'high'
      };
    } else if (error.status === 404) {
      errorInfo = {
        type: 'not-found',
        title: '资源未找到',
        message: '请求的资源不存在',
        code: '404',
        timestamp: new Date().toISOString(),
        severity: 'medium'
      };
    } else if (error.status >= 500) {
      errorInfo = {
        type: 'server',
        title: '服务器错误',
        message: '服务器遇到了一个错误',
        code: error.status,
        timestamp: new Date().toISOString(),
        severity: 'critical'
      };
    } else if (error.status === 403) {
      errorInfo = {
        type: 'permission',
        title: '权限不足',
        message: '您没有权限执行此操作',
        timestamp: new Date().toISOString(),
        severity: 'medium'
      };
    } else {
      errorInfo = {
        type: 'unknown',
        title: '未知错误',
        message: error.message || '发生了一个未知错误',
        details: context ? `在${context}时发生错误` : undefined,
        timestamp: new Date().toISOString(),
        severity: 'medium'
      };
    }

    setError(errorInfo);
  };

  const clearError = () => setError(null);

  return { error, handleError, clearError };
};

// 通知管理Hook
export const useNotifications = () => {
  const [notifications, setNotifications] = React.useState<Array<{
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message?: string;
    duration?: number;
  }>>([]);

  const addNotification = (notification: Omit<typeof notifications[0], 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n?.id !== id));
  };

  const success = (title: string, message?: string) =>

  /**

   * warning功能函数

   * @param {Object} params - 参数对象

   * @returns {Promise<Object>} 返回结果

   */
    addNotification({ type: 'success', title, message });

  const warning = (title: string, message?: string) =>

  /**

   * error功能函数

   * @param {Object} params - 参数对象

   * @returns {Promise<Object>} 返回结果

   */
    addNotification({ type: 'warning', title, message });

  const error = (title: string, message?: string) =>

  /**

   * info功能函数

   * @param {Object} params - 参数对象

   * @returns {Promise<Object>} 返回结果

   */
    addNotification({ type: 'error', title, message });

  const info = (title: string, message?: string) =>
    addNotification({ type: 'info', title, message });

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    warning,
    error,
    info
  };
};

// 默认导出 - 包含所有错误处理组件和工具
const ErrorHandling = {
  // 组件
  ErrorDisplay,
  NetworkError,
  ServerError,
  PermissionError,
  NotFoundError,
  ValidationError,
  Notification,
  ErrorBoundary,

  // Hooks
  useErrorHandler,
  useNotifications
};

export default ErrorHandling;
