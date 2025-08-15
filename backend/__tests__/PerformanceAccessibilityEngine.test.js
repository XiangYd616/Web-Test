/**
 * 性能和可访问性测试引擎单元测试
 * 
 * 测试覆盖：
 * - 引擎初始化
 * - URL验证
 * - 基础性能测试
 * - 基础可访问性测试
 * - 评分计算
 * - 报告生成
 * - 可视化数据生成
 * 
 * 版本: v1.0.0
 * 更新时间: 2024-12-19
 */

const PerformanceAccessibilityEngine = require('../engines/performance/PerformanceAccessibilityEngine.js');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock child_process
jest.mock('child_process', () => ({
    exec: jest.fn()
}));

// Mock fs.promises
jest.mock('fs', () => ({
    promises: {
        mkdir: jest.fn(),
        readFile: jest.fn(),
        unlink: jest.fn()
    }
}));

describe('PerformanceAccessibilityEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new PerformanceAccessibilityEngine();
        jest.clearAllMocks();

        // Mock exec to resolve quickly
        const { exec } = require('child_process');
        exec.mockImplementation((cmd, callback) => {
            setTimeout(() => {
                if (cmd.includes('lighthouse --version')) {
                    callback(null, { stdout: 'lighthouse 12.0.0' });
                } else {
                    callback(new Error('Command not found'));
                }
            }, 10);
        });
    });

    describe('初始化', () => {
        test('应该正确初始化引擎', async () => {
            await engine.initialize();

            expect(engine.name).toBe('performance-accessibility-engine');
            expect(engine.version).toBe('1.0.0');
            expect(typeof engine.lighthouseAvailable).toBe('boolean');
            expect(typeof engine.axeAvailable).toBe('boolean');
        }, 10000);

        test('应该检查Lighthouse可用性', async () => {
            const { exec } = require('child_process');
            exec.mockImplementation((cmd, callback) => {
                if (cmd.includes('lighthouse --version')) {
                    callback(null, { stdout: 'lighthouse 12.0.0' });
                }
            });

            const available = await engine.checkLighthouseAvailability();
            expect(available).toBe(true);
        });

        test('应该检查axe-core可用性', async () => {
            // Mock require.resolve
            const originalResolve = require.resolve;
            require.resolve = jest.fn().mockReturnValue('/path/to/axe-core');

            const available = await engine.checkAxeAvailability();
            expect(available).toBe(true);

            require.resolve = originalResolve;
        });
    });

    describe('URL验证', () => {
        test('应该验证有效的URL', () => {
            expect(() => engine.validateUrl('https://example.com')).not.toThrow();
            expect(() => engine.validateUrl('http://test.com')).not.toThrow();
        });

        test('应该拒绝无效的URL', () => {
            expect(() => engine.validateUrl('invalid-url')).toThrow('无效的URL格式');
            expect(() => engine.validateUrl('')).toThrow('无效的URL格式');
            expect(() => engine.validateUrl('not-a-url')).toThrow('无效的URL格式');
        });
    });

    describe('基础性能测试', () => {
        test('应该执行基础性能测试', async () => {
            const mockResponse = {
                data: '<html><head><title>Test</title></head><body>Test content</body></html>',
                status: 200,
                headers: {
                    'content-type': 'text/html',
                    'cache-control': 'max-age=3600'
                }
            };

            mockedAxios.get.mockResolvedValue(mockResponse);

            const results = { performance: {} };
            await engine.runBasicPerformanceTest('https://example.com', {}, results);

            expect(results.performance.lighthouse).toBeDefined();
            expect(results.performance.lighthouse.score).toBeGreaterThanOrEqual(0);
            expect(results.performance.lighthouse.metrics).toBeDefined();
            expect(results.performanceScore).toBeGreaterThanOrEqual(0);
        });

        test('应该处理网络错误', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Network error'));

            const results = { performance: {} };
            await engine.runBasicPerformanceTest('https://example.com', {}, results);

            expect(results.performance.lighthouse.score).toBe(0);
            expect(results.performanceScore).toBe(0);
        });
    });

    describe('基础可访问性测试', () => {
        test('应该执行基础可访问性测试', async () => {
            const mockHtml = `
        <html lang="en">
          <head><title>Test Page</title></head>
          <body>
            <h1>Main Title</h1>
            <img src="test.jpg" alt="Test image">
            <form>
              <label for="email">Email:</label>
              <input type="email" id="email">
            </form>
          </body>
        </html>
      `;

            mockedAxios.get.mockResolvedValue({ data: mockHtml });

            const results = { accessibility: {} };
            await engine.runBasicAccessibilityTest('https://example.com', {}, results);

            expect(results.accessibility.violations).toBeDefined();
            expect(results.accessibility.passes).toBeDefined();
            expect(results.accessibility.summary).toBeDefined();
            expect(results.accessibilityScore).toBeGreaterThanOrEqual(0);
        });

        test('应该检测图片alt属性', () => {
            const htmlWithoutAlt = '<img src="test.jpg"><img src="test2.jpg" alt="">';
            const result = engine.checkImageAltText(htmlWithoutAlt);

            expect(result.passed).toBe(false);
            expect(result.id).toBe('image-alt');
            expect(result.impact).toBe('serious');
        });

        test('应该检测标题结构', () => {
            const htmlWithMultipleH1 = '<h1>Title 1</h1><h1>Title 2</h1>';
            const result = engine.checkHeadingStructure(htmlWithMultipleH1);

            expect(result.passed).toBe(false);
            expect(result.id).toBe('heading-structure');
        });

        test('应该检测页面语言属性', () => {
            const htmlWithLang = '<html lang="en"><head></head><body></body></html>';
            const result = engine.checkLangAttribute(htmlWithLang);

            expect(result.passed).toBe(true);
            expect(result.id).toBe('html-lang');
        });

        test('应该检测页面标题', () => {
            const htmlWithTitle = '<html><head><title>Test Page</title></head><body></body></html>';
            const result = engine.checkPageTitle(htmlWithTitle);

            expect(result.passed).toBe(true);
            expect(result.id).toBe('page-title');
        });
    });

    describe('评分计算', () => {
        test('应该计算综合评分', () => {
            const results = {
                performanceScore: 80,
                accessibilityScore: 90,
                overallScore: 0
            };

            engine.calculateOverallScores(results);

            // 性能权重0.6，可访问性权重0.4
            const expectedScore = Math.round(80 * 0.6 + 90 * 0.4);
            expect(results.overallScore).toBe(expectedScore);
        });

        test('应该获取Core Web Vital评级', () => {
            expect(engine.getCoreWebVitalRating('LCP', 2000)).toBe('good');
            expect(engine.getCoreWebVitalRating('LCP', 3000)).toBe('needs-improvement');
            expect(engine.getCoreWebVitalRating('LCP', 5000)).toBe('poor');
        });

        test('应该获取合规级别', () => {
            expect(engine.getComplianceLevel(95)).toBe('excellent');
            expect(engine.getComplianceLevel(85)).toBe('good');
            expect(engine.getComplianceLevel(70)).toBe('fair');
            expect(engine.getComplianceLevel(50)).toBe('poor');
        });
    });

    describe('改进建议生成', () => {
        test('应该生成性能改进建议', () => {
            const results = {
                performanceScore: 60,
                accessibilityScore: 85,
                performance: {
                    opportunities: [
                        { title: '优化图片', savings: 1000, impact: 'high' }
                    ]
                },
                accessibility: {
                    violations: []
                },
                recommendations: []
            };

            engine.generateRecommendations(results);

            expect(results.recommendations).toHaveLength(1);
            expect(results.recommendations[0].category).toBe('performance');
            expect(results.recommendations[0].priority).toBe('medium');
        });

        test('应该生成可访问性改进建议', () => {
            const results = {
                performanceScore: 85,
                accessibilityScore: 60,
                performance: {},
                accessibility: {
                    violations: [
                        { title: '图片缺少alt属性', help: '添加alt属性' }
                    ]
                },
                recommendations: []
            };

            engine.generateRecommendations(results);

            expect(results.recommendations).toHaveLength(1);
            expect(results.recommendations[0].category).toBe('accessibility');
            expect(results.recommendations[0].priority).toBe('high');
        });
    });

    describe('可视化数据生成', () => {
        test('应该生成可视化数据', () => {
            const results = {
                performanceScore: 80,
                accessibilityScore: 90,
                performance: {
                    coreWebVitals: {
                        lcp: { value: 2000, rating: 'good' },
                        fid: { value: 100, rating: 'good' },
                        cls: { value: 0.1, rating: 'good' },
                        fcp: { value: 1500, rating: 'good' },
                        ttfb: { value: 500, rating: 'good' }
                    },
                    lighthouse: {
                        metrics: {
                            serverResponseTime: 500,
                            firstContentfulPaint: 1500,
                            largestContentfulPaint: 2000,
                            timeToInteractive: 3000
                        }
                    }
                },
                accessibility: {
                    passes: [{ id: 'test1' }, { id: 'test2' }],
                    violations: [{ id: 'violation1' }]
                }
            };

            const visualizations = engine.generateVisualizationData(results);

            expect(visualizations.performanceChart).toBeDefined();
            expect(visualizations.coreWebVitalsChart).toBeDefined();
            expect(visualizations.accessibilityBreakdown).toBeDefined();
            expect(visualizations.performanceTimeline).toBeDefined();
        });
    });

    describe('报告导出', () => {
        test('应该导出JSON格式报告', async () => {
            const results = {
                testId: 'test-123',
                url: 'https://example.com',
                performanceScore: 80,
                accessibilityScore: 90,
                overallScore: 84,
                startTime: new Date().toISOString(),
                duration: 5000,
                performance: {
                    lighthouse: { metrics: {} },
                    coreWebVitals: {},
                    opportunities: [],
                    diagnostics: []
                },
                accessibility: {
                    violations: [],
                    passes: []
                },
                recommendations: []
            };

            const exported = await engine.exportResults(results, 'json');

            expect(exported.contentType).toBe('application/json');
            expect(exported.filename).toContain('.json');
            expect(JSON.parse(exported.content)).toBeDefined();
        });

        test('应该导出HTML格式报告', async () => {
            const results = {
                testId: 'test-123',
                url: 'https://example.com',
                performanceScore: 80,
                accessibilityScore: 90,
                overallScore: 84,
                startTime: new Date().toISOString(),
                duration: 5000,
                performance: {
                    coreWebVitals: {
                        lcp: { value: 2000, rating: 'good' }
                    },
                    lighthouse: {
                        opportunities: []
                    }
                },
                accessibility: {
                    violations: [],
                    passes: []
                },
                recommendations: []
            };

            const exported = await engine.exportResults(results, 'html');

            expect(exported.contentType).toBe('text/html');
            expect(exported.filename).toContain('.html');
            expect(exported.content).toContain('<!DOCTYPE html>');
        });

        test('应该导出CSV格式报告', async () => {
            const results = {
                testId: 'test-123',
                url: 'https://example.com',
                performanceScore: 80,
                accessibilityScore: 90,
                overallScore: 84,
                performance: {
                    coreWebVitals: {
                        lcp: { value: 2000, rating: 'good' }
                    }
                },
                accessibility: {
                    violations: []
                }
            };

            const exported = await engine.exportResults(results, 'csv');

            expect(exported.contentType).toBe('text/csv');
            expect(exported.filename).toContain('.csv');
            expect(exported.content).toContain('"指标类型","指标名称"');
        });

        test('应该拒绝不支持的格式', async () => {
            const results = {
                testId: 'test-123',
                url: 'https://example.com',
                performanceScore: 80,
                accessibilityScore: 90,
                overallScore: 84,
                startTime: new Date().toISOString(),
                duration: 5000,
                performance: {
                    lighthouse: { metrics: {} },
                    coreWebVitals: {},
                    opportunities: [],
                    diagnostics: []
                },
                accessibility: {
                    violations: [],
                    passes: []
                },
                recommendations: []
            };

            await expect(engine.exportResults(results, 'pdf'))
                .rejects.toThrow('不支持的导出格式: pdf');
        });
    });

    describe('引擎状态', () => {
        test('应该返回引擎状态', () => {
            const status = engine.getEngineStatus();

            expect(status.name).toBe('performance-accessibility-engine');
            expect(status.version).toBe('1.0.0');
            expect(status.status).toBe('active');
            expect(status.capabilities).toBeDefined();
            expect(status.supportedFormats).toEqual(['json', 'html', 'csv']);
        });
    });

    describe('完整测试流程', () => {
        test('应该执行完整的性能和可访问性测试', async () => {
            // Mock axios response
            const mockHtml = `
        <html lang="en">
          <head><title>Test Page</title></head>
          <body>
            <h1>Main Title</h1>
            <img src="test.jpg" alt="Test image">
          </body>
        </html>
      `;

            mockedAxios.get.mockResolvedValue({
                data: mockHtml,
                status: 200,
                headers: { 'content-type': 'text/html' }
            });

            // Mock Lighthouse不可用，使用基础测试
            engine.lighthouseAvailable = false;
            engine.axeAvailable = false;

            const result = await engine.runPerformanceAccessibilityTest('https://example.com', {
                device: 'desktop',
                categories: ['performance', 'accessibility']
            });

            expect(result.success).toBe(true);
            expect(result.data.testId).toBeDefined();
            expect(result.data.url).toBe('https://example.com');
            expect(result.data.performanceScore).toBeGreaterThanOrEqual(0);
            expect(result.data.accessibilityScore).toBeGreaterThanOrEqual(0);
            expect(result.data.overallScore).toBeGreaterThanOrEqual(0);
            expect(result.data.recommendations).toBeDefined();
        });

        test('应该处理测试失败情况', async () => {
            // Mock URL validation to throw error
            const originalValidateUrl = engine.validateUrl;
            engine.validateUrl = jest.fn().mockImplementation(() => {
                throw new Error('无效的URL格式: invalid-url');
            });

            const result = await engine.runPerformanceAccessibilityTest('invalid-url');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.data.errorDetails).toBeDefined();

            // Restore original method
            engine.validateUrl = originalValidateUrl;
        });
    });
});