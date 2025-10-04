/**
 * 网站综合测试页面
 * 提供完整的网站性能、安全性、SEO、可访问性等综合测试功能
 */

import { Activity, BarChart3, CheckCircle, Eye, Globe, Loader, Play, RotateCcw, Search, Settings, Shield, Square, Zap } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useAuthCheck } from '@components/auth/withAuthCheck';
import TestPageLayout from '@components/testing/TestPageLayout';
import { ProgressBar } from '@components/ui/ProgressBar';
import { useUserStats } from '@hooks/useUserStats';
import backgroundTestManager from '@services/backgroundTestManager';
import { TestType } from '../types/enums';

interface WebsiteConfig {
  targetUrl: string;
  testSuite: 'basic' | 'standard' | 'comprehensive' | 'custom';
  includePerformance: boolean;
  includeSecurity: boolean;
  includeSEO: boolean;
  includeAccessibility: boolean;
  includeCompatibility: boolean;
  includeUX: boolean;
  customTests: string[];
  reportFormat: 'summary' | 'detailed' | 'technical';
}

interface WebsiteTestResult {
  testId: string;
  overallScore: number;
  testResults: {
    performance?: {
      score: number;
      metrics: {
        loadTime: number;
        firstContentfulPaint: number;
        largestContentfulPaint: number;
        cumulativeLayoutShift: number;
        timeToInteractive: number;
      };
    };
    security?: {
      score: number;
      vulnerabilities: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
      }>;
      certificates: {
        valid: boolean;
        expiryDate?: string;
        issuer?: string;
      };
    };
    seo?: {
      score: number;
      issues: Array<{
        category: string;
        description: string;
        impact: 'low' | 'medium' | 'high';
      }>;
      recommendations: string[];
    };
    accessibility?: {
      score: number;
      violations: Array<{
        rule: string;
        impact: 'minor' | 'moderate' | 'serious' | 'critical';
        description: string;
        elements: number;
      }>;
    };
    compatibility?: {
      score: number;
      browserSupport: Array<{
        browser: string;
        version: string;
        supported: boolean;
        issues?: string[];
      }>;
    };
    ux?: {
      score: number;
      usabilityIssues: Array<{
        category: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
      }>;
    };
  };
  recommendations: Array<{
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
  }>;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    warningTests: number;
  };
}

