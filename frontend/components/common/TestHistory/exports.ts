/**
 * TestHistory 组件统一导出
 *
 * 文件路径: frontend\components\common\TestHistory\exports.ts
 * 创建时间: 2025-10-29
 */

// 通用 TestHistory 组件
export { default as TestHistory } from './index';
export type { TestHistoryProps } from './index';

// 所有测试类型的包装组件
export { default as AccessibilityTestHistory } from '../../accessibility/AccessibilityTestHistory';
export { default as APITestHistory } from '../../api/APITestHistory';
export { default as CompatibilityTestHistory } from '../../compatibility/CompatibilityTestHistory';
export { default as DatabaseTestHistory } from '../../database/DatabaseTestHistory';
export { default as NetworkTestHistory } from '../../network/NetworkTestHistory';
export { default as PerformanceTestHistory } from '../../performance/PerformanceTestHistory';
export { default as SecurityTestHistory } from '../../security/SecurityTestHistory';
export { default as SEOTestHistory } from '../../seo/SEOTestHistory';
export { default as UXTestHistory } from '../../ux/UXTestHistory';
export { default as WebsiteTestHistory } from '../../website/WebsiteTestHistory';
