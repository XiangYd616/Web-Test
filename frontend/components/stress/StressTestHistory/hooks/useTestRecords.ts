/**
 * useTestRecords Hook - 管理测试记录的加载和状态
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/hooks/useTestRecords.ts
 * 创建时间: 2025-10-05
 */

import { useState, useRef, useCallback } from 'react';
import type { TestRecord, LoadTestRecordsParams } from '../types';

interface UseTestRecordsReturn {
  records: TestRecord[];
  loading: boolean;
  totalRecords: number;
  currentPage: number;
  loadTestRecords: (params: LoadTestRecordsParams) => Promise<void>;
  setRecords: React.Dispatch<React.SetStateAction<TestRecord[]>>;
  setTotalRecords: React.Dispatch<React.SetStateAction<number>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export const useTestRecords = (): UseTestRecordsReturn => {
  const [records, setRecords] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // 请求去重和缓存
  const requestCacheRef = useRef<Map<string, Promise<any>>>(new Map());
  const lastRequestParamsRef = useRef<string>('');
  const cacheTimestampRef = useRef<Map<string, number>>(new Map());

  const loadTestRecords = useCallback(async (params: LoadTestRecordsParams = {}) => {
    try {
      const requestKey = JSON.stringify(params);

      // 清理过期缓存（30秒）
      const cacheExpiry = 30 * 1000;
      const now = Date.now();
      for (const [key, timestamp] of cacheTimestampRef.current.entries()) {
        if (now - timestamp > cacheExpiry) {
          requestCacheRef.current.delete(key);
          cacheTimestampRef.current.delete(key);
        }
      }

      // 避免重复请求
      if (requestKey === lastRequestParamsRef.current && requestCacheRef.current.has(requestKey)) {
        return;
      }

      // 等待相同请求完成
      if (requestCacheRef.current.has(requestKey)) {
        await requestCacheRef.current.get(requestKey);
        return;
      }

      setLoading(true);
      lastRequestParamsRef.current = requestKey;
      cacheTimestampRef.current.set(requestKey, Date.now());

      // 构建查询参数
      const queryParams = new URLSearchParams();
      queryParams.append('type', 'stress');
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      if (params.dateFilter && params.dateFilter !== 'all') queryParams.append('dateFilter', params.dateFilter);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      // 创建请求Promise
      const requestPromise = fetch(`/api/test/history?${queryParams.toString()}`, {
        headers: {
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        }
      }).then(async (response) => {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          throw new Error(`请求过于频繁，请${retryAfter}秒后再试`);
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      });

      requestCacheRef.current.set(requestKey, requestPromise);
      const data = await requestPromise;

      if (data?.success) {
        const { tests = [], pagination = {} } = data?.data;
        const { total = 0, page = 1 } = pagination;
        setRecords(tests);
        setTotalRecords(total);
        setCurrentPage(page);
      } else {
        console.error('加载测试记录失败:', data?.message);
        setRecords([]);
        setTotalRecords(0);
      }

      // 清理缓存（5秒后）
      setTimeout(() => {
        requestCacheRef.current.delete(requestKey);
      }, 5000);

    } catch (error) {
      console.error('加载测试记录失败:', {
        error,
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorString: String(error)
      });

      setRecords([]);
      setTotalRecords(0);
      requestCacheRef.current.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    records,
    loading,
    totalRecords,
    currentPage,
    loadTestRecords,
    setRecords,
    setTotalRecords,
    setCurrentPage
  };
};

