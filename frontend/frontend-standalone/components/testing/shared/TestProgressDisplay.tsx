/**
 * TestProgressDisplay.tsx - React组件
 * 
 * 文件路径: frontend\components\testing\shared\TestProgressDisplay.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, CheckCircle, AlertTriangle, XCircle, Activity, TrendingUp } from 'lucide-react';

interface TestStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  duration?: number;
  progress: number;
  details?: string;
  error?: string;
}

interface TestProgressDisplayProps {
  testId: string;
  testName: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  steps: TestStep[];
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

const TestProgressDisplay: React.FC<TestProgressDisplayProps> = ({
  testId,
  testName,
  status,
  progress,
  steps,
  startTime,
  endTime,
  estimatedDuration,
  onPause,
  onResume,
  onCancel,
  showDetails = true,
  compact = false
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (status === 'running' && startTime) {
      interval = setInterval(() => {
        const elapsed = Date.now() - new Date(startTime).getTime();
        setElapsedTime(elapsed);

        if (estimatedDuration && progress > 0) {
          const totalEstimated = (elapsed / progress) * 100;
          const remaining = Math.max(0, totalEstimated - elapsed);
          setEstimatedTimeRemaining(remaining);
        }
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status, startTime, progress, estimatedDuration]);

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'skipped':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

    /**
     * switch功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
  const _getStatusColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'running':
        return 'bg-blue-500';
      case 'skipped':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getOverallStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'running':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const failedSteps = steps.filter(step => step.status === 'failed').length;
  const totalSteps = steps.length;

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 truncate">{testName}</h3>
          <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getOverallStatusColor()}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{completedSteps}/{totalSteps} steps</span>
          {status === 'running' && (
            <span>{formatTime(elapsedTime)}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{testName}</h2>
          <p className="text-sm text-gray-500">Test ID: {testId}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {status === 'running' && onPause && (
            <button
              onClick={onPause}
              className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center space-x-1"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>
          )}
          
          {status === 'idle' && onResume && (
            <button
              onClick={onResume}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-1"
            >
              <Play className="w-4 h-4" />
              <span>Resume</span>
            </button>
          )}
          
          {(status === 'running' || status === 'idle') && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-1"
            >
              <Square className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getOverallStatusColor()}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          ></div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{completedSteps}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{failedSteps}</div>
          <div className="text-sm text-gray-500">Failed</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalSteps}</div>
          <div className="text-sm text-gray-500">Total Steps</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {status === 'running' ? formatTime(elapsedTime) : 
             endTime && startTime ? formatTime(new Date(endTime).getTime() - new Date(startTime).getTime()) : 
             '--'}
          </div>
          <div className="text-sm text-gray-500">Duration</div>
        </div>
      </div>

      {/* Time Information */}
      {status === 'running' && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">Elapsed:</span>
              <span className="font-medium">{formatTime(elapsedTime)}</span>
            </div>
            
            {estimatedTimeRemaining > 0 && (
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">Remaining:</span>
                <span className="font-medium">{formatTime(estimatedTimeRemaining)}</span>
              </div>
            )}
            
            {estimatedDuration && (
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">Estimated:</span>
                <span className="font-medium">{formatTime(estimatedDuration)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step Details */}
      {showDetails && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Steps</h3>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 rounded-lg border ${
                  step.status === 'running' ? 'border-blue-200 bg-blue-50' :
                  step.status === 'completed' ? 'border-green-200 bg-green-50' :
                  step.status === 'failed' ? 'border-red-200 bg-red-50' :
                  step.status === 'skipped' ? 'border-yellow-200 bg-yellow-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                    {getStatusIcon(step.status)}
                    <span className="font-medium text-gray-900">{step.name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {step.status === 'running' && (
                      <span>{Math.round(step.progress)}%</span>
                    )}
                    
                    {step.duration && (
                      <span>{formatTime(step.duration)}</span>
                    )}
                  </div>
                </div>

                {step.status === 'running' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, step.progress)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {step.details && (
                  <p className="mt-2 text-sm text-gray-600">{step.details}</p>
                )}

                {step.error && (
                  <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                    <strong>Error:</strong> {step.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestProgressDisplay;
