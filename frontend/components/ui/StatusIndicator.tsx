import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Loader, XCircle, Info } from 'lucide-react';

export type StatusType = 'success' | 'error' | 'warning' | 'pending' | 'loading' | 'info';

interface StatusIndicatorProps {
  /** 状态类型 */
  status: StatusType;
  /** 状态文本 */
  text?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否显示为徽章样式 */
  variant?: 'default' | 'badge' | 'dot';
  /** 点击事件 */
  onClick?: () => void;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  text,
  size = 'md',
  showIcon = true,
  className = '',
  variant = 'default',
  onClick
}) => {
  // 获取状态配置
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          dotColor: 'bg-green-500'
        };
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          dotColor: 'bg-red-500'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          dotColor: 'bg-yellow-500'
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          dotColor: 'bg-gray-500'
        };
      case 'loading':
        return {
          icon: Loader,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          dotColor: 'bg-blue-500'
        };
      case 'info':
        return {
          icon: Info,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          dotColor: 'bg-blue-500'
        };
      default:
        return {
          icon: Info,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          dotColor: 'bg-gray-500'
        };
    }
  };

  // 获取尺寸配置
  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          iconSize: 'w-3 h-3',
          textSize: 'text-xs',
          padding: 'px-2 py-1',
          dotSize: 'w-2 h-2'
        };
      case 'md':
        return {
          iconSize: 'w-4 h-4',
          textSize: 'text-sm',
          padding: 'px-3 py-1.5',
          dotSize: 'w-3 h-3'
        };
      case 'lg':
        return {
          iconSize: 'w-5 h-5',
          textSize: 'text-base',
          padding: 'px-4 py-2',
          dotSize: 'w-4 h-4'
        };
      default:
        return {
          iconSize: 'w-4 h-4',
          textSize: 'text-sm',
          padding: 'px-3 py-1.5',
          dotSize: 'w-3 h-3'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = getSizeConfig();
  const IconComponent = statusConfig.icon;

  // 点状指示器
  if (variant === 'dot') {
    return (
      <div 
        className={`flex items-center space-x-2 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
      >
        <div className={`${sizeConfig.dotSize} ${statusConfig.dotColor} rounded-full flex-shrink-0`} />
        {text && (
          <span className={`${sizeConfig.textSize} ${statusConfig.color} font-medium`}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // 徽章样式
  if (variant === 'badge') {
    return (
      <span 
        className={`
          inline-flex items-center space-x-1 rounded-full border
          ${sizeConfig.padding} ${sizeConfig.textSize}
          ${statusConfig.color} ${statusConfig.bgColor} ${statusConfig.borderColor}
          ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
          ${className}
        `}
        onClick={onClick}
      >
        {showIcon && (
          <IconComponent 
            className={`${sizeConfig.iconSize} ${status === 'loading' ? 'animate-spin' : ''}`} 
          />
        )}
        {text && <span className="font-medium">{text}</span>}
      </span>
    );
  }

  // 默认样式
  return (
    <div 
      className={`
        flex items-center space-x-2
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {showIcon && (
        <IconComponent 
          className={`
            ${sizeConfig.iconSize} ${statusConfig.color}
            ${status === 'loading' ? 'animate-spin' : ''}
          `} 
        />
      )}
      {text && (
        <span className={`${sizeConfig.textSize} ${statusConfig.color} font-medium`}>
          {text}
        </span>
      )}
    </div>
  );
};

// 状态列表组件
interface StatusListProps {
  items: Array<{
    id: string;
    status: StatusType;
    text: string;
    description?: string;
    timestamp?: string;
  }>;
  variant?: StatusIndicatorProps['variant'];
  size?: StatusIndicatorProps['size'];
  className?: string;
  onItemClick?: (id: string) => void;
}

export const StatusList: React.FC<StatusListProps> = ({
  items,
  variant = 'default',
  size = 'md',
  className = '',
  onItemClick
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <div 
          key={item.id}
          className={`
            flex items-start justify-between p-3 rounded-lg border
            ${onItemClick ? 'cursor-pointer hover:bg-gray-50' : ''}
          `}
          onClick={() => onItemClick?.(item.id)}
        >
          <div className="flex-1">
            <StatusIndicator
              status={item.status}
              text={item.text}
              variant={variant}
              size={size}
            />
            {item.description && (
              <p className="mt-1 text-sm text-gray-600">{item.description}</p>
            )}
          </div>
          {item.timestamp && (
            <span className="text-xs text-gray-500 ml-4 flex-shrink-0">
              {item.timestamp}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// 状态统计组件
interface StatusStatsProps {
  stats: Record<StatusType, number>;
  total?: number;
  size?: StatusIndicatorProps['size'];
  className?: string;
  onStatusClick?: (status: StatusType) => void;
}

export const StatusStats: React.FC<StatusStatsProps> = ({
  stats,
  total,
  size = 'md',
  className = '',
  onStatusClick
}) => {
  const totalCount = total || Object.values(stats).reduce((sum, count) => sum + count, 0);

  return (
    <div className={`flex flex-wrap gap-4 ${className}`}>
      {Object.entries(stats).map(([status, count]) => {
        const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        
        return (
          <div
            key={status}
            className={`
              flex items-center space-x-2 p-2 rounded-lg border
              ${onStatusClick ? 'cursor-pointer hover:bg-gray-50' : ''}
            `}
            onClick={() => onStatusClick?.(status as StatusType)}
          >
            <StatusIndicator
              status={status as StatusType}
              variant="dot"
              size={size}
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900">{count}</div>
              <div className="text-gray-500">{percentage}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatusIndicator;
