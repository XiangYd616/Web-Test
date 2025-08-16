import React from 'react';
import { Play, Pause, Square, Clock, Activity, AlertCircle } from 'lucide-react';

interface TestProgressPanelProps {
  testType: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
    stage: string;
    message: string;
    startTime?: string;
    estimatedEndTime?: string;
  };
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  className?: string;
  disabled?: boolean;
}

export const TestProgressPanel: React.FC<TestProgressPanelProps> = ({
  testType,
  status,
  progress,
  onStart,
  onPause,
  onStop,
  className = '',
  disabled = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'idle': return '准备就绪';
      case 'running': return '运行中';
      case 'completed': return '已完成';
      case 'failed': return '测试失败';
      case 'cancelled': return '已取消';
      default: return '未知状态';
    }
  };

  const formatDuration = (startTime: string) => {
    if (!startTime) return '00:00';
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatEstimatedTime = (estimatedEndTime: string) => {
    if (!estimatedEndTime) return '计算中...';
    const end = new Date(estimatedEndTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return '即将完成';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `约 ${minutes}分${seconds}秒`;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">测试进度</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status)}`}>
              {getStatusText(status)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {status === 'idle' && onStart && (
              <button
                onClick={onStart}
                disabled={disabled}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                <span>开始测试</span>
              </button>
            )}

            {status === 'running' && (
              <>
                {onPause && (
                  <button
                    onClick={onPause}
                    disabled={disabled}
                    className="p-2 text-gray-600 hover:text-yellow-600 transition-colors disabled:opacity-50"
                    title="暂停测试"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}

                {onStop && (
                  <button
                    onClick={onStop}
                    disabled={disabled}
                    className="p-2 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="停止测试"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 进度内容 */}
      <div className="p-6">
        {status === 'idle' ? (
          <div className="text-center py-8">
            <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">点击开始测试按钮启动测试</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 进度条 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {progress.stage || '准备中...'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {progress.percentage}%
                </span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{progress.current} / {progress.total}</span>
                {status === 'running' && progress.startTime && (
                  <span>已用时: {formatDuration(progress.startTime)}</span>
                )}
              </div>
            </div>

            {/* 当前状态消息 */}
            {progress.message && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  {progress.message}
                </p>
              </div>
            )}

            {/* 时间信息 */}
            {status === 'running' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">开始时间</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {progress.startTime ? new Date(progress.startTime).toLocaleTimeString() : '--:--'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">预计完成</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {progress.estimatedEndTime ? formatEstimatedTime(progress.estimatedEndTime) : '计算中...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 完成状态 */}
            {status === 'completed' && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-green-800 dark:text-green-200 font-medium">测试完成</p>
                <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                  总用时: {progress.startTime ? formatDuration(progress.startTime) : '未知'}
                </p>
              </div>
            )}

            {/* 失败状态 */}
            {status === 'failed' && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-red-800 dark:text-red-200 font-medium">测试失败</p>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {progress.message || '测试过程中发生错误'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestProgressPanel;
