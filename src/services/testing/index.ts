// 🧪 测试服务统一导出
export { default as testEngine } from './testEngine';
export { default as unifiedTestEngine } from './unifiedTestEngine';
export { default as apiTestEngine } from './apiTestEngine';
export { default as testApi } from './testApi';
export { default as testScheduler } from './testScheduler';
export { default as testTemplates } from './testTemplates';
export { default as backgroundTestManager } from './backgroundTestManager';
export { default as browserTestEngineIntegrator } from './browserTestEngineIntegrator';

// 类型导出
export type { TestEngine } from './testEngine';
export type { UnifiedTestEngine } from './unifiedTestEngine';
export type { ApiTestEngine } from './apiTestEngine';
export type { TestApi } from './testApi';
export type { TestScheduler } from './testScheduler';
export type { TestTemplates } from './testTemplates';
export type { BackgroundTestManager } from './backgroundTestManager';
export type { BrowserTestEngineIntegrator } from './browserTestEngineIntegrator';
