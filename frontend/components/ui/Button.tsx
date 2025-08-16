import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

const buttonVariants = {
  primary: [
    'bg-blue-600 text-white border-blue-600',
    'hover:bg-blue-700 hover:border-blue-700',
    'focus:ring-blue-500',
    'active:bg-blue-800'
  ].join(' '),

  secondary: [
    'bg-gray-600 text-white border-gray-600',
    'hover:bg-gray-700 hover:border-gray-700',
    'focus:ring-gray-500',
    'active:bg-gray-800'
  ].join(' '),

  danger: [
    'bg-red-600 text-white border-red-600',
    'hover:bg-red-700 hover:border-red-700',
    'focus:ring-red-500',
    'active:bg-red-800',
    'shadow-sm hover:shadow-md'
  ].join(' '),

  ghost: [
    'bg-transparent text-gray-400 border-gray-600',
    'hover:text-white hover:bg-gray-700 hover:border-gray-500',
    'focus:ring-gray-500',
    'active:bg-gray-800'
  ].join(' '),

  outline: [
    'bg-transparent text-gray-300 border-gray-600',
    'hover:bg-gray-700 hover:text-white hover:border-gray-500',
    'focus:ring-gray-500',
    'active:bg-gray-800'
  ].join(' ')
};

const buttonSizes = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className,
  children,
  disabled,
  ...props
}) => {
  
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    
    try {
      onClick?.(event);
    } catch (error) {
      console.error('Click handler error:', error);
      setError('操作失败，请重试');
    }
  }, [disabled, loading, onClick]);
  
  const handleChange = useCallback((newValue: any) => {
    updateState({ value: newValue, touched: true, error: null });
    
    try {
      onChange?.(newValue);
    } catch (error) {
      console.error('Change handler error:', error);
      updateState({ error: '值更新失败' });
    }
  }, [onChange, updateState]);
  
  const handleFocus = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: true });
    onFocus?.(event);
  }, [onFocus, updateState]);
  
  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: false });
    onBlur?.(event);
  }, [onBlur, updateState]);
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        // 基础样式
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium',
        'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        // 变体样式
        buttonVariants[variant],
        // 尺寸样式
        buttonSizes[size],
        // 自定义样式
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}

      {icon && iconPosition === 'left' && !loading && (
        <span className="flex-shrink-0">{icon}</span>
      )}

      {children && <span>{children}</span>}

      {icon && iconPosition === 'right' && !loading && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
};

// 专用按钮组件
export const DeleteButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => {
  return <Button variant="danger" {...props} />;
};

export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => {
  return <Button variant="primary" {...props} />;
};

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => {
  return <Button variant="secondary" {...props} />;
};

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => {
  return <Button variant="ghost" {...props} />;
};

export const OutlineButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => {
  return <Button variant="outline" {...props} />;
};

// 图标按钮组件
interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 'md',
  className,
  ...props
}) => {
  const iconSizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
    xl: 'p-4'
  };

  return (
    <Button
      size={size}
      className={cn(
        iconSizes[size],
        'aspect-square',
        className
      )}
      {...props}
    >
      {icon}
    </Button>
  );
};
