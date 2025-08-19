import React from 'react';

interface ProgressBarProps {
  /** 进度值 (0-100) */
  value: number;
  /** 进度条变体 */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  /** 进度条尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示百分比文本 */
  showPercentage?: boolean;
  /** 是否显示动画 */
  animated?: boolean;
  /** 是否显示条纹 */
  striped?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 自定义标签 */
  label?: string;
  /** 最大值 */
  max?: number;
  /** 最小值 */
  min?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = 'primary',
  size = 'md',
  showPercentage = false,
  animated = false,
  striped = false,
  className = '',
  label,
  max = 100,
  min = 0
}) => {
  // 确保值在有效范围内
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = ((clampedValue - min) / (max - min)) * 100;

  // 获取变体样式
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600';
      case 'secondary':
        return 'bg-gray-600';
      case 'success':
        return 'bg-green-600';
      case 'warning':
        return 'bg-yellow-600';
      case 'danger':
        return 'bg-red-600';
      case 'info':
        return 'bg-cyan-600';
      default:
        return 'bg-blue-600';
    }
  };

  // 获取尺寸样式
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'md':
        return 'h-4';
      case 'lg':
        return 'h-6';
      default:
        return 'h-4';
    }
  };

  // 获取文本尺寸
  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-sm';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  return (
    <div className={`progress-bar-container ${className}`}>
      {/* 标签和百分比 */}
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className={`font-medium text-gray-700 ${getTextSizeClasses()}`}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={`font-medium text-gray-600 ${getTextSizeClasses()}`}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      {/* 进度条容器 */}
      <div 
        className={`
          w-full bg-gray-200 rounded-full overflow-hidden
          ${getSizeClasses()}
        `}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label || `进度: ${Math.round(percentage)}%`}
      >
        {/* 进度条填充 */}
        <div
          className={`
            h-full transition-all duration-300 ease-out
            ${getVariantClasses()}
            ${striped ? 'bg-stripes' : ''}
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        >
          {/* 条纹效果 */}
          {striped && (
            <div 
              className="h-full w-full opacity-25"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  rgba(255,255,255,.2) 10px,
                  rgba(255,255,255,.2) 20px
                )`
              }}
            />
          )}
        </div>
      </div>

      {/* 内联百分比文本（仅在大尺寸时显示） */}
      {showPercentage && size === 'lg' && percentage > 20 && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ top: label ? '1.5rem' : '0' }}
        >
          <span className="text-white font-medium text-sm">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

// 多段进度条组件
interface MultiProgressBarProps {
  segments: Array<{
    value: number;
    variant?: ProgressBarProps['variant'];
    label?: string;
  }>;
  size?: ProgressBarProps['size'];
  showPercentage?: boolean;
  className?: string;
  max?: number;
}

export const MultiProgressBar: React.FC<MultiProgressBarProps> = ({
  segments,
  size = 'md',
  showPercentage = false,
  className = '',
  max = 100
}) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const clampedTotal = Math.min(total, max);

  // 获取尺寸样式
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'md':
        return 'h-4';
      case 'lg':
        return 'h-6';
      default:
        return 'h-4';
    }
  };

  // 获取变体样式
  const getVariantClasses = (variant: ProgressBarProps['variant'] = 'primary') => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600';
      case 'secondary':
        return 'bg-gray-600';
      case 'success':
        return 'bg-green-600';
      case 'warning':
        return 'bg-yellow-600';
      case 'danger':
        return 'bg-red-600';
      case 'info':
        return 'bg-cyan-600';
      default:
        return 'bg-blue-600';
    }
  };

  return (
    <div className={`multi-progress-bar-container ${className}`}>
      {/* 总百分比 */}
      {showPercentage && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">总进度</span>
          <span className="text-sm font-medium text-gray-600">
            {Math.round((clampedTotal / max) * 100)}%
          </span>
        </div>
      )}

      {/* 多段进度条 */}
      <div 
        className={`
          w-full bg-gray-200 rounded-full overflow-hidden flex
          ${getSizeClasses()}
        `}
        role="progressbar"
        aria-valuenow={clampedTotal}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {segments.map((segment, index) => {
          const segmentPercentage = (segment.value / max) * 100;
          return (
            <div
              key={index}
              className={`
                h-full transition-all duration-300 ease-out
                ${getVariantClasses(segment.variant)}
              `}
              style={{ width: `${segmentPercentage}%` }}
              title={segment.label ? `${segment.label}: ${Math.round(segmentPercentage)}%` : undefined}
            />
          );
        })}
      </div>

      {/* 图例 */}
      {segments.some(s => s.label) && (
        <div className="flex flex-wrap gap-4 mt-2">
          {segments.map((segment, index) => 
            segment.label ? (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className={`w-3 h-3 rounded-sm ${getVariantClasses(segment.variant)}`}
                />
                <span className="text-xs text-gray-600">
                  {segment.label} ({Math.round((segment.value / max) * 100)}%)
                </span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
