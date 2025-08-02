import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  RefreshCw,
  Search,
  Trash2,
  XCircle
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './StatusLabel.css';
import StressTestDetailModal from './StressTestDetailModal';
import './StressTestHistory.css';

// 测试记录接口
interface TestRecord {
  id: string;
  testName: string;
  testType: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
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
  // 开发环境下显示组件测试
  if (process.env.NODE_ENV === 'development') {
    if (window.location.search.includes('test-card')) {
      const { CardTest } = require('../ui/CardTest');
      return <CardTest />;
    }
    if (window.location.search.includes('test-modal')) {
      const { ModalTest } = require('../ui/ModalTest');
      return <ModalTest />;
    }
    if (window.location.search.includes('test-input')) {
      const { InputTest } = require('../ui/InputTest');
      return <InputTest />;
    }
    if (window.location.search.includes('test-badge')) {
      const { BadgeTest } = require('../ui/BadgeTest');
      return <BadgeTest />;
    }
    if (window.location.search.includes('test-all')) {
      const { ComponentLibraryTest } = require('../ui/ComponentLibraryTest');
      return <ComponentLibraryTest />;
    }
    if (window.location.search.includes('test-nav')) {
      const { TestNavigation } = require('../ui/TestNavigation');
      return <TestNavigation />;
    }
  }

  // 路由导航
  const navigate = useNavigate();

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

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // 详情模态框状态
  const [selectedRecord, setSelectedRecord] = useState<TestRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // API接口参数类型
  interface LoadTestRecordsParams {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    dateFilter?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }

