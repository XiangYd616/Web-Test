import { AlertCircle, BarChart3, CheckCircle, Clock, Database, Download, Eye, FileText, Globe, Shield, TrendingDown, TrendingUp, Wifi, XCircle, Zap    } from 'lucide-react';import React from 'react';interface TestResult   {'
  testId: string;
  testType: string;
  url?: string;
  status: 'running' | 'completed' | 'failed';
  overallScore?: number;
  startTime: string;
  endTime?: string;
  actualDuration?: number;
  error?: string;
  [key: string]: any;
}

export interface TestResultDisplayProps     {
  result: TestResult;
  onViewDetails?: (result: TestResult) => void;
  onDownloadReport?: (result: TestResult) => void;
  onRetry?: (result: TestResult) => void;
}

const TestResultDisplay: React.FC<TestResultDisplayProps>  = ({
  result,
  onViewDetails,
  onDownloadReport,
  onRetry
}) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState("');'
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;`
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible') {'`
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);'
    return () => {
      document.removeEventListener("visibilitychange', handleVisibilityChange);'
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

      const response = await apiClient.post('/api/tests/run', config);'
      setTestResults(response.data);
    } catch (err) {
      handleError(err, "test execution');'
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
  const errorId = `${componentId}-error`;`
  const descriptionId = `${componentId}-description`;`
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`
    'aria-labelledby': ariaLabelledBy,'
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,'
    'aria-invalid': !!error,'
    'aria-disabled': disabled,'
    'aria-busy': loading,'
    'aria-expanded': expanded,'
    'aria-selected': selected,'
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  
  const [state, setState] = useState({
    value: defaultValue,
    loading: false,
    error: null,
    touched: false,
    focused: false
  });
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  const getTestTypeIcon = (type: string) => {
    if (!type) return <BarChart3 className= 'w-5 h-5'    />;'
    switch (type.toLowerCase()) {
      case 'website': ''
      case 'comprehensive': ''
        return <Globe className= 'w-5 h-5'    />;'
      case 'stress': ''
      case 'performance': ''
        return <Zap className= 'w-5 h-5'    />;'
      case 'security': ''
        return <Shield className= 'w-5 h-5'    />;'
      case 'api': ''
        return <BarChart3 className= 'w-5 h-5'    />;'
      case 'database': ''
        return <Database className= 'w-5 h-5'    />;'
      case 'network': ''
        return <Wifi className= 'w-5 h-5'    />;'
      case 'ux': ''
        return <Eye className= 'w-5 h-5'    />;'
      case 'compatibility': ''
        return <FileText className= 'w-5 h-5'    />;'
      default:
        return <BarChart3 className= 'w-5 h-5'    />;'
    }
  };

  const getTestTypeLabel = (type: string) => {
    if (!type) return '未知测试';
    const labels = {
      website: '网站综合测试','
      comprehensive: '网站综合测试','
      stress: '压力测试','
      performance: '性能测试','
      security: '安全测试','
      api: 'API测试','
      database: '数据库测试','
      network: '网络测试','
      ux: '用户体验测试','
      compatibility: '兼容性测试','
      content: '内容测试';
    };
    return labels[type.toLowerCase() as keyof typeof labels] || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': ''
        return <CheckCircle className= 'w-5 h-5 text-green-400'    />;'
      case 'failed': ''
        return <XCircle className= 'w-5 h-5 text-red-400'    />;'
      case 'running': ''
        return <Clock className= 'w-5 h-5 text-blue-400 animate-spin'    />;'
      default:
        return <AlertCircle className= 'w-5 h-5 text-yellow-400'    />;'
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      completed: '已完成','
      failed: '失败','
      running: '运行中','
      cancelled: '已取消';
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 70) return <TrendingUp className= 'w-4 h-4'    />;'
    return <TrendingDown className= 'w-4 h-4'    />;'
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}秒`;`
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}分${remainingSeconds}秒`;`
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN');'`
  };

  return (
    <div className= 'bg-gray-800 rounded-lg p-6 border border-gray-700'>
      {/* 测试头部信息 */}
      <div className= 'flex items-start justify-between mb-4'>
        <div className= 'flex items-center space-x-3'>
          <div className= 'flex-shrink-0 p-2 bg-gray-700 rounded-lg'>
            {getTestTypeIcon(result.testType || result.test_type)}
          </div>
          <div>
            <h3 className= 'text-lg font-semibold text-white'>
              {getTestTypeLabel(result.testType || result.test_type)}
            </h3>
            {result.url && (
              <p className= 'text-sm text-gray-400 mt-1'>
                {result.url}
              </p>
            )}
            <p className= 'text-xs text-gray-500 mt-1'>
              测试ID: {result.testId}
            </p>
          </div>
        </div>

        {/* 状态和分数 */}
        <div className= 'text-right'>
          <div className= 'flex items-center justify-end space-x-2 mb-2'>
            {getStatusIcon(result.status)}
            <span className= 'text-sm text-gray-300'>
              {getStatusLabel(result.status)}
            </span>
          </div>

          {result.overallScore !== undefined && result.status === 'completed' && ('')
            <div className= 'flex items-center justify-end space-x-1'>
              {getScoreIcon(result.overallScore)}
              <span className={`text-lg font-bold ${getScoreColor(result.overallScore)}`}>`
                {Math.round(result.overallScore)}分
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 时间信息 */}
      <div className= "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm'>`
        <div>
          <span className= 'text-gray-400'>开始时间:</span>
          <p className= 'text-white mt-1'>{formatDate(result.startTime)}</p>
        </div>

        {result.endTime && (
          <div>
            <span className= 'text-gray-400'>结束时间:</span>
            <p className= 'text-white mt-1'>{formatDate(result.endTime)}</p>
          </div>
        )}

        {result.actualDuration && (
          <div>
            <span className= 'text-gray-400'>耗时:</span>
            <p className= 'text-white mt-1'>{formatDuration(result.actualDuration)}</p>
          </div>
        )}
      </div>

      {/* 错误信息 */}
      {result.error && result.status === 'failed' && ('')
        <div className= 'mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg'>
          <div className= 'flex items-center space-x-2 mb-2'>
            <XCircle className= 'w-4 h-4 text-red-400'    />
            <span className= 'text-sm font-medium text-red-400'>错误信息</span>
          </div>
          <p className= 'text-sm text-red-300'>{result.error}</p>
        </div>
      )}

      {/* 快速统计信息 */}
      {result.status === 'completed' && ('')
        <div className= 'mb-4'>
          {/* 网站测试统计 */}
          {(result.testType === 'website' || result.testType === 'comprehensive') && result.results && ('')
            <div className= 'grid grid-cols-2 md:grid-cols-4 gap-3 text-sm'>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>性能分数</p>
                <p className= 'text-white font-semibold'>{result.results.performance?.score || 0}分</p>
              </div>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>SEO分数</p>
                <p className= 'text-white font-semibold'>{result.results.seo?.score || 0}分</p>
              </div>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>安全分数</p>
                <p className= 'text-white font-semibold'>{result.results.security?.score || 0}分</p>
              </div>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>可访问性</p>
                <p className= 'text-white font-semibold'>{result.results.accessibility?.score || 0}分</p>
              </div>
            </div>
          )}

          {/* 压力测试统计 */}
          {(result.testType === 'stress' || result.testType === 'performance') && result.metrics && ('')
            <div className= 'grid grid-cols-2 md:grid-cols-4 gap-3 text-sm'>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>总请求数</p>
                <p className= 'text-white font-semibold'>{result.metrics.totalRequests || 0}</p>
              </div>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>成功率</p>
                <p className= 'text-white font-semibold'>
                  {result.metrics.totalRequests ?
                    Math.round((result.metrics.successfulRequests / result.metrics.totalRequests) * 100) : 0}%
                </p>
              </div>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>平均响应时间</p>
                <p className= 'text-white font-semibold'>{result.metrics.averageResponseTime || 0}ms</p>
              </div>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>吞吐量</p>
                <p className= 'text-white font-semibold'>{result.metrics.throughput || 0} req/s</p>
              </div>
            </div>
          )}

          {/* API测试统计 */}
          {result.testType === 'api' && result.summary && ('')
            <div className= 'grid grid-cols-2 md:grid-cols-4 gap-3 text-sm'>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>总端点数</p>
                <p className= 'text-white font-semibold'>{result.summary.totalRequests || 0}</p>
              </div>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>成功数</p>
                <p className= 'text-white font-semibold'>{result.summary.successfulRequests || 0}</p>
              </div>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>失败数</p>
                <p className= 'text-white font-semibold'>{result.summary.failedRequests || 0}</p>
              </div>
              <div className= 'bg-gray-700 p-3 rounded-lg text-center'>
                <p className= 'text-gray-400'>平均响应时间</p>
                <p className= 'text-white font-semibold'>{result.summary.averageResponseTime || 0}ms</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className= 'flex items-center justify-end space-x-3 pt-4 border-t border-gray-700'>
        {result.status === 'completed' && onViewDetails && (<button'
            type= 'button';
            onClick={() => onViewDetails(result)}
            className= 'flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors';
          >
            <Eye className= 'w-4 h-4'    />
            <span>查看详情</span>
          </button>
        )}

        {result.status === 'completed' && onDownloadReport && (<button'
            type= 'button';
            onClick={() => onDownloadReport(result)}
            className= 'flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors';
          >
            <Download className= 'w-4 h-4'    />
            <span>下载报告</span>
          </button>
        )}

        {result.status === 'failed' && onRetry && (<button'
            type= 'button';
            onClick={() => onRetry(result)}
            className= 'flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors';
          >
            <Clock className= 'w-4 h-4'    />
            <span>重新测试</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TestResultDisplay;
