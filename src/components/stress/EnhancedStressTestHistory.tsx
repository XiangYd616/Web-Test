import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Grid,
  List,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
  Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { debugApiResponse, debugTimeDisplay } from '../../utils/debugTimeDisplay';

interface TestHistoryItem {
  id: string;
  url: string;
  status: 'completed' | 'failed' | 'running' | 'cancelled';
  timestamp?: string;
  createdAt?: string;
  startTime?: string;
  endTime?: string;
  savedAt?: string;
  completedAt?: string;
  duration?: number;
  config?: {
    users?: number;
    duration?: number;
    testType?: string;
    method?: string;
  };
  results?: {
    metrics?: {
      totalRequests?: number;
      successfulRequests?: number;
      failedRequests?: number;
      averageResponseTime?: number;
      throughput?: number;
      requestsPerSecond?: number;
      rps?: number;
      errorRate?: number;
      p95ResponseTime?: number;
      p99ResponseTime?: number;
    };
  };
}

interface EnhancedStressTestHistoryProps {
  className?: string;
}

const EnhancedStressTestHistory: React.FC<EnhancedStressTestHistoryProps> = ({ className = '' }) => {
  // 状态管理
  const [history, setHistory] = useState<TestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'duration' | 'throughput' | 'errorRate'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 加载测试历史
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test/history?type=stress&limit=100', {
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });
      const data = await response.json();

      // 使用调试工具分析 API 响应
      debugApiResponse(data);

      if (data.success && data.data && Array.isArray(data.data.tests)) {
        console.log('✅ 找到测试数据数组:', data.data.tests.length, '条记录');

        // 处理数据格式，确保兼容性
        const processedTests = data.data.tests.map((test: any) => {
          const processed = {
            ...test,
            // 确保时间字段存在 - 优先使用后端返回的字段名
            timestamp: test.timestamp || test.createdAt || test.created_at || test.startTime || test.start_time,
            createdAt: test.createdAt || test.created_at || test.timestamp || test.startTime || test.start_time,
            startTime: test.startTime || test.start_time || test.timestamp || test.createdAt || test.created_at,
            savedAt: test.savedAt || test.createdAt || test.created_at || test.timestamp,
            completedAt: test.completedAt || test.endTime || test.end_time,
            // 确保结果字段存在
            results: test.results || {
              metrics: test.metrics || {}
            }
          };

          console.log('🔧 数据处理调试 - ID:', test.id);
          console.log('  - 原始数据时间字段:', {
            timestamp: test.timestamp,
            createdAt: test.createdAt,
            created_at: test.created_at,
            startTime: test.startTime,
            start_time: test.start_time,
            endTime: test.endTime,
            end_time: test.end_time
          });
          console.log('  - 处理后时间字段:', {
            timestamp: processed.timestamp,
            createdAt: processed.createdAt,
            startTime: processed.startTime,
            savedAt: processed.savedAt,
            completedAt: processed.completedAt
          });

          // 调试每个测试项的时间字段
          debugTimeDisplay(processed, processed.id);

          return processed;
        });

        setHistory(processedTests);
      } else if (data.success && Array.isArray(data.data)) {
        console.log('✅ 直接数组格式:', data.data.length, '条记录');
        setHistory(data.data);
      } else {
        console.warn('⚠️ 无有效数据或数据格式错误:', data);
        setHistory([]);
      }
    } catch (error) {
      console.error('加载压力测试历史失败:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 过滤和排序逻辑
  const filteredAndSortedHistory = useMemo(() => {
    let filtered = history.filter(item => {
      const matchesSearch = item.url?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp || a.createdAt || 0).getTime() -
            new Date(b.timestamp || b.createdAt || 0).getTime();
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
        case 'throughput':
          comparison = (a.results?.metrics?.throughput || 0) - (b.results?.metrics?.throughput || 0);
          break;
        case 'errorRate':
          comparison = (a.results?.metrics?.errorRate || 0) - (b.results?.metrics?.errorRate || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [history, searchTerm, filterStatus, sortBy, sortOrder]);

  // 分页逻辑
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedHistory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedHistory, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedHistory.length / itemsPerPage);

  // 格式化时间
  const formatTime = (timestamp?: string) => {
    if (!timestamp) {
      console.warn('formatTime: 时间戳为空');
      return 'N/A';
    }

    // 验证时间戳格式
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn('formatTime: 无效的时间戳格式:', timestamp);
      return '无效时间';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // 如果时间差异过大（超过1年），可能是数据问题
    if (Math.abs(diffDays) > 365) {
      console.warn('formatTime: 时间差异过大:', { timestamp, diffDays });
      return date.toLocaleDateString('zh-CN');
    }

    // 未来时间处理
    if (diffMs < 0) {
      const futureMins = Math.abs(diffMins);
      if (futureMins < 60) return `${futureMins}分钟后`;
      const futureHours = Math.abs(diffHours);
      if (futureHours < 24) return `${futureHours}小时后`;
      return date.toLocaleDateString('zh-CN');
    }

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'running':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // 切换展开状态
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // 切换选择状态
  const toggleSelected = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedItems.size === paginatedHistory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedHistory.map(item => item.id)));
    }
  };

  // 导出单个测试
  const exportTest = (item: TestHistoryItem) => {
    const data = {
      url: item.url,
      timestamp: item.timestamp || item.createdAt,
      config: item.config,
      results: item.results
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stress-test-${item.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 批量导出
  const exportSelected = () => {
    const selectedData = paginatedHistory
      .filter(item => selectedItems.has(item.id))
      .map(item => ({
        url: item.url,
        timestamp: item.timestamp || item.createdAt,
        config: item.config,
        results: item.results
      }));

    const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stress-tests-batch-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 删除测试
  const deleteTest = async (id: string) => {
    if (!confirm('确定要删除这个测试记录吗？')) return;

    try {
      const response = await fetch(`/api/test/history/${id}`, {
        method: 'DELETE',
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });

      if (response.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (error) {
      console.error('删除测试记录失败:', error);
    }
  };

  // 批量删除
  const deleteSelected = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedItems.size} 个测试记录吗？`)) return;

    try {
      await Promise.all(
        Array.from(selectedItems).map(id =>
          fetch(`/api/test/history/${id}`, {
            method: 'DELETE',
            headers: {
              ...(localStorage.getItem('auth_token') ? {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              } : {})
            }
          })
        )
      );

      setHistory(prev => prev.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
    } catch (error) {
      console.error('批量删除测试记录失败:', error);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制面板 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center">
              <BarChart3 className="w-6 h-6 mr-3 text-blue-500" />
              压力测试历史
            </h3>
            <p className="text-sm text-gray-300 mt-1 flex items-center gap-4">
              <span>共 {history.length} 条记录</span>
              <span>显示 {filteredAndSortedHistory.length} 条</span>
              {selectedItems.size > 0 && (
                <span className="text-blue-400">已选择 {selectedItems.size} 条</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 视图切换 */}
            <div className="flex items-center bg-gray-700/50 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            {/* 批量操作 */}
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportSelected}
                  className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出选中
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除选中
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={loadHistory}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </button>

            {/* 调试按钮 - 仅在开发环境显示 */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    // 生成测试数据
                    import('../../utils/generateTestData').then(({ quickGenerateTestData }) => {
                      const testData = quickGenerateTestData({
                        count: 10,
                        timeRange: 'week',
                        includeRunning: true,
                        includeFailed: true
                      });
                      console.log('🧪 生成测试数据:', testData);

                      // 模拟 API 响应格式
                      const mockApiResponse = {
                        success: true,
                        data: {
                          tests: testData,
                          pagination: {
                            page: 1,
                            limit: 10,
                            total: testData.length,
                            totalPages: Math.ceil(testData.length / 10)
                          }
                        }
                      };

                      // 使用调试工具分析
                      debugApiResponse(mockApiResponse);

                      // 直接设置到历史记录中进行测试
                      setHistory(testData as any);
                    });
                  }}
                  className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  🧪 生成测试数据
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    console.log('🔍 直接测试 API 请求...');
                    try {
                      const response = await fetch('/api/test/history?type=stress&limit=5', {
                        headers: {
                          ...(localStorage.getItem('auth_token') ? {
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                          } : {})
                        }
                      });
                      const data = await response.json();
                      console.log('📡 API 响应状态:', response.status);
                      console.log('📡 API 响应数据:', data);
                      debugApiResponse(data);
                    } catch (error) {
                      console.error('❌ API 请求失败:', error);
                    }
                  }}
                  className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                >
                  🔍 测试API
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    console.log('🔍 调试原始数据库数据...');
                    try {
                      const response = await fetch('/api/test/debug-history', {
                        headers: {
                          ...(localStorage.getItem('auth_token') ? {
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                          } : {})
                        }
                      });
                      const data = await response.json();
                      console.log('🗃️ 原始数据库数据:', data);

                      if (data.success && data.data) {
                        console.log('📊 原始记录:', data.data.rawRecords);
                        console.log('🔧 格式化记录:', data.data.formattedRecords);

                        // 分析时间字段
                        data.data.rawRecords.forEach((record: any, index: number) => {
                          console.group(`📝 记录 ${index + 1}: ${record.test_name}`);
                          console.log('原始时间字段:', {
                            created_at: record.created_at,
                            start_time: record.start_time,
                            end_time: record.end_time,
                            updated_at: record.updated_at
                          });

                          const formatted = data.data.formattedRecords[index];
                          console.log('格式化时间字段:', {
                            timestamp: formatted.timestamp,
                            createdAt: formatted.createdAt,
                            startTime: formatted.startTime,
                            savedAt: formatted.savedAt
                          });
                          console.groupEnd();
                        });
                      }
                    } catch (error) {
                      console.error('❌ 调试请求失败:', error);
                    }
                  }}
                  className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  🗃️ 调试数据库
                </button>
              </>
            )}
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 搜索框 */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索URL或测试名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 状态过滤 */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="过滤测试状态"
            title="选择要显示的测试状态"
            className="px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有状态</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="running">运行中</option>
            <option value="cancelled">已取消</option>
          </select>

          {/* 排序方式 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="选择排序方式"
            title="选择排序依据"
            className="px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="timestamp">按时间排序</option>
            <option value="duration">按持续时间</option>
            <option value="throughput">按吞吐量</option>
            <option value="errorRate">按错误率</option>
          </select>

          {/* 排序顺序 */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? '切换为降序排列' : '切换为升序排列'}
            aria-label={sortOrder === 'asc' ? '当前升序，点击切换为降序' : '当前降序，点击切换为升序'}
            className="flex items-center justify-center px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white hover:bg-gray-600/50 transition-colors"
          >
            {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 历史记录列表 */}
      {filteredAndSortedHistory.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-300 mb-2">
            {history.length === 0 ? '暂无压力测试历史记录' : '没有符合条件的记录'}
          </h3>
          <p className="text-gray-500">
            {history.length === 0 ? '完成第一次压力测试后，历史记录将显示在这里' : '尝试调整搜索条件或过滤器'}
          </p>
        </div>
      ) : (
        <>
          {/* 批量操作栏 */}
          {paginatedHistory.length > 0 && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === paginatedHistory.length && paginatedHistory.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                    全选当前页
                  </label>
                  {selectedItems.size > 0 && (
                    <span className="text-sm text-blue-400">
                      已选择 {selectedItems.size} 项
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>第 {currentPage} 页，共 {totalPages} 页</span>
                  <span>|</span>
                  <span>共 {filteredAndSortedHistory.length} 条记录</span>
                </div>
              </div>
            </div>
          )}

          {/* 测试记录列表 */}
          <div className={`space-y-4 ${viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}`}>
            {paginatedHistory.map((item) => (
              <TestHistoryCard
                key={item.id}
                item={item}
                isExpanded={expandedItems.has(item.id)}
                isSelected={selectedItems.has(item.id)}
                onToggleExpanded={() => toggleExpanded(item.id)}
                onToggleSelected={() => toggleSelected(item.id)}
                onExport={() => exportTest(item)}
                onDelete={() => deleteTest(item.id)}
                formatTime={formatTime}
                getStatusStyle={getStatusStyle}
                getStatusIcon={getStatusIcon}
                viewMode={viewMode}
              />
            ))}
          </div>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    首页
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg ${currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    末页
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// 测试历史卡片组件
interface TestHistoryCardProps {
  item: TestHistoryItem;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpanded: () => void;
  onToggleSelected: () => void;
  onExport: () => void;
  onDelete: () => void;
  formatTime: (timestamp?: string) => string;
  getStatusStyle: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  viewMode: 'grid' | 'list';
}

const TestHistoryCard: React.FC<TestHistoryCardProps> = ({
  item,
  isExpanded,
  isSelected,
  onToggleExpanded,
  onToggleSelected,
  onExport,
  onDelete,
  formatTime,
  getStatusStyle,
  getStatusIcon,
  viewMode
}) => {
  const metrics = item.results?.metrics;
  const config = item.config;

  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 transition-all duration-200 hover:border-gray-600/50 ${isSelected ? 'ring-2 ring-blue-500/50' : ''
      }`}>
      <div className="p-6">
        {/* 头部信息 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* 选择框 */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelected}
              aria-label={`选择测试记录 ${item.url}`}
              title={`选择测试记录 ${item.url}`}
              className="mt-1 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
            />

            <div className="flex-1 min-w-0">
              {/* 状态和URL */}
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusStyle(item.status)}`}>
                  {getStatusIcon(item.status)}
                  <span className="capitalize">
                    {item.status === 'completed' ? '已完成' :
                      item.status === 'failed' ? '失败' :
                        item.status === 'running' ? '运行中' : '已取消'}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {(() => {
                    // 尝试多个时间字段，包括原始字段名
                    const itemAny = item as any;
                    const timeValue = item.timestamp || item.createdAt || item.startTime || item.savedAt ||
                      itemAny.created_at || itemAny.start_time || itemAny.updated_at;

                    console.log('🕐 时间字段调试 - ID:', item.id);
                    console.log('  - timestamp:', item.timestamp);
                    console.log('  - createdAt:', item.createdAt);
                    console.log('  - startTime:', item.startTime);
                    console.log('  - savedAt:', item.savedAt);
                    console.log('  - created_at:', itemAny.created_at);
                    console.log('  - start_time:', itemAny.start_time);
                    console.log('  - updated_at:', itemAny.updated_at);
                    console.log('  - 选择的时间:', timeValue);

                    if (timeValue) {
                      const formatted = formatTime(timeValue);
                      console.log('  - 格式化结果:', formatted);
                      return formatted;
                    } else {
                      console.log('  - ❌ 没有找到有效的时间字段');
                      return '无时间信息';
                    }
                  })()}
                </span>
              </div>

              {/* URL */}
              <div className="mb-3">
                <h4 className="text-white font-medium text-lg truncate" title={item.url}>
                  {item.url}
                </h4>
              </div>

              {/* 关键指标 - 网格布局 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-400">并发用户</span>
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {config?.users || 'N/A'}
                  </div>
                </div>

                <div className="bg-gray-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-gray-400">持续时间</span>
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {config?.duration || item.duration || 'N/A'}s
                  </div>
                </div>

                <div className="bg-gray-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-gray-400">总请求</span>
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {metrics?.totalRequests || 'N/A'}
                  </div>
                </div>

                <div className="bg-gray-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-400">吞吐量</span>
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {(() => {
                      // 尝试多种可能的吞吐量字段
                      const throughput = metrics?.throughput ||
                        metrics?.requestsPerSecond ||
                        metrics?.rps ||
                        (metrics?.totalRequests && config?.duration ?
                          Math.round(metrics.totalRequests / config.duration) : null);
                      return throughput ? `${throughput} req/s` : 'N/A';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 ml-4">
            <button
              type="button"
              onClick={onToggleExpanded}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
              title={isExpanded ? '收起详情' : '展开详情'}
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>

            <div className="relative group">
              <button
                type="button"
                title="更多操作"
                aria-label="显示更多操作选项"
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {/* 下拉菜单 */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={onExport}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    导出数据
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(item.url)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    复制URL
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-600/20 hover:text-red-300 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除记录
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 展开的详细信息 */}
        {isExpanded && metrics && (
          <div className="border-t border-gray-700/50 pt-4 mt-4">
            <h5 className="text-white font-medium mb-4 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-blue-400" />
              详细性能指标
            </h5>

            {/* 详细指标网格 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="text-xs text-green-400 mb-1">成功请求</div>
                <div className="text-lg font-semibold text-green-400">
                  {metrics.successfulRequests || 0}
                </div>
                <div className="text-xs text-gray-500">
                  {metrics.totalRequests ?
                    `${((metrics.successfulRequests || 0) / metrics.totalRequests * 100).toFixed(1)}%` :
                    'N/A'
                  }
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="text-xs text-red-400 mb-1">失败请求</div>
                <div className="text-lg font-semibold text-red-400">
                  {metrics.failedRequests || 0}
                </div>
                <div className="text-xs text-gray-500">
                  错误率: {metrics.errorRate || 0}%
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="text-xs text-blue-400 mb-1">平均响应时间</div>
                <div className="text-lg font-semibold text-blue-400">
                  {metrics.averageResponseTime || 0}ms
                </div>
              </div>

              {metrics.p95ResponseTime && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                  <div className="text-xs text-purple-400 mb-1">P95响应时间</div>
                  <div className="text-lg font-semibold text-purple-400">
                    {metrics.p95ResponseTime}ms
                  </div>
                </div>
              )}

              {metrics.p99ResponseTime && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                  <div className="text-xs text-orange-400 mb-1">P99响应时间</div>
                  <div className="text-lg font-semibold text-orange-400">
                    {metrics.p99ResponseTime}ms
                  </div>
                </div>
              )}
            </div>

            {/* 测试配置信息 */}
            <div className="bg-gray-700/20 rounded-lg p-4">
              <h6 className="text-sm font-medium text-gray-300 mb-3">测试配置</h6>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">测试类型:</span>
                  <span className="text-white ml-2">{config?.testType || 'gradual'}</span>
                </div>
                <div>
                  <span className="text-gray-400">请求方法:</span>
                  <span className="text-white ml-2">{config?.method || 'GET'}</span>
                </div>
                <div>
                  <span className="text-gray-400">开始时间:</span>
                  <span className="text-white ml-2">
                    {(() => {
                      const startTime = item.startTime || item.timestamp || item.createdAt;
                      return startTime ? new Date(startTime).toLocaleString('zh-CN') : 'N/A';
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">结束时间:</span>
                  <span className="text-white ml-2">
                    {(() => {
                      const endTime = item.endTime || item.completedAt;
                      if (endTime) {
                        return new Date(endTime).toLocaleString('zh-CN');
                      }
                      // 如果有开始时间和持续时间，计算结束时间
                      const startTime = item.startTime || item.timestamp || item.createdAt;
                      const duration = config?.duration || item.duration;
                      if (startTime && duration) {
                        const calculatedEndTime = new Date(new Date(startTime).getTime() + duration * 1000);
                        return calculatedEndTime.toLocaleString('zh-CN');
                      }
                      return 'N/A';
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedStressTestHistory;
