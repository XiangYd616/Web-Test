/**
 * 测试专用Hook统一导出
 * 各个测试页面可以选择性使用这些Hook，不强制替换现有实现
 */

// 导出专用Hook
export { useAPITestState } from './useAPITestState';
export { useCompatibilityTestState } from './useCompatibilityTestState';
export { useDatabaseTestState } from './useDatabaseTestState';
export { useNetworkTestState } from './useNetworkTestState';
export { useUXTestState } from './useUXTestState';

// 导出现有Hook（保持兼容性）
export { useTestProgress } from './useTestProgress';
export { useUnifiedSEOTest } from './useUnifiedSEOTest';
export { useUserStats } from './useUserStats';

// 导出类型定义 - 从统一类型系统导入
export type {
  APITestConfig,
  APITestResult
} from '../types';

export type {
  CompatibilityTestConfig,
  CompatibilityTestResult
} from '../types';

export type {
  UXTestConfig,
  UXTestResult
} from '../types';

export type {
  NetworkTestConfig,
  NetworkTestResult
} from '../types';

export type {
  DatabaseTestConfig,
  DatabaseTestResult
} from '../types';

