/**
 * TestHistory 配置验证测试
 *
 * 文件路径: frontend/components/common/TestHistory/__tests__/config.test.ts
 * 创建时间: 2025-11-14
 */

import { describe, expect, it } from 'vitest';
import {
  configMap,
  getSupportedTestTypes,
  getTestHistoryConfig,
  isSupportedTestType,
} from '../config';
import { accessibilityTestConfig } from '../config/accessibilityTestConfig';
import { apiTestConfig } from '../config/apiTestConfig';
import { compatibilityTestConfig } from '../config/compatibilityTestConfig';
import { databaseTestConfig } from '../config/databaseTestConfig';
import { networkTestConfig } from '../config/networkTestConfig';
import { performanceTestConfig } from '../config/performanceTestConfig';
import { securityTestConfig } from '../config/securityTestConfig';
import { seoTestConfig } from '../config/seoTestConfig';
import { stressTestConfig } from '../config/stressTestConfig';
import { uxTestConfig } from '../config/uxTestConfig';
import { websiteTestConfig } from '../config/websiteTestConfig';

describe('配置系统', () => {
  describe('configMap', () => {
    it('应该包含所有11个配置', () => {
      expect(Object.keys(configMap)).toHaveLength(11);
    });

    it('应该包含所有测试类型', () => {
      const expectedTypes = [
        'stress',
        'seo',
        'api',
        'performance',
        'security',
        'accessibility',
        'compatibility',
        'database',
        'network',
        'ux',
        'website',
      ];

      expectedTypes.forEach(type => {
        expect(configMap).toHaveProperty(type);
      });
    });

    it('每个配置应该有必需的属性', () => {
      Object.values(configMap).forEach(config => {
        expect(config).toHaveProperty('testType');
        expect(config).toHaveProperty('apiEndpoint');
        expect(config).toHaveProperty('title');
        expect(config).toHaveProperty('columns');
        expect(config).toHaveProperty('statusOptions');
        expect(Array.isArray(config.columns)).toBe(true);
        expect(Array.isArray(config.statusOptions)).toBe(true);
      });
    });
  });

  describe('getTestHistoryConfig', () => {
    it('应该返回有效的配置', () => {
      const config = getTestHistoryConfig('stress');
      expect(config).toBe(stressTestConfig);
    });

    it('应该对无效类型返回null', () => {
      const config = getTestHistoryConfig('invalid-type');
      expect(config).toBeNull();
    });

    it('应该返回所有11种配置', () => {
      expect(getTestHistoryConfig('stress')).toBe(stressTestConfig);
      expect(getTestHistoryConfig('seo')).toBe(seoTestConfig);
      expect(getTestHistoryConfig('api')).toBe(apiTestConfig);
      expect(getTestHistoryConfig('performance')).toBe(performanceTestConfig);
      expect(getTestHistoryConfig('security')).toBe(securityTestConfig);
      expect(getTestHistoryConfig('accessibility')).toBe(accessibilityTestConfig);
      expect(getTestHistoryConfig('compatibility')).toBe(compatibilityTestConfig);
      expect(getTestHistoryConfig('database')).toBe(databaseTestConfig);
      expect(getTestHistoryConfig('network')).toBe(networkTestConfig);
      expect(getTestHistoryConfig('ux')).toBe(uxTestConfig);
      expect(getTestHistoryConfig('website')).toBe(websiteTestConfig);
    });
  });

  describe('isSupportedTestType', () => {
    it('应该识别支持的测试类型', () => {
      expect(isSupportedTestType('stress')).toBe(true);
      expect(isSupportedTestType('seo')).toBe(true);
      expect(isSupportedTestType('api')).toBe(true);
    });

    it('应该拒绝不支持的测试类型', () => {
      expect(isSupportedTestType('unknown')).toBe(false);
      expect(isSupportedTestType('')).toBe(false);
      expect(isSupportedTestType('invalid')).toBe(false);
    });
  });

  describe('getSupportedTestTypes', () => {
    it('应该返回所有支持的测试类型', () => {
      const types = getSupportedTestTypes();
      expect(types).toHaveLength(11);
      expect(types).toContain('stress');
      expect(types).toContain('seo');
      expect(types).toContain('api');
      expect(types).toContain('ux');
      expect(types).toContain('website');
    });
  });
});

