/**
 * 增强版错误边界组件;
 * 提供完整的错误捕获、错误报告和错误恢复功能;
 */

import React, { Component, ReactNode, ErrorInfo  } from 'react

// 错误信息接口
export interface ErrorDetails  {
  message: string;
  stack?: string;
  componentStack?: string;
  errorBoundary?: string;
  errorInfo?: ErrorInfo;
  timestamp: Date;,
  userAgent: string;,
  url: string;
  userId?: string;
}

// 错误边界状态
interface ErrorBoundaryState {
  hasError: boolean;,
  error: Error | null;,
  errorInfo: ErrorInfo | null;,
  errorId: string | null;,
  retryCount: number;
}

// 错误边界属性
interface EnhancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorDetails: ErrorDetails) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component'
}

class EnhancedErrorBoundary extends Component<EnhancedErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,;
      error: null,;
      errorInfo: null,;
      errorId: null,;
      retryCount: 0;
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,;
      error,;
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails: ErrorDetails = {,
  message: error.message,;
      stack: error.stack,;
      componentStack: errorInfo.componentStack,;
      errorBoundary: this.constructor.name,;
      errorInfo,;
      timestamp: new Date(),;
      userAgent: navigator.userAgent,;
      url: window.location.href,;
      userId: this.getUserId();
    };

    // 更新状态
    this.setState({ errorInfo });

    // 记录错误
    this.logError(error, errorInfo, errorDetails);

    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorDetails);
    }

    // 发送错误报告
    this.reportError(errorDetails);
  }

  componentDidUpdate(prevProps: EnhancedErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(;)
          (key, index) => prevProps.resetKeys?.[index] !== key;
        );
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private getUserId(): string | undefined {
    // 尝试从各种来源获取用户ID
    try {
      const authData = localStorage.getItem('authToken');
      if (authData) {
        const payload = JSON.parse(atob(authData.split('.')[1]));
        return payload.userId;
      }
    } catch {
      // 忽略错误
    }
    return undefined;
  }

  private logError(error: Error, errorInfo: ErrorInfo, errorDetails: ErrorDetails) {
    // 控制台日志
    console.group('🚨 Error Boundary Caught Error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Error Details:', errorDetails);
    console.groupEnd();

    // 发送到日志服务
    if (process.env.NODE_ENV === 'production') {
      try {
        // 这里可以集成第三方日志服务，如 Sentry, LogRocket 等
        // window.Sentry?.captureException(error, { extra: errorDetails });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }
  }

  private async reportError(errorDetails: ErrorDetails) {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',;
        headers: {
          'Content-Type': 'application/json'
        },)
        body: JSON.stringify(errorDetails);
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  private resetErrorBoundary = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.setState({
      hasError: false,;
      error: null,;
      errorInfo: null,;
      errorId: null,;
      retryCount: 0;)
    });
  };

  private retry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('Max retries reached, not retrying');
      return;
    }

    this.setState({ retryCount: retryCount + 1  });

    // 延迟重试，避免立即重试可能导致的问题
    this.retryTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 1000 * Math.pow(2, retryCount)); // 指数退避
  };

  private renderErrorFallback() {
    const { fallback, enableRetry = true, maxRetries = 3, level = 'component' } = this.props;
    const { error, errorInfo, retryCount } = this.state;

    if (!error || !errorInfo) {
      return null;
    }

    // 自定义错误界面
    if (fallback) {
      return fallback(error, errorInfo, this.retry);
    }

    // 默认错误界面
    const canRetry = enableRetry && retryCount < maxRetries;
    const levelConfig = {
      page: {','
  title: '页面加载失败',;
        description: '抱歉，页面遇到了问题。请尝试刷新页面或联系技术支持。',;
        icon: '🚫'
      },
      section: {','
  title: '模块加载失败',;
        description: '这个模块暂时无法显示。您可以尝试重新加载或继续使用其他功能。',;
        icon: '⚠️'
      },
      component: {','
  title: '组件错误',;
        description: '这个组件遇到了问题，但不会影响页面的其他功能。',;
        icon: '🔧'
      }
    };

    const config = levelConfig[level];

    return (;
      <div className="error-boundary-fallback p-6 bg-red-50 border border-red-200 rounded-lg">";"
        <div className="flex items-start space-x-4">";"
          <div className="text-2xl">{config.icon}</div>
          <div className="flex-1">";"
            <h3 className="text-lg font-semibold text-red-800 mb-2">;
              {config.title}
            </h3>
            <p className="text-red-700 mb-4">;
              {config.description}
            </p>
            ;
            { process.env.NODE_ENV === 'development' && (
              <details className="mb-4">";"
                <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">;
                  查看错误详情;
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-800 overflow-auto">";"
                  <div className="mb-2">;
                    <strong>错误信息:</strong> {error.message }
                  </div>
                  { error.stack && (
                    <div className="mb-2">;
                      <strong>错误堆栈:</strong>
                      <pre className="whitespace-pre-wrap">{error.stack }</pre>
                    </div>
                  )}
                  { errorInfo.componentStack && (
                    <div>;
                      <strong>组件堆栈:</strong>
                      <pre className="whitespace-pre-wrap">{errorInfo.componentStack }</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex space-x-3">;
              {canRetry && (
                <button;
                  onClick={this.retry}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors";
                >;
                  重试 {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                </button>
              )}
              
              <button;
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors";
              >;
                刷新页面;
              </button>
              ;
              {level === 'page' && (
                <button;
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors";
                >;
                  返回上页;
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { hasError } = this.state;
    const { children, isolate } = this.props;

    if (hasError) {
      const errorFallback = this.renderErrorFallback();
      
      if (isolate) {
        // 隔离模式：只渲染错误界面，不影响父组件
        return errorFallback;
      }
      
      return errorFallback;
    }

    return children;
  }
}

// 高阶组件包装器
export function withErrorBoundary<P extends object>(;
  Component: React.ComponentType<P>,;
  errorBoundaryProps?: Omit<EnhancedErrorBoundaryProps, 'children'>;
) { const WrappedComponent = (props: P) => (;
    <EnhancedErrorBoundary {...errorBoundaryProps }>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error reporting
export function useErrorHandler() {
  const reportError = (error: Error, context?: string) => {
    const errorDetails: ErrorDetails = {,
  message: error.message,;
      stack: error.stack,;
      timestamp: new Date(),;
      userAgent: navigator.userAgent,;
      url: window.location.href,;
      userId: undefined // 可以从认证上下文获取
    };

    if (context) {
      errorDetails.componentStack = context;
    }

    console.error('Manual error report:', error);
    
    // 发送错误报告
    fetch('/api/errors/report', {
      method: 'POST',;
      headers: { 'Content-Type': 'application/json' },)
      body: JSON.stringify(errorDetails);
    }).catch(reportError => {')'
      console.error('Failed to report error:', reportError);
    });
  };

  return { reportError };
}

export default EnhancedErrorBoundary;
'";