import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Settings,
  Share2,
  TrendingUp,
  Users,
  XCircle,
  Zap
} from 'lucide-react';
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
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
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
            onClick={() => navigate('/stress-test')}
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

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/stress-test')}
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
                onClick={shareResult}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="分享结果"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={exportData}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="导出数据"
              >
                <Download className="w-5 h-5" />
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
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
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
                  <p className="text-white font-medium">{formatDuration(record.duration || 0)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">并发用户</span>
                  </div>
                  <p className="text-white font-medium">{record.config?.users || '-'}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-400">总体评分</span>
                  </div>
                  <p className="text-white font-medium">{record.overallScore || '-'}</p>
                </div>
              </div>

              {/* 状态信息 */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">测试状态</h3>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${statusInfo.bg}`}>
                    {statusInfo.icon}
                  </div>
                  <div>
                    <p className={`font-medium ${statusInfo.color}`}>
                      {record.status === 'completed' ? '已完成' :
                       record.status === 'failed' ? '失败' :
                       record.status === 'running' ? '运行中' :
                       record.status === 'cancelled' ? '已取消' : '未知'}
                    </p>
                    {record.errorMessage && (
                      <p className="text-red-400 text-sm mt-1">{record.errorMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">性能指标</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">总请求数</h4>
                  <p className="text-2xl font-bold text-white">{metrics.totalRequests || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">成功请求</h4>
                  <p className="text-2xl font-bold text-green-400">{metrics.successfulRequests || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">失败请求</h4>
                  <p className="text-2xl font-bold text-red-400">{metrics.failedRequests || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">平均响应时间</h4>
                  <p className="text-2xl font-bold text-blue-400">{metrics.averageResponseTime || 0}ms</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">峰值TPS</h4>
                  <p className="text-2xl font-bold text-purple-400">{metrics.peakTPS || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">错误率</h4>
                  <p className="text-2xl font-bold text-yellow-400">{(metrics.errorRate || 0).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">实时数据图表</h3>
              {realTimeData.length > 0 ? (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-sm text-gray-400 mb-4">响应时间趋势</h4>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={realTimeData}>
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="responseTime" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">暂无图表数据</p>
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
