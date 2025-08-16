import React from 'react';
import { BarChart3, Code, Globe, Loader2, Shield, Zap } from 'lucide-react';

// CSS样式已迁移到组件内部，不再需要外部CSS文件

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  type?: 'default' | 'stress' | 'content' | 'api' | 'security' | 'compatibility' | 'analytics';
  progress?: number;
  showProgress?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text = '加载中...',
  type = 'default',
  progress,
  showProgress = false,
  className = ''
}) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  
  const [state, setState] = useState({
    value: defaultValue,
    loading: false,
    error: null,
    touched: false,
    focused: false
  });
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const containerSizeClasses = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const getIcon = () => {
    const iconClass = sizeClasses[size];

    switch (type) {
      case 'stress':
        return <Zap className={`${iconClass} text-yellow-500 animate-pulse`} />;
      case 'content':
        return <BarChart3 className={`${iconClass} text-blue-500 animate-pulse`} />;
      case 'api':
        return <Code className={`${iconClass} text-green-500 animate-pulse`} />;
      case 'security':
        return <Shield className={`${iconClass} text-red-500 animate-pulse`} />;
      case 'compatibility':
        return <Globe className={`${iconClass} text-purple-500 animate-pulse`} />;
      case 'analytics':
        return <BarChart3 className={`${iconClass} text-indigo-500 animate-pulse`} />;
      default:
        return <Loader2 className={`${iconClass} text-blue-500 animate-spin`} />;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'stress':
        return 'border-yellow-200 bg-yellow-50';
      case 'content':
        return 'border-blue-200 bg-blue-50';
      case 'api':
        return 'border-green-200 bg-green-50';
      case 'security':
        return 'border-red-200 bg-red-50';
      case 'compatibility':
        return 'border-purple-200 bg-purple-50';
      case 'analytics':
        return 'border-indigo-200 bg-indigo-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getProgressColor = () => {
    switch (type) {
      case 'stress':
        return 'bg-yellow-500';
      case 'content':
        return 'bg-blue-500';
      case 'api':
        return 'bg-green-500';
      case 'security':
        return 'bg-red-500';
      case 'compatibility':
        return 'bg-purple-500';
      case 'analytics':
        return 'bg-indigo-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerSizeClasses[size]} ${className}`}>
      <div className={`rounded-lg border-2 border-dashed ${getTypeColor()} p-6 text-center`}>
        <div className="flex flex-col items-center space-y-4">
          {/* 图标 */}
          <div className="flex items-center justify-center">
            {getIcon()}
          </div>

          {/* 文本 */}
          <div className={`font-medium text-gray-700 ${textSizeClasses[size]}`}>
            {text}
          </div>

          {/* 进度条 */}
          {showProgress && typeof progress === 'number' && (
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>进度</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()} ${progress <= 0 ? 'w-0' :
                    progress <= 5 ? 'w-5' :
                      progress <= 10 ? 'w-10' :
                        progress <= 25 ? 'w-25' :
                          progress <= 50 ? 'w-50' :
                            progress <= 75 ? 'w-75' :
                              progress <= 90 ? 'w-90' : 'w-100'
                    }`}
                />
              </div>
            </div>
          )}

          {/* 动画点 */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce loading-dot loading-dot-1" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce loading-dot loading-dot-2" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce loading-dot loading-dot-3" />
          </div>
        </div>
      </div>
    </div>
  );
};

// 简化版本的加载组件
export const SimpleLoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500 ${className}`} />
  );
};

// 内联加载组件
export const InlineLoadingSpinner: React.FC<{ text?: string; className?: string }> = ({
  text = '加载中',
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
};

export default LoadingSpinner;
