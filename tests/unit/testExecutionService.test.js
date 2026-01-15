/**
 * API服务单元测试
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const TestExecutionService = require('../../backend/services/testing/TestExecutionService');

describe('TestExecutionService', () => {
  let testService;

  beforeEach(() => {
    testService = new TestExecutionService();
  });

  afterEach(() => {
    // 清理测试数据
    testService.activeTests.clear();
    testService.testResults.clear();
  });

  describe('generateTestId', () => {
    it('应该生成唯一的测试ID', () => {
      const id1 = testService.generateTestId();
      const id2 = testService.generateTestId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test_\d+_[a-z0-9]+$/);
    });
  });

  describe('calculatePerformanceScore', () => {
    it('应该根据加载时间计算正确的性能分数', () => {
      expect(testService.calculatePerformanceScore(500, {})).toBe(100);
      expect(testService.calculatePerformanceScore(1500, {})).toBe(90);
      expect(testService.calculatePerformanceScore(2500, {})).toBe(80);
      expect(testService.calculatePerformanceScore(3500, {})).toBe(70);
    });

    it('分数不应该低于0', () => {
      expect(testService.calculatePerformanceScore(10000, {})).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateSEOScore', () => {
    it('应该根据SEO数据计算正确分数', () => {
      const goodSeoData = {
        hasTitle: true,
        hasMetaDescription: true,
        titleLength: 45,
        metaDescriptionLength: 140,
        h1Tags: ['主标题'],
        images: [{ hasAlt: true }, { hasAlt: true }]
      };

      const score = testService.calculateSEOScore(goodSeoData);
      expect(score).toBe(100);
    });

    it('应该对缺失元素扣分', () => {
      const poorSeoData = {
        hasTitle: false,
        hasMetaDescription: false,
        titleLength: 0,
        metaDescriptionLength: 0,
        h1Tags: [],
        images: [{ hasAlt: false }]
      };

      const score = testService.calculateSEOScore(poorSeoData);
      expect(score).toBe(0);
    });
  });

  describe('calculateSecurityScore', () => {
    it('应该根据安全检查计算正确分数', () => {
      const allSecure = {
        hasHTTPS: true,
        hasHSTS: true,
        hasCSP: true,
        hasXFrameOptions: true,
        hasXContentTypeOptions: true,
        hasReferrerPolicy: true
      };

      expect(testService.calculateSecurityScore(allSecure)).toBe(100);
    });

    it('应该对缺失安全头扣分', () => {
      const noSecurity = {
        hasHTTPS: false,
        hasHSTS: false,
        hasCSP: false,
        hasXFrameOptions: false,
        hasXContentTypeOptions: false,
        hasReferrerPolicy: false
      };

      expect(testService.calculateSecurityScore(noSecurity)).toBe(0);
    });
  });

  describe('getTestStatus', () => {
    it('应该返回活跃测试的状态', () => {
      const testId = 'test_123';
      const testData = { type: 'performance', status: 'running' };
      
      testService.activeTests.set(testId, testData);
      
      expect(testService.getTestStatus(testId)).toEqual(testData);
    });

    it('应该返回已完成测试的结果', () => {
      const testId = 'test_456';
      const testResult = { type: 'seo', status: 'completed', score: 85 };
      
      testService.testResults.set(testId, testResult);
      
      expect(testService.getTestStatus(testId)).toEqual(testResult);
    });

    it('对于不存在的测试应该返回null', () => {
      expect(testService.getTestStatus('nonexistent')).toBeNull();
    });
  });

  describe('cancelTest', () => {
    it('应该能够取消活跃的测试', () => {
      const testId = 'test_789';
      testService.activeTests.set(testId, { status: 'running' });
      
      expect(testService.cancelTest(testId)).toBe(true);
      expect(testService.activeTests.has(testId)).toBe(false);
    });

    it('对于不存在的测试应该返回false', () => {
      expect(testService.cancelTest('nonexistent')).toBe(false);
    });
  });
});