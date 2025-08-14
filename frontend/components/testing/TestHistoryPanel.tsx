import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Calendar, Download, Trash2, Eye } from 'lucide-react';
import { historyService } from '../../services/historyService';

interface TestHistoryPanelProps {
  testType: string;
  onTestSelect?: (test: any) => void;
  onTestRerun?: (test: any) => void;
  className?: string;
}

interface TestHistoryItem {
  id: string;
  testName: string;
  url: string;
  status: 'completed' | 'failed' | 'running';
  score?: number;
  duration: number;
  createdAt: string;
  config: any;
  results: any;
}

export const TestHistoryPanel: React.FC<TestHistoryPanelProps> = ({
  testType,
  onTestSelect,
  onTestRerun,
  className = ''
}) => {
  const [history, setHistory] = useState<TestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHistory();
  }, [testType, statusFilter, dateRange]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await historyService.getTestHistory({
        testType,
        status: statusFilter === 'all' ? undefined : statusFilter,
        dateRange,
        search: searchTerm
      });
      setHistory(response.data || []);
    } catch (error) {
      console.error('加载测试历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // 实现防抖搜索
    setTimeout(() => loadHistory(), 300);
  };

  const handleTestSelect = (test: TestHistoryItem) => {
    onTestSelect?.(test);
  };

  const handleTestRerun = (test: TestHistoryItem) => {
    onTestRerun?.(test);
  };

  const handleBatchDelete = async () => {
    if (selectedTests.size === 0) return;
    
    try {
      await historyService.deleteTests(Array.from(selectedTests));
      setSelectedTests(new Set());
      loadHistory();
    } catch (error) {
      console.error('批量删除失败:', error);
    }
  };

  const handleExport = async () => {
    try {
      const data = selectedTests.size > 0 
        ? history.filter(test => selectedTests.has(test.id))
        : history;
      
      await historyService.exportTests(data);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">加载历史记录...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">测试历史</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">({history.length}条记录)</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedTests.size > 0 && (
              <>
                <button
                  onClick={handleExport}
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                  title="导出选中"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                  title="删除选中"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索测试名称或URL..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">所有状态</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="running">运行中</option>
          </select>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="1d">最近1天</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
            <option value="all">全部</option>
          </select>
        </div>
      </div>

      {/* 历史记录列表 */}
      <div className="max-h-96 overflow-y-auto">
        {history.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">暂无测试历史记录</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">运行测试后，历史记录将显示在这里</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.map((test) => (
              <div
                key={test.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedTests.has(test.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedTests);
                        if (e.target.checked) {
                          newSelected.add(test.id);
                        } else {
                          newSelected.delete(test.id);
                        }
                        setSelectedTests(newSelected);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{test.testName}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(test.status)}`}>
                          {test.status === 'completed' ? '已完成' : 
                           test.status === 'failed' ? '失败' : '运行中'}
                        </span>
                        {test.score && (
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {test.score}分
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>{test.url}</span>
                        <span>耗时: {formatDuration(test.duration)}</span>
                        <span>{formatDate(test.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTestSelect(test)}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleTestRerun(test)}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-600 hover:border-blue-700 rounded transition-colors"
                    >
                      重新运行
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

export default TestHistoryPanel;
