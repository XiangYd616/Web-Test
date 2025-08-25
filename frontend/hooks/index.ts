import { useTestProgress } from '../hooks/useTestProgress';
import { TestProgress } from '../services/api/testProgressService';
/**
 * 测试专用Hook统一导出
 * 各个测试页面可以选择性使用这些Hook，不强制替换现有实现
 */

// 导出专用Hook
export { useAPITestState } from './useAPITestState';
export { useCompatibilityTestState } from './useCompatibilityTestState';
export { useUXTestState } from './useUXTestState';
export { useNetworkTestState } from './useNetworkTestState';
export { useDatabaseTestState } from './useDatabaseTestState';

// 导出现有Hook（保持兼容性）
export { useUnifiedSEOTest } from './useUnifiedSEOTest';
export { useTestProgress } from './useTestProgress';
export { useUserStats } from './useUserStats';

// 导出类型定义
export type { 
  APITestConfig, 
  APITestResult, 
  UseAPITestStateReturn 
} from './useAPITestState';

export type { 
  CompatibilityTestConfig, 
  CompatibilityTestResult, 
  UseCompatibilityTestStateReturn 
} from './useCompatibilityTestState';

export type { 
  UXTestConfig, 
  UXTestResult, 
  UseUXTestStateReturn 
} from './useUXTestState';

export type { 
  NetworkTestConfig, 
  NetworkTestResult, 
  UseNetworkTestStateReturn 
} from './useNetworkTestState';

export type { 
  DatabaseTestConfig, 
  DatabaseTestResult, 
  UseDatabaseTestStateReturn 
} from './useDatabaseTestState';
