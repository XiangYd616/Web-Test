import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Download,
  MoreHorizontal,
  RefreshCw,
  Archive,
  Trash2,
  Tag,
  Eye,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Star,
  TrendingUp,
  Users,
  Database,
  Shield,
  Zap,
  Globe,
  FileText
} from 'lucide-react';
import { 
  EnhancedTestRecord, 
  TestHistoryQuery, 
  TestHistoryResponse,
  TestType,
  TestStatus,
  TestPriority,
  TestEnvironment,
  TestHistoryStatistics
} from '../../types/testHistory';

interface EnhancedTestHistoryProps {
  className?: string;
}

const EnhancedTestHistory: React.FC<EnhancedTestHistoryProps> = ({ className = '' }) => {
  // 状态管理
  const [testHistory, setTestHistory] = useState<EnhancedTestRecord[]>([]);
  const [statistics, setStatistics] = useState<TestHistoryStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showBatchActions, setShowBatchActions] = useState(false);
  
  // 查询参数
  const [query, setQuery] = useState<TestHistoryQuery>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // 分页信息
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // 过滤器选项
  const [filterOptions, setFilterOptions] = useState({
    availableTypes: [] as TestType[],
    availableStatuses: [] as TestStatus[],
    availableTags: [] as string[],
    availableCategories: [] as string[],
    dateRange: { earliest: '', latest: '' },
    scoreRange: { min: 0, max: 100 }
  });

  // 获取测试历史数据
  const fetchTestHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/test/history/enhanced?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('获取测试历史失败');
      }

      const data: TestHistoryResponse = await response.json();
      
      if (data.success) {
        setTestHistory(data.data.tests);
        setPagination(data.data.pagination);
        if (data.data.filters) {
          setFilterOptions(data.data.filters);
        }
      } else {
        throw new Error(data.message || '获取测试历史失败');
      }
    } catch (error) {
      console.error('获取测试历史失败:', error);
      // 这里可以添加错误提示
    } finally {
      setLoading(false);
    }
  }, [query]);

  // 获取统计信息
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch('/api/test/history/statistics?timeRange=30', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatistics(data.data);
        }
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  // 初始化数据
  useEffect(() => {
    fetchTestHistory();
    fetchStatistics();
  }, [fetchTestHistory, fetchStatistics]);

  // 处理搜索
  const handleSearch = (searchTerm: string) => {
    setQuery(prev => ({
      ...prev,
      search: searchTerm,
      page: 1
    }));
  };

  // 处理过滤
  const handleFilter = (filterKey: string, filterValue: any) => {
    setQuery(prev => ({
      ...prev,
      [filterKey]: filterValue,
      page: 1
    }));
  };

  // 处理排序
  const handleSort = (sortBy: string) => {
    setQuery(prev => ({
      ...prev,
      sortBy: sortBy as any,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc',
      page: 1
    }));
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setQuery(prev => ({ ...prev, page }));
  };

  // 处理测试选择
  const handleTestSelect = (testId: string, selected: boolean) => {
    if (selected) {
      setSelectedTests(prev => [...prev, testId]);
    } else {
      setSelectedTests(prev => prev.filter(id => id !== testId));
    }
  };

  // 处理全选
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTests(testHistory.map(test => test.id));
    } else {
      setSelectedTests([]);
    }
  };

  // 批量操作
  const handleBatchAction = async (action: string, options?: any) => {
    if (selectedTests.length === 0) return;

    try {
      const response = await fetch('/api/test/history/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          testIds: selectedTests,
          options
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 刷新数据
          fetchTestHistory();
          setSelectedTests([]);
          setShowBatchActions(false);
        }
      }
    } catch (error) {
      console.error('批量操作失败:', error);
    }
  };

  // 获取测试类型图标
  const getTestTypeIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return <BarChart3 className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      case 'stress':
        return <Zap className="w-4 h-4" />;
      case 'seo':
        return <TrendingUp className="w-4 h-4" />;
      case 'api':
        return <Database className="w-4 h-4" />;
      case 'website':
        return <Globe className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
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

  // 格式化分数
  const formatScore = (score?: number) => {
    if (score === undefined || score === null) return '-';
    return `${score.toFixed(1)}`;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`enhanced-test-history ${className}`}>
      {/* 统计概览 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总测试数</p>
                <p className="text-2xl font-bold">{statistics.overview.totalTests}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">成功率</p>
                <p className="text-2xl font-bold text-green-600">
                  {statistics.overview.successRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">平均分数</p>
                <p className="text-2xl font-bold text-blue-600">
                  {statistics.overview.averageScore.toFixed(1)}
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">平均耗时</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatDuration(statistics.overview.averageDuration)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* 搜索框 */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索测试名称、URL..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={query.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                过滤器
              </button>
              
              <button
                onClick={() => fetchTestHistory()}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
              
              {selectedTests.length > 0 && (
                <button
                  onClick={() => setShowBatchActions(!showBatchActions)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  批量操作 ({selectedTests.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 高级过滤器 */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* 测试类型过滤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  测试类型
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={query.testType || ''}
                  onChange={(e) => handleFilter('testType', e.target.value || undefined)}
                >
                  <option value="">全部类型</option>
                  {filterOptions.availableTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* 状态过滤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  状态
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={query.status || ''}
                  onChange={(e) => handleFilter('status', e.target.value || undefined)}
                >
                  <option value="">全部状态</option>
                  {filterOptions.availableStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* 日期范围 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始日期
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={query.dateFrom || ''}
                  onChange={(e) => handleFilter('dateFrom', e.target.value || undefined)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束日期
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={query.dateTo || ''}
                  onChange={(e) => handleFilter('dateTo', e.target.value || undefined)}
                />
              </div>

              {/* 分数范围 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最低分数
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={query.minScore || ''}
                  onChange={(e) => handleFilter('minScore', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
            </div>
          </div>
        )}

        {/* 批量操作面板 */}
        {showBatchActions && selectedTests.length > 0 && (
          <div className="p-4 bg-blue-50 border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => handleBatchAction('delete')}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              
              <button
                onClick={() => handleBatchAction('archive')}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Archive className="w-4 h-4" />
                归档
              </button>
              
              <button
                onClick={() => {
                  const tags = prompt('请输入标签（用逗号分隔）:');
                  if (tags) {
                    handleBatchAction('tag', { tags: tags.split(',').map(t => t.trim()) });
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Tag className="w-4 h-4" />
                添加标签
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 测试历史列表 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        ) : testHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无测试历史记录</p>
          </div>
        ) : (
          <>
            {/* 表格头部 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedTests.length === testHistory.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  已选择 {selectedTests.length} / {testHistory.length} 项
                </span>
              </div>
            </div>

            {/* 测试记录列表 */}
            <div className="divide-y divide-gray-200">
              {testHistory.map((test) => (
                <div key={test.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedTests.includes(test.id)}
                      onChange={(e) => handleTestSelect(test.id, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {getTestTypeIcon(test.testType)}
                        <h3 className="font-medium text-gray-900 truncate">
                          {test.testName}
                        </h3>
                        {getStatusIcon(test.status)}
                        <span className="text-sm text-gray-500">
                          {test.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="truncate">{test.url}</span>
                        <span>{formatDate(test.startTime)}</span>
                        <span>耗时: {formatDuration(test.duration)}</span>
                        {test.overallScore !== undefined && (
                          <span>分数: {formatScore(test.overallScore)}</span>
                        )}
                      </div>
                      
                      {test.tags && test.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {test.tags.map((tag, index) => (
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
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          // 查看详情逻辑
                          window.open(`/test-result/${test.id}`, '_blank');
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {test.reportUrl && (
                        <button
                          onClick={() => window.open(test.reportUrl, '_blank')}
                          className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                          title="下载报告"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分页 */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    显示 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 
                    / 共 {pagination.total} 条记录
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      上一页
                    </button>
                    
                    <span className="px-3 py-2 text-sm text-gray-600">
                      第 {pagination.page} / {pagination.totalPages} 页
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedTestHistory;
