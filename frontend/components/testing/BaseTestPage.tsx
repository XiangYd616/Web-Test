import { LucideIcon } from 'lucide-react';
import React from 'react';

interface BaseTestPageProps {
  // 页面基本信息
  testType: string;
  title: string;
  description: string;
  icon: LucideIcon;
  
  // 页面内容
  children: React.ReactNode;
  
  // 样式自定义
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  
  // 额外的头部内容
  headerExtra?: React.ReactNode;
}

/**
 * 基础测试页面组件
 * 提供统一的页面结构和风格，但允许每个测试工具自定义内容
 */
export const BaseTestPage: React.FC<BaseTestPageProps> = ({
  testType,
  title,
  description,
  icon: Icon,
  children,
  className = '',
  headerClassName = '',
  contentClassName = '',
  headerExtra
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
  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${className}`}>
      {/* 页面头部 */}
      <div className={`bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ${headerClassName}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {description}
                </p>
              </div>
            </div>
            {headerExtra && (
              <div className="flex-shrink-0">
                {headerExtra}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 页面内容 */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default BaseTestPage;
