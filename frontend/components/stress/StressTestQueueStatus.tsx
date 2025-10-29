/**
 * StressTestQueueStatus.tsx - React组件
 * 
 * 文件路径: frontend\components\stress\StressTestQueueStatus.tsx
 * 创建时间: 2025-09-25
 */


import React from 'react';
import type { FC } from 'react';
import { Clock, Users, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  totalCapacity: number;
  averageWaitTime: number;
  // Additional properties used in component
  totalQueued: number;
  totalRunning: number;
  totalCompleted: number;
  totalFailed: number;
  averageExecutionTime: number;
  queueLength: number;
  nextInQueue?: {
    testName: string;
    status: string;
    id?: string;
  };
  runningTests: Array<{
    id: string;
    testName: string;
    url: string;
    status: string;
  }>;
}

interface StressTestQueueStatusProps {
  queueStats: QueueStats;
  currentQueueId?: string | null;
  queuePosition?: number;
  estimatedWaitTime?: number;
  className?: string;
}

const StressTestQueueStatus: React.FC<StressTestQueueStatusProps> = ({
  queueStats,
  currentQueueId,
  queuePosition,
  estimatedWaitTime,
  className = ''
}) => {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
    return `${Math.round(seconds / 3600)}小时`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'processing':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'failed':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <TrendingUp className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className={`bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          队列状态
        </h3>
        {currentQueueId && (
          <div className="text-sm text-gray-400">
            队列ID: {currentQueueId?.slice(-8)}
          </div>
        )}
      </div>

      {/* 当前测试排队信息 */}
      {currentQueueId && queuePosition && queuePosition > 0 && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-400">
              <Clock className="w-4 h-4" />
              <span className="font-medium">您的测试正在排队</span>
            </div>
            <div className="text-right text-sm">
              <div className="text-yellow-400 font-medium">第 {queuePosition} 位</div>
              {estimatedWaitTime && estimatedWaitTime > 0 && (
                <div className="text-gray-400">
                  预计等待: {formatTime(estimatedWaitTime)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 队列统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-700/30 rounded-lg">
          <div className="text-2xl font-bold text-yellow-400">{queueStats.totalQueued}</div>
          <div className="text-sm text-gray-400">排队中</div>
        </div>
        <div className="text-center p-3 bg-gray-700/30 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">{queueStats.totalRunning}</div>
          <div className="text-sm text-gray-400">执行中</div>
        </div>
        <div className="text-center p-3 bg-gray-700/30 rounded-lg">
          <div className="text-2xl font-bold text-green-400">{queueStats.totalCompleted}</div>
          <div className="text-sm text-gray-400">已完成</div>
        </div>
        <div className="text-center p-3 bg-gray-700/30 rounded-lg">
          <div className="text-2xl font-bold text-red-400">{queueStats.totalFailed}</div>
          <div className="text-sm text-gray-400">已失败</div>
        </div>
      </div>

      {/* 平均时间统计 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-700/30 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">平均等待时间</div>
          <div className="text-lg font-semibold text-white">
            {formatTime(queueStats.averageWaitTime)}
          </div>
        </div>
        <div className="p-3 bg-gray-700/30 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">平均执行时间</div>
          <div className="text-lg font-semibold text-white">
            {formatTime(queueStats.averageExecutionTime)}
          </div>
        </div>
      </div>

      {/* 下一个测试 */}
      {queueStats.nextInQueue && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">下一个测试</div>
              <div className="text-white font-medium truncate">
                {queueStats.nextInQueue.testName}
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getStatusColor(queueStats.nextInQueue.status)}`}>
                {getStatusIcon(queueStats.nextInQueue.status)}
                {queueStats.nextInQueue.status}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 正在运行的测试 */}
      {queueStats.runningTests.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">正在执行的测试</h4>
          <div className="space-y-2">
            {queueStats.runningTests.slice(0, 3).map((test) => (
              <div key={test.id} className="flex items-center justify-between p-2 bg-gray-700/30 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{test.testName}</div>
                  <div className="text-xs text-gray-400">{test.url}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getStatusColor(test.status)}`}>
                    {getStatusIcon(test.status)}
                    执行中
                  </div>
                </div>
              </div>
            ))}
            {queueStats.runningTests.length > 3 && (
              <div className="text-center text-sm text-gray-400">
                还有 {queueStats.runningTests.length - 3} 个测试正在执行...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 空队列状态 */}
      {queueStats.queueLength === 0 && queueStats.totalRunning === 0 && (
        <div className="text-center py-6">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-2" />
          <div className="text-gray-400">当前没有测试在队列中</div>
          <div className="text-sm text-gray-500">您可以立即开始新的压力测试</div>
        </div>
      )}
    </div>
  );
};

export default StressTestQueueStatus;

