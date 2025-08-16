/**
 * 测试页面专用历史组件
 * 基于压力测试历史的设计，适配所有测试类型
 */

import {BarChart3, Calendar, Eye, MoreHorizontal, RefreshCw, Search, Star} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../contexts/AuthContext';

interface TestRecord {
  id: string;
  testName: string;
  url: string;
  status: 'completed' | 'running' | 'failed' | 'pending' | 'cancelled';
  createdAt: string;
  overallScore?: number;
  duration?: number;
  // 测试类型特定的字段
  [key: string]: any;
}

interface TestPageHistoryProps {
  testType: 'stress' | 'security' | 'api' | 'performance' | 'compatibility' | 'seo' | 'accessibility';
  className?: string;
  onTestSelect?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
}

export const TestPageHistory: React.FC<TestPageHistoryProps> = ({
  testType,
  className = '',
  onTestSelect,
  onTestRerun
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // 状态管理
  const [records, setRecords] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(10);

  // 测试类型配置
  const testTypeConfig = {
    stress: { name: '压力测试', icon: '⚡', color: '#ef4444' },
    security: { name: '安全测试', icon: '🛡️', color: '#f59e0b' },
    api: { name: 'API测试', icon: '🔌', color: '#8b5cf6' },
    performance: { name: '性能测试', icon: '🚀', color: '#3b82f6' },
    compatibility: { name: '兼容性测试', icon: '🌐', color: '#06b6d4' },
    seo: { name: 'SEO测试', icon: '📈', color: '#10b981' },
    accessibility: { name: '可访问性测试', icon: '♿', color: '#6366f1' }
  };

  const config = testTypeConfig[testType];

  // 加载测试记录
  const loadTestRecords = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        testType,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(`/api/test/history?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('获取测试记录失败');
      }

      const data = await response.json();

      if (data.success) {
        setRecords(data.data.tests || []);
        setTotalRecords(data.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('加载测试记录失败:', error);
      setRecords([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, testType, currentPage, pageSize, searchTerm, statusFilter]);

  // 初始加载和依赖变化时重新加载
  useEffect(() => {
    loadTestRecords();
  }, [loadTestRecords]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // 重置到第一页
  };

  // 处理状态筛选
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // 重置到第一页
  };

  // 处理记录选择
  const toggleSelectRecord = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(records.map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  // 查看测试详情
  const handleViewDetails = (record: TestRecord) => {
    onTestSelect?.(record);
    // 导航到详情页面
    navigate(`/test/${testType}/${record.id}`);
  };

  // 重新运行测试
  const handleRerunTest = (record: TestRecord) => {
    onTestRerun?.(record);
    // 可以导航到测试页面并预填配置
    navigate(`/test/${testType}`, {
      state: {
        activeTab: 'test',
        prefilledConfig: {
          url: record.url,
          testName: `${record.test_name} - 重新运行`
        }
      }
    });
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    const styles = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const texts = {
      completed: '已完成',
      running: '运行中',
      failed: '失败',
      pending: '等待中',
      cancelled: '已取消'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (!isAuthenticated) {
    return (
      <div className="test-page-history-empty">
        <p className="text-gray-400">请登录后查看测试历史</p>
      </div>
    );
  }

  return (
    <div className={`test-page-history bg-gray-800/30 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/40 dark:border-gray-600/30 shadow-lg ${className}`}>
      {/* 头部 */}
      <div className="test-records-header p-6 border-b border-gray-700/40 dark:border-gray-600/30">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-blue-500/30">
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span>{config.icon}</span>
                {config.name}历史
              </h2>
              <p className="text-sm text-gray-300 mt-1">
                查看和管理{config.name}记录
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTestRecords}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        {/* 筛选和搜索 */}
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 mt-6 border border-gray-700/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
            {/* 搜索框 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                搜索测试记录
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  placeholder="输入测试名称或URL..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>
            </div>

            {/* 状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                状态筛选
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              >
                <option value="all">全部状态</option>
                <option value="completed">已完成</option>
                <option value="running">运行中</option>
                <option value="failed">失败</option>
                <option value="pending">等待中</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 测试记录列表 */}
      <div className="p-6">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-300 text-lg">加载中...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-6xl mb-4">{config.icon}</div>
            <p className="text-lg">暂无{config.name}历史记录</p>
            <p className="text-sm mt-2">完成测试后，记录将显示在这里</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="test-record-item bg-gray-800/40 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 dark:border-gray-600/30 rounded-xl hover:bg-gray-800/60 dark:hover:bg-gray-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
              >
                <div className="flex items-start gap-4 p-6">
                  {/* 复选框 */}
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={selectedRecords.has(record.id)}
                      onChange={() => toggleSelectRecord(record.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>

                  {/* 测试信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-white truncate">
                          {record.test_name}
                        </h3>
                        <p className="text-sm text-gray-400 truncate mt-1">
                          {record.url}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatTime(record.created_at)}
                          </span>
                          {record.duration && (
                            <span>耗时: {Math.round(record.duration)}秒</span>
                          )}
                          {record.overall_score && (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <Star className="w-4 h-4" />
                              {record.overall_score}分
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 状态标签 */}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(record.status)}`}>
                        {getStatusText(record.status)}
                      </span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(record)}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {record.status === 'completed' && (
                      <button
                        onClick={() => handleRerunTest(record)}
                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                        title="重新运行"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-500/10 rounded-lg transition-colors"
                      title="更多操作"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalRecords > pageSize && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700/40">
            <div className="text-sm text-gray-400">
              显示 {Math.min((currentPage - 1) * pageSize + 1, totalRecords)} - {Math.min(currentPage * pageSize, totalRecords)} 条，共 {totalRecords} 条记录
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-all"
              >
                上一页
              </button>

              <span className="px-3 py-2 text-sm text-gray-300">
                第 {currentPage} 页，共 {Math.ceil(totalRecords / pageSize)} 页
              </span>

              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= Math.ceil(totalRecords / pageSize)}
                className="px-3 py-2 text-sm bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-all"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPageHistory;
