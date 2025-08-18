import { History    } from 'lucide-react';import React, { ReactNode, useEffect, useState    } from 'react';import { TestPageHistory    } from '../ui/TestPageHistory.tsx';interface TestPageWithHistoryProps   {
  // 页面基本信息
  testType: 'stress' | 'security' | 'api' | 'performance' | 'compatibility' | 'seo' | 'accessibility'
  testTypeName: string;
  testIcon: React.ComponentType<{ className?: string }>

  // 页面内容
  children: ReactNode;

  // 历史记录处理
  onTestSelect?: (test: any) => void;
  onTestRerun?: (test: any) => void;

  // 样式
  className?: string;

  // 其他组件
  additionalComponents?: ReactNode;
}

export const TestPageWithHistory: React.FC<TestPageWithHistoryProps> = ({
  testType,
  testTypeName,
  testIcon: TestIcon,
  children,
  onTestSelect,
  onTestRerun,
  className ='',
  additionalComponents
}) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState("");
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState ==="visible') {'`"`
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange', handleVisibilityChange);"
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
    "aria-label': ariaLabel,'`"`
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    "aria-selected': selected,"
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  // 状态持久化的键名
  const storageKey = `unified-test-page-${testType}-active-tab`;

  // 标签页状态（支持状态持久化）
  const [activeTab, setActiveTab] = useState<"test' | 'history'>(() => {'`"`
    try {
      const saved = localStorage.getItem(storageKey);
      return (saved as 'test' | 'history') || 'test
    } catch {
      return 'test'
    }
  });

  // 状态持久化
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, activeTab);
    } catch {
      // 忽略存储错误
    }
  }, [activeTab, storageKey]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + 1: 切换到测试标签页
      if ((event.ctrlKey || event.metaKey) && event.key ==='1') {
        event.preventDefault();
        setActiveTab('test");"
      }
      // Ctrl/Cmd + 2: 切换到历史标签页
      if ((event.ctrlKey || event.metaKey) && event.key ==='2') {
        event.preventDefault();
        setActiveTab("history");
      }
      // Tab键在标签页之间切换
      if (event.key ==='Tab' && event.altKey) {
        event.preventDefault();
        setActiveTab(prev => prev ==='test' ? 'history' : 'test");"
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener("keydown', handleKeyDown);"
  }, []);

  // 标签页切换处理
  const handleTabChange = (tab: 'test' | "history') => {"
    setActiveTab(tab);
  };

  // 默认的历史记录处理函数
  const handleTestSelect = (test: any) => {
    setActiveTab('test");"
    onTestSelect?.(test);
  };

  const handleTestRerun = (test: any) => {
    setActiveTab('test");"
    onTestRerun?.(test);
  };

  return (<div className={`space-y-3 dark-page-scrollbar compact-layout ${className}`}>`
      {/* 标签页导航 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50'>`'"`
        <div className='flex border-b border-gray-700/50 relative'>
          {/* 活动标签页指示器 */}
          <div>
            className={`absolute bottom-0 h-0.5 bg-blue-400 transition-all duration-300 ease-in-out ${activeTab ==='test' ? 'left-0 w-1/2' : 'left-1/2 w-1/2";`}"
              }`}`
          />

          <button>
            type="button";``
            onClick={() => handleTabChange('test')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative flex-1 justify-center ${activeTab ==='test";`}"
              ? "text-blue-400 bg-blue-500/10";``
              : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}`
            title={`${testTypeName} (Ctrl+1)`}`
          >
            <TestIcon className="w-4 h-4'    />`'"`
            {testTypeName}
            <span className='text-xs opacity-60 ml-1'>⌘1</span>
          </button>
          <button>
            type='button'
            onClick={() => handleTabChange('history')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative flex-1 justify-center ${activeTab ==='history";`}"
              ? "text-blue-400 bg-blue-500/10";``
              : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}`
            title="测试历史 (Ctrl+2)";``
          >
            <History className='w-4 h-4'    />
            测试历史
            <span className='text-xs opacity-60 ml-1'>⌘2</span>
          </button>
        </div>
      </div>

      {/* 标签页内容 */}
      <div className='relative'>
        {/* 测试标签页内容 */}
        <div>
          className={`transition-all duration-300 ease-in-out ${activeTab ==='test";`}"
            ? "opacity-100 translate-y-0 pointer-events-auto";``
            : 'opacity-0 translate-y-2 pointer-events-none absolute inset-0'
            }`}`
        >
          {children}
        </div>

        {/* 历史标签页内容 */}
        <div>
          className={`transition-all duration-300 ease-in-out ${activeTab ==='history";`}"
            ? "opacity-100 translate-y-0 pointer-events-auto";``
            : 'opacity-0 translate-y-2 pointer-events-none absolute inset-0'
            }`}`
        >
          <TestPageHistory testType={testType}>
            onTestSelect={handleTestSelect}
            onTestRerun={handleTestRerun}
             />
        </div>
      </div>

      {/* 其他组件（如登录提示等） */}
      {additionalComponents}
    </div>
  );
};

export default TestPageWithHistory;
