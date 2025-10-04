/**
 * 增强的错误边界组件
 * @description 提供全面的错误捕获、报告和恢复机制
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp, Copy, CheckCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'app';
  showDetails?: boolean;
  enableRecovery?: boolean;
  reportToSentry?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  showErrorDetails: boolean;
  copied: boolean;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showErrorDetails: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, reportToSentry } = this.props;
    
    // 记录错误到控制台
    console.error('错误边界捕获到错误:', error, errorInfo);
    
    // 更新错误计数
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // 调用错误回调
    if (onError) {
      onError(error, errorInfo);
    }

    // 报告到Sentry（如果启用）
    if (reportToSentry && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo?.componentStack
          }
        }
      });
    }

    // 存储错误到localStorage供分析
    this.storeErrorLog(error, errorInfo);
  }

  storeErrorLog = (error: Error, errorInfo: ErrorInfo): void => {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error?.message,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        level: this.props.level || 'component',
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // 获取现有错误日志
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      
      // 限制存储的错误日志数量
      const updatedLogs = [errorLog, ...existingLogs].slice(0, 10);
      
      localStorage.setItem('errorLogs', JSON.stringify(updatedLogs));
    } catch (e) {
      console.warn('无法存储错误日志:', e);
    }
  };

  handleRetry = (): void => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showErrorDetails: false
      });
    } else {
      alert(`已尝试 ${this.maxRetries} 次，请刷新页面或联系技术支持。`);
    }
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleRefreshPage = (): void => {
    window.location.reload();
  };

  toggleErrorDetails = (): void => {
    this.setState(prevState => ({
      showErrorDetails: !prevState.showErrorDetails
    }));
  };

  copyErrorDetails = (): void => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorDetails = `
错误信息：${error?.message}
错误时间：${new Date().toISOString()}
页面URL：${window.location.href}
用户代理：${navigator.userAgent}
错误堆栈：
${error?.stack}
组件堆栈：
${errorInfo?.componentStack || '无'}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => {
        this.setState({ copied: false });
      }, 2000);
    }).catch(err => {
      console.error('复制失败:', err);
    });
  };

  renderDefaultFallback = (): ReactNode => {
    const { error, errorInfo, showErrorDetails, copied } = this.state;
    const { level = 'component', enableRecovery = true, showDetails = true } = this.props;

    // 根据错误级别确定样式
    const isAppLevel = level === 'app';
    const isPageLevel = level === 'page';
    
    const containerClass = isAppLevel 
      ? 'min-h-screen' 
      : isPageLevel 
        ? 'min-h-[600px]' 
        : 'min-h-[400px]';

    return (
      <div className={`${containerClass} flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4`}>
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* 错误头部 */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {isAppLevel ? '应用程序错误' : isPageLevel ? '页面加载失败' : '组件渲染错误'}
                  </h2>
                  <p className="text-red-100 mt-1">
                    很抱歉，出现了意外错误
                  </p>
                </div>
              </div>
            </div>

            {/* 错误内容 */}
            <div className="p-6">
              {/* 错误摘要 */}
              <div className="mb-6">
                <div className="flex items-start gap-3">
                  <Bug className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      错误信息
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 font-mono text-sm break-all">
                      {error?.message || '未知错误'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 详细信息（可折叠） */}
              {showDetails && error && (
                <div className="mb-6">
                  <button
                    onClick={this.toggleErrorDetails}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                  >
                    {showErrorDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showErrorDetails ? '隐藏' : '显示'}详细信息
                  </button>
                  
                  {showErrorDetails && (
                    <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          错误堆栈
                        </span>
                        <button
                          onClick={this.copyErrorDetails}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              复制详情
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap break-words">
                        {error?.stack}
                      </pre>
                      {errorInfo?.componentStack && (
                        <>
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-4 mb-2">
                            组件堆栈
                          </div>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap break-words">
                            {errorInfo?.componentStack}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-3">
                {enableRecovery && (
                  <button
                    onClick={this.handleRetry}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重试
                    {this.retryCount > 0 && (
                      <span className="text-xs opacity-75">
                        ({this.retryCount}/{this.maxRetries})
                      </span>
                    )}
                  </button>
                )}
                
                {isPageLevel && (
                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    返回首页
                  </button>
                )}
                
                <button
                  onClick={this.handleRefreshPage}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  刷新页面
                </button>
              </div>

              {/* 帮助信息 */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>需要帮助？</strong>
                  <br />
                  如果问题持续存在，请联系技术支持并提供错误详情。
                  <br />
                  错误ID: <code className="font-mono text-xs">{this.generateErrorId()}</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  generateErrorId = (): string => {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // 使用自定义fallback或默认fallback
      if (fallback) {
        return fallback(error, errorInfo!, this.handleRetry);
      }
      return this.renderDefaultFallback();
    }

    return children;
  }
}

// HOC包装函数
export function withEnhancedErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withEnhancedErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// 声明全局Sentry类型（如果使用Sentry）
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
    };
  }
}

export default EnhancedErrorBoundary;
