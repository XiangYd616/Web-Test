/**
 * testHistory.types.ts - 测试历史类型定义
 */

import { TestResult } from './testResult.types';

export interface TestHistoryRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  result?: TestResult;
}

export interface TestHistory {
  total: number;
  records: TestHistoryRecord[];
  page: number;
  pageSize: number;
}

export interface TestHistoryQuery {
  id?: string;
  type?: string;
  status?: string;
  from?: string | number;
  to?: string | number;
  limit?: number;
  offset?: number;
}

