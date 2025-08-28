
import React from 'react';
import { Calendar, ChevronDown, ChevronRight, Clock, Eye, RefreshCw, Search, Shield, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { SecurityTestResult } from '../../services/unifiedSecurityEngine';

interface SecurityTestHistoryProps {
  onSelectTest?: (result: SecurityTestResult) => void;
  onCompareTests?: (results: SecurityTestResult[]) => void;
}

interface HistoryItem {
  id: string;
  url: string;
  timestamp: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  grade: string;
  duration: number;
  findingsCount: number;
  result: SecurityTestResult;
}

export const SecurityTestHistory = React.forwardRef<
  { saveTestResult: (result: SecurityTestResult) => void },
  SecurityTestHistoryProps
>(({ onSelectTest, onCompareTests }, ref) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'score' | 'url'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // 加载历史记录
  useEffect(() => {
    loadHistory();
  }, []);

  // 过滤和排序历史记录
  useEffect(() => {
    let filtered = history.filter(item => {
      const matchesSearch = item.url.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRisk = filterRisk === 'all' || item.riskLevel === filterRisk;
      return matchesSearch && matchesRisk;
    });

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'url':
          comparison = a.url.localeCompare(b.url);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredHistory(filtered);
  }, [history, searchTerm, filterRisk, sortBy, sortOrder]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      // 从localStorage加载历史记录
      const savedHistory = localStorage.getItem('security_test_history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
      }
    } catch (error) {
      console.error('加载安全测试历史失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTestResult = (result: SecurityTestResult) => {
    const historyItem: HistoryItem = {
      id: result.id,
      url: result.url,
      timestamp: result.timestamp,
      score: result.overallScore,
      riskLevel: result.riskLevel,
      grade: result.grade,
      duration: result.duration,
      findingsCount: result.findings.length,
      result
    };

    const updatedHistory = [historyItem, ...history.slice(0, 49)]; // 保留最近50条记录
    setHistory(updatedHistory);
    localStorage.setItem('security_test_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('security_test_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('security_test_history');
  };

  const toggleItemExpansion = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const toggleTestSelection = (id: string) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTests(newSelected);
  };

  const handleCompareSelected = () => {
    const selectedResults = history
      .filter(item => selectedTests.has(item.id))
      .map(item => item.result);
    onCompareTests?.(selectedResults);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getScoreIcon = (score: number) => {
    return score >= 70 ?
      <TrendingUp className="h-4 w-4 text-green-600" /> :
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  // 暴露保存方法给父组件使用
  React.useImperativeHandle(ref, () => ({
    saveTestResult
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600 dark:text-gray-400">加载历史记录...</span>
      </div>
    );
  }

  return (
    <div className="security-test-history space-y-4">
      {/* 头部控制 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              安全测试历史
            </h2>
            <p className="text-sm text-gray-300 mt-1">
              共 {history.length} 条记录，显示 {filteredHistory.length} 条
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedTests.size > 1 && (
              <button
                type="button"
                onClick={handleCompareSelected}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                对比选中 ({selectedTests.size})
              </button>
            )}
            <button
              type="button"
              onClick={clearHistory}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              清空历史
            </button>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 text-white"
            />
          </div>

          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            aria-label="筛选风险等级"
            title="筛选风险等级"
            className="px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 text-white"
          >
            <option value="all">所有风险等级</option>
            <option value="low">低风险</option>
            <option value="medium">中等风险</option>
            <option value="high">高风险</option>
            <option value="critical">严重风险</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="排序方式"
            title="排序方式"
            className="px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 text-white"
          >
            <option value="timestamp">按时间排序</option>
            <option value="score">按评分排序</option>
            <option value="url">按URL排序</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-600 rounded-lg hover:bg-gray-600/50 bg-gray-700/50 text-white transition-colors"
          >
            {sortOrder === 'asc' ? '升序' : '降序'}
          </button>
        </div>
      </div>

      {/* 历史记录列表 */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300">
              {history.length === 0 ? '暂无安全测试历史记录' : '没有符合条件的记录'}
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
                      onChange={() => toggleTestSelection(item.id)}
                      aria-label={`选择测试记录: ${item.url}`}
                      title={`选择测试记录: ${item.url}`}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <h3 className="font-semibold text-white truncate max-w-md">
                        {item.url}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-300 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {Math.round(item.duration / 1000)}s
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        {getScoreIcon(item.score)}
                        <span className="text-lg font-bold text-white">
                          {item.score}
                        </span>
                        <span className="text-sm text-gray-400">/100</span>
                      </div>
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getRiskColor(item.riskLevel)}`}>
                        {item.riskLevel === 'low' ? '低风险' :
                          item.riskLevel === 'medium' ? '中等风险' :
                            item.riskLevel === 'high' ? '高风险' : '严重风险'}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => onSelectTest?.(item.result)}
                        className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleItemExpansion(item.id)}
                        className="p-2 text-gray-400 hover:bg-gray-700/60 rounded-lg transition-colors"
                      >
                        {expandedItems.has(item.id) ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronRight className="h-4 w-4" />
                        }
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteHistoryItem(item.id)}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                        title="删除记录"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 展开的详细信息 */}
                {expandedItems.has(item.id) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">等级：</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{item.grade}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">发现问题：</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{item.findingsCount} 个</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">高危问题：</span>
                        <span className="font-semibold text-red-600">
                          {item.result.findings.filter(f => f.severity === 'critical' || f.severity === 'high').length} 个
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">修复建议：</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{item.result.recommendations.length} 条</span>
                      </div>
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
