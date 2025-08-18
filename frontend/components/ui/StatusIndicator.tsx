import React from 'react';import { AlertTriangle, CheckCircle, Clock, Loader, XCircle    } from 'lucide-react';import { cn    } from '../../utils/cn';export type StatusType   = 'success' | 'error' | 'warning' | 'pending' | 'loading' | 'info';interface StatusIndicatorProps   {
  /** 状态类型 */
  status: StatusType;
  /** 状态文本 */
  text?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否显示为圆点 */
  dot?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  text,
  size = 'md',
  showIcon = true,
  className,
  dot = false
}) => {
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ['']
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
  // 状态配置
  const statusConfig = {
    success: {
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      dotColor: 'bg-green-500'
    },
    error: {
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      dotColor: 'bg-red-500'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      dotColor: 'bg-yellow-500'
    },
    pending: {
      icon: Clock,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-500/30',
      dotColor: 'bg-gray-500'
    },
    loading: {
      icon: Loader,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      dotColor: 'bg-blue-500'
    },
    info: {
      icon: CheckCircle,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      dotColor: 'bg-blue-500'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // 尺寸配置
  const sizeConfig = {
    sm: {
      icon: 'w-3 h-3',
      text: 'text-xs',
      padding: 'px-2 py-1',
      dot: 'w-2 h-2'
    },
    md: {
      icon: 'w-4 h-4',
      text: 'text-sm',
      padding: 'px-3 py-1.5',
      dot: 'w-3 h-3'
    },
    lg: {
      icon: 'w-5 h-5',
      text: 'text-base',
      padding: 'px-4 py-2',
      dot: 'w-4 h-4'
    }
  };

  const sizeClasses = sizeConfig[size];

  // 圆点模式
  if (dot) {
    
        return (
      <div className={cn('flex items-center gap-2', className)
      }>
        <div
          className={cn(
            'rounded-full',
            sizeClasses.dot,
            config.dotColor,
            status === 'loading' && 'animate-pulse'
          )}
        />
        {text && (
          <span className={cn(sizeClasses.text, config.color)}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // 标准模式
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border',
        sizeClasses.padding,
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(
            sizeClasses.icon,
            config.color,
            status === 'loading' && 'animate-spin'
          )}
           />
      )}
      {text && (
        <span className={cn(sizeClasses.text, config.color)}>
          {text}
        </span>
      )}
    </div>
  );
};

interface TestStatusIndicatorProps   {
  /** 测试状态 */
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'
  /** 自定义文本 */
  text?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 自定义类名 */
  className?: string;
}

export const TestStatusIndicator: React.FC<TestStatusIndicatorProps> = ({
  status,
  text,
  size = 'md',
  className
}) => {
  const statusMap: Record<string, StatusType>  = {
    idle: 'pending',
    running: 'loading',
    completed: 'success',
    failed: 'error',
    cancelled: 'warning'
  };
  const defaultText = {
    idle: '待开始',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  };

  return (
    <StatusIndicator status={statusMap[status]}
      text={text || defaultText[status]}
      size={size}
      className={className}
       />
  );
};

interface ConnectionStatusIndicatorProps   {
  /** 连接状态 */
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  /** 自定义文本 */
  text?: string;
  /** 是否显示为圆点 */
  dot?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  text,
  dot = true,
  className
}) => {
  const statusMap: Record<string, StatusType>  = {
    connected: 'success',
    disconnected: 'error',
    connecting: 'loading',
    error: 'error'
  };
  const defaultText = {
    connected: '已连接',
    disconnected: '已断开',
    connecting: '连接中',
    error: '连接错误'
  };

  return (
    <StatusIndicator status={statusMap[status]}
      text={text || defaultText[status]}
      dot={dot}
      size= 'sm'
      className={className}
       />
  );
};

export default StatusIndicator;
