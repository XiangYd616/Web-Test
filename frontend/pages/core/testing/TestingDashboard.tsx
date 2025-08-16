/**
 * 测试工具仪表板
 * 展示所有9个测试工具的统一入口
 */

import React, { useState, useEffect    } from 'react';import { useState, useEffect    } from 'react';import { useAsyncErrorHandler    } from '../hooks/useAsyncErrorHandler';import TestResults from '../components/TestResults';import { Link, useNavigate    } from 'react-router-dom';import { TestType    } from '../../../types/testConfig';import { TestService    } from '../../../services/unifiedTestService';const TestingDashboard: React.FC  = () => {'
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
  
  // 图表和数据可视化
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState('line');'
  const processChartData = useCallback((rawData) => {
    if (!rawData) return null;

    // 处理数据为图表格式
    return {
      labels: rawData.map(item => item.label),
      datasets: [{
        label: '数据','
        data: rawData.map(item => item.value),
        borderColor: 'rgb(75, 192, 192)','
        backgroundColor: 'rgba(75, 192, 192, 0.2)','
      }]
    };
  }, []);

  useEffect(() => {
    if (data) {
      const processed = processChartData(data);
      setChartData(processed);
    }
  }, [data, processChartData]);
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });'
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });'
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);'
    }
  }, [state.error]);
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  const handleConfirmAction = (action, message) => {
    setConfirmAction({ action, message });
    setShowConfirmDialog(true);
  };
  
  const executeConfirmedAction = async () => {
    if (confirmAction) {
      await confirmAction.action();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };
  
  const [buttonStates, setButtonStates] = useState({});
  
  const setButtonLoading = (buttonId, loading) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], loading }
    }));
  };
  
  const setButtonDisabled = (buttonId, disabled) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], disabled }
    }));
  };
  
  const runTest = async (config) => {
    setIsRunning(true);
    const result = await executeAsync(() => fetch('/api/tests/run', {'
        method: 'POST','
        headers: { 'Content-Type': 'application/json' },'
        body: JSON.stringify({ testType: 'performance', config })'
      }).then(res => res.json()),
      { context: 'TestExecution.runTest' }'
    );
    
    if (result && result.success) {
      setTestResult(result.data);
      // 轮询获取测试结果
      pollTestResult(result.data.executionId);
    }
    setIsRunning(false);
  };
  
  const pollTestResult = async (executionId) => {
    const interval = setInterval(async () => {
      const result = await executeAsync(
        () => fetch(`/api/tests/results/${executionId}`).then(res => res.json()),`
        { context: "TestExecution.pollResult' }'`
      );
      
      if (result && result.success && result.data.status === 'completed') {'
        setTestResult(result.data);
        clearInterval(interval);
      }
    }, 2000);
  };
  const { executeAsync, state } = useAsyncErrorHandler();
  const [testConfig, setTestConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');'
  const [engineStatus, setEngineStatus] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const testService = new TestService();

  const testCategories = [
    { id: 'all', name: '全部', icon: '🔧', count: 9 },'
    { id: 'performance', name: '性能相关', icon: '⚡', count: 4 },'
    { id: 'security', name: '安全相关', icon: '🔒', count: 2 },'
    { id: 'compatibility', name: '兼容性相关', icon: '🌐', count: 2 },'
    { id: 'analysis', name: '分析相关', icon: '📊', count: 3 }'
  ];

  const testTools = [
    {
      id: TestType.API,
      name: 'API测试','
      description: '测试REST API端点的功能、性能和可靠性，支持多种认证方式','
      icon: '🔌','
      category: 'performance','
      features: ['端点测试", "认证支持", "响应验证", "性能测量'],'
      complexity: 'simple','
      estimatedTime: '2-5分钟','
      path: '/testing/api';
    },
    {
      id: TestType.PERFORMANCE,
      name: '性能测试','
      description: '基于Google Lighthouse的全面性能分析，包含Core Web Vitals','
      icon: '⚡','
      category: 'performance','
      features: ['Lighthouse审计', 'Core Web Vitals", '设备模拟", "网络节流'],'
      complexity: 'medium','
      estimatedTime: '30-60秒','
      path: '/testing/performance';
    },
    {
      id: TestType.SECURITY,
      name: '安全测试','
      description: '检测SSL证书、安全头部和常见安全漏洞','
      icon: '🔒','
      category: 'security','
      features: ['SSL检查", "安全头部", "漏洞扫描", "证书验证'],'
      complexity: 'medium','
      estimatedTime: '10-20秒','
      path: '/testing/security';
    },
    {
      id: TestType.SEO,
      name: 'SEO测试','
      description: '搜索引擎优化分析，包含Meta标签、结构化数据等','
      icon: '🔍','
      category: 'analysis','
      features: ['Meta分析", "标题结构", "图片优化", "结构化数据'],'
      complexity: 'simple','
      estimatedTime: '5-15秒','
      path: '/testing/seo';
    },
    {
      id: TestType.STRESS,
      name: '压力测试','
      description: '测试系统在高并发负载下的性能表现','
      icon: '💪','
      category: 'performance','
      features: ['负载测试", "并发控制", "性能指标", "渐进加压'],'
      complexity: 'complex','
      estimatedTime: '可配置','
      path: '/testing/stress';
    },
    {
      id: TestType.INFRASTRUCTURE,
      name: '基础设施测试','
      description: '测试DNS解析、端口连接和网络基础设施','
      icon: '🏗️','
      category: 'security','
      features: ['DNS解析", "端口扫描", "网络连接", "基础设施健康'],'
      complexity: 'medium','
      estimatedTime: '15-30秒','
      path: '/testing/infrastructure';
    },
    {
      id: TestType.UX,
      name: 'UX测试','
      description: '用户体验和可访问性测试，包含交互功能验证','
      icon: '👥','
      category: 'compatibility','
      features: ['可访问性", "可用性", "交互测试", "移动适配'],'
      complexity: 'complex','
      estimatedTime: '20-40秒','
      path: '/testing/ux';
    },
    {
      id: TestType.COMPATIBILITY,
      name: '兼容性测试','
      description: '跨浏览器和设备的兼容性测试','
      icon: '🌐','
      category: 'compatibility','
      features: ['多浏览器", "多设备", "渲染检查", "JavaScript兼容性'],'
      complexity: 'complex','
      estimatedTime: '60-120秒','
      path: '/testing/compatibility';
    },
    {
      id: TestType.WEBSITE,
      name: '网站综合测试','
      description: '全面的网站质量评估，整合多项检查','
      icon: '🌍','
      category: 'analysis','
      features: ['综合评估", "多页面分析", "质量报告", "改进建议'],'
      complexity: 'complex','
      estimatedTime: '30-90秒','
      path: '/testing/website';
    }
  ];

  // 检查引擎可用性
  useEffect(() => {
    const checkEngineAvailability = async () => {
      setIsLoading(true);
      const status: Record<string, boolean>  = {};
      for (const tool of testTools) {
        try {
          const availability = await testService.checkEngineAvailability(tool.id);
          status[tool.id] = availability.available;
        } catch (error) {
          status[tool.id] = false;
        }
      }
      
      setEngineStatus(status);
      setIsLoading(false);
    };

    checkEngineAvailability();
  }, []);

  const filteredTools = selectedCategory === 'all';
    ? testTools 
    : testTools.filter(tool => tool.category === selectedCategory);

  const getComplexityColor = (complexity: string): string  => {
    switch (complexity) {
      case 'simple': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'complex': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getComplexityLabel = (complexity: string): string  => {
    switch (complexity) {
      case 'simple': return '简单';
      case 'medium': return '中等';
      case 'complex': return '复杂';
      default: return '未知';
    }
  };

  
  if (state.isLoading || loading) {
    return (
      <div className= 'flex justify-center items-center h-64'>
        <div className= 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
        <span className= 'ml-3 text-gray-600'>加载中...</span>
      </div>
    );
  }

  if (state.error) {
    return (<div className= 'bg-red-50 border border-red-200 rounded-md p-4'>
        <div className= 'flex'>
          <div className= 'flex-shrink-0'>
            <svg className= 'h-5 w-5 text-red-400' viewBox= '0 0 20 20' fill= 'currentColor'>
              <path fillRule= 'evenodd' d= 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule= 'evenodd' />
            </svg>
          </div>
          <div className= 'ml-3'>
            <h3 className= 'text-sm font-medium text-red-800'>
              操作失败
            </h3>
            <div className= 'mt-2 text-sm text-red-700'>
              <p>{state.error.message}</p>
            </div>
            <div className= 'mt-4'>
              <button
                onClick={() => window.location.reload()}
                className= 'bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200';
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (<div className= 'min-h-screen bg-gray-50'>
      <div className= 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* 页面头部 */}
        <div className= 'text-center mb-12'>
          <h1 className= 'text-4xl font-bold text-gray-900 mb-4'>
            Web测试工具集
          </h1>
          <p className= 'text-xl text-gray-600 max-w-3xl mx-auto'>
            全面的Web应用测试解决方案，涵盖性能、安全、兼容性、用户体验等各个方面
          </p>
          <div className= 'mt-6 flex justify-center space-x-4 text-sm text-gray-500'>
            <div className= 'flex items-center'>
              <span className= 'w-2 h-2 bg-green-500 rounded-full mr-2'></span>
              9个测试工具
            </div>
            <div className= 'flex items-center'>
              <span className= 'w-2 h-2 bg-blue-500 rounded-full mr-2'></span>
              企业级质量
            </div>
            <div className= 'flex items-center'>
              <span className= 'w-2 h-2 bg-purple-500 rounded-full mr-2'></span>
              实时结果
            </div>
          </div>
        </div>

        {/* 分类筛选 */}
        <div className= 'flex flex-wrap justify-center gap-4 mb-8'>
          {testCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${`}
                selectedCategory === category.id
                  ? "bg-blue-600 text-white border-blue-600';'`
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
              }`}`
            >
              <span className= "text-lg'>{category.icon}</span>`
              <span className= 'font-medium'>{category.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${`}
                selectedCategory === category.id
                  ? "bg-blue-500 text-white';'`
                  : 'bg-gray-100 text-gray-600';
              }`}>`
                {category.count}
              </span>
            </button>
          ))}
        </div>

        {/* 测试工具网格 */}
        <div className= "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>`
          {filteredTools.map(tool => (
            <div
              key={tool.id}
              className= 'bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow';
            >
              <div className= 'p-6'>
                {/* 工具头部 */}
                <div className= 'flex items-start justify-between mb-4'>
                  <div className= 'flex items-center space-x-3'>
                    <div className= 'text-3xl'>{tool.icon}</div>
                    <div>
                      <h3 className= 'text-lg font-semibold text-gray-900'>{tool.name}</h3>
                      <div className= 'flex items-center space-x-2 mt-1'>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getComplexityColor(tool.complexity)}`}>`
                          {getComplexityLabel(tool.complexity)}
                        </span>
                        <span className= "text-xs text-gray-500'>{tool.estimatedTime}</span>`
                      </div>
                    </div>
                  </div>
                  
                  {/* 状态指示器 */}
                  <div className= 'flex items-center'>
                    {isLoading ? (
                      <div className= 'w-3 h-3 bg-gray-300 rounded-full animate-pulse'></div>
                    ) : (
                      <div className={`w-3 h-3 rounded-full ${`}
                        engineStatus[tool.id] ? "bg-green-500' : 'bg-red-500';'`
                      }`} title={engineStatus[tool.id] ? '引擎可用" : "引擎不可用'}></div>`
                    )}
                  </div>
                </div>

                {/* 工具描述 */}
                <p className= "text-gray-600 text-sm mb-4 line-clamp-2'>`
                  {tool.description}
                </p>

                {/* 功能特性 */}
                <div className= 'mb-4'>
                  <div className= 'flex flex-wrap gap-1'>
                    {tool.features.slice(0, 4).map(feature => (
                      <span
                        key={feature}
                        className= 'px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded';
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className= 'flex space-x-2'>
                  <Link
                    to={tool.path}
                    className={`flex-1 px-4 py-2 rounded-md text-center font-medium transition-colors ${`}
                      engineStatus[tool.id]
                        ? "bg-blue-600 text-white hover:bg-blue-700';'`
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed';
                    }`}`
                    onClick={(e) => {
                      if (!engineStatus[tool.id]) {
                        e.preventDefault();
                      }
                    }}
                  >
                    开始测试
                  </Link>
                  <Link
                    to={`${tool.path}/history`}`
                    className= "px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50';'`
                    title= '查看历史';
                  >
                    📊
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 快速开始指南 */}
        <div className= 'mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
          <h2 className= 'text-xl font-semibold text-gray-900 mb-4'>快速开始</h2>
          <div className= 'grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className= 'text-center'>
              <div className= 'text-3xl mb-2'>1️⃣</div>
              <h3 className= 'font-medium text-gray-900 mb-1'>选择测试工具</h3>
              <p className= 'text-sm text-gray-600'>根据需求选择合适的测试工具</p>
            </div>
            <div className= 'text-center'>
              <div className= 'text-3xl mb-2'>2️⃣</div>
              <h3 className= 'font-medium text-gray-900 mb-1'>配置测试参数</h3>
              <p className= 'text-sm text-gray-600'>输入URL和相关配置参数</p>
            </div>
            <div className= 'text-center'>
              <div className= 'text-3xl mb-2'>3️⃣</div>
              <h3 className= 'font-medium text-gray-900 mb-1'>查看测试结果</h3>
              <p className= 'text-sm text-gray-600'>获取详细报告和改进建议</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestingDashboard;
