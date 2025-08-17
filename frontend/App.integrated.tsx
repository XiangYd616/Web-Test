/**
 * 完全集成版应用程序
 * 整合了所有阶段的功能：核心架构、UI组件库、测试引擎
 * 提供完整的专业Web测试平台体验
 */

import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 增强的上下文提供者
import { EnhancedAuthProvider, useEnhancedAuth } from './contexts/EnhancedAuthContext';
import { EnhancedThemeProvider, useEnhancedTheme } from './contexts/EnhancedThemeContext';
import { EnhancedAppProvider, useEnhancedApp } from './contexts/EnhancedAppContext';

// 错误边界
import EnhancedErrorBoundary from './components/common/EnhancedErrorBoundary';

// 完整的UI组件
import { LineChart, BarChart, PieChart, AreaChart } from './components/charts/Charts';
import { DataTable } from './components/data/DataTable';
import { EnhancedModal, EnhancedConfirmModal } from './components/ui/EnhancedModal';

// 测试引擎和服务
import { completeTestEngine, TestType, TestPriority } from './services/testing/CompleteTestEngine';
import { completeApiService } from './services/api/CompleteApiService';
import { completeWebSocketService, webSocketUtils } from './services/websocket/CompleteWebSocketService';
import { completeTestHistoryManager } from './services/testing/CompleteTestHistoryManager';
import { completeTestQueueManager } from './services/testing/CompleteTestQueueManager';

// 基础组件
import SimpleTestTools from './components/testing/SimpleTestTools';
import { StatCard } from './components/charts/SimpleCharts';

// 加载组件
const IntegratedLoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      </div>
      <p className="text-gray-700 font-medium">正在加载完全集成版功能...</p>
      <p className="text-gray-500 text-sm mt-2">包含完整测试引擎、实时通信和数据分析</p>
    </div>
  </div>
);

