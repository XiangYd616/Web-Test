import React from 'react';
import { cn } from '../../utils/cn';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const checkboxSizes = {
  sm: {
    container: 'w-4 h-4',
    icon: 'w-2.5 h-2.5'
  },
  md: {
    container: 'w-5 h-5',
    icon: 'w-3 h-3'
  },
  lg: {
    container: 'w-6 h-6',
    icon: 'w-4 h-4'
  }
};

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  description,
  indeterminate = false,
  size = 'md',
  className,
  checked,
  disabled,
  ...props
}) => {
  const sizeClasses = checkboxSizes[size];

  return (
    <label className={cn(
      'flex items-start gap-3 cursor-pointer group',
      disabled && 'cursor-not-allowed opacity-50',
      className
    )}>
      <div className="relative flex items-center">
        {/* 隐藏的原生checkbox */}
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          {...props}
        />
        
        {/* 自定义checkbox外观 */}
        <div className={cn(
          'rounded-md border-2 transition-all duration-200 flex items-center justify-center',
          sizeClasses.container,
          // 未选中状态
          !checked && !indeterminate && [
            'bg-gray-700/50 border-gray-600/60',
            'group-hover:border-gray-500/80 group-hover:bg-gray-600/50',
            'group-focus-within:ring-2 group-focus-within:ring-blue-500 group-focus-within:ring-offset-2 group-focus-within:ring-offset-gray-900'
          ],
          // 选中状态
          (checked || indeterminate) && [
            'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/25',
            'group-hover:bg-blue-700 group-hover:border-blue-700'
          ],
          // 禁用状态
          disabled && 'opacity-50 cursor-not-allowed'
        )}>
          {/* 选中图标 */}
          {checked && !indeterminate && (
            <svg 
              className={cn(
                'text-white animate-in fade-in duration-150',
                sizeClasses.icon
              )}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          
          {/* 半选中图标 */}
          {indeterminate && (
            <svg 
              className={cn(
                'text-white animate-in fade-in duration-150',
                sizeClasses.icon
              )}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M20 12H4"
              />
            </svg>
          )}
        </div>
      </div>
      
      {/* 标签和描述 */}
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className={cn(
              'font-medium text-gray-300 group-hover:text-white transition-colors',
              size === 'sm' && 'text-sm',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base'
            )}>
              {label}
            </span>
          )}
          {description && (
            <span className={cn(
              'text-gray-400 mt-1',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-sm'
            )}>
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
};

// 简化的复选框组件（仅图标，无标签）
interface SimpleCheckboxProps extends Omit<CheckboxProps, 'label' | 'description'> {
  'aria-label': string;
}

export const SimpleCheckbox: React.FC<SimpleCheckboxProps> = (props) => {
  return <Checkbox {...props} />;
};
