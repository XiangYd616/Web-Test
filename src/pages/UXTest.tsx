import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Gauge,
  ImageIcon,
  Lock,
  MousePointer,
  Play,
  Square,
  Target,
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { TestPageLayout } from '../components/testing/UnifiedTestingComponents';
import { useUserStats } from '../hooks/useUserStats';
import '../styles/progress-bars.css';

interface UXTestConfig {
  url: string;
  device: 'desktop' | 'mobile' | 'tablet';
  network: 'fast3g' | 'slow3g' | '4g' | 'wifi';
  checkPageLoad: boolean;
  checkInteractivity: boolean;
  checkVisualStability: boolean;
  checkAccessibility: boolean;
  checkSEO: boolean;
  timeout: number;
}

interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

interface UXTestResult {
  id: string;
  timestamp: string;
  url: string;
  device: string;
  network: string;
  overallScore: number;
  coreWebVitals: CoreWebVitals;
  performanceMetrics: {
    loadTime: number;
    domContentLoaded: number;
    firstPaint: number;
    speedIndex: number;
    timeToInteractive: number;
  };
  accessibilityScore: number;
  seoScore: number;
  userExperienceIssues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    impact: string;
  }>;
  recommendations: string[];
  screenshots: {
    desktop?: string;
    mobile?: string;
    tablet?: string;
  };
}

