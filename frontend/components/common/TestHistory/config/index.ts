/**
 * TestHistory 配置索引
 * 统一导出所有测试类型配置
 */

import { TestHistoryConfig } from '../types';
import stressTestConfig from './stressTestConfig';
import seoTestConfig from './seoTestConfig';

/**
 * 配置映射表
 * 根据测试类型快速获取对应配置
 */
export const configMap: Record<string, TestHistoryConfig> = {
  stress: stressTestConfig,
  seo: seoTestConfig,
  // 其他配置将在后续添加
  // api: apiTestConfig,
  // performance: performanceTestConfig,
  // security: securityTestConfig,
  // website: websiteTestConfig,
};

/**
 * 根据测试类型获取配置
 * @param testType 测试类型
 * @returns 测试历史配置
 */
export function getTestHistoryConfig(testType: string): TestHistoryConfig | null {
  return configMap[testType] || null;
}

/**
 * 检查是否支持该测试类型
 * @param testType 测试类型
 * @returns 是否支持
 */
export function isSupportedTestType(testType: string): boolean {
  return testType in configMap;
}

/**
 * 获取所有支持的测试类型
 * @returns 测试类型列表
 */
export function getSupportedTestTypes(): string[] {
  return Object.keys(configMap);
}

// 导出配置
export { stressTestConfig, seoTestConfig };

// 默认导出配置映射
export default configMap;
