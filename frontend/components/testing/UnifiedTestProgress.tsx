/**
 * 统一测试进度显示组件
 * 支持所有测试类型的进度显示和控制
 */

import { AlertCircle, CheckCircle, Clock, Loader, StopCircle, XCircle } from 'lucide-react';
import type { useState, FC } from 'react';
import type { TestProgress } from '../../services/api/testProgressService';

export interface UnifiedTestProgressProps {
  progress: TestProgress | null;
  isMonitoring: boolean;
  testType: string;
  onCancel?: () => void;
  onStop?: () => void;
  error?: string | null;
  className?: string;
}

export const UnifiedTestProgress: React.FC<UnifiedTestProgressProps> = ({
  progress,
  isMonitoring,
  testType,
  onCancel,
  onStop,
  error,
  className = ''
}) => {
  // 如果没有进度数据且不在监控中，不显示组件
  if (!progress && !isMonitoring && !error) {
    return null;
  }

  // 获取状态图标和颜色
  const getStatusIcon = () => {
  const [testProgress, setTestProgress] = useState<any>(null);

  const [error, setError] = useState<string | null>(null);

    if (error || progress?.status === 'failed') {
      return <XCircle className="w-5 h-5 text-red-400" />;
    }
    
    if (progress?.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    
    if (progress?.status === 'cancelled') {
      return <StopCircle className="w-5 h-5 text-yellow-400" />;
    }
    
    if (isMonitoring || progress?.status === 'running') {
      return <Loader className="w-5 h-5 text-blue-400 animate-spin" />;
    }
    
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  // 获取状态文本
  const getStatusText = () => {
    if (error) return '测试失败';
    if (progress?.status === 'completed') return '测试完成';
    if (progress?.status === 'cancelled') return '测试已取消';
    if (progress?.status === 'failed') return '测试失败';
    if (isMonitoring || progress?.status === 'running') return '测试进行中';
    return '准备中';
  };

  // 获取进度百分比
  const getProgressPercentage = () => {
    if (progress?.progress !== undefined) {
      return Math.max(0, Math.min(100, progress.progress));
    }
    return 0;
  };

  return (
    <div className={`bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 ${className}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h4 className="text-white font-medium">{testType}测试</h4>
            <p className="text-gray-400 text-sm">{getStatusText()}</p>
          </div>
        </div>
        
        {/* 控制按钮 */}
        {(isMonitoring || progress?.status === 'running') && (onCancel || onStop) && (
          <div className="flex space-x-2">
            {onStop && (
              <button
                onClick={onStop}
                className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
                title="停止测试"
              >
                停止
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                title="取消测试"
              >
                取消
              </button>
            )}
          </div>
        )}
      </div>

      {/* 进度信息 */}
      {progress && (
        <div className="space-y-3">
          {/* 进度消息 */}
          {progress.message && (
            <p className="text-gray-300 text-sm">{progress.message}</p>
          )}
          
          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">进度</span>
              <span className="text-blue-400 font-medium">{getProgressPercentage()}%</span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
          
          {/* 时间信息 */}
          {progress.startTime && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>开始时间: {new Date(progress.startTime).toLocaleTimeString()}</span>
              {progress.endTime && (
                <span>结束时间: {new Date(progress.endTime).toLocaleTimeString()}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <h5 className="text-red-400 font-medium text-sm">错误信息</h5>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 简化版进度条组件
 */
export interface SimpleTestProgressProps {
  isRunning: boolean;
  progress: number;
  message: string;
  testType: string;
  className?: string;
}

export const SimpleTestProgress: React.FC<SimpleTestProgressProps> = ({
  isRunning,
  progress,
  message,
  testType,
  className = ''
}) => {
  if (!isRunning && progress === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-800/30 rounded-lg p-3 ${className}`}>
      <div className="flex items-center space-x-3 mb-2">
        {isRunning ? (
          <Loader className="w-4 h-4 text-blue-400 animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-400" />
        )}
        <span className="text-gray-300 text-sm">{message}</span>
        <span className="text-blue-400 text-sm font-medium ml-auto">{progress}%</span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
};

/**
 * 测试状态徽章组件
 */
export interface TestStatusBadgeProps {
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
  className?: string;
}

export const TestStatusBadge: React.FC<TestStatusBadgeProps> = ({
  status,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return { text: '待开始', color: 'bg-gray-600 text-gray-300', icon: Clock };
      case 'starting':
        return { text: '启动中', color: 'bg-yellow-600 text-yellow-100', icon: Loader };
      case 'running':
        return { text: '运行中', color: 'bg-blue-600 text-blue-100', icon: Loader };
      case 'completed':
        return { text: '已完成', color: 'bg-green-600 text-green-100', icon: CheckCircle };
      case 'failed':
        return { text: '失败', color: 'bg-red-600 text-red-100', icon: XCircle };
      case 'cancelled':
        return { text: '已取消', color: 'bg-yellow-600 text-yellow-100', icon: StopCircle };
      default:
        return { text: '未知', color: 'bg-gray-600 text-gray-300', icon: Clock };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${className}`}>
      <IconComponent className={`w-3 h-3 ${status === 'running' || status === 'starting' ? 'animate-spin' : ''}`} />
      <span>{config.text}</span>
    </span>
  );
};

export default UnifiedTestProgress;
