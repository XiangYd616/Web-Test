import React from 'react';
import type { FC } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'gray';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

const colorVariants = {
  blue: {
    border: 'hover:border-blue-500/50',
    iconBg: 'bg-blue-500/20',
    iconBorder: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    valueColor: 'text-white'
  },
  green: {
    border: 'hover:border-green-500/50',
    iconBg: 'bg-green-500/20',
    iconBorder: 'border-green-500/30',
    iconColor: 'text-green-400',
    valueColor: 'text-green-400'
  },
  red: {
    border: 'hover:border-red-500/50',
    iconBg: 'bg-red-500/20',
    iconBorder: 'border-red-500/30',
    iconColor: 'text-red-400',
    valueColor: 'text-red-400'
  },
  yellow: {
    border: 'hover:border-yellow-500/50',
    iconBg: 'bg-yellow-500/20',
    iconBorder: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    valueColor: 'text-white'
  },
  purple: {
    border: 'hover:border-purple-500/50',
    iconBg: 'bg-purple-500/20',
    iconBorder: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    valueColor: 'text-white'
  },
  indigo: {
    border: 'hover:border-indigo-500/50',
    iconBg: 'bg-indigo-500/20',
    iconBorder: 'border-indigo-500/30',
    iconColor: 'text-indigo-400',
    valueColor: 'text-white'
  },
  gray: {
    border: 'hover:border-gray-500/50',
    iconBg: 'bg-gray-500/20',
    iconBorder: 'border-gray-500/30',
    iconColor: 'text-gray-400',
    valueColor: 'text-white'
  }
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  className,
  onClick
}) => {
  const colorClasses = colorVariants[color];

  return (
    <div
      className={cn(
        'bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6',
        'hover:shadow-xl transition-all duration-300',
        colorClasses.border,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-300 mb-1">{title}</p>
          <p className={cn('text-2xl font-bold', colorClasses.valueColor)}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className="flex items-center mt-2 text-xs">
              <span className={cn(
                'font-medium',
                trend.isPositive ? 'text-green-400' : 'text-red-400'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-gray-400 ml-1">vs 上期</span>
            </div>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-lg border',
          colorClasses.iconBg,
          colorClasses.iconBorder
        )}>
          <Icon className={cn('w-8 h-8', colorClasses.iconColor)} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
