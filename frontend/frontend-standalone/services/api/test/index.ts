/**
 * 测试API导出
 * 统一的测试相关API接口
 */

// 导出API客户端
export {
  TestApiClient,
  testApiClient,
  runTest,
  getTestEngines,
  validateTestConfig
} from './testApiClient';

// 导出类型定义
export type {
  TestRequest,
  TestProgress,
  TestResult
} from './testApiClient';
