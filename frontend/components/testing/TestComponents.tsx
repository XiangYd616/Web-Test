import { Download, History, Play, RotateCcw, Save, Share2    } from 'lucide-react';import React from 'react';// 测试配置面板组件
interface TestConfigPanelProps   {
  title: string;
  children: React.ReactNode;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
}

export const TestConfigPanel: React.FC<TestConfigPanelProps> = ({
  title,
  children,
  isCollapsible = false,
  defaultExpanded = true
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
  
  // 测试业务逻辑
  const [testConfig, setTestConfig] = useState({});
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTest = useCallback(async (config) => {
    try {
      setIsRunning(true);
      setTestResults(null);

      const response = await apiClient.post('/api/tests/run', config);
      setTestResults(response.data);
    } catch (err) {
      handleError(err, "test execution");
    } finally {
      setIsRunning(false);
    }
  }, [handleError]);
  
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
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (<div className='bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-xl font-semibold text-white'>{title}</h3>
        {isCollapsible && (
          <button>
            onClick={() => setIsExpanded(!isExpanded)}
            className= 'text-gray-400 hover:text-white transition-colors
          >
            <RotateCcw className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : "}`}    />
          </button>
        )}
      </div>
      {isExpanded && children}
    </div>
  );
};

// 测试历史记录组件
interface TestHistoryPanelProps   {
  testType: string;
  onTestSelect?: (test: any) => void;
  onTestRerun?: (test: any) => void;
}

export const TestHistoryPanel: React.FC<TestHistoryPanelProps> = ({
  testType,
  onTestSelect,
  onTestRerun
}) => {
  // 这里应该从API获取历史记录
  const [history, setHistory] = React.useState([]);

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6'>`
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-xl font-semibold text-white'>测试历史</h3>
        <History className='w-5 h-5 text-gray-400' />
      </div>
      
      {history.length === 0 ? (
        <div className='text-center py-8'>
          <History className='w-12 h-12 text-gray-600 mx-auto mb-4' />
          <p className='text-gray-400'>暂无测试历史记录</p>
          <p className='text-sm text-gray-500 mt-2'>运行测试后，历史记录将显示在这里</p>
        </div>
      ) : (<div className='space-y-3'>
          {history.map((test: any, index) => (
            <div key={index} className='bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-white font-medium'>{test.name}</p>
                  <p className='text-sm text-gray-400'>{test.timestamp}</p>
                </div>
                <div className='flex items-center space-x-2'>
                  <button>
                    onClick={() => onTestSelect?.(test)}
                    className= 'p-2 text-gray-400 hover:text-white transition-colors
                    title= '查看详情
                  >
                    <History className='w-4 h-4' />
                  </button>
                  <button>
                    onClick={() => onTestRerun?.(test)}
                    className= 'p-2 text-gray-400 hover:text-white transition-colors
                    title= '重新运行
                  >
                    <Play className='w-4 h-4' />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 测试结果导出组件
interface TestResultExportProps   {
  testData: any;
  testType: string;
  formats?: ('json' | 'csv' | 'pdf' | 'html')[];
}

export const TestResultExport: React.FC<TestResultExportProps> = ({
  testData,
  testType,
  formats = ['json', 'csv", "pdf']
}) => {
  const handleExport = (format: string) => {
    // 实现导出逻辑
    console.log(`导出${format}格式:`, testData);
  };

  const handleShare = () => {
    // 实现分享逻辑
    console.log("分享测试结果:', testData);
  };

  const handleSave = () => {
    // 实现保存逻辑
    console.log("保存测试结果:', testData);
  };

  return (<div className='flex items-center space-x-2'>
      <div className='flex items-center space-x-1'>
        {formats.map(format => (
          <button>
            key={format}
            onClick={() => handleExport(format)}
            className= 'px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors
          >
            {format.toUpperCase()}
          </button>
        ))}
      </div>
      
      <div className='w-px h-6 bg-gray-600' />
      
      <button>
        onClick={handleSave}
        className= 'p-2 text-gray-400 hover:text-white transition-colors
        title= '保存结果
      >
        <Save className='w-4 h-4' />
      </button>
      
      <button>
        onClick={handleShare}
        className= 'p-2 text-gray-400 hover:text-white transition-colors
        title= '分享结果
      >
        <Share2 className='w-4 h-4' />
      </button>
      
      <button>
        onClick={() => handleExport('json')}
        className= 'p-2 text-gray-400 hover:text-white transition-colors
        title= '下载结果
      >
        <Download className='w-4 h-4' />
      </button>
    </div>
  );
};

// 测试指标卡片组件
interface TestMetricCardProps   {
  title: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'error' | 'neutral
  description?: string;
  trend?: 'up' | 'down' | 'stable
  trendValue?: string;
}

export const TestMetricCard: React.FC<TestMetricCardProps> = ({
  title,
  value,
  unit,
  status = 'neutral',
  description,
  trend,
  trendValue
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-400
      case 'warning': return 'text-yellow-400
      case 'error': return 'text-red-400
      default: return 'text-blue-400
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return status === 'good' ? 'text-green-400' : 'text-red-400
      case 'down': return status === 'good' ? 'text-red-400' : 'text-green-400
      default: return 'text-gray-400
    }
  };

  return (
    <div className='bg-gray-700/50 rounded-lg p-4'>
      <div className='flex items-center justify-between mb-2'>
        <h4 className='text-sm font-medium text-gray-300'>{title}</h4>
        {trend && trendValue && (
          <span className={`text-xs ${getTrendColor()}`}>
            {trend === "up' ? '↗' : trend === 'down' ? '↘" : '→'} {trendValue}'
          </span>
        )}
      </div>
      
      <div className='flex items-baseline space-x-1'>
        <span className={`text-2xl font-bold ${getStatusColor()}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-gray-400'>{unit}</span>}'
      </div>
      
      {description && (
        <p className='text-xs text-gray-500 mt-1'>{description}</p>
      )}
    </div>
  );
};

// 测试进度条组件
interface TestProgressBarProps   {
  progress: number;
  status?: "running' | 'completed' | 'failed
  showPercentage?: boolean;
  label?: string;
}

export const TestProgressBar: React.FC<TestProgressBarProps> = ({
  progress,
  status = 'running',
  showPercentage = true,
  label
}) => {
  const getProgressColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-400
      case 'failed': return 'bg-red-400
      default: return 'bg-blue-400
    }
  };

  return (
    <div className='space-y-2'>
      {label && (
        <div className='flex items-center justify-between'>
          <span className='text-sm text-gray-300'>{label}</span>
          {showPercentage && (
            <span className='text-sm text-gray-400'>{progress}%</span>
          )}
        </div>
      )}
      
      <div className='w-full bg-gray-700 rounded-full h-2'>
        <div >
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

export default {;
  TestConfigPanel,
  TestHistoryPanel,
  TestResultExport,
  TestMetricCard,
  TestProgressBar
};
