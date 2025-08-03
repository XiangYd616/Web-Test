import { AlertCircle, BarChart3, CheckCircle, Clock, Download, Eye, FileText, Globe, Search, Shield, Trash2, XCircle, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import EnhancedTestHistory from '../components/testHistory/EnhancedTestHistory';
import { TestRecord } from '../hooks/useDataStorage';

const TestHistory: React.FC = () => {
  // 使用增强的测试历史组件
  return (
    <div className="test-history-container">
      <div className="test-history-wrapper">
        {/* 页面标题 */}
        <header className="test-history-header">
          <div className="test-history-icon-wrapper">
            <FileText className="test-history-icon" />
          </div>
          <div>
            <h1 className="test-history-title">测试历史</h1>
            <p className="test-history-subtitle">
              查看和管理您的所有测试记录，包括性能、安全、SEO等各类测试结果
            </p>
          </div>
        </header>

        {/* 主要内容 */}
        <main>
          <EnhancedTestHistory />
        </main>
      </div>
    </div>
  );
};

// 保留原有的组件作为备用（兼容性）
const LegacyTestHistory: React.FC = () => {
  const [testHistory, setTestHistory] = useState<TestRecord[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 从后端API加载真实的测试历史数据
  useEffect(() => {
    const loadTestHistory = async () => {
      try {
        setLoading(true);

        // 并行加载不同类型的测试历史
        const [generalResponse, securityResponse] = await Promise.allSettled([
          fetch('/api/test/history'),
          fetch('/api/test/security/history')
        ]);

        const allRecords = [];

        // 处理通用测试历史
        if (generalResponse.status === 'fulfilled' && generalResponse.value.ok) {
          const generalData = await generalResponse.value.json();
          if (generalData.success && Array.isArray(generalData.data)) {
            allRecords.push(...generalData.data);
          }
        }

        // 处理安全测试历史
        if (securityResponse.status === 'fulfilled' && securityResponse.value.ok) {
          const securityData = await securityResponse.value.json();
          if (securityData.success && Array.isArray(securityData.data)) {
            allRecords.push(...securityData.data);
          }
        }

        // 按时间排序
        allRecords.sort((a, b) => new Date(b.createdAt || b.startTime).getTime() - new Date(a.createdAt || a.startTime).getTime());

        setTestHistory(allRecords);

        if (allRecords.length === 0) {
          console.log('No test history found, this is normal for new installations');
        }

      } catch (error) {
        console.error('Error loading test history:', error);
        setTestHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadTestHistory();
  }, []);

  // 过滤和搜索
  useEffect(() => {
    let filtered = testHistory;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter((test: TestRecord) =>
        test.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 类型过滤
    if (filterType !== 'all') {
      filtered = filtered.filter((test: TestRecord) => test.testType === filterType);
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter((test: TestRecord) => test.status === filterStatus);
    }

    // 排序
    filtered.sort((a: TestRecord, b: TestRecord) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'date':
        default:
          aValue = new Date(a.startTime).getTime();
          bValue = new Date(b.startTime).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    setFilteredHistory(filtered);
  }, [testHistory, searchTerm, filterType, filterStatus, sortBy, sortOrder]);

  const getTestTypeIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return <BarChart3 className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      case 'stress':
        return <Zap className="w-4 h-4" />;
      case 'content':
        return <FileText className="w-4 h-4" />;
      case 'website':
        return <Globe className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getTestTypeLabel = (type: string) => {
    const labels = {
      performance: '性能测试',
      security: '安全测试',
      stress: '压力测试',
      content: '内容测试',
      website: '网站测试',
      api: 'API测试'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  const handleViewReport = (test: TestRecord) => {
    if (test.reportPath) {
      // 在实际应用中，这里会打开报告
      alert(`查看报告: ${test.testName}`);
    }
  };

  const handleDownloadReport = (test: TestRecord) => {
    if (test.reportPath) {
      // 在实际应用中，这里会下载报告
      alert(`下载报告: ${test.testName}`);
    }
  };

  const handleDeleteTest = (testId: string) => {
    if (confirm('确定要删除这个测试记录吗？')) {
      setTestHistory(prev => prev.filter(test => test.id !== testId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">加载测试历史...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">测试历史</h1>
          <p className="text-gray-400">查看和管理您的测试记录</p>
        </div>

        {/* 过滤和搜索栏 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索测试名称或URL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 类型过滤 */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="选择测试类型过滤条件"
              title="选择测试类型过滤条件"
            >
              <option value="all">所有类型</option>
              <option value="performance">性能测试</option>
              <option value="security">安全测试</option>
              <option value="stress">压力测试</option>
              <option value="content">内容测试</option>
              <option value="website">网站测试</option>
            </select>

            {/* 状态过滤 */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="选择测试状态过滤条件"
              title="选择测试状态过滤条件"
            >
              <option value="all">所有状态</option>
              <option value="completed">已完成</option>
              <option value="failed">失败</option>
              <option value="cancelled">已取消</option>
            </select>

            {/* 排序 */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by as 'date' | 'score' | 'duration');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="选择排序方式"
              title="选择排序方式"
            >
              <option value="date-desc">最新优先</option>
              <option value="date-asc">最旧优先</option>
              <option value="score-desc">分数高到低</option>
              <option value="score-asc">分数低到高</option>
              <option value="duration-desc">耗时长到短</option>
              <option value="duration-asc">耗时短到长</option>
            </select>
          </div>
        </div>

        {/* 测试记录列表 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">没有找到测试记录</p>
              <p className="text-gray-500 mt-2">尝试调整搜索条件或开始新的测试</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      测试信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      分数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      耗时
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      开始时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredHistory.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getTestTypeIcon(test.testType)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {test.testName}
                            </div>
                            <div className="text-sm text-gray-400">
                              {getTestTypeLabel(test.testType)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {test.url}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(test.status)}
                          <span className="text-sm text-gray-300">
                            {getStatusLabel(test.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${getScoreColor(test.score)}`}>
                          {test.status === 'completed' ? `${test.score}分` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">
                          {formatDuration(test.duration)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">
                          {formatDate(test.startTime)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {test.reportPath && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleViewReport(test)}
                                className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                title="查看报告"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadReport(test)}
                                className="p-1 text-green-400 hover:text-green-300 transition-colors"
                                title="下载报告"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteTest(test.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="删除记录"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 统计信息 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {testHistory.length}
            </div>
            <div className="text-sm text-gray-400">总测试数</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">
              {testHistory.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-400">成功测试</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">
              {testHistory.filter(t => t.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-400">失败测试</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">
              {testHistory.filter(t => t.status === 'completed').length > 0
                ? Math.round(testHistory.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.score, 0) / testHistory.filter(t => t.status === 'completed').length)
                : 0}
            </div>
            <div className="text-sm text-gray-400">平均分数</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestHistory;
