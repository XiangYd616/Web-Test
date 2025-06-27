import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import '../../styles/modern-design-system.css';
import { useTheme } from '../../contexts/ThemeContext';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
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
  icon: Icon,
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
      <div className={`stat-card stat-card-${variant} ${className}`}>
        <div className="stat-card-header">
          <div className="loading-shimmer w-12 h-12 rounded-lg"></div>
          <div className="loading-shimmer w-16 h-4 rounded"></div>
        </div>
        <div className="loading-shimmer w-24 h-8 rounded mb-2"></div>
        <div className="loading-shimmer w-20 h-4 rounded"></div>
      </div>
    );
  }

  return (
    <div className={`stat-card stat-card-${variant} modern-card-hover ${
      actualTheme === 'light' ? 'card-elevated floating-element' : ''
    } ${className}`}>
      <div className="stat-card-header">
        <div className={`stat-card-icon stat-card-icon-${variant} ${
          actualTheme === 'light' ? 'pulse-glow' : ''
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className={`stat-card-title ${
          actualTheme === 'light' ? 'themed-text-primary' : ''
        }`}>{title}</h3>
      </div>
      
      <div className="stat-card-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      
      {trend && (
        <div className={`stat-card-trend ${getTrendClass()}`}>
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
    </div>
  );
};

export default StatCard;
