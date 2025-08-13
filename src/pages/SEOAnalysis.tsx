import { AlertCircle, CheckCircle, Eye, FileText, Globe, HardDrive, Image, Link, Loader, MapPin, Search, Settings, Share2, Smartphone, XCircle, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { URLInput } from '../components/testing';
import BaseTestPage from '../components/testing/BaseTestPage';
import { apiService } from '../services/api/apiService';

interface SEOTestConfig {
  url: string;
  keywords: string;
  mode: 'basic' | 'standard' | 'comprehensive';
  checkTechnicalSEO: boolean;
  checkContentQuality: boolean;
  checkPageSpeed: boolean;
  checkMobileFriendly: boolean;
  checkSocialMedia: boolean;
  checkStructuredData: boolean;
  checkImageOptimization: boolean;
  checkInternalLinking: boolean;
  checkSchemaMarkup: boolean;
  checkLocalSEO: boolean;
  checkKeywordDensity: boolean;
}

interface SEOTestResult {
  overallScore: number;
  grade: string;
  tests: {
    technical?: any;
    content?: any;
    pageSpeed?: any;
    mobile?: any;
    social?: any;
    structuredData?: any;
    images?: any;
    links?: any;
    schema?: any;
    keywords?: any;
  };
  recommendations: string[];
  errors: string[];
}

type TestStatus = 'idle' | 'running' | 'completed' | 'failed';

const SEOAnalysis: React.FC = () => {
  useAuthCheck();

  const [testConfig, setTestConfig] = useState<SEOTestConfig>({
    url: '',
    keywords: '',
    mode: 'standard',
    checkTechnicalSEO: true,
    checkContentQuality: true,
    checkPageSpeed: true,
    checkMobileFriendly: true,
    checkSocialMedia: true,
    checkStructuredData: true,
    checkImageOptimization: true,
    checkInternalLinking: true,
    checkSchemaMarkup: true,
    checkLocalSEO: false,
    checkKeywordDensity: true
  });

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResults, setTestResults] = useState<SEOTestResult | null>(null);
  const [error, setError] = useState<string>('');
  const [seoTestMode, setSeoTestMode] = useState<'online' | 'local'>('online');

  // 运行SEO分析
  const runSEOTest = async () => {
    if (!testConfig.url) {
      setError('请输入要测试的URL');
      return;
    }

    try {
      setTestStatus('running');
      setError('');
      setTestResults(null);

      // 调用后端SEO测试API
      const response = await apiService.post('/api/test/real/seo', {
        url: testConfig.url,
        keywords: testConfig.keywords?.split(',').map(k => k.trim()).filter(Boolean) || [],
        options: {
          mode: testConfig.mode,
          checkTechnicalSEO: testConfig.checkTechnicalSEO,
          checkContentQuality: testConfig.checkContentQuality,
          checkPageSpeed: testConfig.checkPageSpeed,
          checkMobileFriendly: testConfig.checkMobileFriendly,
          checkSocialMedia: testConfig.checkSocialMedia,
          checkStructuredData: testConfig.checkStructuredData,
          checkImageOptimization: testConfig.checkImageOptimization,
          checkInternalLinking: testConfig.checkInternalLinking,
          checkSchemaMarkup: testConfig.checkSchemaMarkup,
          checkLocalSEO: testConfig.checkLocalSEO,
          checkKeywordDensity: testConfig.checkKeywordDensity
        }
      });

      if (response.success) {
        setTestResults(response.data);
        setTestStatus('completed');
      } else {
        throw new Error(response.message || 'SEO测试失败');
      }
    } catch (err: any) {
      setTestStatus('failed');
      setError(err.message || '测试过程中发生错误');
    }
  };

  const handleConfigChange = (key: keyof SEOTestConfig, value: any) => {
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
    >
      <div className="space-y-6">
        {/* URL输入和基本配置 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            SEO测试配置
          </h2>

          <div className="space-y-4">
            <URLInput
              value={testConfig.url}
              onChange={(url) => handleConfigChange('url', url)}
              placeholder="输入要分析的网站URL..."
              disabled={testStatus === 'running'}
            />

            {/* 关键词输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                目标关键词 (可选)
              </label>
              <input
                type="text"
                value={testConfig.keywords}
                onChange={(e) => handleConfigChange('keywords', e.target.value)}
                placeholder="输入关键词，用逗号分隔..."
                disabled={testStatus === 'running'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 测试模式选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                分析深度
              </label>
              <div className="flex space-x-4">
                {[
                  { value: 'basic', label: '基础分析', desc: '快速SEO检查' },
                  { value: 'standard', label: '标准分析', desc: '全面SEO审计' },
                  { value: 'comprehensive', label: '深度分析', desc: '详细优化建议' }
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

            {/* SEO检查项目 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                检查项目
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'checkTechnicalSEO', label: '技术SEO', icon: Settings },
                  { key: 'checkContentQuality', label: '内容质量', icon: FileText },
                  { key: 'checkPageSpeed', label: '页面速度', icon: Zap },
                  { key: 'checkMobileFriendly', label: '移动友好', icon: Smartphone },
                  { key: 'checkSocialMedia', label: '社交媒体', icon: Share2 },
                  { key: 'checkStructuredData', label: '结构化数据', icon: HardDrive },
                  { key: 'checkImageOptimization', label: '图片优化', icon: Image },
                  { key: 'checkInternalLinking', label: '内部链接', icon: Link },
                  { key: 'checkSchemaMarkup', label: 'Schema标记', icon: Globe },
                  { key: 'checkLocalSEO', label: '本地SEO', icon: MapPin },
                  { key: 'checkKeywordDensity', label: '关键词密度', icon: Eye }
                ].map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <label key={option.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={testConfig[option.key as keyof SEOTestConfig] as boolean}
                        onChange={(e) => handleConfigChange(option.key as keyof SEOTestConfig, e.target.checked)}
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
              onClick={runSEOTest}
              disabled={!testConfig.url || testStatus === 'running'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {testStatus === 'running' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>SEO分析进行中...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>开始SEO分析</span>
                </>
              )}
            </button>

            {/* 错误信息 */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 测试结果 */}
        {testResults && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              SEO分析结果
            </h2>

            {/* 总体评分 */}
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  SEO总分
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  基于多项SEO指标综合评估
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

            {/* 各项测试结果 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {Object.entries(testResults.tests).map(([testType, result]) => (
                <div key={testType} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {testType === 'technical' ? '技术SEO' :
                        testType === 'content' ? '内容质量' :
                          testType === 'pageSpeed' ? '页面速度' :
                            testType === 'mobile' ? '移动友好' :
                              testType === 'social' ? '社交媒体' :
                                testType === 'structuredData' ? '结构化数据' :
                                  testType === 'images' ? '图片优化' :
                                    testType === 'links' ? '内部链接' :
                                      testType === 'schema' ? 'Schema标记' :
                                        testType === 'keywords' ? '关键词' : testType}
                    </div>
                    {result?.score && (
                      <div className={`text-lg font-bold ${getScoreColor(result.score)}`}>
                        {result.score}
                      </div>
                    )}
                  </div>
                  {result?.status && (
                    <div className="flex items-center space-x-1">
                      {result.status === 'passed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : result.status === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {result.message || result.status}
                      </span>
                    </div>
                  )}
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

            {/* 错误和警告 */}
            {testResults.errors.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                  需要修复的问题
                </h3>
                <ul className="space-y-2">
                  {testResults.errors.map((error, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {error}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseTestPage>
  );
};

export default SEOAnalysis;