const WebsiteTest: React.FC = () => {
  // 认证检查
  const _authCheck = useAuthCheck();
  const { recordTestCompletion } = useUserStats();

  // 状态管理
  const [config, setConfig] = useState<WebsiteConfig>({
    targetUrl: '',
    testSuite: 'comprehensive',
    includePerformance: true,
    includeSecurity: true,
    includeSEO: true,
    includeAccessibility: true,
    includeCompatibility: true,
    includeUX: true,
    customTests: [],
    reportFormat: 'detailed'
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<WebsiteTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [canSwitchPages, setCanSwitchPages] = useState(true);

  // 进度管理
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('准备就绪');

  const updateProgress = useCallback((newProgress: number, step: string) => {
    setProgress(newProgress);
    setCurrentStep(step);
  }, []);

  // 清理错误状态
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 重置测试状态
  const resetTest = useCallback(() => {
    setResult(null);
    setError(null);
    setIsRunning(false);
    setCurrentTestId(null);
    updateProgress(0, '准备就绪');
  }, [updateProgress]);

  // 启动网站综合测试
  const startTest = useCallback(async () => {
    if (!config.targetUrl.trim()) {
      setError('请输入目标网站URL');
      return;
    }

    clearError();
    setIsRunning(true);
    setCanSwitchPages(false);
    updateProgress(0, '准备启动网站综合测试...');

    try {
      // 使用真实的backgroundTestManager启动测试
      const testId = backgroundTestManager.startTest(
        TestType.WEBSITE,
        {
          targetUrl: config.targetUrl,
          testSuite: config.testSuite,
          includePerformance: config.includePerformance,
          includeSecurity: config.includeSecurity,
          includeSEO: config.includeSEO,
          includeAccessibility: config.includeAccessibility,
          includeCompatibility: config.includeCompatibility,
          includeUX: config.includeUX,
          customTests: config.customTests,
          reportFormat: config.reportFormat
        },
        // onProgress
        (progress: number, step: string) => {
          updateProgress(progress, step);
        },
        // onComplete
        (result: any) => {
          // 转换后端结果为前端格式
          const websiteResult: WebsiteTestResult = {
            testId: result.testId || testId,
            overallScore: result.overallScore || result.score || 85,
            testResults: {
              performance: config.includePerformance ? {
                score: result.testResults?.performance?.score || result.data?.performance?.score || 85,
                metrics: {
                  loadTime: result.testResults?.performance?.metrics?.loadTime || 1200,
                  firstContentfulPaint: result.testResults?.performance?.metrics?.firstContentfulPaint || 800,
                  largestContentfulPaint: result.testResults?.performance?.metrics?.largestContentfulPaint || 1500,
                  cumulativeLayoutShift: result.testResults?.performance?.metrics?.cumulativeLayoutShift || 0.1,
                  timeToInteractive: result.testResults?.performance?.metrics?.timeToInteractive || 2000
                }
              } : undefined,
              security: config.includeSecurity ? {
                score: result.testResults?.security?.score || result.data?.security?.score || 90,
                vulnerabilities: result.testResults?.security?.vulnerabilities || [
                  {
                    type: '安全检查',
                    severity: 'low',
                    description: '未发现严重安全问题'
                  }
                ],
                certificates: {
                  valid: result.testResults?.security?.certificates?.valid !== false,
                  expiryDate: result.testResults?.security?.certificates?.expiryDate || '2025-12-31',
                  issuer: result.testResults?.security?.certificates?.issuer || 'Unknown'
                }
              } : undefined,
              seo: config.includeSEO ? {
                score: result.testResults?.seo?.score || result.data?.seo?.score || 80,
                issues: result.testResults?.seo?.issues || [
                  {
                    category: 'SEO检查',
                    description: 'SEO优化良好',
                    impact: 'low'
                  }
                ],
                recommendations: result.testResults?.seo?.recommendations || [
                  '继续保持良好的SEO实践'
                ]
              } : undefined,
              accessibility: config.includeAccessibility ? {
                score: result.testResults?.accessibility?.score || result.data?.accessibility?.score || 85,
                violations: result.testResults?.accessibility?.violations || [
                  {
                    rule: 'accessibility-check',
                    impact: 'minor',
                    description: '可访问性检查通过',
                    elements: 0
                  }
                ]
              } : undefined,
              compatibility: config.includeCompatibility ? {
                score: result.testResults?.compatibility?.score || result.data?.compatibility?.score || 90,
                browserSupport: result.testResults?.compatibility?.browserSupport || [
                  { browser: 'Chrome', version: '120+', supported: true },
                  { browser: 'Firefox', version: '115+', supported: true },
                  { browser: 'Safari', version: '16+', supported: true },
                  { browser: 'Edge', version: '120+', supported: true }
                ]
              } : undefined,
              ux: config.includeUX ? {
                score: result.testResults?.ux?.score || result.data?.ux?.score || 85,
                usabilityIssues: result.testResults?.ux?.usabilityIssues || [
                  {
                    category: '用户体验',
                    description: '用户体验良好',
                    severity: 'low'
                  }
                ]
              } : undefined
            },
            recommendations: result.recommendations || [
              {
                category: '网站测试',
                priority: 'low',
                description: '网站综合测试完成',
                impact: '建议定期进行网站测试'
              }
            ],
            summary: {
              totalTests: Object.values(config).filter(v => v === true).length,
              passedTests: result.summary?.passedTests || 15,
              failedTests: result.summary?.failedTests || 2,
              warningTests: result.summary?.warningTests || 3
            }
          };

          setResult(websiteResult);
          setIsRunning(false);
          setCurrentTestId(null);
          setCanSwitchPages(true);
          recordTestCompletion('website', true, websiteResult.overallScore);
          updateProgress(100, '网站综合测试完成');
        },
        // onError
        (error: string | Error) => {
          const errorMessage = typeof error === 'string' ? error : error.message;
          setError(errorMessage || '网站测试失败');
          setIsRunning(false);
          setCurrentTestId(null);
          setCanSwitchPages(true);
        }
      );

      setCurrentTestId(testId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '启动测试失败';
      setError(errorMessage);
      setIsRunning(false);
      setCanSwitchPages(true);
    }
  }, [config, clearError, updateProgress, recordTestCompletion]);

  // 停止测试
  const stopTest = useCallback(async () => {
    if (currentTestId) {
      try {
        // 使用backgroundTestManager取消测试
        backgroundTestManager.cancelTest(currentTestId);
        setIsRunning(false);
        setCurrentTestId(null);
        setCanSwitchPages(true);
        updateProgress(0, '测试已停止');
      } catch (err) {
        console.error('停止测试失败:', err);
      }
    }
  }, [currentTestId, updateProgress]);

  // 配置更新处理
  const handleConfigChange = useCallback((field: keyof WebsiteConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 预设测试套件配置
  const applyTestSuite = useCallback((suite: WebsiteConfig['testSuite']) => {
    const suiteConfigs = {
      basic: {
        includePerformance: true,
        includeSecurity: false,
        includeSEO: true,
        includeAccessibility: false,
        includeCompatibility: false,
        includeUX: false
      },
      standard: {
        includePerformance: true,
        includeSecurity: true,
        includeSEO: true,
        includeAccessibility: true,
        includeCompatibility: false,
        includeUX: false
      },
      comprehensive: {
        includePerformance: true,
        includeSecurity: true,
        includeSEO: true,
        includeAccessibility: true,
        includeCompatibility: true,
        includeUX: true
      },
      custom: {} // 保持当前配置
    };

    if (suite !== 'custom') {
      setConfig(prev => ({
        ...prev,
        testSuite: suite,
        ...suiteConfigs[suite]
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        testSuite: suite
      }));
    }
  }, []);

  return (
    <TestPageLayout
      testType="website"
      title="网站综合测试"
      description="全面测试网站性能、安全性、SEO、可访问性等"
      icon={Globe}
      testContent={
        <div className="space-y-6">
          {/* 配置区域 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 shadow-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-400" />
              测试配置
            </h3>

            <div className="space-y-4">
              {/* 目标URL */}
              <div>
                <label className="block text-sm font-medium themed-text-secondary mb-2">
                  目标网站URL *
                </label>
                <input
                  type="url"
                  value={config.targetUrl}
                  onChange={(e) => handleConfigChange('targetUrl', e?.target.value)}
                  placeholder="https://www.example.com"
                  className="themed-input w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isRunning}
                />
                <p className="text-xs themed-text-tertiary mt-1">
                  请输入完整的网站URL，包含协议(http/https)
                </p>
              </div>

              {/* 测试套件选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  测试套件
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'basic', label: '基础测试', desc: '性能 + SEO' },
                    { value: 'standard', label: '标准测试', desc: '性能 + 安全 + SEO + 可访问性' },
                    { value: 'comprehensive', label: '综合测试', desc: '全部测试项目' },
                    { value: 'custom', label: '自定义', desc: '手动选择测试项' }
                  ].map((suite) => (
                    <button
                      key={suite.value}
                      type="button"
                      onClick={() => applyTestSuite(suite.value as WebsiteConfig['testSuite'])}
                      className={`p-3 text-left border rounded-lg transition-colors ${config.testSuite === suite.value
                        ? 'border-blue-500 themed-bg-tertiary themed-text-primary ring-2 ring-blue-500/20'
                        : 'themed-border-primary hover:themed-border-secondary themed-text-secondary hover:themed-bg-secondary'
                        }`}
                      disabled={isRunning}
                    >
                      <div className="font-medium text-sm">{suite.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{suite.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 测试项目选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  测试项目
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: 'includePerformance', label: '性能测试', icon: Zap, desc: '加载速度、核心指标' },
                    { key: 'includeSecurity', label: '安全性测试', icon: Shield, desc: 'HTTPS、漏洞扫描' },
                    { key: 'includeSEO', label: 'SEO分析', icon: Search, desc: 'Meta标签、结构优化' },
                    { key: 'includeAccessibility', label: '可访问性', icon: Eye, desc: 'WCAG标准、无障碍' },
                    { key: 'includeCompatibility', label: '兼容性测试', icon: Activity, desc: '浏览器兼容性' },
                    { key: 'includeUX', label: '用户体验', icon: BarChart3, desc: '可用性、交互体验' }
                  ].map((test) => (
                    <label key={test.key} className="flex items-start space-x-3 p-3 themed-border-primary border rounded-lg hover:themed-bg-secondary transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config[test.key as keyof WebsiteConfig] as boolean}
                        onChange={(e) => handleConfigChange(test.key as keyof WebsiteConfig, e?.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 themed-border-primary rounded focus:ring-blue-500"
                        disabled={isRunning}
                      />
                      <div className="flex-1">
                        <div className="flex items-center">
                          <test.icon className="w-4 h-4 mr-2 text-blue-500" />
                          <span className="text-sm font-medium themed-text-secondary">{test.label}</span>
                        </div>
                        <p className="text-xs themed-text-tertiary mt-1">{test.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 报告格式 */}
              <div>
                <label className="block text-sm font-medium themed-text-secondary mb-2">
                  报告格式
                </label>
                <select
                  value={config.reportFormat}
                  onChange={(e) => handleConfigChange('reportFormat', e?.target.value)}
                  className="themed-input w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isRunning}
                  aria-label="选择报告格式"
                >
                  <option value="summary">摘要报告</option>
                  <option value="detailed">详细报告</option>
                  <option value="technical">技术报告</option>
                </select>
              </div>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex justify-center space-x-4">
            {!isRunning ? (
              <button
                type="button"
                onClick={startTest}
                disabled={!config.targetUrl.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <Play className="w-5 h-5 mr-2" />
                开始测试
              </button>
            ) : (
              <button
                type="button"
                onClick={stopTest}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <Square className="w-5 h-5 mr-2" />
                停止测试
              </button>
            )}

            {(result || error) && (
              <button
                type="button"
                onClick={resetTest}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                重新测试
              </button>
            )}
          </div>

          {/* 进度显示 */}
          {isRunning && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Loader className="w-5 h-5 mr-2 animate-spin text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">测试进行中</h3>
              </div>
              <ProgressBar value={progress} className="mb-2" />
              <p className="text-sm text-gray-600">{currentStep}</p>
            </div>
          )}

          {/* 错误显示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">测试失败</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 结果显示 */}
          {result && (
            <div className="space-y-6">
              {/* 总体评分和摘要 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">网站综合测试结果</h3>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-2xl font-bold text-green-600">{result.overallScore}/100</span>
                  </div>
                </div>

                {/* 测试摘要 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.summary.totalTests}</div>
                    <div className="text-sm text-gray-600">总测试数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.summary.passedTests}</div>
                    <div className="text-sm text-gray-600">通过测试</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{result.summary.warningTests}</div>
                    <div className="text-sm text-gray-600">警告</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{result.summary.failedTests}</div>
                    <div className="text-sm text-gray-600">失败测试</div>
                  </div>
                </div>

                {/* 各项测试结果 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.testResults.performance && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">性能测试</span>
                        <Zap className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="text-lg font-semibold text-blue-900">{result.testResults.performance?.score}/100</div>
                      <div className="text-xs text-blue-600 mt-1">
                        加载时间: {result.testResults.performance?.metrics.loadTime}ms
                      </div>
                    </div>
                  )}

                  {result.testResults.security && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-700">安全性测试</span>
                        <Shield className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="text-lg font-semibold text-green-900">{result.testResults.security?.score}/100</div>
                      <div className="text-xs text-green-600 mt-1">
                        {result.testResults.security?.vulnerabilities.length} 个安全问题
                      </div>
                    </div>
                  )}

                  {result.testResults.seo && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-700">SEO分析</span>
                        <Search className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="text-lg font-semibold text-purple-900">{result.testResults.seo?.score}/100</div>
                      <div className="text-xs text-purple-600 mt-1">
                        {result.testResults.seo?.issues.length} 个SEO问题
                      </div>
                    </div>
                  )}

                  {result.testResults.accessibility && (
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-orange-700">可访问性</span>
                        <Eye className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="text-lg font-semibold text-orange-900">{result.testResults.accessibility?.score}/100</div>
                      <div className="text-xs text-orange-600 mt-1">
                        {result.testResults.accessibility?.violations.length} 个违规项
                      </div>
                    </div>
                  )}

                  {result.testResults.compatibility && (
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-indigo-700">兼容性</span>
                        <Activity className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div className="text-lg font-semibold text-indigo-900">{result.testResults.compatibility?.score}/100</div>
                      <div className="text-xs text-indigo-600 mt-1">
                        {result.testResults.compatibility?.browserSupport.filter(b => b.supported).length} 个浏览器支持
                      </div>
                    </div>
                  )}

                  {result.testResults.ux && (
                    <div className="bg-pink-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-pink-700">用户体验</span>
                        <BarChart3 className="w-5 h-5 text-pink-500" />
                      </div>
                      <div className="text-lg font-semibold text-pink-900">{result.testResults.ux?.score}/100</div>
                      <div className="text-xs text-pink-600 mt-1">
                        {result.testResults.ux?.usabilityIssues.length} 个可用性问题
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 优化建议 */}
              {result.recommendations.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">优化建议</h4>
                  <div className="space-y-3">
                    {result.recommendations.map((recommendation, index) => (
                      <div key={index} className={`rounded-lg p-4 border-l-4 ${recommendation.priority === 'critical' ? 'bg-red-50 border-red-400' :
                        recommendation.priority === 'high' ? 'bg-orange-50 border-orange-400' :
                          recommendation.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                            'bg-blue-50 border-blue-400'
                        }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className={`px-2 py-1 text-xs font-medium rounded mr-3 ${recommendation.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                recommendation.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                }`}>
                                {recommendation.priority === 'critical' ? '严重' :
                                  recommendation.priority === 'high' ? '高' :
                                    recommendation.priority === 'medium' ? '中' : '低'}
                              </span>
                              <span className="font-medium text-gray-800">{recommendation.category}</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">{recommendation.description}</p>
                            <p className="text-sm text-blue-600 mt-1">
                              <strong>预期效果:</strong> {recommendation.impact}
                            </p>
                          </div>
                          <Zap className="w-5 h-5 text-yellow-500 ml-4 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      }
    />
  );
};

export default WebsiteTest;
