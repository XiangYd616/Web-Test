import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Eye, Globe, FileText, CheckCircle, XCircle, Loader, Square, Clock, RotateCcw } from 'lucide-react';
import URLInput from '../components/URLInput';
import { useAdvancedTestEngine } from '../hooks/useAdvancedTestEngine';
import { AdvancedTestConfig } from '../services/advancedTestEngine';
import { useTheme } from '../contexts/ThemeContext';
import AdvancedTestCharts from '../components/AdvancedTestCharts';
import EnhancedSEOAnalysis from '../components/EnhancedSEOAnalysis';

interface SEOTestConfig extends AdvancedTestConfig {
  checkTechnicalSEO: boolean;
  checkContentQuality: boolean;
  checkKeywords: boolean;
  checkStructuredData: boolean;
  checkPageSpeed: boolean;
  checkMobileFriendly: boolean;
  checkSocialMedia: boolean;
  checkLocalSEO: boolean;
  depth: 'basic' | 'standard' | 'comprehensive';
}

const SEOTest: React.FC = () => {
  const { actualTheme } = useTheme();
  const [config, setConfig] = useState<SEOTestConfig>({
    url: '',
    testType: 'seo',
    checkTechnicalSEO: true,
    checkContentQuality: true,
    checkKeywords: false,
    checkStructuredData: true,
    checkPageSpeed: true,
    checkMobileFriendly: true,
    checkSocialMedia: false,
    checkLocalSEO: false,
    depth: 'standard',
    options: {},
    device: 'desktop',
    screenshots: true,
    timeout: 180000
  });

  // 使用高级测试引擎
  const {
    isRunning,
    progress,
    currentStep,
    testPhase,
    estimatedTimeRemaining,
    results,
    testHistory,
    error,
    engineStatus,
    runTest,
    stopTest,
    clearResults,
    clearError
  } = useAdvancedTestEngine();

  // 状态管理
  const [testStatus, setTestStatus] = useState<'idle' | 'starting' | 'running' | 'completed' | 'failed'>('idle');

  // 监听测试状态变化
  useEffect(() => {
    if (isRunning) {
      setTestStatus('running');
    } else if (results) {
      setTestStatus('completed');
    } else if (error) {
      setTestStatus('failed');
    } else {
      setTestStatus('idle');
    }
  }, [isRunning, results, error]);

  const seoTests = [
    {
      key: 'checkTechnicalSEO',
      name: '技术SEO',
      description: '检查网站结构、URL、重定向等技术要素',
      icon: Globe,
      color: 'blue',
      estimatedTime: '45秒'
    },
    {
      key: 'checkContentQuality',
      name: '内容质量',
      description: '分析页面内容质量、标题、描述等',
      icon: FileText,
      color: 'green',
      estimatedTime: '30秒'
    },
    {
      key: 'checkKeywords',
      name: '关键词分析',
      description: '分析关键词密度和相关性',
      icon: Search,
      color: 'purple',
      estimatedTime: '40秒'
    },
    {
      key: 'checkStructuredData',
      name: '结构化数据',
      description: '检查Schema.org标记和结构化数据',
      icon: TrendingUp,
      color: 'indigo',
      estimatedTime: '25秒'
    },
    {
      key: 'checkPageSpeed',
      name: '页面速度',
      description: '分析页面加载速度对SEO的影响',
      icon: Clock,
      color: 'red',
      estimatedTime: '60秒'
    },
    {
      key: 'checkMobileFriendly',
      name: '移动友好性',
      description: '检查移动设备兼容性',
      icon: Eye,
      color: 'yellow',
      estimatedTime: '35秒'
    }
  ];

  const selectedTestsCount = Object.values(config).filter((value, index) => 
    index > 0 && index < 9 && value === true
  ).length;

  const estimatedTime = selectedTestsCount * 35; // 平均每项测试35秒

  const handleTestTypeChange = (testKey: keyof SEOTestConfig) => {
    setConfig(prev => ({
      ...prev,
      [testKey]: !prev[testKey]
    }));
  };

  const handleStartTest = async () => {
    if (!config.url.trim()) {
      return;
    }

    if (selectedTestsCount === 0) {
      return;
    }

    clearError();
    clearResults();
    setTestStatus('starting');

    // 准备高级测试配置
    const testConfig: AdvancedTestConfig = {
      ...config,
      testType: 'seo',
      options: {
        checkTechnicalSEO: config.checkTechnicalSEO,
        checkContentQuality: config.checkContentQuality,
        checkKeywords: config.checkKeywords,
        checkStructuredData: config.checkStructuredData,
        checkPageSpeed: config.checkPageSpeed,
        checkMobileFriendly: config.checkMobileFriendly,
        checkSocialMedia: config.checkSocialMedia,
        checkLocalSEO: config.checkLocalSEO,
        depth: config.depth
      }
    };

    try {
      await runTest(testConfig);
    } catch (err: any) {
      console.error('SEO test failed:', err);
      setTestStatus('failed');
    }
  };

  const handleStopTest = async () => {
    try {
      await stopTest();
      setTestStatus('idle');
    } catch (err) {
      console.error('Failed to stop test:', err);
    }
  };

  const exportReport = async (format: 'pdf' | 'html' | 'json' | 'csv') => {
    if (!results) return;

    try {
      // 这里可以调用API导出报告
      console.log(`Exporting SEO report in ${format} format...`);
      // TODO: 实现实际的报告导出功能
      alert(`${format.toUpperCase()}报告导出功能正在开发中...`);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('报告导出失败，请稍后重试');
    }
  };

  const shareResults = async () => {
    if (!results) return;

    try {
      const shareData = {
        title: `SEO分析报告 - ${config.url}`,
        text: `网站SEO评分: ${results.overallScore}/100`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // 降级到复制链接
        await navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板');
      }
    } catch (error) {
      console.error('Failed to share results:', error);
    }
  };

  return (
    <div className={`space-y-6 ${actualTheme === 'light' ? 'light-seo-test' : 'dark-seo-test'}`}>
      {/* 页面标题 */}
      <div className="themed-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold themed-text-primary">SEO检测</h2>
            <p className="themed-text-secondary mt-1">全面分析网站SEO表现，提供优化建议</p>
          </div>
        </div>

        <URLInput
          value={config.url}
          onChange={(url) => setConfig(prev => ({ ...prev, url }))}
          placeholder="输入要进行SEO检测的网站URL..."
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
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    config[test.key as keyof SEOTestConfig]
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
                            className={`w-6 h-6 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${
                              config[test.key as keyof SEOTestConfig]
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
                  <span className="block text-sm text-gray-300">全面的SEO分析（推荐）</span>
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
                  <span className="block text-sm text-gray-300">详细的SEO审计和竞争分析</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 测试控制和结果 */}
        <div className="space-y-6">
          {/* 测试控制面板 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">SEO检测控制</h3>

            {testStatus === 'idle' ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-300">
                  <p>已选择 {selectedTestsCount} 项检测</p>
                  <p>预计耗时: {Math.ceil(estimatedTime / 60)} 分钟</p>
                </div>
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!config.url.trim() || selectedTestsCount === 0}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Search className="w-5 h-5" />
                  <span>开始SEO检测</span>
                </button>
              </div>
            ) : testStatus === 'starting' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <Loader className="w-8 h-8 mx-auto mb-2 animate-spin text-green-400" />
                  <p className="text-sm font-medium text-white">正在启动...</p>
                  <p className="text-sm text-gray-300">{currentStep}</p>
                </div>
              </div>
            ) : testStatus === 'running' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="w-16 h-16 border-4 border-gray-600 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-green-500 rounded-full animate-spin border-t-transparent border-r-transparent"></div>
                  </div>
                  <p className="text-sm font-medium text-white">
                    SEO检测中...
                  </p>
                  <p className="text-sm text-gray-300">{currentStep}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>阶段: {testPhase}</span>
                    {estimatedTimeRemaining > 0 && (
                      <span>预计剩余: {Math.ceil(estimatedTimeRemaining / 1000)}秒</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>进度</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                {/* 后台运行提示 */}
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300 font-medium">后台运行模式</span>
                  </div>
                  <p className="text-xs text-green-200 mt-1">
                    测试正在后台运行，您可以自由切换到其他页面，测试不会中断。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStopTest}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>停止检测</span>
                </button>
              </div>
            ) : testStatus === 'completed' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm font-medium text-white">检测完成</p>
                  <p className="text-sm text-gray-300">SEO检测已成功完成</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearResults();
                    clearError();
                    setTestStatus('idle');
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>重新检测</span>
                </button>
              </div>
            ) : testStatus === 'failed' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <XCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                  <p className="text-sm font-medium text-white">检测失败</p>
                  <p className="text-sm text-gray-300">请检查网络连接或重试</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setTestStatus('idle');
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>重试</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* SEO分析结果 */}
      {results && (
        <div className="space-y-6">
          {/* 使用增强的SEO分析组件 */}
          <EnhancedSEOAnalysis
            results={results}
            onExportReport={exportReport}
            onShareResults={shareResults}
          />

          {/* 高级SEO图表 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <AdvancedTestCharts
              results={results}
              testType="seo"
              theme="dark"
              height={400}
              interactive={true}
              showComparison={testHistory.length > 1}
            />
          </div>
        </div>
      )}

      {/* SEO检测历史 */}
      {testHistory.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">检测历史</h3>
          <div className="space-y-3">
            {testHistory.slice(0, 5).map((test, index) => (
              <div key={test.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    test.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-white">{test.url}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(test.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    test.overallScore >= 80 ? 'bg-green-500/20 text-green-400' :
                    test.overallScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {Math.round(test.overallScore)}分
                  </div>
                  <div className="text-xs text-gray-400">
                    {test.findings.length} 问题
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SEOTest;
