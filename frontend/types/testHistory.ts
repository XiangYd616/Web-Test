// 测试历史类型定义
import { TestStatus, TestType } from './unified/testTypes';

export interface TestStatistics {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  successRate: number;
}

export { TestStatus, TestType };

export interface TestHistoryRecord {
  id: string;
  testName: string;
  testType: TestType;
  status: TestStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  result?: any;
  metadata?: Record<string, any>;
}

// 添加缺失的类型定义
export interface TestSession {
  id: string;
  name: string;
  testType: TestType;
  status: TestStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  results: TestHistoryRecord[];
}

export interface TestHistoryQuery {
  testType?: TestType;
  status?: TestStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TestHistoryResponse {
  data: TestHistoryRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

export default TestHistoryRecord;
