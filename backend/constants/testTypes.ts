/**
 * 测试引擎支持的测试类型
 * 供后端验证与路由共享使用，避免重复定义
 */

export const TEST_TYPES = [
  'performance',
  'security',
  'api',
  'stress',
  'seo',
  'website',
  'accessibility',
] as const;

export type TestType = (typeof TEST_TYPES)[number];
