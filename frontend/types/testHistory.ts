// Test history and session types

export interface TestSession {
  id: string;
  type: string;
  status: string;
  startTime: number;
  endTime?: number;
  userId?: string;
  [key: string]: unknown;
}

export interface TestHistoryQuery {
  page?: number;
  pageSize?: number;
  testType?: string | string[];
  status?: string;
  dateFrom?: string | number;
  dateTo?: string | number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TestHistoryResponse {
  items: TestSession[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TestStatistics {
  total: number;
  passed: number;
  failed: number;
  running: number;
  [key: string]: unknown;
}

export interface BatchOperationResult {
  success: number;
  failed: number;
  total: number;
  errors?: string[];
}

export type TestType = 'stress' | 'performance' | 'api' | 'security' | 'seo' | 'accessibility';

export {};
