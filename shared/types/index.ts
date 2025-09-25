/**
 * Shared Types Index
 * 导出所有共享类型定义
 */

// API相关类型
export * from './api.types';

// 测试相关类型
export enum TestType {
  WEBSITE = 'website',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  SEO = 'seo',
  API = 'api',
  NETWORK = 'network',
  DATABASE = 'database',
  COMPATIBILITY = 'compatibility',
  ACCESSIBILITY = 'accessibility',
  UX = 'ux'
}

// 后续可以添加更多共享类型
// export * from './database.types';
// export * from './config.types';
// export * from './engine.types';
