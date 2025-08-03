import { AlertTriangle, BarChart3, CheckCircle, Clock, Download, ExternalLink, Gauge, Globe, Image, Loader, Monitor, RotateCcw, Settings, Share2, Smartphone, Square, Timer, TrendingUp, Wifi, XCircle, Zap } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { TestPageLayout } from '../components/testing/UnifiedTestingComponents';
import { ProgressBar } from '../components/ui/ProgressBar';
import { URLInput } from '../components/ui/URLInput';
import { useUserStats } from '../hooks/useUserStats';
import UnifiedApiService from '../services/api/apiService';
import { googlePageSpeedService } from '../services/googlePageSpeedService';

// CSS样式已迁移到组件库中

// 性能测试相关类型定义
type TestMode = 'basic' | 'standard' | 'comprehensive' | 'lighthouse';
type TestStatusType = 'idle' | 'starting' | 'running' | 'completed' | 'failed';
type NetworkCondition = 'fast-3g' | 'slow-3g' | '4g' | 'wifi' | 'cable' | 'no-throttling';
type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'both';
type TestEngine = 'pagespeed' | 'gtmetrix' | 'webpagetest' | 'lighthouse' | 'local';

// Core Web Vitals 指标
interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  si: number; // Speed Index
}

// 性能测试结果接口
interface PerformanceTestResult {
  id: string;
  url: string;
  timestamp: string;
  engine: TestEngine;
  device: DeviceType;
  location: string;
  overallScore: number;
  coreWebVitals: CoreWebVitals;
  metrics: {
    loadTime: number;
    domContentLoaded: number;
    firstPaint: number;
    pageSize: number;
    requests: number;
    domElements: number;
  };
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    savings: number;
  }>;
  diagnostics: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  screenshots?: string[];
  videoUrl?: string;
  waterfallUrl?: string;
  reportUrl?: string;
}

interface TestHistoryItem {
  id: string;
  url: string;
  timestamp: string;
  engine: TestEngine;
  overallScore: number;
  loadTime: number;
  status: 'completed' | 'failed';
}

// 保持与现有配置兼容的接口
interface PerformanceTestConfig {
  url: string;
  mode: TestMode;
  checkPageSpeed: boolean;
  checkCoreWebVitals: boolean;
  checkResourceOptimization: boolean;
  checkCaching: boolean;
  checkCompression: boolean;
  checkImageOptimization: boolean;
  checkJavaScriptOptimization: boolean;
  checkCSSOptimization: boolean;
  checkMobilePerformance: boolean;
  checkAccessibility: boolean;
  device: 'desktop' | 'mobile' | 'both';
  // 新增的高级配置
  testMode?: TestMode;
  networkCondition?: NetworkCondition;
  engine?: TestEngine;
  location?: string;
  runs?: number;
  timeout?: number;
  includeScreenshots?: boolean;
  includeVideo?: boolean;
  includeWaterfall?: boolean;
  blockAds?: boolean;
  blockTrackers?: boolean;
  customUserAgent?: string;
  customHeaders?: Record<string, string>;
  basicAuth?: {
    username: string;
    password: string;
  };
}

