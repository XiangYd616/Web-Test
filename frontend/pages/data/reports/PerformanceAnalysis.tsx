import { CheckCircle, Clock, Gauge, Image, Play, Smartphone, Square, Timer, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { useAuthCheck } from '../../../components/auth/WithAuthCheck.tsx';
import BaseTestPage from '../../../components/testing/BaseTestPage.tsx';
import URLInput from '../../../components/testing/URLInput.tsx';
import { useUserStats } from '../../../hooks/useUserStats.ts';
import { apiService } from '../../../services/api/apiService.ts';
import TestHistory from '../results/TestHistory.tsx';

interface PerformanceTestConfig {
  url: string;
  mode: 'basic' | 'standard' | 'comprehensive';
  checkPageSpeed: boolean;
  checkResourceOptimization: boolean;
  checkCoreWebVitals: boolean;
  checkMobilePerformance: boolean;
  checkCaching: boolean;
  checkCompression: boolean;
}

interface PerformanceTestResult {
  overallScore: number;
  grade: string;
  metrics: {
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
    timeToInteractive: number;
  };
  resourceAnalysis: {
    totalSize: number;
    imageOptimization: number;
    jsOptimization: number;
    cssOptimization: number;
  };
  recommendations: string[];
  errors: string[];
}

type TestStatus = 'idle' | 'running' | 'completed' | 'failed';

const PerformanceAnalysis: React.FC = () => {
  useAuthCheck();

  const [testConfig, setTestConfig] = useState<PerformanceTestConfig>({
    url: '',
    mode: 'standard',
    checkPageSpeed: true,
    checkResourceOptimization: true,
    checkCoreWebVitals: true,
    checkMobilePerformance: true,
    checkCaching: true,
    checkCompression: true
  });

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResults, setTestResults] = useState<PerformanceTestResult | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');

  const { recordTestCompletion } = useUserStats();

  // 运行性能测试
  const runPerformanceTest = async () => {
    if (!testConfig.url) {
      setError('请输入要测试的URL');
      return;
    }

    try {
      setTestStatus('running');
      setError('');
      setTestResults(null);

      // 调用后端性能测试API
      const response = await apiService.post('/api/test/real/performance', {
        url: testConfig.url,
        options: {
          mode: testConfig.mode,
          checkPageSpeed: testConfig.checkPageSpeed,
          checkResourceOptimization: testConfig.checkResourceOptimization,
          checkCoreWebVitals: testConfig.checkCoreWebVitals,
          checkMobilePerformance: testConfig.checkMobilePerformance,
          checkCaching: testConfig.checkCaching,
          checkCompression: testConfig.checkCompression
        }
      });

      if (response.success) {
        setTestResults(response.data);
        setTestStatus('completed');
        recordTestCompletion('performance');
      } else {
        throw new Error(response.message || '性能测试失败');
      }
    } catch (err: any) {
      setTestStatus('failed');
      setError(err.message || '测试过程中发生错误');
    }
  };

  const handleConfigChange = (key: keyof PerformanceTestConfig, value: any) => {
    setTestConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A' || grade === 'A+') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (grade === 'B' || grade === 'B+') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  return (
    <BaseTestPage
      testType="performance"
      title="性能分析"
      description="全面分析网站性能指标，优化用户体验"
      icon={Zap}
      headerExtra={
        <div className="flex items-center space-x-4">
          {/* 标签页切换 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('test')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'test'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              性能测试
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'history'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              测试历史
            </button>
          </div>
        </div>
      }
    >
      {activeTab === 'test' ? (
        <div className="space-y-6">
          {/* URL输入区域 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              测试配置
            </h2>

            <div className="space-y-4">
              <URLInput
                value={testConfig.url}
                onChange={(url) => handleConfigChange('url', url)}
                placeholder="输入要测试的网站URL..."
                disabled={testStatus === 'running'}
              />

              {/* 测试模式选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  测试模式
                </label>
                <div className="flex space-x-4">
                  {[
                    { value: 'basic', label: '基础测试', desc: '快速检测核心指标' },
                    { value: 'standard', label: '标准测试', desc: '全面性能分析' },
                    { value: 'comprehensive', label: '深度测试', desc: '详细优化建议' }
                  ].map((mode) => (
                    <label key={mode.value} className="flex items-center">
                      <input
                        type="radio"
                        name="mode"
                        value={mode.value}
                        checked={testConfig.mode === mode.value}
                        onChange={(e) => handleConfigChange('mode', e.target.value)}
                        disabled={testStatus === 'running'}
                        className="mr-2"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {mode.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {mode.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 测试选项 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  测试项目
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { key: 'checkPageSpeed', label: '页面速度', icon: Timer },
                    { key: 'checkResourceOptimization', label: '资源优化', icon: Image },
                    { key: 'checkCoreWebVitals', label: '核心指标', icon: Gauge },
                    { key: 'checkMobilePerformance', label: '移动性能', icon: Smartphone },
                    { key: 'checkCaching', label: '缓存策略', icon: Clock },
                    { key: 'checkCompression', label: '压缩优化', icon: Square }
                  ].map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <label key={option.key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={testConfig[option.key as keyof PerformanceTestConfig] as boolean}
                          onChange={(e) => handleConfigChange(option.key as keyof PerformanceTestConfig, e.target.checked)}
                          disabled={testStatus === 'running'}
                          className="rounded"
                        />
                        <IconComponent className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 开始测试按钮 */}
              <button
                onClick={runPerformanceTest}
                disabled={!testConfig.url || testStatus === 'running'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {testStatus === 'running' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>测试进行中...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>开始性能测试</span>
                  </>
                )}
              </button>

              {/* 错误信息 */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* 测试结果 */}
          {testResults && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                测试结果
              </h2>

              {/* 总体评分 */}
              <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    总体评分
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    基于多项性能指标综合评估
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getScoreColor(testResults.overallScore)}`}>
                    {testResults.overallScore}
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(testResults.grade)}`}>
                    {testResults.grade}
                  </div>
                </div>
              </div>

              {/* 核心指标 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {Object.entries(testResults.metrics).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {key === 'loadTime' ? '加载时间' :
                        key === 'firstContentfulPaint' ? 'FCP' :
                          key === 'largestContentfulPaint' ? 'LCP' :
                            key === 'cumulativeLayoutShift' ? 'CLS' :
                              key === 'firstInputDelay' ? 'FID' :
                                key === 'timeToInteractive' ? 'TTI' : key}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {typeof value === 'number' ?
                        (key.includes('Time') || key.includes('Paint') || key === 'firstInputDelay' || key === 'timeToInteractive' ?
                          `${value}ms` : value.toFixed(3)) :
                        value}
                    </div>
                  </div>
                ))}
              </div>

              {/* 优化建议 */}
              {testResults.recommendations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                    优化建议
                  </h3>
                  <ul className="space-y-2">
                    {testResults.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {recommendation}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <TestHistory testType="performance" />
      )}
    </BaseTestPage>
  );
};

export default PerformanceAnalysis;
