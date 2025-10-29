import { BarChart3, CheckCircle, Clock, Code, Database, Download, Eye, EyeOff, FileText, Globe, History, Key, Loader, Lock, Play, Plus, RotateCcw, Settings, Shield, Square, Trash2, XCircle, Zap } from 'lucide-react';
import Logger from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { useAuthCheck } from '../components/auth/WithAuthCheck';
import { URLInput } from '../components/ui';
import TestPageLayout from '../components/testing/TestPageLayout';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useTestProgress } from '../hooks/useTestProgress';
import { useUserStats } from '../hooks/useUserStats';
import backgroundTestManager from '../services/backgroundTestManager';
import type { APIEndpoint, APITestConfig } from '../services/testing/apiTestEngine';
import type { StressTestRecord, TestProgress, TestMetrics, TestResults } from '../types/common';

// 临时testApiService实现
const testApiService = {
  executeApiTest: async (config: any) => ({
    success: true,
    data: {
      id: `api_test_${Date.now()}`,
      testId: `api_test_${Date.now()}`
    },
    message: '内容检测启动成功'
  })
};

// CSS样式已迁移到组件库中
// 进度条样式已集成到ProgressBar组件

// 认证配置类型定义
interface AuthenticationConfig {
  type: 'none' | 'bearer' | 'basic' | 'apikey';
  token: string;
  username: string;
  password: string;
  apiKey: string;
  headerName: string;
}

