import React from 'react';
import {LucideIcon, Minus, TrendingDown, TrendingUp} from 'lucide-react';
import {useTheme} from '../../contexts/ThemeContext';

// CSS样式已迁移到组件库和主题配置�?
export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon | React.ReactElement;
  subtitle?: string;
  change?: number;
  color?: string;
  trend?: {
    value: number;
    label?: string;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  change,
  color,
  trend,
  variant = 'primary',
  loading = false,
  className = ''
}) => {
  const { actualTheme } = useTheme();
  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendClass = () => {
    if (!trend) return '';

    switch (trend.direction) {
      case 'up':
        return 'stat-card-trend-up';
      case 'down':
        return 'stat-card-trend-down';
      default:
        return 'stat-card-trend-neutral';
    }
  };

  if (loading) {
    return (
      <article className={`stat-card stat-card-${variant} ${className}`} aria-busy="true" aria-label="加载统计数据">
        <header className="stat-card-header">
          <div className="loading-shimmer w-12 h-12 rounded-lg" aria-hidden="true"></div>
          <div className="loading-shimmer w-16 h-4 rounded" aria-hidden="true"></div>
        </header>
        <div className="loading-shimmer w-24 h-8 rounded mb-2" aria-hidden="true"></div>
        <div className="loading-shimmer w-20 h-4 rounded" aria-hidden="true"></div>
      </article>
    );
  }

  return (
    <article className={`stat-card stat-card-${variant} modern-card-hover ${actualTheme === 'light' ? 'card-elevated floating-element' : ''
      } ${className}`}>
      <header className="stat-card-header">
        <div className={`stat-card-icon stat-card-icon-${variant} ${actualTheme === 'light' ? 'pulse-glow' : ''
          }`} aria-hidden="true">
          {React.isValidElement(icon) ? icon : React.createElement(icon as React.ComponentType<any>, { className: "w-6 h-6" })}
        </div>
        <h3 className={`stat-card-title ${actualTheme === 'light' ? 'themed-text-primary' : ''
          }`}>{title}</h3>
      </header>

      <div className="stat-card-value" role="text" aria-label={`${title}: ${typeof value === 'number' ? value.toLocaleString() : value}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {subtitle && (
        <p className="stat-card-subtitle text-muted text-sm">
          {subtitle}
        </p>
      )}

      {trend && (
        <div className={`stat-card-trend ${getTrendClass()}`} role="text" aria-label={`趋势: ${trend.direction === 'up' ? '上升' : trend.direction === 'down' ? '下降' : '持平'} ${Math.abs(trend.value)}%`}>
          {getTrendIcon()}
          <span>
            {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
            {Math.abs(trend.value)}%
          </span>
          {trend.label && (
            <span className="text-muted ml-1">{trend.label}</span>
          )}
        </div>
      )}
    </article>
  );
};

export default StatCard;
