import {useCallback, useEffect, useState} from 'react';

export interface TestRecord {
  id: string;
  test_name?: string; // 测试名称字段
  test_type: string;
  url?: string;
  status: 'completed' | 'failed' | 'running';
  overall_score?: number;
  start_time: string;
  end_time?: string;
  duration?: number; // 持续时间（秒）
  results?: any;
  config?: any;
  scores?: any;
  recommendations?: string[];
  created_at: string;
  updated_at?: string;
}

export interface FilterOptions {
  testType: string;
  status: string;
  dateRange: string;
  scoreRange: [number, number];
  searchQuery: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UseDataStorageReturn {
  // 数据状态
  testRecords: TestRecord[];
  loading: boolean;
  error: string | null;

  // 分页状态
  pagination: PaginationInfo;

  // 过滤和排序状态
  filters: FilterOptions;
  sortBy: 'date' | 'score' | 'type' | 'status';
  sortOrder: 'asc' | 'desc';

  // 操作方法
  loadTestRecords: (page?: number) => Promise<void>;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (limit: number) => void;
  handleSort: (field: 'date' | 'score' | 'type' | 'status') => void;
  updateFilters: (newFilters: Partial<FilterOptions>) => void;
  deleteRecord: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const useDataStorage = (): UseDataStorageReturn => {
  // 状态定义
  const [testRecords, setTestRecords] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [filters, setFilters] = useState<FilterOptions>({
    testType: '',
    status: '',
    dateRange: '',
    scoreRange: [0, 100],
    searchQuery: ''
  });

  const [sortBy, setSortBy] = useState<'date' | 'score' | 'type' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 加载测试记录
  const loadTestRecords = useCallback(async (page: number = pagination.page) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading test records from backend...');

      const response = await fetch('http://localhost:3001/api/test-history?' + new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) =>
            value !== '' && value !== null && value !== undefined
          )
        )
      }), {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const records = data.data.tests || [];
        const paginationData = data.data.pagination || {};

        console.log(`✅ Loaded ${records.length} test records from backend`);
        console.log('📄 Pagination info:', paginationData);

        setTestRecords(records);
        setPagination({
          page: paginationData.page || 1,
          limit: paginationData.limit || 10,
          total: paginationData.total || 0,
          totalPages: paginationData.totalPages || 0
        });
      } else {
        throw new Error(data.error || 'Failed to load test records');
      }
    } catch (err) {
      console.error('❌ Failed to load test records:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTestRecords([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, sortBy, sortOrder, filters]);

  // 分页控制
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadTestRecords(newPage);
    }
  }, [pagination.totalPages, loadTestRecords]);

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    loadTestRecords(1);
  }, [loadTestRecords]);

  // 排序控制
  const handleSort = useCallback((field: 'date' | 'score' | 'type' | 'status') => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newOrder);
  }, [sortBy, sortOrder]);

  // 过滤控制
  const updateFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // 重置到第一页
  }, []);

  // 删除记录
  const deleteRecord = useCallback(async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/test-history/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 重新加载数据
      await loadTestRecords();
    } catch (err) {
      console.error('❌ Failed to delete record:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    }
  }, [loadTestRecords]);

  // 刷新数据
  const refreshData = useCallback(() => {
    return loadTestRecords();
  }, [loadTestRecords]);

  // 初始化加载
  useEffect(() => {
    loadTestRecords();
  }, [sortBy, sortOrder, filters]);

  return {
    testRecords,
    loading,
    error,
    pagination,
    filters,
    sortBy,
    sortOrder,
    loadTestRecords,
    handlePageChange,
    handlePageSizeChange,
    handleSort,
    updateFilters,
    deleteRecord,
    refreshData
  };
};
