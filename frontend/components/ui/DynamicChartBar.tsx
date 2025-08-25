
import React from 'react';
import type { FC } from 'react';

interface DynamicChartBarProps {
  value: number;
  maxValue: number;
  maxHeight?: number;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  className?: string;
  animated?: boolean;
}

export const DynamicChartBar: React.FC<DynamicChartBarProps> = ({
  value,
  maxValue,
  maxHeight = 80,
  color = 'blue',
  className = '',
  animated = true
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  };

  const heightPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const heightPx = Math.max(2, (heightPercentage / 100) * maxHeight);

  return (
    <div
      className={`chart-bar-dynamic rounded-t ${colorClasses[color]} ${
        animated ? 'transition-all duration-300' : ''
      } ${className}`}
      style={{ height: `${heightPx}px` }}
      title={`值: ${value.toFixed(2)}`}
      role="img"
      aria-label={`图表条: ${value.toFixed(2)}`}
    />
  );
};
