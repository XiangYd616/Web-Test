/**
 * 共享测试进度条组件
 * 为各个独立测试页面提供统一的进度显示
 */

import React from 'react';
import { Activity, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

export interface TestProgressBarProps {
  progress: number;
  currentStep: string;
  isRunning: boolean;
  error?: string | null;
  startTime?: number | null;
  estimatedDuration?: number;
  showDetails?: boolean;
  className?: string;
}

/**
 * 共享测试进度条
 * 提供统一的进度显示界面
 */
export const TestProgressBar: React.FC<TestProgressBarProps> = ({
  progress,
  currentStep,
  isRunning,
  error,
  startTime,
  estimatedDuration,
  showDetails = true,
  className = ''
}) => {
  // 计算已用时间
  const elapsedTime = startTime ? Date.now() - startTime : 0;
  const elapsedSeconds = Math.floor(elapsedTime / 1000);
  
  // 估算剩余时间
  const estimatedRemaining = estimatedDuration && progress > 0 
    ? Math.max(0, estimatedDuration - elapsedSeconds)
    : null;

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  };

  // 获取状态图标和颜色
  const getStatusIcon = () => {
    if (error) {
      return <XCircle className="w-5 h-5 text-red-400" />;
    }
    if (progress >= 100) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    if (isRunning) {
      return <Loader className="w-5 h-5 text-blue-400 animate-spin" />;
    }
    return <Activity className="w-5 h-5 text-gray-400" />;
  };

  const getProgressColor = () => {
    if (error) return 'bg-red-600';
    if (progress >= 100) return 'bg-green-600';
    return 'bg-blue-600';
  };

  const getBackgroundColor = () => {
    if (error) return 'bg-red-900/20 border-red-500/30';
    if (progress >= 100) return 'bg-green-900/20 border-green-500/30';
    if (isRunning) return 'bg-blue-900/20 border-blue-500/30';
    return 'bg-gray-900/20 border-gray-500/30';
  };

  return (
    <div className={`themed-bg-card rounded-lg border p-4 ${getBackgroundColor()} ${className}`}>
      {/* 进度头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium themed-text-primary">
            {error ? '测试失败' : progress >= 100 ? '测试完成' : isRunning ? '测试进行中' : '准备测试'}
          </span>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          {/* 进度百分比 */}
          <span className="font-mono">
            {Math.round(progress)}%
          </span>
          
          {/* 时间信息 */}
          {showDetails && startTime && (
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatTime(elapsedSeconds)}</span>
              {estimatedRemaining !== null && (
                <span className="text-gray-500">
                  / 剩余约{formatTime(estimatedRemaining)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-gray-700 rounded-full h-3 mb-3 overflow-hidden">
        <div 
          className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        >
          {/* 进度条动画效果 */}
          {isRunning && (
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          )}
        </div>
      </div>

      {/* 当前步骤 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-300 flex-1">
          {currentStep || (error ? error : '等待开始...')}
        </p>
        
        {/* 详细信息 */}
        {showDetails && (
          <div className="text-xs text-gray-500 ml-4">
            {isRunning && progress > 0 && progress < 100 && (
              <span>正在执行...</span>
            )}
            {progress >= 100 && !error && (
              <span className="text-green-400">✓ 已完成</span>
            )}
            {error && (
              <span className="text-red-400">✗ 失败</span>
            )}
          </div>
        )}
      </div>

      {/* 错误详情 */}
      {error && showDetails && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-md">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* 成功完成的额外信息 */}
      {progress >= 100 && !error && showDetails && elapsedTime > 0 && (
        <div className="mt-3 p-3 bg-green-900/30 border border-green-500/50 rounded-md">
          <p className="text-sm text-green-300">
            测试成功完成，耗时 {formatTime(elapsedSeconds)}
          </p>
        </div>
      )}
    </div>
  );
};

export default TestProgressBar;
