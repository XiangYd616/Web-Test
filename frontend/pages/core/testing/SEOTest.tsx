import { AlertCircle, CheckCircle, Clock, Eye, FileText, Globe, HardDrive, Image, Link, Loader, MapPin, Search, Settings, Share2, Smartphone, Square, XCircle, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAsyncErrorHandler } from '../hooks/useAsyncErrorHandler';
import TestResults from '../components/TestResults';
import React, { useEffect, useState } from 'react';
import { useAuthCheck } from '../../../components/auth/WithAuthCheck.tsx';
import BaseTestPage from '../../../components/testing/BaseTestPage.tsx';
import FileUploadSEO from '../../../components/testing/FileUploadSEO.tsx';
import LocalSEOResults from '../../../components/testing/LocalSEOResults.tsx';
import NetworkErrorPrompt from '../../../components/testing/NetworkErrorPrompt.tsx';
import SEOResults from '../../../components/testing/SEOResults.tsx';
import URLInput from '../../../components/testing/URLInput';
import type { SEOTestMode } from '../../../hooks/useSEOTest';
import { useUnifiedSEOTest } from '../../../hooks/useSEOTest';

// CSS样式已迁移到组件库中

type TestMode = 'standard' | 'comprehensive';
type TestStatusType = 'idle' | 'starting' | 'running' | 'completed' | 'failed';

interface SEOTestConfig {
  url: string;
  keywords: string;
  mode: TestMode;
  checkTechnicalSEO: boolean;
  checkContentQuality: boolean;
  checkPageSpeed: boolean; // 重命名，仅检查基础页面速度
  checkMobileFriendly: boolean;
  checkSocialMedia: boolean;
  checkStructuredData: boolean;
  checkImageOptimization: boolean;
  checkInternalLinking: boolean;
  checkSchemaMarkup: boolean;
  checkLocalSEO: boolean;
  checkCompetitorAnalysis: boolean;
  checkKeywordDensity: boolean;
  [key: string]: any; // 允许动态属性访问
}

