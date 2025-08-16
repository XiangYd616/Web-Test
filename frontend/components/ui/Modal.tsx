import React, { useEffect, useRef    } from 'react';import { X    } from 'lucide-react';import { createPortal    } from 'react-dom';import { cn    } from '../../utils/cn';import { Button, IconButton    } from './Button';interface ModalProps   {'
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  children: React.ReactNode;
  className?: string;
}

const modalSizes = {
  xs: 'max-w-xs','
  sm: 'max-w-sm','
  md: 'max-w-md','
  lg: 'max-w-lg','
  xl: 'max-w-xl','
  full: 'max-w-full mx-4';
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md','
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  children,
  className
}) => {
  
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,
    style: computedStyle,
    disabled,
    'aria-label': ariaLabel,'
    "data-testid': testId'
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const [state, setState] = useState({
    value: defaultValue,
    loading: false,
    error: null,
    touched: false,
    focused: false
  });
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 处理ESC键关闭
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {'
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);'
    return () => document.removeEventListener("keydown', handleEscape);'
  }, [isOpen, closeOnEscape, onClose]);

  // 焦点管理
  useEffect(() => {
    if (isOpen) {
      // 保存当前焦点元素
      previousFocusRef.current = document.activeElement as HTMLElement;

      // 聚焦到模态框
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
    } else {
      // 恢复之前的焦点
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 处理背景点击
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Focus trap - 简单实现
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {'
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex= '-1'])';
      );

      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className= 'fixed inset-0 z-50 flex items-center justify-center p-4';
      onClick={handleBackdropClick}
    >
      {/* 背景遮罩 */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300','
          isOpen ? 'opacity-100' : 'opacity-0';
        )}
      />

      {/* 模态框内容 */}
      <div
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative w-full bg-gray-800 rounded-lg shadow-xl border border-gray-700','
          'transform transition-all duration-300 ease-out','
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900','
          isOpen ? 'scale-100 opacity-100' : "scale-95 opacity-0','
          modalSizes[size],
          className
        )}
      >
        {/* 头部 */}
        {(title || showCloseButton) && (
          <div className= 'flex items-center justify-between p-6 border-b border-gray-700'>
            <div>
              {title && (
                <h2 className= 'text-lg font-semibold text-white'>
                  {title}
                </h2>
              )}
              {description && (
                <p className= 'mt-1 text-sm text-gray-400'>
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <IconButton icon={<X className= 'w-4 h-4'    />}'
                variant= 'ghost';
                size= 'sm';
                onClick={onClose}
                aria-label= '关闭模态框';
                className= 'text-gray-400 hover:text-white';
              />
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div className= 'p-6'>
          {children}
        </div>
      </div>
    </div>
  );

  // 使用Portal渲染到body
  return createPortal(modalContent, document.body);
};

// 模态框头部组件
interface ModalHeaderProps   {
  children: React.ReactNode;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, className }) => (
  <div className={cn("mb-4', className)}>
    {children}
  </div>
);

// 模态框主体组件
interface ModalBodyProps   {
  children: React.ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => (
  <div className={cn("', className)}>
    {children}
  </div>
);

// 模态框底部组件
interface ModalFooterProps   {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => (
  <div className={cn("flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-700', className)}>
    {children}
  </div>
);

// 确认对话框组件
interface ConfirmModalProps   {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认','
  cancelText = '取消','
  variant = 'danger';
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size= 'sm';
    >
      <ModalBody>
        <p className= 'text-gray-300'>{message}</p>
      </ModalBody>

      <ModalFooter>
        <Button
          variant= 'ghost';
          onClick={onClose}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === 'warning' || variant === 'info' ? 'primary' : variant}'
          onClick={handleConfirm}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
