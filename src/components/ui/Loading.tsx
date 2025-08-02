import { Loader2 } from 'lucide-react';
import React from 'react';
import { cn } from '../../utils/cn';

// 加载类型
export type LoadingType = 'spinner' | 'dots' | 'pulse' | 'bars' | 'ring' | 'wave';

// 加载尺寸
export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// 加载组件属性
export interface LoadingProps {
  type?: LoadingType;
  size?: LoadingSize;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'white';
  text?: string;
  overlay?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// 尺寸映射
const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

// 颜色映射
const colorClasses = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  info: 'text-cyan-600',
  white: 'text-white'
};

// 文本尺寸映射
const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
};

// 旋转动画组件
const SpinnerLoading: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => (
  <Loader2 className={cn('animate-spin', sizeClasses[size], color)} />
);

// 点状加载组件
const DotsLoading: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
  const dotSize = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
    xl: 'w-3 h-3'
  };

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-pulse',
            dotSize[size],
            color.replace('text-', 'bg-')
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
};

// 脉冲加载组件
const PulseLoading: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => (
  <div className={cn(
    'rounded-full animate-pulse',
    sizeClasses[size],
    color.replace('text-', 'bg-')
  )} />
);

// 条状加载组件
const BarsLoading: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
  const barHeight = {
    xs: 'h-2',
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-6',
    xl: 'h-8'
  };

  const barWidth = {
    xs: 'w-0.5',
    sm: 'w-0.5',
    md: 'w-1',
    lg: 'w-1',
    xl: 'w-1.5'
  };

  return (
    <div className="flex items-end gap-0.5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse',
            barWidth[size],
            barHeight[size],
            color.replace('text-', 'bg-')
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1.2s'
          }}
        />
      ))}
    </div>
  );
};

// 环形加载组件
const RingLoading: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
  const ringSize = {
    xs: 12,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48
  };

  const strokeWidth = {
    xs: 2,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5
  };

  const radius = ringSize[size] / 2 - strokeWidth[size];
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative">
      <svg
        className="animate-spin"
        width={ringSize[size]}
        height={ringSize[size]}
        viewBox={`0 0 ${ringSize[size]} ${ringSize[size]}`}
      >
        <circle
          cx={ringSize[size] / 2}
          cy={ringSize[size] / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth[size]}
          fill="none"
          className="opacity-25"
        />
        <circle
          cx={ringSize[size] / 2}
          cy={ringSize[size] / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth[size]}
          fill="none"
          strokeLinecap="round"
          className={color}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference * 0.75
          }}
        />
      </svg>
    </div>
  );
};

// 波浪加载组件
const WaveLoading: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
  const waveHeight = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4'
  };

  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            'w-0.5 animate-pulse',
            waveHeight[size],
            color.replace('text-', 'bg-')
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1s',
            transform: `scaleY(${0.4 + Math.sin(i * 0.5) * 0.6})`
          }}
        />
      ))}
    </div>
  );
};

// 主加载组件
export const Loading: React.FC<LoadingProps> = ({
  type = 'spinner',
  size = 'md',
  color = 'primary',
  text,
  overlay = false,
  className,
  children
}) => {
  const colorClass = colorClasses[color];

  // 渲染加载动画
  const renderLoadingAnimation = () => {
    switch (type) {
      case 'dots':
        return <DotsLoading size={size} color={colorClass} />;
      case 'pulse':
        return <PulseLoading size={size} color={colorClass} />;
      case 'bars':
        return <BarsLoading size={size} color={colorClass} />;
      case 'ring':
        return <RingLoading size={size} color={colorClass} />;
      case 'wave':
        return <WaveLoading size={size} color={colorClass} />;
      case 'spinner':
      default:
        return <SpinnerLoading size={size} color={colorClass} />;
    }
  };

  // 加载内容
  const loadingContent = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-2',
      className
    )}>
      {renderLoadingAnimation()}
      {text && (
        <span className={cn(
          'font-medium',
          textSizeClasses[size],
          colorClass
        )}>
          {text}
        </span>
      )}
    </div>
  );

  // 如果是覆盖模式
  if (overlay) {
    return (
      <div className="relative">
        {children}
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          {loadingContent}
        </div>
      </div>
    );
  }

  return loadingContent;
};

// 页面级加载组件
export const PageLoading: React.FC<{
  text?: string;
  size?: LoadingSize;
  type?: LoadingType;
}> = ({ text = '加载中...', size = 'lg', type = 'spinner' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <Loading
      type={type}
      size={size}
      text={text}
      color="primary"
    />
  </div>
);

// 内联加载组件
export const InlineLoading: React.FC<{
  text?: string;
  size?: LoadingSize;
  type?: LoadingType;
}> = ({ text, size = 'sm', type = 'spinner' }) => (
  <Loading
    type={type}
    size={size}
    text={text}
    color="primary"
    className="inline-flex"
  />
);

// 按钮加载组件
export const ButtonLoading: React.FC<{
  size?: LoadingSize;
  color?: 'primary' | 'white';
}> = ({ size = 'sm', color = 'white' }) => (
  <Loading
    type="spinner"
    size={size}
    color={color}
    className="inline-flex"
  />
);

// 卡片加载组件
export const CardLoading: React.FC<{
  text?: string;
  height?: string;
}> = ({ text = '加载中...', height = 'h-32' }) => (
  <div className={cn(
    'flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
    height
  )}>
    <Loading
      type="spinner"
      size="md"
      text={text}
      color="primary"
    />
  </div>
);

// 表格加载组件
export const TableLoading: React.FC<{
  rows?: number;
  columns?: number;
}> = ({ rows = 5, columns = 4 }) => (
  <div className="animate-pulse">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 py-3 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div
            key={colIndex}
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"
          />
        ))}
      </div>
    ))}
  </div>
);

// 骨架屏加载组件
export const SkeletonLoading: React.FC<{
  lines?: number;
  avatar?: boolean;
  className?: string;
}> = ({ lines = 3, avatar = false, className }) => (
  <div className={cn('animate-pulse', className)}>
    {avatar && (
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        </div>
      </div>
    )}
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-4 bg-gray-200 dark:bg-gray-700 rounded',
            index === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  </div>
);

export default Loading;