const SEOTest: React.FC = () => {
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);
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
    const result = await executeAsync(
      () => fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType: 'performance', config })
      }).then(res => res.json()),
      { context: 'TestExecution.runTest' }
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
        () => fetch(`/api/tests/results/${executionId}`).then(res => res.json()),
        { context: 'TestExecution.pollResult' }
      );
      
      if (result && result.success && result.data.status === 'completed') {
        setTestResult(result.data);
        clearInterval(interval);
      }
    }, 2000);
  };
  const { executeAsync, state } = useAsyncErrorHandler();
  const [testConfig, setTestConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "SEO分析",
    description: "使用SEO分析功能"
  });

  // 统一SEO测试（支持在线和本地）
  const {
    currentMode,
    isRunning,
    progress: testProgress,
    results: testResults,
    error: testError,
    startTest: startUnifiedTest,
    stopTest: stopUnifiedTest,
    switchMode
  } = useUnifiedSEOTest();

  const [testConfig, setTestConfig] = useState<SEOTestConfig>({
    url: '',
    keywords: '',
    mode: 'standard',
    checkTechnicalSEO: true,
    checkContentQuality: true,
    checkPageSpeed: true, // 重命名后的属性
    checkMobileFriendly: true,
    checkSocialMedia: true,
    checkStructuredData: true,
    checkImageOptimization: false,
    checkInternalLinking: false,
    checkSchemaMarkup: false,
    checkLocalSEO: false,
    checkCompetitorAnalysis: false,
    checkKeywordDensity: false,
  });

  const [testStatus, setTestStatus] = useState<TestStatusType>('idle');
  const [error, setError] = useState('');
  const [seoTestMode, setSeoTestMode] = useState<SEOTestMode>('online');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 真实SEO测试功能
  const runRealSEOTest = async (config: SEOTestConfig) => {
    try {
      setTestStatus('running');
      setError('');

      // 调用后端真实SEO测试API
      const response = await apiService.post('/api/test/seo', {
        url: config.url,
        keywords: config.keywords?.split(',').map(k => k.trim()).filter(Boolean) || [],
        options: {
          checkTechnicalSEO: config.checkTechnicalSEO,
          checkContentQuality: config.checkContentQuality,
          checkPageSpeed: config.checkPageSpeed,
          checkMobileFriendly: config.checkMobileFriendly,
          checkSocialMedia: config.checkSocialMedia,
          checkStructuredData: config.checkStructuredData,
          checkImageOptimization: config.checkImageOptimization,
          checkInternalLinking: config.checkInternalLinking,
          checkSchemaMarkup: config.checkSchemaMarkup,
          checkLocalSEO: config.checkLocalSEO,
          checkCompetitorAnalysis: config.checkCompetitorAnalysis,
          checkKeywordDensity: config.checkKeywordDensity,
          mode: config.mode
        }
      });

      if (response.success) {
        
        setTestStatus('completed');
        return response.data;
      } else {
        throw new Error(response.message || 'SEO测试失败');
      }
    } catch (err: any) {
      setTestStatus('failed');
      setError(err.message || '测试过程中发生错误');
      throw err;
    }
  };

  // 使用统一SEO测试的状态
  const progress = testProgress?.progress || 0;
  const currentStep = testProgress?.currentStep || '';
  const results = testResults;

  // 监听统一SEO测试状态变化，同步更新testStatus
  useEffect(() => {
    if (!isRunning && testStatus === 'running') {
      // 如果有结果，说明测试完成；如果有错误，说明测试失败
      if (results) {
        setTestStatus('completed');
      } else if (testError) {
        setTestStatus('failed');
      } else {
        setTestStatus('idle');
      }
    }
  }, [isRunning, testStatus, results, testError]);

  // 扩展的SEO检测项目 - 包含核心和高级检测功能
  const seoTests = [
    // 核心检测项目
    {
      key: 'checkTechnicalSEO',
      name: '页面基础SEO',
      description: '检查Title、Meta描述、H标签等基础要素',
      icon: Settings,
      color: 'blue',
      estimatedTime: '30-45秒',
      priority: 'high',
      category: 'core'
    },
    {
      key: 'checkContentQuality',
      name: '内容结构',
      description: '分析内容长度、关键词密度、可读性',
      icon: Eye,
      color: 'green',
      estimatedTime: '20-30秒',
      priority: 'high',
      category: 'core'
    },
    {
      key: 'checkPageSpeed',
      name: '页面速度',
      description: '检测基础页面加载速度（SEO相关）',
      icon: Zap,
      color: 'yellow',
      estimatedTime: '15-25秒',
      priority: 'medium',
      category: 'core'
    },
    {
      key: 'checkMobileFriendly',
      name: '移动友好性',
      description: '检查移动设备适配和响应式设计',
      icon: Smartphone,
      color: 'pink',
      estimatedTime: '20-30秒',
      priority: 'high',
      category: 'core'
    },

    // 高级检测项目
    {
      key: 'checkImageOptimization',
      name: '图片优化',
      description: '检查图片Alt标签、尺寸、格式优化',
      icon: Image,
      color: 'purple',
      estimatedTime: '15-25秒',
      priority: 'medium',
      category: 'advanced'
    },
    {
      key: 'checkInternalLinking',
      name: '内链结构',
      description: '分析内部链接结构和锚文本优化',
      icon: Link,
      color: 'indigo',
      estimatedTime: '20-30秒',
      priority: 'medium',
      category: 'advanced'
    },
    {
      key: 'checkSchemaMarkup',
      name: '结构化数据',
      description: '检查Schema.org标记和富摘要',
      icon: FileText,
      color: 'teal',
      estimatedTime: '15-20秒',
      priority: 'medium',
      category: 'advanced'
    },
    {
      key: 'checkSocialMedia',
      name: '社交媒体',
      description: '检查Open Graph和Twitter Card标签',
      icon: Share2,
      color: 'cyan',
      estimatedTime: '10-15秒',
      priority: 'low',
      category: 'advanced'
    },
    {
      key: 'checkKeywordDensity',
      name: '关键词分析',
      description: '深度分析关键词分布和密度',
      icon: Search,
      color: 'orange',
      estimatedTime: '25-35秒',
      priority: 'medium',
      category: 'advanced'
    },
    {
      key: 'checkLocalSEO',
      name: '本地SEO',
      description: '检查本地业务相关的SEO要素',
      icon: MapPin,
      color: 'emerald',
      estimatedTime: '20-30秒',
      priority: 'low',
      category: 'advanced'
    }
  ];

  const handleStartTest = async () => {
    // 检查登录状态
    if (!requireLogin()) {
      return;
    }

    // 验证输入
    if (seoTestMode === 'online' && !testConfig.url) {
      
        setError('请输入要分析的URL');
      return;
      }

    if (seoTestMode === 'local' && uploadedFiles.length === 0) {
      
        setError('请上传要分析的HTML文件');
      return;
      }

    // 登录检查已在函数开始处处理

    try {
      setError('');
      setTestStatus('starting');

      // 使用统一SEO测试
      if (seoTestMode === 'online') {
        await startUnifiedTest({
          mode: 'online',
          online: {
            url: testConfig.url,
            keywords: testConfig.keywords,
            checkTechnicalSEO: testConfig.checkTechnicalSEO,
            checkContentQuality: testConfig.checkContentQuality,
            checkAccessibility: testConfig.checkAccessibility,
            checkPerformance: testConfig.checkPerformance,
            checkMobileFriendly: testConfig.checkMobileFriendly,
            checkSocialMedia: testConfig.checkSocialMedia,
            checkStructuredData: testConfig.checkStructuredData,
            checkSecurity: testConfig.checkSecurity,
            depth: testConfig.mode === 'comprehensive' ? 'comprehensive' : 'standard'
          }
        });
      } else {
        await startUnifiedTest({
          mode: 'local',
          local: {
            files: uploadedFiles,
            keywords: testConfig.keywords,
            checkTechnicalSEO: testConfig.checkTechnicalSEO,
            checkContentQuality: testConfig.checkContentQuality,
            checkAccessibility: testConfig.checkAccessibility,
            checkPerformance: testConfig.checkPerformance,
            checkMobileFriendly: testConfig.checkMobileFriendly,
            checkSocialMedia: testConfig.checkSocialMedia,
            checkStructuredData: testConfig.checkStructuredData,
            checkSecurity: testConfig.checkSecurity,
            depth: testConfig.mode === 'comprehensive' ? 'comprehensive' : 'standard'
          }
        });
      }

      setTestStatus('running');
      console.log(`✅ ${seoTestMode === 'online' ? 'Online' : 'Local'} SEO test started`);

    } catch (err: any) {
      console.error('❌ Failed to start SEO test:', err);

      // 提供更友好的错误信息
      let errorMessage = 'SEO分析启动失败';
      if (err.message) {
        if (err.message.includes('CORS')) {
          errorMessage = '无法访问该网站：网站不允许跨域访问。请尝试其他支持CORS的网站，或者使用具有CORS支持的网站进行测试。';
        } else if (err.message.includes('网络连接失败')) {
          errorMessage = '网络连接失败：无法连接到目标网站。请检查网址是否正确，确保网站可以正常访问。';
        } else if (err.message.includes('页面不存在')) {
          errorMessage = '页面不存在：目标页面返回404错误。请检查网址是否正确。';
        } else if (err.message.includes('请求超时')) {
          errorMessage = '请求超时：网站响应时间过长。请稍后重试或尝试其他网站。';
        } else if (err.message.includes('内容为空')) {
          errorMessage = '页面内容为空：无法获取到有效的页面内容进行分析。请确保网址指向一个有效的网页。';
        } else if (err.message.includes('不是有效的HTML')) {
          errorMessage = '页面格式错误：获取到的内容不是有效的HTML页面。请确保网址指向一个网页而不是文件或API接口。';
        } else {
          errorMessage = `分析失败：${err.message}`;
        }
      }

      setError(errorMessage);
      setTestStatus('failed');
    }
  };

  const handleStopTest = async () => {
    try {
      await stopUnifiedTest();
      setTestStatus('idle');
      setError('');
      console.log('✅ SEO test stopped');
    } catch (err) {
      console.error('Failed to stop test:', err);
    }
  };

  const handleTestTypeChange = (testKey: keyof SEOTestConfig) => {
    setTestConfig(prev => ({
      ...prev,
      [testKey]: !prev[testKey]
    }));
  };

  // 处理测试模式切换
  const handleModeSwitch = async (mode: SEOTestMode) => {
    if (mode !== seoTestMode) {
      // 如果正在运行测试，先停止
      if (isRunning) {
        await handleStopTest();
      }

      setSeoTestMode(mode);
      await switchMode(mode);
      setError('');

      // 清除相关状态
      if (mode === 'online') {
        setUploadedFiles([]);
      } else {
        setTestConfig(prev => ({ ...prev, url: '' }));
      }
    }
  };

  // 处理本地文件上传（仅上传，不自动开始分析）
  const handleLocalFileUpload = (files: File[], options: any) => {
    setUploadedFiles(files);

    // 更新测试配置
    setTestConfig(prev => ({
      ...prev,
      keywords: options.keywords || '',
      checkTechnicalSEO: options.checkTechnicalSEO !== false,
      checkContentQuality: options.checkContentQuality !== false,
      checkAccessibility: options.checkAccessibility !== false,
      checkPerformance: options.checkPerformance !== false
    }));

    // 清除错误信息
    setError('');
  };

  // 处理切换到本地分析的请求
  const handleSwitchToLocalAnalysis = async () => {
    await handleModeSwitch('local');
  };

  const handleExportReport = async (format: string) => {
    if (!results) return;

    try {
      // 生成报告内容
      const reportData = {
        title: `SEO分析报告 - ${testConfig.url}`,
        url: testConfig.url,
        timestamp: new Date().toISOString(),
        score: results.score,
        grade: results.grade,
        results: results
      };

      // 根据格式导出
      switch (format) {
        case 'pdf':
          // 生成HTML内容并打印为PDF
          const htmlContent = generateHTMLReport(reportData);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
              printWindow.print();
            }, 500);
          }
          break;
        case 'json':
          // 导出JSON格式
          const jsonContent = JSON.stringify(reportData, null, 2);
          const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonLink = document.createElement('a');
          jsonLink.href = jsonUrl;
          jsonLink.download = `seo-report-${Date.now()}.json`;
          document.body.appendChild(jsonLink);
          jsonLink.click();
          document.body.removeChild(jsonLink);
          URL.revokeObjectURL(jsonUrl);
          break;
        default:
          console.warn('不支持的导出格式:', format);
      }
    } catch (error) {
      console.error('导出报告失败:', error);
      setError('导出报告失败，请重试');
    }
  };

  const generateHTMLReport = (reportData: any) => {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportData.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
        .url { color: #6b7280; font-size: 14px; }
        .score-section { display: flex; justify-content: center; align-items: center; margin: 30px 0; }
        .score-circle { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: white; }
        .grade-a { background: linear-gradient(135deg, #10b981, #059669); }
        .grade-b { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .grade-c { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .grade-d { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .grade-f { background: linear-gradient(135deg, #7c2d12, #991b1b); }
        .section { margin: 20px 0; }
        .section-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 12px; }
        .metric { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .metric:last-child { border-bottom: none; }
        .metric-name { font-weight: 500; color: #374151; }
        .metric-value { font-weight: bold; }
        .score-good { color: #10b981; }
        .score-medium { color: #f59e0b; }
        .score-poor { color: #ef4444; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
        @media print { body { background: white; } .container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">${reportData.title}</div>
            <div class="url">${reportData.url}</div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 10px;">
                生成时间: ${new Date(reportData.timestamp).toLocaleString('zh-CN')}
            </div>
        </div>

        <div class="score-section">
            <div class="score-circle grade-${reportData.grade.toLowerCase()}">
                ${reportData.score}/100
            </div>
        </div>

        <div class="section">
            <div class="section-title">各模块评分</div>
            ${Object.entries({
      '技术SEO': reportData.results.technicalSEO?.score || 0,
      '内容质量': reportData.results.contentQuality?.score || 0,
      '可访问性': reportData.results.accessibility?.score || 0,
      '性能表现': reportData.results.performance?.score || 0,
      '移动友好': reportData.results.mobileFriendly?.score || 0,
      '社交媒体': reportData.results.socialMedia?.score || 0,
      '结构化数据': reportData.results.structuredData?.score || 0,
      '安全配置': reportData.results.security?.score || 0
    }).map(([name, score]) => `
                <div class="metric">
                    <span class="metric-name">${name}</span>
                    <span class="metric-value ${score >= 80 ? 'score-good' : score >= 60 ? 'score-medium' : 'score-poor'}">${score}/100</span>
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p>本报告由Test Web SEO分析工具生成</p>
            <p>更多功能请访问我们的网站</p>
        </div>
    </div>
</body>
</html>
    `;
  };

  // 历史记录处理
  const handleTestSelect = (test: any) => {
    // 历史测试选择由TestPageLayout处理
    console.log('Selected test:', test);
  };

  const handleTestRerun = (test: any) => {
    // 重新运行历史测试
    if (test.config) {
      setTestConfig(test.config);
      // 可以选择是否立即开始测试
    }
  };

  // 移除强制登录检查，允许未登录用户查看页面
  // 在使用功能时才提示登录

  
  if (state.isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              操作失败
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{state.error.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BaseTestPage
      testType="seo"
      title="SEO综合分析"
      description="全面分析网站SEO状况，发现关键问题和优化机会"
      icon={Search}
      headerExtra={
        <div className="flex items-center space-x-4">
          {/* 测试模式切换 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSeoTestMode('online')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${seoTestMode === 'online'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              在线分析
            </button>
            <button
              onClick={() => setSeoTestMode('local')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${seoTestMode === 'local'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              本地分析
            </button>
          </div>
        </div>
      }
      testTabLabel="SEO测试"
      historyTabLabel="测试历史"
      testStatus={testStatus === 'starting' ? 'running' : testStatus as 'idle' | 'running' | 'completed' | 'failed'}
      isTestDisabled={!testConfig.url}
      onStartTest={handleStartTest}
      onTestSelect={handleTestSelect}
      onTestRerun={handleTestRerun}
      additionalComponents={LoginPromptComponent}
      testContent={
        <div className="space-y-6">
          {/* 测试模式选择 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>

                <div className="flex items-center space-x-2">

                  {/* 测试状态和控制按钮 */}
                  <div className="flex items-center space-x-2">
                    {testStatus === 'idle' ? (
                      <button
                        type="button"
                        onClick={handleStartTest}
                        disabled={
                          seoTestMode === 'online'
                            ? !testConfig.url
                            : uploadedFiles.length === 0
                        }
                        className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${(seoTestMode === 'online' ? !testConfig.url : uploadedFiles.length === 0)
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                      >
                        <Search className="w-4 h-4" />
                        <span>
                          {seoTestMode === 'online' ? '开始分析' : '开始本地分析'}
                        </span>
                      </button>
                    ) : testStatus === 'starting' ? (
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-md">
                        <Loader className="w-3 h-3 animate-spin text-blue-400" />
                        <span className="text-xs text-blue-300 font-medium">正在启动...</span>
                      </div>
                    ) : testStatus === 'running' || isRunning ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-md">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-300 font-medium">分析中</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleStopTest}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-xs"
                        >
                          <Square className="w-3 h-3" />
                          <span>停止</span>
                        </button>
                      </div>
                    ) : testStatus === 'completed' ? (
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-md">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-300 font-medium">分析完成</span>
                      </div>
                    ) : testStatus === 'failed' ? (
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-md">
                        <XCircle className="w-3 h-3 text-red-400" />
                        <span className="text-xs text-red-300 font-medium">分析失败</span>
                      </div>
                    ) : null}

                    {/* 完成状态操作按钮 - 独立区域 */}
                    {testStatus === 'completed' && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setTestStatus('idle');
                          }}
                          className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 transition-colors font-medium"
                        >
                          新测试
                        </button>
                        {seoTestMode === 'online' && (
                          <button
                            type="button"
                            onClick={handleSwitchToLocalAnalysis}
                            className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-300 transition-colors font-medium"
                          >
                            切换本地分析
                          </button>
                        )}
                      </div>
                    )}

                    {/* 失败状态操作按钮 - 独立区域 */}
                    {testStatus === 'failed' && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setTestStatus('idle');
                            handleStartTest();
                          }}
                          className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 transition-colors font-medium"
                        >
                          重新测试
                        </button>
                        {seoTestMode === 'online' && (
                          <button
                            type="button"
                            onClick={handleSwitchToLocalAnalysis}
                            className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-300 transition-colors font-medium"
                          >
                            切换本地分析
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEO测试内容 */}
          {/* 测试模式选择 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  选择分析模式
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 在线URL分析 */}
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${seoTestMode === 'online'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                    onClick={() => handleModeSwitch('online')}
                  >
                    <div className="flex items-center space-x-3">
                      <Globe className={`w-6 h-6 ${seoTestMode === 'online' ? 'text-blue-400' : 'text-gray-400'}`} />
                      <div>
                        <div className={`font-medium ${seoTestMode === 'online' ? 'text-blue-300' : 'text-gray-300'}`}>
                          在线网站分析
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          输入URL分析在线网站
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 本地文件分析 */}
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all relative ${seoTestMode === 'local'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                    onClick={() => handleModeSwitch('local')}
                  >
                    {/* 推荐标签 */}
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      推荐
                    </div>
                    <div className="flex items-center space-x-3">
                      <HardDrive className={`w-6 h-6 ${seoTestMode === 'local' ? 'text-green-400' : 'text-gray-400'}`} />
                      <div>
                        <div className={`font-medium ${seoTestMode === 'local' ? 'text-green-300' : 'text-gray-300'}`}>
                          本地文件分析 ⚡
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          上传HTML文件，不受网络限制
                        </div>
                        <div className="text-xs text-green-400 mt-1 font-medium">
                          ✓ 更快速 ✓ 更准确 ✓ 更稳定
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 模式状态提示 */}
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-lg border border-gray-600/50 bg-gray-700/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {seoTestMode === 'online' ? (
                        <Globe className="w-4 h-4 text-blue-400" />
                      ) : (
                        <HardDrive className="w-4 h-4 text-green-400" />
                      )}
                      <span className="text-sm text-gray-300">
                        当前模式: {seoTestMode === 'online' ? '在线网站分析' : '本地文件分析'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {seoTestMode === 'online'
                        ? (testConfig.url ? '✓ URL已输入' : '请输入URL')
                        : (uploadedFiles.length > 0 ? `✓ 已上传${uploadedFiles.length}个文件` : '请上传HTML文件')
                      }
                    </div>
                  </div>
                </div>

                {/* 本地分析优势提示 */}
                {seoTestMode === 'online' && (
                  <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
                    <div className="flex items-start space-x-2">
                      <div className="text-green-400 text-lg">💡</div>
                      <div>
                        <div className="text-sm text-green-300 font-medium mb-1">
                          遇到网络问题？试试本地文件分析！
                        </div>
                        <div className="text-xs text-green-400">
                          本地分析不受网络限制，分析速度更快，结果更准确。只需上传HTML文件即可开始。
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 输入区域 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="space-y-4">
              {seoTestMode === 'online' ? (
                <div className="url-input-form-group">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    网站URL
                  </label>
                  <div className="url-input-container">
                    <URLInput
                      value={testConfig.url}
                      onChange={(url) => setTestConfig(prev => ({ ...prev, url }))}
                      placeholder="请输入要分析的网站URL，例如：https://example.com"
                      disabled={isRunning}
                      className="url-input-full-width"
                    />
                  </div>
                  <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-300">
                        <div className="font-medium mb-1">使用说明</div>
                        <div className="text-blue-200 space-y-1">
                          <div>• 本工具只分析真实的网站内容，不提供模拟数据</div>
                          <div>• 由于浏览器安全限制，某些网站可能无法直接分析</div>
                          <div>• 建议测试支持CORS的网站或您自己的网站</div>
                          <div>• 推荐测试网站：httpbin.org、公开API测试网站</div>
                          <div>• 如果遇到访问问题，请尝试其他网站或稍后重试</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 本地文件上传 */
                <div>
                  <FileUploadSEO
                    onAnalysisComplete={() => { }}
                    isAnalyzing={isRunning}
                    onFileUpload={handleLocalFileUpload}
                  />
                </div>
              )}

              {/* 关键词输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  目标关键词 <span className="text-gray-500">(可选)</span>
                </label>
                <input
                  type="text"
                  value={testConfig.keywords}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="请输入关键词，多个关键词用逗号分隔"
                  disabled={isRunning}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* 检测项目选择 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-white">选择检测项目</h3>

                {/* 分类切换 */}
                <div className="flex items-center bg-gray-700/50 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(false)}
                    disabled={isRunning}
                    className={`px-3 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${!showAdvanced
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                      }`}
                  >
                    核心项目
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(true)}
                    disabled={isRunning}
                    className={`px-3 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${showAdvanced
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                      }`}
                  >
                    全部项目
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-400">
                  已选 {seoTests.filter(test => testConfig[test.key as keyof SEOTestConfig]).length}/{seoTests.length} 项
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const visibleTests = showAdvanced ? seoTests : seoTests.filter(test => test.category === 'core');
                      const allEnabled = visibleTests.every(test => testConfig[test.key as keyof SEOTestConfig]);
                      const newConfig = { ...testConfig };
                      visibleTests.forEach(test => {
                        newConfig[test.key as keyof SEOTestConfig] = !allEnabled as any;
                      });
                      setTestConfig(newConfig);
                    }}
                    disabled={isRunning}
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(() => {
                      const visibleTests = showAdvanced ? seoTests : seoTests.filter(test => test.category === 'core');
                      return visibleTests.every(test => testConfig[test.key as keyof SEOTestConfig]) ? '全不选' : '全选';
                    })()}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newConfig = { ...testConfig };
                      seoTests.forEach(test => {
                        newConfig[test.key as keyof SEOTestConfig] = (test.priority === 'high') as any;
                      });
                      setTestConfig(newConfig);
                    }}
                    disabled={isRunning}
                    className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    推荐项
                  </button>
                </div>
              </div>
            </div>

            {/* 核心项目 */}
            {(!showAdvanced || showAdvanced) && (
              <div className="space-y-6">
                {!showAdvanced && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      <span>核心检测项目 (推荐)</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {seoTests.filter(test => test.category === 'core').map((test) => {
                        const IconComponent = test.icon;
                        const isEnabled = testConfig[test.key as keyof SEOTestConfig] as boolean;

                        return (
                          <button
                            key={test.key}
                            type="button"
                            onClick={() => handleTestTypeChange(test.key as keyof SEOTestConfig)}
                            disabled={isRunning}
                            className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${isEnabled
                              ? `border-${test.color}-500 bg-${test.color}-500/10 hover:bg-${test.color}-500/15`
                              : 'border-gray-600 bg-gray-700/30 hover:bg-gray-700/50 hover:border-gray-500'
                              } ${isRunning
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                              }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div
                                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isEnabled
                                  ? `border-${test.color}-500 bg-${test.color}-500`
                                  : 'border-gray-500'
                                  }`}
                              >
                                {isEnabled && <CheckCircle className="w-3 h-3 text-white" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <IconComponent className={`w-4 h-4 ${isEnabled ? `text-${test.color}-400` : 'text-gray-400'}`} />
                                  <span className={`font-medium text-sm ${isEnabled ? `text-${test.color}-300` : 'text-gray-300'}`}>
                                    {test.name}
                                  </span>
                                  {test.priority === 'high' && (
                                    <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                                      推荐
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mb-2">{test.description}</p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-500">{test.estimatedTime}</span>
                                  </div>
                                  {isEnabled && (
                                    <div className="flex items-center space-x-1">
                                      <CheckCircle className="w-3 h-3 text-green-400" />
                                      <span className="text-xs text-green-400">已选择</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 全部项目 */}
                {showAdvanced && (
                  <div className="space-y-6">
                    {/* 核心项目组 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span>核心检测项目</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {seoTests.filter(test => test.category === 'core').map((test) => {
                          const IconComponent = test.icon;
                          const isEnabled = testConfig[test.key as keyof SEOTestConfig] as boolean;

                          return (
                            <button
                              key={test.key}
                              type="button"
                              onClick={() => handleTestTypeChange(test.key as keyof SEOTestConfig)}
                              disabled={isRunning}
                              className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${isEnabled
                                ? `border-${test.color}-500 bg-${test.color}-500/10 hover:bg-${test.color}-500/15`
                                : 'border-gray-600 bg-gray-700/30 hover:bg-gray-700/50 hover:border-gray-500'
                                } ${isRunning
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isEnabled
                                    ? `border-${test.color}-500 bg-${test.color}-500`
                                    : 'border-gray-500'
                                    }`}
                                >
                                  {isEnabled && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <IconComponent className={`w-4 h-4 ${isEnabled ? `text-${test.color}-400` : 'text-gray-400'}`} />
                                    <span className={`font-medium text-sm ${isEnabled ? `text-${test.color}-300` : 'text-gray-300'}`}>
                                      {test.name}
                                    </span>
                                    {test.priority === 'high' && (
                                      <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                                        推荐
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mb-2">{test.description}</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-3 h-3 text-gray-500" />
                                      <span className="text-xs text-gray-500">{test.estimatedTime}</span>
                                    </div>
                                    {isEnabled && (
                                      <div className="flex items-center space-x-1">
                                        <CheckCircle className="w-3 h-3 text-green-400" />
                                        <span className="text-xs text-green-400">已选择</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 高级项目组 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                        <span>高级检测项目</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {seoTests.filter(test => test.category === 'advanced').map((test) => {
                          const IconComponent = test.icon;
                          const isEnabled = testConfig[test.key as keyof SEOTestConfig] as boolean;

                          return (
                            <button
                              key={test.key}
                              type="button"
                              onClick={() => handleTestTypeChange(test.key as keyof SEOTestConfig)}
                              disabled={isRunning}
                              className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${isEnabled
                                ? `border-${test.color}-500 bg-${test.color}-500/10 hover:bg-${test.color}-500/15`
                                : 'border-gray-600 bg-gray-700/30 hover:bg-gray-700/50 hover:border-gray-500'
                                } ${isRunning
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isEnabled
                                    ? `border-${test.color}-500 bg-${test.color}-500`
                                    : 'border-gray-500'
                                    }`}
                                >
                                  {isEnabled && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <IconComponent className={`w-4 h-4 ${isEnabled ? `text-${test.color}-400` : 'text-gray-400'}`} />
                                    <span className={`font-medium text-sm ${isEnabled ? `text-${test.color}-300` : 'text-gray-300'}`}>
                                      {test.name}
                                    </span>
                                    {test.priority === 'medium' && (
                                      <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded">
                                        进阶
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mb-2">{test.description}</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-3 h-3 text-gray-500" />
                                      <span className="text-xs text-gray-500">{test.estimatedTime}</span>
                                    </div>
                                    {isEnabled && (
                                      <div className="flex items-center space-x-1">
                                        <CheckCircle className="w-3 h-3 text-green-400" />
                                        <span className="text-xs text-green-400">已选择</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 进度显示 */}
          {(isRunning || progress > 0) && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">分析进度</h3>
                  <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
                </div>

                {/* 进度条 */}
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="test-progress-dynamic h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* 当前步骤 */}
                {currentStep && (
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    {isRunning ? (
                      <Loader className="w-4 h-4 animate-spin text-blue-400" />
                    ) : progress >= 100 ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span>{currentStep}</span>
                  </div>
                )}

                {/* 预估时间 */}
                {isRunning && (
                  <div className="text-sm text-gray-400">
                    正在分析中...
                  </div>
                )}

                {/* 分析说明 */}
                {isRunning && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-300">
                        <div className="font-medium mb-1">分析过程说明</div>
                        <div className="text-blue-200">
                          正在执行专业SEO检查，包括技术配置、内容质量等多个维度。
                          控制台中的404错误是正常的检查流程，不影响分析结果。
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 错误显示 */}
          {error && (
            <NetworkErrorPrompt
              error={error}
              onRetry={() => {
                setError('');
                handleStartTest();
              }}
              onSwitchToLocal={handleSwitchToLocalAnalysis}
            />
          )}

          {/* 结果显示 */}
          {results && (
            <div className="space-y-6">
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">分析结果</h3>
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${results.grade === 'A' ? 'bg-green-500/20 text-green-300' :
                      results.grade === 'B' ? 'bg-blue-500/20 text-blue-300' :
                        results.grade === 'C' ? 'bg-yellow-500/20 text-yellow-300' :
                          results.grade === 'D' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-red-500/20 text-red-300'
                      }`}>
                      {results.grade} 级
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {results.score}/100
                    </div>
                  </div>
                </div>

                {seoTestMode === 'online' ? (
                  <SEOResults results={results} onExport={handleExportReport} />
                ) : (
                  <LocalSEOResults results={results} onExport={handleExportReport} />
                )}
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

export default SEOTest;
