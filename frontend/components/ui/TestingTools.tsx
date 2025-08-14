import React from 'react';
import { Download, Play, RotateCcw, Settings, Share2, Square } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface TestingToolbarProps {
  /** 是否正在运行测试 */
  isRunning?: boolean;
  /** 是否可以开始测试 */
  canStart?: boolean;
  /** 是否可以停止测试 */
  canStop?: boolean;
  /** 是否可以重置 */
  canReset?: boolean;
  /** 是否可以下载结果 */
  canDownload?: boolean;
  /** 是否可以分享 */
  canShare?: boolean;
  /** 开始测试回调 */
  onStart?: () => void;
  /** 停止测试回调 */
  onStop?: () => void;
  /** 重置回调 */
  onReset?: () => void;
  /** 设置回调 */
  onSettings?: () => void;
  /** 下载回调 */
  onDownload?: () => void;
  /** 分享回调 */
  onShare?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 工具栏布局 */
  layout?: 'horizontal' | 'vertical';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

export const TestingToolbar: React.FC<TestingToolbarProps> = ({
  isRunning = false,
  canStart = true,
  canStop = false,
  canReset = true,
  canDownload = false,
  canShare = false,
  onStart,
  onStop,
  onReset,
  onSettings,
  onDownload,
  onShare,
  className,
  layout = 'horizontal',
  size = 'md'
}) => {
  const containerClasses = cn(
    'flex gap-2',
    layout === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
    className
  );

  return (
    <div className={containerClasses}>
      {/* 开始/停止按钮 */}
      {canStart && !isRunning && (
        <Button
          variant="primary"
          size={size}
          onClick={onStart}
          disabled={!canStart}
          icon={<Play className="w-4 h-4" />}
        >
          开始测试
        </Button>
      )}

      {canStop && isRunning && (
        <Button
          variant="danger"
          size={size}
          onClick={onStop}
          disabled={!canStop}
          icon={<Square className="w-4 h-4" />}
        >
          停止测试
        </Button>
      )}

      {/* 重置按钮 */}
      {canReset && (
        <Button
          variant="secondary"
          size={size}
          onClick={onReset}
          disabled={isRunning}
          icon={<RotateCcw className="w-4 h-4" />}
        >
          重置
        </Button>
      )}

      {/* 设置按钮 */}
      {onSettings && (
        <Button
          variant="ghost"
          size={size}
          onClick={onSettings}
          icon={<Settings className="w-4 h-4" />}
        >
          设置
        </Button>
      )}

      {/* 下载按钮 */}
      {canDownload && onDownload && (
        <Button
          variant="outline"
          size={size}
          onClick={onDownload}
          disabled={isRunning}
          icon={<Download className="w-4 h-4" />}
        >
          下载结果
        </Button>
      )}

      {/* 分享按钮 */}
      {canShare && onShare && (
        <Button
          variant="outline"
          size={size}
          onClick={onShare}
          disabled={isRunning}
          icon={<Share2 className="w-4 h-4" />}
        >
          分享
        </Button>
      )}
    </div>
  );
};

interface TestProgressProps {
  /** 当前步骤 */
  currentStep?: string;
  /** 进度百分比 */
  progress?: number;
  /** 总步骤数 */
  totalSteps?: number;
  /** 当前步骤索引 */
  currentStepIndex?: number;
  /** 步骤列表 */
  steps?: string[];
  /** 是否显示详细进度 */
  showDetails?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const TestProgress: React.FC<TestProgressProps> = ({
  currentStep,
  progress = 0,
  totalSteps,
  currentStepIndex = 0,
  steps = [],
  showDetails = true,
  className
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {/* 当前步骤信息 */}
      {currentStep && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">{currentStep}</span>
          <span className="text-gray-400">
            {Math.round(progress)}%
          </span>
        </div>
      )}

      {/* 进度条 */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 步骤详情 */}
      {showDetails && steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-2 text-xs',
                index < currentStepIndex ? 'text-green-400' :
                  index === currentStepIndex ? 'text-blue-400' :
                    'text-gray-500'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  index < currentStepIndex ? 'bg-green-400' :
                    index === currentStepIndex ? 'bg-blue-400' :
                      'bg-gray-600'
                )}
              />
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* 步骤计数 */}
      {totalSteps && (
        <div className="text-xs text-gray-400 text-center">
          步骤 {currentStepIndex + 1} / {totalSteps}
        </div>
      )}
    </div>
  );
};

interface TestResultSummaryProps {
  /** 测试状态 */
  status: 'success' | 'error' | 'warning' | 'info';
  /** 测试标题 */
  title: string;
  /** 测试描述 */
  description?: string;
  /** 测试指标 */
  metrics?: Array<{
    label: string;
    value: string | number;
    unit?: string;
    status?: 'good' | 'warning' | 'error';
  }>;
  /** 自定义类名 */
  className?: string;
}

export const TestResultSummary: React.FC<TestResultSummaryProps> = ({
  status,
  title,
  description,
  metrics = [],
  className
}) => {
  const statusConfig = {
    success: {
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      icon: '✅'
    },
    error: {
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      icon: '❌'
    },
    warning: {
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      icon: '⚠️'
    },
    info: {
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      icon: 'ℹ️'
    }
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {/* 标题区域 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{config.icon}</span>
        <h3 className={cn('font-semibold', config.textColor)}>
          {title}
        </h3>
      </div>

      {/* 描述 */}
      {description && (
        <p className="text-sm text-gray-300 mb-3">
          {description}
        </p>
      )}

      {/* 指标 */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <div className="text-lg font-bold text-white">
                {metric.value}{metric.unit || ''}
              </div>
              <div className="text-xs text-gray-400">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestingToolbar;
