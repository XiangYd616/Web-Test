import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  Eye,
  RefreshCw,
  Search,
  Trash2,
  XCircle
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './StatusLabel.css';
import './StressTestHistory.css';

// 测试记录接口
interface TestRecord {
  id: string;
  testName: string;
  testType: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'waiting';
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

interface StressTestHistoryProps {
  className?: string;
}

const StressTestHistory: React.FC<StressTestHistoryProps> = ({ className = '' }) => {
  // 认证状态
  const { isAuthenticated, user } = useAuth();

  // 主题钩子
  const { actualTheme } = useTheme();

  // 状态管理
  const [records, setRecords] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'duration' | 'score'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // 加载测试记录
  const loadTestRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test/history', {
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });

      const data = await response.json();
      if (data.success) {
        setRecords(data.data.tests || []);
      } else {
        console.error('加载测试记录失败:', data.message);
      }
    } catch (error) {
      console.error('加载测试记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadTestRecords();
  }, []);

  // 筛选和排序记录
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = records.filter(record => {
      // 搜索过滤
      const searchMatch = !searchTerm ||
        record.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.url.toLowerCase().includes(searchTerm.toLowerCase());

      // 状态过滤
      const statusMatch = statusFilter === 'all' || record.status === statusFilter;

      // 日期过滤
      let dateMatch = true;
      if (dateFilter !== 'all') {
        const recordDate = new Date(record.createdAt);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
          case 'today':
            dateMatch = daysDiff === 0;
            break;
          case 'week':
            dateMatch = daysDiff <= 7;
            break;
          case 'month':
            dateMatch = daysDiff <= 30;
            break;
        }
      }

      return searchMatch && statusMatch && dateMatch;
    });

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'score':
          aValue = a.overallScore || 0;
          bValue = b.overallScore || 0;
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [records, searchTerm, statusFilter, dateFilter, sortBy, sortOrder]);

  // 获取状态样式和内联样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-800/80 border-green-200 dark:border-green-600';
      case 'failed':
        return 'bg-red-100 dark:bg-red-800/80 border-red-200 dark:border-red-600';
      case 'running':
        return 'bg-blue-100 dark:bg-blue-800/80 border-blue-200 dark:border-blue-600 animate-pulse';
      case 'cancelled':
        return 'bg-yellow-100 dark:bg-yellow-800/80 border-yellow-200 dark:border-yellow-600';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-800/80 border-yellow-200 dark:border-yellow-600';
      case 'waiting':
        return 'bg-purple-100 dark:bg-purple-800/80 border-purple-200 dark:border-purple-600';
      case 'timeout':
        return 'bg-orange-100 dark:bg-orange-800/80 border-orange-200 dark:border-orange-600';
      default:
        return 'bg-gray-100 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600';
    }
  };

  // 获取状态文字颜色CSS类（高specificity）
  const getStatusTextColorClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-label-completed';
      case 'failed':
        return 'status-label-failed';
      case 'running':
        return 'status-label-running';
      case 'cancelled':
        return 'status-label-cancelled';
      case 'pending':
        return 'status-label-pending';
      case 'waiting':
        return 'status-label-waiting';
      case 'timeout':
        return 'status-label-timeout';
      default:
        return 'status-label-default';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'running':
        return <Activity className="w-4 h-4 animate-pulse" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'waiting':
        return <Clock className="w-4 h-4 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // 格式化时间
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  // 格式化持续时间
  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      return `${remainingSeconds}秒`;
    }
  };

  // 格式化性能评分
  const formatScore = (score?: number) => {
    if (score === undefined || score === null) return '-';
    return `${score.toFixed(1)}分`;
  };

  // 格式化数值
  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-';
    if (num === 0) return '0';
    return num.toLocaleString();
  };

  // 格式化百分比
  const formatPercentage = (rate?: number) => {
    if (rate === undefined || rate === null) return '0%';
    return `${rate.toFixed(1)}%`;
  };

  // 删除记录
  const deleteRecord = async (recordId: string) => {
    if (!confirm('确定要删除这条测试记录吗？')) return;

    try {
      const response = await fetch(`/api/test/history/${recordId}`, {
        method: 'DELETE',
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });

      const data = await response.json();
      if (data.success) {
        setRecords(prev => prev.filter(r => r.id !== recordId));
        setSelectedRecords(prev => {
          const newSet = new Set(prev);
          newSet.delete(recordId);
          return newSet;
        });
      } else {
        alert('删除失败: ' + data.message);
      }
    } catch (error) {
      console.error('删除记录失败:', error);
      alert('删除失败');
    }
  };

  // 查看详细结果
  const viewDetails = (record: TestRecord) => {
    // 这里可以打开详细结果模态框或跳转到详细页面
    console.log('查看详细结果:', record);
    alert(`查看测试详情: ${record.testName}`);
  };

  // 导出记录
  const exportRecord = (record: TestRecord) => {
    const dataStr = JSON.stringify(record, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-record-${record.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 未登录状态显示
  if (!isAuthenticated) {
    return (
      <div className={`test-records-container bg-gray-800/30 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/40 dark:border-gray-600/30 shadow-lg ${className}`}>
        <div className="p-12 text-center">
          <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl border border-gray-600/40 p-8 max-w-md mx-auto">
            <Activity className="w-16 h-16 mx-auto mb-6 text-blue-400" />
            <h3 className="text-xl font-semibold text-white mb-4">需要登录</h3>
            <p className="text-gray-300 mb-6">
              请登录以查看您的压力测试历史记录
            </p>
            <button
              type="button"
              onClick={() => window.location.href = '/login'}
              className="px-6 py-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 backdrop-blur-sm border border-blue-500/30 hover:border-blue-500/60"
            >
              立即登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`test-records-container bg-gray-800/30 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/40 dark:border-gray-600/30 shadow-lg ${className}`}>
      {/* 头部 */}
      <div className="test-records-header p-6 border-b border-gray-700/40 dark:border-gray-600/30">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-blue-500/30">
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">测试历史</h2>
              <p className="text-sm text-gray-300 mt-1">
                查看和管理压力测试记录
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTestRecords}
              disabled={loading}
              className="test-action-button inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-600/60 border border-gray-600/40 hover:border-gray-500/60 rounded-lg transition-all duration-200 disabled:opacity-50 backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        {/* 筛选和搜索 */}
        <div className="test-filters-panel mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 搜索框 */}
          <div className="test-search-wrapper relative">
            <Search className="test-search-icon absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索测试名称或URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="test-search-input w-full pl-10 pr-4 py-2 text-sm border border-gray-600/40 rounded-lg bg-gray-700/30 backdrop-blur-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            />
          </div>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="test-filter-select px-3 py-2 text-sm border border-gray-600/40 rounded-lg bg-gray-700/30 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
          >
            <option value="all">全部状态</option>
            <option value="completed">已完成</option>
            <option value="failed">已失败</option>
            <option value="running">运行中</option>
            <option value="cancelled">已取消</option>
            <option value="waiting">等待中</option>
            <option value="pending">准备中</option>
          </select>

          {/* 日期筛选 */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="test-filter-select px-3 py-2 text-sm border border-gray-600/40 rounded-lg bg-gray-700/30 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
          >
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="week">最近一周</option>
            <option value="month">最近一月</option>
          </select>

          {/* 排序 */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'duration' | 'score')}
              className="test-filter-select flex-1 px-3 py-2 text-sm border border-gray-600/40 rounded-lg bg-gray-700/30 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            >
              <option value="createdAt">创建时间</option>
              <option value="duration">测试时长</option>
              <option value="score">性能评分</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="test-action-button px-3 py-2 text-sm border border-gray-600/40 rounded-lg bg-gray-700/30 backdrop-blur-sm text-white hover:bg-gray-600/40 hover:border-gray-500/60 transition-all duration-200"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">加载中...</span>
          </div>
        ) : filteredAndSortedRecords.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无测试记录</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                ? '没有找到符合条件的测试记录'
                : '开始您的第一次压力测试吧'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedRecords.map((record) => (
              <div
                key={record.id}
                className="test-record-item bg-gray-800/40 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 dark:border-gray-600/30 rounded-xl hover:bg-gray-800/60 dark:hover:bg-gray-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* 第一行：测试名称和状态 */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                        {record.testName}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusStyle(record.status)} ${getStatusTextColorClass(record.status)}`}
                      >
                        {getStatusIcon(record.status)}
                        {record.status === 'completed' ? '已完成' :
                          record.status === 'failed' ? '已失败' :
                            record.status === 'running' ? '运行中' :
                              record.status === 'cancelled' ? '已取消' :
                                record.status === 'waiting' ? '等待中' :
                                  record.status === 'pending' ? '准备中' : '未知'}
                      </span>
                    </div>

                    {/* 第二行：URL */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 truncate">
                      {record.url}
                    </p>

                    {/* 第三行：关键指标 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">创建时间</span>
                        <p className="font-medium text-gray-900 dark:text-white">{formatTime(record.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">测试时长</span>
                        <p className="font-medium text-gray-900 dark:text-white">{formatDuration(record.duration)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">性能评分</span>
                        <p className="font-medium text-gray-900 dark:text-white">{formatScore(record.overallScore)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">错误率</span>
                        <p className="font-medium text-gray-900 dark:text-white">{formatPercentage(record.errorRate)}</p>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="test-record-actions flex items-center gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => viewDetails(record)}
                      className="test-record-action-button p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 border border-gray-600/30 hover:border-blue-500/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => exportRecord(record)}
                      className="test-record-action-button p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700/50 border border-gray-600/30 hover:border-green-500/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
                      title="导出记录"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRecord(record.id)}
                      className="test-record-action-button p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 border border-gray-600/30 hover:border-red-500/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
                      title="删除记录"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StressTestHistory;
