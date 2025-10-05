// Unified Icons
import React from 'react';
import { LucideIcon, CheckCircle, XCircle, Clock, AlertCircle, Play } from 'lucide-react';

export interface IconProps {
  className?: string;
  size?: number;
}

// TestStatusIcon component
export const TestStatusIcon: React.FC<{ status: string } & IconProps> = ({ 
  status, 
  className = '',
  size = 20 
}) => {
  const iconProps = { className, size };
  
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
      return <Clock {...iconProps} className={`text-yellow-500 ${className}`} />;
    default:
      return <AlertCircle {...iconProps} className={`text-gray-500 ${className}`} />;
  }
};

// UnifiedIcon component (generic icon wrapper)
export const UnifiedIcon: React.FC<{ icon: LucideIcon } & IconProps> = ({ 
  icon: Icon, 
  className = '',
  size = 20 
}) => {
  return <Icon className={className} size={size} />;
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
