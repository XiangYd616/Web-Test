/**
 * 统一交互反馈组件
 * 为所有测试页面提供一致的用户反馈体验，但不强制替换现有反馈机制
 */

import type { useEffect, useState, ReactNode, ComponentType, FC } from 'react';
import { UnifiedIcon, TestStatusIcon, InfoIcon } from './UnifiedIcons';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Loader } from 'lucide-react';

// 反馈类型
export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// 反馈位置
export type FeedbackPosition = 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// 反馈大小
export type FeedbackSize = 'sm' | 'md' | 'lg';

// 基础反馈属性
export interface BaseFeedbackProps {
  type: FeedbackType;
  title?: string;
  message: string;
  size?: FeedbackSize;
  className?: string;
  onClose?: () => void;
  closable?: boolean;
  icon?: boolean;
}

// 通知属性
export interface NotificationProps extends BaseFeedbackProps {
  duration?: number;
  position?: FeedbackPosition;
  persistent?: boolean;
}

// 状态指示器属性
export interface StatusIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  text?: string;
  size?: FeedbackSize;
  showIcon?: boolean;
  className?: string;
}

// 进度反馈属性
export interface ProgressFeedbackProps {
  progress: number;
  status: 'running' | 'completed' | 'failed';
  currentStep?: string;
  showPercentage?: boolean;
  size?: FeedbackSize;
  className?: string;
}

/**
 * 统一反馈卡片组件
 */
