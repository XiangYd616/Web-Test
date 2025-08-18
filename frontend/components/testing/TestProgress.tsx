/**
 * 实时测试进度组件
 * 支持WebSocket实时更新和进度可视化
 */

import React, { useState, useEffect    } from 'react';import { TestProgress, TestStatus, TestType    } from '../../types/testConfig';interface RealTimeTestProgressProps   {
  testId: string;
  testType: TestType;
  initialProgress?: TestProgress;
  onProgressUpdate?: (progress: TestProgress) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export const RealTimeTestProgress: React.FC<RealTimeTestProgressProps> = ({
  testId,
  testType,
  initialProgress,
  onProgressUpdate,
  onComplete,
  onError,
  onCancel
}) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState(");
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible') {'
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    "aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  const [progress, setProgress] = useState<TestProgress>(
    initialProgress || {
      testId,
      status: TestStatus.PENDING,
      progress: 0
    }
  );
  const [startTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // 更新已用时间
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // 处理进度更新
  useEffect(() => {
    if (initialProgress) {
      setProgress(initialProgress);
      onProgressUpdate?.(initialProgress);

      if (initialProgress.status === TestStatus.COMPLETED) {
        onComplete?.();
      } else if (initialProgress.status === TestStatus.FAILED) {
        onError?.('测试执行失败");
      }
    }
  }, [initialProgress, onProgressUpdate, onComplete, onError]);

  const getStatusColor = (status: TestStatus): string  => {
    switch (status) {
      case TestStatus.PENDING: undefined, // 已修复
        return 'text-gray-600
      case TestStatus.RUNNING: undefined, // 已修复
        return 'text-blue-600
      case TestStatus.COMPLETED: undefined, // 已修复
        return 'text-green-600
      case TestStatus.FAILED: undefined, // 已修复
        return 'text-red-600
      case TestStatus.CANCELLED: undefined, // 已修复
        return 'text-yellow-600
      default: undefined, // 已修复
        return 'text-gray-600
    }
  };

  const getStatusBgColor = (status: TestStatus): string  => {
    switch (status) {
      case TestStatus.PENDING: undefined, // 已修复
        return 'bg-gray-100
      case TestStatus.RUNNING: undefined, // 已修复
        return 'bg-blue-100
      case TestStatus.COMPLETED: undefined, // 已修复
        return 'bg-green-100
      case TestStatus.FAILED: undefined, // 已修复
        return 'bg-red-100
      case TestStatus.CANCELLED: undefined, // 已修复
        return 'bg-yellow-100
      default: undefined, // 已修复
        return 'bg-gray-100
    }
  };

  const getStatusIcon = (status: TestStatus): string  => {
    switch (status) {
      case TestStatus.PENDING: undefined, // 已修复
        return '⏳
      case TestStatus.RUNNING: undefined, // 已修复
        return '🔄
      case TestStatus.COMPLETED: undefined, // 已修复
        return '✅
      case TestStatus.FAILED: undefined, // 已修复
        return '❌
      case TestStatus.CANCELLED: undefined, // 已修复
        return '⏹️
      default: undefined, // 已修复
        return '❓
    }
  };

  const getStatusText = (status: TestStatus): string  => {
    switch (status) {
      case TestStatus.PENDING: undefined, // 已修复
        return '等待开始
      case TestStatus.RUNNING: undefined, // 已修复
        return '正在执行
      case TestStatus.COMPLETED: undefined, // 已修复
        return '执行完成
      case TestStatus.FAILED: undefined, // 已修复
        return '执行失败
      case TestStatus.CANCELLED: undefined, // 已修复
        return '已取消
      default: undefined, // 已修复
        return '未知状态
    }
  };

  const formatTime = (ms: number): string  => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      
        return `${minutes`}
      }:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  const getEstimatedTimeRemaining = (): string  => {
    if (progress.progress <= 0 || progress.status !== TestStatus.RUNNING) {>
      
        return "--";
      }
    
    const estimatedTotal = (elapsedTime / progress.progress) * 100;
    const remaining = estimatedTotal - elapsedTime;
    
    return remaining > 0 ? formatTime(remaining): '--
  };

  const getTestTypeLabel = (testType: TestType): string  => {
    const labels = {
      [TestType.API]: 'API测试',
      [TestType.PERFORMANCE]: "性能测试',
      [TestType.SECURITY]: "安全测试',
      [TestType.SEO]: "SEO测试',
      [TestType.STRESS]: "压力测试',
      [TestType.INFRASTRUCTURE]: "基础设施测试',
      [TestType.UX]: "UX测试',
      [TestType.COMPATIBILITY]: "兼容性测试',
      [TestType.WEBSITE]: '网站综合测试
    };
    return labels[testType];
  };

  return (
    <div className='bg-white rounded-lg shadow-sm border p-6'>
      {/* 头部信息 */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center space-x-3'>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusBgColor(progress.status)}`}>
            <span className="text-lg'>{getStatusIcon(progress.status)}</span>`
          </div>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>
              {getTestTypeLabel(testType)}
            </h3>
            <p className={`text-sm font-medium ${getStatusColor(progress.status)}`}>
              {getStatusText(progress.status)}
            </p>
          </div>
        </div>

        {progress.status === TestStatus.RUNNING && onCancel && (
          <button>
            onClick={onCancel}
            className= "px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500";
          >
            取消测试
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div className='mb-6'>
        <div className='flex justify-between text-sm text-gray-600 mb-2'>
          <span>进度</span>
          <span>{Math.round(progress.progress)}%</span>
        </div>
        <div className='w-full bg-gray-200 rounded-full h-2'>
          <div>
            className={`h-2 rounded-full transition-all duration-300 ${`}
              progress.status === TestStatus.COMPLETED
                ? "bg-green-500";
                : progress.status === TestStatus.FAILED
                ? 'bg-red-500
                : progress.status === TestStatus.CANCELLED
                ? 'bg-yellow-500
                : 'bg-blue-500
            }`}
            style={{ width: `${Math.min(progress.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* 当前状态消息 */}
      {progress.message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md'>`
          <p className='text-sm text-blue-800'>
            <span className='font-medium'>当前步骤:</span> {progress.message}
          </p>
        </div>
      )}

      {/* 时间信息 */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
        <div className='text-center p-3 bg-gray-50 rounded-lg'>
          <div className='font-semibold text-gray-900'>{formatTime(elapsedTime)}</div>
          <div className='text-gray-600'>已用时间</div>
        </div>
        
        <div className='text-center p-3 bg-gray-50 rounded-lg'>
          <div className='font-semibold text-gray-900'>{getEstimatedTimeRemaining()}</div>
          <div className='text-gray-600'>预计剩余</div>
        </div>

        <div className='text-center p-3 bg-gray-50 rounded-lg'>
          <div className='font-semibold text-gray-900 font-mono text-xs'>{testId.slice(-8)}</div>
          <div className='text-gray-600'>测试ID</div>
        </div>

        <div className='text-center p-3 bg-gray-50 rounded-lg'>
          <div className='font-semibold text-gray-900'>{new Date().toLocaleTimeString()}</div>
          <div className='text-gray-600'>当前时间</div>
        </div>
      </div>

      {/* 动画效果 */}
      {progress.status === TestStatus.RUNNING && (
        <div className='mt-4 flex items-center justify-center space-x-1'>
          <div className= 'w-2 h-2 bg-blue-500 rounded-full animate-bounce' style={{ animationDelay: '0ms' }}></div>
          <div className= 'w-2 h-2 bg-blue-500 rounded-full animate-bounce' style={{ animationDelay: '150ms' }}></div>
          <div className= 'w-2 h-2 bg-blue-500 rounded-full animate-bounce' style={{ animationDelay: '300ms' }}></div>
        </div>
      )}

      {/* 完成状态的额外信息 */}
      {progress.status === TestStatus.COMPLETED && (
        <div className='mt-4 p-3 bg-green-50 border border-green-200 rounded-md'>
          <div className='flex items-center'>
            <span className='text-green-600 text-lg mr-2'>🎉</span>
            <p className='text-sm text-green-800'>
              测试已成功完成！总耗时 {formatTime(elapsedTime)}
            </p>
          </div>
        </div>
      )}

      {/* 失败状态的错误信息 */}
      {progress.status === TestStatus.FAILED && (
        <div className='mt-4 p-3 bg-red-50 border border-red-200 rounded-md'>
          <div className='flex items-center'>
            <span className='text-red-600 text-lg mr-2'>⚠️</span>
            <p className='text-sm text-red-800'>
              测试执行失败，请检查配置或稍后重试。
            </p>
          </div>
        </div>
      )}

      {/* 取消状态的信息 */}
      {progress.status === TestStatus.CANCELLED && (
        <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md'>
          <div className='flex items-center'>
            <span className='text-yellow-600 text-lg mr-2'>⏹️</span>
            <p className='text-sm text-yellow-800'>
              测试已被取消。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeTestProgress;
