import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/modern-design-system.css';

export interface ModernCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  variant?: 'default' | 'compact' | 'spacious';
  hover?: boolean;
  glass?: boolean;
  className?: string;
  onClick?: () => void;
}

const ModernCard: React.FC<ModernCardProps> = ({
  children,
  title,
  subtitle,
  headerAction,
  variant = 'default',
  hover = false,
  glass = false,
  className = '',
  onClick
}) => {
  const { actualTheme } = useTheme();

  const getCardClasses = () => {
    const classes = ['modern-card'];

    if (variant === 'compact') classes.push('modern-card-compact');
    if (variant === 'spacious') classes.push('modern-card-spacious');
    if (hover) classes.push('modern-card-hover');

    // 根据主题选择不同的样式
    if (actualTheme === 'light') {
      if (glass) classes.push('glass-effect');
      else classes.push('card-elevated');
    } else {
      if (glass) classes.push('glass-effect');
    }

    return classes.join(' ');
  };

  return (
    <div
      className={`${getCardClasses()} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {(title || subtitle || headerAction) && (
        <div className="card-header mb-6">
          <div className="flex items-start justify-between">
            <div>
              {title && (
                <h3 className={`text-lg font-semibold mb-1 ${actualTheme === 'light' ? 'themed-text-primary' : 'text-primary'
                  }`}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={`text-sm ${actualTheme === 'light' ? 'themed-text-secondary' : 'text-secondary'
                  }`}>
                  {subtitle}
                </p>
              )}
            </div>
            {headerAction && (
              <div className="card-header-action">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

export default ModernCard;
