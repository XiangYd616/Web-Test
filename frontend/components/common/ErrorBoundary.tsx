/**
 * 增强的错误边界组件
 * 提供组件级错误处理、错误报告、用户友好的错误展示
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  showErrorDetails?: boolean;
  level?: 'page' | 'component' | 'widget';
}

/**
 * 错误边界组件
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新状态以显示错误UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    this.setState({
      errorInfo
    });

    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 发送错误报告
    this.reportError(error, errorInfo);
  }

  /**
   * 发送错误报告
   */
  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        level: this.props.level || 'component',
        retryCount: this.state.retryCount
      };

      // 发送到错误监控服务
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport)
      }).catch(err => {
        console.error('Failed to report error:', err);
      });

      // 本地存储错误信息
      const storedErrors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      storedErrors.push(errorReport);
      
      // 只保留最近50个错误
      if (storedErrors.length > 50) {
        storedErrors.splice(0, storedErrors.length - 50);
      }
      
      localStorage.setItem('errorReports', JSON.stringify(storedErrors));

    } catch (reportError) {
      console.error('Error reporting failed:', reportError);
    }
  };

  /**
   * 重试处理
   */
  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  /**
   * 自动重试
   */
  private autoRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, 2000 * (this.state.retryCount + 1)); // 递增延迟
    }
  };

  /**
   * 重置错误状态
   */
  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    });
  };

  /**
   * 返回首页
   */
  private goHome = () => {
    window.location.href = '/';
  };

  /**
   * 复制错误信息
   */
  private copyErrorInfo = () => {
    const { error, errorInfo, errorId } = this.state;
    
    const errorText = `
错误ID: ${errorId}
错误信息: ${error?.message}
发生时间: ${new Date().toLocaleString()}
页面地址: ${window.location.href}
组件堆栈: ${errorInfo?.componentStack}
错误堆栈: ${error?.stack}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      alert('错误信息已复制到剪贴板');
    }).catch(() => {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('错误信息已复制到剪贴板');
    });
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    const { hasError, error, errorInfo, errorId, retryCount } = this.state;
    const { 
      children, 
      fallback, 
      enableRetry = true, 
      maxRetries = 3, 
      showErrorDetails = false,
      level = 'component'
    } = this.props;

    if (hasError) {
      
        // 如果提供了自定义fallback，使用它
      if (fallback) {
        return fallback;
      }

      // 根据级别显示不同的错误UI
      if (level === 'page') {
        
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">页面加载失败</h1>
              <p className="text-gray-400 mb-6">
                抱歉，页面遇到了一些问题。我们已经记录了这个错误，请稍后再试。
              </p>
              
              <div className="space-y-3">
                {enableRetry && retryCount < maxRetries && (
                  <button
                    onClick={this.handleRetry
      }
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重试 ({maxRetries - retryCount} 次机会)
                  </button>
                )}
                
                <button
                  onClick={this.goHome}
                  className="w-full bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  返回首页
                </button>
              </div>

              {showErrorDetails && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-gray-400 hover:text-white">
                    错误详情
                  </summary>
                  <div className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-300 font-mono">
                    <p><strong>错误ID:</strong> {errorId}</p>
                    <p><strong>错误信息:</strong> {error?.message}</p>
                    <p><strong>重试次数:</strong> {retryCount}</p>
                    <button
                      onClick={this.copyErrorInfo}
                      className="mt-2 text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Bug className="w-3 h-3" />
                      复制错误信息
                    </button>
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      }

      // 组件级错误UI
      return (
        <div className="bg-gray-800 border border-red-500/20 rounded-lg p-4 m-2">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">组件加载失败</span>
          </div>
          
          <p className="text-gray-400 text-sm mb-3">
            这个组件遇到了问题，但不会影响页面的其他功能。
          </p>
          
          <div className="flex gap-2">
            {enableRetry && retryCount < maxRetries && (
              <button
                onClick={this.handleRetry}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                重试
              </button>
            )}
            
            <button
              onClick={this.resetError}
              className="text-xs bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600"
            >
              隐藏
            </button>
          </div>

          {showErrorDetails && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-gray-400 hover:text-white">
                技术详情
              </summary>
              <div className="mt-1 p-2 bg-gray-900 rounded text-xs text-gray-300 font-mono">
                <p>错误: {error?.message}</p>
                <p>ID: {errorId}</p>
              </div>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}

/**
 * 高阶组件：为组件添加错误边界
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * Hook：在函数组件中使用错误边界
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

export default ErrorBoundary;
