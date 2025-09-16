/**
 * 增强版性能测试页面
 * 提供完整的性能测试功能，包括Lighthouse集成和Core Web Vitals分析
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Activity,
  Gauge,
  TrendingUp,
  Clock,
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Line, Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { unifiedApiService } from '../services/api/unifiedApiService';
import { toast } from 'react-hot-toast';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PerformanceConfig {
  url: string;
  device: 'mobile' | 'desktop' | 'tablet';
  throttling: 'none' | '3G' | '4G';
  categories: string[];
  iterations: number;
  compareUrl?: string;
}

interface CoreWebVitals {
  LCP: { value: number; score: string; rating: 'good' | 'needs-improvement' | 'poor' };
  FID: { value: number; score: string; rating: 'good' | 'needs-improvement' | 'poor' };
  CLS: { value: number; score: string; rating: 'good' | 'needs-improvement' | 'poor' };
  FCP: { value: number; score: string; rating: 'good' | 'needs-improvement' | 'poor' };
  INP: { value: number; score: string; rating: 'good' | 'needs-improvement' | 'poor' };
  TTFB: { value: number; score: string; rating: 'good' | 'needs-improvement' | 'poor' };
}

interface PerformanceResult {
  testId: string;
  url: string;
  timestamp: Date;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    pwa: number;
  };
  coreWebVitals: CoreWebVitals;
  metrics: {
    firstContentfulPaint: number;
    speedIndex: number;
    timeToInteractive: number;
    totalBlockingTime: number;
    cumulativeLayoutShift: number;
    largestContentfulPaint: number;
  };
  opportunities: Array<{
    title: string;
    description: string;
    savings: number;
    impact: 'high' | 'medium' | 'low';
  }>;
  diagnostics: Array<{
    title: string;
    description: string;
    details: string;
  }>;
  resources: {
    totalSize: number;
    scriptSize: number;
    styleSize: number;
    imageSize: number;
    fontSize: number;
    otherSize: number;
  };
  screenshots: {
    initial?: string;
    final?: string;
    filmstrip?: string[];
  };
}

const EnhancedPerformanceTest: React.FC = () => {
  const [config, setConfig] = useState<PerformanceConfig>({
    url: '',
    device: 'desktop',
    throttling: 'none',
    categories: ['performance', 'accessibility', 'best-practices', 'seo'],
    iterations: 1
  });

  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<PerformanceResult | null>(null);
  const [compareResult, setCompareResult] = useState<PerformanceResult | null>(null);
  const [testHistory, setTestHistory] = useState<PerformanceResult[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  // 开始性能测试
  const startTest = async () => {
    if (!config.url) {
      toast.error('请输入测试URL');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setCurrentStep('初始化测试环境...');

    try {
      // 模拟测试进度
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      const response = await unifiedApiService.post('/api/test/performance', {
        config,
        testId: `perf_${Date.now()}`
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.success && response.data) {
        const result = response.data as PerformanceResult;
        setCurrentResult(result);
        setTestHistory(prev => [result, ...prev.slice(0, 9)]);
        
        // 分析结果并给出反馈
        analyzeAndNotify(result);
      }

    } catch (error: any) {
      toast.error(error.message || '性能测试失败');
      console.error('性能测试错误:', error);
    } finally {
      setIsRunning(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  // 分析结果并发送通知
  const analyzeAndNotify = (result: PerformanceResult) => {
    const { performance } = result.scores;
    
    if (performance >= 90) {
      toast.success(`性能优秀！得分: ${performance}/100`);
    } else if (performance >= 50) {
      toast.warning(`性能一般，建议优化。得分: ${performance}/100`);
    } else {
      toast.error(`性能较差，需要立即优化！得分: ${performance}/100`);
    }
  };

  // 导出报告
  const exportReport = () => {
    if (!currentResult) {
      toast.error('没有可导出的测试结果');
      return;
    }

    const report = {
      ...currentResult,
      exportTime: new Date().toISOString(),
      configuration: config
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-test-${currentResult.testId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('性能报告已导出');
  };

  // Core Web Vitals 评级组件
  const VitalCard: React.FC<{ 
    name: string; 
    value: number; 
    unit: string; 
    rating: 'good' | 'needs-improvement' | 'poor';
    threshold: { good: number; poor: number };
  }> = ({ name, value, unit, rating, threshold }) => {
    const getColor = () => {
      switch (rating) {
        case 'good': return 'text-green-500 border-green-500';
        case 'needs-improvement': return 'text-yellow-500 border-yellow-500';
        case 'poor': return 'text-red-500 border-red-500';
      }
    };

    const getIcon = () => {
      switch (rating) {
        case 'good': return <CheckCircle className="h-5 w-5" />;
        case 'needs-improvement': return <AlertTriangle className="h-5 w-5" />;
        case 'poor': return <AlertTriangle className="h-5 w-5" />;
      }
    };

    return (
      <div className={`bg-white rounded-lg border-2 p-4 ${getColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-700">{name}</h4>
          {getIcon()}
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {value.toFixed(2)} {unit}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          良好 &lt; {threshold.good}{unit} | 
          较差 &gt; {threshold.poor}{unit}
        </div>
      </div>
    );
  };

  // 性能得分雷达图数据
  const getRadarChartData = () => {
    if (!currentResult) return null;

    return {
      labels: ['性能', '可访问性', '最佳实践', 'SEO', 'PWA'],
      datasets: [
        {
          label: '当前测试',
          data: [
            currentResult.scores.performance,
            currentResult.scores.accessibility,
            currentResult.scores.bestPractices,
            currentResult.scores.seo,
            currentResult.scores.pwa
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(59, 130, 246)'
        },
        ...(compareResult ? [{
          label: '对比测试',
          data: [
            compareResult.scores.performance,
            compareResult.scores.accessibility,
            compareResult.scores.bestPractices,
            compareResult.scores.seo,
            compareResult.scores.pwa
          ],
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgb(16, 185, 129)',
          pointBackgroundColor: 'rgb(16, 185, 129)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(16, 185, 129)'
        }] : [])
      ]
    };
  };

  // 资源分布图数据
  const getResourceChartData = () => {
    if (!currentResult) return null;

    const { resources } = currentResult;
    return {
      labels: ['脚本', '样式', '图片', '字体', '其他'],
      datasets: [{
        label: '资源大小 (KB)',
        data: [
          resources.scriptSize / 1024,
          resources.styleSize / 1024,
          resources.imageSize / 1024,
          resources.fontSize / 1024,
          resources.otherSize / 1024
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ]
      }]
    };
  };

  // 性能指标趋势图
  const getMetricsTrendData = () => {
    if (testHistory.length === 0) return null;

    const labels = testHistory.map((_, index) => `测试 ${testHistory.length - index}`);
    const lcpData = testHistory.map(test => test.coreWebVitals.LCP.value).reverse();
    const fcpData = testHistory.map(test => test.coreWebVitals.FCP.value).reverse();
    const clsData = testHistory.map(test => test.coreWebVitals.CLS.value * 1000).reverse(); // 放大显示

    return {
      labels,
      datasets: [
        {
          label: 'LCP (秒)',
          data: lcpData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        },
        {
          label: 'FCP (秒)',
          data: fcpData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'CLS (×1000)',
          data: clsData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        }
      ]
    };
  };

  const radarData = getRadarChartData();
  const resourceData = getResourceChartData();
  const trendData = getMetricsTrendData();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <Activity className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">性能测试</h1>
          </div>
          <p className="mt-2 text-gray-600">
            使用Lighthouse进行全面的性能分析，包括Core Web Vitals指标
          </p>
        </div>

        {/* 测试配置 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">测试配置</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目标URL
                </label>
                <input
                  type="url"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  设备类型
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setConfig({ ...config, device: 'mobile' })}
                    className={`flex items-center px-4 py-2 rounded-md ${
                      config.device === 'mobile' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={isRunning}
                  >
                    <Smartphone className="h-5 w-5 mr-2" />
                    移动端
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, device: 'desktop' })}
                    className={`flex items-center px-4 py-2 rounded-md ${
                      config.device === 'desktop' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={isRunning}
                  >
                    <Monitor className="h-5 w-5 mr-2" />
                    桌面端
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  网络限速
                </label>
                <select
                  value={config.throttling}
                  onChange={(e) => setConfig({ ...config, throttling: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isRunning}
                >
                  <option value="none">无限制</option>
                  <option value="4G">快速 4G</option>
                  <option value="3G">慢速 3G</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  测试次数
                </label>
                <input
                  type="number"
                  value={config.iterations}
                  onChange={(e) => setConfig({ ...config, iterations: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="5"
                  disabled={isRunning}
                />
              </div>
            </div>

            {/* 高级选项 */}
            <div className="mt-6">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showAdvanced ? '隐藏' : '显示'}高级选项 {showAdvanced ? '▼' : '▶'}
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      测试类别
                    </label>
                    <div className="space-y-2">
                      {['performance', 'accessibility', 'best-practices', 'seo', 'pwa'].map(category => (
                        <label key={category} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.categories.includes(category)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConfig({ ...config, categories: [...config.categories, category] });
                              } else {
                                setConfig({ ...config, categories: config.categories.filter(c => c !== category) });
                              }
                            }}
                            className="mr-2"
                            disabled={isRunning}
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {category.replace('-', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      对比URL（可选）
                    </label>
                    <input
                      type="url"
                      value={config.compareUrl || ''}
                      onChange={(e) => setConfig({ ...config, compareUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://competitor.com"
                      disabled={isRunning}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 控制按钮 */}
            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={startTest}
                disabled={isRunning || !config.url}
                className={`px-6 py-2 rounded-md flex items-center ${
                  isRunning || !config.url
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } transition-colors duration-200`}
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    开始测试
                  </>
                )}
              </button>

              {currentResult && (
                <button
                  onClick={exportReport}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 flex items-center"
                >
                  <Download className="h-5 w-5 mr-2" />
                  导出报告
                </button>
              )}
            </div>

            {/* 进度条 */}
            {isRunning && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{currentStep}</span>
                  <span className="text-sm text-gray-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 测试结果 */}
        {currentResult && (
          <>
            {/* Core Web Vitals */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Core Web Vitals</h2>
                <p className="text-sm text-gray-500 mt-1">Google用于评估用户体验的核心指标</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <VitalCard
                    name="Largest Contentful Paint (LCP)"
                    value={currentResult.coreWebVitals.LCP.value}
                    unit="s"
                    rating={currentResult.coreWebVitals.LCP.rating}
                    threshold={{ good: 2.5, poor: 4.0 }}
                  />
                  <VitalCard
                    name="First Input Delay (FID)"
                    value={currentResult.coreWebVitals.FID.value}
                    unit="ms"
                    rating={currentResult.coreWebVitals.FID.rating}
                    threshold={{ good: 100, poor: 300 }}
                  />
                  <VitalCard
                    name="Cumulative Layout Shift (CLS)"
                    value={currentResult.coreWebVitals.CLS.value}
                    unit=""
                    rating={currentResult.coreWebVitals.CLS.rating}
                    threshold={{ good: 0.1, poor: 0.25 }}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <VitalCard
                    name="First Contentful Paint (FCP)"
                    value={currentResult.coreWebVitals.FCP.value}
                    unit="s"
                    rating={currentResult.coreWebVitals.FCP.rating}
                    threshold={{ good: 1.8, poor: 3.0 }}
                  />
                  <VitalCard
                    name="Interaction to Next Paint (INP)"
                    value={currentResult.coreWebVitals.INP.value}
                    unit="ms"
                    rating={currentResult.coreWebVitals.INP.rating}
                    threshold={{ good: 200, poor: 500 }}
                  />
                  <VitalCard
                    name="Time to First Byte (TTFB)"
                    value={currentResult.coreWebVitals.TTFB.value}
                    unit="ms"
                    rating={currentResult.coreWebVitals.TTFB.rating}
                    threshold={{ good: 800, poor: 1800 }}
                  />
                </div>
              </div>
            </div>

            {/* 性能得分 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* 雷达图 */}
              {radarData && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">综合得分</h3>
                  <Radar
                    data={radarData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom' as const
                        }
                      },
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 100
                        }
                      }
                    }}
                  />
                </div>
              )}

              {/* 资源分布 */}
              {resourceData && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">资源分布</h3>
                  <Bar
                    data={resourceData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: '大小 (KB)'
                          }
                        }
                      }
                    }}
                  />
                  <div className="mt-4 text-sm text-gray-600">
                    总资源大小: {(currentResult.resources.totalSize / 1024).toFixed(2)} KB
                  </div>
                </div>
              )}
            </div>

            {/* 优化建议 */}
            {currentResult.opportunities.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">优化建议</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {currentResult.opportunities.map((opportunity, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{opportunity.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            opportunity.impact === 'high' 
                              ? 'bg-red-100 text-red-700'
                              : opportunity.impact === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {opportunity.impact === 'high' ? '高' : opportunity.impact === 'medium' ? '中' : '低'}影响
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{opportunity.description}</p>
                        {opportunity.savings > 0 && (
                          <p className="text-sm text-green-600 mt-1">
                            预计节省: {opportunity.savings.toFixed(2)}秒
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 历史趋势 */}
            {trendData && testHistory.length > 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">性能趋势</h2>
                </div>
                <div className="p-6">
                  <Line
                    data={trendData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom' as const
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedPerformanceTest;
