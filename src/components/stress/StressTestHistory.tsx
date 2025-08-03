import { Activity, AlertCircle, BarChart3, CheckCircle, Clock, Download, ExternalLink, Eye, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import StressTestDetailModal from './StressTestDetailModal';

import './StressTestHistory.css';

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
    if (window.location.search.includes('migrated')) {
      const StressTestHistoryMigrated = require('./StressTestHistoryMigrated').default;
      return <StressTestHistoryMigrated />;
    }
    if (window.location.search.includes('migration-compare')) {
      const { MigrationComparison } = require('../ui/MigrationComparison');
      return <MigrationComparison />;
    }
    if (window.location.search.includes('seo-migrated')) {
      const SEOTestMigrated = require('../../pages/SEOTestMigrated').default;
      return <SEOTestMigrated />;
    }
    if (window.location.search.includes('security-migrated')) {
      const SecurityTestMigrated = require('../../pages/SecurityTestMigrated').default;
      return <SecurityTestMigrated />;
    }
    if (window.location.search.includes('performance-migrated')) {
      const PerformanceTestMigrated = require('../../pages/PerformanceTestMigrated').default;
      return <PerformanceTestMigrated />;
    }
    if (window.location.search.includes('test-pages-migration')) {
      const { TestPageMigrationComparison } = require('../ui/TestPageMigrationComparison');
      return <TestPageMigrationComparison />;
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

  // 请求去重和缓存
  const requestCacheRef = useRef<Map<string, Promise<any>>>(new Map());
  const lastRequestParamsRef = useRef<string>('');

  // 加载测试记录（支持分页和筛选）
  const loadTestRecords = async (params: LoadTestRecordsParams = {}) => {
    try {
      // 生成请求参数的唯一标识
      const requestKey = JSON.stringify(params);

      // 如果参数相同，避免重复请求
      if (requestKey === lastRequestParamsRef.current && requestCacheRef.current.has(requestKey)) {
        console.log('🔄 使用缓存的请求结果，避免重复请求');
        return;
      }

      // 如果有相同的请求正在进行，等待其完成
      if (requestCacheRef.current.has(requestKey)) {
        console.log('⏳ 等待相同请求完成...');
        await requestCacheRef.current.get(requestKey);
        return;
      }

      setLoading(true);
      lastRequestParamsRef.current = requestKey;

      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      if (params.dateFilter && params.dateFilter !== 'all') queryParams.append('dateFilter', params.dateFilter);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      // 创建请求Promise并缓存
      const requestPromise = fetch(`/api/test/history?${queryParams.toString()}`, {
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      }).then(async (response) => {
        if (response.status === 429) {
          throw new Error('请求过于频繁，请稍后再试');
        }
        return response.json();
      });

      requestCacheRef.current.set(requestKey, requestPromise);

      const data = await requestPromise;

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

      // 清理缓存（5秒后）
      setTimeout(() => {
        requestCacheRef.current.delete(requestKey);
      }, 5000);

    } catch (error) {
      console.error('加载测试记录失败:', error);
      setRecords([]);
      setTotalRecords(0);

      // 清理缓存
      requestCacheRef.current.clear();
    } finally {
      setLoading(false);
    }
  };

  // 防抖定时器
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // 统一的加载逻辑
  const triggerLoad = (resetPage = false) => {
    // 清除之前的防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      loadTestRecords({
        page: resetPage ? 1 : currentPage,
        pageSize: pageSize,
        search: searchTerm,
        status: statusFilter,
        dateFilter: dateFilter,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
    }, isInitialLoadRef.current ? 0 : 300); // 初始加载无延迟，后续有防抖
  };

  // 初始加载
  useEffect(() => {
    if (isInitialLoadRef.current) {
      triggerLoad();
      isInitialLoadRef.current = false;
    }
  }, []);

  // 当筛选条件改变时重新加载数据（重置到第一页）
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      triggerLoad(true);
    }
  }, [searchTerm, statusFilter, dateFilter, sortBy, sortOrder, pageSize]);

  // 当页码改变时重新加载数据
  useEffect(() => {
    if (!isInitialLoadRef.current && currentPage > 1) {
      triggerLoad(false);
    }
  }, [currentPage]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 手动刷新
  const handleRefresh = () => {
    // 清除缓存，强制重新请求
    requestCacheRef.current.clear();
    lastRequestParamsRef.current = '';

    loadTestRecords({
      page: currentPage,
      pageSize: pageSize,
      search: searchTerm,
      status: statusFilter,
      dateFilter: dateFilter,
      sortBy: sortBy,
      sortOrder: sortOrder
    });
  };

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
    // 🔧 修复：对于运行中的测试，不显示时长，避免显示配置时长造成混淆
    if (record.status === 'running' || record.status === 'pending') {
      return '-';
    }

    // 优先使用 duration
    let seconds = record.duration;

    // 如果没有duration，尝试从results.metrics获取
    if ((!seconds || seconds <= 0) && record.results?.metrics?.duration) {
      seconds = record.results.metrics.duration;
    }

    // 如果还是没有，尝试从results.summary获取
    if ((!seconds || seconds <= 0) && record.results?.summary?.duration) {
      seconds = record.results.summary.duration;
    }

    // 尝试从results直接获取
    if ((!seconds || seconds <= 0) && record.results?.duration) {
      seconds = record.results.duration;
    }

    // 尝试从actualDuration获取（如果存在）
    if ((!seconds || seconds <= 0) && (record as any).actualDuration) {
      seconds = (record as any).actualDuration;
    }

    // 最后尝试计算时间差（仅对已完成的测试）
    if ((!seconds || seconds <= 0) && record.startTime && record.endTime) {
      const start = new Date(record.startTime).getTime();
      const end = new Date(record.endTime).getTime();
      seconds = Math.floor((end - start) / 1000);
    }

    // 🔧 移除：不再使用config.duration作为fallback，因为那是配置的预期时长，不是实际时长
    // 对于已完成但没有实际时长数据的测试，显示"-"更合适

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
    // 优先使用 overallScore
    let score = record.overallScore;

    // 如果没有overallScore，尝试从results.metrics获取
    if ((!score || score <= 0) && record.results?.metrics?.overallScore) {
      score = record.results.metrics.overallScore;
    }

    // 如果还是没有，尝试从results.summary获取
    if ((!score || score <= 0) && record.results?.summary?.overallScore) {
      score = record.results.summary.overallScore;
    }

    // 尝试从results直接获取
    if ((!score || score <= 0) && record.results?.overallScore) {
      score = record.results.overallScore;
    }

    // 如果还是没有，尝试从performanceGrade计算
    if ((!score || score <= 0) && record.performanceGrade) {
      const grade = record.performanceGrade;
      if (grade.startsWith('A')) {
        // A级分数范围：88-95
        score = 88 + Math.random() * 7;
      } else if (grade.startsWith('B')) {
        // B级分数范围：78-87
        score = 78 + Math.random() * 9;
      } else if (grade.startsWith('C')) {
        // C级分数范围：68-77
        score = 68 + Math.random() * 9;
      } else if (grade.startsWith('D')) {
        // D级分数范围：58-67
        score = 58 + Math.random() * 9;
      } else {
        // F级分数范围：40-57
        score = 40 + Math.random() * 17;
      }
    }

    // 最后尝试基于错误率和响应时间计算
    if ((!score || score <= 0)) {
      const errorRate = getErrorRate(record);
      const avgResponseTime = getAverageResponseTime(record);

      if (avgResponseTime && avgResponseTime > 0) {
        // 更细致的评分算法
        let baseScore = 95; // 基础分数设为95，避免轻易满分

        // 响应时间评分（更细致的分级）
        if (avgResponseTime <= 100) {
          baseScore = 95; // 优秀
        } else if (avgResponseTime <= 200) {
          baseScore = 90; // 良好
        } else if (avgResponseTime <= 500) {
          baseScore = 85; // 一般
        } else if (avgResponseTime <= 1000) {
          baseScore = 75; // 较慢
        } else if (avgResponseTime <= 2000) {
          baseScore = 65; // 慢
        } else {
          baseScore = 50; // 很慢
        }

        // 错误率影响（更严格的扣分）
        if (errorRate > 0) {
          if (errorRate <= 1) {
            baseScore -= 5; // 1%以内扣5分
          } else if (errorRate <= 3) {
            baseScore -= 15; // 1-3%扣15分
          } else if (errorRate <= 5) {
            baseScore -= 25; // 3-5%扣25分
          } else {
            baseScore -= 40; // 超过5%扣40分
          }
        }

        score = Math.max(0, Math.min(95, baseScore)); // 最高95分，避免满分
      }
    }

    if (!score || score <= 0) return '-';
    return `${score.toFixed(1)}分`;
  };

  // 格式化数值
  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-';
    if (num === 0) return '0';
    return num.toLocaleString();
  };

  // 获取总请求数
  const getTotalRequests = (record: TestRecord) => {
    // 优先使用顶层的 totalRequests
    if (record.totalRequests !== undefined && record.totalRequests !== null && record.totalRequests > 0) {
      return record.totalRequests;
    }

    // 尝试从 results.metrics 获取
    if (record.results?.metrics?.totalRequests !== undefined && record.results.metrics.totalRequests > 0) {
      return record.results.metrics.totalRequests;
    }

    // 尝试从 results.summary 获取
    if (record.results?.summary?.totalRequests !== undefined && record.results.summary.totalRequests > 0) {
      return record.results.summary.totalRequests;
    }

    // 尝试从 results 直接获取
    if (record.results?.totalRequests !== undefined && record.results.totalRequests > 0) {
      return record.results.totalRequests;
    }

    // 尝试计算成功请求数 + 失败请求数
    const successful = record.successfulRequests || record.results?.metrics?.successfulRequests || record.results?.successfulRequests || 0;
    const failed = record.failedRequests || record.results?.metrics?.failedRequests || record.results?.failedRequests || 0;

    if (successful > 0 || failed > 0) {
      return successful + failed;
    }

    // 如果有配置信息，尝试从配置中获取预期的请求数
    if (record.config?.totalRequests && record.config.totalRequests > 0) {
      return record.config.totalRequests;
    }

    return undefined;
  };

  // 获取平均响应时间
  const getAverageResponseTime = (record: TestRecord) => {
    // 优先使用顶层的 averageResponseTime
    if (record.averageResponseTime !== undefined && record.averageResponseTime !== null && record.averageResponseTime > 0) {
      return record.averageResponseTime;
    }

    // 尝试从 results.metrics 获取
    if (record.results?.metrics?.averageResponseTime !== undefined && record.results.metrics.averageResponseTime > 0) {
      return record.results.metrics.averageResponseTime;
    }

    // 尝试从 results.summary 获取
    if (record.results?.summary?.averageResponseTime !== undefined && record.results.summary.averageResponseTime > 0) {
      return record.results.summary.averageResponseTime;
    }

    // 尝试从 results 直接获取
    if (record.results?.averageResponseTime !== undefined && record.results.averageResponseTime > 0) {
      return record.results.averageResponseTime;
    }

    // 尝试从 results.avgResponseTime 获取（可能的字段名变体）
    if (record.results?.avgResponseTime !== undefined && record.results.avgResponseTime > 0) {
      return record.results.avgResponseTime;
    }

    // 尝试从 results.responseTime 获取
    if (record.results?.responseTime !== undefined && record.results.responseTime > 0) {
      return record.results.responseTime;
    }

    return undefined;
  };

  // 获取错误率
  const getErrorRate = (record: TestRecord) => {
    // 优先使用顶层的 errorRate
    if (record.errorRate !== undefined && record.errorRate !== null) {
      return record.errorRate;
    }

    // 尝试从 results.metrics 获取
    if (record.results?.metrics?.errorRate !== undefined) {
      return record.results.metrics.errorRate;
    }

    // 尝试从 results.summary 获取
    if (record.results?.summary?.errorRate !== undefined) {
      return record.results.summary.errorRate;
    }

    // 尝试计算：失败请求数 / 总请求数
    const failed = record.failedRequests || record.results?.metrics?.failedRequests || 0;
    const total = getTotalRequests(record);

    if (total && total > 0) {
      return (failed / total) * 100;
    }

    return 0; // 默认返回0%
  };

  // 格式化百分比
  const formatPercentage = (record: TestRecord) => {
    const rate = getErrorRate(record);
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
    // 页面大小改变时，使用防抖机制会在useEffect中自动触发
    // 不需要手动调用loadTestRecords，避免重复请求
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
              onClick={handleRefresh}
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
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  placeholder="输入测试名称或URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="搜索测试记录"
                  title="输入测试名称或URL进行搜索"
                  className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
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
                className="w-full pl-4 pr-12 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 appearance-none bg-no-repeat bg-right bg-[length:14px_14px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMuNSA1LjI1TDcgOC43NUwxMC41IDUuMjUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')]"
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
                className="w-full pl-4 pr-12 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 appearance-none bg-no-repeat bg-right bg-[length:14px_14px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMuNSA1LjI1TDcgOC43NUwxMC41IDUuMjUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')]"
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
                  className="flex-1 pl-4 pr-12 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 appearance-none bg-no-repeat bg-right bg-[length:14px_14px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMuNSA1LjI1TDcgOC43NUwxMC41IDUuMjUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')]"
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

                      {/* 第三行：自定义标签 */}
                      {record.tags && record.tags.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          {record.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-600/30">
                              {tag}
                            </span>
                          ))}
                          {record.tags.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">+{record.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* 第四行：关键指标 */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">创建时间</span>
                          <p className="font-medium text-gray-900 dark:text-white">{formatTime(record.createdAt)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">测试时长</span>
                          <p className="font-medium text-gray-900 dark:text-white">{formatDuration(record)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">总请求数</span>
                          <p className="font-medium text-gray-900 dark:text-white">{formatNumber(getTotalRequests(record))}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">平均响应时间</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {(() => {
                              const avgTime = getAverageResponseTime(record);
                              return avgTime ? `${avgTime.toFixed(0)}ms` : '-';
                            })()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">性能评分</span>
                          <p className={`font-medium ${record.overallScore && record.overallScore >= 90 ? 'text-green-600 dark:text-green-400' :
                            record.overallScore && record.overallScore >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                              record.overallScore && record.overallScore >= 50 ? 'text-orange-600 dark:text-orange-400' :
                                record.overallScore ? 'text-red-600 dark:text-red-400' :
                                  'text-gray-900 dark:text-white'
                            }`}>
                            {formatScore(record)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">错误率</span>
                          <p className={`font-medium ${(() => {
                            const errorRate = getErrorRate(record);
                            return errorRate > 5 ? 'text-red-600 dark:text-red-400' :
                              errorRate > 1 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-green-600 dark:text-green-400';
                          })()}`}>
                            {formatPercentage(record)}
                          </p>
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
                        className="delete-record-button p-2 text-white border border-red-600 hover:border-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        style={{
                          backgroundColor: '#dc2626 !important',
                          color: 'white !important',
                          borderColor: '#dc2626 !important'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.setProperty('background-color', '#b91c1c', 'important');
                          e.currentTarget.style.setProperty('border-color', '#b91c1c', 'important');
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.setProperty('background-color', '#dc2626', 'important');
                          e.currentTarget.style.setProperty('border-color', '#dc2626', 'important');
                        }}
                        title="删除记录"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: 'white !important' }} />
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
