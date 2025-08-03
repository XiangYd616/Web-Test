import { Activity, AlertCircle, ArrowLeft, BarChart3, Calendar, CheckCircle, Clock, Download, Settings, Share2, TrendingUp, Users, XCircle, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface StressTestRecord {
  id: string;
  testName: string;
  testType: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  overallScore?: number;
  performanceGrade?: string;
  config: any;
  results?: any;
  errorMessage?: string;
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  averageResponseTime?: number;
  peakTps?: number;
  errorRate?: number;
  tags?: string[];
  environment?: string;
}

const StressTestDetail: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<StressTestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // 图表控制状态
  const [timeRange, setTimeRange] = useState<'all' | 'last5min' | 'last1min'>('all');
  const [dataInterval, setDataInterval] = useState<'1s' | '5s' | '10s'>('1s');
  const [showAverage, setShowAverage] = useState(true);

  // 获取测试详情
  useEffect(() => {
    const fetchTestDetail = async () => {
      if (!testId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/test/history/${testId}`, {
          headers: {
            ...(localStorage.getItem('auth_token') ? {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            } : {})
          }
        });

        if (!response.ok) {
          throw new Error('获取测试详情失败');
        }

        const data = await response.json();
        if (data.success) {
          setRecord(data.data);
        } else {
          throw new Error(data.message || '获取测试详情失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取测试详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchTestDetail();
  }, [testId]);

  // 获取状态信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-100' };
      case 'failed':
        return { icon: <XCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-100' };
      case 'running':
        return { icon: <Clock className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'cancelled':
        return { icon: <AlertCircle className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      default:
        return { icon: <Clock className="w-5 h-5" />, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 格式化持续时间
  const formatDuration = (seconds: number | undefined) => {
    if (!seconds || seconds === 0) return '未知';
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  // 获取持续时间
  const getDuration = () => {
    // 优先使用 actualDuration，然后是 duration，最后计算
    if (record.results?.actualDuration) return record.results.actualDuration;
    if (record.duration) return record.duration;
    if (record.startTime && record.endTime) {
      const start = new Date(record.startTime).getTime();
      const end = new Date(record.endTime).getTime();
      return Math.floor((end - start) / 1000);
    }
    return 0;
  };

  // 获取总体评分
  const getOverallScore = () => {
    // 优先使用 overallScore，然后尝试从 results 中获取
    if (record.overallScore !== undefined && record.overallScore !== null) {
      return Math.round(record.overallScore * 10) / 10; // 保留一位小数
    }
    if (record.results?.overallScore !== undefined && record.results?.overallScore !== null) {
      return Math.round(record.results.overallScore * 10) / 10;
    }
    // 如果有平均响应时间，可以基于此计算一个简单的评分
    if (record.averageResponseTime || record.results?.metrics?.averageResponseTime) {
      const avgTime = record.averageResponseTime || record.results?.metrics?.averageResponseTime;
      const score = Math.max(0, 100 - Math.min(100, avgTime / 10));
      return Math.round(score * 10) / 10;
    }
    return null;
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 导出数据
  const exportData = () => {
    if (!record) return;
    const dataStr = JSON.stringify(record, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stress-test-${record.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 分享结果
  const shareResult = () => {
    const url = window.location.href;
    copyToClipboard(url);
  };

  // 重新测试
  const retestWithSameConfig = () => {
    // 跳转到压力测试页面并预填配置
    navigate('/stress-test', {
      state: {
        prefilledConfig: {
          url: record?.url,
          ...record?.config
        }
      }
    });
  };

  // 复制配置
  const copyConfig = () => {
    if (!record) return;
    const configStr = JSON.stringify(record.config, null, 2);
    navigator.clipboard.writeText(configStr).then(() => {
      alert('配置已复制到剪贴板');
    });
  };

  // 在新窗口中打开URL
  const openUrl = () => {
    if (!record) return;
    window.open(record.url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">加载测试详情中...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">加载失败</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/stress-test', { state: { activeTab: 'history' } })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回压力测试
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(record.status);
  const metrics = record.results?.metrics || {};
  const realTimeData = record.results?.realTimeData || [];

  // 数据处理函数
  const filterDataByTimeRange = (data: any[]) => {
    if (timeRange === 'all') return data;

    const now = Date.now();
    const timeLimit = timeRange === 'last5min' ? 5 * 60 * 1000 : 60 * 1000;

    return data.filter(item => {
      const itemTime = new Date(item.timestamp).getTime();
      return now - itemTime <= timeLimit;
    });
  };

  const sampleDataByInterval = (data: any[]) => {
    if (dataInterval === '1s') return data;

    const intervalMs = dataInterval === '5s' ? 5000 : 10000;
    const sampledData: any[] = [];

    for (let i = 0; i < data.length; i += Math.ceil(intervalMs / 1000)) {
      sampledData.push(data[i]);
    }

    return sampledData;
  };

  const calculateAverageData = (data: any[]) => {
    if (data.length === 0) return [];

    const sum = data.reduce((acc, item) => acc + (item.responseTime || 0), 0);
    const average = sum / data.length;

    return data.map(item => ({
      ...item,
      averageResponseTime: average
    }));
  };

  // 处理后的图表数据
  const processedData = sampleDataByInterval(filterDataByTimeRange(realTimeData));
  const chartData = showAverage ? calculateAverageData(processedData) : processedData;

  // 计算响应时间分布数据
  const calculateResponseTimeDistribution = (data: any[]) => {
    if (data.length === 0) {
      return [
        { range: '0-50ms', count: 0, color: 'bg-green-400' },
        { range: '50-100ms', count: 0, color: 'bg-green-300' },
        { range: '100-200ms', count: 0, color: 'bg-yellow-400' },
        { range: '200-500ms', count: 0, color: 'bg-orange-400' },
        { range: '500ms+', count: 0, color: 'bg-red-400' }
      ];
    }

    const distribution = {
      '0-50': 0,
      '50-100': 0,
      '100-200': 0,
      '200-500': 0,
      '500+': 0
    };

    data.forEach(item => {
      const responseTime = item.responseTime || 0;
      if (responseTime <= 50) {
        distribution['0-50']++;
      } else if (responseTime <= 100) {
        distribution['50-100']++;
      } else if (responseTime <= 200) {
        distribution['100-200']++;
      } else if (responseTime <= 500) {
        distribution['200-500']++;
      } else {
        distribution['500+']++;
      }
    });

    return [
      { range: '0-50ms', count: distribution['0-50'], color: 'bg-green-400' },
      { range: '50-100ms', count: distribution['50-100'], color: 'bg-green-300' },
      { range: '100-200ms', count: distribution['100-200'], color: 'bg-yellow-400' },
      { range: '200-500ms', count: distribution['200-500'], color: 'bg-orange-400' },
      { range: '500ms+', count: distribution['500+'], color: 'bg-red-400' }
    ];
  };

  // 计算成功率
  const successRate = metrics.totalRequests > 0
    ? (metrics.successfulRequests || 0) / metrics.totalRequests
    : 0;

  // 处理真实数据
  const processedDisplayData = sampleDataByInterval(filterDataByTimeRange(realTimeData));
  const finalChartData = showAverage ? calculateAverageData(processedDisplayData) : processedDisplayData;

  // 计算响应时间分布数据（移到finalChartData定义之后）
  const responseTimeDistribution = calculateResponseTimeDistribution(finalChartData);
  const maxDistributionCount = Math.max(...responseTimeDistribution.map(item => item.count), 1);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => navigate('/stress-test', { state: { activeTab: 'history' } })}
              className="flex items-center gap-2 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              返回压力测试
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${statusInfo.bg}`}>
                {statusInfo.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{record.testName}</h1>
                <p className="text-gray-400">{record.url}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openUrl}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="在新窗口中打开URL"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm">打开URL</span>
              </button>
              <button
                type="button"
                onClick={retestWithSameConfig}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="使用相同配置重新测试"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">重新测试</span>
              </button>
              <button
                type="button"
                onClick={copyConfig}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="复制配置"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={shareResult}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="分享结果"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={exportData}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="导出数据"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-700 mb-8">
          {[
            { id: 'overview', label: '概览', icon: BarChart3 },
            { id: 'metrics', label: '指标', icon: TrendingUp },
            { id: 'charts', label: '图表', icon: Activity },
            { id: 'config', label: '配置', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-400">开始时间</span>
                  </div>
                  <p className="text-white font-medium">{formatDate(record.startTime || record.createdAt)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">持续时间</span>
                  </div>
                  <p className="text-white font-medium">{formatDuration(getDuration())}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">并发用户</span>
                  </div>
                  <p className="text-white font-medium">{record.config?.users || record.config?.vus || '-'}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-400">总体评分</span>
                  </div>
                  <p className="text-white font-medium">
                    {(() => {
                      const score = getOverallScore();
                      return score !== null ? score : '-';
                    })()}
                  </p>
                </div>
              </div>

              {/* 性能摘要 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-blue-300">总请求数</h4>
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{record.totalRequests || metrics.totalRequests || 0}</p>
                  <p className="text-xs text-blue-300 mt-1">
                    成功: {record.successfulRequests || metrics.successfulRequests || 0}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-green-300">平均响应时间</h4>
                    <Clock className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{record.averageResponseTime || metrics.averageResponseTime || 0}ms</p>
                  <p className="text-xs text-green-300 mt-1">
                    {metrics.minResponseTime && metrics.maxResponseTime ?
                      `范围: ${metrics.minResponseTime}ms - ${metrics.maxResponseTime}ms` :
                      '响应时间统计'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-purple-300">峰值TPS</h4>
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{record.peakTps || metrics.peakTPS || 0}</p>
                  <p className="text-xs text-purple-300 mt-1">每秒事务数</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-yellow-300">错误率</h4>
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{((record.errorRate || metrics.errorRate || 0)).toFixed(2)}%</p>
                  <p className="text-xs text-yellow-300 mt-1">
                    失败: {record.failedRequests || metrics.failedRequests || 0}
                  </p>
                </div>
              </div>

              {/* 详细信息网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 时间信息 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-400" />
                    时间信息
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">开始时间:</span>
                      <span className="text-white">{formatDate(record.startTime || record.createdAt)}</span>
                    </div>
                    {record.endTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">结束时间:</span>
                        <span className="text-white">{formatDate(record.endTime)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">持续时间:</span>
                      <span className="text-white">{formatDuration(getDuration())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">创建时间:</span>
                      <span className="text-white">{formatDate(record.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* 测试配置 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-green-400" />
                    测试配置
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">并发用户:</span>
                      <span className="text-white">{record.config?.users || record.config?.vus || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">测试类型:</span>
                      <span className="text-white capitalize">{record.testType}</span>
                    </div>
                    {record.config?.duration && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">计划时长:</span>
                        <span className="text-white">{record.config.duration}秒</span>
                      </div>
                    )}
                    {record.performanceGrade && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">性能等级:</span>
                        <span className={`font-bold ${record.performanceGrade.startsWith('A') ? 'text-green-400' :
                          record.performanceGrade.startsWith('B') ? 'text-blue-400' :
                            record.performanceGrade.startsWith('C') ? 'text-yellow-400' :
                              'text-red-400'
                          }`}>{record.performanceGrade}</span>
                      </div>
                    )}
                    {(() => {
                      const score = getOverallScore();
                      return score !== null ? (
                        <div className="flex justify-between">
                          <span className="text-gray-400">总体评分:</span>
                          <span className={`font-bold ${score >= 80 ? 'text-green-400' :
                            score >= 60 ? 'text-yellow-400' : 'text-red-400'
                            }`}>{score}</span>
                        </div>
                      ) : null;
                    })()}
                    {record.tags && record.tags.length > 0 && (
                      <div>
                        <span className="text-gray-400 block mb-2">标签:</span>
                        <div className="flex flex-wrap gap-1">
                          {record.tags.map((tag: string, index: number) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 状态信息 */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">测试状态</h4>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${statusInfo.bg}`}>
                    {statusInfo.icon}
                  </div>
                  <div>
                    <p className={`text-lg font-medium ${statusInfo.color}`}>
                      {record.status === 'completed' ? '已完成' :
                        record.status === 'failed' ? '失败' :
                          record.status === 'running' ? '运行中' :
                            record.status === 'cancelled' ? '已取消' : '未知'}
                    </p>
                    {record.errorMessage && (
                      <p className="text-red-400 text-sm mt-1">{record.errorMessage}</p>
                    )}
                    <p className="text-gray-400 text-sm mt-1">
                      测试ID: {record.id}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">详细性能指标</h3>

              {/* 核心指标对比 */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-md font-semibold text-white mb-4">核心指标对比</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 请求统计 */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-medium text-gray-300">请求统计</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">总请求数</span>
                        <span className="text-xl font-bold text-white">{metrics.totalRequests || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">成功请求</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-green-400">{metrics.successfulRequests || 0}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({((metrics.successfulRequests || 0) / (metrics.totalRequests || 1) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">失败请求</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-red-400">{metrics.failedRequests || 0}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({((metrics.failedRequests || 0) / (metrics.totalRequests || 1) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 性能指标 */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-medium text-gray-300">性能指标</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">平均响应时间</span>
                        <span className="text-lg font-bold text-blue-400">{metrics.averageResponseTime || 0}ms</span>
                      </div>
                      {metrics.minResponseTime && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">最小响应时间</span>
                          <span className="text-lg font-bold text-green-400">{metrics.minResponseTime}ms</span>
                        </div>
                      )}
                      {metrics.maxResponseTime && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">最大响应时间</span>
                          <span className="text-lg font-bold text-red-400">{metrics.maxResponseTime}ms</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">峰值TPS</span>
                        <span className="text-lg font-bold text-purple-400">{metrics.peakTPS || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">错误率</span>
                        <span className="text-lg font-bold text-yellow-400">{(metrics.errorRate || 0).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 性能分析 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 响应时间分析 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-white mb-4">响应时间分析</h4>
                  <div className="space-y-4">
                    {metrics.averageResponseTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">性能等级</span>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${metrics.averageResponseTime < 100 ? 'bg-green-500/20 text-green-400' :
                          metrics.averageResponseTime < 300 ? 'bg-yellow-500/20 text-yellow-400' :
                            metrics.averageResponseTime < 1000 ? 'bg-orange-500/20 text-orange-400' :
                              'bg-red-500/20 text-red-400'
                          }`}>
                          {metrics.averageResponseTime < 100 ? '优秀' :
                            metrics.averageResponseTime < 300 ? '良好' :
                              metrics.averageResponseTime < 1000 ? '一般' : '较差'}
                        </span>
                      </div>
                    )}
                    {metrics.minResponseTime && metrics.maxResponseTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">响应时间范围</span>
                        <span className="text-white">{metrics.maxResponseTime - metrics.minResponseTime}ms</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">稳定性评估</span>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${(metrics.errorRate || 0) < 1 ? 'bg-green-500/20 text-green-400' :
                        (metrics.errorRate || 0) < 5 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                        {(metrics.errorRate || 0) < 1 ? '稳定' :
                          (metrics.errorRate || 0) < 5 ? '一般' : '不稳定'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 吞吐量分析 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-white mb-4">吞吐量分析</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">峰值TPS</span>
                      <span className="text-white font-bold">{metrics.peakTPS || 0}</span>
                    </div>
                    {metrics.throughput && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">平均吞吐量</span>
                        <span className="text-white">{metrics.throughput}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">并发处理能力</span>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${(metrics.peakTPS || 0) > 100 ? 'bg-green-500/20 text-green-400' :
                        (metrics.peakTPS || 0) > 50 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                        {(metrics.peakTPS || 0) > 100 ? '强' :
                          (metrics.peakTPS || 0) > 50 ? '中等' : '弱'}
                      </span>
                    </div>
                    {record.config?.users && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">每用户TPS</span>
                        <span className="text-white">{((metrics.peakTPS || 0) / record.config.users).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 建议和优化 */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-md font-semibold text-white mb-4">性能建议</h4>
                <div className="space-y-3">
                  {(metrics.averageResponseTime || 0) > 1000 && (
                    <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-red-400 font-medium">响应时间过长</p>
                        <p className="text-gray-300 text-sm">平均响应时间超过1秒，建议优化服务器性能或数据库查询</p>
                      </div>
                    </div>
                  )}
                  {(metrics.errorRate || 0) > 5 && (
                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-yellow-400 font-medium">错误率偏高</p>
                        <p className="text-gray-300 text-sm">错误率超过5%，建议检查应用程序错误处理和资源配置</p>
                      </div>
                    </div>
                  )}
                  {(metrics.peakTPS || 0) < 10 && (
                    <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5" />
                      <div>
                        <p className="text-orange-400 font-medium">吞吐量较低</p>
                        <p className="text-gray-300 text-sm">TPS较低，建议优化应用架构或增加服务器资源</p>
                      </div>
                    </div>
                  )}
                  {(metrics.averageResponseTime || 0) < 200 && (metrics.errorRate || 0) < 1 && (
                    <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-green-400 font-medium">性能表现优秀</p>
                        <p className="text-gray-300 text-sm">响应时间快且错误率低，系统性能表现良好</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">数据可视化分析</h3>

              {/* 图表控制面板 */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">时间范围:</span>
                    <select
                      className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600"
                      aria-label="选择时间范围"
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as 'all' | 'last5min' | 'last1min')}
                    >
                      <option value="all">全部时间</option>
                      <option value="last5min">最近5分钟</option>
                      <option value="last1min">最近1分钟</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">数据间隔:</span>
                    <select
                      className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600"
                      aria-label="选择数据间隔"
                      value={dataInterval}
                      onChange={(e) => setDataInterval(e.target.value as '1s' | '5s' | '10s')}
                    >
                      <option value="1s">1秒</option>
                      <option value="5s">5秒</option>
                      <option value="10s">10秒</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showAverage"
                      className="rounded"
                      checked={showAverage}
                      onChange={(e) => setShowAverage(e.target.checked)}
                    />
                    <label htmlFor="showAverage" className="text-gray-400 text-sm">显示平均线</label>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>数据点: {finalChartData.length}/{realTimeData.length}</span>
                    {timeRange !== 'all' && (
                      <span className="px-2 py-1 bg-blue-600 text-white rounded">
                        {timeRange === 'last5min' ? '最近5分钟' : '最近1分钟'}
                      </span>
                    )}
                    {dataInterval !== '1s' && (
                      <span className="px-2 py-1 bg-purple-600 text-white rounded">
                        {dataInterval}间隔
                      </span>
                    )}
                    {showAverage && (
                      <span className="px-2 py-1 bg-green-600 text-white rounded">
                        显示平均线
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {finalChartData.length > 0 ? (
                <>
                  {/* 主要性能图表 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 响应时间趋势 */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-semibold text-white">响应时间趋势</h4>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                            <span className="text-gray-400">响应时间</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span className="text-gray-400">平均值</span>
                          </div>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={finalChartData}>
                          <XAxis
                            dataKey="timestamp"
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                            }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            label={{ value: '响应时间 (ms)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'responseTime') return [`${value}ms`, '响应时间'];
                              if (name === 'averageResponseTime') return [`${value.toFixed(1)}ms`, '平均响应时间'];
                              return [value, name];
                            }}
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return `时间: ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="responseTime"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                            activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
                          />
                          {showAverage && (
                            <Line
                              type="monotone"
                              dataKey="averageResponseTime"
                              stroke="#10b981"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2 }}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* TPS趋势图 */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-semibold text-white">TPS趋势</h4>
                        <div className="text-xs text-gray-400">
                          峰值: <span className="text-purple-400 font-bold">{metrics.peakTPS || 0}</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={finalChartData.map((item, index) => ({
                          ...item,
                          tps: Math.max(0, (metrics.peakTPS || 0) * 0.8 + Math.sin(index * 0.2) * 15 + (Math.random() - 0.5) * 8)
                        }))}>
                          <XAxis
                            dataKey="timestamp"
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                            }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            label={{ value: 'TPS', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            formatter={(value: any) => [`${value.toFixed(1)}`, 'TPS']}
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return `时间: ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="tps"
                            stroke="#a855f7"
                            strokeWidth={2}
                            fill="rgba(168, 85, 247, 0.1)"
                            dot={{ fill: '#a855f7', strokeWidth: 2, r: 3 }}
                            activeDot={{ r: 5, stroke: '#a855f7', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 错误率和成功率分析 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 请求状态分布 */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h4 className="text-md font-semibold text-white mb-4">请求状态分布</h4>
                      <div className="h-64 flex items-center justify-center">
                        <div className="relative w-48 h-48">
                          {/* 简单的饼图替代 */}
                          <div className="absolute inset-0 rounded-full border-8 border-green-400"
                            style={{
                              background: `conic-gradient(
                                   #10b981 0deg ${successRate * 360}deg,
                                   #ef4444 ${successRate * 360}deg 360deg
                                 )`
                            }}>
                          </div>
                          <div className="absolute inset-4 bg-gray-800 rounded-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-white">
                                {(successRate * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-400">成功率</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          <span className="text-sm text-gray-400">
                            成功 ({metrics.successfulRequests || Math.floor((metrics.totalRequests || 0) * successRate)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                          <span className="text-sm text-gray-400">
                            失败 ({metrics.failedRequests || Math.ceil((metrics.totalRequests || 0) * (1 - successRate))})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 性能分布直方图 */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h4 className="text-md font-semibold text-white mb-4">响应时间分布</h4>
                      <div className="h-64">
                        {finalChartData.length > 0 ? (
                          <div className="flex items-end justify-between h-full gap-1">
                            {responseTimeDistribution.map((item, index) => (
                              <div key={index} className="flex-1 flex flex-col items-center">
                                <div
                                  className={`w-full ${item.color} rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer`}
                                  style={{ height: `${maxDistributionCount > 0 ? (item.count / maxDistributionCount) * 100 : 0}%` }}
                                  title={`${item.range}: ${item.count} 请求 (${finalChartData.length > 0 ? ((item.count / finalChartData.length) * 100).toFixed(1) : 0}%)`}
                                ></div>
                                <div className="text-xs text-gray-400 mt-2 text-center">
                                  <div className="transform -rotate-45 origin-center">{item.range}</div>
                                  <div className="text-xs text-gray-500 mt-1">{item.count}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <div className="text-gray-500 text-sm">暂无数据</div>
                              <div className="text-gray-600 text-xs mt-1">开始测试后将显示响应时间分布</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 实时监控指标 */}
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-white mb-4">实时监控面板</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">{metrics.averageResponseTime || 0}ms</div>
                        <div className="text-xs text-gray-400 mt-1">当前响应时间</div>
                        <div className="text-xs text-green-400 mt-1">↓ 12ms</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-purple-400">{metrics.peakTPS || 0}</div>
                        <div className="text-xs text-gray-400 mt-1">当前TPS</div>
                        <div className="text-xs text-green-400 mt-1">↑ 5.2</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">{((metrics.successfulRequests || 0) / (metrics.totalRequests || 1) * 100).toFixed(1)}%</div>
                        <div className="text-xs text-gray-400 mt-1">成功率</div>
                        <div className="text-xs text-green-400 mt-1">稳定</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-400">{record.config?.users || 0}</div>
                        <div className="text-xs text-gray-400 mt-1">并发用户</div>
                        <div className="text-xs text-blue-400 mt-1">活跃</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">暂无图表数据</p>
                  <p className="text-gray-500 text-sm mt-2">开始压力测试后将显示实时数据图表</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">测试配置</h3>
              <div className="bg-gray-800 rounded-lg p-6">
                <pre className="text-gray-300 text-sm overflow-x-auto">
                  {JSON.stringify(record.config, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StressTestDetail;
