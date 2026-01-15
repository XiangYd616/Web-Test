/**
 * 测试专用Hook统一导出 - 重构优化版本
 * 提供统一的测试引擎接口和向后兼容性
 */

// 🚀 主要Hook - 推荐使用
export { useTestManager } from './useTestManager';

// 🔄 兼容性Hook - 为现有代码提供无缝迁移
export {
  useBridgeTest,
  useSimpleTestEngine,
  useTestEngine,
  useTestState,
} from './useCompatibilityBridge';

// 📋 专用测试Hook
export { useAPITestState } from './useAPITestState';
export { useCompatibilityTestState } from './useCompatibilityTestState';
export { useDatabaseTestState } from './useDatabaseTestState';
export { useNetworkTestState } from './useNetworkTestState';
export { useUxTestState } from './useUxTestState';

// 🛠️ 工具Hook（保持兼容性）
export { useTestProgress } from './useTestProgress';
export { useUserStats } from './useUserStats';

// 导出类型定义 - 从统一类型系统导入
export type { TestConfig, TestResult } from '../types';
