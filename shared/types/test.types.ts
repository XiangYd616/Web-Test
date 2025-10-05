/**
 * test.types.ts - 测试相关类型定义
 */

export type TestType = 
  | 'performance' 
  | 'security' 
  | 'seo' 
  | 'api' 
  | 'stress'
  | 'network'
  | 'database'
  | 'compatibility'
  | 'ux'
  | 'accessibility';

export type TestStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface TestConfig {
  id?: string;
  name: string;
  type: TestType;
  url?: string;
  options?: Record<string, any>;
  timeout?: number;
  retries?: number;
}

export interface TestResult {
  id: string;
  testId: string;
  type: TestType;
  status: TestStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  results?: any;
  errors?: string[];
  metrics?: Record<string, any>;
  score?: number;
  grade?: string;
  summary?: string;
}

