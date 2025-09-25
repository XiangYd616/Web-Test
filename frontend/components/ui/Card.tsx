/**
 * Card.tsx - React组件
 * 
 * 文件路径: frontend\components\ui\Card.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  hover = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        // 基础样式
        'rounded-lg transition-all duration-200',
        // 变体样式
        {
          // 默认样式 - 使用主题变量
          'themed-card border themed-border-primary': variant === 'default',
          // 轮廓样式 - 透明背景，边框突出
          'bg-transparent border-2 themed-border-secondary hover:themed-border-primary': variant === 'outlined',
          // 阴影样式 - 更深背景，明显阴影
          'themed-bg-secondary border themed-border-primary shadow-lg': variant === 'elevated',
          // 玻璃样式 - 毛玻璃效果
          'glass-effect': variant === 'glass',
        },
        // 悬停效果
        hover && {
          'hover:themed-bg-tertiary hover:themed-border-secondary hover:shadow-md': variant === 'default',
          'hover:themed-bg-secondary/20': variant === 'outlined',
          'hover:themed-bg-tertiary hover:shadow-xl': variant === 'elevated',
          'hover:bg-hover hover:backdrop-blur-md': variant === 'glass',
        },
        // 内边距
        {
          'p-0': padding === 'none',
          'p-3': padding === 'sm',
          'p-4': padding === 'md',
          'p-6': padding === 'lg',
          'p-8': padding === 'xl',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// 卡片头部组件
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'mb-4 pb-3 border-b border-gray-700/30',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// 卡片主体组件
interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardBody: React.FC<CardBodyProps> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

// 卡片底部组件
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'mt-4 pt-4 border-t border-gray-700/30 flex items-center justify-between',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// 卡片标题组件
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  as: Component = 'h3',
  className,
  children,
  ...props
}) => (
  <Component
    className={cn(
      'text-lg font-semibold text-white leading-tight',
      className
    )}
    {...props}
  >
    {children}
  </Component>
);

// 卡片描述组件
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  className,
  children,
  ...props
}) => (
  <p
    className={cn(
      'text-sm text-gray-400 leading-relaxed',
      className
    )}
    {...props}
  >
    {children}
  </p>
);

// 复合卡片组件 - 预设布局
interface SimpleCardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: CardProps['variant'];
  hover?: boolean;
  className?: string;
}

export const SimpleCard: React.FC<SimpleCardProps> = ({
  title,
  description,
  children,
  footer,
  variant = 'default',
  hover = false,
  className
}) => (
  <Card variant={variant} hover={hover} className={className}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    {children && <CardBody>{children}</CardBody>}
    {footer && <CardFooter>{footer}</CardFooter>}
  </Card>
);
