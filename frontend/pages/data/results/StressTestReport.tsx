import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { ArrowLeft, Download, Share2, BarChart3, Clock, Gauge, TrendingUp, AlertTriangle, CheckCircle, XCircle, Info, Calendar, Users } from 'lucide-react';

interface StressTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  throughput: number;
  errorRate: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  concurrentUsers: number;
  testDuration: number;
  dataTransferred: number;
}

interface StressTestResult {
  id: string;
  url: string;
  timestamp: string;
  duration: number;
  status: 'completed' | 'failed' | 'running';
  metrics: StressTestMetrics;
  overallScore: number;
  testConfig: {
    concurrentUsers: number;
    duration: number;
    rampUpTime: number;
    testType: string;
  };
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  }>;
}

const StressTestReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<StressTestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchTestResult = async () => {
      try {
        setLoading(true);

        // 模拟API调用 - 在实际应用中这里应该调用真实的API
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 模拟测试结果数据
        const mockResult: StressTestResult = {
          id: id || '1',
          url: 'https://example.com',
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          duration: 180000, // 3分钟
          status: 'completed',
          metrics: {
            totalRequests: 15420,
            successfulRequests: 15175,
            failedRequests: 245,
            averageResponseTime: 245,
            minResponseTime: 89,
            maxResponseTime: 1250,
            requestsPerSecond: 85.7,
            throughput: 2.1,
            errorRate: 1.59,
            p95ResponseTime: 450,
            p99ResponseTime: 680,
            concurrentUsers: 100,
            testDuration: 180,
            dataTransferred: 125.6
          },
          overallScore: 85,
          testConfig: {
            concurrentUsers: 100,
            duration: 180,
            rampUpTime: 30,
            testType: 'load'
          },
          recommendations: [
            {
              category: 'performance',
              priority: 'high',
              title: '优化数据库查询',
              description: '检测到部分数据库查询响应时间较长，建议优化索引和查询语句',
              impact: '可提升响应时间 20-30%'
            },
            {
              category: 'caching',
              priority: 'medium',
              title: '启用CDN缓存',
              description: '静态资源未使用CDN缓存，建议配置CDN以提升加载速度',
              impact: '可减少服务器负载 40%'
            },
            {
              category: 'infrastructure',
              priority: 'medium',
              title: '增加服务器资源',
              description: '在高并发情况下CPU使用率较高，建议增加服务器资源',
              impact: '可支持更高并发量'
            }
          ]
        };

        setResult(mockResult);
      } catch (err) {
        setError('加载测试报告失败');
        console.error('Failed to fetch test result:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTestResult();
    }
  }, [id]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/20 border-green-500/30';
    if (score >= 70) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  const handleExport = (format: 'pdf' | 'html' | 'json') => {
    // 实现导出功能
    console.log(`Exporting report as ${format}`);
    alert(`导出${format.toUpperCase()}报告功能开发中...`);
  };

  const handleShare = () => {
    // 实现分享功能
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('报告链接已复制到剪贴板');
    });
  };

  if (loading) {
    
        return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">加载测试报告中...</p>
        </div>
      </div>
    );
      }

  if (error || !result) {
    
        return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">加载失败</h2>
          <p className="text-gray-400 mb-4">{error || '测试报告不存在'
      }</p>
          <button
            onClick={() => navigate('/stress-test')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回压力测试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 报告头部 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <button
                  onClick={() => navigate('/stress-test')}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="返回压力测试页面"
                  title="返回压力测试页面"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-2 ${getScoreBgColor(result.overallScore)} ${getScoreColor(result.overallScore)}`}>
                  {getScoreGrade(result.overallScore)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">压力测试报告</h1>
                  <p className="text-lg text-gray-300 break-all">{result.url}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(result.timestamp).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(result.duration)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{result.testConfig.concurrentUsers} 并发用户</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleShare}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
              >
                <Share2 className="w-4 h-4" />
                <span>分享</span>
              </button>
              <div className="relative group">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>导出报告</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 first:rounded-t-lg"
                  >
                    导出为 PDF
                  </button>
                  <button
                    onClick={() => handleExport('html')}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700"
                  >
                    导出为 HTML
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 last:rounded-b-lg"
                  >
                    导出为 JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 总体评分 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 text-center">
            <div className={`text-4xl font-bold mb-2 ${getScoreColor(result.overallScore)}`}>
              {result.overallScore}
            </div>
            <div className="text-gray-400">总体评分</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">
              {result.metrics.averageResponseTime}ms
            </div>
            <div className="text-gray-400">平均响应时间</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">
              {result.metrics.requestsPerSecond.toFixed(1)}
            </div>
            <div className="text-gray-400">请求/秒</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 text-center">
            <div className="text-4xl font-bold text-yellow-400 mb-2">
              {result.metrics.errorRate.toFixed(2)}%
            </div>
            <div className="text-gray-400">错误率</div>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 mb-8">
          <div className="border-b border-gray-700/50">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: '概览', icon: BarChart3 },
                { id: 'metrics', name: '详细指标', icon: Gauge },
                { id: 'recommendations', name: '优化建议', icon: TrendingUp }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* 标签页内容 */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* 核心指标 */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">核心性能指标</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">{result.metrics.totalRequests.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">总请求数</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">{result.metrics.successfulRequests.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">成功请求</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-400">{result.metrics.failedRequests.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">失败请求</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">{formatBytes(result.metrics.dataTransferred * 1024 * 1024)}</div>
                      <div className="text-sm text-gray-400">数据传输</div>
                    </div>
                  </div>
                </div>

                {/* 响应时间分析 */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">响应时间分析</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">最小响应时间</span>
                        <span className="text-green-400 font-semibold">{result.metrics.minResponseTime}ms</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">平均响应时间</span>
                        <span className="text-blue-400 font-semibold">{result.metrics.averageResponseTime}ms</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">最大响应时间</span>
                        <span className="text-red-400 font-semibold">{result.metrics.maxResponseTime}ms</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 测试配置 */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">测试配置</h3>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm">并发用户数</div>
                        <div className="text-white font-semibold">{result.testConfig.concurrentUsers}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">测试时长</div>
                        <div className="text-white font-semibold">{formatDuration(result.testConfig.duration * 1000)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">预热时间</div>
                        <div className="text-white font-semibold">{result.testConfig.rampUpTime}秒</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">测试类型</div>
                        <div className="text-white font-semibold">负载测试</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'metrics' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">详细性能指标</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-300">请求统计</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-400">总请求数</span>
                        <span className="text-white font-semibold">{result.metrics.totalRequests.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-400">成功请求</span>
                        <span className="text-green-400 font-semibold">{result.metrics.successfulRequests.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-400">失败请求</span>
                        <span className="text-red-400 font-semibold">{result.metrics.failedRequests.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-400">请求/秒</span>
                        <span className="text-blue-400 font-semibold">{result.metrics.requestsPerSecond.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-300">响应时间</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-400">平均响应时间</span>
                        <span className="text-white font-semibold">{result.metrics.averageResponseTime}ms</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-400">最小响应时间</span>
                        <span className="text-green-400 font-semibold">{result.metrics.minResponseTime}ms</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-400">最大响应时间</span>
                        <span className="text-red-400 font-semibold">{result.metrics.maxResponseTime}ms</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-400">95% 响应时间</span>
                        <span className="text-yellow-400 font-semibold">{result.metrics.p95ResponseTime}ms</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-400">99% 响应时间</span>
                        <span className="text-orange-400 font-semibold">{result.metrics.p99ResponseTime}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">优化建议</h3>
                <div className="space-y-4">
                  {result.recommendations.map((rec, index) => (
                    <div key={index} className="bg-gray-700/50 rounded-lg p-4 border-l-4 border-blue-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                              rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {rec.priority === 'high' ? '高优先级' : rec.priority === 'medium' ? '中优先级' : '低优先级'}
                            </span>
                            <span className="text-xs text-gray-400 bg-gray-600/50 px-2 py-1 rounded">
                              {rec.category}
                            </span>
                          </div>
                          <h4 className="text-white font-medium mb-2">{rec.title}</h4>
                          <p className="text-gray-300 text-sm mb-2">{rec.description}</p>
                          <p className="text-blue-400 text-sm font-medium">预期效果: {rec.impact}</p>
                        </div>
                        <div className="ml-4">
                          {rec.priority === 'high' ? (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          ) : rec.priority === 'medium' ? (
                            <Info className="w-5 h-5 text-yellow-400" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StressTestReport;
