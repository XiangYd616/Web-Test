
/**
 * 测试API服务 - 已弃用
 * 请使用 frontend/services/api/apiService.ts 中的统一服务
 *
 * 此文件将被删除，所有功能已迁移到统一API服务
 */

console.warn('⚠️ 警告: testApiService.ts 已弃用，请使用 apiService');

// 重新导出统一API服务
import { unifiedApiService } from './api/apiService';
import { TestProgress } from '../services/api/testProgressService';
export { unifiedApiService as testApiService };
export default unifiedApiService;

// 向后兼容的类型导出
export type {
  TestConfig, TestProgress, TestSession
} from './api/apiService';

// 此文件的其余部分已被弃用，所有功能已迁移到统一API服务
