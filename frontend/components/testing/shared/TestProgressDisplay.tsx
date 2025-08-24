/**
 * 可选的统一测试进度显示组件
 * 各个测试页面可以选择使用，不强制替换现有实现
 */

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader, Play,
  RotateCcw,
  Square,
  Timer,
  Users,
  XCircle,
  Zap
} from 'lucide-react';
import React from 'react';

// 测试状态类型 - 使用统一类型系统
import type { TestStatus } from '../../../types';

// 队列统计接口
export interface QueueStats {
  totalRunning: number;
  totalQueued: number;
  maxConcurrent: number;
  estimatedWaitTime: number;
}

// 进度显示属性
export interface TestProgressDisplayProps {
  status: TestStatus;
  progress?: number;
  message?: string;
  currentStep?: string;
  testId?: string;
  startTime?: Date;
  endTime?: Date;
  queueStats?: QueueStats;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onReset?: () => void;
  showControls?: boolean;
  showQueueInfo?: boolean;
  showTimeInfo?: boolean;
  compact?: boolean;
}

/**
 * 可选的统一测试进度显示组件
 */
export const TestProgressDisplay: React.FC<TestProgressDisplayProps> = ({
  status,
  progress = 0,
  message = '',
  currentStep = '',
  testId,
  startTime,
  endTime,
  queueStats,
  error,
  onCancel,
  onRetry,
  onReset,
  showControls = true,
  showQueueInfo = true,
  showTimeInfo = true,
  compact = false
}) => {
  /**
   * 获取状态图标和颜色
   */
  const getStatusInfo = () => {
    switch (status) {
      case 'idle':
        return {
          icon: Activity,
          color: 'text-gray-400',
          bgColor: 'bg-gray-600/20',
          label: '准备就绪'
        };
      case 'starting':
        return {
          icon: Play,
          color: 'text-blue-400',
          bgColor: 'bg-blue-600/20',
          label: '正在启动'
        };
      case 'queued':
        return {
          icon: Clock,
          color: 'text-orange-400',
          bgColor: 'bg-orange-600/20',
          label: '排队等待'
        };
      case 'running':
        return {
          icon: Loader,
          color: 'text-blue-400',
          bgColor: 'bg-blue-600/20',
          label: '正在运行',
          animate: true
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-600/20',
          label: '测试完成'
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-600/20',
          label: '测试失败'
        };
      case 'cancelled':
        return {
          icon: Square,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-600/20',
          label: '已取消'
        };
      case 'stopping':
        return {
          icon: Square,
          color: 'text-orange-400',
          bgColor: 'bg-orange-600/20',
          label: '正在停止'
        };
      default:
        return {
          icon: Activity,
          color: 'text-gray-400',
          bgColor: 'bg-gray-600/20',
          label: '未知状态'
        };
    }
  };

  /**
   * 计算运行时间
   */
  const getRunningTime = (): string => {
    if (!startTime) return '';

    const endTimeToUse = endTime || new Date();
    const duration = endTimeToUse.getTime() - startTime.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  };

  /**
   * 格式化队列等待时间
   */
  const formatWaitTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}分钟`;
    } else {
      return `${Math.floor(seconds / 3600)}小时`;
    }
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;
  const isRunning = ['starting', 'running', 'stopping'].includes(status);
  const isCompleted = ['completed', 'failed', 'cancelled'].includes(status);

  // 紧凑模式
  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
          <IconComponent
            className={`w-4 h-4 ${statusInfo.color} ${statusInfo.animate ? 'animate-spin' : ''}`}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">{statusInfo.label}</span>
            {isRunning && (
              <span className="text-blue-400 text-sm">{progress.toFixed(0)}%</span>
            )}
          </div>
          {message && (
            <p className="text-gray-400 text-xs mt-1">{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      {/* 状态标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${statusInfo.bgColor}`}>
            <IconComponent
              className={`w-6 h-6 ${statusInfo.color} ${statusInfo.animate ? 'animate-spin' : ''}`}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{statusInfo.label}</h3>
            {testId && (
              <p className="text-gray-400 text-sm font-mono">ID: {testId}</p>
            )}
          </div>
        </div>

        {/* 控制按钮 */}
        {showControls && (
          <div className="flex items-center space-x-2">
            {isRunning && onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors flex items-center space-x-2"
              >
                <Square className="w-4 h-4" />
                <span>取消</span>
              </button>
            )}

            {status === 'failed' && onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重试</span>
              </button>
            )}

            {isCompleted && onReset && (
              <button
                onClick={onReset}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors flex items-center space-x-2"
              >
                <Activity className="w-4 h-4" />
                <span>重置</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 进度条 */}
      {isRunning && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">进度</span>
            <span className="text-blue-400 text-sm font-medium">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* 当前步骤和消息 */}
      {(currentStep || message) && (
        <div className="mb-4">
          {currentStep && (
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-sm font-medium">{currentStep}</span>
            </div>
          )}
          {message && (
            <p className="text-gray-300 text-sm">{message}</p>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">错误信息</span>
          </div>
          <p className="text-red-300 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* 队列信息 */}
      {showQueueInfo && status === 'queued' && queueStats && (
        <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm font-medium">队列信息</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">当前运行:</span>
              <span className="text-orange-300 ml-2">{queueStats.totalRunning}</span>
            </div>
            <div>
              <span className="text-gray-400">队列等待:</span>
              <span className="text-orange-300 ml-2">{queueStats.totalQueued}</span>
            </div>
            <div>
              <span className="text-gray-400">最大并发:</span>
              <span className="text-orange-300 ml-2">{queueStats.maxConcurrent}</span>
            </div>
            <div>
              <span className="text-gray-400">预计等待:</span>
              <span className="text-orange-300 ml-2">
                {formatWaitTime(queueStats.estimatedWaitTime)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 时间信息 */}
      {showTimeInfo && (startTime || endTime) && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            {startTime && (
              <div className="flex items-center space-x-2">
                <Timer className="w-4 h-4" />
                <span>开始: {startTime.toLocaleTimeString()}</span>
              </div>
            )}
            {endTime && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>结束: {endTime.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          {startTime && (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>用时: {getRunningTime()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestProgressDisplay;
