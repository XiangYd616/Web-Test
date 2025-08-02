import React from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const buttonVariants = {
  primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700 hover:border-gray-700 focus:ring-gray-500',
  danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 focus:ring-red-500',
  ghost: 'bg-transparent text-gray-400 border-gray-600 hover:text-white hover:bg-gray-700 focus:ring-gray-500'
};

const buttonSizes = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        // 基础样式
        'inline-flex items-center justify-center rounded-lg border font-medium',
        'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        // 变体样式
        buttonVariants[variant],
        // 尺寸样式
        buttonSizes[size],
        // 自定义样式
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// 删除按钮专用组件
export const DeleteButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => {
  return <Button variant="danger" {...props} />;
};
