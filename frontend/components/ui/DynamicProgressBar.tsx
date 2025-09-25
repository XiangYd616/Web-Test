/**
 * DynamicProgressBar.tsx - React组件
 * 
 * 文件路径: frontend\components\ui\DynamicProgressBar.tsx
 * 创建时间: 2025-09-25
 */


import React from 'react';
import type { FC } from 'react';

interface DynamicProgressBarProps {
  progress: number;
  className?: string;
  height?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  animated?: boolean;
}

export const DynamicProgressBar: React.FC<DynamicProgressBarProps> = ({
  progress,
  className = '',
  height = 'md',
  color = 'blue',
  animated = true
}) => {
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  };

  const progressValue = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full bg-gray-700 rounded-full ${heightClasses[height]} ${className}`}>
      <div
        className={`${heightClasses[height]} rounded-full ${colorClasses[color]} ${
          animated ? 'transition-all duration-300' : ''
        }`}
        style={{ width: `${progressValue}%` }}
        role="progressbar"
        aria-valuenow={progressValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`进度: ${progressValue.toFixed(1)}%`}
      />
    </div>
  );
};
