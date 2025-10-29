/**
 * SEO测试引擎单元测试
 * @description 测试SEO分析的核心功能
 */

const SeoTestEngine = require('../SEOTestEngine');
const axios = require('axios');
const cheerio = require('cheerio');

// Mock axios
jest.mock('axios');

describe('SEO测试引擎', () => {
  let seoEngine;

  beforeEach(() => {
    seoEngine = new SeoTestEngine();
    jest.clearAllMocks();
  });

  describe('引擎初始化', () => {
    test('应该正确初始化引擎属性', () => {
      expect(seoEngine.name).toBe('seo');
      expect(seoEngine.defaultTimeout).toBe(30000);
      expect(seoEngine.activeTests).toBeInstanceOf(Map);
    });
  });

  describe('配置验证', () => {
    test('应该接受有效的配置', () => {
      const validConfig = {
        url: 'https://example.com',
        checks: ['meta', 'headings'],
        timeout: 15000
      };

      const result = seoEngine.validateConfig(validConfig);
      
      expect(result).toBeDefined();
      expect(result.url).toBe(validConfig.url);
      expect(result.checks).toEqual(validConfig.checks);
    });

    test('应该拒绝没有URL的配置', () => {
      const invalidConfig = {
        checks: ['meta']
      };

      expect(() => {
        seoEngine.validateConfig(invalidConfig);
      }).toThrow('配置验证失败');
    });

    test('应该拒绝无效的URL', () => {
      const invalidConfig = {
        url: 'not-a-valid-url',
        checks: ['meta']
      };

      expect(() => {
        seoEngine.validateConfig(invalidConfig);
      }).toThrow();
    });

    test('应该使用默认值填充缺失的配置项', () => {
      const minimalConfig = {
        url: 'https://example.com'
      };

      const result = seoEngine.validateConfig(minimalConfig);
      
      expect(result.checks).toBeDefined();
      expect(result.timeout).toBe(30000);
      expect(result.userAgent).toBeDefined();
    });
  });

  describe('可用性检查', () => {
    test('应该在依赖可用时返回true', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        data: '<html><head><title>Test</title></head><body></body></html>'
      });

      const availability = await seoEngine.checkAvailability();
      
      expect(availability.available).toBe(true);
      expect(availability.version).toBeDefined();
      expect(availability.dependencies).toContain('cheerio');
      expect(availability.dependencies).toContain('axios');
    });

    test('应该在依赖不可用时返回false', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const availability = await seoEngine.checkAvailability();
      
      expect(availability.available).toBe(false);
      expect(availability.error).toBeDefined();
    });
  });

  describe('Meta标签检查', () => {
    test('应该正确检测title标签', () => {
      const html = '<html><head><title>Test Page</title></head><body></body></html>';
      const $ = cheerio.load(html);

      const result = seoEngine.checkMetaTags($);
      
      expect(result.title).toBeDefined();
      expect(result.title.content).toBe('Test Page');
      expect(result.title.length).toBeGreaterThan(0);
    });

    test('应该检测description meta标签', () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="This is a test description">
          </head>
          <body></body>
        </html>
      `;
      const $ = cheerio.load(html);

      const result = seoEngine.checkMetaTags($);
      
      expect(result.description).toBeDefined();
      expect(result.description.content).toBe('This is a test description');
    });

    test('应该检测Open Graph标签', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="OG Title">
            <meta property="og:description" content="OG Description">
          </head>
          <body></body>
        </html>
      `;
      const $ = cheerio.load(html);

      const result = seoEngine.checkMetaTags($);
      
      expect(result.openGraph).toBeDefined();
      expect(result.openGraph['og:title']).toBe('OG Title');
    });

    test('应该标记缺失的关键标签', () => {
      const html = '<html><head></head><body></body></html>';
      const $ = cheerio.load(html);

      const result = seoEngine.checkMetaTags($);
      
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'missing',
          tag: 'title'
        })
      );
    });
  });

  describe('标题结构检查', () => {
    test('应该检测H1标签', () => {
      const html = `
        <html>
          <body>
            <h1>Main Heading</h1>
            <h2>Subheading 1</h2>
            <h2>Subheading 2</h2>
          </body>
        </html>
      `;
      const $ = cheerio.load(html);

      const result = seoEngine.checkHeadings($);
      
      expect(result.h1).toBeDefined();
      expect(result.h1.count).toBe(1);
      expect(result.h1.text).toContain('Main Heading');
    });

    test('应该检测标题层级结构', () => {
      const html = `
        <html>
          <body>
            <h1>H1</h1>
            <h2>H2</h2>
            <h3>H3</h3>
          </body>
        </html>
      `;
      const $ = cheerio.load(html);

      const result = seoEngine.checkHeadings($);
      
      expect(result.structure).toBeDefined();
      expect(result.structure).toContain('h1');
      expect(result.structure).toContain('h2');
      expect(result.structure).toContain('h3');
    });

    test('应该警告多个H1标签', () => {
      const html = `
        <html>
          <body>
            <h1>First H1</h1>
            <h1>Second H1</h1>
          </body>
        </html>
      `;
      const $ = cheerio.load(html);

      const result = seoEngine.checkHeadings($);
      
      expect(result.h1.count).toBe(2);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          message: expect.stringContaining('多个H1标签')
        })
      );
    });
  });

  describe('图片优化检查', () => {
    test('应该检测缺少alt属性的图片', () => {
      const html = `
        <html>
          <body>
            <img src="image1.jpg">
            <img src="image2.jpg" alt="Image 2">
          </body>
        </html>
      `;
      const $ = cheerio.load(html);

      const result = seoEngine.checkImages($);
      
      expect(result.total).toBe(2);
      expect(result.withoutAlt).toBe(1);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('应该检测空的alt属性', () => {
      const html = `
        <html>
          <body>
            <img src="image.jpg" alt="">
          </body>
        </html>
      `;
      const $ = cheerio.load(html);

      const result = seoEngine.checkImages($);
      
      expect(result.emptyAlt).toBeGreaterThan(0);
    });
  });

  describe('SEO评分计算', () => {
    test('应该基于检查结果计算总分', () => {
      const checks = {
        meta: { score: 90, issues: [] },
        headings: { score: 85, issues: [] },
        images: { score: 80, issues: [] },
        links: { score: 75, issues: [] }
      };

      const summary = seoEngine.calculateSeoScore(checks);
      
      expect(summary.score).toBeGreaterThan(0);
      expect(summary.score).toBeLessThanOrEqual(100);
      expect(summary.passed).toBeDefined();
      expect(summary.failed).toBeDefined();
    });

    test('应该生成改进建议', () => {
      const checks = {
        meta: { 
          score: 60, 
          issues: [{ type: 'missing', tag: 'description' }] 
        }
      };

      const summary = seoEngine.calculateSeoScore(checks);
      
      expect(summary.recommendations).toBeDefined();
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('完整SEO测试执行', () => {
    test('应该成功执行完整的SEO测试', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="Test description">
          </head>
          <body>
            <h1>Main Heading</h1>
            <img src="test.jpg" alt="Test Image">
          </body>
        </html>
      `;

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: mockHtml
      });

      const config = {
        url: 'https://example.com',
        checks: ['meta', 'headings', 'images']
      };

      const result = await seoEngine.runSeoTest(config);
      
      expect(result).toBeDefined();
      expect(result.testId).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.checks.meta).toBeDefined();
      expect(result.checks.headings).toBeDefined();
      expect(result.checks.images).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.score).toBeGreaterThan(0);
    });

    test('应该处理网络错误', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const config = {
        url: 'https://example.com',
        checks: ['meta']
      };

      await expect(seoEngine.runSeoTest(config)).rejects.toThrow();
    });

    test('应该更新测试进度', async () => {
      const mockHtml = '<html><head><title>Test</title></head><body></body></html>';
      axios.get.mockResolvedValueOnce({ status: 200, data: mockHtml });

      const config = {
        url: 'https://example.com',
        checks: ['meta']
      };

      const result = await seoEngine.runSeoTest(config);
      
      const testState = seoEngine.activeTests.get(result.testId);
      expect(testState).toBeDefined();
      expect(testState.status).toBe('completed');
      expect(testState.progress).toBe(100);
    });
  });

  describe('性能考虑', () => {
    test('应该在合理时间内完成测试', async () => {
      const mockHtml = '<html><head><title>Test</title></head><body></body></html>';
      axios.get.mockResolvedValueOnce({ status: 200, data: mockHtml });

      const config = {
        url: 'https://example.com',
        checks: ['meta', 'headings']
      };

      const startTime = Date.now();
      await seoEngine.runSeoTest(config);
      const duration = Date.now() - startTime;
      
      // SEO测试应该在5秒内完成（不包括网络请求时间）
      expect(duration).toBeLessThan(5000);
    });
  });
});

