/**
 * StressTestHistory Types
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/types.ts
 * 创建时间: 2025-10-05
 */

export interface TestRecord {
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

export interface LoadTestRecordsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dateFilter?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DeleteDialogState {
  isOpen: boolean;
  type: 'single' | 'batch';
  recordId?: string;
  recordName?: string;
  recordNames?: string[];
  isLoading: boolean;
}

export interface FilterState {
  searchTerm: string;
  statusFilter: string;
  dateFilter: string;
  sortBy: 'created_at' | 'duration' | 'start_time' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
}

export type SortField = 'created_at' | 'duration' | 'start_time' | 'status';

