/**
 * 统一的测试历史组件
 * 基于StressTestHistory.tsx的实现，支持所有测试类型
 */

import { BarChart3, Eye, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    getStatusConfig,
    getStatusStyleClasses,
    getStatusText
} from '../../utils/testStatusUtils';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import ExportModal from './ExportModal';
import { showToast } from './Toast';

import '../../styles/pagination.css';
import '../stress/StatusLabel.css';
import '../stress/StressTestHistory.css';

interface TestRecord {
    id: string;
    testName: string;
    testType: string;
    url: string;
    status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
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

interface UnifiedTestHistoryProps {
    testType: string; // 指定要显示的测试类型
    className?: string;
    title?: string;
    description?: string;
    onTestSelect?: (record: TestRecord) => void;
    onTestRerun?: (record: TestRecord) => void;
}

const UnifiedTestHistory: React.FC<UnifiedTestHistoryProps> = ({
    testType,
    className = '',
    title,
    description,
    onTestSelect,
    onTestRerun
}) => {
    // 路由导航
    const navigate = useNavigate();

    // 认证状态
    const { isAuthenticated } = useAuth();

    // 状态管理
    const [records, setRecords] = useState<TestRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'created_at' | 'duration' | 'start_time' | 'status'>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

    // 分页状态
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // 详情模态框状态
    const [selectedRecord, setSelectedRecord] = useState<TestRecord | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // 删除确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        type: 'single' | 'batch';
        recordId?: string;
        recordName?: string;
        recordNames?: string[];
        isLoading: boolean;
    }>({
        isOpen: false,
        type: 'single',
        isLoading: false
    });

    // 导出模态框状态
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // 缓存管理
    const requestCacheRef = useRef<Map<string, Promise<any>>>(new Map());
    const cacheTimestampRef = useRef<Map<string, number>>(new Map());
    const lastRequestParamsRef = useRef<string>('');

    // API接口参数类型
    interface LoadTestRecordsParams {
        page?: number;
        pageSize?: number;
        search?: string;
        status?: string;
        dateFilter?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        testType?: string;
    }

