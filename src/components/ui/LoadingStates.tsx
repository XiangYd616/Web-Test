import { Activity, CheckCircle, Clock, Loader, Target, Zap } from 'lucide-react';
import React from 'react';

// 基础加载组件
export const BasicLoader: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

// 带文本的加载组件
export const LoadingWithText: React.FC<{
  text: string;
  subtext?: string;
  className?: string
}> = ({ text, subtext, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <BasicLoader size="lg" className="text-blue-600 mb-4" />
      <p className="text-lg font-medium text-gray-900 mb-2">{text}</p>
      {subtext && <p className="text-sm text-gray-600 text-center">{subtext}</p>}
    </div>
  );
};

// 进度条加载组件
export const ProgressLoader: React.FC<{
  progress: number;
  stage: string;
  message?: string;
  className?: string;
}> = ({ progress, stage, message, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <div className="relative">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">{Math.round(progress)}</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{stage}</h3>
          {message && <p className="text-sm text-gray-600">{message}</p>}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out progress-bar-fill ${progress <= 0 ? 'w-0' :
              progress <= 5 ? 'w-5' :
                progress <= 10 ? 'w-10' :
                  progress <= 15 ? 'w-15' :
                    progress <= 20 ? 'w-20' :
                      progress <= 25 ? 'w-25' :
                        progress <= 30 ? 'w-30' :
                          progress <= 35 ? 'w-35' :
                            progress <= 40 ? 'w-40' :
                              progress <= 45 ? 'w-45' :
                                progress <= 50 ? 'w-50' :
                                  progress <= 55 ? 'w-55' :
                                    progress <= 60 ? 'w-60' :
                                      progress <= 65 ? 'w-65' :
                                        progress <= 70 ? 'w-70' :
                                          progress <= 75 ? 'w-75' :
                                            progress <= 80 ? 'w-80' :
                                              progress <= 85 ? 'w-85' :
                                                progress <= 90 ? 'w-90' :
                                                  progress <= 95 ? 'w-95' : 'w-100'
            }`}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>进度</span>
        <span>{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

// 骨架屏加载组件
export const SkeletonLoader: React.FC<{
  type: 'card' | 'list' | 'table' | 'chart';
  count?: number;
  className?: string;
}> = ({ type, count = 1, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <div className="flex space-x-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded flex-1"></div>
                ))}
              </div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 border-b border-gray-200 last:border-b-0">
                <div className="flex space-x-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-3 bg-gray-200 rounded flex-1"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'chart':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="flex justify-center space-x-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  );
};

// 测试特定的加载状态
export const TestLoadingStates = {
  // 压力测试加载
  StressTest: ({ progress, stage }: { progress: number; stage: string }) => (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <Zap className="w-6 h-6 text-red-600 animate-bounce" />
        </div>
        <div>
          <h3 className="font-semibold text-red-900">压力测试进行中</h3>
          <p className="text-sm text-red-700">{stage}</p>
        </div>
      </div>
      <ProgressLoader progress={progress} stage={stage} className="bg-transparent border-0 p-0" />
    </div>
  ),

  // 内容检测加载
  ContentTest: ({ progress, stage }: { progress: number; stage: string }) => (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <Target className="w-6 h-6 text-green-600 animate-pulse" />
        </div>
        <div>
          <h3 className="font-semibold text-green-900">内容检测中</h3>
          <p className="text-sm text-green-700">{stage}</p>
        </div>
      </div>
      <ProgressLoader progress={progress} stage={stage} className="bg-transparent border-0 p-0" />
    </div>
  ),

  // 安全扫描加载
  SecurityTest: ({ progress, stage }: { progress: number; stage: string }) => (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <Activity className="w-6 h-6 text-purple-600 animate-spin" />
        </div>
        <div>
          <h3 className="font-semibold text-purple-900">安全扫描中</h3>
          <p className="text-sm text-purple-700">{stage}</p>
        </div>
      </div>
      <ProgressLoader progress={progress} stage={stage} className="bg-transparent border-0 p-0" />
    </div>
  )
};

// 成功状态组件
export const SuccessState: React.FC<{
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, message, action, className = '' }) => {
  return (
    <div className={`text-center p-8 ${className}`}>
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {message && <p className="text-gray-600 mb-4">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};

// 空状态组件
export const EmptyState: React.FC<{
  icon: React.ComponentType<any>;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, message, action, className = '' }) => {
  return (
    <div className={`text-center p-12 ${className}`}>
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {message && <p className="text-gray-600 mb-6 max-w-md mx-auto">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};

// 超时状态组件
export const TimeoutState: React.FC<{
  onRetry: () => void;
  className?: string;
}> = ({ onRetry, className = '' }) => {
  return (
    <div className={`text-center p-8 ${className}`}>
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Clock className="w-8 h-8 text-yellow-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">请求超时</h3>
      <p className="text-gray-600 mb-4">操作时间过长，请检查网络连接后重试</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        重新尝试
      </button>
    </div>
  );
};

// 加载状态管理Hook
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);
  const [progress, setProgress] = React.useState(0);
  const [stage, setStage] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const startLoading = (initialStage = '准备中...') => {
    setIsLoading(true);
    setProgress(0);
    setStage(initialStage);
    setError(null);
  };

  const updateProgress = (newProgress: number, newStage?: string) => {
    setProgress(newProgress);
    if (newStage) setStage(newStage);
  };

  const finishLoading = () => {
    setProgress(100);
    setStage('完成');
    setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
      setStage('');
    }, 500);
  };

  const setLoadingError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  return {
    isLoading,
    progress,
    stage,
    error,
    startLoading,
    updateProgress,
    finishLoading,
    setLoadingError
  };
};

// 智能加载组件 - 根据内容类型自动选择合适的加载状态
export const SmartLoader: React.FC<{
  type: 'test' | 'data' | 'chart' | 'report';
  testType?: 'stress' | 'content' | 'security' | 'api';
  progress?: number;
  stage?: string;
  className?: string;
}> = ({ type, testType, progress, stage, className = '' }) => {
  if (type === 'test' && testType && progress !== undefined && stage) {
    switch (testType) {
      case 'stress':
        return <TestLoadingStates.StressTest progress={progress} stage={stage} />;
      case 'content':
        return <TestLoadingStates.ContentTest progress={progress} stage={stage} />;
      case 'security':
        return <TestLoadingStates.SecurityTest progress={progress} stage={stage} />;
      default:
        return <ProgressLoader progress={progress} stage={stage} className={className} />;
    }
  }

  if (type === 'data') {
    return <SkeletonLoader type="list" className={className} />;
  }

  if (type === 'chart') {
    return <SkeletonLoader type="chart" className={className} />;
  }

  if (type === 'report') {
    return <LoadingWithText text="生成报告中..." subtext="请稍候，正在处理数据..." className={className} />;
  }

  return <BasicLoader className={className} />;
};

// 默认导出 - 包含所有加载状态组件
const LoadingStates = {
  BasicLoader,
  LoadingWithText,
  ProgressLoader,
  SkeletonLoader,
  TestLoadingStates,
  SuccessState,
  EmptyState,
  TimeoutState,
  SmartLoader,
  useLoadingState
};

export default LoadingStates;
