import React, { useState } from 'react';
import { Activity, Clock, Zap, Monitor, Smartphone, Play, Square } from 'lucide-react';

interface PerformanceTestConfig {
  url: string;
  device: 'desktop' | 'mobile' | 'tablet';
  connection: 'fast' | 'slow' | 'offline';
  metrics: {
    fcp: boolean; // First Contentful Paint
    lcp: boolean; // Largest Contentful Paint
    fid: boolean; // First Input Delay
    cls: boolean; // Cumulative Layout Shift
    ttfb: boolean; // Time to First Byte
  };
  lighthouse: boolean;
  webVitals: boolean;
}

interface PerformanceTestResult {
  overallScore: number;
  metrics: {
    fcp: number;
    lcp: number;
    fid: number;
    cls: number;
    ttfb: number;
  };
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  webVitals: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
  recommendations: string[];
}

const PerformanceTest: React.FC = () => {
  const [config, setConfig] = useState<PerformanceTestConfig>({
    url: '',
    device: 'desktop',
    connection: 'fast',
    metrics: {
      fcp: true,
      lcp: true,
      fid: true,
      cls: true,
      ttfb: true,
    },
    lighthouse: true,
    webVitals: true,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<PerformanceTestResult | null>(null);

  const handleStartTest = () => {
    if (!config.url) return;
    
    setIsRunning(true);
    // 模拟测试过程
    setTimeout(() => {
      setResults({
        overallScore: 82,
        metrics: {
          fcp: 1.2,
          lcp: 2.1,
          fid: 45,
          cls: 0.08,
          ttfb: 0.6,
        },
        lighthouse: {
          performance: 85,
          accessibility: 92,
          bestPractices: 88,
          seo: 95,
        },
        webVitals: {
          good: 3,
          needsImprovement: 1,
          poor: 1,
        },
        recommendations: [
          '优化图片格式，使用WebP格式',
          '启用Gzip压缩',
          '减少JavaScript包大小',
          '使用CDN加速静态资源',
          '优化关键渲染路径'
        ]
      });
      setIsRunning(false);
    }, 4000);
  };

  const handleStopTest = () => {
    setIsRunning(false);
  };

  const getMetricColor = (metric: string, value: number) => {
    const thresholds: { [key: string]: { good: number; poor: number } } = {
      fcp: { good: 1.8, poor: 3.0 },
      lcp: { good: 2.5, poor: 4.0 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 0.8, poor: 1.8 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'text-gray-400';

    if (value <= threshold.good) return 'text-green-400';
    if (value <= threshold.poor) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMetricUnit = (metric: string) => {
    switch (metric) {
      case 'fcp':
      case 'lcp':
      case 'ttfb':
        return 's';
      case 'fid':
        return 'ms';
      case 'cls':
        return '';
      default:
        return '';
    }
  };

  return (
    <div className="performance-test-container">
      <div className="page-header mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-purple-400" />
          性能测试
        </h2>
        <p className="text-gray-400 mt-2">
          全面评估网站性能指标，优化用户体验
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 测试配置 */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">测试配置</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  目标URL *
                </label>
                <input
                  type="url"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  设备类型
                </label>
                <select
                  value={config.device}
                  onChange={(e) => setConfig({ ...config, device: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="desktop">桌面端</option>
                  <option value="mobile">移动端</option>
                  <option value="tablet">平板端</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  网络条件
                </label>
                <select
                  value={config.connection}
                  onChange={(e) => setConfig({ ...config, connection: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="fast">快速网络</option>
                  <option value="slow">慢速网络</option>
                  <option value="offline">离线模拟</option>
                </select>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">性能指标</h4>
                
                {[
                  { key: 'fcp', label: 'First Contentful Paint' },
                  { key: 'lcp', label: 'Largest Contentful Paint' },
                  { key: 'fid', label: 'First Input Delay' },
                  { key: 'cls', label: 'Cumulative Layout Shift' },
                  { key: 'ttfb', label: 'Time to First Byte' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.metrics[key as keyof typeof config.metrics]}
                      onChange={(e) => setConfig({ 
                        ...config, 
                        metrics: { ...config.metrics, [key]: e.target.checked }
                      })}
                      className="mr-2 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">额外检查</h4>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.lighthouse}
                    onChange={(e) => setConfig({ ...config, lighthouse: e.target.checked })}
                    className="mr-2 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">Lighthouse审计</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.webVitals}
                    onChange={(e) => setConfig({ ...config, webVitals: e.target.checked })}
                    className="mr-2 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">Web Vitals分析</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleStartTest}
                  disabled={!config.url || isRunning}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  开始测试
                </button>
                <button
                  onClick={handleStopTest}
                  disabled={!isRunning}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 测试结果 */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">性能测试结果</h3>
            
            {isRunning ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">正在进行性能测试...</p>
                  <p className="text-sm text-gray-500 mt-2">正在分析页面加载性能</p>
                </div>
              </div>
            ) : results ? (
              <div className="space-y-6">
                {/* 性能总分 */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">{results.overallScore}</div>
                  <div className="text-gray-400">性能评分</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${
                    results.overallScore >= 80 ? 'bg-green-600 text-white' :
                    results.overallScore >= 60 ? 'bg-yellow-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {results.overallScore >= 80 ? '优秀' : results.overallScore >= 60 ? '良好' : '需要优化'}
                  </div>
                </div>

                {/* 核心性能指标 */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-4">核心性能指标</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(results.metrics).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className={`text-2xl font-bold ${getMetricColor(key, value)}`}>
                          {value}{getMetricUnit(key)}
                        </div>
                        <div className="text-xs text-gray-400 uppercase tracking-wide">
                          {key}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lighthouse评分 */}
                {config.lighthouse && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-4">Lighthouse评分</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(results.lighthouse).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="relative w-16 h-16 mx-auto mb-2">
                            <svg className="w-16 h-16 transform -rotate-90">
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                className="text-gray-600"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                strokeDasharray={`${2 * Math.PI * 28}`}
                                strokeDashoffset={`${2 * Math.PI * 28 * (1 - value / 100)}`}
                                className={value >= 80 ? 'text-green-400' : value >= 60 ? 'text-yellow-400' : 'text-red-400'}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm font-bold text-white">{value}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 capitalize">
                            {key === 'bestPractices' ? '最佳实践' : 
                             key === 'performance' ? '性能' :
                             key === 'accessibility' ? '可访问性' : 'SEO'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Web Vitals */}
                {config.webVitals && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-4">Web Vitals分析</h4>
                    <div className="flex justify-center space-x-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{results.webVitals.good}</div>
                        <div className="text-sm text-gray-400">良好</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{results.webVitals.needsImprovement}</div>
                        <div className="text-sm text-gray-400">需要改进</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{results.webVitals.poor}</div>
                        <div className="text-sm text-gray-400">较差</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 优化建议 */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-4">优化建议</h4>
                  <ul className="space-y-2">
                    {results.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                        <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>请配置测试参数并开始性能测试</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTest;
