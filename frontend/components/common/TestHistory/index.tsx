/**
 * TestHistory 组件
 * 统一的测试历史记录组件
 * 
 * 功能:
 * - 显示测试历史记录列表
 * - 过滤和搜索
 * - 查看详情
 * - 重新运行测试
 * - 导出数据
 */

import { FileText, RefreshCw, Search, Filter, Download, Trash2, Eye } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';

export interface TestHistoryItem {
  id: string;
  testType: string;
  name?: string;
  url?: string;
  status: 'passed' | 'failed' | 'running' | 'cancelled';
  score?: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  results?: any;
}

export interface TestHistoryProps {
  testType: 'all' | 'stress' | 'security' | 'api' | 'performance' | 'compatibility' | 'seo' | 'accessibility' | 'website' | 'network' | 'ux' | 'database';
  title?: string;
  description?: string;
  onTestSelect?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

const TestHistory: React.FC<TestHistoryProps> = ({
  testType,
  title = '测试历史',
  description = '查看和管理测试记录',
  onTestSelect,
  onTestRerun,
  onTestDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 模拟数据 - 实际应该从 API 获取
  const [tests] = useState<TestHistoryItem[]>([
    {
      id: '1',
      testType: 'performance',
      name: '性能测试 - 首页',
      url: 'https://example.com',
      status: 'passed',
      score: 95,
      startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      endTime: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      duration: 5 * 60 * 1000,
    },
    {
      id: '2',
      testType: 'security',
      name: '安全扫描',
      url: 'https://example.com',
      status: 'passed',
      score: 88,
      startTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      endTime: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      duration: 10 * 60 * 1000,
    },
  ]);

  // 过滤和排序测试记录
  const filteredTests = useMemo(() => {
    let filtered = tests;

    // 按测试类型过滤
    if (testType !== 'all') {
      filtered = filtered.filter(test => test.testType === testType);
    }

    // 按状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(test => test.status === statusFilter);
    }

    // 按搜索词过滤
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(test =>
        test.name?.toLowerCase().includes(search) ||
        test.url?.toLowerCase().includes(search) ||
        test.id.toLowerCase().includes(search)
      );
    }

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          break;
        case 'score':
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tests, testType, statusFilter, searchTerm, sortBy, sortOrder]);

  const handleTestSelect = useCallback((test: TestHistoryItem) => {
    onTestSelect?.(test);
  }, [onTestSelect]);

  const handleTestRerun = useCallback((test: TestHistoryItem) => {
    onTestRerun?.(test);
  }, [onTestRerun]);

  const handleTestDelete = useCallback((testId: string) => {
    if (window.confirm('确定要删除这条测试记录吗？')) {
      onTestDelete?.(testId);
    }
  }, [onTestDelete]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'passed': return '通过';
      case 'failed': return '失败';
      case 'running': return '运行中';
      case 'cancelled': return '已取消';
      default: return '未知';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分`;
    }
    if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    }
    return `${seconds}秒`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="w-4 h-4" />
          导出记录
        </button>
      </div>

      {/* 过滤和搜索栏 */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* 搜索框 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索测试记录..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 状态过滤 */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">全部状态</option>
            <option value="passed">通过</option>
            <option value="failed">失败</option>
            <option value="running">运行中</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>

        {/* 排序 */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split('-');
            setSortBy(by as 'date' | 'score' | 'duration');
            setSortOrder(order as 'asc' | 'desc');
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="date-desc">最新优先</option>
          <option value="date-asc">最旧优先</option>
          <option value="score-desc">分数高到低</option>
          <option value="score-asc">分数低到高</option>
          <option value="duration-desc">耗时长到短</option>
          <option value="duration-asc">耗时短到长</option>
        </select>
      </div>

      {/* 测试记录列表 */}
      <div className="space-y-2">
        {filteredTests.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无测试记录</p>
          </div>
        ) : (
          filteredTests.map(test => (
            <div
              key={test.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {test.name || `测试 #${test.id}`}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(test.status)}`}>
                      {getStatusText(test.status)}
                    </span>
                    {test.score !== undefined && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        得分: <span className="font-semibold">{test.score}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {test.url && <div>URL: {test.url}</div>}
                    <div className="flex items-center gap-4">
                      <span>开始时间: {formatDate(test.startTime)}</span>
                      {test.duration && <span>耗时: {formatDuration(test.duration)}</span>}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestSelect(test)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="查看详情"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleTestRerun(test)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="重新运行"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleTestDelete(test.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {filteredTests.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            共 {filteredTests.length} 条记录
          </div>
          <div className="flex items-center gap-2">
            {/* 分页控件将在后续添加 */}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestHistory;


