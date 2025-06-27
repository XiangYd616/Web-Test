import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Play,
  Download,
  Settings
} from 'lucide-react';

interface PerformanceMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  speedIndex: number;
  overallScore: number;
}

interface PerformanceTest {
  id: string;
  url: string;
  timestamp: string;
  metrics: PerformanceMetrics;
  status: 'running' | 'completed' | 'failed';
  device: 'desktop' | 'mobile';
  location: string;
}

const Performance: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTest, setCurrentTest] = useState<PerformanceTest | null>(null);
  const [recentTests, setRecentTests] = useState<PerformanceTest[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedLocation, setSelectedLocation] = useState('北京');

  // 模拟性能测试
  const runPerformanceTest = async () => {
    if (!url) return;

    setIsLoading(true);
    
    // 创建新的测试记录
    const newTest: PerformanceTest = {
      id: Date.now().toString(),
      url,
      timestamp: new Date().toISOString(),
      metrics: {
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0,
        speedIndex: 0,
        overallScore: 0
      },
      status: 'running',
      device: selectedDevice,
      location: selectedLocation
    };

    setCurrentTest(newTest);

    try {
      // 调用真实的性能测试API
      const response = await fetch('/api/test/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          device: selectedDevice,
          location: selectedLocation,
          options: {
            timeout: 30000,
            userAgent: selectedDevice === 'mobile' ?
              'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15' :
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const completedTest: PerformanceTest = {
          ...newTest,
          status: 'completed',
          metrics: {
            lcp: result.data.coreWebVitals?.lcp || result.data.metrics?.loadTime || 0,
            fid: result.data.coreWebVitals?.fid || result.data.metrics?.averageResponseTime || 0,
            cls: parseFloat(result.data.coreWebVitals?.cls) || 0,
            fcp: result.data.coreWebVitals?.fcp || result.data.metrics?.connectionTime || 0,
            ttfb: result.data.coreWebVitals?.ttfb || result.data.metrics?.connectionTime || 0,
            speedIndex: result.data.metrics?.speedIndex || 2000,
            overallScore: result.data.score || 0
          }
        };

        setCurrentTest(completedTest);
        setRecentTests(prev => [completedTest, ...prev.slice(0, 4)]);
      } else {
        throw new Error(result.error || '性能测试失败');
      }
    } catch (error) {
      console.error('Performance test failed:', error);

      // 如果API失败，显示错误状态
      const failedTest: PerformanceTest = {
        ...newTest,
        status: 'completed',
        metrics: {
          lcp: 0,
          fid: 0,
          cls: 0,
          fcp: 0,
          ttfb: 0,
          speedIndex: 0,
          overallScore: 0
        }
      };

      setCurrentTest(failedTest);
      alert(`性能测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取性能评级
  const getPerformanceRating = (score: number) => {
    if (score >= 90) return { label: '优秀', color: 'text-green-600 bg-green-50', icon: CheckCircle };
    if (score >= 70) return { label: '良好', color: 'text-yellow-600 bg-yellow-50', icon: Target };
    return { label: '需要改进', color: 'text-red-600 bg-red-50', icon: AlertTriangle };
  };

  // 获取Core Web Vitals评级
  const getCWVRating = (metric: string, value: number) => {
    switch (metric) {
      case 'lcp':
        if (value <= 2.5) return 'good';
        if (value <= 4.0) return 'needs-improvement';
        return 'poor';
      case 'fid':
        if (value <= 100) return 'good';
        if (value <= 300) return 'needs-improvement';
        return 'poor';
      case 'cls':
        if (value <= 0.1) return 'good';
        if (value <= 0.25) return 'needs-improvement';
        return 'poor';
      default:
        return 'good';
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8 text-blue-400" />
            性能测试
          </h1>
          <p className="text-gray-300">全面分析网站性能，优化用户体验</p>
        </div>
      </div>

      {/* 测试配置 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          测试配置
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              网站URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="device-select" className="block text-sm font-medium text-gray-300 mb-2">
              设备类型
            </label>
            <select
              id="device-select"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value as 'desktop' | 'mobile')}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="选择设备类型"
            >
              <option value="desktop">桌面端</option>
              <option value="mobile">移动端</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="location-select" className="block text-sm font-medium text-gray-300 mb-2">
              测试位置
            </label>
            <select
              id="location-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="选择测试位置"
            >
              <option value="北京">北京</option>
              <option value="上海">上海</option>
              <option value="广州">广州</option>
              <option value="深圳">深圳</option>
            </select>
          </div>
        </div>

        <button
          onClick={runPerformanceTest}
          disabled={!url || isLoading}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          <span>{isLoading ? '测试中...' : '开始性能测试'}</span>
        </button>
      </div>

      {/* 当前测试结果 */}
      {currentTest && (
        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              测试结果
            </h3>
            {currentTest.status === 'completed' && (
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                <Download className="w-4 h-4" />
                <span>导出报告</span>
              </button>
            )}
          </div>

          {currentTest.status === 'running' ? (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-300">正在分析网站性能...</p>
            </div>
          ) : (
            <>
              {/* 总体评分 */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-2xl font-bold mb-4">
                  {Math.round(currentTest.metrics.overallScore)}
                </div>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getPerformanceRating(currentTest.metrics.overallScore).color}`}>
                  {getPerformanceRating(currentTest.metrics.overallScore).label}
                </div>
              </div>

              {/* Core Web Vitals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3 ${getRatingColor(getCWVRating('lcp', currentTest.metrics.lcp))}`}>
                    {getCWVRating('lcp', currentTest.metrics.lcp) === 'good' ? '良好' :
                     getCWVRating('lcp', currentTest.metrics.lcp) === 'needs-improvement' ? '需要改进' : '较差'}
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {currentTest.metrics.lcp.toFixed(1)}s
                  </div>
                  <div className="text-gray-300">
                    <div className="font-medium">LCP</div>
                    <div className="text-sm">最大内容绘制</div>
                  </div>
                </div>

                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3 ${getRatingColor(getCWVRating('fid', currentTest.metrics.fid))}`}>
                    {getCWVRating('fid', currentTest.metrics.fid) === 'good' ? '良好' :
                     getCWVRating('fid', currentTest.metrics.fid) === 'needs-improvement' ? '需要改进' : '较差'}
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {Math.round(currentTest.metrics.fid)}ms
                  </div>
                  <div className="text-gray-300">
                    <div className="font-medium">FID</div>
                    <div className="text-sm">首次输入延迟</div>
                  </div>
                </div>

                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3 ${getRatingColor(getCWVRating('cls', currentTest.metrics.cls))}`}>
                    {getCWVRating('cls', currentTest.metrics.cls) === 'good' ? '良好' :
                     getCWVRating('cls', currentTest.metrics.cls) === 'needs-improvement' ? '需要改进' : '较差'}
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {currentTest.metrics.cls.toFixed(3)}
                  </div>
                  <div className="text-gray-300">
                    <div className="font-medium">CLS</div>
                    <div className="text-sm">累积布局偏移</div>
                  </div>
                </div>
              </div>

              {/* 其他性能指标 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">首次内容绘制</span>
                    <Clock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {currentTest.metrics.fcp.toFixed(1)}s
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">首字节时间</span>
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {Math.round(currentTest.metrics.ttfb)}ms
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">速度指数</span>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {Math.round(currentTest.metrics.speedIndex)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 历史测试记录 */}
      {recentTests.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            最近测试
          </h3>
          
          <div className="space-y-4">
            {recentTests.map((test) => (
              <div key={test.id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{test.url}</div>
                  <div className="text-gray-400 text-sm">
                    {new Date(test.timestamp).toLocaleString()} • {test.device} • {test.location}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white mb-1">
                    {Math.round(test.metrics.overallScore)}
                  </div>
                  <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPerformanceRating(test.metrics.overallScore).color}`}>
                    {getPerformanceRating(test.metrics.overallScore).label}
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

export default Performance;