  // 加载测试记录（支持分页和筛选）
  const loadTestRecords = async (params: LoadTestRecordsParams = {}) => {
    try {
      setLoading(true);

      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      if (params.dateFilter && params.dateFilter !== 'all') queryParams.append('dateFilter', params.dateFilter);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await fetch(`/api/test/history?${queryParams.toString()}`, {
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });

      const data = await response.json();
      if (data.success) {
        const { tests = [], pagination = {} } = data.data;
        const { total = 0, page = 1, pageSize: returnedPageSize = 10 } = pagination;
        setRecords(tests);
        setTotalRecords(total);
        setCurrentPage(page);
        setPageSize(returnedPageSize);
      } else {
        console.error('加载测试记录失败:', data.message);
        setRecords([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error('加载测试记录失败:', error);
      setRecords([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadTestRecords({
      page: currentPage,
      pageSize: pageSize,
      search: searchTerm,
      status: statusFilter,
      dateFilter: dateFilter,
      sortBy: sortBy,
      sortOrder: sortOrder
    });
  }, []);

  // 当筛选条件改变时重新加载数据
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTestRecords({
        page: 1, // 重置到第一页
        pageSize: pageSize,
        search: searchTerm,
        status: statusFilter,
        dateFilter: dateFilter,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
    }, 300); // 防抖延迟

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, dateFilter, sortBy, sortOrder, pageSize]);

  // 当页码改变时重新加载数据
  useEffect(() => {
    if (currentPage > 1) { // 避免初始加载时重复调用
      loadTestRecords({
        page: currentPage,
        pageSize: pageSize,
        search: searchTerm,
        status: statusFilter,
        dateFilter: dateFilter,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
    }
  }, [currentPage]);

  // 分页信息
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

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
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // 格式化时间
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);

    // 始终显示完整的日期和时间
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化持续时间
  const formatDuration = (record: TestRecord) => {
    // 使用 duration，如果没有则计算时间差
    let seconds = record.duration;

    if (!seconds && record.startTime && record.endTime) {
      const start = new Date(record.startTime).getTime();
      const end = new Date(record.endTime).getTime();
      seconds = Math.floor((end - start) / 1000);
    }

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
  const formatScore = (record: TestRecord) => {
    // 优先使用 overallScore，如果为0或null，尝试从results中计算
    let score = record.overallScore;

    if (!score && record.results?.metrics) {
      const metrics = record.results.metrics;
      // 基于错误率和响应时间计算简单评分
      const errorRate = metrics.errorRate || 0;
      const avgResponseTime = metrics.averageResponseTime || 0;

      if (errorRate === 0 && avgResponseTime > 0) {
        // 响应时间越低分数越高，错误率为0时基础分数较高
        score = Math.max(60, Math.min(100, 100 - (avgResponseTime / 10)));
      } else if (errorRate > 0) {
        score = Math.max(0, 100 - (errorRate * 10) - (avgResponseTime / 10));
      }
    }

    if (score === undefined || score === null || score === 0) return '-';
    return `${score.toFixed(1)}分`;
  };

  // 格式化数值
  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-';
    if (num === 0) return '0';
    return num.toLocaleString();
  };

  // 格式化百分比
  const formatPercentage = (record: TestRecord) => {
    // 优先使用顶层的 errorRate，然后从 results.metrics 中获取
    let rate = record.errorRate;

    if ((rate === undefined || rate === null || rate === 0) && record.results?.metrics) {
      rate = record.results.metrics.errorRate;
    }

    if (rate === undefined || rate === null) return '0%';
    return `${rate.toFixed(1)}%`;
  };

  // 删除记录
  const deleteRecord = async (recordId: string) => {
    // 找到要删除的记录信息
    const recordToDelete = records.find(r => r.id === recordId);
    const recordName = recordToDelete ? recordToDelete.testName : '测试记录';

    if (!confirm(`确定要删除"${recordName}"吗？\n\n此操作无法撤销，删除后将无法恢复该测试记录的所有数据。`)) {
      return;
    }

    try {
      console.log('🗑️ 开始删除测试记录:', recordId);

      const response = await fetch(`/api/test/history/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('请求过于频繁，请稍后再试');
        } else if (response.status === 404) {
          throw new Error('测试记录不存在或已被删除');
        } else if (response.status === 403) {
          throw new Error('没有权限删除此记录');
        } else {
          throw new Error(`删除失败 (${response.status})`);
        }
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ 测试记录删除成功:', recordId);

        // 从本地状态中移除记录
        setRecords(prev => prev.filter(r => r.id !== recordId));
        setSelectedRecords(prev => {
          const newSet = new Set(prev);
          newSet.delete(recordId);
          return newSet;
        });

        // 更新总记录数
        setTotalRecords(prev => Math.max(0, prev - 1));

        // 显示成功消息
        alert(`✅ "${recordName}" 已成功删除`);

        // 如果当前页没有记录了，且不是第一页，则跳转到上一页
        if (records.length === 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }

      } else {
        throw new Error(data.message || '删除失败');
      }

    } catch (error) {
      console.error('❌ 删除记录失败:', error);
      const errorMessage = error instanceof Error ? error.message : '删除失败，请稍后重试';
      alert(`❌ 删除失败: ${errorMessage}`);
    }
  };

  // 批量删除记录
  const batchDeleteRecords = async () => {
    if (selectedRecords.size === 0) {
      alert('请先选择要删除的记录');
      return;
    }

    const recordsToDelete = records.filter(r => selectedRecords.has(r.id));
    const recordNames = recordsToDelete.map(r => r.testName).join('、');

    if (!confirm(`确定要删除以下 ${selectedRecords.size} 条测试记录吗？\n\n${recordNames}\n\n此操作无法撤销，删除后将无法恢复这些测试记录的所有数据。`)) {
      return;
    }

    try {
      console.log('🗑️ 开始批量删除测试记录:', Array.from(selectedRecords));

      const deletePromises = Array.from(selectedRecords).map(async (recordId) => {
        const response = await fetch(`/api/test/history/${recordId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') ? {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            } : {})
          }
        });

        if (!response.ok) {
          throw new Error(`删除记录 ${recordId} 失败: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(`删除记录 ${recordId} 失败: ${data.message}`);
        }

        return recordId;
      });

      const deletedIds = await Promise.all(deletePromises);

      console.log('✅ 批量删除成功:', deletedIds);

      // 从本地状态中移除记录
      setRecords(prev => prev.filter(r => !selectedRecords.has(r.id)));
      setTotalRecords(prev => Math.max(0, prev - selectedRecords.size));
      setSelectedRecords(new Set());

      alert(`✅ 成功删除 ${deletedIds.length} 条记录`);

      // 如果当前页没有记录了，且不是第一页，则跳转到上一页
      const remainingRecords = records.filter(r => !selectedRecords.has(r.id));
      if (remainingRecords.length === 0 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }

    } catch (error) {
      console.error('❌ 批量删除失败:', error);
      const errorMessage = error instanceof Error ? error.message : '批量删除失败，请稍后重试';
      alert(`❌ 批量删除失败: ${errorMessage}`);
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      // 当前全选，取消全选
      setSelectedRecords(new Set());
    } else {
      // 当前未全选，全选
      setSelectedRecords(new Set(records.map(r => r.id)));
    }
  };

  // 切换单个记录的选择状态
  const toggleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  // 查看详细结果 - 支持两种方式
  const viewDetails = (record: TestRecord, useModal: boolean = false) => {
    if (useModal) {
      // 使用模态框方式
      setSelectedRecord(record);
      setIsDetailModalOpen(true);
    } else {
      // 使用页面跳转方式
      navigate(`/stress-test/${record.id}`);
    }
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

  // 分页控制函数
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const changePageSize = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    // 立即加载新的页面大小数据
    loadTestRecords({
      page: 1,
      pageSize: newPageSize,
      search: searchTerm,
      status: statusFilter,
      dateFilter: dateFilter,
      sortBy: sortBy,
      sortOrder: sortOrder
    });
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
            {/* 美化的全选复选框 */}
            {records.length > 0 && (
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={records.length > 0 && selectedRecords.size === records.length}
                      onChange={toggleSelectAll}
                      className="sr-only"
                      aria-label="全选/取消全选测试记录"
                      title={selectedRecords.size === 0
                        ? '全选所有记录'
                        : selectedRecords.size === records.length
                          ? '取消全选'
                          : `已选择 ${selectedRecords.size} 项，点击全选`}
                    />
                    <div className={`
                      w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center
                      ${records.length > 0 && selectedRecords.size === records.length
                        ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/25'
                        : selectedRecords.size > 0
                          ? 'bg-blue-600/50 border-blue-500 shadow-md shadow-blue-500/20'
                          : 'bg-gray-700/50 border-gray-600/60 hover:border-gray-500/80 hover:bg-gray-600/50'
                      }
                      group-hover:scale-105 group-active:scale-95
                    `}>
                      {selectedRecords.size > 0 && (
                        <svg
                          className={`w-3 h-3 text-white transition-all duration-150 ${selectedRecords.size === records.length ? 'animate-in fade-in' : 'opacity-75'
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {selectedRecords.size === records.length ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M20 12H4"
                            />
                          )}
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                    {selectedRecords.size === 0
                      ? '全选'
                      : selectedRecords.size === records.length
                        ? '全选'
                        : `${selectedRecords.size}项`}
                  </span>
                </label>
              </div>
            )}

            {selectedRecords.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={batchDeleteRecords}
                  disabled={loading}
                  aria-label={`批量删除 ${selectedRecords.size} 条记录`}
                  title={`删除选中的 ${selectedRecords.size} 条测试记录`}
                  className="test-action-button inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-900/20 hover:bg-red-800/30 border border-red-600/40 hover:border-red-500/60 rounded-lg transition-all duration-200 disabled:opacity-50 backdrop-blur-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  删除选中 ({selectedRecords.size})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecords(new Set())}
                  className="test-action-button inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 bg-gray-700/30 hover:bg-gray-600/40 border border-gray-600/40 hover:border-gray-500/60 rounded-lg transition-all duration-200 backdrop-blur-sm"
                  title="清除选择"
                >
                  清除选择
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => loadTestRecords({
                page: currentPage,
                pageSize: pageSize,
                search: searchTerm,
                status: statusFilter,
                dateFilter: dateFilter,
                sortBy: sortBy,
                sortOrder: sortOrder
              })}
              disabled={loading}
              aria-label={loading ? '正在刷新测试记录' : '刷新测试记录'}
              title={loading ? '正在刷新测试记录...' : '刷新测试记录列表'}
              className="test-action-button inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-600/60 border border-gray-600/40 hover:border-gray-500/60 rounded-lg transition-all duration-200 disabled:opacity-50 backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        {/* 筛选和搜索 */}
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 mt-6 border border-gray-700/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-end">
            {/* 搜索框 */}
            <div className="md:col-span-2 xl:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                搜索测试记录
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="输入测试名称或URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="搜索测试记录"
                  title="输入测试名称或URL进行搜索"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                />
              </div>
            </div>

            {/* 状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                测试状态
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="筛选测试状态"
                title="选择要筛选的测试状态"
                className="w-full pl-3 pr-10 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 appearance-none bg-no-repeat bg-right bg-[length:14px_14px] bg-[position:right_12px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMuNSA1LjI1TDcgOC43NUwxMC41IDUuMjUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')]"
              >
                <option value="all">全部状态</option>
                <option value="completed">已完成</option>
                <option value="failed">已失败</option>
                <option value="running">运行中</option>
                <option value="cancelled">已取消</option>
                <option value="pending">准备中</option>
              </select>
            </div>

            {/* 日期筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                时间范围
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label="筛选测试日期"
                title="选择要筛选的测试日期范围"
                className="w-full pl-3 pr-10 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 appearance-none bg-no-repeat bg-right bg-[length:14px_14px] bg-[position:right_12px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMuNSA1LjI1TDcgOC43NUwxMC41IDUuMjUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')]"
              >
                <option value="all">全部时间</option>
                <option value="today">今天</option>
                <option value="week">最近一周</option>
                <option value="month">最近一月</option>
              </select>
            </div>

            {/* 排序 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                排序方式
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'duration' | 'score')}
                  aria-label="选择排序方式"
                  title="选择测试记录的排序方式"
                  className="flex-1 pl-3 pr-10 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 appearance-none bg-no-repeat bg-right bg-[length:14px_14px] bg-[position:right_12px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMuNSA1LjI1TDcgOC43NUwxMC41IDUuMjUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')]"
                >
                  <option value="createdAt">创建时间</option>
                  <option value="duration">测试时长</option>
                  <option value="score">性能评分</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  aria-label={`当前排序: ${sortOrder === 'asc' ? '升序' : '降序'}，点击切换`}
                  title={`切换排序顺序 (当前: ${sortOrder === 'asc' ? '升序' : '降序'})`}
                  className="flex items-center justify-center w-10 h-10 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white hover:bg-gray-600/40 hover:border-gray-500/60 transition-all duration-200"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
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
        ) : totalRecords === 0 ? (
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
          <>


            <div className="space-y-4">
              {records.map((record) => (
                <article
                  key={record.id}
                  className="test-record-item bg-gray-800/40 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 dark:border-gray-600/30 rounded-xl hover:bg-gray-800/60 dark:hover:bg-gray-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
                  aria-label={`测试记录: ${record.testName}`}
                >
                  <div className="flex items-start gap-4 p-6">
                    {/* 美化的复选框 */}
                    <div className="flex items-center pt-1">
                      <label className="relative cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedRecords.has(record.id)}
                          onChange={() => toggleSelectRecord(record.id)}
                          className="sr-only"
                          aria-label={`选择测试记录: ${record.testName}`}
                        />
                        <div className={`
                          w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center
                          ${selectedRecords.has(record.id)
                            ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/25'
                            : 'bg-gray-700/50 border-gray-600/60 hover:border-gray-500/80 hover:bg-gray-600/50'
                          }
                          group-hover:scale-105 group-active:scale-95
                        `}>
                          {selectedRecords.has(record.id) && (
                            <svg
                              className="w-3 h-3 text-white animate-in fade-in duration-150"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </label>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 第一行：测试名称和状态 */}
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                          {record.testName}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusStyle(record.status)} ${getStatusTextColorClass(record.status)}`}
                          role="status"
                          aria-label={`测试状态: ${record.status === 'completed' ? '已完成' :
                            record.status === 'failed' ? '已失败' :
                              record.status === 'running' ? '运行中' :
                                record.status === 'cancelled' ? '已取消' :
                                  record.status === 'pending' ? '准备中' : '未知'}`}
                        >
                          {getStatusIcon(record.status)}
                          {record.status === 'completed' ? '已完成' :
                            record.status === 'failed' ? '已失败' :
                              record.status === 'running' ? '运行中' :
                                record.status === 'cancelled' ? '已取消' :
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
                          <p className="font-medium text-gray-900 dark:text-white">{formatDuration(record)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">性能评分</span>
                          <p className="font-medium text-gray-900 dark:text-white">{formatScore(record)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">错误率</span>
                          <p className="font-medium text-gray-900 dark:text-white">{formatPercentage(record)}</p>
                        </div>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="test-record-actions flex items-center gap-2 ml-4">
                      <button
                        type="button"
                        onClick={() => viewDetails(record, true)}
                        aria-label={`快速查看: ${record.testName}`}
                        className="test-record-action-button p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 border border-gray-600/30 hover:border-blue-500/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
                        title="快速查看"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => viewDetails(record, false)}
                        aria-label={`详细页面: ${record.testName}`}
                        className="test-record-action-button p-2 text-gray-400 hover:text-purple-400 hover:bg-gray-700/50 border border-gray-600/30 hover:border-purple-500/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
                        title="详细页面"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => exportRecord(record)}
                        aria-label={`导出测试记录: ${record.testName}`}
                        className="test-record-action-button p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700/50 border border-gray-600/30 hover:border-green-500/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
                        title="导出记录"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRecord(record.id)}
                        aria-label={`删除测试记录: ${record.testName}`}
                        className="p-2 text-white border border-red-600 hover:border-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        style={{
                          backgroundColor: '#dc2626',
                          color: 'white'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.setProperty('background-color', '#b91c1c', 'important');
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.setProperty('background-color', '#dc2626', 'important');
                        }}
                        title="删除记录"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* 分页组件 */}
            {totalRecords > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-800/20 dark:bg-gray-800/40 backdrop-blur-sm border border-gray-700/30 rounded-lg">
                {/* 分页信息 */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    显示 {startRecord}-{endRecord} 条，共 {totalRecords} 条记录
                  </span>
                  <div className="flex items-center gap-2">
                    <label htmlFor="pageSize" className="text-sm">每页显示:</label>
                    <select
                      id="pageSize"
                      value={pageSize}
                      onChange={(e) => changePageSize(Number(e.target.value))}
                      className="px-2 py-1 text-sm border border-gray-600/40 rounded bg-gray-700/30 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* 分页控制 */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-600/40 rounded-lg bg-gray-700/30 backdrop-blur-sm text-white hover:bg-gray-600/40 hover:border-gray-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    aria-label="上一页"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    上一页
                  </button>

                  {/* 页码按钮 */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
                      let pageNumber;
                      if (totalPages <= 7) {
                        pageNumber = index + 1;
                      } else if (currentPage <= 4) {
                        pageNumber = index + 1;
                      } else if (currentPage >= totalPages - 3) {
                        pageNumber = totalPages - 6 + index;
                      } else {
                        pageNumber = currentPage - 3 + index;
                      }

                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => goToPage(pageNumber)}
                          className={`px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${currentPage === pageNumber
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-gray-600/40 bg-gray-700/30 backdrop-blur-sm text-white hover:bg-gray-600/40 hover:border-gray-500/60'
                            }`}
                          aria-label={`第 ${pageNumber} 页`}
                          aria-current={currentPage === pageNumber ? 'page' : undefined}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-600/40 rounded-lg bg-gray-700/30 backdrop-blur-sm text-white hover:bg-gray-600/40 hover:border-gray-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    aria-label="下一页"
                  >
                    下一页
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 详情模态框 */}
      <StressTestDetailModal
        record={selectedRecord}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRecord(null);
        }}
      />
    </div>
  );
};

export default StressTestHistory;
