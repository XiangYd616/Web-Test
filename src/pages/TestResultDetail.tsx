import { AlertCircle, ArrowLeft, BarChart3, Calendar, CheckCircle, Clock, Copy, Database, Download, FileText, Globe, Info, Settings, Share2, Shield, Star, TrendingUp, XCircle, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EnhancedTestRecord } from '../types/testHistory';

const TestResultDetail: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [testResult, setTestResult] = useState<EnhancedTestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // 获取测试结果详情
  useEffect(() => {
    const fetchTestResult = async () => {
      if (!testId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/test/history/enhanced?testId=${testId}&includeResults=true&includeConfig=true&includeMetadata=true`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('获取测试结果失败');
        }

        const data = await response.json();
        if (data.success && data.data.tests.length > 0) {
          setTestResult(data.data.tests[0]);
        } else {
          throw new Error('测试结果不存在');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取测试结果失败');
      } finally {
        setLoading(false);
      }
    };

    fetchTestResult();
  }, [testId]);

  // 获取测试类型图标
  const getTestTypeIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return <BarChart3 className="w-6 h-6" />;
      case 'security':
        return <Shield className="w-6 h-6" />;
      case 'stress':
        return <Zap className="w-6 h-6" />;
      case 'seo':
        return <TrendingUp className="w-6 h-6" />;
      case 'api':
        return <Database className="w-6 h-6" />;
      case 'website':
        return <Globe className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  // 获取状态图标和颜色
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
        return { icon: <Info className="w-5 h-5" />, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // 格式化持续时间
  const formatDuration = (duration?: number) => {
    if (!duration) return '-';

    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}s`;
    } else {
      return `${(duration / 60000).toFixed(1)}m`;
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 获取分数颜色
  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 下载报告
  const downloadReport = () => {
    if (testResult?.reportUrl) {
      window.open(testResult.reportUrl, '_blank');
    }
  };

  // 分享结果
  const shareResult = () => {
    const url = window.location.href;
    copyToClipboard(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载测试结果中...</p>
        </div>
      </div>
    );
  }

  if (error || !testResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/test-history')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回测试历史
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(testResult.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/test-history')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              返回测试历史
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  {getTestTypeIcon(testResult.testType)}
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {testResult.testName}
                  </h1>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <span className="truncate max-w-md">{testResult.url}</span>
                      <button
                        onClick={() => copyToClipboard(testResult.url)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="复制URL到剪贴板"
                        aria-label="复制URL"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(testResult.startTime)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(testResult.duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.icon}
                      <span className="text-sm font-medium">{testResult.status}</span>
                    </div>

                    {testResult.overallScore !== undefined && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className={`text-lg font-bold ${getScoreColor(testResult.overallScore)}`}>
                          {testResult.overallScore.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {testResult.tags && testResult.tags.length > 0 && (
                      <div className="flex gap-1">
                        {testResult.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={shareResult}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Share2 className="w-4 h-4" />
                  分享
                </button>

                {testResult.reportUrl && (
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    下载报告
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: '概览', icon: <BarChart3 className="w-4 h-4" /> },
                { id: 'results', name: '详细结果', icon: <FileText className="w-4 h-4" /> },
                { id: 'config', name: '配置信息', icon: <Settings className="w-4 h-4" /> },
                { id: 'metadata', name: '元数据', icon: <Info className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* 概览标签页 */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">测试信息</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">测试类型:</span>
                        <span className="font-medium">{testResult.testType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">优先级:</span>
                        <span className="font-medium">{testResult.priority || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">环境:</span>
                        <span className="font-medium">{testResult.environment || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">分类:</span>
                        <span className="font-medium">{testResult.category || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">时间信息</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">开始时间:</span>
                        <span className="font-medium">{formatDate(testResult.startTime)}</span>
                      </div>
                      {testResult.endTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">结束时间:</span>
                          <span className="font-medium">{formatDate(testResult.endTime)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">持续时间:</span>
                        <span className="font-medium">{formatDuration(testResult.duration)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">创建时间:</span>
                        <span className="font-medium">{formatDate(testResult.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">统计信息</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">查看次数:</span>
                        <span className="font-medium">{testResult.viewCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">分享次数:</span>
                        <span className="font-medium">{testResult.shareCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">已收藏:</span>
                        <span className="font-medium">{testResult.bookmarked ? '是' : '否'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {testResult.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">备注</h3>
                    <p className="text-sm text-gray-700">{testResult.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* 其他标签页内容 */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                {testResult.results ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">测试结果详情</h3>
                    <pre className="text-sm text-gray-700 overflow-auto max-h-96 bg-white p-4 rounded border">
                      {JSON.stringify(testResult.results, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无详细结果数据</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-6">
                {testResult.config ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">测试配置</h3>
                    <pre className="text-sm text-gray-700 overflow-auto max-h-96 bg-white p-4 rounded border">
                      {JSON.stringify(testResult.config, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无配置信息</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'metadata' && (
              <div className="space-y-6">
                {testResult.metadata ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">元数据信息</h3>
                    <pre className="text-sm text-gray-700 overflow-auto max-h-96 bg-white p-4 rounded border">
                      {JSON.stringify(testResult.metadata, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无元数据信息</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResultDetail;