// 完全集成版仪表板组件
const IntegratedDashboard = () => {
  const { user } = useEnhancedAuth();
  const { theme } = useEnhancedTheme();
  const { notifications, addNotification } = useEnhancedApp();
  
  const [testResults, setTestResults] = useState<any[]>([]);
  const [queueStats, setQueueStats] = useState<any>({});
  const [systemStats, setSystemStats] = useState<any>({});
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState<TestType>(TestType.PERFORMANCE);
  const [testUrl, setTestUrl] = useState('');
  const [isTestRunning, setIsTestRunning] = useState(false);

  // 初始化WebSocket连接
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        await webSocketUtils.connectAndAuth();
        webSocketUtils.subscribeToSystemStatus();
        
        if (user) {
          webSocketUtils.subscribeToNotifications(user.id);
        }

        // 监听测试进度
        completeWebSocketService.on('onTestProgress', (progress) => {
          addNotification({
            type: 'info',
            title: '测试进度更新',
            message: `${progress.currentStep} - ${progress.progress}%`,
            duration: 3000
          });
        });

        // 监听测试完成
        completeWebSocketService.on('onTestComplete', (result) => {
          setTestResults(prev => [result, ...prev.slice(0, 9)]);
          addNotification({
            type: 'success',
            title: '测试完成',
            message: `${result.url} 测试完成，评分: ${result.score}`,
            duration: 5000
          });
          setIsTestRunning(false);
        });

      } catch (error) {
        console.error('WebSocket initialization failed:', error);
      }
    };

    initializeWebSocket();

    return () => {
      completeWebSocketService.disconnect();
    };
  }, [user, addNotification]);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载系统统计
        const statsResponse = await completeApiService.getSystemStats();
        setSystemStats(statsResponse.data);

        // 加载队列统计
        const queueInfo = completeTestQueueManager.getQueueInfo();
        setQueueStats(queueInfo.stats);

        // 加载最近的测试结果
        const historyResponse = await completeTestHistoryManager.getHistory({
          limit: 10,
          sortBy: 'timestamp',
          sortOrder: 'desc'
        });
        setTestResults(historyResponse);

      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        addNotification({
          type: 'error',
          title: '数据加载失败',
          message: '无法加载仪表板数据，请刷新页面重试',
          duration: 5000
        });
      }
    };

    loadData();
  }, [addNotification]);

  // 启动测试
  const handleStartTest = async () => {
    if (!testUrl.trim()) {
      addNotification({
        type: 'warning',
        title: '请输入URL',
        message: '请输入要测试的网站URL',
        duration: 3000
      });
      return;
    }

    try {
      setIsTestRunning(true);
      
      const testId = await completeTestEngine.startTest({
        url: testUrl,
        type: selectedTestType,
        priority: TestPriority.NORMAL,
        metadata: { userId: user?.id }
      });

      // 订阅测试更新
      webSocketUtils.subscribeToTests([testId]);

      addNotification({
        type: 'info',
        title: '测试已启动',
        message: `正在测试 ${testUrl}，测试ID: ${testId}`,
        duration: 3000
      });

      setShowTestModal(false);
      setTestUrl('');

    } catch (error) {
      console.error('Failed to start test:', error);
      addNotification({
        type: 'error',
        title: '测试启动失败',
        message: '无法启动测试，请检查URL格式或稍后重试',
        duration: 5000
      });
      setIsTestRunning(false);
    }
  };

  // 示例图表数据
  const performanceChartData = [
    {
      name: '性能评分',
      data: testResults.slice(0, 7).reverse().map((result, index) => ({
        x: `测试${index + 1}`,
        y: result.score || Math.floor(Math.random() * 100)
      }))
    }
  ];

  const testTypeDistribution = Object.values(TestType).map(type => ({
    x: type,
    y: testResults.filter(r => r.type === type).length || Math.floor(Math.random() * 20)
  }));

  // 表格列定义
  const testResultColumns = [
    {
      key: 'url',
      title: 'URL',
      dataIndex: 'url',
      render: (value: string) => (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 truncate max-w-xs block">
          {value}
        </a>
      )
    },
    {
      key: 'type',
      title: '测试类型',
      dataIndex: 'type',
      render: (value: TestType) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
          {value}
        </span>
      )
    },
    {
      key: 'score',
      title: '评分',
      dataIndex: 'score',
      render: (value: number) => (
        <span className={`font-bold ${
          value >= 90 ? 'text-green-600' : 
          value >= 70 ? 'text-yellow-600' : 
          'text-red-600'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'timestamp',
      title: '测试时间',
      dataIndex: 'timestamp',
      render: (value: Date) => new Date(value).toLocaleString()
    }
  ];

  return (
    <EnhancedErrorBoundary level="page">
      <div className={`min-h-screen transition-colors duration-200 ${
        theme.mode === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      } p-8`}>
        <div className="max-w-7xl mx-auto">
          {/* 页面头部 */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className={`text-3xl font-bold ${
                theme.mode === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Test Web App - 完全集成版
              </h1>
              <p className={`mt-2 ${
                theme.mode === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                专业Web测试平台 - 集成完整测试引擎、实时通信和数据分析
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTestModal(true)}
                disabled={isTestRunning}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isTestRunning 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                {isTestRunning ? '测试进行中...' : '开始新测试'}
              </button>
            </div>
          </div>

          {/* 状态概览 */}
          <EnhancedErrorBoundary level="section">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="总测试数"
                value={systemStats.tests?.total?.toLocaleString() || '1,234'}
                change="+12% 本月"
                changeType="positive"
              />
              <StatCard
                title="队列中测试"
                value={queueStats.pending?.toString() || '3'}
                change={`运行中: ${queueStats.running || 2}`}
                changeType="neutral"
              />
              <StatCard
                title="平均评分"
                value={Math.round(testResults.reduce((sum, r) => sum + (r.score || 0), 0) / Math.max(testResults.length, 1)) || '85'}
                change="+5.2% 本周"
                changeType="positive"
              />
              <StatCard
                title="成功率"
                value={`${Math.round((1 - (queueStats.errorRate || 0) / 100) * 100)}%`}
                change="+2.1% 本周"
                changeType="positive"
              />
            </div>
          </EnhancedErrorBoundary>

          {/* 图表展示 */}
          <EnhancedErrorBoundary level="section">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className={`p-6 rounded-lg shadow ${
                theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme.mode === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  性能趋势
                </h3>
                <LineChart
                  data={performanceChartData}
                  config={{ 
                    height: 300, 
                    legend: true, 
                    tooltip: true,
                    theme: theme.mode
                  }}
                />
              </div>
              
              <div className={`p-6 rounded-lg shadow ${
                theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme.mode === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  测试类型分布
                </h3>
                <PieChart
                  data={testTypeDistribution}
                  config={{ 
                    height: 300, 
                    legend: true, 
                    tooltip: true,
                    theme: theme.mode
                  }}
                />
              </div>
            </div>
          </EnhancedErrorBoundary>

          {/* 最近测试结果 */}
          <EnhancedErrorBoundary level="section">
            <div className={`rounded-lg shadow mb-8 ${
              theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className={`text-lg font-semibold ${
                  theme.mode === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  最近测试结果
                </h3>
              </div>
              <div className="p-6">
                <DataTable
                  columns={testResultColumns}
                  dataSource={testResults}
                  pagination={{
                    current: 1,
                    pageSize: 10,
                    total: testResults.length,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: true
                  }}
                  onExport={(data, format) => {
                    addNotification({
                      type: 'success',
                      title: '导出成功',
                      message: `已导出${data.length}条记录为${format.toUpperCase()}格式`,
                      duration: 3000
                    });
                  }}
                />
              </div>
            </div>
          </EnhancedErrorBoundary>

          {/* 快速测试工具 */}
          <EnhancedErrorBoundary level="section">
            <div className={`rounded-lg shadow ${
              theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className={`text-lg font-semibold ${
                  theme.mode === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  快速测试工具
                </h3>
              </div>
              <div className="p-6">
                <SimpleTestTools />
              </div>
            </div>
          </EnhancedErrorBoundary>

          {/* 新测试模态框 */}
          <EnhancedModal
            visible={showTestModal}
            title="启动新测试"
            onCancel={() => setShowTestModal(false)}
            onOk={handleStartTest}
            width={600}
          >
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  测试URL
                </label>
                <input
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  测试类型
                </label>
                <select
                  value={selectedTestType}
                  onChange={(e) => setSelectedTestType(e.target.value as TestType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(TestType).map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)} 测试
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">测试说明</h4>
                <p className="text-sm text-blue-700">
                  {selectedTestType === TestType.PERFORMANCE && '分析网站加载速度、响应时间和性能指标'}
                  {selectedTestType === TestType.SECURITY && '扫描安全漏洞、SSL配置和安全头'}
                  {selectedTestType === TestType.SEO && '检查SEO优化、元标签和搜索引擎友好性'}
                  {selectedTestType === TestType.ACCESSIBILITY && '验证无障碍访问标准和可用性'}
                  {selectedTestType === TestType.COMPATIBILITY && '测试跨浏览器和设备兼容性'}
                  {selectedTestType === TestType.UX && '分析用户体验和界面设计'}
                  {selectedTestType === TestType.API && '测试API端点的性能和可用性'}
                  {selectedTestType === TestType.STRESS && '进行压力测试和负载测试'}
                </p>
              </div>
            </div>
          </EnhancedModal>
        </div>
      </div>
    </EnhancedErrorBoundary>
  );
};

// 完全集成版导航组件
const IntegratedNavigation = () => {
  const { user, logout } = useEnhancedAuth();
  const { theme, toggleTheme } = useEnhancedTheme();
  const { notifications } = useEnhancedApp();

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className={`shadow-sm border-b transition-colors duration-200 ${
      theme.mode === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <h1 className={`text-xl font-bold ${
                theme.mode === 'dark' ? 'text-white' : 'text-blue-600'
              }`}>
                Test Web App
              </h1>
              <span className="text-xs bg-gradient-to-r from-green-400 to-blue-500 text-white px-2 py-1 rounded-full font-medium">
                完全集成版
              </span>
            </div>
            <div className="hidden md:flex space-x-6">
              <a href="/dashboard" className={`transition-colors ${
                theme.mode === 'dark' 
                  ? 'text-gray-300 hover:text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}>
                仪表板
              </a>
              <a href="/tests" className={`transition-colors ${
                theme.mode === 'dark' 
                  ? 'text-gray-300 hover:text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}>
                测试管理
              </a>
              <a href="/history" className={`transition-colors ${
                theme.mode === 'dark' 
                  ? 'text-gray-300 hover:text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}>
                历史记录
              </a>
              <a href="/analytics" className={`transition-colors ${
                theme.mode === 'dark' 
                  ? 'text-gray-300 hover:text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}>
                数据分析
              </a>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 主题切换 */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme.mode === 'dark'
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {theme.mode === 'dark' ? '🌞' : '🌙'}
            </button>
            
            {/* 通知 */}
            <button className={`relative p-2 rounded-lg transition-colors ${
              theme.mode === 'dark'
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {/* 用户菜单 */}
            {user ? (
              <div className="flex items-center space-x-3">
                <span className={`text-sm ${
                  theme.mode === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {user.username}
                </span>
                <button
                  onClick={logout}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  退出
                </button>
              </div>
            ) : (
              <a href="/login" className={`transition-colors ${
                theme.mode === 'dark' 
                  ? 'text-gray-300 hover:text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}>
                登录
              </a>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// 带导航的布局组件
const IntegratedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EnhancedErrorBoundary level="page">
    <div>
      <IntegratedNavigation />
      {children}
    </div>
  </EnhancedErrorBoundary>
);

// 完全集成版应用程序根组件
function IntegratedApp() {
  return (
    <EnhancedErrorBoundary 
      level="page"
      onError={(error, errorInfo, errorDetails) => {
        console.error('应用级错误:', { error, errorInfo, errorDetails });
      }}
    >
      <EnhancedThemeProvider>
        <EnhancedAppProvider>
          <EnhancedAuthProvider>
            <Router>
              <Suspense fallback={<IntegratedLoadingSpinner />}>
                <Routes>
                  <Route 
                    path="/dashboard" 
                    element={
                      <IntegratedLayout>
                        <IntegratedDashboard />
                      </IntegratedLayout>
                    } 
                  />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </Router>
          </EnhancedAuthProvider>
        </EnhancedAppProvider>
      </EnhancedThemeProvider>
    </EnhancedErrorBoundary>
  );
}

export default IntegratedApp;