    // 加载测试记录（支持分页和筛选）
    const loadTestRecords = async (params: LoadTestRecordsParams = {}) => {
        try {
            // 生成请求参数的唯一标识
            const requestKey = JSON.stringify({ ...params, testType });

            // 清理过期缓存（30秒）
            const cacheExpiry = 30 * 1000;
            const now = Date.now();
            for (const [key, timestamp] of cacheTimestampRef.current.entries()) {
                if (now - timestamp > cacheExpiry) {
                    requestCacheRef.current.delete(key);
                    cacheTimestampRef.current.delete(key);
                }
            }

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

            lastRequestParamsRef.current = requestKey;
            cacheTimestampRef.current.set(requestKey, now);

            setLoading(true);

            // 在开发环境下检查后端是否可用
            const isDevelopment = process.env.NODE_ENV === 'development';
            if (isDevelopment) {
                // 使用空数据，避免API调用
                const mockData = {
                    success: true,
                    data: {
                        tests: [],
                        pagination: {
                            total: 0,
                            page: params.page || 1
                        }
                    }
                };

                // 模拟异步操作
                const requestPromise = Promise.resolve(mockData);
                requestCacheRef.current.set(requestKey, requestPromise);

                const data = await requestPromise;

                if (data.success) {
                    const { tests = [], pagination = {} } = data.data;
                    const { total = 0, page = 1 } = pagination;
                    setRecords(tests);
                    setTotalRecords(total);
                    setCurrentPage(page);
                }
                return;
            }

            // 构建查询参数
            const queryParams = new URLSearchParams();
            queryParams.append('testType', testType); // 添加测试类型过滤
            if (params.page) queryParams.append('page', params.page.toString());
            if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
            if (params.search) queryParams.append('search', params.search);
            if (params.status && params.status !== 'all') queryParams.append('status', params.status);
            if (params.dateFilter && params.dateFilter !== 'all') queryParams.append('dateFilter', params.dateFilter);
            if (params.sortBy) queryParams.append('sortBy', params.sortBy);
            if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

            // 创建带超时的请求Promise并缓存
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

            const requestPromise = fetch(`/api/test/history?${queryParams.toString()}`, {
                headers: {
                    ...(localStorage.getItem('auth_token') ? {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    } : {})
                },
                signal: controller.signal
            }).then(async (response) => {
                clearTimeout(timeoutId);

                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || '60';
                    throw new Error(`请求过于频繁，请${retryAfter}秒后再试`);
                }
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            }).catch(error => {
                clearTimeout(timeoutId);
                throw error;
            });

            requestCacheRef.current.set(requestKey, requestPromise);

            const data = await requestPromise;

            if (data.success) {
                const { tests = [], pagination = {} } = data.data;
                const { total = 0, page = 1 } = pagination;
                setRecords(tests);
                setTotalRecords(total);
                setCurrentPage(page);
            } else {
                console.error('加载测试记录失败:', data.message);
                setRecords([]);
                setTotalRecords(0);
            }

            // 清理缓存（5秒后）
            setTimeout(() => {
                requestCacheRef.current.delete(requestKey);
            }, 5000);

        } catch (error: any) {
            // 静默处理错误，避免控制台污染
            setRecords([]);
            setTotalRecords(0);

            // 只在非超时错误时显示信息
            if (error.name !== 'AbortError') {
                console.info('测试记录加载失败，使用空数据');
            }

            // 不显示Toast错误，避免用户体验问题
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
                sortOrder: sortOrder,
                testType: testType
            });
        }, isInitialLoadRef.current ? 0 : 800);
    };

    // 初始加载
    useEffect(() => {
        if (isInitialLoadRef.current) {
            triggerLoad();
            isInitialLoadRef.current = false;
        }
    }, []);

    // 监听筛选条件变化
    useEffect(() => {
        if (!isInitialLoadRef.current) {
            triggerLoad(true); // 重置到第一页
        }
    }, [searchTerm, statusFilter, dateFilter, sortBy, sortOrder]);

    // 监听分页变化
    useEffect(() => {
        if (!isInitialLoadRef.current) {
            triggerLoad(false); // 不重置页码
        }
    }, [currentPage, pageSize]);

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
            sortOrder: sortOrder,
            testType: testType
        });
    };

    // 分页信息
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);

    // 获取状态样式（使用统一的状态管理）
    const getStatusStyle = (status: string) => {
        return `!${getStatusStyleClasses(status)}`;
    };

    // 获取状态图标（使用统一的状态管理）
    const getStatusIcon = (status: string) => {
        const config = getStatusConfig(status);
        const IconComponent = config.icon;
        const isAnimated = status === 'running';

        return (
            <IconComponent
                className={`w-4 h-4 ${isAnimated ? 'animate-pulse' : ''}`}
            />
        );
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
        // 对于运行中的测试，不显示时长，避免显示配置时长造成混淆
        if (record.status === 'running' || record.status === 'starting') {
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

        // 最后尝试计算时间差（仅对已完成的测试）
        if ((!seconds || seconds <= 0) && record.startTime && record.endTime) {
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

        if (!score || score <= 0) return '-';
        return `${score.toFixed(1)}分`;
    };

    // 获取测试类型显示名称
    const getTestTypeName = (type: string) => {
        const typeNames: Record<string, string> = {
            stress: '压力测试',
            security: '安全测试',
            performance: '性能测试',
            api: 'API测试',
            seo: 'SEO测试',
            compatibility: '兼容性测试',
            accessibility: '可访问性测试',
            ux: 'UX测试',
            database: '数据库测试',
            network: '网络测试',
            website: '网站测试'
        };
        return typeNames[type] || type;
    };

    // 切换选择记录
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

    // 切换全选
    const toggleSelectAll = () => {
        if (selectedRecords.size === records.length) {
            setSelectedRecords(new Set());
        } else {
            setSelectedRecords(new Set(records.map(r => r.id)));
        }
    };

    // 查看测试详情
    const handleViewDetails = (record: TestRecord) => {
        if (onTestSelect) {
            onTestSelect(record);
        } else {
            setSelectedRecord(record);
            setIsDetailModalOpen(true);
        }
    };

    // 重新运行测试
    const handleRerunTest = (record: TestRecord) => {
        if (onTestRerun) {
            onTestRerun(record);
        }
    };

    // 删除单个记录
    const handleDeleteRecord = async (recordId: string) => {
        try {
            const response = await fetch(`/api/test/history/${recordId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                setRecords(prev => prev.filter(r => r.id !== recordId));
                setSelectedRecords(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(recordId);
                    return newSet;
                });
                setTotalRecords(prev => prev - 1);
                try {
                    if (showToast && typeof showToast.success === 'function') {
                        showToast.success('删除成功');
                    }
                } catch (toastError) {
                    console.warn('Toast 显示失败:', toastError);
                }
            } else {
                throw new Error('删除失败');
            }
        } catch (error) {
            console.error('删除记录失败:', error);
            try {
                if (showToast && typeof showToast.error === 'function') {
                    showToast.error('删除失败');
                }
            } catch (toastError) {
                console.warn('Toast 显示失败:', toastError);
            }
        }
    };

    // 批量删除记录
    const handleBatchDelete = async () => {
        if (selectedRecords.size === 0) return;

        try {
            const response = await fetch('/api/test/history/batch-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    recordIds: Array.from(selectedRecords)
                })
            });

            if (response.ok) {
                setRecords(prev => prev.filter(r => !selectedRecords.has(r.id)));
                setTotalRecords(prev => prev - selectedRecords.size);
                setSelectedRecords(new Set());
                try {
                    if (showToast && typeof showToast.success === 'function') {
                        showToast.success(`成功删除 ${selectedRecords.size} 条记录`);
                    }
                } catch (toastError) {
                    console.warn('Toast 显示失败:', toastError);
                }
            } else {
                throw new Error('批量删除失败');
            }
        } catch (error) {
            console.error('批量删除失败:', error);
            try {
                if (showToast && typeof showToast.error === 'function') {
                    showToast.error('批量删除失败');
                }
            } catch (toastError) {
                console.warn('Toast 显示失败:', toastError);
            }
        }
    };

    // 打开批量删除对话框
    const openBatchDeleteDialog = () => {
        setDeleteDialog({
            isOpen: true,
            type: 'batch',
            recordNames: records
                .filter(r => selectedRecords.has(r.id))
                .map(r => r.testName),
            isLoading: false
        });
    };

    // 打开单个删除对话框
    const openSingleDeleteDialog = (record: TestRecord) => {
        setDeleteDialog({
            isOpen: true,
            type: 'single',
            recordId: record.id,
            recordName: record.testName,
            isLoading: false
        });
    };

    // 确认删除
    const confirmDelete = async () => {
        setDeleteDialog(prev => ({ ...prev, isLoading: true }));

        try {
            if (deleteDialog.type === 'single' && deleteDialog.recordId) {
                await handleDeleteRecord(deleteDialog.recordId);
            } else if (deleteDialog.type === 'batch') {
                await handleBatchDelete();
            }
        } finally {
            setDeleteDialog({
                isOpen: false,
                type: 'single',
                isLoading: false
            });
        }
    };

    // 取消删除
    const cancelDelete = () => {
        setDeleteDialog({
            isOpen: false,
            type: 'single',
            isLoading: false
        });
    };

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
                            <h2 className="text-xl font-semibold text-white">
                                {title || `${getTestTypeName(testType)}历史`}
                            </h2>
                            <p className="text-sm text-gray-300 mt-1">
                                {description || `查看和管理${getTestTypeName(testType)}记录`}
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
                                    onClick={openBatchDeleteDialog}
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
            </div>

            {/* 搜索和过滤区域 */}
            <div className="p-6 border-b border-gray-700/40 dark:border-gray-600/30">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* 搜索框 */}
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={`搜索${getTestTypeName(testType)}记录...`}
                                className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* 过滤器 */}
                    <div className="flex items-center gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-700/50 border border-gray-600/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">所有状态</option>
                            <option value="completed">已完成</option>
                            <option value="failed">失败</option>
                            <option value="running">运行中</option>
                            <option value="cancelled">已取消</option>
                        </select>

                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-700/50 border border-gray-600/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">所有时间</option>
                            <option value="today">今天</option>
                            <option value="week">本周</option>
                            <option value="month">本月</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 测试记录列表 */}
            <div className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-3 text-gray-400">加载中...</span>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">暂无{getTestTypeName(testType)}记录</h3>
                        <p className="text-gray-400">开始您的第一个{getTestTypeName(testType)}吧</p>
                    </div>
                ) : (
                    <>
                        {/* 记录统计 */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="text-sm text-gray-400">
                                显示 {startRecord}-{endRecord} 条，共 {totalRecords} 条{getTestTypeName(testType)}记录
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">排序:</span>
                                <select
                                    value={`${sortBy}-${sortOrder}`}
                                    onChange={(e) => {
                                        const [field, order] = e.target.value.split('-');
                                        setSortBy(field as any);
                                        setSortOrder(order as any);
                                    }}
                                    className="px-3 py-1 bg-gray-700/50 border border-gray-600/40 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="created_at-desc">创建时间 (新到旧)</option>
                                    <option value="created_at-asc">创建时间 (旧到新)</option>
                                    <option value="duration-desc">耗时 (长到短)</option>
                                    <option value="duration-asc">耗时 (短到长)</option>
                                    <option value="status-asc">状态</option>
                                </select>
                            </div>
                        </div>

                        {/* 记录表格 */}
                        <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-700/30">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                <input
                                                    type="checkbox"
                                                    checked={records.length > 0 && selectedRecords.size === records.length}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                测试名称
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                URL
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                状态
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                评分
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                耗时
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                创建时间
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                操作
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/40">
                                        {records.map((record) => (
                                            <tr key={record.id} className="hover:bg-gray-700/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRecords.has(record.id)}
                                                        onChange={() => toggleSelectRecord(record.id)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-white truncate max-w-xs">
                                                        {record.testName || `${getTestTypeName(testType)} - ${record.id.slice(-8)}`}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-300 truncate max-w-xs" title={record.url}>
                                                        {record.url}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}>
                                                        {getStatusIcon(record.status)}
                                                        {getStatusText(record.status)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-300">
                                                        {formatScore(record)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-300">
                                                        {formatDuration(record)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-300">
                                                        {formatTime(record.createdAt)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleViewDetails(record)}
                                                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                                                            title="查看详情"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        {onTestRerun && (
                                                            <button
                                                                onClick={() => handleRerunTest(record)}
                                                                className="p-1 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded transition-colors"
                                                                title="重新运行"
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openSingleDeleteDialog(record)}
                                                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                                            title="删除"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 分页 */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400">每页显示:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        className="px-2 py-1 bg-gray-700/50 border border-gray-600/40 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 bg-gray-700/50 border border-gray-600/40 rounded text-white text-sm hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        上一页
                                    </button>

                                    <span className="text-sm text-gray-400">
                                        第 {currentPage} 页，共 {totalPages} 页
                                    </span>

                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 bg-gray-700/50 border border-gray-600/40 rounded text-white text-sm hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        下一页
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 删除确认对话框 */}
            <DeleteConfirmDialog
                isOpen={deleteDialog.isOpen}
                title={deleteDialog.type === 'single' ? '删除测试记录' : '批量删除测试记录'}
                message={
                    deleteDialog.type === 'single'
                        ? `确定要删除测试记录 "${deleteDialog.recordName}" 吗？`
                        : `确定要删除选中的 ${selectedRecords.size} 条测试记录吗？`
                }
                confirmText="删除"
                cancelText="取消"
                isLoading={deleteDialog.isLoading}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                variant="danger"
            />

            {/* 导出模态框 */}
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                data={records}
                filename={`${testType}-test-history`}
                title={`导出${getTestTypeName(testType)}历史`}
            />
        </div>
    );
};

export default UnifiedTestHistory;