describe('个别配置验证', () => {
  describe('stressTestConfig', () => {
    it('应该有正确的基础配置', () => {
      expect(stressTestConfig.testType).toBe('stress');
      expect(stressTestConfig.apiEndpoint).toBe('/api/test/history');
      expect(stressTestConfig.title).toBe('压力测试历史');
    });

    it('应该有10个列', () => {
      expect(stressTestConfig.columns).toHaveLength(10);
    });

    it('应该有7个状态选项', () => {
      expect(stressTestConfig.statusOptions).toHaveLength(7);
    });

    it('应该包含必要的列', () => {
      const columnKeys = stressTestConfig.columns.map(col => col.key);
      expect(columnKeys).toContain('testName');
      expect(columnKeys).toContain('url');
      expect(columnKeys).toContain('status');
      expect(columnKeys).toContain('totalRequests');
      expect(columnKeys).toContain('peakTps');
    });

    it('应该有自定义筛选器', () => {
      expect(stressTestConfig.customFilters).toBeDefined();
      expect(stressTestConfig.customFilters?.length).toBeGreaterThan(0);
    });

    it('应该有自定义操作', () => {
      expect(stressTestConfig.customActions).toBeDefined();
      expect(stressTestConfig.customActions?.length).toBeGreaterThan(0);
    });

    it('应该有格式化器', () => {
      expect(stressTestConfig.formatters).toBeDefined();
      expect(stressTestConfig.formatters?.date).toBeDefined();
      expect(stressTestConfig.formatters?.status).toBeDefined();
    });

    it('应该有空状态配置', () => {
      expect(stressTestConfig.emptyState).toBeDefined();
      expect(stressTestConfig.emptyState?.title).toBe('暂无测试记录');
    });
  });

  describe('seoTestConfig', () => {
    it('应该有正确的基础配置', () => {
      expect(seoTestConfig.testType).toBe('seo');
      expect(seoTestConfig.apiEndpoint).toBe('/api/test/history');
      expect(seoTestConfig.title).toBe('SEO测试历史');
    });

    it('应该有7个列', () => {
      expect(seoTestConfig.columns).toHaveLength(7);
    });

    it('应该包含SEO特定的列', () => {
      const columnKeys = seoTestConfig.columns.map(col => col.key);
      expect(columnKeys).toContain('overallScore');
      expect(columnKeys).toContain('performanceGrade');
    });
  });

  describe('apiTestConfig', () => {
    it('应该有正确的基础配置', () => {
      expect(apiTestConfig.testType).toBe('api');
      expect(apiTestConfig.apiEndpoint).toBe('/api/test/history');
    });

    it('应该包含API特定的列', () => {
      const columnKeys = apiTestConfig.columns.map(col => col.key);
      expect(columnKeys).toContain('method');
      expect(columnKeys).toContain('statusCode');
      expect(columnKeys).toContain('responseTime');
    });
  });

  describe('performanceTestConfig', () => {
    it('应该有正确的基础配置', () => {
      expect(performanceTestConfig.testType).toBe('performance');
      expect(performanceTestConfig.apiEndpoint).toBe('/api/test/history');
    });

    it('应该包含性能特定的列', () => {
      const columnKeys = performanceTestConfig.columns.map(col => col.key);
      expect(columnKeys).toContain('fcp');
      expect(columnKeys).toContain('lcp');
      expect(columnKeys).toContain('tti');
      expect(columnKeys).toContain('cls');
    });
  });

  describe('securityTestConfig', () => {
    it('应该有正确的基础配置', () => {
      expect(securityTestConfig.testType).toBe('security');
      expect(securityTestConfig.apiEndpoint).toBe('/api/test/history');
    });

    it('应该包含安全特定的列', () => {
      const columnKeys = securityTestConfig.columns.map(col => col.key);
      expect(columnKeys).toContain('riskLevel');
      expect(columnKeys).toContain('vulnerabilities');
      expect(columnKeys).toContain('securityScore');
    });
  });
});

describe('配置一致性验证', () => {
  it('所有配置应该有statusOptions', () => {
    Object.values(configMap).forEach(config => {
      expect(config.statusOptions).toBeDefined();
      expect(config.statusOptions.length).toBeGreaterThan(0);

      // 应该包含"全部状态"选项
      const allOption = config.statusOptions.find(opt => opt.value === 'all');
      expect(allOption).toBeDefined();
    });
  });

  it('所有配置的apiEndpoint应该匹配testType', () => {
    Object.entries(configMap).forEach(([_type, config]) => {
      expect(config.apiEndpoint).toBe('/api/test/history');
    });
  });

  it('所有配置应该有默认分页设置', () => {
    Object.values(configMap).forEach(config => {
      expect(config.defaultPageSize).toBeDefined();
      expect(config.pageSizeOptions).toBeDefined();
      expect(Array.isArray(config.pageSizeOptions)).toBe(true);
    });
  });

  it('所有配置的列应该有title和key', () => {
    Object.values(configMap).forEach(config => {
      config.columns.forEach(column => {
        expect(column.key).toBeDefined();
        expect(column.title).toBeDefined();
        expect(typeof column.key).toBe('string');
        expect(typeof column.title).toBe('string');
      });
    });
  });

  it('所有配置应该包含status列', () => {
    Object.values(configMap).forEach(config => {
      const statusColumn = config.columns.find(col => col.key === 'status');
      expect(statusColumn).toBeDefined();
    });
  });

  it('所有配置应该包含createdAt列', () => {
    Object.values(configMap).forEach(config => {
      const createdAtColumn = config.columns.find(col => col.key === 'createdAt');
      expect(createdAtColumn).toBeDefined();
    });
  });

  it('所有配置的features应该包含基本功能', () => {
    Object.values(configMap).forEach(config => {
      if (config.features) {
        expect(config.features.export).toBeDefined();
        expect(config.features.batchDelete).toBeDefined();
      }
    });
  });
});
