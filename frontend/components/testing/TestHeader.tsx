import { LucideIcon } from 'lucide-react';
import React from 'react';

interface TestHeaderProps {
  // 基本信息
  title: string;
  description: string;
  icon: LucideIcon;

  // 标签页状态
  activeTab: 'test' | 'history';
  onTabChange: (tab: 'test' | 'history') => void;
  testTabLabel?: string;
  historyTabLabel?: string;

  // 测试状态
  testStatus?: 'idle' | 'running' | 'completed' | 'failed';
  isTestDisabled?: boolean;
  onStartTest?: () => void;
  onStopTest?: () => void;

  // 额外的控制按钮
  extraControls?: React.ReactNode;

  // 样式
  className?: string;
}

export const TestHeader: React.FC<TestHeaderProps> = ({
  title,
  description,
  icon: Icon,
  activeTab,
  onTabChange,
  testTabLabel = '测试',
  historyTabLabel = '测试历史',
  testStatus = 'idle',
  isTestDisabled = false,
  onStartTest,
  onStopTest,
  extraControls,
  className = ''
}) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');

  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      handleError(err, 'test execution');
    } finally {
      setIsRunning(false);
    }
  }, [handleError]);
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [
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
  const getTestButtonConfig = () => {
    switch (testStatus) {
      case 'running':
        return {
          text: '停止测试',
          onClick: onStopTest,
          className: 'bg-red-600 hover:bg-red-700 text-white',
          disabled: false
        };
      case 'idle':
      default:
        return {
          text: '开始测试',
          onClick: onStartTest,
          className: isTestDisabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white',
          disabled: isTestDisabled
        };
    }
  };

  const testButtonConfig = getTestButtonConfig();

  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* 左侧：标题和描述 */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Icon className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <p className="text-gray-300 text-sm">{description}</p>
          </div>
        </div>

        {/* 右侧：控制区域 */}
        <div className="flex items-center space-x-3">
          {/* 额外控制按钮 */}
          {extraControls}

          {/* 标签页切换 */}
          <div className="flex items-center bg-gray-700/50 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => onTabChange('test')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${activeTab === 'test'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                }`}
            >
              {testTabLabel}
            </button>
            <button
              type="button"
              onClick={() => onTabChange('history')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                }`}
            >
              {historyTabLabel}
            </button>
          </div>

          {/* 测试控制按钮 - 只在测试标签页显示 */}
          {activeTab === 'test' && (onStartTest || onStopTest) && (
            <button
              type="button"
              onClick={testButtonConfig.onClick}
              disabled={testButtonConfig.disabled}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${testButtonConfig.className}`}
            >
              <span>{testButtonConfig.text}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestHeader;
