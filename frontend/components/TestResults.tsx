/**
 * 测试结果组件
 * 显示测试执行结果和相关指标
 */

import React from 'react;export interface TestResult {';
  executionId: string;
  status: 'running' | 'completed' | 'failed
  testType: string;
  score?: number;
  metrics?: {
    responseTime?: number;
    throughput?: number;
    errorRate?: number
}
  recommendations?: string[]
  startTime: string;
  completedAt?: string
}

interface TestResultsProps   {
  result: TestResult;
  onRetry?: () => void;
  onDownload?: () => void
}

export const TestResults: React.FC<TestResultsProps> = ({
  result,
  onRetry,
  onDownload
}) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState("); // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`'}'}, [pageTitle]);`;
  // 页面可见性检测  useEffect(() => {`;
    const handleVisibilityChange = () => {'      if (document.visibilityState ==="visible') {`
        // 页面变为可见时刷新数据
        fetchData?.()
}
    }`;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {;
      document.removeEventListener("visibilitychange', handleVisibilityChange)
}
}, [fetchData]); // 测试业务逻辑
  const [testConfig, setTestConfig] = useState({});
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);`
  const runTest = useCallback(async (config) => {
    try {
      setIsRunning(true);
      setTestResults(null);`;
      const response = await apiClient.post('/api/tests/run', config);
      setTestResults(response.data)
} catch (err) {;
      handleError(err, "test execution")
} finally {
      setIsRunning(false)
}
  }, [handleError]);
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event)
}, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value)
}, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {;
    id: componentId,    "aria-label': ariaLabel,`;
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy;
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  }
  
  const [state, setState] = useState({
    value: defaultValue,
    loading: false,
    error: null,
    touched: false,
    focused: false
  });
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }))
}, []);
  const getStatusColor = (status: string) => {
    switch (status) {;
      case 'completed': return 'text-green-600;
      case 'failed': return 'text-red-600;
      case 'running': return 'text-blue-600;
      default: return 'text-gray-600
    }
  }`
  const getScoreColor = (score: number) => {;
    if (score >= 80) return 'text-green-600;
    if (score >= 60) return 'text-yellow-600;
    return 'text-red-600
  }`
  return (
    <div className="bg-white rounded-lg shadow-md p-6>
      <div className="flex justify-between items-start mb-4>
        <div>
          <h3 className="text-lg font-semibold>测试结果</h3>
          <p className="text-sm text-gray-600>执行ID: {result.executionId}</p>
        </div>
        <div className="flex space-x-2>
          {onRetry && (
            <button>
              onClick={onRetry}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600;
            >
              重新测试
            </button>
          )}
          {onDownload && result.status === completed
            <button>
              onClick={onDownload}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600;
            >
              下载报告
            </button>
          )}
        </div>
      </div>`;
      <div className="grid grid-cols-2 gap-4 mb-4>
        <div>
          <label className="text-sm font-medium text-gray-700>状态</label>
          <p className={`text-lg font-semibold ${getStatusColor(result.status)}`}>            {result.status ==="running' && '运行中'}`;
            {result.status ==='completed' && '已完成'}
            {result.status ==='failed' && "失败'}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700>测试类型</label>
          <p className="text-lg>{result.testType}</p>
        </div>
      </div>`
      {result.score !== undefined && (;
        <div className="mb-4>
          <label className="text-sm font-medium text-gray-700>总体评分</label>
          <p className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
            {result.score}/100
          </p>
        </div>
      )}`
      {result.metrics && (;
        <div className="mb-4>`;
          <h4 className="text-md font-semibold mb-2>性能指标</h4>
          <div className="grid grid-cols-3 gap-4>
            {result.metrics.responseTime && (
              <div>
                <label className="text-sm text-gray-600>响应时间</label>
                <p className="text-lg font-semibold>{result.metrics.responseTime}ms</p>
              </div>
            )}
            {result.metrics.throughput && (
              <div>
                <label className="text-sm text-gray-600>吞吐量</label>
                <p className="text-lg font-semibold>{result.metrics.throughput}/s</p>
              </div>
            )}
            {result.metrics.errorRate && (
              <div>
                <label className="text-sm text-gray-600>错误率</label>
                <p className="text-lg font-semibold>{(result.metrics.errorRate * 100).toFixed(2)}%</p>
              </div>
            )}
          </div>
        </div>
      )}`;
      {result.recommendations && result.recommendations.length > 0 && (<div className="mb-4>
          <h4 className="text-md font-semibold mb-2>优化建议</h4>
          <ul className="list-disc list-inside space-y-1>
            {result.recommendations.map((rec, index) => (;
              <li key={index} className="text-sm text-gray-700>{rec}</li>
            ))}
          </ul>
        </div>
      )}`;
      <div className="text-sm text-gray-500>
        <p>开始时间: {new Date(result.startTime).toLocaleString()}</p>
        {result.completedAt && (
          <p>完成时间: {new Date(result.completedAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  )
}`;
export default TestResults;"