const UXTest: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "用户体验测试",
    description: "使用用户体验测试功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  const [config, setConfig] = useState<UXTestConfig>({
    url: '',
    device: 'desktop',
    network: '4g',
    checkPageLoad: true,
    checkInteractivity: true,
    checkVisualStability: true,
    checkAccessibility: true,
    checkSEO: false,
    timeout: 60000
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<UXTestResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState('');

  const handleStartTest = async () => {
    // 检查登录状态
    if (!requireLogin()) {
      return;
    }

    if (!config.url) {
      setError('请输入要测试的网站URL');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResult(null);
    setError('');

    try {
      // 模拟测试步骤
      const steps = [
        '正在加载页面...',
        '分析Core Web Vitals...',
        '检测页面交互性...',
        '评估视觉稳定性...',
        '进行可访问性检查...',
        '生成用户体验报告...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        setProgress(((i + 1) / steps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 调用UX测试API
      const response = await fetch('/api/test/ux', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url: config.url,
          device: config.device,
          network: config.network,
          checkPageLoad: config.checkPageLoad,
          checkInteractivity: config.checkInteractivity,
          checkVisualStability: config.checkVisualStability,
          checkAccessibility: config.checkAccessibility,
          checkSEO: config.checkSEO,
          timeout: config.timeout
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        setCurrentStep('用户体验测试完成！');

        // 记录测试完成统计
        const success = true;
        const score = data.data?.overallScore || data.data?.score;
        const duration = config.timeout / 1000; // 转换为秒
        recordTestCompletion('用户体验测试', success, score, duration);
      } else {
        throw new Error(data.message || 'UX测试失败');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setError(`用户体验测试失败: ${errorMessage}`);

      // 记录测试失败统计
      recordTestCompletion('用户体验测试', false);
    } finally {
      setIsRunning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getVitalStatus = (metric: string, value: number) => {
    const thresholds: Record<string, { good: number; poor: number }> = {
      lcp: { good: 2.5, poor: 4.0 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1.8, poor: 3.0 },
      ttfb: { good: 600, poor: 1500 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'text-gray-400';

    if (value <= threshold.good) return 'text-green-400';
    if (value <= threshold.poor) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <TestPageLayout className="space-y-4 dark-page-scrollbar">
      {/* 页面标题 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">用户体验测试</h2>
            <p className="text-gray-300 mt-1">分析Core Web Vitals和用户体验指标</p>
          </div>
          <div className="flex items-center space-x-2">
            <Eye className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        {/* URL输入 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              网站URL
            </label>
            <input
              type="url"
              value={config.url}
              onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 测试配置 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                设备类型
              </label>
              <select title="请选择"
                value={config.device}
                onChange={(e) => setConfig(prev => ({ ...prev, device: e.target.value as any }))}
                aria-label="选择设备类型"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desktop">桌面端</option>
                <option value="mobile">移动端</option>
                <option value="tablet">平板端</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                网络环境
              </label>
              <select title="请选择"
                value={config.network}
                onChange={(e) => setConfig(prev => ({ ...prev, network: e.target.value as any }))}
                aria-label="选择网络环境"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="wifi">WiFi</option>
                <option value="4g">4G</option>
                <option value="fast3g">快速3G</option>
                <option value="slow3g">慢速3G</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                超时时间
              </label>
              <select title="请选择"
                value={config.timeout}
                onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                aria-label="选择超时时间"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={30000}>30秒</option>
                <option value={60000}>60秒</option>
                <option value={120000}>120秒</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 测试选项 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">测试项目</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { key: 'checkPageLoad', label: '页面加载性能', icon: Clock, description: '分析页面加载时间和性能指标' },
            { key: 'checkInteractivity', label: '交互性测试', icon: MousePointer, description: '检测页面响应和交互延迟' },
            { key: 'checkVisualStability', label: '视觉稳定性', icon: ImageIcon, description: '评估布局稳定性和视觉变化' },
            { key: 'checkAccessibility', label: '可访问性检查', icon: Eye, description: '检查无障碍设计和可访问性' },
            { key: 'checkSEO', label: 'SEO基础检查', icon: Target, description: '基础SEO元素检查' }
          ].map((test) => (
            <div key={test.key} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <test.icon className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-white">{test.label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={config[test.key as keyof UXTestConfig] as boolean}
                  onChange={(e) => setConfig(prev => ({ ...prev, [test.key]: e.target.checked }))}
                  aria-label={`启用${test.label}`}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </div>
              <p className="text-sm text-gray-400">{test.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 测试控制 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">测试控制</h3>
            {isRunning && (
              <div className="mt-2">
                <p className="text-sm text-gray-300">{currentStep}</p>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300 progress-fill progress-fill-blue" style={{ width: `progress%` }}
                  ></div>
                </div>
              </div>
            )}
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleStartTest}
            disabled={isRunning || !config.url}
            className={`px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all ${isRunning || !config.url
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : isAuthenticated
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white border border-yellow-500/30'
              }`}
          >
            {isRunning ? (
              <>
                <Square className="w-4 h-4" />
                <span>测试中...</span>
              </>
            ) : isAuthenticated ? (
              <>
                <Play className="w-4 h-4" />
                <span>开始测试</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>需要登录后测试</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 测试结果 */}
      {result && (
        <div className="space-y-4">
          {/* 总体评分 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">总体评分</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-700"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - result.overallScore / 100)}`}
                    className={getScoreColor(result.overallScore)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
                    {Math.round(result.overallScore)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Core Web Vitals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { key: 'lcp', label: 'LCP', value: result.coreWebVitals.lcp, unit: 's', description: '最大内容绘制' },
                { key: 'fid', label: 'FID', value: result.coreWebVitals.fid, unit: 'ms', description: '首次输入延迟' },
                { key: 'cls', label: 'CLS', value: result.coreWebVitals.cls, unit: '', description: '累积布局偏移' },
                { key: 'fcp', label: 'FCP', value: result.coreWebVitals.fcp, unit: 's', description: '首次内容绘制' },
                { key: 'ttfb', label: 'TTFB', value: result.coreWebVitals.ttfb, unit: 'ms', description: '首字节时间' }
              ].map((vital) => (
                <div key={vital.key} className="bg-gray-700/30 rounded-lg p-4 text-center">
                  <div className={`text-2xl font-bold ${getVitalStatus(vital.key, vital.value)}`}>
                    {vital.value.toFixed(vital.key === 'cls' ? 3 : vital.unit === 's' ? 1 : 0)}{vital.unit}
                  </div>
                  <div className="text-sm font-medium text-white mt-1">{vital.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{vital.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 性能指标详情 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">性能指标详情</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: '页面加载时间', value: result.performanceMetrics.loadTime, unit: 'ms', icon: Clock },
                { label: 'DOM内容加载', value: result.performanceMetrics.domContentLoaded, unit: 'ms', icon: Zap },
                { label: '首次绘制', value: result.performanceMetrics.firstPaint, unit: 'ms', icon: ImageIcon },
                { label: '速度指数', value: result.performanceMetrics.speedIndex, unit: 'ms', icon: Gauge },
                { label: '可交互时间', value: result.performanceMetrics.timeToInteractive, unit: 'ms', icon: MousePointer },
                { label: '可访问性评分', value: result.accessibilityScore, unit: '/100', icon: Eye }
              ].map((metric, index) => (
                <div key={index} className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <metric.icon className="w-5 h-5 text-blue-400" />
                    <span className={`text-lg font-bold ${getScoreColor(metric.unit === '/100' ? metric.value : 100 - (metric.value / 5000) * 100)}`}>
                      {metric.unit === '/100' ? Math.round(metric.value) : Math.round(metric.value)}{metric.unit}
                    </span>
                  </div>
                  <div className="text-sm text-white">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 用户体验问题 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">用户体验问题</h3>
            <div className="space-y-3">
              {result.userExperienceIssues.map((issue, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${issue.severity === 'high' ? 'border-red-500 bg-red-500/10' :
                  issue.severity === 'medium' ? 'border-yellow-500 bg-yellow-500/10' :
                    'border-blue-500 bg-blue-500/10'
                  }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {issue.severity === 'high' ? <XCircle className="w-4 h-4 text-red-400" /> :
                          issue.severity === 'medium' ? <AlertTriangle className="w-4 h-4 text-yellow-400" /> :
                            <CheckCircle className="w-4 h-4 text-blue-400" />}
                        <span className="font-medium text-white">{issue.type}</span>
                        <span className={`px-2 py-1 rounded text-xs ${issue.severity === 'high' ? 'bg-red-500/20 text-red-300' :
                          issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                          {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-1">{issue.description}</p>
                      <p className="text-gray-400 text-xs">影响: {issue.impact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 优化建议 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">优化建议</h3>
            <div className="space-y-3">
              {result.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">测试报告</h3>
                <p className="text-gray-400 text-sm">导出详细的用户体验测试报告</p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>下载PDF</span>
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>查看详情</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 登录提示组件 */}
      {LoginPromptComponent}
    </TestPageLayout>
  );
};

export default UXTest;
