import {
  BarChart3,
  CheckCircle,
  Download,
  Eye,
  Globe,
  Loader,
  Search,
  Settings,
  Shield,
  Smartphone,
  Users,
  XCircle,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import EnhancedSEOResults from '../components/seo/EnhancedSEOResults';
import { URLInput } from '../components/testing';
import { useTheme } from '../contexts/ThemeContext';
import { useUserStats } from '../hooks/useUserStats';
import '../styles/seo-test-unified.css';

type TestMode = 'online' | 'local' | 'enhanced';

interface SEOTestConfig {
  url: string;
  keywords: string;
  checkTechnicalSEO: boolean;
  checkContentQuality: boolean;
  checkAccessibility: boolean;
  checkPerformance: boolean;
  checkMobileFriendly: boolean;
  checkSocialMedia: boolean;
  checkStructuredData: boolean;
  checkSecurity: boolean;
  includeImages: boolean;
  includeLinks: boolean;
  depth: 'basic' | 'standard' | 'comprehensive';
}

const SEOTestUnified: React.FC = () => {
  const { actualTheme } = useTheme();

  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "SEO分析",
    description: "使用SEO分析功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  const [config, setConfig] = useState<SEOTestConfig>({
    url: '',
    keywords: '',
    checkTechnicalSEO: true,
    checkContentQuality: true,
    checkAccessibility: true,
    checkPerformance: true,
    checkMobileFriendly: true,
    checkSocialMedia: true,
    checkStructuredData: true,
    checkSecurity: true,
    includeImages: true,
    includeLinks: true,
    depth: 'standard'
  });

  const [testMode, setTestMode] = useState<TestMode>('online');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'starting' | 'running' | 'completed' | 'failed'>('idle');

  // SEO检测项目配置
  const seoTests = [
    {
      key: 'checkTechnicalSEO',
      name: '技术SEO',
      description: '检查网站技术结构和配置',
      icon: Settings,
      color: 'blue',
      estimatedTime: '30-60秒'
    },
    {
      key: 'checkContentQuality',
      name: '内容质量',
      description: '分析页面内容和关键词优化',
      icon: Eye,
      color: 'green',
      estimatedTime: '20-40秒'
    },
    {
      key: 'checkAccessibility',
      name: '可访问性',
      description: '检查网站可访问性标准',
      icon: Users,
      color: 'purple',
      estimatedTime: '15-30秒'
    },
    {
      key: 'checkPerformance',
      name: '性能优化',
      description: '分析页面加载速度和性能',
      icon: Zap,
      color: 'yellow',
      estimatedTime: '30-45秒'
    },
    {
      key: 'checkMobileFriendly',
      name: '移动友好',
      description: '检查移动设备兼容性',
      icon: Smartphone,
      color: 'pink',
      estimatedTime: '20-35秒'
    },
    {
      key: 'checkSocialMedia',
      name: '社交媒体',
      description: '检查社交媒体标签和分享',
      icon: Globe,
      color: 'indigo',
      estimatedTime: '10-20秒'
    },
    {
      key: 'checkStructuredData',
      name: '结构化数据',
      description: '检查Schema.org标记',
      icon: BarChart3,
      color: 'orange',
      estimatedTime: '15-25秒'
    },
    {
      key: 'checkSecurity',
      name: '安全检查',
      description: '检查HTTPS和安全配置',
      icon: Shield,
      color: 'red',
      estimatedTime: '10-15秒'
    }
  ];

  const handleTestTypeChange = (testKey: keyof SEOTestConfig) => {
    setConfig(prev => ({
      ...prev,
      [testKey]: !prev[testKey]
    }));
  };

  const handleRunTest = async () => {
    if (!config.url) {
      setError('请输入要分析的URL');
      return;
    }

    // 清除之前的结果和错误
    setResults(null);
    setError(null);
    setIsAnalyzing(true);
    setTestStatus('starting');
    setProgress(0);
    setCurrentStep('准备SEO分析...');

    try {
      // 调用真实的SEO测试API
      const response = await fetch('/api/test/seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.url,
          config: {
            keywords: config.keywords,
            checkTechnicalSEO: config.checkTechnicalSEO,
            checkContentQuality: config.checkContentQuality,
            checkAccessibility: config.checkAccessibility,
            checkPerformance: config.checkPerformance,
            checkMobileFriendly: config.checkMobileFriendly,
            checkSocialMedia: config.checkSocialMedia,
            checkStructuredData: config.checkStructuredData,
            checkSecurity: config.checkSecurity,
            includeImages: config.includeImages,
            includeLinks: config.includeLinks,
            depth: config.depth
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'SEO分析失败');
      }

      // 转换API返回的数据格式为前端期望的格式
      const testResults = data.data;

      // 设置结果
      setResults(testResults);
      setTestStatus('completed');
      setIsAnalyzing(false);
      setProgress(100);
      setCurrentStep('分析完成');

      console.log('✅ SEO test completed:', testResults);

      // 记录测试完成统计
      const score = testResults?.overallScore || 0;
      recordTestCompletion('SEO分析', true, score, 60); // 假设60秒完成

    } catch (err: any) {
      console.error('❌ SEO test failed:', err);
      setError(err.message || 'SEO分析失败');
      setTestStatus('failed');
      setIsAnalyzing(false);
      setProgress(0);

      // 记录测试失败统计
      recordTestCompletion('SEO分析', false);
    }
  };

  const handleStopTest = async () => {
    try {
      setIsAnalyzing(false);
      setTestStatus('idle');
      setError('测试已被用户停止');
    } catch (err) {
      console.error('Failed to stop test:', err);
    }
  };

  if (!isAuthenticated) {
    return <LoginPromptComponent />;
  }

  return (
    <div className={`space-y-6 ${actualTheme === 'light' ? 'light-seo-test' : 'dark-seo-test'}`}>
      {/* 页面标题 */}
      <div className="themed-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold themed-text-primary">SEO分析</h2>
            <p className="themed-text-secondary mt-1">全面分析网站SEO表现，提供专业优化建议</p>
          </div>
        </div>

        <URLInput
          value={config.url}
          onChange={(url) => setConfig(prev => ({ ...prev, url }))}
          placeholder="输入要进行SEO分析的网站URL..."
        />

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SEO检测配置 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 检测项目选择 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">选择检测项目</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seoTests.map((test) => (
                <div
                  key={test.key}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${config[test.key as keyof SEOTestConfig]
                    ? `border-${test.color}-500 bg-${test.color}-500/10`
                    : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                    }`}
                  onClick={() => handleTestTypeChange(test.key as keyof SEOTestConfig)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 bg-${test.color}-500/20 rounded-lg flex items-center justify-center`}>
                      <test.icon className={`w-5 h-5 text-${test.color}-400`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-white">{test.name}</h4>
                        <div className="relative">
                          <input
                            type="checkbox"
                            id={`seo-test-${test.key}`}
                            checked={config[test.key as keyof SEOTestConfig] as boolean}
                            onChange={() => handleTestTypeChange(test.key as keyof SEOTestConfig)}
                            title={`启用或禁用${test.name}检测`}
                            aria-label={`启用或禁用${test.name}检测`}
                            className="sr-only"
                          />
                          <div
                            className={`w-6 h-6 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${config[test.key as keyof SEOTestConfig]
                              ? `border-${test.color}-500 bg-${test.color}-500 shadow-lg shadow-${test.color}-500/25`
                              : 'border-gray-500 bg-gray-700/50 hover:border-gray-400 hover:bg-gray-600/50'
                              }`}
                            onClick={() => handleTestTypeChange(test.key as keyof SEOTestConfig)}
                          >
                            {config[test.key as keyof SEOTestConfig] && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{test.description}</p>
                      <p className="text-xs text-gray-400 mt-2">预计时间: {test.estimatedTime}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 检测深度配置 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">检测深度</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="depth"
                  value="basic"
                  checked={config.depth === 'basic'}
                  onChange={(e) => setConfig(prev => ({ ...prev, depth: e.target.value as any }))}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-white">
                  <span className="font-medium">基础检测</span>
                  <span className="block text-sm text-gray-300">快速检测主要SEO问题</span>
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="depth"
                  value="standard"
                  checked={config.depth === 'standard'}
                  onChange={(e) => setConfig(prev => ({ ...prev, depth: e.target.value as any }))}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-white">
                  <span className="font-medium">标准检测</span>
                  <span className="block text-sm text-gray-300">全面的SEO检测（推荐）</span>
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="depth"
                  value="comprehensive"
                  checked={config.depth === 'comprehensive'}
                  onChange={(e) => setConfig(prev => ({ ...prev, depth: e.target.value as any }))}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-white">
                  <span className="font-medium">深度检测</span>
                  <span className="block text-sm text-gray-300">详细的SEO审计和分析</span>
                </span>
              </label>
            </div>
          </div>

          {/* 关键词配置 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">关键词设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  目标关键词 <span className="text-gray-500">(可选)</span>
                </label>
                <input
                  type="text"
                  value={config.keywords}
                  onChange={(e) => setConfig(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="输入关键词，用逗号分隔"
                  disabled={isAnalyzing}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <p className="text-xs text-gray-400 mt-1">
                  例如：网站建设, SEO优化, 搜索引擎
                </p>
              </div>
            </div>
          </div>

          {/* 开始测试按钮 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <button
              type="button"
              onClick={isAnalyzing ? handleStopTest : handleRunTest}
              disabled={!config.url && !isAnalyzing}
              className={`w-full py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200 ${isAnalyzing
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : !config.url
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
                }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>停止分析</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>开始SEO分析</span>
                </>
              )}
            </button>

            {/* 进度显示 */}
            {isAnalyzing && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">{currentStep}</span>
                  <span className="text-sm text-blue-400">{progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="seo-progress-bar h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧信息面板 */}
        <div className="space-y-6">
          {/* 测试状态 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">测试状态</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">当前状态</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${testStatus === 'idle' ? 'bg-gray-600 text-gray-300' :
                  testStatus === 'starting' ? 'bg-yellow-600 text-yellow-100' :
                    testStatus === 'running' ? 'bg-blue-600 text-blue-100' :
                      testStatus === 'completed' ? 'bg-green-600 text-green-100' :
                        'bg-red-600 text-red-100'
                  }`}>
                  {testStatus === 'idle' ? '待机' :
                    testStatus === 'starting' ? '启动中' :
                      testStatus === 'running' ? '分析中' :
                        testStatus === 'completed' ? '已完成' :
                          '失败'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">已选检测项</span>
                <span className="text-blue-400">
                  {Object.values(config).filter(v => v === true).length} / {seoTests.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">检测深度</span>
                <span className="text-purple-400 capitalize">{config.depth}</span>
              </div>
            </div>
          </div>

          {/* 功能特性 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">功能特性</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-gray-300">技术SEO检查</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-gray-300">内容质量分析</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-gray-300">性能优化建议</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-gray-300">移动友好检测</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-gray-300">结构化数据验证</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 结果显示 */}
      {results && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">分析结果</h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {/* 导出功能 */ }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>导出报告</span>
              </button>
            </div>
          </div>

          {/* 使用现有的SEO结果组件 */}
          <EnhancedSEOResults
            results={results}
            onExport={(format) => {
              // 导出逻辑
              console.log('Export format:', format);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SEOTestUnified;
