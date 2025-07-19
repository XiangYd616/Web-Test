/**
 * 压力测试历史记录组件
 * 显示用户的压力测试历史和结果对比
 */

import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface StressTestHistoryItem {
  id: string;
  url: string;
  timestamp: string;
  createdAt: string;
  testType: string;
  status: 'success' | 'failed' | 'running' | 'cancelled';
  duration: number;
  config: {
    users: number;
    duration: number;
    testType: string;
    rampUp?: number;
  };
  results?: {
    metrics: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
      throughput: number;
      errorRate: number;
      p95ResponseTime?: number;
      p99ResponseTime?: number;
    };
  };
  score?: number;
}

interface StressTestHistoryProps {
  onSelectTest?: (result: StressTestHistoryItem) => void;
}

export const StressTestHistory = React.forwardRef<
  { saveTestResult: (result: any) => void },
  StressTestHistoryProps
>(({ onSelectTest }, ref) => {
  const [history, setHistory] = useState<StressTestHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<StressTestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'score' | 'url' | 'duration'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  // 加载测试历史
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test/history?type=stress&limit=50', {
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });
      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data.tests)) {
        setHistory(data.data.tests);
      } else if (data.success && Array.isArray(data.data)) {
        // 兼容旧的数据结构
        setHistory(data.data);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('加载压力测试历史失败:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件加载时获取历史记录
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 过滤和排序历史记录
  useEffect(() => {
    let filtered = history.filter(item => {
      const matchesSearch = item.url.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime();
          break;
        case 'score':
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case 'url':
          comparison = a.url.localeCompare(b.url);
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredHistory(filtered);
  }, [history, searchTerm, filterStatus, sortBy, sortOrder]);

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
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTests(newSelected);
  };

  // 删除测试记录
  const deleteTest = async (id: string) => {
    if (!confirm('确定要删除这条测试记录吗？')) return;

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
        setSelectedTests(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (error) {
      console.error('删除测试记录失败:', error);
    }
  };

  // 导出测试数据
  const exportTest = (item: StressTestHistoryItem) => {
    const dataStr = JSON.stringify(item, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stress-test-${item.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-blue-400';
      case 'cancelled': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <TrendingUp className="w-4 h-4" />;
      case 'failed': return <Zap className="w-4 h-4" />;
      case 'running': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'cancelled': return <Clock className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  // 暴露给父组件的方法
  React.useImperativeHandle(ref, () => ({
    saveTestResult: (result: any) => {
      const historyItem: StressTestHistoryItem = {
        id: result.id || Date.now().toString(),
        url: result.url,
        timestamp: result.timestamp || new Date().toISOString(),
        createdAt: result.createdAt || new Date().toISOString(),
        testType: result.testType || 'stress',
        status: result.success !== false ? 'success' : 'failed',
        duration: result.duration || 0,
        config: result.config || {},
        results: result.results || result,
        score: result.score
      };

      setHistory(prev => [historyItem, ...prev.slice(0, 49)]); // 保留最近50条记录
    }
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
        <span className="text-gray-300 text-lg">加载历史记录...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              压力测试历史
            </h3>
            <p className="text-sm text-gray-300 mt-1">
              共 {history.length} 条记录，显示 {filteredHistory.length} 条
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={loadHistory}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </button>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 状态过滤 */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="过滤测试状态"
            title="选择要显示的测试状态"
          >
            <option value="all">所有状态</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
            <option value="running">运行中</option>
            <option value="cancelled">已取消</option>
          </select>

          {/* 排序方式 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="选择排序方式"
            title="选择测试记录的排序方式"
          >
            <option value="timestamp">按时间排序</option>
            <option value="score">按评分排序</option>
            <option value="url">按URL排序</option>
            <option value="duration">按持续时间排序</option>
          </select>

          {/* 排序顺序 */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="选择排序顺序"
            title="选择升序或降序排列"
          >
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </div>
      </div>

      {/* 历史记录列表 */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 text-lg">
              {history.length === 0 ? '暂无压力测试历史记录' : '没有符合条件的记录'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {history.length === 0 ? '完成第一次压力测试后，历史记录将显示在这里' : '尝试调整搜索条件或过滤器'}
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedTests.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      aria-label={`选择测试记录 ${item.url}`}
                      title={`选择或取消选择此测试记录`}
                    />
                    <div className={`flex items-center space-x-2 ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      <span className="font-medium capitalize">{item.status}</span>
                    </div>
                    <span className="text-white font-medium">{item.url}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">
                      {new Date(item.timestamp || item.createdAt).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.id)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {expandedItems.has(item.id) ?
                        <ChevronDown className="w-5 h-5" /> :
                        <ChevronRight className="w-5 h-5" />
                      }
                    </button>
                  </div>
                </div>

                {/* 基本信息 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-400">用户数:</span>
                    <span className="text-white ml-2">{item.config?.users || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">持续时间:</span>
                    <span className="text-white ml-2">{item.config?.duration || item.duration || 'N/A'}s</span>
                  </div>
                  <div>
                    <span className="text-gray-400">测试类型:</span>
                    <span className="text-white ml-2">{item.config?.testType || 'gradual'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">总请求:</span>
                    <span className="text-white ml-2">
                      {item.results?.metrics?.totalRequests || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* 展开的详细信息 */}
                {expandedItems.has(item.id) && item.results?.metrics && (
                  <div className="border-t border-gray-700 pt-4 mt-4">
                    <h4 className="text-white font-medium mb-3">详细指标</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">成功请求:</span>
                        <span className="text-green-400 ml-2">{item.results.metrics.successfulRequests}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">失败请求:</span>
                        <span className="text-red-400 ml-2">{item.results.metrics.failedRequests}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">平均响应时间:</span>
                        <span className="text-white ml-2">{item.results.metrics.averageResponseTime}ms</span>
                      </div>
                      <div>
                        <span className="text-gray-400">吞吐量:</span>
                        <span className="text-white ml-2">{item.results.metrics.throughput} req/s</span>
                      </div>
                      <div>
                        <span className="text-gray-400">错误率:</span>
                        <span className="text-white ml-2">{item.results.metrics.errorRate}%</span>
                      </div>
                      {item.results.metrics.p95ResponseTime && (
                        <div>
                          <span className="text-gray-400">P95响应时间:</span>
                          <span className="text-white ml-2">{item.results.metrics.p95ResponseTime}ms</span>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-gray-700">
                      <button
                        type="button"
                        onClick={() => exportTest(item)}
                        className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        导出
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTest(item.id)}
                        className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

StressTestHistory.displayName = 'StressTestHistory';

export default StressTestHistory;
