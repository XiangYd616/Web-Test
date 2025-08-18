/**
 * 通用错误显示组件
 * 提供统一的错误信息展示
 */

import React from 'react';export interface ErrorDisplayProps     {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
  type?: 'standard' | 'inline' | 'minimal
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  className = ',
  type = 'standard
}) => {
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  const errorMessage = typeof error === 'string' ? error : error.message;
  if (type === 'inline') {
    return (
      <div className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 ${className}`}>
        <strong className="font-bold'>错误: </strong>
        <span className='block sm:inline'>{errorMessage}</span>
      </div>
    );
  }

  if (type === 'minimal') {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        {errorMessage}
      </div>
    );
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
      <div className="flex'>
        <div className='flex-shrink-0'>
          <svg className= 'h-5 w-5 text-red-400' viewBox= '0 0 20 20' fill='currentColor'>
            <path fillRule= 'evenodd' d= 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule='evenodd' />
          </svg>
        </div>
        <div className='ml-3'>
          <h3 className='text-sm font-medium text-red-800'>操作失败</h3>
          <div className='mt-2 text-sm text-red-700'>
            <p>{errorMessage}</p>
          </div>
          {onRetry && (
            <div className='mt-4'>
              <button
                onClick={onRetry}
                className= 'bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200
              >
                重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;