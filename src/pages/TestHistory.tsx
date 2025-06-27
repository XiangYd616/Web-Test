import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Download, 
  Eye, 
  Trash2, 
  Filter,
  Search,
  Calendar,
  BarChart3,
  Globe,
  Shield,
  Zap,
  FileText
} from 'lucide-react';

interface TestRecord {
  id: string;
  testName: string;
  testType: 'performance' | 'content' | 'security' | 'api' | 'stress' | 'website';
  url: string;
  status: 'completed' | 'failed' | 'cancelled';
  score: number;
  duration: number;
  startTime: string;
  endTime: string;
  reportPath?: string;
}

const TestHistory: React.FC = () => {
  const [testHistory, setTestHistory] = useState<TestRecord[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 模拟测试历史数据
  useEffect(() => {
    const mockData: TestRecord[] = [
      {
        id: '1',
        testName: '百度首页性能测试',
        testType: 'performance',
        url: 'https://www.baidu.com',
        status: 'completed',
        score: 85,
        duration: 45,
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-15T10:30:45Z',
        reportPath: '/reports/test-1.pdf'
      },
      {
        id: '2',
        testName: '淘宝安全检测',
        testType: 'security',
        url: 'https://www.taobao.com',
        status: 'completed',
        score: 92,
        duration: 120,
        startTime: '2024-01-15T09:15:00Z',
        endTime: '2024-01-15T09:17:00Z',
        reportPath: '/reports/test-2.pdf'
      },
      {
        id: '3',
        testName: '京东压力测试',
        testType: 'stress',
        url: 'https://www.jd.com',
        status: 'failed',
        score: 0,
        duration: 30,
        startTime: '2024-01-14T16:20:00Z',
        endTime: '2024-01-14T16:20:30Z'
      },
      {
        id: '4',
        testName: '微博内容检测',
        testType: 'content',
        url: 'https://weibo.com',
        status: 'completed',
        score: 78,
        duration: 90,
        startTime: '2024-01-14T14:10:00Z',
        endTime: '2024-01-14T14:11:30Z',
        reportPath: '/reports/test-4.pdf'
      },
      {
        id: '5',
        testName: '知乎网站综合测试',
        testType: 'website',
        url: 'https://www.zhihu.com',
        status: 'completed',
        score: 88,
        duration: 180,
        startTime: '2024-01-13T11:00:00Z',
        endTime: '2024-01-13T11:03:00Z',
        reportPath: '/reports/test-5.pdf'
      }
    ];

    setTimeout(() => {
      setTestHistory(mockData);
      setFilteredHistory(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  // 过滤和搜索
  useEffect(() => {
    let filtered = testHistory;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(test => 
        test.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 类型过滤
    if (filterType !== 'all') {
      filtered = filtered.filter(test => test.testType === filterType);
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter(test => test.status === filterStatus);
    }

    // 排序
    filtered.sort((a, b) => {
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
