/**
 * 统一的布局组件
 * 整合项目中重复的布局模式和容器组件
 */

import { LucideIcon } from 'lucide-react';
import React from 'react';

// 基础页面布局
export interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  compact?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  background?: 'default' | 'dark' | 'gradient';
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  description,
  icon: Icon,
  className = '',
  compact = false,
  maxWidth = 'full',
  background = 'default'
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
  const getMaxWidth = () => {
    const widthMap = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
      '2xl': 'max-w-7xl',
      full: 'max-w-full'
    };
    return widthMap[maxWidth];
  };

  const getBackground = () => {
    const bgMap = {
      default: 'bg-gray-50',
      dark: 'bg-gray-900',
      gradient: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
    };
    return bgMap[background];
  };

  return (
    <div className={`
      min-h-screen ${getBackground()}
      ${compact ? 'py-4' : 'py-6 lg:py-8'}
      ${className}
    `}>
      <div className={`
        mx-auto px-4 sm:px-6 lg:px-8
        ${getMaxWidth()}
      `}>
        {/* 页面头部 */}
        {(title || description) && (
          <header className={`
            ${compact ? 'mb-4' : 'mb-6 lg:mb-8'}
            ${background === 'dark' || background === 'gradient' ? 'text-white' : 'text-gray-900'}
          `}>
            <div className="flex items-center gap-4 mb-4">
              {Icon && (
                <div className={`
                  p-3 rounded-xl
                  ${background === 'dark' || background === 'gradient'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-blue-100 text-blue-600'
                  }
                `}>
                  <Icon className="w-6 h-6" />
                </div>
              )}
              <div>
                {title && (
                  <h1 className={`
                    font-bold
                    ${compact ? 'text-xl lg:text-2xl' : 'text-2xl lg:text-3xl'}
                    ${background === 'dark' || background === 'gradient' ? 'text-white' : 'text-gray-900'}
                  `}>
                    {title}
                  </h1>
                )}
                {description && (
                  <p className={`
                    mt-2 text-sm lg:text-base
                    ${background === 'dark' || background === 'gradient' ? 'text-gray-300' : 'text-gray-600'}
                  `}>
                    {description}
                  </p>
                )}
              </div>
            </div>
          </header>
        )}

        {/* 主要内容 */}
        <main className={compact ? 'space-y-4' : 'space-y-6'}>
          {children}
        </main>
      </div>
    </div>
  );
};

// 网格布局
export interface GridLayoutProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  responsive?: boolean;
}

export const GridLayout: React.FC<GridLayoutProps> = ({
  children,
  columns = 2,
  gap = 'md',
  className = '',
  responsive = true
}) => {
  const getGridCols = () => {
    if (!responsive) {
      
        return `grid-cols-${columns
      }`;
    }

    const responsiveMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 lg:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
    };
    return responsiveMap[columns];
  };

  const getGap = () => {
    const gapMap = {
      sm: 'gap-3',
      md: 'gap-4 lg:gap-6',
      lg: 'gap-6 lg:gap-8'
    };
    return gapMap[gap];
  };

  return (
    <div className={`
      grid ${getGridCols()} ${getGap()}
      ${className}
    `}>
      {children}
    </div>
  );
};

// 弹性布局
export interface FlexLayoutProps {
  children: React.ReactNode;
  direction?: 'row' | 'col';
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
}

export const FlexLayout: React.FC<FlexLayoutProps> = ({
  children,
  direction = 'row',
  gap = 'md',
  align = 'start',
  justify = 'start',
  wrap = false,
  className = ''
}) => {
  const getDirection = () => direction === 'row' ? 'flex-row' : 'flex-col';

  const getGap = () => {
    const gapMap = {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6'
    };
    return gapMap[gap];
  };

  const getAlign = () => {
    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch'
    };
    return alignMap[align];
  };

  const getJustify = () => {
    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around'
    };
    return justifyMap[justify];
  };

  return (
    <div className={`
      flex ${getDirection()} ${getGap()} ${getAlign()} ${getJustify()}
      ${wrap ? 'flex-wrap' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};

// 卡片容器
export interface CardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'elevated' | 'glass';
  background?: 'white' | 'gray' | 'dark' | 'transparent';
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  description,
  icon: Icon,
  className = '',
  padding = 'md',
  variant = 'default',
  background = 'white',
  onClick,
  hoverable = false
}) => {
  const getPadding = () => {
    const paddingMap = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    };
    return paddingMap[padding];
  };

  const getVariant = () => {
    const variantMap = {
      default: 'border border-gray-200',
      outlined: 'border-2 border-gray-300',
      elevated: 'shadow-lg border border-gray-100',
      glass: 'backdrop-blur-sm border border-white/20'
    };
    return variantMap[variant];
  };

  const getBackground = () => {
    const bgMap = {
      white: 'bg-white',
      gray: 'bg-gray-50',
      dark: 'bg-gray-800',
      transparent: 'bg-transparent'
    };
    return bgMap[background];
  };

  const isClickable = onClick || hoverable;

  return (
    <div
      className={`
        rounded-xl ${getPadding()} ${getVariant()} ${getBackground()}
        ${isClickable ? 'cursor-pointer transition-all duration-200' : ''}
        ${hoverable ? 'hover:shadow-md hover:scale-[1.02]' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* 卡片头部 */}
      {(title || description || Icon) && (
        <header className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            {Icon && (
              <div className={`
                p-2 rounded-lg
                ${background === 'dark'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-blue-100 text-blue-600'
                }
              `}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            {title && (
              <h3 className={`
                text-lg font-semibold
                ${background === 'dark' ? 'text-white' : 'text-gray-900'}
              `}>
                {title}
              </h3>
            )}
          </div>
          {description && (
            <p className={`
              text-sm
              ${background === 'dark' ? 'text-gray-300' : 'text-gray-600'}
            `}>
              {description}
            </p>
          )}
        </header>
      )}

      {/* 卡片内容 */}
      <div>
        {children}
      </div>
    </div>
  );
};

// 分割线
export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  className = '',
  label
}) => {
  if (orientation === 'vertical') {
    
        return (
      <div className={`w-px bg-gray-200 ${className
      }`} />
    );
  }

  if (label) {
    
        return (
      <div className={`relative ${className
      }`}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <hr className={`border-gray-200 ${className}`} />
  );
};

// 空状态
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && (
        <Icon className="w-16 h-16 mx-auto mb-6 text-gray-400" />
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// 加载状态
export interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = '加载中...',
  className = '',
  size = 'md'
}) => {
  const getSizeClasses = () => {
    const sizeMap = {
      sm: { spinner: 'w-6 h-6', text: 'text-sm', padding: 'py-8' },
      md: { spinner: 'w-10 h-10', text: 'text-base', padding: 'py-12' },
      lg: { spinner: 'w-16 h-16', text: 'text-lg', padding: 'py-16' }
    };
    return sizeMap[size];
  };

  const { spinner, text, padding } = getSizeClasses();

  return (
    <div className={`text-center ${padding} ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-400 mx-auto ${spinner}`} />
      <p className={`mt-4 text-gray-500 ${text}`}>{message}</p>
    </div>
  );
};

// 所有组件已通过单独的export语句导出

