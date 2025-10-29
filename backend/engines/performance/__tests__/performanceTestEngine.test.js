/**
 * 性能测试引擎单元测试
 * @description 测试页面加载、资源分析等性能测试功能
 */

const PerformanceTestEngine = require('../performanceTestEngine');
const puppeteer = require('puppeteer');

// Mock Puppeteer
jest.mock('puppeteer');

describe('性能测试引擎', () => {
  let performanceEngine;
  let mockBrowser;
  let mockPage;

  beforeEach(() => {
    performanceEngine = new PerformanceTestEngine();
    
    // 设置Mock对象
    mockPage = {
      goto: jest.fn(),
      evaluate: jest.fn(),
      metrics: jest.fn(),
      coverage: {
        startJSCoverage: jest.fn(),
        stopJSCoverage: jest.fn(),
        startCSSCoverage: jest.fn(),
        stopCSSCoverage: jest.fn()
      },
      close: jest.fn()
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn()
    };

    puppeteer.launch.mockResolvedValue(mockBrowser);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('引擎初始化', () => {
    test('应该正确初始化引擎属性', () => {
      expect(performanceEngine.name).toBe('performance');
      expect(performanceEngine.version).toBeDefined();
      expect(performanceEngine.description).toBeTruthy();
    });

    test('应该有默认配置选项', () => {
      expect(performanceEngine.options).toBeDefined();
      expect(performanceEngine.options.timeout).toBeDefined();
      expect(performanceEngine.options.viewport).toBeDefined();
    });
  });

  describe('页面加载测试', () => {
    test('应该成功测量页面加载时间', async () => {
      const mockMetrics = {
        Timestamp: 1000000,
        TaskDuration: 50,
        LayoutDuration: 20,
        RecalcStyleDuration: 10
      };

      const mockPerformance = {
        timing: {
          navigationStart: 1000,
          domContentLoadedEventEnd: 1500,
          loadEventEnd: 2000
        },
        getEntriesByType: () => [{
          name: 'first-contentful-paint',
          startTime: 800
        }]
      };

      mockPage.goto.mockResolvedValue({ status: () => 200 });
      mockPage.metrics.mockResolvedValue(mockMetrics);
      mockPage.evaluate.mockResolvedValue(mockPerformance);

      const result = await performanceEngine.testPageLoad('https://example.com');

      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com');
      expect(result.metrics).toBeDefined();
      expect(result.loadTime).toBeDefined();
      expect(puppeteer.launch).toHaveBeenCalled();
    });

    test('应该处理页面加载失败', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      const result = await performanceEngine.testPageLoad('https://timeout.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('timeout');
    });

    test('应该测量不同性能指标', async () => {
      const mockPerformance = {
        timing: {
          navigationStart: 1000,
          fetchStart: 1010,
          domainLookupStart: 1020,
          domainLookupEnd: 1050,
          connectStart: 1050,
          connectEnd: 1100,
          requestStart: 1100,
          responseStart: 1300,
          responseEnd: 1500,
          domInteractive: 1600,
          domContentLoadedEventEnd: 1800,
          loadEventEnd: 2000
        }
      };

      mockPage.evaluate.mockResolvedValue(mockPerformance);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.testPageLoad('https://example.com');

      expect(result.metrics.dns).toBeDefined();
      expect(result.metrics.tcp).toBeDefined();
      expect(result.metrics.request).toBeDefined();
      expect(result.metrics.response).toBeDefined();
    });
  });

  describe('资源分析', () => {
    test('应该分析页面资源', async () => {
      const mockResources = [
        {
          name: 'https://example.com/script.js',
          initiatorType: 'script',
          transferSize: 50000,
          duration: 200
        },
        {
          name: 'https://example.com/style.css',
          initiatorType: 'link',
          transferSize: 20000,
          duration: 150
        },
        {
          name: 'https://example.com/image.jpg',
          initiatorType: 'img',
          transferSize: 100000,
          duration: 300
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockResources);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.analyzeResources('https://example.com');

      expect(result).toBeDefined();
      expect(result.totalResources).toBe(3);
      expect(result.totalSize).toBeGreaterThan(0);
      expect(result.byType).toBeDefined();
      expect(result.byType.script).toBeDefined();
      expect(result.byType.stylesheet).toBeDefined();
      expect(result.byType.image).toBeDefined();
    });

    test('应该识别大文件', async () => {
      const mockResources = [
        {
          name: 'https://example.com/large.js',
          initiatorType: 'script',
          transferSize: 5000000, // 5MB
          duration: 2000
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockResources);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.analyzeResources('https://example.com');

      expect(result.largeFiles).toBeDefined();
      expect(result.largeFiles.length).toBeGreaterThan(0);
      expect(result.recommendations).toContain('优化大文件');
    });

    test('应该计算资源加载时间', async () => {
      const mockResources = [
        { transferSize: 10000, duration: 100 },
        { transferSize: 20000, duration: 200 },
        { transferSize: 15000, duration: 150 }
      ];

      mockPage.evaluate.mockResolvedValue(mockResources);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.analyzeResources('https://example.com');

      expect(result.averageLoadTime).toBeDefined();
      expect(result.totalLoadTime).toBeGreaterThan(0);
    });
  });

  describe('Core Web Vitals', () => {
    test('应该测量LCP（Largest Contentful Paint）', async () => {
      const mockWebVitals = {
        lcp: 1200,
        fid: 50,
        cls: 0.05
      };

      mockPage.evaluate.mockResolvedValue(mockWebVitals);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.measureWebVitals('https://example.com');

      expect(result.lcp).toBeDefined();
      expect(result.lcp.value).toBe(1200);
      expect(result.lcp.rating).toBeDefined();
    });

    test('应该测量FID（First Input Delay）', async () => {
      const mockWebVitals = {
        fid: 80
      };

      mockPage.evaluate.mockResolvedValue(mockWebVitals);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.measureWebVitals('https://example.com');

      expect(result.fid).toBeDefined();
      expect(result.fid.value).toBe(80);
    });

    test('应该测量CLS（Cumulative Layout Shift）', async () => {
      const mockWebVitals = {
        cls: 0.1
      };

      mockPage.evaluate.mockResolvedValue(mockWebVitals);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.measureWebVitals('https://example.com');

      expect(result.cls).toBeDefined();
      expect(result.cls.value).toBe(0.1);
    });

    test('应该根据阈值评级Web Vitals', async () => {
      const goodVitals = { lcp: 1000, fid: 50, cls: 0.05 };
      const poorVitals = { lcp: 5000, fid: 500, cls: 0.5 };

      mockPage.goto.mockResolvedValue({ status: () => 200 });

      // 测试好的指标
      mockPage.evaluate.mockResolvedValueOnce(goodVitals);
      const goodResult = await performanceEngine.measureWebVitals('https://good.com');
      expect(goodResult.lcp.rating).toBe('good');
      expect(goodResult.fid.rating).toBe('good');
      expect(goodResult.cls.rating).toBe('good');

      // 测试差的指标
      mockPage.evaluate.mockResolvedValueOnce(poorVitals);
      const poorResult = await performanceEngine.measureWebVitals('https://poor.com');
      expect(poorResult.lcp.rating).toBe('poor');
      expect(poorResult.fid.rating).toBe('poor');
      expect(poorResult.cls.rating).toBe('poor');
    });
  });

  describe('渲染性能', () => {
    test('应该测量首次渲染时间', async () => {
      const mockPaint = {
        'first-paint': 500,
        'first-contentful-paint': 800
      };

      mockPage.evaluate.mockResolvedValue(mockPaint);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.measureRenderPerformance('https://example.com');

      expect(result.firstPaint).toBe(500);
      expect(result.firstContentfulPaint).toBe(800);
    });

    test('应该测量DOM渲染时间', async () => {
      const mockTiming = {
        domInteractive: 1500,
        domContentLoadedEventEnd: 1800,
        domComplete: 2000
      };

      mockPage.evaluate.mockResolvedValue(mockTiming);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.measureRenderPerformance('https://example.com');

      expect(result.domInteractive).toBe(1500);
      expect(result.domContentLoaded).toBe(1800);
      expect(result.domComplete).toBe(2000);
    });
  });

  describe('网络性能', () => {
    test('应该分析网络连接时间', async () => {
      const mockNetworkTiming = {
        dns: 30,
        tcp: 50,
        ssl: 80,
        ttfb: 200
      };

      mockPage.evaluate.mockResolvedValue(mockNetworkTiming);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.analyzeNetwork('https://example.com');

      expect(result.dns).toBe(30);
      expect(result.tcp).toBe(50);
      expect(result.ssl).toBe(80);
      expect(result.ttfb).toBe(200);
    });

    test('应该识别慢速网络', async () => {
      const slowNetworkTiming = {
        ttfb: 2000 // 慢速响应
      };

      mockPage.evaluate.mockResolvedValue(slowNetworkTiming);
      mockPage.goto.mockResolvedValue({ status: () => 200 });

      const result = await performanceEngine.analyzeNetwork('https://slow.com');

      expect(result.warnings).toContain('TTFB过高');
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('优化建议', () => {
    test('应该为慢速加载生成建议', () => {
      const slowMetrics = {
        loadTime: 8000,
        resourceCount: 150,
        totalSize: 10000000
      };

      const recommendations = performanceEngine.generateRecommendations(slowMetrics);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('加载时间'))).toBe(true);
    });

    test('应该建议资源优化', () => {
      const metrics = {
        totalSize: 5000000,
        largeFiles: ['big.js', 'huge.css']
      };

      const recommendations = performanceEngine.generateRecommendations(metrics);

      expect(recommendations.some(r => r.includes('压缩') || r.includes('优化'))).toBe(true);
    });

    test('应该建议图片优化', () => {
      const metrics = {
        images: {
          count: 50,
          totalSize: 3000000,
          unoptimized: 20
        }
      };

      const recommendations = performanceEngine.generateRecommendations(metrics);

      expect(recommendations.some(r => r.includes('图片'))).toBe(true);
    });
  });

  describe('完整测试执行', () => {
    test('应该返回完整的性能测试结果', async () => {
      mockPage.goto.mockResolvedValue({ status: () => 200 });
      mockPage.evaluate.mockResolvedValue({
        timing: { loadEventEnd: 2000, navigationStart: 0 },
        getEntriesByType: () => []
      });
      mockPage.metrics.mockResolvedValue({ TaskDuration: 100 });

      const result = await performanceEngine.executeTest({
        url: 'https://example.com'
      });

      expect(result.engine).toBe('performance');
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('应该正确清理资源', async () => {
      mockPage.goto.mockResolvedValue({ status: () => 200 });
      mockPage.evaluate.mockResolvedValue({});

      await performanceEngine.executeTest({ url: 'https://example.com' });

      expect(mockPage.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    test('应该处理浏览器启动失败', async () => {
      puppeteer.launch.mockRejectedValue(new Error('Browser launch failed'));

      const result = await performanceEngine.executeTest({ url: 'https://example.com' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('应该处理无效URL', async () => {
      const result = await performanceEngine.executeTest({ url: 'invalid-url' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('URL');
    });
  });
});

