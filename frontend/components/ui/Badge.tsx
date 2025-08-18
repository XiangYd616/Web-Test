import React from 'react';import { CheckCircle, XCircle, AlertTriangle, Clock, Loader, Info    } from 'lucide-react';import { cn    } from '../../utils/cn';// Badge组件
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>   {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  outline?: boolean;
  children: React.ReactNode;
}

const badgeVariants = {
  default: {
    solid: 'bg-gray-600 text-white border-gray-600',
    outline: 'bg-transparent text-gray-300 border-gray-600'
  },
  primary: {
    solid: 'bg-blue-600 text-white border-blue-600',
    outline: 'bg-blue-600/10 text-blue-400 border-blue-600/30'
  },
  secondary: {
    solid: 'bg-gray-500 text-white border-gray-500',
    outline: 'bg-gray-500/10 text-gray-400 border-gray-500/30'
  },
  success: {
    solid: 'bg-green-600 text-white border-green-600',
    outline: 'bg-green-600/10 text-green-400 border-green-600/30'
  },
  warning: {
    solid: 'bg-yellow-600 text-white border-yellow-600',
    outline: 'bg-yellow-600/10 text-yellow-400 border-yellow-600/30'
  },
  danger: {
    solid: 'bg-red-600 text-white border-red-600',
    outline: 'bg-red-600/10 text-red-400 border-red-600/30'
  },
  info: {
    solid: 'bg-cyan-600 text-white border-cyan-600',
    outline: 'bg-cyan-600/10 text-cyan-400 border-cyan-600/30'
  }
};

const badgeSizes = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-sm'
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'sm',
  outline = false,
  className,
  children,
  ...props
}) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
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
  const variantStyles = badgeVariants[variant];
  const styleType = outline ? 'outline' : 'solid'
  return (
    <span
      className={cn(
        // 基础样式
        'inline-flex items-center gap-1 font-medium rounded-md border transition-all duration-200',
        // 尺寸
        badgeSizes[size],
        // 变体样式
        variantStyles[styleType],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// 状态徽章组件
interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'>   {
  status: 'success' | 'error' | 'warning' | 'pending' | 'info' | 'loading'
  text?: string;
  showIcon?: boolean;
}

const statusConfig = {
  success: {
    variant: 'success' as const,
    icon: CheckCircle,
    defaultText: '成功'
  },
  error: {
    variant: 'danger' as const,
    icon: XCircle,
    defaultText: '失败'
  },
  warning: {
    variant: 'warning' as const,
    icon: AlertTriangle,
    defaultText: '警告'
  },
  pending: {
    variant: 'secondary' as const,
    icon: Clock,
    defaultText: '待处理'
  },
  info: {
    variant: 'info' as const,
    icon: Info,
    defaultText: '信息'
  },
  loading: {
    variant: 'primary' as const,
    icon: Loader,
    defaultText: '加载中'
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  showIcon = true,
  size = 'sm',
  ...props
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayText = text || config.defaultText;

  return (
    <Badge
      variant={config.variant}
      size={size}
      {...props}
    >
      {showIcon && (
        <Icon className={cn(
            'flex-shrink-0',
            size === 'xs' && 'w-2.5 h-2.5',
            size === 'sm' && 'w-3 h-3',
            size === 'md' && 'w-3.5 h-3.5',
            size === 'lg' && 'w-4 h-4',
            status === 'loading' && 'animate-spin'
          )}
           />
      )}
      {displayText}
    </Badge>
  );
};

// 数字徽章组件
interface NumberBadgeProps extends Omit<BadgeProps, 'children'>   {
  count: number;
  max?: number;
  showZero?: boolean;
}

export const NumberBadge: React.FC<NumberBadgeProps> = ({
  count,
  max = 99,
  showZero = false,
  variant = 'danger',
  size = 'xs',
  ...props
}) => {
  if (count === 0 && !showZero) {
    
        return null;
      }

  const displayCount = count > max ? `${max}+` : count.toString();`

  return (
    <Badge
      variant={variant}
      size={size}
      className= "min-w-[1.25rem] h-5 rounded-full flex items-center justify-center p-0 text-xs font-bold";`
      {...props}
    >
      {displayCount}
    </Badge>
  );
};

// 点状态指示器
interface DotBadgeProps extends React.HTMLAttributes<HTMLSpanElement>   {
  status: 'success' | 'error' | 'warning' | 'pending' | 'info'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean;
}

const dotColors = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  pending: 'bg-gray-500',
  info: 'bg-blue-500'
};

const dotSizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
};

export const DotBadge: React.FC<DotBadgeProps> = ({
  status,
  size = 'md',
  pulse = false,
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        dotSizes[size],
        dotColors[status],
        pulse && "animate-pulse',
        className
      )}
      {...props}
    />
  );
};

// 进度徽章组件
interface ProgressBadgeProps extends Omit<BadgeProps, 'children'>   {
  value: number;
  max?: number;
  showPercentage?: boolean;
  showValue?: boolean;
}

export const ProgressBadge: React.FC<ProgressBadgeProps> = ({
  value,
  max = 100,
  showPercentage = true,
  showValue = false,
  variant = 'primary',
  size = 'sm',
  ...props
}) => {
  const percentage = Math.round((value / max) * 100);

  // 根据进度自动选择颜色
  const getVariant = () => {
    if (variant !== 'primary') return variant;
    if (percentage >= 80) return 'success'
    if (percentage >= 60) return 'warning'
    if (percentage >= 40) return 'info'
    return "danger
  };

  const displayText = showPercentage
    ? `${percentage}%``
    : showValue
      ? `${value}/${max}``
      : percentage.toString();

  return (
    <Badge
      variant={getVariant()}
      size={size}
      {...props}
    >
      {displayText}
    </Badge>
  );
};

// 标签徽章组件（用于分类标签）
interface TagBadgeProps extends Omit<BadgeProps, "variant'>   {'`
  color?: string;
  removable?: boolean;
  onRemove?: () => void;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  color,
  removable = false,
  onRemove,
  children,
  size = 'sm',
  className,
  ...props
}) => {
  const customStyle = color ? {
    backgroundColor: `${color}20`,`
    borderColor: `${color}40`,`
    color: color
  } : {};

  return (
    <Badge
      variant={color ? undefined : "secondary'}'`
      size={size}
      outline
      className={cn(
        'gap-1.5',
        removable && 'pr-1',
        className
      )}
      style={color ? customStyle : undefined}
      {...props}
    >
      {children}
      {removable && (
        <button
          type= 'button'
          onClick={onRemove}
          className= 'ml-1 hover:bg-current hover:bg-opacity-20 rounded-full p-0.5 transition-colors'
        >
          <XCircle className= 'w-3 h-3'    />
        </button>
      )}
    </Badge>
  );
};
