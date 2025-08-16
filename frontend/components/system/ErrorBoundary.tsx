/**
 * 增强的错误边界组件
 * 与后端错误处理系统集成，提供更好的错误处理和用户体验
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {enhancedConfigManager} from '../../config/ConfigManager';
import {performanceMonitor} from '../../utils/performanceMonitor';

/**
 * 错误信息接口
 */
interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  errorBoundary?: string;
  errorInfo?: ErrorInfo;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
}

/**
 * 错误边界状态
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
  isReporting: boolean;
}

/**
 * 错误边界属性
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorId: string, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

/**
 * 增强的错误边界组件
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: number[] = [];
  private errorReportingEnabled: boolean;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
      isReporting: false
    };

    this.errorReportingEnabled = enhancedConfigManager.get('monitoring.enableErrorTracking');
  }

  /**
   * 捕获错误
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId
    };
  }

  /**
   * 组件捕获错误后调用
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录性能指标
    performanceMonitor.recordMetric('error-boundary-triggered', 1, 'count');

    // 创建错误详情
    const errorDetails = this.createErrorDetails(error, errorInfo);

    // 报告错误
    if (this.errorReportingEnabled) {
      this.reportError(errorDetails);
    }

    // 调用外部错误处理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 记录到控制台
    console.error('Error Boundary caught an error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
  }

  /**
   * 创建错误详情
   */
  private createErrorDetails(error: Error, errorInfo: ErrorInfo): ErrorDetails {
    return {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      errorInfo,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getUserId(),
      sessionId: this.getSessionId()
    };
  }

  /**
   * 获取用户ID
   */
  private getUserId(): string | undefined {
    try {
      const authData = localStorage.getItem('auth-data');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id;
      }
    } catch (error) {
      // 忽略错误
    }
    return undefined;
  }

  /**
   * 获取会话ID
   */
  private getSessionId(): string | undefined {
    try {
      return sessionStorage.getItem('session-id') || undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 报告错误到后端
   */
  private async reportError(errorDetails: ErrorDetails): Promise<void> {
    if (this.state.isReporting) return;

    this.setState({ isReporting: true });

    try {
      const response = await fetch('/api/error-management/frontend-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'FRONTEND_ERROR',
          severity: this.getErrorSeverity(errorDetails.message),
          details: errorDetails,
          context: {
            component: 'ErrorBoundary',
            level: this.props.level || 'component',
            retryCount: this.state.retryCount
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Error reported successfully:', result.data?.errorId);
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    } finally {
      this.setState({ isReporting: false });
    }
  }

  /**
   * 获取错误严重程度
   */
  private getErrorSeverity(message: string): string {
    // 根据错误消息判断严重程度
    if (message.includes('ChunkLoadError') || message.includes('Loading chunk')) {
      return 'medium'; // 代码分割加载错误
    }

    if (message.includes('Network Error') || message.includes('fetch')) {
      return 'medium'; // 网络错误
    }

    if (message.includes('Cannot read property') || message.includes('undefined')) {
      return 'high'; // 运行时错误
    }

    return 'high'; // 默认高严重程度
  }

  /**
   * 重试渲染
   */
  private handleRetry = (): void => {
    const { maxRetries = 3 } = this.props;

    if (this.state.retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    // 清除之前的超时
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts = [];

    // 延迟重试，避免立即失败
    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);

    const timeoutId = window.setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
        isReporting: false
      }));

      // 记录重试指标
      performanceMonitor.recordMetric('error-boundary-retry', this.state.retryCount + 1, 'count');
    }, retryDelay);

    this.retryTimeouts.push(timeoutId);
  };

  /**
   * 刷新页面
   */
  private handleRefresh = (): void => {
    window.location.reload();
  };

  /**
   * 返回上一页
   */
  private handleGoBack = (): void => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  /**
   * 组件卸载时清理
   */
  componentWillUnmount(): void {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  /**
   * 渲染错误UI
   */
  private renderErrorUI(): ReactNode {
    const { error, errorId, retryCount } = this.state;
    const { fallback, enableRetry = true, maxRetries = 3, level = 'component' } = this.props;

    // 使用自定义错误UI
    if (fallback && error && errorId) {
      return fallback(error, errorId, this.handleRetry);
    }

    // 默认错误UI
    return (
      <div className="error-boundary-container">
        <div className="error-boundary-content">
          {/* 错误图标 */}
          <div className="error-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          {/* 错误标题 */}
          <h2 className="error-title">
            {level === 'page' ? '页面加载失败' : '组件渲染失败'}
          </h2>

          {/* 错误描述 */}
          <p className="error-description">
            抱歉，{level === 'page' ? '页面' : '此部分内容'}暂时无法正常显示。
            {errorId && (
              <span className="error-id">错误ID: {errorId}</span>
            )}
          </p>

          {/* 错误详情（开发环境） */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="error-details">
              <summary>错误详情</summary>
              <pre className="error-stack">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          {/* 操作按钮 */}
          <div className="error-actions">
            {enableRetry && retryCount < maxRetries && (
              <button
                onClick={this.handleRetry}
                className="retry-button"
                disabled={this.state.isReporting}
              >
                {this.state.isReporting ? '报告中...' : '重试'}
              </button>
            )}

            <button onClick={this.handleRefresh} className="refresh-button">
              刷新页面
            </button>

            {level === 'page' && (
              <button onClick={this.handleGoBack} className="back-button">
                返回上一页
              </button>
            )}
          </div>

          {/* 重试信息 */}
          {retryCount > 0 && (
            <p className="retry-info">
              已重试 {retryCount} 次
              {retryCount >= maxRetries && ' (已达到最大重试次数)'}
            </p>
          )}
        </div>

        {/* 样式 */}
        <style jsx>{`
          .error-boundary-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: ${level === 'page' ? '100vh' : '200px'};
            padding: 20px;
            background-color: var(--bg-color, #f8f9fa);
          }
          
          .error-boundary-content {
            text-align: center;
            max-width: 500px;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .error-icon {
            color: #dc3545;
            margin-bottom: 20px;
          }
          
          .error-title {
            font-size: 24px;
            font-weight: 600;
            color: #333;
            margin-bottom: 16px;
          }
          
          .error-description {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.5;
          }
          
          .error-id {
            display: block;
            font-size: 12px;
            color: #999;
            margin-top: 8px;
            font-family: monospace;
          }
          
          .error-details {
            text-align: left;
            margin: 20px 0;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 4px;
          }
          
          .error-stack {
            font-size: 12px;
            color: #666;
            white-space: pre-wrap;
            overflow-x: auto;
          }
          
          .error-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
          }
          
          .retry-button, .refresh-button, .back-button {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .retry-button {
            background: #007bff;
            color: white;
          }
          
          .retry-button:hover:not(:disabled) {
            background: #0056b3;
          }
          
          .retry-button:disabled {
            background: #6c757d;
            cursor: not-allowed;
          }
          
          .refresh-button {
            background: #28a745;
            color: white;
          }
          
          .refresh-button:hover {
            background: #1e7e34;
          }
          
          .back-button {
            background: #6c757d;
            color: white;
          }
          
          .back-button:hover {
            background: #545b62;
          }
          
          .retry-info {
            margin-top: 16px;
            font-size: 14px;
            color: #666;
          }
        `}</style>
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

/**
 * 错误边界HOC
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default ErrorBoundary;
