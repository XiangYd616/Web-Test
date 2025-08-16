/**
 * 测试配置组件
 * 提供统一的测试配置界面
 */

import React, { useState    } from 'react';import { Button    } from '../ui/Button';export interface TestConfigProps     {'
  testType: string;
  onConfigChange: (config: any) => void;
  onStart: (config: any) => void;
  loading?: boolean;
}

export interface TestConfig     {
  url: string;
  timeout: number;
  retries: number;
  advanced: {
    userAgent?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  };
}

const TestConfig: React.FC<TestConfigProps>  = ({
  testType,
  onConfigChange,
  onStart,
  loading = false
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);'
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
  const [config, setConfig] = useState<TestConfig>({
    url: "','
    timeout: 30000,
    retries: 3,
    advanced: {}
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleAdvancedChange = (field: string, value: any) => {
    const newConfig = {
      ...config,
      advanced: { ...config.advanced, [field]: value }
    };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleStart = () => {
    if (config.url) {
      onStart(config);
    }
  };

  return (<div className= 'test-config p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg'>
      <h3 className= 'text-lg font-semibold mb-4 text-gray-900 dark:text-white'>
        {testType} 测试配置
      </h3>
      
      {/* 基础配置 */}
      <div className= 'space-y-4'>
        <div>
          <label className= 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            测试URL *
          </label>
          <input
            type= 'url';
            value={config.url}
            onChange={(e) => handleConfigChange('url', e.target.value)}'
            placeholder= 'https://example.com';
            className= 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md '
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent';
            required
          />
        </div>

        <div className= 'grid grid-cols-2 gap-4'>
          <div>
            <label className= 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              超时时间 (ms)
            </label>
            <input
              type= 'number';
              value={config.timeout}
              onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}'
              min= '1000';
              max= '300000';
              className= 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md '
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent';
            />
          </div>

          <div>
            <label className= 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              重试次数
            </label>
            <input
              type= 'number';
              value={config.retries}
              onChange={(e) => handleConfigChange('retries', parseInt(e.target.value))}'
              min= '0';
              max= '10';
              className= 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md '
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent';
            />
          </div>
        </div>

        {/* 高级配置切换 */}
        <div>
          <button
            type= 'button';
            onClick={() => setShowAdvanced(!showAdvanced)}
            className= 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 '
                     text-sm font-medium';
          >
            {showAdvanced ? '隐藏" : '显示'} 高级配置'
          </button>
        </div>

        {/* 高级配置 */}
        {showAdvanced && (<div className= 'space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md'>
            <div>
              <label className= 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                User Agent
              </label>
              <input
                type= 'text';
                value={config.advanced.userAgent || ''}'
                onChange={(e) => handleAdvancedChange("userAgent', e.target.value)}'
                placeholder= '自定义 User Agent';
                className= 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md '
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent';
              />
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className= 'flex justify-end space-x-3 mt-6'>
        <Button
          variant= 'secondary';
          onClick={() => setConfig({
            url: "','
            timeout: 30000,
            retries: 3,
            advanced: {}
          })}
          disabled={loading}
        >
          重置
        </Button>
        
        <Button
          variant= 'primary';
          onClick={handleStart}
          disabled={!config.url || loading}
          loading={loading}
        >
          {loading ? "启动中..." : "开始测试'}'
        </Button>
      </div>
    </div>
  );
};

export default TestConfig;
