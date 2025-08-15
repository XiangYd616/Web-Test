/**
 * 实时进度条组件
 * 显示测试的实时进度和状态
 */

import { AlertCircle, CheckCircle, Loader, Wifi, WifiOff, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTestProgress } from '../../hooks/useWebSocket';

interface RealTimeProgressBarProps {
  testId?: string;
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
  className?: string;
  showDetails?: boolean;
  autoStart?: boolean;
}

const RealTimeProgressBar: React.FC<RealTimeProgressBarProps> = ({
  testId,
  onComplete,
  onError,
  className = '',
  showDetails = true,
  autoStart = true
}) => {
  const {
    isConnected,
    progress,
    currentStep,
    totalSteps,
    message,
    status,
    results,
    error,
    subscribeToTest,
    unsubscribeFromTest,
    clearTestData
  } = useTestProgress(testId);

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // 计算经过时间
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === 'running' && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime.getTime());
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status, startTime]);

  // 监听状态变化
  useEffect(() => {
    if (status === 'running' && !startTime) {
      setStartTime(new Date());
    } else if (status === 'completed' || status === 'failed') {
      if (status === 'completed' && results && onComplete) {
        onComplete(results);
      } else if (status === 'failed' && error && onError) {
        onError(error);
      }
    }
  }, [status, results, error, onComplete, onError, startTime]);

  // 格式化时间
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  // 获取状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader className="w-5 h-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  // 获取状态颜色
  const getProgressColor = () => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (status) {
      case 'running':
        return '测试进行中';
      case 'completed':
        return '测试完成';
      case 'failed':
        return '测试失败';
      case 'cancelled':
        return '测试已取消';
      default:
        return '等待开始';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* 连接状态指示器 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">测试进度</h3>
          {testId && (
            <span className="text-sm text-gray-500">#{testId.slice(-8)}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-1 text-green-600">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">已连接</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-600">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">未连接</span>
            </div>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm font-medium text-gray-700">
              {getStatusText()}
            </span>
          </div>

          <div className="text-sm text-gray-500">
            {progress}%
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="space-y-2">
          {/* 当前步骤 */}
          {totalSteps > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">步骤进度:</span>
              <span className="font-medium">
                {currentStep} / {totalSteps}
              </span>
            </div>
          )}

          {/* 状态消息 */}
          {message && (
            <div className="text-sm">
              <span className="text-gray-600">状态:</span>
              <span className="ml-2 text-gray-900">{message}</span>
            </div>
          )}

          {/* 经过时间 */}
          {(status === 'running' || status === 'completed' || status === 'failed') && elapsedTime > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">用时:</span>
              <span className="font-medium">{formatTime(elapsedTime)}</span>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* 成功信息 */}
          {status === 'completed' && !error && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-green-700">测试成功完成</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      {testId && (
        <div className="mt-4 flex space-x-2">
          {status === 'idle' || status === 'failed' ? (
            <button
              type="button"
              onClick={() => {
                clearTestData();
                setStartTime(null);
                setElapsedTime(0);
                if (testId) {
                  subscribeToTest(testId);
                }
              }}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              重新开始
            </button>
          ) : null}

          {status === 'running' && (
            <button
              type="button"
              onClick={() => {
                // 这里可以添加取消测试的逻辑
                console.log('取消测试');
              }}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              取消测试
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              clearTestData();
              setStartTime(null);
              setElapsedTime(0);
            }}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            清除
          </button>
        </div>
      )}
    </div>
  );
};

export default RealTimeProgressBar;