export const FeedbackCard: React.FC<BaseFeedbackProps> = ({
  type,
  title,
  message,
  size = 'md',
  className = '',
  onClose,
  closable = false,
  icon = true
}) => {
  // 类型样式映射
  const typeStyles = {
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    loading: 'bg-gray-500/10 border-gray-500/20 text-gray-400'
  };

  // 图标映射
  const iconMap = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
    loading: Loader
  };

  // 尺寸样式
  const sizeStyles = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-base',
    lg: 'p-6 text-lg'
  };

  const IconComponent = iconMap[type];

  return (
    <div className={`
      ${typeStyles[type]}
      ${sizeStyles[size]}
      ${className}
      border rounded-xl backdrop-blur-sm
      transition-all duration-300 ease-in-out
    `}>
      <div className="flex items-start space-x-3">
        {/* 图标 */}
        {icon && (
          <div className="flex-shrink-0 mt-0.5">
            <UnifiedIcon
              icon={IconComponent}
              size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
              color="current"
              className={type === 'loading' ? 'animate-spin' : ''}
            />
          </div>
        )}

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold mb-1">{title}</h4>
          )}
          <p className="opacity-90">{message}</p>
        </div>

        {/* 关闭按钮 */}
        {closable && onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="关闭"
          >
            <UnifiedIcon icon={X} size="sm" color="current" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * 通知组件
 */
export const Notification: React.FC<NotificationProps> = ({
  duration = 5000,
  position = 'top-right',
  persistent = false,
  ...feedbackProps
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!persistent && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          feedbackProps.onClose?.();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, persistent, feedbackProps.onClose]);

  // 位置样式
  const positionStyles = {
    'top': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom': 'bottom-4 left-1/2 transform -translate-x-1/2',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  if (!visible) return null;

  return (
    <div className={`
      fixed z-50 max-w-md
      ${positionStyles[position]}
      transition-all duration-300 ease-in-out
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
    `}>
      <FeedbackCard
        {...feedbackProps}
        closable={true}
        onClose={() => setVisible(false)}
      />
    </div>
  );
};

/**
 * 状态指示器组件
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  text,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  // 状态样式映射
  const statusStyles = {
    idle: 'text-gray-400',
    loading: 'text-blue-400',
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400'
  };

  // 尺寸样式
  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`
      flex items-center space-x-2
      ${statusStyles[status]}
      ${sizeStyles[size]}
      ${className}
    `}>
      {showIcon && (
        <TestStatusIcon
          status={status === 'loading' ? 'running' : status === 'idle' ? 'idle' : status}
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
          animated={status === 'loading'}
        />
      )}
      {text && <span>{text}</span>}
    </div>
  );
};

/**
 * 进度反馈组件
 */
export const ProgressFeedback: React.FC<ProgressFeedbackProps> = ({
  progress,
  status,
  currentStep,
  showPercentage = true,
  size = 'md',
  className = ''
}) => {
  // 状态颜色映射
  const statusColors = {
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500'
  };

  // 尺寸样式
  const sizeStyles = {
    sm: { height: 'h-1', text: 'text-xs' },
    md: { height: 'h-2', text: 'text-sm' },
    lg: { height: 'h-3', text: 'text-base' }
  };

  const styles = sizeStyles[size];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 进度信息 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <StatusIndicator
            status={status === 'running' ? 'loading' : status === 'completed' ? 'success' : 'error'}
            text={currentStep}
            size={size}
          />
        </div>
        {showPercentage && (
          <span className={`font-medium ${styles.text}`}>
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {/* 进度条 */}
      <div className={`w-full bg-gray-700 rounded-full ${styles.height} overflow-hidden`}>
        <div
          className={`
            ${styles.height} rounded-full transition-all duration-300 ease-out
            ${statusColors[status]}
          `}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

/**
 * 加载状态组件
 */
export const LoadingFeedback: React.FC<{
  message?: string;
  size?: FeedbackSize;
  className?: string;
}> = ({
  message = '加载中...',
  size = 'md',
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center space-x-3 ${className}`}>
      <UnifiedIcon
        icon={Loader}
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
        color="primary"
        className="animate-spin"
      />
      <span className={`
        ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}
        text-gray-300
      `}>
        {message}
      </span>
    </div>
  );
};

/**
 * 空状态组件
 */
export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<any>;
  className?: string;
}> = ({
  title,
  description,
  action,
  icon: Icon,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && (
        <div className="mb-4">
          <UnifiedIcon
            icon={Icon}
            size="2xl"
            color="muted"
            className="mx-auto"
          />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
};

/**
 * 反馈使用示例组件（用于文档）
 */
export const FeedbackUsageGuide: React.FC = () => {
  const [showNotification, setShowNotification] = useState(false);

  return (
    <div className="space-y-8 p-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold">统一反馈系统使用指南</h2>

      {/* 反馈卡片示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">反馈卡片</h3>
        <div className="space-y-4">
          <FeedbackCard type="success" message="测试执行成功！" />
          <FeedbackCard type="error" title="测试失败" message="连接超时，请检查网络设置" />
          <FeedbackCard type="warning" message="部分测试项目未通过" />
          <FeedbackCard type="info" message="正在准备测试环境..." />
          <FeedbackCard type="loading" message="测试正在进行中..." />
        </div>
      </div>

      {/* 状态指示器示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">状态指示器</h3>
        <div className="space-y-2">
          <StatusIndicator status="idle" text="等待开始" />
          <StatusIndicator status="loading" text="测试进行中..." />
          <StatusIndicator status="success" text="测试完成" />
          <StatusIndicator status="error" text="测试失败" />
          <StatusIndicator status="warning" text="部分通过" />
        </div>
      </div>

      {/* 进度反馈示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">进度反馈</h3>
        <div className="space-y-4">
          <ProgressFeedback
            progress={65}
            status="running"
            currentStep="正在分析性能指标..."
          />
          <ProgressFeedback
            progress={100}
            status="completed"
            currentStep="测试完成"
          />
          <ProgressFeedback
            progress={45}
            status="failed"
            currentStep="连接失败"
          />
        </div>
      </div>

      {/* 通知示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">通知</h3>
        <button
          onClick={() => setShowNotification(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          显示通知
        </button>
        {showNotification && (
          <Notification
            type="success"
            title="操作成功"
            message="测试配置已保存"
            onClose={() => setShowNotification(false)}
          />
        )}
      </div>

      {/* 加载状态示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">加载状态</h3>
        <LoadingFeedback message="正在加载测试数据..." />
      </div>

      {/* 空状态示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">空状态</h3>
        <div className="bg-gray-800 rounded-xl p-6">
          <EmptyState
            title="暂无测试历史"
            description="开始您的第一个测试，测试结果将显示在这里"
            action={
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                开始测试
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default FeedbackCard;
