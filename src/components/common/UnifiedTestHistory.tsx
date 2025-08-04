/**
 * 统一的测试历史组件
 * 整合所有重复的测试历史相关组件
 */

import {
  AlertCircle, BarChart3, CheckCircle,
  Download, Eye,
  FileText, Globe,
  RefreshCw,
  Search, Shield,
  Star,
  Trash2,
  Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { EnhancedTestRecord, TestHistoryQuery, TestType } from '../../types/testHistory';
import { getStatusConfig, getStatusText } from '../../utils/testStatusUtils';

export interface UnifiedTestHistoryProps {
  className?: string;
  testType?: TestType; // 如果指定，只显示特定类型的测试
  showStatistics?: boolean;
  showFilters?: boolean;
  showBatchActions?: boolean;
  compact?: boolean;
  onTestSelect?: (test: EnhancedTestRecord) => void;
  onTestCompare?: (tests: EnhancedTestRecord[]) => void;
}

export const UnifiedTestHistory: React.FC<UnifiedTestHistoryProps> = ({
  className = '',
  testType,
  showStatistics = true,
  showFilters = true,
  showBatchActions = true,
  compact = false,
  onTestSelect,
  onTestCompare
}) => {
  // 认证状态
  const { isAuthenticated, user } = useAuth();

  // 状态管理
  const [testHistory, setTestHistory] = useState<EnhancedTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // 查询参数
  const [query, setQuery] = useState<TestHistoryQuery>({
    page: 1,
    limit: compact ? 10 : 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    testType: testType
  });

  // 获取测试历史数据
  const fetchTestHistory = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', query.page.toString());
      params.append('limit', query.limit.toString());
      params.append('sortBy', query.sortBy);
      params.append('sortOrder', query.sortOrder);

      if (query.testType) {
        if (Array.isArray(query.testType)) {
          query.testType.forEach(type => params.append('testType', type));
        } else {
          params.append('testType', query.testType);
        }
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/test/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTestHistory(data.data.tests || []);
        }
      }
    } catch (error) {
      // 静默处理错误，避免控制台污染
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, query, searchQuery, statusFilter]);

  // 初始化数据
  useEffect(() => {
    fetchTestHistory();
  }, [fetchTestHistory]);

  // 获取测试类型图标
  const getTestTypeIcon = (type: TestType) => {
    const iconMap: Record<string, React.ReactElement> = {
      website: <Globe className="w-4 h-4" />,
      performance: <Zap className="w-4 h-4" />,
      security: <Shield className="w-4 h-4" />,
      seo: <BarChart3 className="w-4 h-4" />,
      stress: <AlertCircle className="w-4 h-4" />,
      api: <FileText className="w-4 h-4" />,
      compatibility: <CheckCircle className="w-4 h-4" />,
      ux: <Star className="w-4 h-4" />,
      database: <FileText className="w-4 h-4" />,
      network: <Globe className="w-4 h-4" />
    };
    return iconMap[type] || <FileText className="w-4 h-4" />;
  };

  // 获取状态图标 - 使用统一的状态工具
  const getStatusIcon = (status: string) => {
    const config = getStatusConfig(status);
    const IconComponent = config.icon;
    return <IconComponent className="w-4 h-4" />;
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-300';
      case 'running':
        return 'bg-blue-500/20 text-blue-300';
      case 'failed':
        return 'bg-red-500/20 text-red-300';
      case 'cancelled':
        return 'bg-orange-500/20 text-orange-300';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 格式化持续时间
  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  // 格式化分数
  const formatScore = (score?: number) => {
    if (score === undefined) return '-';
    return `${score}/100`;
  };

  // 处理测试选择
  const handleTestSelect = (testId: string, selected: boolean) => {
    setSelectedTests(prev =>
      selected
        ? [...prev, testId]
        : prev.filter(id => id !== testId)
    );
  };

  // 处理全选
  const handleSelectAll = (selected: boolean) => {
    setSelectedTests(selected ? testHistory.map(test => test.id) : []);
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setQuery(prev => ({ ...prev, page: 1 }));
  };

  // 处理状态过滤
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setQuery(prev => ({ ...prev, page: 1 }));
  };

  // 处理测试查看
  const handleViewTest = (test: EnhancedTestRecord) => {
    if (onTestSelect) {
      onTestSelect(test);
    } else {
      window.open(`/test-result/${test.id}`, '_blank');
    }
  };

  // 处理测试删除
  const handleDeleteTest = async (testId: string) => {
    if (!confirm('确定要删除这个测试记录吗？')) return;

    try {
      const response = await fetch(`/api/test/${testId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        setTestHistory(prev => prev.filter(test => test.id !== testId));
        setSelectedTests(prev => prev.filter(id => id !== testId));
      }
    } catch (error) {
      console.error('删除测试失败:', error);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedTests.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedTests.length} 个测试记录吗？`)) return;

    try {
      const response = await fetch('/api/test/batch-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ testIds: selectedTests })
      });

      if (response.ok) {
        setTestHistory(prev => prev.filter(test => !selectedTests.includes(test.id)));
        setSelectedTests([]);
      }
    } catch (error) {
      console.error('批量删除失败:', error);
    }
  };

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <div className={`unified-test-history ${className}`}>
        <div className="p-12 text-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 max-w-md mx-auto">
            <Shield className="w-16 h-16 mx-auto mb-6 text-gray-500" />
            <h3 className="text-xl font-semibold text-white mb-4">需要登录</h3>
            <p className="text-gray-300 mb-6">
              请登录以查看您的测试历史记录
            </p>
            <button
              type="button"
              onClick={() => window.location.href = '/login'}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              立即登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`unified-test-history ${compact ? 'compact' : ''} ${className}`}>
      {/* 搜索和过滤器 */}
      {showFilters && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索测试名称或URL..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 状态过滤 */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="选择测试状态过滤条件"
              title="选择测试状态过滤条件"
            >
              <option value="all">所有状态</option>
              <option value="completed">已完成</option>
              <option value="running">运行中</option>
              <option value="failed">失败</option>
              <option value="pending">等待中</option>
              <option value="cancelled">已取消</option>
            </select>

            {/* 刷新按钮 */}
            <button
              type="button"
              onClick={fetchTestHistory}
              className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors"
              title="刷新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* 批量操作 */}
          {showBatchActions && selectedTests.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <span className="text-blue-300">
                已选择 {selectedTests.length} 项
              </span>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-3 py-1 bg-red-600/20 text-red-300 rounded hover:bg-red-600/30 transition-colors"
              >
                批量删除
              </button>
              {onTestCompare && selectedTests.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const selectedTestData = testHistory.filter(test => selectedTests.includes(test.id));
                    onTestCompare(selectedTestData);
                  }}
                  className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded hover:bg-blue-600/30 transition-colors"
                >
                  对比测试
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 测试列表 */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-300">加载中...</p>
        </div>
      ) : testHistory.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          <FileText className="w-16 h-16 mx-auto mb-6 text-gray-500" />
          <p className="text-lg">暂无测试历史记录</p>
          {searchQuery && (
            <p className="text-sm mt-2">尝试调整搜索条件</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* 全选控制 */}
          {showBatchActions && (
            <div className="flex items-center gap-4 p-3 bg-gray-800/30 rounded-lg">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTests.length === testHistory.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-700/40 bg-gray-800/40"
                />
                <span className="text-sm text-gray-300">
                  全选 ({testHistory.length} 项)
                </span>
              </label>
            </div>
          )}

          {/* 测试记录列表 */}
          {testHistory.map((test) => (
            <div
              key={test.id}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* 选择框 */}
                {showBatchActions && (
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(test.id)}
                    onChange={(e) => handleTestSelect(test.id, e.target.checked)}
                    className="rounded border-gray-700/40 bg-gray-800/40"
                    aria-label={`选择测试 ${test.testName}`}
                    title={`选择测试 ${test.testName}`}
                  />
                )}

                {/* 测试信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getTestTypeIcon(test.testType)}
                    <h3 className="font-medium text-white truncate">
                      {test.testName}
                    </h3>
                    {getStatusIcon(test.status)}
                    <span className={`text-sm px-2 py-1 rounded ${getStatusStyle(test.status)}`}>
                      {getStatusText(test.status)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-400 space-y-1">
                    <p className="truncate">{test.url}</p>
                    <div className="flex items-center gap-4">
                      <span>{formatDate(test.startTime)}</span>
                      <span>耗时: {formatDuration(test.duration)}</span>
                      {test.overallScore !== undefined && (
                        <span>分数: {formatScore(test.overallScore)}</span>
                      )}
                    </div>
                  </div>

                  {/* 标签 */}
                  {test.tags && test.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      {test.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {test.tags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{test.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewTest(test)}
                    className="p-2 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors"
                    title="查看详情"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {test.reportUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(test.reportUrl, '_blank')}
                      className="p-2 text-gray-400 hover:text-green-400 rounded-lg hover:bg-green-500/10 transition-colors"
                      title="下载报告"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteTest(test.id)}
                    className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                    title="删除"
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
  );
};

export default UnifiedTestHistory;