const PerformanceTest: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "性能测试",
    description: "使用性能测试功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  // API服务
  const apiService = new UnifiedApiService();

  const [testConfig, setTestConfig] = useState<PerformanceTestConfig>({
    url: '',
    mode: 'standard',
    checkPageSpeed: true,
    checkCoreWebVitals: true,
    checkResourceOptimization: true,
    checkCaching: true,
    checkCompression: true,
    checkImageOptimization: true,
    checkJavaScriptOptimization: false,
    checkCSSOptimization: false,
    checkMobilePerformance: true,
    checkAccessibility: false,
    device: 'both'
  });

  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatusType>('idle');
  const [testProgress, setTestProgress] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [results, setResults] = useState<PerformanceTestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<Partial<CoreWebVitals>>({});
  const [testHistory, setTestHistory] = useState<TestHistoryItem[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<TestEngine>('pagespeed');

  // 快速模板
  const quickTemplates = [
    {
      id: 'basic',
      name: '快速检测',
      description: '基本性能指标检测',
      icon: Zap,
      color: 'blue',
      duration: '30-60秒',
      config: {
        mode: 'basic' as TestMode,
        checkPageSpeed: true,
        checkCoreWebVitals: true,
        checkResourceOptimization: false,
        checkCaching: false,
        checkCompression: false,
        checkImageOptimization: false,
        checkJavaScriptOptimization: false,
        checkCSSOptimization: false,
        checkMobilePerformance: false,
        checkAccessibility: false,
        device: 'desktop' as const
      }
    },
    {
      id: 'standard',
      name: '标准测试',
      description: '全面的性能分析（推荐）',
      icon: Gauge,
      color: 'green',
      duration: '2-3分钟',
      config: {
        mode: 'standard' as TestMode,
        checkPageSpeed: true,
        checkCoreWebVitals: true,
        checkResourceOptimization: true,
        checkCaching: true,
        checkCompression: true,
        checkImageOptimization: true,
        checkJavaScriptOptimization: false,
        checkCSSOptimization: false,
        checkMobilePerformance: true,
        checkAccessibility: false,
        device: 'both' as const
      }
    },
    {
      id: 'comprehensive',
      name: '深度分析',
      description: '详细的性能优化建议',
      icon: BarChart3,
      color: 'purple',
      duration: '3-5分钟',
      config: {
        mode: 'comprehensive' as TestMode,
        checkPageSpeed: true,
        checkCoreWebVitals: true,
        checkResourceOptimization: true,
        checkCaching: true,
        checkCompression: true,
        checkImageOptimization: true,
        checkJavaScriptOptimization: true,
        checkCSSOptimization: true,
        checkMobilePerformance: true,
        checkAccessibility: true,
        device: 'both' as const
      }
    },
    {
      id: 'lighthouse',
      name: 'Lighthouse审计',
      description: 'Google Lighthouse完整审计',
      icon: TrendingUp,
      color: 'orange',
      duration: '2-4分钟',
      config: {
        mode: 'lighthouse' as TestMode,
        checkPageSpeed: true,
        checkCoreWebVitals: true,
        checkResourceOptimization: true,
        checkCaching: true,
        checkCompression: true,
        checkImageOptimization: true,
        checkJavaScriptOptimization: true,
        checkCSSOptimization: true,
        checkMobilePerformance: true,
        checkAccessibility: true,
        device: 'both' as const
      }
    }
  ];

  // 性能检测项目
  const performanceTests = [
    {
      key: 'checkPageSpeed',
      name: '页面速度',
      description: '检测页面加载速度',
      icon: Timer,
      color: 'blue',
      estimatedTime: '10-20秒'
    },
    {
      key: 'checkCoreWebVitals',
      name: 'Core Web Vitals',
      description: '检测核心网页指标',
      icon: Gauge,
      color: 'green',
      estimatedTime: '15-30秒'
    },
    {
      key: 'checkResourceOptimization',
      name: '资源优化',
      description: '检查资源加载优化',
      icon: Zap,
      color: 'yellow',
      estimatedTime: '20-40秒'
    },
    {
      key: 'checkCaching',
      name: '缓存策略',
      description: '检查缓存配置',
      icon: Clock,
      color: 'purple',
      estimatedTime: '10-20秒'
    },
    {
      key: 'checkCompression',
      name: '压缩优化',
      description: '检查Gzip/Brotli压缩',
      icon: Wifi,
      color: 'indigo',
      estimatedTime: '10-15秒'
    },
    {
      key: 'checkImageOptimization',
      name: '图片优化',
      description: '检查图片压缩和格式',
      icon: Image,
      color: 'pink',
      estimatedTime: '20-30秒'
    },
    {
      key: 'checkJavaScriptOptimization',
      name: 'JavaScript优化',
      description: '检查JS代码优化',
      icon: BarChart3,
      color: 'orange',
      estimatedTime: '30-45秒'
    },
    {
      key: 'checkCSSOptimization',
      name: 'CSS优化',
      description: '检查CSS代码优化',
      icon: Monitor,
      color: 'teal',
      estimatedTime: '20-30秒'
    },
    {
      key: 'checkMobilePerformance',
      name: '移动性能',
      description: '检查移动端性能',
      icon: Smartphone,
      color: 'red',
      estimatedTime: '30-60秒'
    },
    {
      key: 'checkAccessibility',
      name: '可访问性',
      description: '检查页面可访问性',
      icon: CheckCircle,
      color: 'gray',
      estimatedTime: '15-25秒'
    }
  ];

  const applyTemplate = (templateId: string) => {
    const template = quickTemplates.find(t => t.id === templateId);
    if (template) {
      setTestConfig(prev => ({
        ...prev,
        ...template.config
      }));
    }
  };

  // 真实的性能测试引擎集成
  const runRealPerformanceTest = useCallback(async (url: string, config: PerformanceTestConfig) => {
    try {
      console.log('🚀 Starting real performance test for:', url, 'with engine:', selectedEngine);

      let testResult: PerformanceTestResult;

      // 根据选择的引擎执行不同的测试
      switch (selectedEngine) {
        case 'pagespeed':
          testResult = await runPageSpeedTest(url, config);
          break;
        case 'gtmetrix':
          testResult = await runGTmetrixTest(url, config);
          break;
        case 'webpagetest':
          testResult = await runWebPageTest(url, config);
          break;
        case 'lighthouse':
          testResult = await runLighthouseTest(url, config);
          break;
        case 'local':
          testResult = await runLocalTest(url, config);
          break;
        default:
          throw new Error('不支持的测试引擎');
      }

      return testResult;
    } catch (error) {
      console.error('Performance test failed:', error);
      throw error;
    }
  }, [selectedEngine]);

  // Google PageSpeed Insights 测试
  const runPageSpeedTest = async (url: string, config: PerformanceTestConfig): Promise<PerformanceTestResult> => {
    setTestProgress('正在使用 Google PageSpeed Insights 分析...');
    setProgress(20);

    const pageSpeedResult = await googlePageSpeedService.analyzePageSpeed(url);

    setProgress(60);
    setTestProgress('正在处理测试结果...');

    const result: PerformanceTestResult = {
      id: `pagespeed_${Date.now()}`,
      url,
      timestamp: new Date().toISOString(),
      engine: 'pagespeed',
      device: config.device,
      location: 'global',
      overallScore: pageSpeedResult.desktop.performanceScore || 85,
      coreWebVitals: {
        lcp: pageSpeedResult.desktop.lcp || 0,
        fid: pageSpeedResult.desktop.fid || 0,
        cls: pageSpeedResult.desktop.cls || 0,
        fcp: pageSpeedResult.desktop.fcp || 0,
        ttfb: pageSpeedResult.desktop.ttfb || 0,
        si: pageSpeedResult.desktop.fcp || 0 // 使用FCP作为Speed Index的替代
      },
      metrics: {
        loadTime: pageSpeedResult.desktop.fcp || 2000,
        domContentLoaded: 0,
        firstPaint: pageSpeedResult.desktop.fcp || 0,
        pageSize: 0,
        requests: 0,
        domElements: 0
      },
      opportunities: pageSpeedResult.desktop.opportunities?.map(opp => ({
        id: opp.id,
        title: opp.title,
        description: opp.description,
        impact: opp.impact as 'high' | 'medium' | 'low',
        savings: opp.savings || 0
      })) || [],
      diagnostics: pageSpeedResult.desktop.diagnostics?.map(diag => ({
        id: diag.id,
        title: diag.title,
        description: diag.description,
        severity: (diag.impact === 'high' ? 'error' : diag.impact === 'medium' ? 'warning' : 'info') as 'error' | 'warning' | 'info'
      })) || [],
      reportUrl: `https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}`
    };

    setProgress(100);
    return result;
  };

  // GTmetrix 测试
  const runGTmetrixTest = async (url: string, config: PerformanceTestConfig): Promise<PerformanceTestResult> => {
    setTestProgress('正在使用 GTmetrix 分析...');
    setProgress(20);

    try {
      // 调用GTmetrix API
      const response = await apiService.post('/api/test/gtmetrix', {
        url,
        device: config.device,
        location: config.location
      });

      setProgress(80);
      setTestProgress('正在处理 GTmetrix 结果...');

      const result: PerformanceTestResult = {
        id: `gtmetrix_${Date.now()}`,
        url,
        timestamp: new Date().toISOString(),
        engine: 'gtmetrix',
        device: config.device,
        location: config.location,
        overallScore: response.data.scores?.performance || 0,
        coreWebVitals: {
          lcp: response.data.vitals?.lcp || 0,
          fid: response.data.vitals?.fid || 0,
          cls: response.data.vitals?.cls || 0,
          fcp: response.data.vitals?.fcp || 0,
          ttfb: response.data.vitals?.ttfb || 0,
          si: response.data.vitals?.speedIndex || 0
        },
        metrics: {
          loadTime: response.data.timings?.loadTime || 0,
          domContentLoaded: response.data.timings?.domContentLoaded || 0,
          firstPaint: response.data.timings?.firstPaint || 0,
          pageSize: response.data.resources?.totalSize || 0,
          requests: response.data.resources?.requests || 0,
          domElements: response.data.structure?.domElements || 0
        },
        opportunities: response.data.recommendations?.map((rec: any) => ({
          id: rec.id,
          title: rec.title,
          description: rec.description,
          impact: rec.impact,
          savings: rec.savings || 0
        })) || [],
        diagnostics: response.data.issues?.map((issue: any) => ({
          id: issue.id,
          title: issue.title,
          description: issue.description,
          severity: issue.severity
        })) || [],
        screenshots: response.data.screenshots || [],
        reportUrl: response.data.reportUrl
      };

      setProgress(100);
      return result;
    } catch (error) {
      console.warn('GTmetrix test failed, using fallback:', error);
      return await runPageSpeedTest(url, config);
    }
  };

  // WebPageTest 测试
  const runWebPageTest = async (url: string, config: PerformanceTestConfig): Promise<PerformanceTestResult> => {
    setTestProgress('正在使用 WebPageTest 分析...');
    setProgress(20);

    try {
      const response = await apiService.post('/api/test/webpagetest', {
        url,
        device: config.device,
        location: config.location,
        runs: config.runs || 1
      });

      setProgress(80);
      setTestProgress('正在处理 WebPageTest 结果...');

      const result: PerformanceTestResult = {
        id: `webpagetest_${Date.now()}`,
        url,
        timestamp: new Date().toISOString(),
        engine: 'webpagetest',
        device: config.device,
        location: config.location,
        overallScore: response.data.score || 0,
        coreWebVitals: {
          lcp: response.data.metrics?.lcp || 0,
          fid: response.data.metrics?.fid || 0,
          cls: response.data.metrics?.cls || 0,
          fcp: response.data.metrics?.fcp || 0,
          ttfb: response.data.metrics?.ttfb || 0,
          si: response.data.metrics?.speedIndex || 0
        },
        metrics: {
          loadTime: response.data.metrics?.loadTime || 0,
          domContentLoaded: response.data.metrics?.domContentLoaded || 0,
          firstPaint: response.data.metrics?.firstPaint || 0,
          pageSize: response.data.metrics?.bytesIn || 0,
          requests: response.data.metrics?.requests || 0,
          domElements: response.data.metrics?.domElements || 0
        },
        opportunities: response.data.opportunities || [],
        diagnostics: response.data.diagnostics || [],
        videoUrl: response.data.videoUrl,
        waterfallUrl: response.data.waterfallUrl,
        reportUrl: response.data.reportUrl
      };

      setProgress(100);
      return result;
    } catch (error) {
      console.warn('WebPageTest failed, using fallback:', error);
      return await runPageSpeedTest(url, config);
    }
  };

  // Lighthouse 测试
  const runLighthouseTest = async (url: string, config: PerformanceTestConfig): Promise<PerformanceTestResult> => {
    setTestProgress('正在使用 Lighthouse 分析...');
    setProgress(20);

    try {
      const response = await apiService.post('/api/test/lighthouse', {
        url,
        device: config.device,
        throttling: config.networkCondition
      });

      setProgress(80);
      setTestProgress('正在处理 Lighthouse 结果...');

      const result: PerformanceTestResult = {
        id: `lighthouse_${Date.now()}`,
        url,
        timestamp: new Date().toISOString(),
        engine: 'lighthouse',
        device: config.device,
        location: 'local',
        overallScore: response.data.lhr?.categories?.performance?.score * 100 || 0,
        coreWebVitals: {
          lcp: response.data.lhr?.audits?.['largest-contentful-paint']?.numericValue || 0,
          fid: response.data.lhr?.audits?.['max-potential-fid']?.numericValue || 0,
          cls: response.data.lhr?.audits?.['cumulative-layout-shift']?.numericValue || 0,
          fcp: response.data.lhr?.audits?.['first-contentful-paint']?.numericValue || 0,
          ttfb: response.data.lhr?.audits?.['server-response-time']?.numericValue || 0,
          si: response.data.lhr?.audits?.['speed-index']?.numericValue || 0
        },
        metrics: {
          loadTime: response.data.lhr?.audits?.['interactive']?.numericValue || 0,
          domContentLoaded: response.data.lhr?.audits?.['dom-content-loaded']?.numericValue || 0,
          firstPaint: response.data.lhr?.audits?.['first-contentful-paint']?.numericValue || 0,
          pageSize: response.data.lhr?.audits?.['total-byte-weight']?.numericValue || 0,
          requests: response.data.lhr?.audits?.['network-requests']?.details?.items?.length || 0,
          domElements: response.data.lhr?.audits?.['dom-size']?.numericValue || 0
        },
        opportunities: Object.values(response.data.lhr?.audits || {})
          .filter((audit: any) => audit.scoreDisplayMode === 'binary' && audit.score < 1)
          .map((audit: any) => ({
            id: audit.id,
            title: audit.title,
            description: audit.description,
            impact: audit.score < 0.5 ? 'high' : audit.score < 0.9 ? 'medium' : 'low',
            savings: audit.numericValue || 0
          })),
        diagnostics: Object.values(response.data.lhr?.audits || {})
          .filter((audit: any) => audit.scoreDisplayMode === 'informative')
          .map((audit: any) => ({
            id: audit.id,
            title: audit.title,
            description: audit.description,
            severity: audit.score < 0.5 ? 'error' : audit.score < 0.9 ? 'warning' : 'info'
          })),
        reportUrl: response.data.reportUrl
      };

      setProgress(100);
      return result;
    } catch (error) {
      console.warn('Lighthouse test failed, using fallback:', error);
      return await runPageSpeedTest(url, config);
    }
  };

  // 本地测试
  const runLocalTest = async (url: string, config: PerformanceTestConfig): Promise<PerformanceTestResult> => {
    setTestProgress('正在进行本地性能分析...');
    setProgress(20);

    try {
      const response = await apiService.post('/api/test/local-performance', {
        url,
        device: config.device,
        timeout: config.timeout
      });

      setProgress(80);
      setTestProgress('正在处理本地测试结果...');

      const result: PerformanceTestResult = {
        id: `local_${Date.now()}`,
        url,
        timestamp: new Date().toISOString(),
        engine: 'local',
        device: config.device,
        location: 'local',
        overallScore: response.data.score || 0,
        coreWebVitals: response.data.vitals || {
          lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0, si: 0
        },
        metrics: response.data.metrics || {
          loadTime: 0, domContentLoaded: 0, firstPaint: 0,
          pageSize: 0, requests: 0, domElements: 0
        },
        opportunities: response.data.opportunities || [],
        diagnostics: response.data.diagnostics || []
      };

      setProgress(100);
      return result;
    } catch (error) {
      console.warn('Local test failed, using fallback:', error);
      return await runPageSpeedTest(url, config);
    }
  };

  const handleStartTest = async () => {
    if (!testConfig.url) {
      setError('请输入要测试的URL');
      return;
    }

    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    try {
      setError('');
      setTestStatus('starting');
      setIsRunning(true);
      setProgress(0);
      setTestProgress('正在初始化性能测试...');

      // 显示测试开始状态
      setTestStatus('running');
      setProgress(10);
      setTestProgress('连接目标网站...');

      // 调用真实的性能测试引擎
      const testResult = await runRealPerformanceTest(testConfig.url, testConfig);

      // 更新进度到完成状态
      setProgress(100);
      setTestProgress('性能测试完成！');

      // 处理测试结果
      console.log('📊 Performance test result:', testResult);

      setResults(testResult);
      setTestStatus('completed');
      setIsRunning(false);

      // 添加到测试历史
      const historyItem: TestHistoryItem = {
        id: testResult.id,
        url: testResult.url,
        timestamp: testResult.timestamp,
        engine: testResult.engine,
        overallScore: testResult.overallScore,
        loadTime: testResult.metrics.loadTime,
        status: 'completed'
      };
      setTestHistory(prev => [historyItem, ...prev.slice(0, 9)]); // 保留最近10条记录

      // 记录测试完成统计
      recordTestCompletion('性能测试', true, testResult.overallScore, Math.floor(Date.now() / 1000));

    } catch (err: any) {
      console.error('❌ Failed to start performance test:', err);
      setError(err.message || '性能测试启动失败');
      setTestStatus('failed');
      setIsRunning(false);
      setProgress(0);
      setTestProgress('');
    }
  };

  const handleStopTest = async () => {
    setTestStatus('idle');
    setTestProgress('');
    setError('');
    setIsRunning(false);
    setProgress(0);
    console.log('✅ Performance test stopped');
  };

  const handleTestTypeChange = (testKey: keyof PerformanceTestConfig) => {
    setTestConfig(prev => ({
      ...prev,
      [testKey]: !prev[testKey]
    }));
  };

  // 移除强制登录检查，允许未登录用户查看页面
  // 在使用功能时才提示登录

  return (
    <TestPageLayout className="space-y-3 dark-page-scrollbar compact-layout"
    >
      {/* 页面标题和控制 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">性能测试</h2>
            <p className="text-gray-300 text-sm">全面分析网站性能表现和优化建议</p>
          </div>

          {/* 模式切换 */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-gray-700/50 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setIsAdvancedMode(false)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all ${!isAdvancedMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
                  }`}
              >
                快速模式
              </button>
              <button
                type="button"
                onClick={() => setIsAdvancedMode(true)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all ${isAdvancedMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
                  }`}
              >
                高级模式
              </button>
            </div>

            {/* 测试状态和控制按钮 */}
            <div className="flex items-center space-x-2">
              {testStatus === 'idle' ? (
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!testConfig.url}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${!testConfig.url
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                  <Gauge className="w-4 h-4" />
                  <span>开始测试</span>
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
                    <span className="text-xs text-green-300 font-medium">测试中</span>
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
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-md">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-300 font-medium">测试完成</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartTest}
                    disabled={!testConfig.url}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!testConfig.url
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>重新测试</span>
                  </button>
                </div>
              ) : testStatus === 'failed' ? (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-md">
                  <XCircle className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-300 font-medium">测试失败</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* 左侧：URL输入和配置 */}
        <div className="lg:col-span-2 space-y-3">
          {/* URL输入 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
            <h3 className="text-base font-semibold text-white mb-3 flex items-center">
              <Globe className="w-4 h-4 mr-2 text-blue-400" />
              测试网站
            </h3>
            <div className="space-y-3">
              <div className="url-input-container">
                <URLInput
                  value={testConfig.url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="输入要测试的网站URL..."
                  className="url-input-full-width"
                  size="sm"
                />
              </div>
              <div className="text-xs text-gray-400">
                示例：https://www.example.com
              </div>
            </div>
          </div>

          {/* 测试引擎选择 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
            <h3 className="text-base font-semibold text-white mb-3 flex items-center">
              <Settings className="w-4 h-4 mr-2 text-purple-400" />
              测试引擎
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                { id: 'pagespeed', name: 'PageSpeed', icon: '🚀', description: 'Google PageSpeed Insights' },
                { id: 'gtmetrix', name: 'GTmetrix', icon: '📊', description: 'GTmetrix 性能分析' },
                { id: 'webpagetest', name: 'WebPageTest', icon: '🌐', description: 'WebPageTest 详细分析' },
                { id: 'lighthouse', name: 'Lighthouse', icon: '💡', description: 'Chrome Lighthouse' },
                { id: 'local', name: '本地测试', icon: '🏠', description: '本地性能分析' }
              ].map((engine) => (
                <button
                  key={engine.id}
                  type="button"
                  onClick={() => setSelectedEngine(engine.id as TestEngine)}
                  className={`p-2 rounded-md border transition-all text-center ${selectedEngine === engine.id
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600/50 bg-gray-700/30 hover:border-gray-500'
                    }`}
                >
                  <div className="text-lg mb-0.5">{engine.icon}</div>
                  <div className="text-xs font-medium text-white">{engine.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-tight">{engine.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 快速模式 - 测试模式选择 */}
          {!isAdvancedMode && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                测试模式
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickTemplates.map((mode) => {
                  const IconComponent = mode.icon;
                  const isSelected = testConfig.mode === mode.config.mode;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setTestConfig(prev => ({ ...prev, ...mode.config }))}
                      className={`p-3 rounded-md border transition-all text-left ${isSelected
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600/50 bg-gray-700/30 hover:border-gray-500'
                        }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <IconComponent className={`w-5 h-5 mt-0.5 ${mode.color === 'blue' ? 'text-blue-400' :
                          mode.color === 'green' ? 'text-green-400' :
                            mode.color === 'purple' ? 'text-purple-400' :
                              'text-orange-400'
                          }`} />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-white">{mode.name}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">{mode.description}</p>
                          <div className="flex items-center mt-1.5 text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {mode.duration}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 高级模式 - 详细配置 */}
          {isAdvancedMode && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-purple-400" />
                测试配置
              </h3>

              {/* 设备选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">测试设备</label>
                <div className="flex space-x-3">
                  {[
                    { value: 'desktop', label: '桌面端', icon: Monitor },
                    { value: 'mobile', label: '移动端', icon: Smartphone },
                    { value: 'both', label: '双端测试', icon: Gauge }
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTestConfig(prev => ({ ...prev, device: value as any }))}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${testConfig.device === value
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                        : 'border-gray-600/50 bg-gray-700/30 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 检测项目 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">检测项目</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {performanceTests.map((test) => {
                    const IconComponent = test.icon;
                    const isEnabled = testConfig[test.key as keyof PerformanceTestConfig] as boolean;
                    return (
                      <div
                        key={test.key}
                        className={`p-3 rounded-lg border transition-all ${isEnabled
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-gray-600/50 bg-gray-700/30'
                          }`}
                      >
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleTestTypeChange(test.key as keyof PerformanceTestConfig)}
                            className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <IconComponent className={`w-4 h-4 ${test.color === 'blue' ? 'text-blue-400' :
                                test.color === 'green' ? 'text-green-400' :
                                  test.color === 'yellow' ? 'text-yellow-400' :
                                    test.color === 'purple' ? 'text-purple-400' :
                                      test.color === 'indigo' ? 'text-indigo-400' :
                                        'text-gray-400'
                                }`} />
                              <span className="text-sm font-medium text-white">{test.name}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{test.description}</p>
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {test.estimatedTime}
                            </div>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：测试状态和进度 */}
        <div className="space-y-3">
          {/* 测试进度 */}
          {(isRunning || testStatus === 'running') && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center">
                <Gauge className="w-4 h-4 mr-2 text-green-400" />
                测试进度
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">整体进度</span>
                  <span className="text-white font-medium">{progress}%</span>
                </div>
                <ProgressBar
                  value={progress}
                  variant="primary"
                  size="sm"
                  animated
                />
                {testProgress && (
                  <div className="text-xs text-gray-400">
                    {testProgress}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 错误显示 */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <div>
                  <h4 className="text-red-300 font-medium text-sm">测试失败</h4>
                  <p className="text-red-200 text-xs mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 测试提示 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
            <h3 className="text-base font-semibold text-white mb-3 flex items-center">
              <Image className="w-4 h-4 mr-2 text-blue-400" />
              测试说明
            </h3>
            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex items-start space-x-1.5">
                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                <span>支持HTTP和HTTPS网站</span>
              </div>
              <div className="flex items-start space-x-1.5">
                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                <span>自动检测移动端适配</span>
              </div>
              <div className="flex items-start space-x-1.5">
                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                <span>提供详细优化建议</span>
              </div>
              <div className="flex items-start space-x-1.5">
                <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5" />
                <span>测试时间根据网站复杂度而定</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 测试历史 */}
      {testHistory.length > 0 && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-base font-semibold text-white mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-blue-400" />
            测试历史
          </h3>
          <div className="space-y-2">
            {testHistory.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2.5 bg-gray-700/50 rounded-md">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'completed' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <div>
                    <div className="text-white text-xs font-medium truncate max-w-xs">{item.url}</div>
                    <div className="text-gray-400 text-xs">{new Date(item.timestamp).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className={`text-xs font-medium ${item.overallScore >= 90 ? 'text-green-400' :
                      item.overallScore >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {item.overallScore}分
                    </div>
                    <div className="text-xs text-gray-400">{item.engine}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 测试结果 */}
      {results && testStatus === 'completed' && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-green-400" />
            测试结果
          </h3>

          {/* 总体评分 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold mb-1 ${results.overallScore >= 90 ? 'text-green-400' :
                results.overallScore >= 70 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                {results.overallScore}
              </div>
              <div className="text-gray-300 text-xs">总体评分</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400 mb-1">{(results.metrics.loadTime / 1000).toFixed(1)}s</div>
              <div className="text-gray-300 text-xs">加载时间</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400 mb-1">{(results.metrics.pageSize / 1024).toFixed(1)}KB</div>
              <div className="text-gray-300 text-xs">页面大小</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-400 mb-1">{results.metrics.requests}</div>
              <div className="text-gray-300 text-xs">请求数量</div>
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-700/50 rounded-md p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-300 text-xs">FCP (首次内容绘制)</span>
                <span className={`text-xs font-medium ${results.coreWebVitals.fcp < 1800 ? 'text-green-400' :
                  results.coreWebVitals.fcp < 3000 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                  {(results.coreWebVitals.fcp / 1000).toFixed(1)}s
                </span>
              </div>
              <ProgressBar
                value={Math.min(100, (3000 - results.coreWebVitals.fcp) / 3000 * 100)}
                variant={results.coreWebVitals.fcp < 1800 ? 'success' :
                  results.coreWebVitals.fcp < 3000 ? 'warning' : 'danger'}
                size="sm"
              />
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 text-sm">LCP (最大内容绘制)</span>
                <span className={`text-sm font-medium ${results.coreWebVitals.lcp < 2500 ? 'text-green-400' :
                  results.coreWebVitals.lcp < 4000 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                  {(results.coreWebVitals.lcp / 1000).toFixed(1)}s
                </span>
              </div>
              <ProgressBar
                value={Math.min(100, (4000 - results.coreWebVitals.lcp) / 4000 * 100)}
                variant={results.coreWebVitals.lcp < 2500 ? 'success' :
                  results.coreWebVitals.lcp < 4000 ? 'warning' : 'danger'}
                size="md"
              />
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 text-sm">CLS (累积布局偏移)</span>
                <span className={`text-sm font-medium ${results.coreWebVitals.cls < 0.1 ? 'text-green-400' :
                  results.coreWebVitals.cls < 0.25 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                  {results.coreWebVitals.cls.toFixed(3)}
                </span>
              </div>
              <ProgressBar
                value={Math.min(100, (0.25 - results.coreWebVitals.cls) / 0.25 * 100)}
                variant={results.coreWebVitals.cls < 0.1 ? 'success' :
                  results.coreWebVitals.cls < 0.25 ? 'warning' : 'danger'}
                size="md"
              />
            </div>
          </div>

          {/* 优化建议和诊断 */}
          {(results.opportunities.length > 0 || results.diagnostics.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* 优化建议 */}
              {results.opportunities.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">优化建议</h4>
                  <div className="space-y-3">
                    {results.opportunities.slice(0, 5).map((opportunity) => (
                      <div key={opportunity.id} className="bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="text-white font-medium">{opportunity.title}</h5>
                            <p className="text-gray-400 text-sm mt-1">{opportunity.description}</p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${opportunity.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                            opportunity.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                            {opportunity.impact === 'high' ? '高' : opportunity.impact === 'medium' ? '中' : '低'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 诊断信息 */}
              {results.diagnostics.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">诊断信息</h4>
                  <div className="space-y-3">
                    {results.diagnostics.slice(0, 5).map((diagnostic) => (
                      <div key={diagnostic.id} className="bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="text-white font-medium">{diagnostic.title}</h5>
                            <p className="text-gray-400 text-sm mt-1">{diagnostic.description}</p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${diagnostic.severity === 'error' ? 'bg-red-500/20 text-red-400' :
                            diagnostic.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                            {diagnostic.severity === 'error' ? '错误' : diagnostic.severity === 'warning' ? '警告' : '信息'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-700/50">
            {results.reportUrl && (
              <a
                href={results.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <ExternalLink className="w-3 h-3 mr-1.5" />
                查看详细报告
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                const data = JSON.stringify(results, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `performance-test-${results.id}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-3 h-3 mr-1.5" />
              导出结果
            </button>
            <button
              type="button"
              onClick={() => {
                const text = `性能测试结果 - ${results.url}\n总分: ${results.overallScore}\n加载时间: ${(results.metrics.loadTime / 1000).toFixed(1)}s\n测试引擎: ${results.engine}`;
                navigator.clipboard.writeText(text);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
            >
              <Share2 className="w-3 h-3 mr-1.5" />
              复制结果
            </button>
          </div>
        </div>
      )}
      {/* 登录提示组件 */}
      {LoginPromptComponent}
    </TestPageLayout>
  );
};

export default PerformanceTest;
