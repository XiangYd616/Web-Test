/**
 * ErrorDisplay 组件
 * 统一的错误显示组件
 * 
 * 功能:
 * - 显示错误信息
 * - 显示错误堆栈（开发模式）
 * - 提供重试操作
 * - 支持不同错误类型的样式
 */

import { AlertCircle, RefreshCw, XCircle, AlertTriangle, Info } from 'lucide-react';
import React from 'react';

export interface ErrorDisplayProps {
  error?: Error | string | null;
  title?: string;
  message?: string;
  type?: 'error' | 'warning' | 'info';
  showStack?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  fullPage?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title,
  message,
  type = 'error',
  showStack = false,
  onRetry,
  onDismiss,
  className = '',
  fullPage = false,
}) => {
  // 解析错误信息
  const errorMessage = React.useMemo(() => {
    if (message) return message;
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return '发生了未知错误';
  }, [error, message]);

  const errorStack = React.useMemo(() => {
    if (!showStack) return null;
    if (error instanceof Error) return error.stack;
    return null;
  }, [error, showStack]);

  // 获取图标
  const Icon = React.useMemo(() => {
    switch (type) {
      case 'error':
        return XCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return AlertCircle;
    }
  }, [type]);

  // 获取颜色类
  const colorClasses = React.useMemo(() => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-200',
          icon: 'text-red-600 dark:text-red-400',
          button: 'bg-red-600 hover:bg-red-700 text-white',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: 'text-yellow-600 dark:text-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-200',
          icon: 'text-blue-600 dark:text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          icon: 'text-gray-600 dark:text-gray-400',
          button: 'bg-gray-600 hover:bg-gray-700 text-white',
        };
    }
  }, [type]);

  const containerClasses = fullPage
    ? 'min-h-screen flex items-center justify-center p-4'
    : '';

  return (
    <div className={containerClasses}>
      <div
        className={`
          ${colorClasses.bg}
          ${colorClasses.border}
          border rounded-lg p-6
          ${className}
          ${fullPage ? 'max-w-2xl w-full' : ''}
        `}
      >
        {/* 头部 */}
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 ${colorClasses.icon}`}>
            <Icon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            {/* 标题 */}
            {title && (
              <h3 className={`text-lg font-semibold mb-2 ${colorClasses.text}`}>
                {title}
              </h3>
            )}

            {/* 错误信息 */}
            <div className={`text-sm ${colorClasses.text} space-y-2`}>
              <p className="whitespace-pre-wrap">{errorMessage}</p>

              {/* 错误堆栈（开发模式） */}
              {errorStack && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-medium mb-2">
                    显示详细信息
                  </summary>
                  <pre className="text-xs overflow-auto p-3 bg-black/5 dark:bg-black/20 rounded border border-current/20">
                    {errorStack}
                  </pre>
                </details>
              )}
            </div>

            {/* 操作按钮 */}
            {(onRetry || onDismiss) && (
              <div className="mt-4 flex items-center gap-3">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg
                      ${colorClasses.button}
                      transition-colors font-medium text-sm
                    `}
                  >
                    <RefreshCw className="w-4 h-4" />
                    重试
                  </button>
                )}

                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    关闭
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;

/**
 * 使用示例:
 * 
 * // 基本使用
 * <ErrorDisplay error="发生了错误" />
 * 
 * // 带 Error 对象
 * <ErrorDisplay 
 *   error={new Error("网络请求失败")} 
 *   showStack={process.env.NODE_ENV === 'development'}
 * />
 * 
 * // 带标题和重试
 * <ErrorDisplay
 *   title="加载失败"
 *   message="无法加载数据，请检查网络连接"
 *   type="warning"
 *   onRetry={() => fetchData()}
 *   onDismiss={() => setError(null)}
 * />
 * 
 * // 全屏显示
 * <ErrorDisplay
 *   title="应用错误"
 *   error={error}
 *   fullPage
 *   onRetry={() => window.location.reload()}
 * />
 */

