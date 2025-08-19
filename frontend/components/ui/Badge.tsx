import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
  size = 'md',
  outline = false,
  className = '',
  children,
  ...props
}) => {
  const variantClasses = badgeVariants[variant];
  const styleClasses = outline ? variantClasses.outline : variantClasses.solid;
  const sizeClasses = badgeSizes[size];

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-md border transition-all duration-200 ${styleClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
