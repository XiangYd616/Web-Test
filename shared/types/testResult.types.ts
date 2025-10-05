/**
 * testResult.types.ts - 测试结果类型定义
 */

import { TestStatus, TestType } from './test.types';

export interface TestResultMetrics {
  responseTime?: number;
  errorRate?: number;
  throughput?: number;
  successRate?: number;
  [key: string]: any;
}

export interface TestResultDetails {
  passed?: number;
  failed?: number;
  total?: number;
  items?: any[];
  [key: string]: any;
}

export interface TestResult {
  id: string;
  testId: string;
  type: TestType;
  status: TestStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  results?: TestResultDetails;
  errors?: string[];
  metrics?: TestResultMetrics;
  score?: number;
  grade?: string;
  summary?: string;
  recommendations?: Array<{
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    action: string;
  }>;
}

