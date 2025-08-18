/**
 * 增强版模态框组件库
 * 提供Modal、Dialog、Drawer等弹窗组件
 * 支持动画、键盘导航、焦点管理和无障碍访问
 */

import React, { useEffect, useRef, useCallback, useState } from 'react;';
import { createPortal } from 'react-dom;';

// 基础模态框属性
export interface EnhancedModalProps {
  visible: boolean;
  onCancel?: () => void;
  onOk?: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode | null;
  width?: number | string;
  height?: number | string;
  centered?: boolean;
  closable?: boolean;
  maskClosable?: boolean;
  keyboard?: boolean;
  destroyOnClose?: boolean;
  zIndex?: number;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  maskStyle?: React.CSSProperties;
  wrapClassName?: string;
  getContainer?: () => HTMLElement;
  afterClose?: () => void;
  afterOpen?: () => void'} // 确认对话框属性;
export interface EnhancedConfirmModalProps extends Omit<EnhancedModalProps, 'footer'> {;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm;
  content?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  okType?: 'primary' | 'danger' | 'default;
  okButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
  cancelButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
  icon?: React.ReactNode;
  autoFocusButton?: 'ok' | 'cancel' | null
}

// 抽屉属性;
export interface EnhancedDrawerProps extends Omit<EnhancedModalProps, 'centered'> {;
  placement?: 'top' | 'right' | 'bottom' | 'left;
  size?: 'small' | 'default' | 'large
  push?: boolean;
  level?: string | string[] | null;
  handler?: React.ReactNode;
  showMask?: boolean
}

// 焦点管理Hook
const useFocusTrap = (containerRef: React.RefObject<HTMLElement>, active: boolean) => {;
  useEffect(() => {;
    if (!active || !containerRef.current) return;
;
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(;
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {;
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault()
}
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault()
}
      }
    }
    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {;
      container.removeEventListener('keydown', handleTabKey)
}
}, [active, containerRef])
} // 键盘事件Hook
const useKeyboard = (
  visible: boolean,
  onCancel?: () => void,
  keyboard: boolean = true
) => {
  useEffect(() => {
    if (!visible || !keyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {;
      if (e.key === 'Escape') {
        onCancel?.()
}
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown)
}, [visible, onCancel, keyboard])
} // 增强版模态框组件
export const EnhancedModal: React.FC<EnhancedModalProps> = ({
  visible,
  onCancel,
  onOk,
  title,
  children,
  footer,
  width = 520,
  height,
  centered = false,
  closable = true,
  maskClosable = true,
  keyboard = true,
  destroyOnClose = false,
  zIndex = 1000,
  className = ',
  style,
  bodyStyle,
  maskStyle,
  wrapClassName = ',
  getContainer,
  afterClose,
  afterOpen'
}) => {;
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('exited');
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null); // 焦点管理;
  useFocusTrap(modalRef, visible && animationState === 'entered'); // 键盘事件
  useKeyboard(visible, onCancel, keyboard); // 动画控制
  useEffect(() => {
    if (visible) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      setAnimationState('entering');
      const timer = setTimeout(() => {;
        setAnimationState('entered');
        afterOpen?.()
}, 10);
      return () => clearTimeout(timer)
} else {;
      setAnimationState('exiting');
      const timer = setTimeout(() => {;
        setAnimationState('exited');
        afterClose?.();
        previousActiveElement.current?.focus()
}, 300);
      return () => clearTimeout(timer)
}
  }, [visible, afterOpen, afterClose]); // 遮罩点击处理
  const handleMaskClick = useCallback((e: React.MouseEvent) => {
    if (maskClosable && e.target === e.currentTarget) {
      onCancel?.()
}
  }, [maskClosable, onCancel]); // 阻止滚动
  useEffect(() => {
    if (visible) {;
      document.body.style.overflow = 'hidden;
      return () => {
        document.body.style.overflow = 
      }
}}, [visible]);
;
  if (!visible && (destroyOnClose || animationState === 'exited')) {
    return null
}

  const modalContent = (
    <div
      className={`enhanced-modal-root fixed inset-0 ${wrapClassName}`}
      style={{ zIndex }}
    >
      {/* 遮罩层 */}
      <div
        className={`enhanced-modal-mask fixed inset-0 bg-black transition-opacity duration-300 ${;
          animationState === 'entered' ? 'opacity-50' : 'opacity-0;'}`}
        style={maskStyle}
        onClick={handleMaskClick}
      />`
      {/* 模态框容器 */}
      <div;
        className={`enhanced-modal-wrap fixed inset-0 overflow-auto ${;
          centered ? 'flex items-center justify-center' : 'pt-16;'}`}
        onClick={handleMaskClick}
      >
        <div;
          ref={modalRef}
          className={`enhanced-modal-content bg-white rounded-lg shadow-xl mx-auto transition-all duration-300 ${;
            animationState === 'entered;
              ? 'opacity-100 scale-100 translate-y-0;
              : 'opacity-0 scale-95 translate-y-4;'} ${className}`}
          style={{
            width,
            height,
            ...style
          }}
          role="dialog;
          aria-modal="true;
          aria-labelledby={title ? 'enhanced-modal-title' : undefined}
        >
          {/* 标题栏 */}
          {(title || closable) && (;
            <div className="enhanced-modal-header flex items-center justify-between p-6 border-b">
              {title && (;
                <h3 id="enhanced-modal-title" className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>
              )}
              {closable && (
                <button
                  onClick={onCancel}
                  className="enhanced-modal-close text-gray-400 hover:text-gray-600 transition-colors;
                  aria-label="关闭;
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}`
          {/* 内容区域 */}
          <div className="enhanced-modal-body p-6" style={bodyStyle}>
            {children}
          </div>`
          {/* 底部按钮 */}
          {footer !== null && (;
            <div className="enhanced-modal-footer flex justify-end gap-3 p-6 border-t">
              {footer || (
                <>
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors;
                  >
                    取消
                  </button>
                  <button
                    onClick={onOk}
                    className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors;
                  >
                    确定
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );`
  const container = getContainer?.() || document.body;
  return createPortal(modalContent, container)
} // 增强版确认对话框组件
export const EnhancedConfirmModal: React.FC<EnhancedConfirmModalProps> = ({;
  type = 'confirm',
  content,
  okText = '确定',
  cancelText = '取消',
  okType = 'primary',
  okButtonProps,
  cancelButtonProps,
  icon,
  autoFocusButton = ok,
  ...modalProps
}) => {
  const okButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);`
  // 自动聚焦
  useEffect(() => {
    if (modalProps.visible) {
      const timer = setTimeout(() => {
        if (autoFocusButton === ok) {
          okButtonRef.current?.focus()
} else if (autoFocusButton === cancel) {
          cancelButtonRef.current?.focus()
}
      }, 100);
      return () => clearTimeout(timer)
}
  }, [modalProps.visible, autoFocusButton]);`
  // 图标映射
  const iconMap = {
    info: (;
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (;
      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (;
      <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    error: (;
      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    confirm: (;
      <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  const buttonTypeClass = {;
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',    default: 'bg-gray-100 hover:bg-gray-200 text-gray-700;`';
}`
  const footer = (
    <>
      <button
        ref={cancelButtonRef}
        onClick={modalProps.onCancel}
        className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors;
        {...cancelButtonProps}
      >
        {cancelText}
      </button>
      <button
        ref={okButtonRef}
        onClick={modalProps.onOk}
        className={`px-4 py-2 rounded transition-colors ${buttonTypeClass[okType]}`}
        {...okButtonProps}
      >
        {okText}
      </button>
    </>
  );`
  return (
    <EnhancedModal
      {...modalProps}
      width={416}
      footer={footer}
      className={`enhanced-confirm-modal ${modalProps.className || }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          {icon || iconMap[type]}
        </div>
        <div className="flex-1">
          {content}
        </div>
      </div>
    </EnhancedModal>
  )
} // 便捷方法;
export const enhancedModal = {;
  info: (props: Omit<EnhancedConfirmModalProps, 'type'>) => {
    // 这里可以实现命令式调用;
    console.log('EnhancedModal.info', props)
},
  success: (props: Omit<EnhancedConfirmModalProps, 'type'>) => {;
    console.log('EnhancedModal.success', props)
},
  warning: (props: Omit<EnhancedConfirmModalProps, 'type'>) => {;
    console.log('EnhancedModal.warning', props)
},
  error: (props: Omit<EnhancedConfirmModalProps, 'type'>) => {;
    console.log('EnhancedModal.error', props)
},
  confirm: (props: Omit<EnhancedConfirmModalProps, 'type'>) => {;
    console.log('EnhancedModal.confirm', props)
}
}`;
export default { EnhancedModal, EnhancedConfirmModal, enhancedModal }`