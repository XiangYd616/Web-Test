// 统一配置导出
// 提供项目所有配置的统一入口

// 应用配置
export { default as apiConfig } from './app/api';
export { default as ConfigManager } from './app/ConfigManager';
export { default as browserCacheConfig } from './app/browserCacheConfig';

// 主题配置
export { default as theme } from './theme/theme';
export { default as tokens } from './theme/tokens';

// 环境配置
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// 应用常量
export const APP_NAME = 'Test-Web';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = '现代化Web测试平台';

// 默认配置
export const defaultConfig = {
  theme: 'dark',
  language: 'zh-CN',
  autoSave: true,
  notifications: true,
} as const;
