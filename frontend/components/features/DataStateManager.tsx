/**
 * 统一数据加载状态管理组件
 * 标准化loading、error、success、empty状态的显示
 * 版本: v2.0.0
 */

import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import type { LoadingState } from '..\..\services\dataProcessor.ts';

// ==================== 类型定义 ====================

export interface DataStateManagerProps {
  // 状态
  state: LoadingState;
  error?: string | null;
  data?: any;
  isEmpty?: boolean;
  
  // 自定义渲染
  renderLoading?: () => React.ReactNode;
  renderError?: (error: string, retry?: () => void) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderSuccess?: (data: any) => React.ReactNode;
  
  // 操作
  onRetry?: () => void;
  onRefresh?: () => void;
  
  // 配置
  showRetryButton?: boolean;
  showRefreshButton?: boolean;
  loadingText?: string;
  emptyText?: string;
  
  // 样式
  className?: string;
  loadingClassName?: string;
  errorClassName?: string;
  emptyClassName?: string;
  
  // 子组件
  children?: React.ReactNode;
}

// ==================== 默认渲染组件 ====================

const DefaultLoadingComponent: React.FC<{ text?: string; className?: string }> = ({ 
  text = '加载中...', 
  className 
}) => (
  <div className={cn('flex flex-col items-center justify-center py-12', className)}>
    <div className="relative">
      {/* 主加载动画 */}
      <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* 脉冲效果 */}
      <div className="absolute inset-0 w-12 h-12 border-4 border-blue-400 rounded-full animate-ping opacity-20"></div>
    </div>
    
    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 animate-pulse">
      {text}
    </p>
  </div>
);

const DefaultErrorComponent: React.FC<{ 
  error: string; 
  onRetry?: () => void; 
  showRetryButton?: boolean;
  className?: string;
}> = ({ 
  error, 
  onRetry, 
  showRetryButton = true, 
  className 
}) => (
  <div className={cn('flex flex-col items-center justify-center py-12', className)}>
    <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
      <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
    </div>
    
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
      加载失败
    </h3>
    
    <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
      {error}
    </p>
    
    {showRetryButton && onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        <ArrowPathIcon className="w-4 h-4" />
        重试
      </button>
    )}
  </div>
);

const DefaultEmptyComponent: React.FC<{ text?: string; className?: string }> = ({ 
  text = '暂无数据', 
  className 
}) => (
  <div className={cn('flex flex-col items-center justify-center py-12', className)}>
    <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
      <svg 
        className="w-8 h-8 text-gray-400 dark:text-gray-600" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={1.5} 
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
        />
      </svg>
    </div>
    
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
      {text}
    </h3>
    
    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
      当前没有可显示的内容
    </p>
  </div>
);

// ==================== 主组件 ====================

export const DataStateManager: React.FC<DataStateManagerProps> = ({
  state,
  error,
  data,
  isEmpty = false,
  renderLoading,
  renderError,
  renderEmpty,
  renderSuccess,
  onRetry,
  onRefresh,
  showRetryButton = true,
  showRefreshButton = false,
  loadingText = '加载中...',
  emptyText = '暂无数据',
  className,
  loadingClassName,
  errorClassName,
  emptyClassName,
  children
}) => {
  // 根据状态渲染不同内容
  const renderContent = () => {
    switch (state) {
      case 'loading':
        return renderLoading ? 
          renderLoading() : 
          <DefaultLoadingComponent text={loadingText} className={loadingClassName} />;
      
      case 'error':
        return renderError ? 
          renderError(error || '未知错误', onRetry) : 
          <DefaultErrorComponent 
            error={error || '未知错误'} 
            onRetry={onRetry}
            showRetryButton={showRetryButton}
            className={errorClassName}
          />;
      
      case 'success':
        // 检查是否为空数据
        if (isEmpty || (Array.isArray(data) && data.length === 0) || (!data && data !== 0)) {
          return renderEmpty ? 
            renderEmpty() : 
            <DefaultEmptyComponent text={emptyText} className={emptyClassName} />;
        }
        
        // 渲染成功状态
        return renderSuccess ? renderSuccess(data) : children;
      
      case 'refreshing':
        // 刷新状态下显示原有内容，但可以添加刷新指示器
        return (
          <div className="relative">
            {renderSuccess ? renderSuccess(data) : children}
            
            {/* 刷新指示器 */}
            <div className="absolute top-2 right-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                <ArrowPathIcon className="w-3 h-3 animate-spin" />
                刷新中
              </div>
            </div>
          </div>
        );
      
      case 'idle':
      default:
        return children;
    }
  };

  return (
    <div className={cn('data-state-manager', className)}>
      {/* 刷新按钮 */}
      {showRefreshButton && onRefresh && state === 'success' && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onRefresh}
            disabled={state === 'refreshing'}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={cn('w-4 h-4', state === 'refreshing' && 'animate-spin')} />
            刷新
          </button>
        </div>
      )}
      
      {/* 主内容 */}
      {renderContent()}
    </div>
  );
};

// ==================== Hook封装 ====================

export interface UseDataStateManagerOptions {
  loadingText?: string;
  emptyText?: string;
  showRetryButton?: boolean;
  showRefreshButton?: boolean;
  autoRetry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

export function useDataStateManager(options: UseDataStateManagerOptions = {}) {
  const {
    loadingText = '加载中...',
    emptyText = '暂无数据',
    showRetryButton = true,
    showRefreshButton = false,
    autoRetry = false,
    retryDelay = 3000,
    maxRetries = 3
  } = options;

  const [retryCount, setRetryCount] = React.useState(0);
  const retryTimeoutRef = React.useRef<NodeJS.Timeout>();

  // 自动重试逻辑
  const handleAutoRetry = React.useCallback((retryFn: () => void) => {
    if (!autoRetry || retryCount >= maxRetries) return;

    retryTimeoutRef.current = setTimeout(() => {
      setRetryCount(prev => prev + 1);
      retryFn();
    }, retryDelay);
  }, [autoRetry, retryCount, maxRetries, retryDelay]);

  // 重置重试计数
  const resetRetryCount = React.useCallback(() => {
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    retryCount,
    resetRetryCount,
    handleAutoRetry,
    defaultProps: {
      loadingText,
      emptyText,
      showRetryButton,
      showRefreshButton
    }
  };
}

// ==================== 高阶组件 ====================

export function withDataStateManager<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: UseDataStateManagerOptions = {}
) {
  return React.forwardRef<any, P & Partial<DataStateManagerProps>>((props, ref) => {
    const { defaultProps } = useDataStateManager(options);
    
    return (
      <DataStateManager {...defaultProps} {...props}>
        <WrappedComponent {...(props as P)} ref={ref} />
      </DataStateManager>
    );
  });
}

export default DataStateManager;
