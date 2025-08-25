import { TestProgress } from '../../services/api/testProgressService';
// 🧪 测试服务统一导出
export { default as apiTestEngine } from './apiTestEngine';
export { default as testScheduler } from './testScheduler';
export { default as unifiedTestEngine } from './unifiedTestEngine';

// 类型导出
export type { APITestEngine as ApiTestEngine } from './apiTestEngine';
export type { TestScheduler } from './testScheduler';
export type { UnifiedTestEngine } from './unifiedTestEngine';

// 重新导出常用类型
export type { APIEndpoint, APITestConfig } from './apiTestEngine';
export type { ScheduledTest, TestExecution } from './testScheduler';
export type { TestProgress, TestResult, TestType } from './unifiedTestEngine';

