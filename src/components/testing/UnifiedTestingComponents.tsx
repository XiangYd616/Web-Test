import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Loader,
  Play,
  RotateCcw,
  Square,
  XCircle
} from 'lucide-react';
import React from 'react';

// 统一的测试状态类型
export type TestStatus = 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'stopped';

// 统一的测试配置接口
export interface BaseTestConfig {
  url: string;
  testName?: string;
  description?: string;
}

// 统一的测试结果接口
export interface BaseTestResult {
  id: string;
  url: string;
  timestamp: string;
  status: 'success' | 'failed' | 'partial';
  overallScore?: number;
  duration?: number;
  error?: string;
}

// 统一的进度信息接口
export interface TestProgress {
  percentage: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  phase?: string;
}

// 统一的测试头部组件
interface TestHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: TestStatus;
  onStartTest?: () => void;
  onStopTest?: () => void;
  canStart?: boolean;
  isRunning?: boolean;
}

export const TestHeader: React.FC<TestHeaderProps> = ({
  title,
  description,
  icon,
  status = 'idle',
  onStartTest,
  onStopTest,
  canStart = true,
  isRunning = false
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-gray-300 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {isRunning ? (
            <button
              onClick={onStopTest}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Square className="w-4 h-4" />
              <span>停止测试</span>
            </button>
          ) : (
            <button
              onClick={onStartTest}
              disabled={!canStart}
              className={`px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 ${canStart
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
            >
              <Play className="w-4 h-4" />
              <span>开始测试</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 统一的进度显示组件
interface TestProgressProps {
  progress: TestProgress;
  isRunning: boolean;
  status: TestStatus;
}

export const TestProgressDisplay: React.FC<TestProgressProps> = ({
  progress,
  isRunning,
  status
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'starting':
        return '正在启动测试...';
      case 'running':
        return progress.currentStep || '测试进行中...';
      case 'completed':
        return '测试完成';
      case 'failed':
        return '测试失败';
      case 'stopped':
        return '测试已停止';
      default:
        return '等待开始';
    }
  };

  if (!isRunning && status === 'idle') {
    return null;
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          {getStatusIcon()}
          <span>测试进度</span>
        </h3>
        <span className="text-2xl font-bold text-purple-400">
          {Math.round(progress.percentage)}%
        </span>
      </div>

      <div className="space-y-3">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="test-progress-gradient h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        <p className="text-gray-300">{getStatusText()}</p>

        {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
          <p className="text-sm text-gray-400">
            预计剩余时间: {Math.ceil(progress.estimatedTimeRemaining / 1000)}秒
          </p>
        )}
      </div>
    </div>
  );
};

// 统一的结果概览组件
interface TestResultOverviewProps {
  result: BaseTestResult;
  metrics?: Array<{
    label: string;
    value: string | number;
    color: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
    icon?: React.ReactNode;
  }>;
  onExport?: (format: 'json' | 'csv' | 'html') => void;
  onRetry?: () => void;
}

export const TestResultOverview: React.FC<TestResultOverviewProps> = ({
  result,
  metrics = [],
  onExport,
  onRetry
}) => {
  const getColorClasses = (color: string) => {
    const colorMap = {
      green: 'bg-green-500/20 border-green-500/30 text-green-400',
      yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
      red: 'bg-red-500/20 border-red-500/30 text-red-400',
      blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
      purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">测试结果</h3>
        <div className="flex items-center space-x-3">
          {onExport && (
            <>
              <button
                type="button"
                onClick={() => onExport('json')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>JSON</span>
              </button>
              <button
                type="button"
                onClick={() => onExport('csv')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => onExport('html')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>HTML</span>
              </button>
            </>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重新测试</span>
            </button>
          )}
        </div>
      </div>

      {/* 指标网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getColorClasses(metric.color)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">{metric.label}</span>
              {metric.icon}
            </div>
            <div className="text-2xl font-bold">{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 统一的错误显示组件
interface TestErrorProps {
  error: string;
  onRetry?: () => void;
  onClear?: () => void;
}

export const TestError: React.FC<TestErrorProps> = ({
  error,
  onRetry,
  onClear
}) => {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-red-400 font-medium mb-1">测试失败</h4>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
        <div className="flex items-center space-x-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              重试
            </button>
          )}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
            >
              清除
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 统一的测试页面布局组件
interface TestPageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const TestPageLayout: React.FC<TestPageLayoutProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`w-full max-w-none space-y-6 ${className}`}>
      {children}
    </div>
  );
};

// 统一的测试配置卡片组件
interface TestConfigCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const TestConfigCard: React.FC<TestConfigCardProps> = ({
  title,
  children,
  className = ''
}) => {
  return (
    <div className={`test-card ${className}`}>
      <div className="test-card-header">
        <h3 className="test-card-title">{title}</h3>
      </div>
      <div className="test-card-content">
        {children}
      </div>
    </div>
  );
};
