import React from 'react';import { AlertTriangle, Trash2, X    } from 'lucide-react';interface DeleteConfirmDialogProps   {'
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemNames?: string[];
  isLoading?: boolean;
  type?: 'single' | 'batch';
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemNames = [],
  isLoading = false,
  type = 'single';
}) => {
  
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,
    style: computedStyle,
    disabled,
    'aria-label': ariaLabel,'
    'data-testid': testId'
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;`
  const descriptionId = `${componentId}-description`;`
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`
    'aria-labelledby': ariaLabelledBy,'
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,'
    'aria-invalid': !!error,'
    'aria-disabled': disabled,'
    'aria-busy': loading,'
    'aria-expanded': expanded,'
    "aria-selected': selected,'
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (<div 
      className= 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      onClick={handleBackdropClick}
    >
      <div className= 'bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden'>
        {/* 头部 */}
        <div className= 'flex items-center justify-between p-6 border-b border-gray-700'>
          <div className= 'flex items-center gap-3'>
            <div className= 'p-2 bg-red-600/20 rounded-lg'>
              <AlertTriangle className= 'w-5 h-5 text-red-400'    />
            </div>
            <h3 className= 'text-lg font-semibold text-white'>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className= 'p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors';
          >
            <X className= 'w-5 h-5'    />
          </button>
        </div>

        {/* 内容 */}
        <div className= 'p-6'>
          <p className= 'text-gray-300 mb-4'>
            {message}
          </p>

          {/* 显示要删除的项目列表 */}
          {itemNames.length > 0 && (
            <div className= 'mb-4'>
              <p className= 'text-sm text-gray-400 mb-2'>
                {type === 'batch' ? '将要删除的记录：" : "删除的记录：'}'
              </p>
              <div className= 'bg-gray-900/50 rounded-lg p-3 max-h-32 overflow-y-auto'>
                {itemNames.map((name, index) => (
                  <div key={index} className= 'flex items-center gap-2 text-sm text-gray-300 py-1'>
                    <Trash2 className= 'w-3 h-3 text-red-400 flex-shrink-0'    />
                    <span className= 'truncate'>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 警告信息 */}
          <div className= 'bg-red-600/10 border border-red-600/20 rounded-lg p-3 mb-4'>
            <div className= 'flex items-start gap-2'>
              <AlertTriangle className= 'w-4 h-4 text-red-400 mt-0.5 flex-shrink-0'    />
              <div className= 'text-sm text-red-300'>
                <p className= 'font-medium mb-1'>⚠️ 重要提醒</p>
                <p>此操作无法撤销，删除后将无法恢复测试记录的所有数据，包括：</p>
                <ul className= 'list-disc list-inside mt-1 space-y-0.5 text-xs'>
                  <li>测试配置和参数</li>
                  <li>实时监控数据</li>
                  <li>性能指标和图表</li>
                  <li>测试报告和分析结果</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className= 'flex gap-3 p-6 border-t border-gray-700 bg-gray-800/50'>
          <button
            onClick={onClose}
            disabled={isLoading}
            className= 'flex-1 px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className= 'flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
          >
            {isLoading ? (
              <>
                <div className= 'w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                删除中...
              </>
            ) : (
              <>
                <Trash2 className= 'w-4 h-4'    />
                确认删除
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
