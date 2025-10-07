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

// Removed TestResult - use the more comprehensive version from testResult.types.ts instead

