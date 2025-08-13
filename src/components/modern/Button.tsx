import { LucideIcon } from 'lucide-react';
import React from 'react';

import '../../styles/design-system.css';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'base' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'base',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button'
}) => {
  const getButtonClasses = () => {
    const classes = ['modern-btn'];

    classes.push(`modern-btn-${variant}`);

    if (size !== 'base') {
      classes.push(`modern-btn-${size}`);
    }

    return classes.join(' ');
  };

  const renderIcon = () => {
    if (loading) {
      return (
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    }

    if (Icon) {
      return <Icon className="w-4 h-4" />;
    }

    return null;
  };

  return (
    <button
      type={type}
      className={`${getButtonClasses()} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {iconPosition === 'left' && renderIcon()}
      <span>{children}</span>
      {iconPosition === 'right' && renderIcon()}
    </button>
  );
};

export default Button;
