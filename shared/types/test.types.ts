/**
 * test.types.ts - 测试相关类型定义
 */

export const TestTypeValues = [
  'website',
  'performance',
  'security',
  'seo',
  'api',
  'stress',
  'accessibility',
  'compatibility',
  'ux',
] as const;

export type TestType = (typeof TestTypeValues)[number];

export const TestStatusValues = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;

export type TestStatus = (typeof TestStatusValues)[number];

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
