import { defineConfig } from '@playwright/test';
import baseConfig from './config/testing/playwright.config';

/**
 * Playwright 配置文件 - 根目录
 * 继承基础配置并允许项目级覆盖
 */
export default defineConfig({
  ...baseConfig,
  
  // 项目级设置可以在此覆盖
  // 例如：testDir: './e2e'
});
