import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Loader,
  Search,
  Settings,
  Shield,
  Smartphone,
  Square,
  XCircle,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import EnhancedSEOResults from '../components/seo/EnhancedSEOResults';
import { URLInput } from '../components/testing';
import { useRealSEOTest } from '../hooks/useRealSEOTest';

type TestMode = 'standard' | 'comprehensive';
type TestStatusType = 'idle' | 'starting' | 'running' | 'completed' | 'failed';

interface SEOTestConfig {
  url: string;
  keywords: string;
  mode: TestMode;
  checkTechnicalSEO: boolean;
  checkContentQuality: boolean;
  checkAccessibility: boolean;
  checkPerformance: boolean;
  checkMobileFriendly: boolean;
  checkSocialMedia: boolean;
  checkStructuredData: boolean;
  checkSecurity: boolean;
  [key: string]: any; // 允许动态属性访问
}

const SEOTest: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "SEO分析",
    description: "使用SEO分析功能"
  });

  // 真实SEO测试
  const {
    isRunning: isRealTimeRunning,
    progress: realTimeProgress,
    results: realTimeResults,
    error: realTimeError,
    startTest: startRealTimeTest,
    stopTest: stopRealTimeTest
  } = useRealSEOTest();

  const [testConfig, setTestConfig] = useState<SEOTestConfig>({
    url: '',
    keywords: '',
    mode: 'standard',
    checkTechnicalSEO: true,
    checkContentQuality: true,
    checkAccessibility: true,
    checkPerformance: true,
    checkMobileFriendly: true,
    checkSocialMedia: true,
    checkStructuredData: true,
    checkSecurity: true,
  });


  const [testStatus, setTestStatus] = useState<TestStatusType>('idle');
  const [error, setError] = useState('');

  // 使用真实SEO测试的状态
  const isRunning = isRealTimeRunning;
  const progress = realTimeProgress?.progress || 0;
  const currentStep = realTimeProgress?.currentStep || '';
  const results = realTimeResults;

  // 监听真实SEO测试状态变化，同步更新testStatus
  useEffect(() => {
    if (!isRealTimeRunning && testStatus === 'running') {
      // 如果有结果，说明测试完成；如果有错误，说明测试失败
      if (realTimeResults) {
        setTestStatus('completed');
      } else if (realTimeError) {
        setTestStatus('failed');
      } else {
        setTestStatus('idle');
      }
    }
  }, [isRealTimeRunning, testStatus, realTimeResults, realTimeError]);



  // 简化的SEO检测项目 - 只保留最有价值的5个核心项目
  const seoTests = [
    {
      key: 'checkTechnicalSEO',
      name: '页面基础SEO',
      description: '检查Title、Meta描述、H标签等基础要素',
      icon: Settings,
      color: 'blue',
      estimatedTime: '30-45秒',
      priority: 'high'
    },
    {
      key: 'checkContentQuality',
      name: '内容结构',
      description: '分析内容长度、关键词密度、可读性',
      icon: Eye,
      color: 'green',
      estimatedTime: '20-30秒',
      priority: 'high'
    },
    {
      key: 'checkPerformance',
      name: '用户体验',
      description: '检测Core Web Vitals和页面性能',
      icon: Zap,
      color: 'yellow',
      estimatedTime: '30-45秒',
      priority: 'high'
    },
    {
      key: 'checkMobileFriendly',
      name: '技术健康度',
      description: '检查HTTPS、响应速度、移动友好性',
      icon: Smartphone,
      color: 'pink',
      estimatedTime: '20-30秒',
      priority: 'high'
    },
    {
      key: 'checkSecurity',
      name: '基础安全',
      description: '检查HTTPS配置和基本安全头',
      icon: Shield,
      color: 'red',
      estimatedTime: '10-20秒',
      priority: 'medium'
    }
  ];



  const handleStartTest = async () => {
    if (!testConfig.url) {
      setError('请输入要分析的URL');
      return;
    }

    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    try {
      setError('');
      setTestStatus('starting');

      // 使用真实SEO测试
      await startRealTimeTest({
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
      });

      setTestStatus('running');
      console.log('✅ Real SEO test started');

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
      await stopRealTimeTest();
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

  if (!isAuthenticated) {
    return LoginPromptComponent;
  }

  return (
    <div className="space-y-4 dark-page-scrollbar">
      {/* 页面标题和控制 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">SEO综合分析</h2>
            <p className="text-gray-300 mt-1">全面分析网站SEO状况，发现关键问题和优化机会</p>
          </div>

          <div className="flex items-center space-x-3">

            {/* 测试状态和控制按钮 */}
            <div className="flex items-center space-x-3">
              {testStatus === 'idle' ? (
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!testConfig.url}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${!testConfig.url
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                  <Search className="w-5 h-5" />
                  <span>开始分析</span>
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
                    <span className="text-sm text-green-300 font-medium">分析中</span>
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
                  <span className="text-sm text-green-300 font-medium">分析完成</span>
                </div>
              ) : testStatus === 'failed' ? (
                <div className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-300 font-medium">分析失败</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* URL输入区域 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              网站URL
            </label>
            <URLInput
              value={testConfig.url}
              onChange={(url) => setTestConfig(prev => ({ ...prev, url }))}
              placeholder="请输入要分析的网站URL，例如：https://example.com"
              disabled={isRunning}
            />
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
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">选择检测项目</h3>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              已选 {seoTests.filter(test => testConfig[test.key as keyof SEOTestConfig]).length}/{seoTests.length} 项
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  const allEnabled = seoTests.every(test => testConfig[test.key as keyof SEOTestConfig]);
                  const newConfig = { ...testConfig };
                  seoTests.forEach(test => {
                    newConfig[test.key as keyof SEOTestConfig] = !allEnabled as any;
                  });
                  setTestConfig(newConfig);
                }}
                disabled={isRunning}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {seoTests.every(test => testConfig[test.key as keyof SEOTestConfig]) ? '全不选' : '全选'}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {seoTests.map((test) => {
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

      {/* 进度显示 */}
      {(isRunning || progress > 0) && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">分析进度</h3>
              <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300 font-medium">分析失败</span>
          </div>
          <p className="text-red-200 mt-2">{error}</p>
        </div>
      )}

      {/* 结果显示 */}
      {results && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
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

            <EnhancedSEOResults results={results} onExport={handleExportReport} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SEOTest;
