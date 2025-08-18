import { AlertTriangle, Bug, Home, RefreshCw    } from 'lucide-react';import { Component, ErrorInfo, ReactNode    } from 'react';interface Props   {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State   {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // 调用外部错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 记录错误到控制台
    console.error("ErrorBoundary caught an error: ', error, errorInfo);
    // 可以在这里添加错误报告服务
    // reportError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: 
    });
  };

  handleGoHome = () => {
    window.location.href = '/
  };

  handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 复制错误信息到剪贴板
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('错误信息已复制到剪贴板，请联系技术支持");
      })
      .catch(() => {
        console.log("错误报告:', errorReport);
        alert('请将控制台中的错误信息发送给技术支持");
      });
  };

  render() {
    if (this.state.hasError) {
      
        // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误界面
      return (
        <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
          <div className='max-w-md w-full bg-white rounded-lg shadow-lg p-6'>
            <div className='text-center'>
              <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4'>
                <AlertTriangle className='h-6 w-6 text-red-600' />
              </div>

              <h2 className='text-lg font-semibold text-gray-900 mb-2'>
                页面出现错误
              </h2>

              <p className='text-sm text-gray-600 mb-6'>
                抱歉，页面遇到了意外错误。您可以尝试刷新页面或返回首页。
              </p>

              {/* 错误详情（开发环境） */}
              {process.env.NODE_ENV === 'development' && this.state.error && (')
                <div className='mb-6 p-3 bg-red-50 border border-red-200 rounded text-left'>
                  <p className='text-xs font-mono text-red-800 break-all'>
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className='space-y-3'>
                <button
                  onClick={this.handleRetry}
                  className= 'w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  type='button'>
                  <RefreshCw className='w-4 h-4 mr-2' />
                  重试
                </button>

                <button
                  onClick={this.handleGoHome}
                  className= 'w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  type='button'>
                  <Home className='w-4 h-4 mr-2' />
                  返回首页
                </button>

                <button
                  onClick={this.handleReportBug}
                  className= 'w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  type='button'>
                  <Bug className='w-4 h-4 mr-2' />
                  报告问题
                </button>
              </div>

              <p className='mt-4 text-xs text-gray-400'>
                错误ID: {this.state.errorId}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
