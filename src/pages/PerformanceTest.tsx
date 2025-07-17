import {
  BarChart3,
  CheckCircle,
  Clock,
  Gauge,
  Image,
  Loader,
  Monitor,
  Smartphone,
  Square,
  Timer,
  TrendingUp,
  Wifi,
  XCircle,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { useUserStats } from '../hooks/useUserStats';

type TestMode = 'basic' | 'standard' | 'comprehensive' | 'lighthouse';
type TestStatusType = 'idle' | 'starting' | 'running' | 'completed' | 'failed';

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
  const [results, setResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

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

      // 模拟测试过程
      const steps = [
        '连接目标网站...',
        '分析页面结构...',
        '测量加载时间...',
        '检查Core Web Vitals...',
        '分析资源优化...',
        '检查缓存策略...',
        '测试移动性能...',
        '生成性能报告...'
      ];

      setTestStatus('running');

      for (let i = 0; i < steps.length; i++) {
        setTestProgress(steps[i]);
        setProgress((i + 1) / steps.length * 100);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 模拟测试结果
      const mockResults = {
        score: Math.floor(Math.random() * 40) + 60, // 60-100分
        fcp: Math.floor(Math.random() * 2000) + 1000, // 1-3秒
        lcp: Math.floor(Math.random() * 3000) + 2000, // 2-5秒
        cls: (Math.random() * 0.2).toFixed(3), // 0-0.2
        fid: Math.floor(Math.random() * 100) + 50, // 50-150ms
        loadTime: Math.floor(Math.random() * 5000) + 2000, // 2-7秒
        pageSize: Math.floor(Math.random() * 2000) + 1000, // 1-3MB
        requests: Math.floor(Math.random() * 50) + 30, // 30-80个请求
        details: {
          performance: { score: Math.floor(Math.random() * 40) + 60 },
          accessibility: { score: Math.floor(Math.random() * 30) + 70 },
          bestPractices: { score: Math.floor(Math.random() * 20) + 80 },
          seo: { score: Math.floor(Math.random() * 30) + 70 }
        }
      };

      setResults(mockResults);
      setTestStatus('completed');
      setTestProgress('性能测试完成！');
      setIsRunning(false);

      // 记录测试完成统计
      recordTestCompletion('性能测试', true, mockResults.score, 16);

    } catch (err: any) {
      console.error('❌ Failed to start performance test:', err);
      setError(err.message || '性能测试启动失败');
      setTestStatus('failed');
      setIsRunning(false);
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

  if (!isAuthenticated) {
    return <LoginPromptComponent />;
  }

  return (
    <div className="space-y-4 dark-page-scrollbar min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* 页面标题和控制 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">性能测试</h2>
            <p className="text-gray-300 mt-1">全面分析网站性能表现和优化建议</p>
          </div>

          {/* 模式切换 */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-gray-700/50 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setIsAdvancedMode(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!isAdvancedMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
                  }`}
              >
                快速模式
              </button>
              <button
                type="button"
                onClick={() => setIsAdvancedMode(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${isAdvancedMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
                  }`}
              >
                高级模式
              </button>
            </div>

            {/* 测试状态和控制按钮 */}
            <div className="flex items-center space-x-3">
              {testStatus === 'idle' ? (
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!testConfig.url}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${!testConfig.url
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                  <Gauge className="w-5 h-5" />
                  <span>开始测试</span>
                </button>
              ) : testStatus === 'starting' ? (
                <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <Loader className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm text-blue-300 font-medium">正在启动...</span>
                </div>
              ) : testStatus === 'running' || isRunning ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-300 font-medium">测试中</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStopTest}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    <span>停止</span>
                  </button>
                </div>
              ) : testStatus === 'completed' ? (
                <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300 font-medium">测试完成</span>
                </div>
              ) : testStatus === 'failed' ? (
                <div className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-300 font-medium">测试失败</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTest;
