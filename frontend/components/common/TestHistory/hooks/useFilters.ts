/**
 * useFilters Hook - 管理筛选和排序状态
 * 
 * 文件路径: frontend/components/common/TestHistory/hooks/useFilters.ts
 * 创建时间: 2025-10-05
 */

import { useState } from 'react';
import type { SortField } from '../types';

interface UseFiltersReturn {
  searchTerm: string;
  statusFilter: string;
  dateFilter: string;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  setDateFilter: React.Dispatch<React.SetStateAction<string>>;
  setSortBy: React.Dispatch<React.SetStateAction<SortField>>;
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  toggleSortOrder: () => void;
}

export const useFilters = (): UseFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return {
    searchTerm,
    statusFilter,
    dateFilter,
    sortBy,
    sortOrder,
    setSearchTerm,
    setStatusFilter,
    setDateFilter,
    setSortBy,
    setSortOrder,
    toggleSortOrder
  };
};


