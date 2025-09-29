// 数据存储Hook
import { useState, useEffect } from 'react';

export interface TestRecord {
  id: string;
  testName: string;
  testType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  duration?: number;
  result?: unknown;
}

export interface PaginationInfo {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
}

export interface UseDataStorageReturn {
  records: TestRecord[];
  loading: boolean;
  pagination: PaginationInfo;
  refresh: () => void;
  addRecord: (record: Omit<TestRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRecord: (id: string, updates: Partial<TestRecord>) => void;
  deleteRecord: (id: string) => void;
}

export const useDataStorage = (): UseDataStorageReturn => {
  const [records, setRecords] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const refresh = () => {
    setLoading(true);
    // 模拟数据加载
    setTimeout(() => {
      setRecords([]);
      setLoading(false);
    }, 1000);
  };

  const addRecord = (record: Omit<TestRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRecord: TestRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setRecords(prev => [...prev, newRecord]);
  };

  const updateRecord = (id: string, updates: Partial<TestRecord>) => {
    setRecords(prev => prev.map(record => 
      record.id === id 
        ? { ...record, ...updates, updatedAt: new Date().toISOString() }
        : record
    ));
  };

  const deleteRecord = (id: string) => {
    setRecords(prev => prev.filter(record => record.id !== id));
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    records,
    loading,
    pagination,
    refresh,
    addRecord,
    updateRecord,
    deleteRecord
  };
};

export default useDataStorage;
