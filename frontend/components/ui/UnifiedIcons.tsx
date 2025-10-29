// Unified Icons
import React from 'react';
import { LucideIcon, CheckCircle, XCircle, Clock, AlertCircle, Play } from 'lucide-react';

export interface IconProps {
  className?: string;
  size?: number | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  color?: 'current' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'muted';
  animated?: boolean;
}

// 尺寸映射
const sizeMap: Record<string, number> = {
  'sm': 16,
  'md': 20,
  'lg': 24,
  'xl': 32,
  '2xl': 40
};

// 颜色映射
const colorMap: Record<string, string> = {
  'current': '',
  'primary': 'text-blue-500',
  'secondary': 'text-gray-400',
  'success': 'text-green-500',
  'error': 'text-red-500',
  'warning': 'text-yellow-500',
  'muted': 'text-gray-500'
};

// TestStatusIcon component
export const TestStatusIcon: React.FC<{ status: string } & IconProps> = ({ 
  status, 
  className = '',
  size = 20,
  animated = false
}) => {
  const numericSize = typeof size === 'string' ? sizeMap[size] || 20 : size;
  const iconProps = { className: `${animated ? 'animate-spin' : ''} ${className}`, size: numericSize };
  
  switch (status) {
    case 'completed':
    case 'passed':
    case 'success':
      return <CheckCircle {...iconProps} className={`text-green-500 ${className}`} />;
    case 'failed':
    case 'error':
      return <XCircle {...iconProps} className={`text-red-500 ${className}`} />;
    case 'running':
      return <Play {...iconProps} className={`text-blue-500 ${className}`} />;
    case 'pending':
    case 'warning':
      return <Clock {...iconProps} className={`text-yellow-500 ${className}`} />;
    case 'idle':
    default:
      return <AlertCircle {...iconProps} className={`text-gray-500 ${className}`} />;
  }
};

// UnifiedIcon component (generic icon wrapper)
export const UnifiedIcon: React.FC<{ icon: LucideIcon } & IconProps> = ({ 
  icon: Icon, 
  className = '',
  size = 20,
  color = 'current'
}) => {
  const numericSize = typeof size === 'string' ? sizeMap[size] || 20 : size;
  const colorClass = colorMap[color] || '';
  return <Icon className={`${colorClass} ${className}`} size={numericSize} />;
};

// ActionIcon component
export const ActionIcon: React.FC<{ icon: LucideIcon; onClick?: () => void } & IconProps> = ({ 
  icon: Icon, 
  onClick,
  className = '',
  size = 20 
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded hover:bg-gray-700 transition-colors ${className}`}
      type="button"
    >
      <Icon size={size} />
    </button>
  );
};

export const IconComponent: React.FC<any> = () => null;
export default IconComponent;
