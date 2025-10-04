/**
 * 增强用户体验组件
 * 提供更好的交互反馈、错误处理和用户引导
 */

import { AlertTriangle, CheckCircle, ChevronRight, HelpCircle, Info, Lightbulb, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
;

// 通知类型
type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 通知属性
interface NotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  onClose?: () => void;
}

// 工具提示属性
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

// 引导步骤
interface GuideStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

// 引导属性
interface UserGuideProps {
  steps: GuideStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

/**
 * 增强通知组件
 */
export const EnhancedNotification: React.FC<NotificationProps> = ({
  type,
  title,
  message,
  duration = 5000,
  actions = [],
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`bg-white dark:bg-gray-800 border-l-4 ${getBorderColor()} rounded-lg shadow-lg p-4 mb-4 animate-slide-in`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {message}
          </p>
          {actions?.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {actions?.map((action, index) => (
                <button
                  key={index}
                  onClick={action?.onClick}
                  className={`text-sm px-3 py-1 rounded ${action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500'
                    }`}
                >
                  {action?.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * 智能工具提示组件
 */
export const SmartTooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTimer, setShowTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setShowTimer(timer);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    if (showTimer) {
      clearTimeout(showTimer);
      setShowTimer(null);
    }
    setIsVisible(false);
  }, [showTimer]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
    }
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-50 ${getPositionClasses()}`}>
          <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg">
            {content}
            <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
                position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
                  'right-full top-1/2 -translate-y-1/2 -mr-1'
              }`} />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 用户引导组件
 */
export const UserGuide: React.FC<UserGuideProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && steps[currentStep]) {
      const element = document.querySelector(steps[currentStep].target) as HTMLElement;
      setTargetElement(element);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.position = 'relative';
        element.style.zIndex = '1001';
      }
    }
  }, [isOpen, currentStep, steps]);

  const handleNext = () => {
    if (steps[currentStep].action) {
      steps[currentStep].action!();
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    if (targetElement) {
      targetElement.style.zIndex = '';
    }
    onClose();
  };

  if (!isOpen || !steps[currentStep]) return null;

  const step = steps[currentStep];

  return (
    <>
      {/* 遮罩层 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-1000" onClick={handleClose} />

      {/* 引导卡片 */}
      <div className="fixed z-1002 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {step.title}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {step.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
              />
            ))}
          </div>

          <div className="flex space-x-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                上一步
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
            >
              {currentStep === steps.length - 1 ? '完成' : '下一步'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * 空状态组件
 */
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ icon, title, description, action }) => (
  <div className="text-center py-12">
    <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
      {icon || <HelpCircle className="w-12 h-12" />}
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-sm mx-auto">
      {description}
    </p>
    {action && (
      <button
        onClick={action?.onClick}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {action?.label}
      </button>
    )}
  </div>
);

/**
 * 智能通知Hook
 */
export const useSmartNotification = () => {
  const showNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      duration?: number;
      actions?: Array<{ label: string; onClick: () => void }>;
    }
  ) => {
    const notification = (
      <EnhancedNotification
        type={type}
        title={title}
        message={message}
        duration={options?.duration}
        actions={options?.actions}
      />
    );

    // 使用react-hot-toast显示自定义通知
    toast.custom(notification, {
      duration: options?.duration || 5000,
      position: 'top-right'
    });
  }, []);

  const showSuccess = useCallback((title: string, message: string, options?: any) => {
    showNotification('success', title, message, options);
  }, [showNotification]);

  const showError = useCallback((title: string, message: string, options?: any) => {
    showNotification('error', title, message, options);
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string, options?: any) => {
    showNotification('warning', title, message, options);
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string, options?: any) => {
    showNotification('info', title, message, options);
  }, [showNotification]);

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

const UXComponents = {
  EnhancedNotification,
  SmartTooltip,
  UserGuide,
  EmptyState,
  useSmartNotification
};

export default UXComponents;