const APITest: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "内容检测",
    description: "使用内容检测功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  const [testConfig, setTestConfig] = useState<APITestConfig>({
    baseUrl: '',
    endpoints: [
      {
        id: '1',
        name: '获取用户列表',
        method: 'GET',
        path: '/api/users',
        expectedStatus: [200],
        description: '获取所有用户信息',
        priority: 'medium',
        tags: ['user', 'api']
      }
    ],
    timeout: 10000,
    retries: 3,
    validateSchema: true,
    loadTest: false,
    testEnvironment: 'development',
    followRedirects: true,
    validateSSL: true,
    testSecurity: false,
    testPerformance: false,
    testReliability: true,
    generateDocumentation: false,
  });

  const [result, setResult] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'starting' | 'running' | 'completed' | 'failed'>('idle');
  const [testProgress, setTestProgress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'basic' | 'auth' | 'headers' | 'environment' | 'advanced'>('basic');
  const [mainTab, setMainTab] = useState<'test' | 'history'>('test');
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  const [globalHeaders, setGlobalHeaders] = useState<Array<{ key: string, value: string, enabled: boolean }>>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'Accept', value: 'application/json', enabled: true }
  ]);
  const [authentication, setAuthentication] = useState<AuthenticationConfig>({
    type: 'none',
    token: '',
    username: '',
    password: '',
    apiKey: '',
    headerName: 'X-API-Key'
  });

  // 后台测试管理状态
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [backgroundTestInfo, setBackgroundTestInfo] = useState<any>(null);
  const [canSwitchPages, setCanSwitchPages] = useState(true);

  // 集成新的测试进度监控
  const {
    progress: apiProgress,
    isMonitoring: apiIsMonitoring,
    startMonitoring: startApiMonitoring,
    stopMonitoring: stopApiMonitoring,
    cancelTest: cancelApiTest,
    error: apiProgressError
  } = useTestProgress(currentTestId || undefined, {
    onProgress: (progressData) => {
      Logger.debug('📊 内容检测进度:', progressData);
      setTestProgress(progressData.message);
    },
    onComplete: (result) => {
      Logger.debug('✅ 内容检测完成:', result);
      setResult(result);
      setTestStatus('completed');
      recordTestCompletion('内容检测', true, result?.score || 0, result?.duration || 30);
    },
    onError: (error) => {
      Logger.error('❌ 内容检测失败:', error);
      setError(error);
      setTestStatus('failed');
    }
  });

  // 监听后台测试状态变化
  useEffect(() => {
    const unsubscribe = backgroundTestManager.addListener((event: string, testInfo: any) => {
      if (testInfo.type === 'api' && testInfo.id === currentTestId) {
        switch (event) {
          case 'testProgress':
            setBackgroundTestInfo(testInfo);
            setTestProgress(testInfo.currentStep);
            setTestStatus('running');
            break;
          case 'testCompleted':
            setBackgroundTestInfo(testInfo);
            setResult(testInfo.result);
            setTestStatus('completed');
            setTestProgress('API 测试完成！');
            setCurrentTestId(null);

            // 记录测试完成统计
            if (testInfo.result) {
              const success = testInfo.result.success !== false;
              const score = testInfo.result.successRate || testInfo.result.score;
              const duration = testInfo.result.totalTime || 30; // 默认30秒
              recordTestCompletion('内容检测', success, score, duration);
            }
            break;
          case 'testFailed':
            setBackgroundTestInfo(testInfo);
            setError(testInfo.error || '测试失败');
            setTestStatus('failed');
            setCurrentTestId(null);
            break;
          case 'testCancelled':
            setBackgroundTestInfo(null);
            setTestStatus('idle');
            setTestProgress('');
            setCurrentTestId(null);
            break;
        }
      }
    });

    // 检查是否有正在运行的内容检测
    const runningTests = backgroundTestManager.getRunningTests();
    const apiTest = runningTests.find((test: any) => test.type === 'api');
    if (apiTest) {
      setCurrentTestId(apiTest.id);
      setBackgroundTestInfo(apiTest);
      setTestStatus('running');
      setTestProgress(apiTest.currentStep);
    }

    return unsubscribe;
  }, [currentTestId]);

  const handleStartTest = async () => {
    // 检查登录状态
    if (!requireLogin()) {
      return;
    }

    if (!testConfig.baseUrl) {
      setError('请输入 API 基础 URL');
      return;
    }

    if (testConfig.endpoints.length === 0) {
      setError('请至少添加一个 API 端点');
      return;
    }

    setError('');
    setTestStatus('starting');
    setTestProgress('正在初始化 API 测试...');

    // 准备测试配置
    const testConfigData = {
      baseUrl: testConfig.baseUrl,
      endpoints: testConfig.endpoints,
      authentication: authentication.type !== 'none' ? authentication : undefined,
      globalHeaders: globalHeaders.filter(h => h.enabled && h.key && h.value),
      config: {
        timeout: testConfig.timeout,
        retries: testConfig.retries,
        validateSchema: testConfig.validateSchema,
        loadTest: testConfig.loadTest,
        testEnvironment: testConfig.testEnvironment,
        followRedirects: testConfig.followRedirects,
        validateSSL: testConfig.validateSSL,
        testSecurity: testConfig.testSecurity,
        testPerformance: testConfig.testPerformance,
        testReliability: testConfig.testReliability,
        generateDocumentation: testConfig.generateDocumentation
      }
    };

    try {
      // 构建内容检测配置
      const apiTestConfig = {
        endpoints: testConfig.endpoints.map(endpoint => ({
          url: `${testConfig.baseUrl}${endpoint.path}`,
          method: endpoint.method,
          headers: {
            ...Object.fromEntries(globalHeaders.filter(h => h.enabled).map(h => [h.key, h.value])),
            ...(authentication.type === 'bearer' ? { 'Authorization': `Bearer ${authentication.token}` } : {}),
            ...(authentication.type === 'apikey' ? { [authentication.headerName]: authentication.apiKey } : {})
          },
          body: endpoint.body || '',
          assertions: endpoint.expectedStatus?.map(status => `status == ${status}`) || []
        })),
        configuration: {
          timeout: testConfig.timeout || 30000,
          retry_count: testConfig.retries || 0,
          parallel_requests: testConfig.loadTest ? 5 : 1
        }
      };

      // 使用新的API服务执行测试
      const response = await testApiService.executeApiTest(apiTestConfig);

      if (response.success) {
        const testId = response.data.id || response.data.testId;
        setCurrentTestId(testId);
        setTestStatus('running');

        // 启动API进度监控
        if (testId) {
          startApiMonitoring(testId);
        }
      } else {
        throw new Error(response.message || '启动内容检测失败');
      }

      // 同时使用后台测试管理器作为备用（保持现有功能）
      const backupTestId = backgroundTestManager.startTest(
        'api' as any,
        testConfigData,
        // onProgress 回调
        (_: number, step: string) => {
          setTestProgress(step);
          setTestStatus('running');
        },
        // onComplete 回调
        (result: any) => {
          // 如果API监控没有返回结果，使用后台管理器的结果
          if (!apiProgress || apiProgress.status !== 'completed') {
            setResult(result);
            setTestStatus('completed');
            setTestProgress('API 测试完成！');
          }
          setCanSwitchPages(true);

          // 记录测试完成统计
          const success = result?.success !== false;
          const score = result?.successRate || result?.score;
          const duration = result?.totalTime || 30; // 默认30秒
          recordTestCompletion('内容检测', success, score, duration);
        },
        // onError 回调
        (error: string | Error) => {
          const errorMessage = typeof error === 'string' ? error : error.message;
          setError(errorMessage || '测试失败');
          setTestStatus('failed');
          setCanSwitchPages(true);
        }
      );

      setCurrentTestId(backupTestId);
      setCanSwitchPages(true); // 允许切换页面
      setTestStatus('running');
    } catch (error) {
      Logger.error('内容检测启动失败:', error);
      setError(error instanceof Error ? error.message : '启动测试失败');
      setTestStatus('failed');
      setCanSwitchPages(true);
    }
  };

  const handleStopTest = () => {
    if (currentTestId) {
      backgroundTestManager.cancelTest(currentTestId);
      setCurrentTestId(null);
      setBackgroundTestInfo(null);
      setTestStatus('idle');
      setTestProgress('');
      setError('');
      setCanSwitchPages(true);
    }
  };

  const _handleResumeTest = () => {
    // 如果有后台测试信息，恢复显示
    if (backgroundTestInfo) {
      setTestStatus(backgroundTestInfo.status === 'running' ? 'running' : 'completed');
      setTestProgress(backgroundTestInfo.currentStep);
      if (backgroundTestInfo.result) {
        setResult(backgroundTestInfo.result);
      }
      if (backgroundTestInfo.error) {
        setError(backgroundTestInfo.error);
        setTestStatus('failed');
      }
    }
  };

  const addEndpoint = () => {
    const newEndpoint: APIEndpoint = {
      id: Date.now().toString(),
      name: '新端点',
      method: 'GET',
      path: '/api/endpoint',
      expectedStatus: [200],
      description: '',
      priority: 'medium',
      tags: []
    };
    setTestConfig(prev => ({
      ...prev,
      endpoints: [...prev.endpoints, newEndpoint]
    }));
  };

  const addCommonEndpoints = () => {
    const commonEndpoints: APIEndpoint[] = [
      {
        id: Date.now().toString(),
        name: '获取用户列表',
        method: 'GET',
        path: '/api/users',
        expectedStatus: [200],
        description: '获取所有用户信息',
        priority: 'high',
        tags: ['user', 'list']
      },
      {
        id: (Date.now() + 1).toString(),
        name: '创建用户',
        method: 'POST',
        path: '/api/users',
        expectedStatus: [201],
        description: '创建新用户',
        priority: 'high',
        tags: ['user', 'create']
      },
      {
        id: (Date.now() + 2).toString(),
        name: '获取用户详情',
        method: 'GET',
        path: '/api/users/{id}',
        expectedStatus: [200],
        description: '根据ID获取用户详情',
        priority: 'medium',
        tags: ['user', 'detail']
      },
      {
        id: (Date.now() + 3).toString(),
        name: '更新用户',
        method: 'PUT',
        path: '/api/users/{id}',
        expectedStatus: [200],
        description: '更新用户信息',
        priority: 'medium',
        tags: ['user', 'update']
      },
      {
        id: (Date.now() + 4).toString(),
        name: '删除用户',
        method: 'DELETE',
        path: '/api/users/{id}',
        expectedStatus: [204],
        description: '删除用户',
        priority: 'low',
        tags: ['user', 'delete']
      }
    ];

    setTestConfig(prev => ({
      ...prev,
      endpoints: [...prev.endpoints, ...commonEndpoints]
    }));
  };

  // 内容检测模板
  const applyTemplate = (templateType: string) => {
    const templates: Record<string, { baseUrl: string; endpoints: APIEndpoint[] }> = {
      'rest-api': {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        endpoints: [
          {
            id: Date.now().toString(),
            name: '获取所有文章',
            method: 'GET' as const,
            path: '/posts',
            expectedStatus: [200],
            description: '获取所有文章列表',
            priority: 'high' as const,
            tags: ['posts', 'list']
          },
          {
            id: (Date.now() + 1).toString(),
            name: '获取单个文章',
            method: 'GET' as const,
            path: '/posts/1',
            expectedStatus: [200],
            description: '根据ID获取文章详情',
            priority: 'high' as const,
            tags: ['posts', 'detail']
          },
          {
            id: (Date.now() + 2).toString(),
            name: '创建文章',
            method: 'POST' as const,
            path: '/posts',
            expectedStatus: [201],
            description: '创建新文章',
            priority: 'medium' as const,
            tags: ['posts', 'create']
          }
        ]
      },
      'microservice': {
        baseUrl: 'https://api.example.com',
        endpoints: [
          {
            id: Date.now().toString(),
            name: '健康检查',
            method: 'GET' as const,
            path: '/health',
            expectedStatus: [200],
            description: '服务健康状态检查',
            priority: 'high' as const,
            tags: ['health', 'monitoring']
          },
          {
            id: (Date.now() + 1).toString(),
            name: '服务信息',
            method: 'GET' as const,
            path: '/info',
            expectedStatus: [200],
            description: '获取服务基本信息',
            priority: 'medium' as const,
            tags: ['info', 'metadata']
          },
          {
            id: (Date.now() + 2).toString(),
            name: '指标数据',
            method: 'GET' as const,
            path: '/metrics',
            expectedStatus: [200],
            description: '获取服务性能指标',
            priority: 'medium' as const,
            tags: ['metrics', 'monitoring']
          }
        ]
      },
      'e-commerce': {
        baseUrl: 'https://api.shop.com',
        endpoints: [
          {
            id: Date.now().toString(),
            name: '商品列表',
            method: 'GET' as const,
            path: '/api/products',
            expectedStatus: [200],
            description: '获取商品列表',
            priority: 'high' as const,
            tags: ['products', 'catalog']
          },
          {
            id: (Date.now() + 1).toString(),
            name: '购物车',
            method: 'GET' as const,
            path: '/api/cart',
            expectedStatus: [200],
            description: '获取购物车内容',
            priority: 'high' as const,
            tags: ['cart', 'shopping']
          },
          {
            id: (Date.now() + 2).toString(),
            name: '创建订单',
            method: 'POST' as const,
            path: '/api/orders',
            expectedStatus: [201],
            description: '创建新订单',
            priority: 'high' as const,
            tags: ['orders', 'checkout']
          }
        ]
      }
    };

    const template = templates[templateType as keyof typeof templates];
    if (template) {
      setTestConfig(prev => ({
        ...prev,
        baseUrl: template.baseUrl,
        endpoints: template.endpoints
      }));
    }
  };

  const updateEndpoint = (id: string, updates: Partial<APIEndpoint>) => {
    setTestConfig(prev => ({
      ...prev,
      endpoints: prev.endpoints.map(ep =>
        ep.id === id ? { ...ep, ...updates } : ep
      )
    }));
  };

  const removeEndpoint = (id: string) => {
    setTestConfig(prev => ({
      ...prev,
      endpoints: prev.endpoints.filter(ep => ep.id !== id)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50 border-green-200';
      case 'fail': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-800';
      case 'POST': return 'bg-green-100 text-green-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'PATCH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const addGlobalHeader = () => {
    setGlobalHeaders(prev => [...prev, { key: '', value: '', enabled: true }]);
  };

  const updateGlobalHeader = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    setGlobalHeaders(prev => prev.map((header, i) =>
      i === index ? { ...header, [field]: value } : header
    ));
  };

  const removeGlobalHeader = (index: number) => {
    setGlobalHeaders(prev => prev.filter((_, i) => i !== index));
  };

  // 历史记录处理
  const handleTestSelect = (test: any) => {
    // 加载历史测试结果
    if (test.results) {
      setResult(test.results);
    }
  };

  const handleTestRerun = (test: any) => {
    // 重新运行历史测试
    if (test.config) {
      setTestConfig(test.config);
      // 可以选择是否立即开始测试
    }
  };

  const handleExportReport = (format: 'json' | 'csv' | 'html') => {
    if (!result) {
      alert('没有测试结果可导出');
      return;
    }

    const report = {
      id: result?.id,
      type: 'api' as const,
      timestamp: result?.timestamp,
      url: result?.baseUrl,
      config: testConfig,
      metrics: {
        overallScore: result?.overallScore,
        totalTests: result?.totalTests,
        passedTests: result?.passedTests,
        failedTests: result?.failedTests,
        averageResponseTime: result?.averageResponseTime,
        performanceMetrics: result?.performanceMetrics,
      },
      analysis: {
        endpointResults: result?.endpointResults,
        securityAnalysis: result?.securityAnalysis,
        reliabilityMetrics: result?.reliabilityMetrics,
        summary: result?.summary,
        recommendations: result?.recommendations,
      },
    };

    switch (format) {
      case 'json':
        const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = `content-test-report-${Date.now()}.json`;
        document.body.appendChild(jsonLink);
        jsonLink.click();
        document.body.removeChild(jsonLink);
        URL.revokeObjectURL(jsonUrl);
        break;
      case 'csv':
        const csvData = [
          ['端点', '方法', '状态', '响应时间', '状态码', '错误数'],
          ...(result?.endpointResults || []).map((ep: any) => [
            ep.name, ep.method, ep.status, (Math.round(ep.responseTime * 100) / 100).toFixed(2), ep.statusCode, (ep.errors || []).length
          ]),
        ];
        const BOM = '\uFEFF';
        const csvContent = BOM + csvData.map(row => row.join(',')).join('\n');
        const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = `content-test-report-${Date.now()}.csv`;
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);
        URL.revokeObjectURL(csvUrl);
        break;
      case 'html':
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>内容检测报告</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
              .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9ecef; border-radius: 3px; }
              .endpoint { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
              .pass { background: #d4edda; }
              .fail { background: #f8d7da; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>内容检测报告</h1>
              <p>测试时间: ${new Date(result?.timestamp).toLocaleString()}</p>
              <p>测试URL: ${result?.baseUrl}</p>
            </div>
            <div class="metrics">
              <div class="metric">总体评分: ${Math.round(result?.overallScore)}</div>
              <div class="metric">通过测试: ${result?.passedTests}</div>
              <div class="metric">失败测试: ${result?.failedTests}</div>
              <div class="metric">平均响应时间: ${Math.round(result?.averageResponseTime)}ms</div>
            </div>
            <h2>端点测试结果</h2>
            ${(result?.endpointResults || []).map((ep: any) => `
              <div class="endpoint ${ep.status}">
                <strong>${ep.method} ${ep.name}</strong><br>
                路径: ${ep.path}<br>
                状态码: ${ep.statusCode}<br>
                响应时间: ${Math.round(ep.responseTime)}ms<br>
                ${ep.errors.length > 0 ? `错误: ${ep.errors.join(', ')}` : ''}
              </div>
            `).join('')}
          </body>
          </html>
        `;
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        const htmlLink = document.createElement('a');
        htmlLink.href = htmlUrl;
        htmlLink.download = `content-test-report-${Date.now()}.html`;
        document.body.appendChild(htmlLink);
        htmlLink.click();
        document.body.removeChild(htmlLink);
        URL.revokeObjectURL(htmlUrl);
        break;
    }
  };

  return (
    <TestPageLayout
      testType="api"
      title="API 接口测试"
      description="测试 RESTful API 的功能、性能和可靠性"
      icon={Code}
      testStatus={testStatus === 'starting' || testStatus === 'running' ? 'running' : testStatus === 'completed' ? 'completed' : testStatus === 'failed' ? 'failed' : 'idle'}
      isTestDisabled={!testConfig.baseUrl || testConfig.endpoints.length === 0}
      onStartTest={handleStartTest}
      onStopTest={handleStopTest}
      testContent={
        <>
          {/* 页面标题 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-3">
                <Code className="w-8 h-8 text-blue-400" />
                <div>
                  <h1 className="text-2xl font-bold text-white">API 接口测试</h1>
                  <p className="text-gray-300">测试 RESTful API 的功能、性能和可靠性</p>
                </div>
              </div>

              {/* 测试控制按钮 */}
              <div className="flex justify-end">
                {testStatus === 'idle' ? (
                  <button
                    type="button"
                    onClick={handleStartTest}
                    disabled={!testConfig.baseUrl || testConfig.endpoints.length === 0}
                    className={`btn btn-md flex items-center space-x-2 ${!testConfig.baseUrl || testConfig.endpoints.length === 0
                      ? 'btn-disabled opacity-50 cursor-not-allowed'
                      : isAuthenticated
                        ? 'btn-primary hover:btn-primary-dark'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white border border-yellow-500/30'
                      }`}
                  >
                    {isAuthenticated ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>开始测试</span>
                  </button>
                ) : testStatus === 'starting' ? (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                    <Loader className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-blue-300 font-medium">正在启动...</span>
                  </div>
                ) : testStatus === 'running' ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-300 font-medium">后台运行中</span>
                      {backgroundTestInfo && (
                        <span className="text-xs text-green-200">
                          {Math.round(backgroundTestInfo.progress || 0)}%
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleStopTest}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Square className="w-4 h-4" />
                      <span>停止</span>
                    </button>
                    {canSwitchPages && (
                      <div className="flex items-center space-x-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-blue-300">可切换页面</span>
                      </div>
                    )}
                  </div>
                ) : testStatus === 'completed' ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-300 font-medium">测试完成</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTestStatus('idle');
                        setTestProgress('');
                        setResult(null);
                      }}
                      className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>重新测试</span>
                    </button>
                  </div>
                ) : testStatus === 'failed' ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-300 font-medium">测试失败</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTestStatus('idle');
                        setTestProgress('');
                        setError('');
                      }}
                      className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>重试</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 详细进度显示 */}
            {(testProgress || backgroundTestInfo) && (
              <div className="mt-4 space-y-3">
                {/* 当前步骤 */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-blue-300">测试进度</h4>
                    {backgroundTestInfo && (
                      <span className="text-sm text-blue-200">
                        {Math.round(backgroundTestInfo.progress || 0)}%
                      </span>
                    )}
                  </div>

                  {/* 进度条 */}
                  {backgroundTestInfo && (
                    <div className="mb-3">
                      <ProgressBar
                        value={backgroundTestInfo.progress || 0}
                        variant="primary"
                        size="md"
                        animated
                      />
                    </div>
                  )}

                  <p className="text-sm text-blue-300">{testProgress}</p>

                  {/* 测试时间 */}
                  {backgroundTestInfo && backgroundTestInfo.startTime && (
                    <div className="flex items-center space-x-2 mt-2 text-xs text-blue-200">
                      <Clock className="w-3 h-3" />
                      <span>
                        开始时间: {new Date(backgroundTestInfo.startTime).toLocaleTimeString()}
                      </span>
                      <span>•</span>
                      <span>
                        运行时长: {Math.floor((Date.now() - new Date(backgroundTestInfo.startTime).getTime()) / 1000)}秒
                      </span>
                    </div>
                  )}
                </div>

                {/* 后台运行提示 */}
                {testStatus === 'running' && canSwitchPages && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-300 font-medium">后台运行模式</span>
                    </div>
                    <p className="text-xs text-green-200 mt-1">
                      测试正在后台运行，您可以自由切换到其他页面，测试不会中断。
                      完成后会自动通知您。
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 错误显示 */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-300">测试错误</span>
                </div>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* 主标签页导航 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50">
            <div className="flex border-b border-gray-700/50">
              <button
                type="button"
                onClick={() => setMainTab('test')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${mainTab === 'test'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
              >
                <Code className="w-4 h-4" />
                内容检测
              </button>
              <button
                type="button"
                onClick={() => setMainTab('history')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${mainTab === 'history'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
              >
                <History className="w-4 h-4" />
                测试历史
              </button>
            </div>
          </div>

          {/* 主标签页内容 */}
          {
            mainTab === 'test' && (
              <>
                {/* 测试类型选择 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">测试类型选择</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    💡 提示：性能和安全测试为API专用功能。如需全面的性能或安全测试，请使用专门的"压力测试"和"安全检测"工具。
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 安全测试 */}
                    <div className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${testConfig.testSecurity
                      ? 'border-red-500/50 bg-red-500/10 shadow-lg shadow-red-500/20'
                      : 'border-gray-600/50 bg-gray-700/30 hover:border-red-500/30 hover:bg-red-500/5'
                      }`}
                      onClick={() => setTestConfig(prev => ({ ...prev, testSecurity: !prev.testSecurity }))}>
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-2 rounded-lg ${testConfig.testSecurity ? 'bg-red-500/20' : 'bg-gray-600/20'}`}>
                          <Shield className={`w-5 h-5 ${testConfig.testSecurity ? 'text-red-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">安全测试 <span className="text-xs text-yellow-400">(可选)</span></h4>
                          <p className="text-xs text-gray-400">预计 3-5 分钟</p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${testConfig.testSecurity
                          ? 'border-red-500 bg-red-500'
                          : 'border-gray-500 bg-transparent'
                          }`}>
                          {testConfig.testSecurity && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300">API专用安全检测：认证漏洞、注入攻击、权限绕过等</p>
                    </div>

                    {/* 性能测试 */}
                    <div className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${testConfig.testPerformance
                      ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                      : 'border-gray-600/50 bg-gray-700/30 hover:border-blue-500/30 hover:bg-blue-500/5'
                      }`}
                      onClick={() => setTestConfig(prev => ({ ...prev, testPerformance: !prev.testPerformance }))}>
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-2 rounded-lg ${testConfig.testPerformance ? 'bg-blue-500/20' : 'bg-gray-600/20'}`}>
                          <Zap className={`w-5 h-5 ${testConfig.testPerformance ? 'text-blue-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">性能测试 <span className="text-xs text-yellow-400">(可选)</span></h4>
                          <p className="text-xs text-gray-400">预计 2-4 分钟</p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${testConfig.testPerformance
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-500 bg-transparent'
                          }`}>
                          {testConfig.testPerformance && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300">API专用性能测试：响应时间、吞吐量、并发处理能力</p>
                    </div>

                    {/* 可靠性测试 */}
                    <div className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${testConfig.testReliability
                      ? 'border-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/20'
                      : 'border-gray-600/50 bg-gray-700/30 hover:border-green-500/30 hover:bg-green-500/5'
                      }`}
                      onClick={() => setTestConfig(prev => ({ ...prev, testReliability: !prev.testReliability }))}>
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-2 rounded-lg ${testConfig.testReliability ? 'bg-green-500/20' : 'bg-gray-600/20'}`}>
                          <Database className={`w-5 h-5 ${testConfig.testReliability ? 'text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">可靠性测试</h4>
                          <p className="text-xs text-gray-400">预计 4-6 分钟</p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${testConfig.testReliability
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-500 bg-transparent'
                          }`}>
                          {testConfig.testReliability && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300">测试错误处理、重试机制、故障恢复能力</p>
                    </div>

                    {/* 文档生成 */}
                    <div className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${testConfig.generateDocumentation
                      ? 'border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                      : 'border-gray-600/50 bg-gray-700/30 hover:border-purple-500/30 hover:bg-purple-500/5'
                      }`}
                      onClick={() => setTestConfig(prev => ({ ...prev, generateDocumentation: !prev.generateDocumentation }))}>
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-2 rounded-lg ${testConfig.generateDocumentation ? 'bg-purple-500/20' : 'bg-gray-600/20'}`}>
                          <FileText className={`w-5 h-5 ${testConfig.generateDocumentation ? 'text-purple-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">文档生成</h4>
                          <p className="text-xs text-gray-400">预计 1-2 分钟</p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${testConfig.generateDocumentation
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-500 bg-transparent'
                          }`}>
                          {testConfig.generateDocumentation && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300">自动生成API文档和测试报告</p>
                    </div>
                  </div>
                </div>

                {/* 配置区域 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">API配置</h3>

                  {/* 配置标签页 */}
                  <div className="flex space-x-1 mb-6 bg-gray-700/30 p-1 rounded-lg">
                    {[
                      { key: 'basic', label: '基础配置', icon: Settings },
                      { key: 'auth', label: '认证', icon: Key },
                      { key: 'headers', label: '请求头', icon: Globe },
                      { key: 'environment', label: '环境', icon: Database },
                      { key: 'advanced', label: '高级', icon: BarChart3 }
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key as any)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${activeTab === key
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* 基础配置 */}
                  {activeTab === 'basic' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          API 基础 URL
                        </label>
                        <URLInput
                          value={testConfig.baseUrl}
                          onChange={(e) => setTestConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                          placeholder="https://api.example.com"
                          enableReachabilityCheck={false}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            超时时间 (ms)
                          </label>
                          <input
                            type="number"
                            value={testConfig.timeout}
                            onChange={(e) => setTestConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 10000 }))}
                            placeholder="10000"
                            title="设置API请求的超时时间（毫秒）"
                            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            重试次数
                          </label>
                          <input
                            type="number"
                            value={testConfig.retries}
                            onChange={(e) => setTestConfig(prev => ({ ...prev, retries: parseInt(e.target.value) || 3 }))}
                            placeholder="3"
                            title="设置API请求失败时的重试次数"
                            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            测试环境
                          </label>
                          <select
                            value={testConfig.testEnvironment}
                            onChange={(e) => setTestConfig(prev => ({ ...prev, testEnvironment: e.target.value as any }))}
                            title="选择内容检测的目标环境"
                            aria-label="选择内容检测的目标环境"
                            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="development">开发环境</option>
                            <option value="staging">测试环境</option>
                            <option value="production">生产环境</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="validateSchema"
                            checked={testConfig.validateSchema}
                            onChange={(e) => setTestConfig(prev => ({ ...prev, validateSchema: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="validateSchema" className="text-sm text-gray-300">
                            验证响应模式
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="followRedirects"
                            checked={testConfig.followRedirects}
                            onChange={(e) => setTestConfig(prev => ({ ...prev, followRedirects: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="followRedirects" className="text-sm text-gray-300">
                            跟随重定向
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="validateSSL"
                            checked={testConfig.validateSSL}
                            onChange={(e) => setTestConfig(prev => ({ ...prev, validateSSL: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="validateSSL" className="text-sm text-gray-300">
                            验证SSL证书
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="loadTest"
                            checked={testConfig.loadTest}
                            onChange={(e) => setTestConfig(prev => ({ ...prev, loadTest: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="loadTest" className="text-sm text-gray-300">
                            启用负载测试
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 认证配置 */}
                  {activeTab === 'auth' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          认证类型
                        </label>
                        <select
                          value={authentication.type}
                          onChange={(e) => setAuthentication(prev => ({ ...prev, type: e.target.value as AuthenticationConfig['type'] }))}
                          title="选择API认证方式"
                          aria-label="选择API认证方式"
                          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="none">无认证</option>
                          <option value="bearer">Bearer Token</option>
                          <option value="basic">Basic Auth</option>
                          <option value="apikey">API Key</option>
                        </select>
                      </div>

                      {authentication.type === 'bearer' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Bearer Token
                          </label>
                          <input
                            type="text"
                            value={authentication.token}
                            onChange={(e) => setAuthentication((prev: AuthenticationConfig) => ({ ...prev, token: e.target.value }))}
                            placeholder="输入 Bearer Token"
                            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      {authentication.type === 'basic' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              用户名
                            </label>
                            <input
                              type="text"
                              value={authentication.username}
                              onChange={(e) => setAuthentication((prev: AuthenticationConfig) => ({ ...prev, username: e.target.value }))}
                              placeholder="输入用户名"
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              密码
                            </label>
                            <div className="relative">
                              <input
                                type={showAuthPassword ? 'text' : 'password'}
                                value={authentication.password}
                                onChange={(e) => setAuthentication((prev: AuthenticationConfig) => ({ ...prev, password: e.target.value }))}
                                placeholder="输入密码"
                                className="w-full px-3 py-2 pr-10 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => setShowAuthPassword(!showAuthPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                              >
                                {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {authentication.type === 'apikey' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              请求头名称
                            </label>
                            <input
                              type="text"
                              value={authentication.headerName}
                              onChange={(e) => setAuthentication((prev: AuthenticationConfig) => ({ ...prev, headerName: e.target.value }))}
                              placeholder="X-API-Key"
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              API Key
                            </label>
                            <input
                              type="text"
                              value={authentication.apiKey}
                              onChange={(e) => setAuthentication((prev: AuthenticationConfig) => ({ ...prev, apiKey: e.target.value }))}
                              placeholder="输入 API Key"
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 请求头配置 */}
                  {activeTab === 'headers' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium text-white">全局请求头</h4>
                        <button
                          type="button"
                          onClick={addGlobalHeader}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>添加请求头</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {globalHeaders.map((header, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`header-enabled-${index}`}
                                checked={header.enabled}
                                onChange={(e) => updateGlobalHeader(index, 'enabled', e.target.checked)}
                                title="启用或禁用此请求头"
                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <label htmlFor={`header-enabled-${index}`} className="sr-only">启用请求头</label>
                            </div>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={header.key}
                                onChange={(e) => updateGlobalHeader(index, 'key', e.target.value)}
                                placeholder="请求头名称"
                                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={header.value}
                                onChange={(e) => updateGlobalHeader(index, 'value', e.target.value)}
                                placeholder="请求头值"
                                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeGlobalHeader(index)}
                              title="删除此请求头"
                              aria-label="删除请求头"
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 端点管理 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">API 端点管理</h3>
                    <div className="flex space-x-3">
                      <select
                        onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                        value=""
                        title="选择内容检测模板"
                        aria-label="选择内容检测模板"
                        className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">选择模板...</option>
                        <option value="rest-api">REST API 模板</option>
                        <option value="microservice">微服务模板</option>
                        <option value="e-commerce">电商API模板</option>
                      </select>
                      <button
                        type="button"
                        onClick={addCommonEndpoints}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>添加常用端点</span>
                      </button>
                      <button
                        type="button"
                        onClick={addEndpoint}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>添加端点</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {testConfig.endpoints.map((endpoint) => (
                      <div key={endpoint.id} className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              方法
                            </label>
                            <select
                              value={endpoint.method}
                              onChange={(e) => updateEndpoint(endpoint.id, { method: e.target.value as any })}
                              title="选择HTTP请求方法"
                              aria-label="选择HTTP请求方法"
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                              <option value="DELETE">DELETE</option>
                              <option value="PATCH">PATCH</option>
                              <option value="HEAD">HEAD</option>
                              <option value="OPTIONS">OPTIONS</option>
                            </select>
                          </div>
                          <div className="md:col-span-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              路径
                            </label>
                            <input
                              type="text"
                              value={endpoint.path}
                              onChange={(e) => updateEndpoint(endpoint.id, { path: e.target.value })}
                              placeholder="/api/endpoint"
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              名称
                            </label>
                            <input
                              type="text"
                              value={endpoint.name}
                              onChange={(e) => updateEndpoint(endpoint.id, { name: e.target.value })}
                              placeholder="端点名称"
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              优先级
                            </label>
                            <select
                              value={endpoint.priority}
                              onChange={(e) => updateEndpoint(endpoint.id, { priority: e.target.value as any })}
                              title="设置端点测试优先级"
                              aria-label="设置端点测试优先级"
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="low">低</option>
                              <option value="medium">中</option>
                              <option value="high">高</option>
                            </select>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              操作
                            </label>
                            <button
                              type="button"
                              onClick={() => removeEndpoint(endpoint.id)}
                              className="w-full h-[46px] px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg border border-red-500 transition-colors flex items-center justify-center"
                              title="删除端点"
                              aria-label="删除端点"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            描述
                          </label>
                          <textarea
                            value={endpoint.description}
                            onChange={(e) => updateEndpoint(endpoint.id, { description: e.target.value })}
                            placeholder="端点描述..."
                            rows={2}
                            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              期望状态码 (逗号分隔)
                            </label>
                            <input
                              type="text"
                              value={endpoint.expectedStatus.join(', ')}
                              onChange={(e) => updateEndpoint(endpoint.id, {
                                expectedStatus: e.target.value.split(',').map(s => parseInt(s?.trim())).filter(n => !isNaN(n))
                              })}
                              placeholder="200, 201, 204"
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              标签 (逗号分隔)
                            </label>
                            <input
                              type="text"
                              value={endpoint.tags?.join(', ') || ''}
                              onChange={(e) => updateEndpoint(endpoint.id, {
                                tags: e.target.value.split(',').map(s => s?.trim()).filter(s => s)
                              })}
                              placeholder="user, api, crud"
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {testConfig.endpoints.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">暂无API端点</p>
                        <p className="text-sm">点击"添加端点"或"添加常用端点"开始配置</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 测试结果显示 */}
                {result && (
                  <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-white">测试结果</h3>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => handleExportReport('json')}
                          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600/50 hover:text-white transition-colors flex items-center space-x-2 text-sm"
                          title="导出JSON数据"
                        >
                          <Download className="w-4 h-4" />
                          <span>JSON</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportReport('csv')}
                          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600/50 hover:text-white transition-colors flex items-center space-x-2 text-sm"
                          title="导出CSV表格"
                        >
                          <FileText className="w-4 h-4" />
                          <span>CSV</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportReport('html')}
                          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600/50 hover:text-white transition-colors flex items-center space-x-2 text-sm"
                          title="导出HTML报告"
                        >
                          <Globe className="w-4 h-4" />
                          <span>HTML</span>
                        </button>
                      </div>
                    </div>

                    {/* 测试概览 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">{Math.round(result?.overallScore || 0)}</div>
                        <div className="text-sm text-gray-300">总体评分</div>
                      </div>
                      <div className="text-center p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">{result?.passedTests || 0}</div>
                        <div className="text-sm text-gray-300">通过测试</div>
                      </div>
                      <div className="text-center p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-red-400">{result?.failedTests || 0}</div>
                        <div className="text-sm text-gray-300">失败测试</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-400">{Math.round(result?.averageResponseTime || 0)}ms</div>
                        <div className="text-sm text-gray-300">平均响应时间</div>
                      </div>
                    </div>

                    {/* 性能分析 */}
                    {result?.performanceMetrics && (
                      <div className="bg-gray-700/30 rounded-lg p-6 mb-6">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <BarChart3 className="w-5 h-5 mr-2 text-green-500" />
                          性能分析
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gray-700/30 rounded-lg p-4">
                            <div className="text-sm text-gray-300 mb-2">响应时间分布</div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">快速 (&lt;200ms)</span>
                                <span className="text-green-400">{result?.performanceMetrics.responseTimeDistribution?.fast || 0}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">中等 (200-1000ms)</span>
                                <span className="text-yellow-400">{result?.performanceMetrics.responseTimeDistribution?.medium || 0}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">慢速 (&gt;1000ms)</span>
                                <span className="text-red-400">{result?.performanceMetrics.responseTimeDistribution?.slow || 0}</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-700/30 rounded-lg p-4">
                            <div className="text-sm text-gray-300 mb-2">成功率</div>
                            <div className="text-2xl font-bold text-green-400">
                              {Math.round(result?.performanceMetrics.successRate || 0)}%
                            </div>
                            <div className="text-xs text-gray-400">
                              {result?.passedTests || 0} / {result?.totalTests || 0} 通过
                            </div>
                          </div>
                          <div className="bg-gray-700/30 rounded-lg p-4">
                            <div className="text-sm text-gray-300 mb-2">吞吐量</div>
                            <div className="text-2xl font-bold text-blue-400">
                              {Math.round(result?.performanceMetrics.throughput || 0)}
                            </div>
                            <div className="text-xs text-gray-400">请求/秒</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 安全问题 */}
                    {result?.securityIssues && result?.securityIssues.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-6">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <Shield className="w-5 h-5 mr-2 text-red-500" />
                          安全问题 ({result?.securityIssues.length})
                        </h4>
                        <div className="space-y-3">
                          {result?.securityIssues.slice(0, 5).map((issue: any, index: number) => (
                            <div key={index} className="bg-red-500/5 border border-red-500/10 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="font-medium text-red-400">{issue?.type || '安全问题'}</div>
                                <span className={`text-xs px-2 py-1 rounded ${issue?.severity === 'high' ? 'bg-red-600 text-white' :
                                  issue?.severity === 'medium' ? 'bg-yellow-600 text-white' :
                                    'bg-blue-600 text-white'
                                  }`}>
                                  {issue?.severity === 'high' ? '高危' : issue?.severity === 'medium' ? '中危' : '低危'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-300">{typeof issue === 'string' ? issue : (issue?.description || issue?.message || '安全问题')}</div>
                              {issue?.recommendation && (
                                <div className="text-xs text-gray-400 mt-2">
                                  建议: {issue.recommendation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 端点测试结果 */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-white">端点测试结果</h4>
                      {(result?.endpointResults || result?.endpoints || []).map((endpoint: any, index: number) => (
                        <div key={index} className={`p-4 rounded-lg border ${endpoint.status === 'pass' ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
                          }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${getMethodColor(endpoint.method)}`}>
                                {endpoint.method}
                              </span>
                              <span className="font-medium text-white">{endpoint.name}</span>
                              <span className="text-sm text-gray-400">{endpoint.path}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-2 py-1 text-xs rounded ${endpoint.performanceCategory === 'excellent' ? 'bg-green-600 text-white' :
                                endpoint.performanceCategory === 'good' ? 'bg-blue-600 text-white' :
                                  endpoint.performanceCategory === 'fair' ? 'bg-yellow-600 text-white' :
                                    'bg-red-600 text-white'
                                }`}>
                                {Math.round(endpoint.responseTime || 0)}ms
                              </span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(endpoint.status)}`}>
                                {endpoint.statusCode}
                              </span>
                            </div>
                          </div>

                          {/* 详细信息 */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div>
                              <div className="text-gray-400 mb-1">响应信息</div>
                              <div className="space-y-1">
                                <div className="text-gray-300">大小: {endpoint.responseSize || 0} bytes</div>
                                <div className="text-gray-300">重试: {endpoint.retryCount || 0} 次</div>
                                {endpoint.responseAnalysis && (
                                  <div className="text-gray-300">类型: {endpoint.responseAnalysis.contentType}</div>
                                )}
                              </div>
                            </div>

                            {endpoint.performanceIssues && endpoint.performanceIssues.length > 0 && (
                              <div>
                                <div className="text-gray-400 mb-1">性能问题</div>
                                <div className="space-y-1">
                                  {endpoint.performanceIssues.slice(0, 2).map((issue: any, i: number) => (
                                    <div key={i} className="text-yellow-400 text-xs">{typeof issue === 'string' ? issue : (issue?.description || issue?.message || '性能问题')}</div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {endpoint.securityIssues && endpoint.securityIssues.length > 0 && (
                              <div>
                                <div className="text-gray-400 mb-1">安全问题</div>
                                <div className="space-y-1">
                                  {endpoint.securityIssues.slice(0, 2).map((issue: any, i: number) => (
                                    <div key={i} className="text-red-400 text-xs">{typeof issue === 'string' ? issue : (issue?.type || issue?.message || '安全问题')}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 错误信息和诊断 */}
                          {endpoint.error && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
                              <div className="text-sm text-red-400 mb-2">
                                错误: {endpoint.error}
                              </div>
                              {endpoint.errorDiagnosis && (
                                <div className="text-xs text-gray-400">
                                  <div className="mb-1">建议: {endpoint.errorDiagnosis.suggestion}</div>
                                  {endpoint.errorDiagnosis.troubleshooting && endpoint.errorDiagnosis.troubleshooting.length > 0 && (
                                    <div>排查: {endpoint.errorDiagnosis.troubleshooting.slice(0, 2).join(', ')}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {endpoint.validationErrors && endpoint.validationErrors.length > 0 && (
                            <div className="mt-2 text-sm text-yellow-400">
                              验证错误: {endpoint.validationErrors.slice(0, 2).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 推荐建议 */}
                    {result?.recommendations && result?.recommendations.length > 0 && (
                      <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <h4 className="text-lg font-semibold text-white mb-3">优化建议</h4>
                        <ul className="space-y-2">
                          {result?.recommendations.map((recommendation: string, index: number) => (
                            <li key={index} className="flex items-start space-x-2 text-sm text-gray-300">
                              <span className="text-purple-400 mt-1">•</span>
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
        </>
      }
      onTestSelect={handleTestSelect}
      onTestRerun={handleTestRerun}
    />
  );
};

export default APITest;
